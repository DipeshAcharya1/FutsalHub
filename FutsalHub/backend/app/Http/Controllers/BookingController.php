<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Booking;
use App\Models\FutsalSlot;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class BookingController extends Controller
{
    /**
     * Create a new booking
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'futsal_slot_id' => 'required|exists:futsal_slots,id',
                'booking_date' => 'required|date',
            ]);

            if ($validator->fails()) {
                return response()->json([ 
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = $request->user();
            $slot = FutsalSlot::with(['futsal', 'timeSlot'])->find($request->futsal_slot_id);

            // Check if slot exists
            if (!$slot) {
                return response()->json([
                    'success' => false,
                    'message' => 'Slot not found'
                ], 404);
            }

            // Check if slot is available
            if (!$slot->is_available) {
                return response()->json([
                    'success' => false,
                    'message' => 'This slot is no longer available'
                ], 400);
            }

            // Get current date and time
            $today = now()->toDateString();
            $currentTime = now()->format('H:i:s');
            
            // Check if slot date is in the past
            if ($slot->slot_date < $today) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot book past dates'
                ], 400);
            }
            
            // IMPORTANT FIX: If slot is today, check if the time has already passed
            if ($slot->slot_date === $today && $slot->timeSlot && $slot->timeSlot->start_time <= $currentTime) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot book a slot that has already started or passed'
                ], 400);
            }

            // Check if user already has a booking for this slot
            $existingBooking = Booking::where('futsal_slot_id', $slot->id)
                ->where('user_id', $user->id)
                ->whereIn('status', ['pending', 'confirmed'])
                ->first();

            if ($existingBooking) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already have a booking for this slot'
                ], 400);
            }

            // Begin transaction
            DB::beginTransaction();

            try {
                // Create booking
                $booking = Booking::create([
                    'user_id' => $user->id,
                    'futsal_slot_id' => $slot->id,
                    'booking_date' => $request->booking_date,
                    'status' => 'pending',
                    'payment_status' => 'unpaid',
                ]);

                // Mark slot as unavailable
                $slot->is_available = false;
                $slot->save();

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Booking created successfully',
                    'data' => [
                        'booking' => $booking,
                        'futsal' => $slot->futsal,
                        'slot' => $slot
                    ]
                ], 201);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Booking creation error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create booking'
            ], 500);
        }
    }

    /**
     * Get user's bookings
     */
    public function getUserBookings(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            
            $bookings = Booking::with(['futsalSlot.futsal', 'futsalSlot.timeSlot'])
                ->where('user_id', $user->id)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function($booking) {
                    return [
                        'id' => $booking->id,
                        'booking_date' => $booking->booking_date,
                        'status' => $booking->status,
                        'payment_status' => $booking->payment_status,
                        'futsal_name' => $booking->futsalSlot->futsal->futsal_name ?? 'N/A',
                        'location' => $booking->futsalSlot->futsal->location ?? 'N/A',
                        'start_time' => $booking->futsalSlot->timeSlot->start_time ?? null,
                        'end_time' => $booking->futsalSlot->timeSlot->end_time ?? null,
                        'price' => $booking->futsalSlot->price,
                        'created_at' => $booking->created_at,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $bookings
            ]);

        } catch (\Exception $e) {
            Log::error('Get user bookings error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load bookings'
            ], 500);
        }
    }

    /**
     * Get single booking details
     */
    public function show(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();
            
            $booking = Booking::with(['futsalSlot.futsal', 'futsalSlot.timeSlot'])
                ->where('id', $id)
                ->where('user_id', $user->id)
                ->first();

            if (!$booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $booking->id,
                    'booking_date' => $booking->booking_date,
                    'status' => $booking->status,
                    'payment_status' => $booking->payment_status,
                    'futsal_name' => $booking->futsalSlot->futsal->futsal_name ?? 'N/A',
                    'location' => $booking->futsalSlot->futsal->location ?? 'N/A',
                    'start_time' => $booking->futsalSlot->timeSlot->start_time ?? null,
                    'end_time' => $booking->futsalSlot->timeSlot->end_time ?? null,
                    'price' => $booking->futsalSlot->price,
                    'created_at' => $booking->created_at,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Get booking details error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load booking details'
            ], 500);
        }
    }

    /**
     * Cancel booking (Admin only - moved to AdminDashboardController)
     * This method is kept for backward compatibility but should not be used by users
     */
    public function cancel(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();
            
            // Check if user is admin
            if ($user->role !== 'admin' && $user->role !== 'super-admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Only admins can cancel bookings.'
                ], 403);
            }
            
            $booking = Booking::with('futsalSlot')
                ->where('id', $id)
                ->first();

            if (!$booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found'
                ], 404);
            }

            if ($booking->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only pending bookings can be cancelled'
                ], 400);
            }

            DB::beginTransaction();

            try {
                // Update booking status
                $booking->status = 'cancelled';
                $booking->save();

                // Make slot available again
                if ($booking->futsalSlot) {
                    $booking->futsalSlot->is_available = true;
                    $booking->futsalSlot->save();
                }

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Booking cancelled successfully'
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Cancel booking error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel booking'
            ], 500);
        }
    }
}