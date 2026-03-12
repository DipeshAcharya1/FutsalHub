<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class AdminDashboardController extends Controller
{
    // =============================================
    // FUTSAL INFO
    // =============================================
    public function futsal($futsal): JsonResponse
    {
        try {
            Log::info('Fetching futsal with ID: ' . $futsal);
            
            $data = DB::table('futsals')
                ->where('id', $futsal)
                ->first();
            
            if (!$data) {
                Log::error('Futsal not found with ID: ' . $futsal);
                return response()->json(['error' => 'Futsal not found'], 404);
            }
            
            // Check if futsal is active (default to true if column doesn't exist)
            $isActive = isset($data->active) ? $data->active : true;
            
            // Ensure image URL is full URL
            if ($data->image && !str_starts_with($data->image, 'http')) {
                $data->image = asset($data->image);
            }
            
            // Add status information
            $data->is_active = $isActive;
            $data->access_level = $isActive ? 'full' : 'read_only';
            
            Log::info('Futsal data found. Active: ' . ($isActive ? 'Yes' : 'No'));
            return response()->json($data);
            
        } catch (\Exception $e) {
            Log::error('Error fetching futsal: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    // =============================================
    // UPDATE FUTSAL INFO 
    // =============================================
    public function updateFutsal(Request $request, $futsal): JsonResponse
    {
        try {
            // First check if futsal is active
            $currentFutsal = DB::table('futsals')->where('id', $futsal)->first();
            
            if (!$currentFutsal) {
                return response()->json(['error' => 'Futsal not found'], 404);
            }
            
            // Check if futsal is active - prevent updates if deactivated
            $isActive = isset($currentFutsal->active) ? $currentFutsal->active : true;
            if (!$isActive) {
                return response()->json([
                    'error' => 'Cannot update a deactivated futsal',
                    'code' => 'FUTSAL_DEACTIVATED'
                ], 403);
            }
            
            $validator = Validator::make($request->all(), [
                'futsal_name' => 'required|string|max:255',
                'location' => 'required|string',
                'contact_number' => 'required|string',
                'description' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $updateData = [
                'futsal_name' => $request->futsal_name,
                'location' => $request->location,
                'contact_number' => $request->contact_number,
                'description' => $request->description,
                'updated_at' => now(),
            ];

            DB::table('futsals')
                ->where('id', $futsal)
                ->update($updateData);

            $updatedFutsal = DB::table('futsals')
                ->where('id', $futsal)
                ->first();

            // Ensure image URL is full URL
            if ($updatedFutsal->image && !str_starts_with($updatedFutsal->image, 'http')) {
                $updatedFutsal->image = asset($updatedFutsal->image);
            }

            return response()->json($updatedFutsal);
            
        } catch (\Exception $e) {
            Log::error('Error updating futsal: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    // =============================================
    // UPLOAD IMAGE ONLY (separate endpoint)
    // =============================================
    public function uploadImage(Request $request, $futsal): JsonResponse
    {
        try {
            // First check if futsal is active
            $currentFutsal = DB::table('futsals')->where('id', $futsal)->first();
            
            if (!$currentFutsal) {
                return response()->json(['error' => 'Futsal not found'], 404);
            }
            
            // Check if futsal is active - prevent image upload if deactivated
            $isActive = isset($currentFutsal->active) ? $currentFutsal->active : true;
            if (!$isActive) {
                return response()->json([
                    'error' => 'Cannot upload images for a deactivated futsal',
                    'code' => 'FUTSAL_DEACTIVATED'
                ], 403);
            }
            
            $validator = Validator::make($request->all(), [
                'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }
            
            // Delete old image if exists
            if ($currentFutsal && $currentFutsal->image) {
                // Extract filename from URL
                $path = parse_url($currentFutsal->image, PHP_URL_PATH);
                $filename = basename($path);
                
                // Check if file exists in storage
                if ($filename && Storage::disk('public')->exists('futsals/' . $filename)) {
                    Storage::disk('public')->delete('futsals/' . $filename);
                }
            }

            // Store new image - use 'public' disk explicitly
            $path = $request->file('image')->store('futsals', 'public');
            
            // Generate the full URL using asset() helper
            $imageUrl = asset('storage/' . $path);

            DB::table('futsals')
                ->where('id', $futsal)
                ->update([
                    'image' => $imageUrl,
                    'updated_at' => now(),
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Image uploaded successfully',
                'image_url' => $imageUrl
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error uploading image: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error: ' . $e->getMessage()], 500);
        }
    }

    // =============================================
    // DELETE IMAGE
    // =============================================
    public function deleteImage(Request $request, $futsal): JsonResponse
    {
        try {
            $currentFutsal = DB::table('futsals')->where('id', $futsal)->first();
            
            if (!$currentFutsal) {
                return response()->json(['error' => 'Futsal not found'], 404);
            }
            
            // Check if futsal is active - prevent image deletion if deactivated
            $isActive = isset($currentFutsal->active) ? $currentFutsal->active : true;
            if (!$isActive) {
                return response()->json([
                    'error' => 'Cannot delete images from a deactivated futsal',
                    'code' => 'FUTSAL_DEACTIVATED'
                ], 403);
            }
            
            if ($currentFutsal && $currentFutsal->image) {
                // Extract filename from URL
                $path = parse_url($currentFutsal->image, PHP_URL_PATH);
                $filename = basename($path);
                
                // Check if file exists in storage
                if ($filename && Storage::disk('public')->exists('futsals/' . $filename)) {
                    Storage::disk('public')->delete('futsals/' . $filename);
                }

                DB::table('futsals')
                    ->where('id', $futsal)
                    ->update([
                        'image' => null,
                        'updated_at' => now(),
                    ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Image deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error deleting image: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    // =============================================
    // FUTSAL SLOTS (Courts)
    // =============================================
    public function courts($futsal): JsonResponse
    {
        try {
            if (!Schema::hasTable('futsal_slots')) {
                return response()->json([
                    'slots' => [],
                    'futsal_active' => true,
                    'can_modify' => true
                ]);
            }

            // First check if futsal exists and get its status
            $futsalData = DB::table('futsals')->where('id', $futsal)->first();
            if (!$futsalData) {
                return response()->json(['error' => 'Futsal not found'], 404);
            }
            
            $isActive = isset($futsalData->active) ? $futsalData->active : true;

            $slots = DB::table('futsal_slots')
                ->join('time_slots', 'futsal_slots.slot_id', '=', 'time_slots.id')
                ->where('futsal_slots.futsal_id', $futsal)
                ->select(
                    'futsal_slots.*',
                    'time_slots.start_time',
                    'time_slots.end_time'
                )
                ->orderBy('futsal_slots.id', 'asc')
                ->get();

            // Add a flag to indicate if modifications are allowed
            $response = [
                'slots' => $slots,
                'futsal_active' => $isActive,
                'can_modify' => $isActive
            ];

            return response()->json($response);
            
        } catch (\Exception $e) {
            Log::error('Error fetching courts: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    public function storeCourt(Request $request, $futsal): JsonResponse
    {
        try {
            // Check if futsal is active before allowing slot creation
            $futsalData = DB::table('futsals')->where('id', $futsal)->first();
            if (!$futsalData) {
                return response()->json(['error' => 'Futsal not found'], 404);
            }
            
            $isActive = isset($futsalData->active) ? $futsalData->active : true;
            if (!$isActive) {
                return response()->json([
                    'error' => 'Cannot add slots to a deactivated futsal',
                    'code' => 'FUTSAL_DEACTIVATED'
                ], 403);
            }
            
            $validator = Validator::make($request->all(), [
                'slot_id'      => 'required|exists:time_slots,id',
                'price'        => 'required|numeric',
                'slot_date'    => 'required|date',
                'is_available' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $id = DB::table('futsal_slots')->insertGetId([
                'futsal_id'    => $futsal,
                'slot_id'      => $request->slot_id,
                'price'        => $request->price,
                'slot_date'    => $request->slot_date,
                'is_available' => $request->is_available ?? true,
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);

            $slot = DB::table('futsal_slots')
                ->join('time_slots', 'futsal_slots.slot_id', '=', 'time_slots.id')
                ->where('futsal_slots.id', $id)
                ->select('futsal_slots.*', 'time_slots.start_time', 'time_slots.end_time')
                ->first();

            return response()->json($slot, 201);
            
        } catch (\Exception $e) {
            Log::error('Error storing court: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    public function updateCourt(Request $request, $futsal, $id): JsonResponse
    {
        try {
            // Check if futsal is active before allowing slot update
            $futsalData = DB::table('futsals')->where('id', $futsal)->first();
            if (!$futsalData) {
                return response()->json(['error' => 'Futsal not found'], 404);
            }
            
            $isActive = isset($futsalData->active) ? $futsalData->active : true;
            if (!$isActive) {
                return response()->json([
                    'error' => 'Cannot update slots in a deactivated futsal',
                    'code' => 'FUTSAL_DEACTIVATED'
                ], 403);
            }
            
            $validator = Validator::make($request->all(), [
                'slot_id'      => 'required|exists:time_slots,id',
                'price'        => 'required|numeric',
                'slot_date'    => 'required|date',
                'is_available' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            DB::table('futsal_slots')
                ->where('id', $id)
                ->where('futsal_id', $futsal)
                ->update([
                    'slot_id'      => $request->slot_id,
                    'price'        => $request->price,
                    'slot_date'    => $request->slot_date,
                    'is_available' => $request->is_available ?? true,
                    'updated_at'   => now(),
                ]);

            $slot = DB::table('futsal_slots')
                ->join('time_slots', 'futsal_slots.slot_id', '=', 'time_slots.id')
                ->where('futsal_slots.id', $id)
                ->select('futsal_slots.*', 'time_slots.start_time', 'time_slots.end_time')
                ->first();

            return response()->json($slot);
            
        } catch (\Exception $e) {
            Log::error('Error updating court: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    public function toggleActive($futsal, $id): JsonResponse
    {
        try {
            // Check if futsal is active before allowing slot toggle
            $futsalData = DB::table('futsals')->where('id', $futsal)->first();
            if (!$futsalData) {
                return response()->json(['error' => 'Futsal not found'], 404);
            }
            
            $isActive = isset($futsalData->active) ? $futsalData->active : true;
            if (!$isActive) {
                return response()->json([
                    'error' => 'Cannot modify slots in a deactivated futsal',
                    'code' => 'FUTSAL_DEACTIVATED'
                ], 403);
            }
            
            $slot = DB::table('futsal_slots')
                ->where('id', $id)
                ->where('futsal_id', $futsal)
                ->first();

            if (!$slot) {
                return response()->json(['message' => 'Slot not found'], 404);
            }

            $new = !$slot->is_available;

            DB::table('futsal_slots')
                ->where('id', $id)
                ->update([
                    'is_available' => $new,
                    'updated_at'   => now(),
                ]);

            return response()->json([
                'id' => $id,
                'is_available' => $new,
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error toggling active: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    public function deleteCourt($futsal, $id): JsonResponse
    {
        try {
            // Check if futsal is active before allowing slot deletion
            $futsalData = DB::table('futsals')->where('id', $futsal)->first();
            if (!$futsalData) {
                return response()->json(['error' => 'Futsal not found'], 404);
            }
            
            $isActive = isset($futsalData->active) ? $futsalData->active : true;
            if (!$isActive) {
                return response()->json([
                    'error' => 'Cannot delete slots from a deactivated futsal',
                    'code' => 'FUTSAL_DEACTIVATED'
                ], 403);
            }
            
            DB::table('futsal_slots')
                ->where('id', $id)
                ->where('futsal_id', $futsal)
                ->delete();

            return response()->json(['deleted' => true]);
            
        } catch (\Exception $e) {
            Log::error('Error deleting court: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    // =============================================
    // TIME SLOTS
    // =============================================
    public function timeSlots(): JsonResponse
    {
        try {
            $timeSlots = DB::table('time_slots')
                ->orderBy('start_time', 'asc')
                ->get();

            return response()->json($timeSlots);
            
        } catch (\Exception $e) {
            Log::error('Error fetching time slots: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    // =============================================
    // BOOKINGS
    // =============================================
    public function bookings($futsal): JsonResponse
    {
        try {
            $bookings = DB::table('bookings')
                ->join('futsal_slots', 'bookings.futsal_slot_id', '=', 'futsal_slots.id')
                ->join('time_slots', 'futsal_slots.slot_id', '=', 'time_slots.id')
                ->leftJoin('users', 'bookings.user_id', '=', 'users.id')
                ->where('futsal_slots.futsal_id', $futsal)
                ->select(
                    'bookings.id',
                    'bookings.user_id',
                    'bookings.futsal_slot_id',
                    'bookings.booking_date',
                    'bookings.status',
                    'bookings.payment_status',
                    'bookings.created_at',
                    'bookings.updated_at',
                    'users.name as user_name',
                    'users.email as user_email',
                    'users.phone as user_phone',
                    DB::raw("CONCAT(time_slots.start_time, ' - ', time_slots.end_time) as slot_time"),
                    'futsal_slots.slot_date',
                    'futsal_slots.price',
                    'futsal_slots.is_available'
                )
                ->orderBy('bookings.id', 'desc')
                ->get();

            return response()->json($bookings);
            
        } catch (\Exception $e) {
            Log::error('Error fetching bookings: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    public function updateBookingStatus(Request $request, $futsal, $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'status' => 'required|in:confirmed,cancelled,pending',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            DB::table('bookings')->where('id', $id)->update([
                'status' => $request->status,
                'updated_at' => now(),
            ]);

            return response()->json(['id' => $id, 'status' => $request->status]);
            
        } catch (\Exception $e) {
            Log::error('Error updating booking status: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    // =============================================
    // USERS
    // =============================================
    public function users($futsal): JsonResponse
    {
        try {
            $users = DB::table('users')
                ->join('bookings', 'users.id', '=', 'bookings.user_id')
                ->join('futsal_slots', 'bookings.futsal_slot_id', '=', 'futsal_slots.id')
                ->where('futsal_slots.futsal_id', $futsal)
                ->select('users.*')
                ->distinct()
                ->orderBy('users.id', 'desc')
                ->get();

            return response()->json($users);
            
        } catch (\Exception $e) {
            Log::error('Error fetching users: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    // =============================================
    // PAYMENTS
    // =============================================
    public function payments($futsal): JsonResponse
    {
        try {
            $payments = DB::table('payments')
                ->join('bookings', 'payments.booking_id', '=', 'bookings.id')
                ->join('futsal_slots', 'bookings.futsal_slot_id', '=', 'futsal_slots.id')
                ->join('time_slots', 'futsal_slots.slot_id', '=', 'time_slots.id')
                ->leftJoin('users', 'bookings.user_id', '=', 'users.id')
                ->where('futsal_slots.futsal_id', $futsal)
                ->select(
                    'payments.id',
                    'payments.booking_id',
                    'payments.amount',
                    'payments.payment_method',
                    'payments.transaction_id',
                    'payments.payment_date',
                    'payments.created_at',
                    'users.name as user_name',
                    'bookings.booking_date',
                    DB::raw("CONCAT(time_slots.start_time, ' - ', time_slots.end_time) as slot_time")
                )
                ->orderBy('payments.id', 'desc')
                ->get();

            return response()->json($payments);
            
        } catch (\Exception $e) {
            Log::error('Error fetching payments: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    // =============================================
    // REPORTS
    // =============================================
    public function reports(Request $request, $futsal): JsonResponse
    {
        try {
            // Get date filter if provided
            $date = $request->date;
            $period = $request->period ?? 'daily';

            $query = DB::table('bookings')
                ->join('futsal_slots', 'bookings.futsal_slot_id', '=', 'futsal_slots.id')
                ->where('futsal_slots.futsal_id', $futsal);

            if ($date) {
                if ($period === 'daily') {
                    $query->whereDate('bookings.booking_date', $date);
                } elseif ($period === 'weekly') {
                    $start = date('Y-m-d', strtotime($date . ' -6 days'));
                    $query->whereBetween('bookings.booking_date', [$start, $date]);
                } elseif ($period === 'monthly') {
                    $month = date('m', strtotime($date));
                    $year = date('Y', strtotime($date));
                    $query->whereYear('bookings.booking_date', $year)
                          ->whereMonth('bookings.booking_date', $month);
                }
            }

            $totalBookings = $query->count();

            $confirmedBookings = (clone $query)->where('bookings.status', 'confirmed')->count();
            $cancelledBookings = (clone $query)->where('bookings.status', 'cancelled')->count();
            $pendingBookings = (clone $query)->where('bookings.status', 'pending')->count();

            // Revenue calculation
            $revenueQuery = DB::table('payments')
                ->join('bookings', 'payments.booking_id', '=', 'bookings.id')
                ->join('futsal_slots', 'bookings.futsal_slot_id', '=', 'futsal_slots.id')
                ->where('futsal_slots.futsal_id', $futsal);

            if ($date) {
                if ($period === 'daily') {
                    $revenueQuery->whereDate('payments.payment_date', $date);
                } elseif ($period === 'weekly') {
                    $start = date('Y-m-d', strtotime($date . ' -6 days'));
                    $revenueQuery->whereBetween('payments.payment_date', [$start, $date]);
                } elseif ($period === 'monthly') {
                    $month = date('m', strtotime($date));
                    $year = date('Y', strtotime($date));
                    $revenueQuery->whereYear('payments.payment_date', $year)
                                 ->whereMonth('payments.payment_date', $month);
                }
            }

            $totalRevenue = $revenueQuery->sum('payments.amount');

            // Get recent bookings for breakdown
            $recentBookings = DB::table('bookings')
                ->join('futsal_slots', 'bookings.futsal_slot_id', '=', 'futsal_slots.id')
                ->join('time_slots', 'futsal_slots.slot_id', '=', 'time_slots.id')
                ->leftJoin('users', 'bookings.user_id', '=', 'users.id')
                ->where('futsal_slots.futsal_id', $futsal)
                ->orderBy('bookings.id', 'desc')
                ->limit(10)
                ->select(
                    'bookings.id',
                    'bookings.booking_date',
                    'bookings.status',
                    'bookings.payment_status',
                    'users.name as user_name',
                    DB::raw("CONCAT(time_slots.start_time, ' - ', time_slots.end_time) as slot_time")
                )
                ->get();

            return response()->json([
                'total_bookings' => $totalBookings,
                'confirmed' => $confirmedBookings,
                'cancelled' => $cancelledBookings,
                'pending' => $pendingBookings,
                'revenue' => $totalRevenue,
                'bookings' => $recentBookings,
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error generating report: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }
}