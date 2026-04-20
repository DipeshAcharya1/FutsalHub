<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Booking;
use App\Models\FutsalSlot;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;
use Illuminate\Support\Str;

class BookingController extends Controller
{
    /**
     * Initiate booking - creates temporary pending booking before payment
     * This is called when user clicks "Book Now" before Khalti payment
     */
    public function initiateBooking(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'futsal_slot_id' => 'required|exists:futsal_slots,id',
            ]);

            $user = $request->user();
            $futsalSlot = FutsalSlot::with(['futsal', 'timeSlot'])
                ->where('id', $validated['futsal_slot_id'])
                ->where('is_available', true)
                ->first();

            if (!$futsalSlot) {
                return response()->json([
                    'success' => false,
                    'message' => 'Slot is no longer available'
                ], 400);
            }

            // Check if slot is already booked
            $existingBooking = Booking::where('futsal_slot_id', $futsalSlot->id)
                ->whereIn('status', ['pending', 'confirmed'])
                ->first();

            if ($existingBooking) {
                return response()->json([
                    'success' => false,
                    'message' => 'This slot is already booked'
                ], 400);
            }

            DB::beginTransaction();

            try {
                // Delete any expired pending bookings for this user
                Booking::where('user_id', $user->id)
                    ->where('status', 'pending')
                    ->where('payment_expires_at', '<', Carbon::now())
                    ->delete();

                // Create pending booking (temporary hold)
                $booking = Booking::create([
                    'user_id' => $user->id,
                    'futsal_slot_id' => $futsalSlot->id,
                    'booking_date' => now(),
                    'status' => 'pending',
                    'payment_status' => 'pending',
                    'refund_status' => 'none',
                    'refund_amount' => 0,
                    'payment_expires_at' => Carbon::now()->addMinutes(15),
                    'booking_reference' => 'BK-' . strtoupper(Str::random(10))
                ]);

                // Temporarily mark slot as unavailable (15 minute hold)
                $futsalSlot->is_available = false;
                $futsalSlot->save();

                DB::commit();

                Log::info('Booking initiated pending payment', [
                    'booking_id' => $booking->id,
                    'user_id' => $user->id,
                    'slot_id' => $futsalSlot->id
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Booking initiated. Complete payment within 15 minutes.',
                    'data' => [
                        'booking_id' => $booking->id,
                        'booking_reference' => $booking->booking_reference,
                        'amount' => $futsalSlot->price,
                        'futsal_name' => $futsalSlot->futsal->futsal_name,
                        'slot_date' => $futsalSlot->slot_date,
                        'start_time' => $futsalSlot->timeSlot->start_time,
                        'end_time' => $futsalSlot->timeSlot->end_time,
                        'payment_expires_at' => $booking->payment_expires_at
                    ]
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Initiate booking error: ' . $e->getMessage(), [
                    'user_id' => $user->id,
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Initiate booking failed: ' . $e->getMessage(), [
                'user_id' => $request->user()?->id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to initiate booking: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Confirm booking after successful payment
     * Called by KhaltiController after payment verification
     */
    public function confirmBooking(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'booking_id' => 'required|exists:bookings,id',
                'payment_data' => 'required|array',
                'payment_data.transaction_id' => 'required|string',
                'payment_data.amount' => 'required|numeric',
                'payment_data.payment_method' => 'required|string'
            ]);

            $user = $request->user();
            
            $booking = Booking::with(['futsalSlot'])
                ->where('id', $validated['booking_id'])
                ->where('user_id', $user->id)
                ->first();

            if (!$booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found'
                ], 404);
            }

            // Check if booking is already confirmed
            if ($booking->status === 'confirmed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking already confirmed'
                ], 400);
            }

            // Check if booking is still pending
            if ($booking->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking is not in pending state'
                ], 400);
            }

            // Check if payment expired
            if (Carbon::now() > $booking->payment_expires_at) {
                // Release the slot
                $booking->futsalSlot->is_available = true;
                $booking->futsalSlot->save();
                
                $booking->delete();
                
                return response()->json([
                    'success' => false,
                    'message' => 'Payment window expired. Please book again.'
                ], 400);
            }

            DB::beginTransaction();

            try {
                // Update booking to confirmed
                $booking->status = 'confirmed';
                $booking->payment_status = 'completed';
                $booking->payment_method = $validated['payment_data']['payment_method'];
                $booking->transaction_id = $validated['payment_data']['transaction_id'];
                $booking->save();

                // Record payment
                DB::table('payments')->insert([
                    'booking_id' => $booking->id,
                    'amount' => $validated['payment_data']['amount'],
                    'payment_method' => $validated['payment_data']['payment_method'],
                    'transaction_id' => $validated['payment_data']['transaction_id'],
                    'status' => 'completed',
                    'payment_date' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::commit();

                // Send confirmation email
                $this->sendConfirmationEmail($booking);

                Log::info('Booking confirmed after payment', [
                    'booking_id' => $booking->id,
                    'user_id' => $user->id,
                    'transaction_id' => $validated['payment_data']['transaction_id']
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Booking confirmed successfully!',
                    'data' => [
                        'booking_id' => $booking->id,
                        'booking_reference' => $booking->booking_reference,
                        'futsal_name' => $booking->futsalSlot->futsal->futsal_name,
                        'slot_date' => $booking->futsalSlot->slot_date,
                        'start_time' => $booking->futsalSlot->timeSlot->start_time,
                        'end_time' => $booking->futsalSlot->timeSlot->end_time,
                        'amount' => $booking->futsalSlot->price,
                        'transaction_id' => $booking->transaction_id
                    ]
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Confirm booking error: ' . $e->getMessage(), [
                    'booking_id' => $booking->id,
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Booking confirmation failed: ' . $e->getMessage(), [
                'user_id' => $request->user()?->id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to confirm booking: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user's bookings with cancellation eligibility and refund status
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
                    // Parse slot date and start time
                    $slotDate = $booking->futsalSlot->slot_date;
                    $startTime = $booking->futsalSlot->timeSlot->start_time;
                    
                    // Create Carbon instance for slot start time
                    $slotDateTime = Carbon::parse($slotDate . ' ' . $startTime);
                    $now = Carbon::now();
                    
                    // Check if slot is in the past
                    $isPast = $now > $slotDateTime;
                    
                    // Cancel deadline is 2 hours BEFORE the slot start time
                    $cancelDeadline = $slotDateTime->copy()->subHours(2);
                    
                    // Check if cancellation is allowed (deadline not passed AND not past)
                    $canCancel = $booking->status === 'confirmed' 
                        && !$isPast 
                        && $now < $cancelDeadline;
                    
                    // FIXED: Calculate time remaining for cancellation correctly
                    $timeRemaining = '';
                    if ($canCancel && $now < $cancelDeadline) {
                        $minutesRemaining = $cancelDeadline->diffInMinutes($now);
                        if ($minutesRemaining > 0) {
                            $hours = floor($minutesRemaining / 60);
                            $minutes = $minutesRemaining % 60;
                            if ($hours > 0) {
                                $timeRemaining = "{$hours}h {$minutes}m left";
                            } else {
                                $timeRemaining = "{$minutes}m left";
                            }
                        }
                    } elseif (!$canCancel && $booking->status === 'confirmed' && !$isPast && $now > $cancelDeadline) {
                        // Deadline has passed
                        $timeRemaining = 'Expired';
                    }
                    
                    return [
                        'id' => $booking->id,
                        'booking_reference' => $booking->booking_reference,
                        'booking_date' => $booking->booking_date,
                        'status' => $booking->status,
                        'payment_status' => $booking->payment_status,
                        'refund_status' => $booking->refund_status ?? 'none',
                        'refund_amount' => $booking->refund_amount ?? 0,
                        'refunded_at' => $booking->refunded_at,
                        'payment_expires_at' => $booking->payment_expires_at,
                        'is_expired' => $booking->status === 'pending' && $now > $booking->payment_expires_at,
                        'can_cancel' => $canCancel,
                        'cancel_deadline' => $cancelDeadline->toDateTimeString(),
                        'time_remaining_to_cancel' => $timeRemaining,
                        'slot_start_time' => $slotDateTime,
                        'futsal_name' => $booking->futsalSlot->futsal->futsal_name ?? 'N/A',
                        'location' => $booking->futsalSlot->futsal->location ?? 'N/A',
                        'start_time' => $booking->futsalSlot->timeSlot->start_time ?? null,
                        'end_time' => $booking->futsalSlot->timeSlot->end_time ?? null,
                        'slot_date' => $booking->futsalSlot->slot_date,
                        'price' => $booking->futsalSlot->price,
                        'is_past' => $isPast,
                        'created_at' => $booking->created_at,
                        'bulk_booking_id' => $booking->bulk_booking_id,
                        'is_bulk_booking' => (bool)$booking->is_bulk_booking,
                        'total_slots' => $booking->total_slots ?? 1,
                        'total_amount' => $booking->total_amount ?? $booking->futsalSlot->price,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $bookings
            ]);

        } catch (\Exception $e) {
            Log::error('Get user bookings error: ' . $e->getMessage(), [
                'user_id' => $request->user()?->id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load bookings'
            ], 500);
        }
    }

    /**
     * Cancel confirmed booking with refund
     */
    public function cancelBooking(Request $request, $id): JsonResponse
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

            // Check if booking is already cancelled
            if ($booking->status === 'cancelled') {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking is already cancelled'
                ], 400);
            }

            // Check if refund already failed
            if ($booking->refund_status === 'failed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Refund already failed. Please contact support for assistance.',
                    'data' => ['need_manual_intervention' => true]
                ], 400);
            }

            // Validate cancellation eligibility
            $validationResult = $this->validateCancellation($booking);
            if (!$validationResult['valid']) {
                return response()->json([
                    'success' => false,
                    'message' => $validationResult['message']
                ], 400);
            }

            DB::beginTransaction();

            try {
                // Update to refund pending status
                $booking->refund_status = 'pending';
                $booking->save();

                // Process refund through Khalti
                $refundResult = $this->processKhaltiRefund($booking);
                
                if ($refundResult['success']) {
                    $booking->status = 'cancelled';
                    $booking->refund_status = 'completed';
                    $booking->refund_amount = $booking->futsalSlot->price;
                    $booking->refunded_at = now();
                    $booking->save();

                    // Make slot available again
                    $booking->futsalSlot->is_available = true;
                    $booking->futsalSlot->save();

                    DB::commit();

                    // Send cancellation email
                    $this->sendCancellationEmail($booking);

                    return response()->json([
                        'success' => true,
                        'message' => "Booking cancelled successfully. Refund of Rs. {$booking->refund_amount} will be processed.",
                        'data' => [
                            'booking_id' => $booking->id,
                            'refund_amount' => $booking->refund_amount,
                            'refund_status' => $booking->refund_status
                        ]
                    ]);
                } else {
                    // Refund failed
                    $booking->refund_status = 'failed';
                    $booking->save();
                    DB::commit();
                    
                    return response()->json([
                        'success' => false,
                        'message' => 'Refund processing failed: ' . ($refundResult['message'] ?? 'Unknown error')
                    ], 500);
                }

            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Cancel booking transaction error: ' . $e->getMessage(), [
                    'booking_id' => $booking->id,
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Cancel booking error: ' . $e->getMessage(), [
                'booking_id' => $id,
                'user_id' => $request->user()?->id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel booking: ' . $e->getMessage()
            ], 500);
        }
    }

   /**
 * Cancel bulk booking - cancels all slots in a bulk group
 */
public function cancelBulkBooking(Request $request): JsonResponse
{
    try {
        $user = $request->user();
        
        $validator = Validator::make($request->all(), [
            'bulk_booking_id' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $bulkBookingId = $request->bulk_booking_id;
        
        // Get all bookings in this bulk group
        $bookings = Booking::with(['futsalSlot.futsal', 'futsalSlot.timeSlot'])
            ->where('bulk_booking_id', $bulkBookingId)
            ->where('user_id', $user->id)
            ->get();

        if ($bookings->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Bulk booking not found'
            ], 404);
        }

        // Check if all bookings can be cancelled
        $cancellableBookings = [];
        $nonCancellableBookings = [];
        
        foreach ($bookings as $booking) {
            if ($booking->status === 'confirmed') {
                $validationResult = $this->validateCancellation($booking);
                if ($validationResult['valid']) {
                    $cancellableBookings[] = $booking;
                } else {
                    $nonCancellableBookings[] = [
                        'id' => $booking->id,
                        'reason' => $validationResult['message']
                    ];
                }
            } else {
                $nonCancellableBookings[] = [
                    'id' => $booking->id,
                    'reason' => 'Booking status is ' . $booking->status . ' (only confirmed bookings can be cancelled)'
                ];
            }
        }

        if (empty($cancellableBookings)) {
            return response()->json([
                'success' => false,
                'message' => 'No cancellable bookings found in this bulk group',
                'data' => [
                    'non_cancellable' => $nonCancellableBookings
                ]
            ], 400);
        }

        DB::beginTransaction();

        try {
            // Get the original payment for this bulk booking (use first booking's transaction_id)
            $payment = DB::table('payments')
                ->where('transaction_id', $bookings[0]->transaction_id)
                ->first();
            
            if (!$payment) {
                throw new \Exception('Payment record not found for this bulk booking');
            }
            
            // Calculate total refund amount (sum of all cancellable slots)
            $totalRefund = 0;
            foreach ($cancellableBookings as $booking) {
                $totalRefund += $booking->futsalSlot->price;
            }
            
            // Process SINGLE refund for the entire bulk amount
            $refundResult = $this->processKhaltiRefundForBulk($payment, $totalRefund, $bulkBookingId);
            
            if ($refundResult['success']) {
                $cancelledCount = 0;
                $failedBookings = [];
                
                // Update all cancellable bookings to cancelled status
                foreach ($cancellableBookings as $booking) {
                    $booking->status = 'cancelled';
                    $booking->refund_status = 'completed';
                    $booking->refund_amount = $booking->futsalSlot->price;
                    $booking->refunded_at = now();
                    $booking->save();
                    
                    // Make slot available again
                    $booking->futsalSlot->is_available = true;
                    $booking->futsalSlot->save();
                    
                    $cancelledCount++;
                }
                
                DB::commit();
                
                // Send bulk cancellation email
                if ($cancelledCount > 0) {
                    $this->sendBulkCancellationEmail($cancellableBookings, $user);
                }
                
                $message = $cancelledCount === $bookings->count() 
                    ? "All {$cancelledCount} slots cancelled successfully. Total refund: Rs. {$totalRefund}"
                    : "{$cancelledCount} out of {$bookings->count()} slots cancelled successfully. Total refund: Rs. {$totalRefund}";
                
                if (!empty($failedBookings)) {
                    $message .= " Failed to cancel " . count($failedBookings) . " slot(s). Please contact support.";
                }
                
                return response()->json([
                    'success' => true,
                    'message' => $message,
                    'data' => [
                        'cancelled_count' => $cancelledCount,
                        'total_count' => $bookings->count(),
                        'total_refund' => $totalRefund,
                        'failed_bookings' => $failedBookings,
                        'non_cancellable' => $nonCancellableBookings
                    ]
                ]);
            } else {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Refund processing failed: ' . ($refundResult['message'] ?? 'Unknown error')
                ], 500);
            }
            
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Cancel bulk booking transaction error: ' . $e->getMessage(), [
                'bulk_booking_id' => $bulkBookingId,
                'user_id' => $user->id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel bulk booking: ' . $e->getMessage()
            ], 500);
        }
        
    } catch (\Exception $e) {
        Log::error('Cancel bulk booking error: ' . $e->getMessage(), [
            'user_id' => $request->user()?->id,
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Failed to cancel bulk booking: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * Process refund for bulk booking through Khalti API
 */
private function processKhaltiRefundForBulk($payment, $refundAmount, $bulkBookingId): array
{
    try {
        // For development/testing - simulate successful refund
        if (env('APP_ENV') === 'local' || !env('KHALTI_SECRET_KEY')) {
            Log::info('Simulating bulk refund for development', [
                'bulk_booking_id' => $bulkBookingId,
                'amount' => $refundAmount
            ]);
            
            DB::table('refunds')->insert([
                'booking_id' => $payment->booking_id,
                'payment_id' => $payment->id,
                'amount' => $refundAmount,
                'transaction_id' => 'SIM_BULK_REFUND_' . Str::random(10),
                'status' => 'completed',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            return ['success' => true];
        }

        $refundUrl = env('KHALTI_BASE_URL') . '/epayment/refund/';
        
        $payload = [
            'pidx' => $payment->transaction_id,
            'amount' => (int)($refundAmount * 100),
            'reason' => 'User requested cancellation of bulk booking'
        ];

        $response = Http::withHeaders([
            'Authorization' => 'Key ' . env('KHALTI_SECRET_KEY'),
            'Content-Type' => 'application/json',
        ])->timeout(30)->post($refundUrl, $payload);

        if ($response->successful()) {
            $data = $response->json();
            
            DB::table('refunds')->insert([
                'booking_id' => $payment->booking_id,
                'payment_id' => $payment->id,
                'amount' => $refundAmount,
                'transaction_id' => $data['refund_id'] ?? null,
                'status' => 'completed',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            Log::info('Bulk refund processed successfully', [
                'bulk_booking_id' => $bulkBookingId,
                'amount' => $refundAmount
            ]);
            
            return ['success' => true];
        } else {
            $errorData = $response->json();
            $errorMessage = $errorData['message'] ?? 'Khalti refund API error';
            
            Log::error('Khalti bulk refund failed', [
                'bulk_booking_id' => $bulkBookingId,
                'response' => $response->body()
            ]);
            
            return [
                'success' => false,
                'message' => $errorMessage
            ];
        }
        
    } catch (\Exception $e) {
        Log::error('Bulk refund processing error: ' . $e->getMessage(), [
            'bulk_booking_id' => $bulkBookingId,
            'trace' => $e->getTraceAsString()
        ]);
        
        return [
            'success' => false,
            'message' => $e->getMessage()
        ];
    }
}

    /**
     * Get bulk booking details with all slots
     */
    public function getBulkBookingDetails(Request $request, $bulkBookingId): JsonResponse
    {
        try {
            $user = $request->user();
            
            $bookings = Booking::with(['futsalSlot.futsal', 'futsalSlot.timeSlot'])
                ->where('bulk_booking_id', $bulkBookingId)
                ->where('user_id', $user->id)
                ->get();

            if ($bookings->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bulk booking not found'
                ], 404);
            }

            $slots = [];
            $totalAmount = 0;
            $cancellableCount = 0;
            $now = Carbon::now();
            
            foreach ($bookings as $booking) {
                $slotDateTime = Carbon::parse($booking->futsalSlot->slot_date . ' ' . $booking->futsalSlot->timeSlot->start_time);
                $cancelDeadline = $slotDateTime->copy()->subHours(2);
                $canCancel = $booking->status === 'confirmed' && $now < $cancelDeadline;
                
                if ($canCancel) {
                    $cancellableCount++;
                }
                
                $totalAmount += $booking->futsalSlot->price;
                
                $slots[] = [
                    'id' => $booking->id,
                    'status' => $booking->status,
                    'refund_status' => $booking->refund_status,
                    'refund_amount' => $booking->refund_amount,
                    'can_cancel' => $canCancel,
                    'cancel_deadline' => $cancelDeadline,
                    'futsal_name' => $booking->futsalSlot->futsal->futsal_name ?? 'N/A',
                    'location' => $booking->futsalSlot->futsal->location ?? 'N/A',
                    'start_time' => $booking->futsalSlot->timeSlot->start_time ?? 'N/A',
                    'end_time' => $booking->futsalSlot->timeSlot->end_time ?? 'N/A',
                    'slot_date' => $booking->futsalSlot->slot_date,
                    'price' => $booking->futsalSlot->price,
                    'booking_reference' => $booking->booking_reference,
                ];
            }
            
            return response()->json([
                'success' => true,
                'data' => [
                    'bulk_booking_id' => $bulkBookingId,
                    'total_slots' => count($slots),
                    'total_amount' => $totalAmount,
                    'cancellable_count' => $cancellableCount,
                    'can_cancel_all' => $cancellableCount === count($slots),
                    'slots' => $slots
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Get bulk booking details error: ' . $e->getMessage(), [
                'bulk_booking_id' => $bulkBookingId,
                'user_id' => $request->user()?->id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load bulk booking details'
            ], 500);
        }
    }

    /**
 * Send bulk cancellation confirmation email
 */
private function sendBulkCancellationEmail($bookings, $user): void
{
    try {
        if (!$user || !$user->email) {
            Log::error('Cannot send bulk cancellation email: user not found');
            return;
        }

        $totalRefund = 0;
        $slotsList = '';
        
        foreach ($bookings as $index => $booking) {
            $slot = $booking->futsalSlot;
            $timeSlot = $slot->timeSlot;
            $futsal = $slot->futsal;
            
            // Get the refund amount - ensure it's set correctly
            $refundAmount = $booking->refund_amount ?? $booking->futsalSlot->price ?? 0;
            $totalRefund += $refundAmount;
            
            $slotDate = Carbon::parse($slot->slot_date)->format('l, F d, Y');
            $startTime = date('g:i A', strtotime($timeSlot->start_time));
            $endTime = date('g:i A', strtotime($timeSlot->end_time));
            
            $slotsList .= "\n  " . ($index + 1) . ". {$slotDate} | {$startTime} - {$endTime} | Rs. " . number_format($refundAmount, 2);
        }

        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bulk Booking Cancelled - FutsalHub</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; }
                .content { padding: 30px; }
                .booking-details { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
                .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
                .slots-list { background: #fff; padding: 15px; margin: 15px 0; border-left: 3px solid #e74c3c; white-space: pre-line; }
                .refund-amount { font-size: 20px; font-weight: 700; color: #27ae60; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>Bulk Booking Cancelled</h1>
                    <p>All selected slots have been cancelled</p>
                </div>
                <div class='content'>
                    <h2>Hello " . ($user->name ?? 'User') . ",</h2>
                    <p>Your bulk booking has been successfully cancelled.</p>
                    
                    <div class='booking-details'>
                        <h3>Cancelled Slots (" . count($bookings) . " slots)</h3>
                        <div class='slots-list'>
                            " . nl2br($slotsList) . "
                        </div>
                        
                        <div class='detail-row'>
                            <span><strong>Total Refund Amount:</strong></span>
                            <span class='refund-amount'>Rs. " . number_format($totalRefund, 2) . "</span>
                        </div>
                    </div>
                    
                    <p>The refund will be credited to your original payment method within 5-7 business days.</p>
                    <p>We hope to see you again soon!</p>
                </div>
                <div class='footer'>
                    <p>FutsalHub - Easy Futsal Booking</p>
                </div>
            </div>
        </body>
        </html>
        ";

        Mail::html($html, function ($message) use ($user) {
            $message->to($user->email, $user->name)
                    ->subject('Bulk Booking Cancelled - FutsalHub');
        });
        
        Log::info('Bulk cancellation email sent', [
            'user_id' => $user->id,
            'slots_count' => count($bookings),
            'total_refund' => $totalRefund
        ]);
        
    } catch (\Exception $e) {
        Log::error('Failed to send bulk cancellation email: ' . $e->getMessage());
    }
}

    /**
     * Cancel pending booking (before payment)
     */
    public function cancelPendingBooking(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();
            
            $booking = Booking::with('futsalSlot')
                ->where('id', $id)
                ->where('user_id', $user->id)
                ->where('status', 'pending')
                ->first();

            if (!$booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Pending booking not found'
                ], 404);
            }

            DB::beginTransaction();

            try {
                // Make slot available again
                if ($booking->futsalSlot) {
                    $booking->futsalSlot->is_available = true;
                    $booking->futsalSlot->save();
                }
                
                // Delete the pending booking
                $booking->delete();
                
                DB::commit();

                Log::info('Pending booking cancelled', [
                    'booking_id' => $booking->id,
                    'user_id' => $user->id
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Booking cancelled successfully'
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Cancel pending booking error: ' . $e->getMessage(), [
                'booking_id' => $id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel booking'
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

            $slotDateTime = Carbon::parse($booking->futsalSlot->slot_date . ' ' . $booking->futsalSlot->timeSlot->start_time);
            $now = Carbon::now();
            $cancelDeadline = $slotDateTime->copy()->subHours(2);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $booking->id,
                    'booking_reference' => $booking->booking_reference,
                    'booking_date' => $booking->booking_date,
                    'status' => $booking->status,
                    'payment_status' => $booking->payment_status,
                    'refund_status' => $booking->refund_status,
                    'refund_amount' => $booking->refund_amount,
                    'refunded_at' => $booking->refunded_at,
                    'payment_expires_at' => $booking->payment_expires_at,
                    'futsal_name' => $booking->futsalSlot->futsal->futsal_name ?? 'N/A',
                    'location' => $booking->futsalSlot->futsal->location ?? 'N/A',
                    'start_time' => $booking->futsalSlot->timeSlot->start_time ?? null,
                    'end_time' => $booking->futsalSlot->timeSlot->end_time ?? null,
                    'slot_date' => $booking->futsalSlot->slot_date,
                    'price' => $booking->futsalSlot->price,
                    'can_cancel' => $booking->status === 'confirmed' && $now < $cancelDeadline,
                    'cancel_deadline' => $cancelDeadline,
                    'created_at' => $booking->created_at,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Get booking details error: ' . $e->getMessage(), [
                'booking_id' => $id,
                'user_id' => $request->user()?->id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load booking details'
            ], 500);
        }
    }

    /**
     * Get payment history for user
     */
    public function getPaymentHistory(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            
            $payments = DB::table('payments')
                ->join('bookings', 'payments.booking_id', '=', 'bookings.id')
                ->join('futsal_slots', 'bookings.futsal_slot_id', '=', 'futsal_slots.id')
                ->join('futsals', 'futsal_slots.futsal_id', '=', 'futsals.id')
                ->join('time_slots', 'futsal_slots.slot_id', '=', 'time_slots.id')
                ->where('bookings.user_id', $user->id)
                ->select(
                    'payments.id',
                    'payments.amount',
                    'payments.payment_method',
                    'payments.transaction_id',
                    'payments.payment_date',
                    'payments.status as payment_status',
                    'bookings.id as booking_id',
                    'bookings.booking_reference',
                    'bookings.booking_date',
                    'bookings.status as booking_status',
                    'bookings.refund_status',
                    'bookings.refund_amount',
                    'bookings.refunded_at',
                    'futsals.futsal_name',
                    'time_slots.start_time',
                    'time_slots.end_time',
                    'futsal_slots.slot_date'
                )
                ->orderBy('payments.payment_date', 'desc')
                ->paginate(20);

            return response()->json([
                'success' => true,
                'data' => $payments
            ]);

        } catch (\Exception $e) {
            Log::error('Get payment history error: ' . $e->getMessage(), [
                'user_id' => $request->user()?->id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load payment history'
            ], 500);
        }
    }

    /**
     * Validate if booking can be cancelled
     */
    private function validateCancellation($booking): array
    {
        if ($booking->status !== 'confirmed') {
            return [
                'valid' => false,
                'message' => 'Only confirmed bookings can be cancelled'
            ];
        }

        if ($booking->refund_status === 'completed') {
            return [
                'valid' => false,
                'message' => 'Booking already cancelled and refunded'
            ];
        }

        $slotDate = $booking->futsalSlot->slot_date;
        $slotStartTime = $booking->futsalSlot->timeSlot->start_time;
        $slotDateTime = Carbon::parse($slotDate . ' ' . $slotStartTime);
        $now = Carbon::now();

        if ($now > $slotDateTime) {
            return [
                'valid' => false,
                'message' => 'Cannot cancel past bookings'
            ];
        }

        $cancelDeadline = $slotDateTime->copy()->subHours(2);
        
        if ($now > $cancelDeadline) {
            $remainingMinutes = $slotDateTime->diffInMinutes($now);
            $hoursLeft = floor($remainingMinutes / 60);
            $minutesLeft = $remainingMinutes % 60;
            
            return [
                'valid' => false,
                'message' => "Cannot cancel booking less than 2 hours before slot time. Only {$hoursLeft} hours and {$minutesLeft} minutes remaining."
            ];
        }

        return ['valid' => true];
    }

    /**
     * Process refund through Khalti API
     */
    private function processKhaltiRefund($booking): array
    {
        try {
            $payment = DB::table('payments')
                ->where('booking_id', $booking->id)
                ->where('status', 'completed')
                ->first();
            
            if (!$payment) {
                Log::error('Payment not found for refund', ['booking_id' => $booking->id]);
                return [
                    'success' => false,
                    'message' => 'Payment record not found'
                ];
            }

            // For development/testing - simulate successful refund
            if (env('APP_ENV') === 'local' || !env('KHALTI_SECRET_KEY')) {
                Log::info('Simulating refund for development', ['booking_id' => $booking->id]);
                
                DB::table('refunds')->insert([
                    'booking_id' => $booking->id,
                    'payment_id' => $payment->id,
                    'amount' => $payment->amount,
                    'transaction_id' => 'SIM_REFUND_' . Str::random(10),
                    'status' => 'completed',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                
                return ['success' => true];
            }

            $refundUrl = env('KHALTI_BASE_URL') . '/epayment/refund/';
            
            $payload = [
                'pidx' => $payment->transaction_id,
                'amount' => (int)($payment->amount * 100),
                'reason' => 'User requested cancellation'
            ];

            $response = Http::withHeaders([
                'Authorization' => 'Key ' . env('KHALTI_SECRET_KEY'),
                'Content-Type' => 'application/json',
            ])->timeout(30)->post($refundUrl, $payload);

            if ($response->successful()) {
                $data = $response->json();
                
                DB::table('refunds')->insert([
                    'booking_id' => $booking->id,
                    'payment_id' => $payment->id,
                    'amount' => $payment->amount,
                    'transaction_id' => $data['refund_id'] ?? null,
                    'status' => 'completed',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                
                Log::info('Refund processed successfully', [
                    'booking_id' => $booking->id,
                    'amount' => $payment->amount
                ]);
                
                return ['success' => true];
            } else {
                $errorData = $response->json();
                $errorMessage = $errorData['message'] ?? 'Khalti refund API error';
                
                Log::error('Khalti refund failed', [
                    'booking_id' => $booking->id,
                    'response' => $response->body()
                ]);
                
                return [
                    'success' => false,
                    'message' => $errorMessage
                ];
            }
            
        } catch (\Exception $e) {
            Log::error('Refund processing error: ' . $e->getMessage(), [
                'booking_id' => $booking->id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Send booking confirmation email
     */
    private function sendConfirmationEmail($booking): void
    {
        try {
            $user = User::find($booking->user_id);
            if (!$user) return;

            $slot = $booking->futsalSlot;
            $timeSlot = $slot->timeSlot;
            $futsal = $slot->futsal;

            $html = "
            <!DOCTYPE html>
            <html>
            <head>
                <title>Booking Confirmed - FutsalHub</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 30px; text-align: center; }
                    .header h1 { margin: 0; font-size: 24px; }
                    .content { padding: 30px; }
                    .booking-details { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'><h1>Booking Confirmed</h1><p>Your booking is confirmed</p></div>
                    <div class='content'>
                        <h2>Hello " . ($user->name ?? 'User') . ",</h2>
                        <p>Your booking has been confirmed successfully.</p>
                        <div class='booking-details'>
                            <h3>Booking Details</h3>
                            <div class='detail-row'><span>Booking Reference:</span><strong>" . ($booking->booking_reference ?? 'N/A') . "</strong></div>
                            <div class='detail-row'><span>Futsal:</span><strong>" . ($futsal->futsal_name ?? 'N/A') . "</strong></div>
                            <div class='detail-row'><span>Date:</span><strong>" . Carbon::parse($slot->slot_date ?? now())->format('d M Y') . "</strong></div>
                            <div class='detail-row'><span>Time:</span><strong>" . ($timeSlot->start_time ?? 'N/A') . " - " . ($timeSlot->end_time ?? 'N/A') . "</strong></div>
                            <div class='detail-row'><span>Amount Paid:</span><strong>Rs. " . ($slot->price ?? '0') . "</strong></div>
                            <div class='detail-row'><span>Transaction ID:</span><strong>" . ($booking->transaction_id ?? 'N/A') . "</strong></div>
                        </div>
                        <p>Please arrive on time for your booking.</p>
                        <p>Cancellation Policy: Free cancellation up to 2 hours before the slot time.</p>
                    </div>
                    <div class='footer'><p>FutsalHub - Easy Futsal Booking</p></div>
                </div>
            </body>
            </html>
            ";

            Mail::html($html, function ($message) use ($user) {
                $message->to($user->email, $user->name)
                        ->subject('Booking Confirmed - FutsalHub');
            });
            
            Log::info('Confirmation email sent', ['booking_id' => $booking->id]);
            
        } catch (\Exception $e) {
            Log::error('Failed to send confirmation email: ' . $e->getMessage());
        }
    }

    /**
     * Send cancellation confirmation email
     */
    private function sendCancellationEmail($booking): void
    {
        try {
            $user = User::find($booking->user_id);
            if (!$user) return;

            $slot = $booking->futsalSlot;
            $timeSlot = $slot->timeSlot;
            $futsal = $slot->futsal;

            $html = "
            <!DOCTYPE html>
            <html>
            <head>
                <title>Booking Cancelled - FutsalHub</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; text-align: center; }
                    .header h1 { margin: 0; font-size: 24px; }
                    .content { padding: 30px; }
                    .booking-details { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
                    .refund-amount { font-size: 20px; font-weight: 700; color: #27ae60; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'><h1>Booking Cancelled</h1><p>Your booking has been cancelled</p></div>
                    <div class='content'>
                        <h2>Hello " . ($user->name ?? 'User') . ",</h2>
                        <p>Your booking has been successfully cancelled.</p>
                        <div class='booking-details'>
                            <h3>Cancelled Booking Details</h3>
                            <div class='detail-row'><span>Futsal:</span><strong>" . ($futsal->futsal_name ?? 'N/A') . "</strong></div>
                            <div class='detail-row'><span>Date:</span><strong>" . Carbon::parse($slot->slot_date ?? now())->format('d M Y') . "</strong></div>
                            <div class='detail-row'><span>Time:</span><strong>" . ($timeSlot->start_time ?? 'N/A') . " - " . ($timeSlot->end_time ?? 'N/A') . "</strong></div>
                            <div class='detail-row'><span>Refund Amount:</span><strong class='refund-amount'>Rs. " . ($booking->refund_amount ?? '0') . "</strong></div>
                        </div>
                        <p>The refund will be credited to your original payment method within 5-7 business days.</p>
                    </div>
                    <div class='footer'><p>FutsalHub - Easy Futsal Booking</p></div>
                </div>
            </body>
            </html>
            ";

            Mail::html($html, function ($message) use ($user) {
                $message->to($user->email, $user->name)
                        ->subject('Booking Cancelled - FutsalHub');
            });
            
            Log::info('Cancellation email sent', ['booking_id' => $booking->id]);
            
        } catch (\Exception $e) {
            Log::error('Failed to send cancellation email: ' . $e->getMessage());
        }
    }
}