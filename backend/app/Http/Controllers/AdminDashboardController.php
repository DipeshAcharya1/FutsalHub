<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

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
            
            $isActive = isset($data->active) ? $data->active : true;
            
            if ($data->image && !str_starts_with($data->image, 'http')) {
                $data->image = asset($data->image);
            }
            
            $data->is_active = $isActive;
            $data->access_level = $isActive ? 'full' : 'read_only';
            
            Log::info('Futsal data found. Active: ' . ($isActive ? 'Yes' : 'No'));
            return response()->json($data);
            
        } catch (\Exception $e) {
            Log::error('Error fetching futsal: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    public function updateFutsal(Request $request, $futsal): JsonResponse
    {
        try {
            $currentFutsal = DB::table('futsals')->where('id', $futsal)->first();
            
            if (!$currentFutsal) {
                return response()->json(['error' => 'Futsal not found'], 404);
            }
            
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

            DB::table('futsals')
                ->where('id', $futsal)
                ->update([
                    'futsal_name' => $request->futsal_name,
                    'location' => $request->location,
                    'contact_number' => $request->contact_number,
                    'description' => $request->description,
                    'updated_at' => now(),
                ]);

            $updatedFutsal = DB::table('futsals')->where('id', $futsal)->first();

            if ($updatedFutsal->image && !str_starts_with($updatedFutsal->image, 'http')) {
                $updatedFutsal->image = asset($updatedFutsal->image);
            }

            return response()->json($updatedFutsal);
            
        } catch (\Exception $e) {
            Log::error('Error updating futsal: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    public function uploadImage(Request $request, $futsal): JsonResponse
    {
        try {
            $currentFutsal = DB::table('futsals')->where('id', $futsal)->first();
            
            if (!$currentFutsal) {
                return response()->json(['error' => 'Futsal not found'], 404);
            }
            
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
            
            if ($currentFutsal->image) {
                $path = parse_url($currentFutsal->image, PHP_URL_PATH);
                $filename = basename($path);
                
                if ($filename && Storage::disk('public')->exists('futsals/' . $filename)) {
                    Storage::disk('public')->delete('futsals/' . $filename);
                }
            }

            $path = $request->file('image')->store('futsals', 'public');
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

    public function deleteImage(Request $request, $futsal): JsonResponse
    {
        try {
            $currentFutsal = DB::table('futsals')->where('id', $futsal)->first();
            
            if (!$currentFutsal) {
                return response()->json(['error' => 'Futsal not found'], 404);
            }
            
            $isActive = isset($currentFutsal->active) ? $currentFutsal->active : true;
            if (!$isActive) {
                return response()->json([
                    'error' => 'Cannot delete images from a deactivated futsal',
                    'code' => 'FUTSAL_DEACTIVATED'
                ], 403);
            }
            
            if ($currentFutsal->image) {
                $path = parse_url($currentFutsal->image, PHP_URL_PATH);
                $filename = basename($path);
                
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




// Update getUserBookings to check restriction status
public function getUserBookings($futsal, $userId)
{
    try {
        Log::info('getUserBookings called', ['futsal' => $futsal, 'userId' => $userId]);
        
        // Get user's recent bookings ONLY for this specific futsal
        $bookings = DB::table('bookings')
            ->join('futsal_slots', 'bookings.futsal_slot_id', '=', 'futsal_slots.id')
            ->join('time_slots', 'futsal_slots.slot_id', '=', 'time_slots.id')
            ->where('futsal_slots.futsal_id', $futsal)
            ->where('bookings.user_id', $userId)
            ->select(
                'bookings.id',
                'bookings.status',
                'bookings.payment_status',
                'bookings.refund_status',
                'bookings.refund_amount',
                'futsal_slots.slot_date',
                'futsal_slots.price',
                DB::raw("CONCAT(time_slots.start_time, ' - ', time_slots.end_time) as slot_time")
            )
            ->orderBy('bookings.created_at', 'desc')
            ->limit(5)
            ->get();
        
        Log::info('Bookings found', ['count' => $bookings->count()]);
        
        // Get user statistics for THIS futsal only
        $allUserBookings = DB::table('bookings')
            ->join('futsal_slots', 'bookings.futsal_slot_id', '=', 'futsal_slots.id')
            ->where('futsal_slots.futsal_id', $futsal)
            ->where('bookings.user_id', $userId)
            ->select('bookings.status', 'bookings.payment_status', 'bookings.refund_status', 'futsal_slots.price')
            ->get();
        
        // Check if user is restricted from this specific futsal
        $isRestricted = $this->isUserRestricted($futsal, $userId);
        
        $stats = [
            'total_bookings' => $allUserBookings->count(),
            'confirmed' => $allUserBookings->where('status', 'confirmed')->count(),
            'cancelled' => $allUserBookings->where('status', 'cancelled')->count(),
            'pending' => $allUserBookings->where('status', 'pending')->count(),
            'total_spent' => $allUserBookings->where('status', 'confirmed')->sum('price'),
            'total_refunded' => $allUserBookings->where('refund_status', 'completed')->sum('price'),
            'is_restricted' => $isRestricted
        ];
        
        return response()->json([
            'bookings' => $bookings,
            'stats' => $stats
        ]);
        
    } catch (\Exception $e) {
        Log::error('Error fetching user bookings: ' . $e->getMessage());
        Log::error($e->getTraceAsString());
        return response()->json(['error' => 'Internal server error: ' . $e->getMessage()], 500);
    }
}

// Restrict user from booking at futsal
public function restrictUser($futsal, $userId)
{
    try {
        // Get current restricted users
        $futsalData = DB::table('futsals')
            ->where('id', $futsal)
            ->select('restricted_users')
            ->first();
        
        $restrictedUsers = [];
        if ($futsalData && $futsalData->restricted_users) {
            $restrictedUsers = json_decode($futsalData->restricted_users, true) ?: [];
        }
        
        // Add user if not already restricted
        if (!in_array($userId, $restrictedUsers)) {
            $restrictedUsers[] = (int)$userId;
        }
        
        // Update the futsal record
        DB::table('futsals')
            ->where('id', $futsal)
            ->update([
                'restricted_users' => json_encode($restrictedUsers),
                'updated_at' => now()
            ]);
        
        return response()->json(['success' => true, 'message' => 'User restricted successfully']);
        
    } catch (\Exception $e) {
        Log::error('Error restricting user: ' . $e->getMessage());
        return response()->json(['error' => 'Failed to restrict user: ' . $e->getMessage()], 500);
    }
}

// Unrestrict user - remove from restriction list
public function unrestrictUser($futsal, $userId)
{
    try {
        // Get current restricted users
        $futsalData = DB::table('futsals')
            ->where('id', $futsal)
            ->select('restricted_users')
            ->first();
        
        $restrictedUsers = [];
        if ($futsalData && $futsalData->restricted_users) {
            $restrictedUsers = json_decode($futsalData->restricted_users, true) ?: [];
        }
        
        // Remove user from array
        $restrictedUsers = array_filter($restrictedUsers, function($id) use ($userId) {
            return $id != $userId;
        });
        
        // Update the futsal record
        DB::table('futsals')
            ->where('id', $futsal)
            ->update([
                'restricted_users' => json_encode(array_values($restrictedUsers)),
                'updated_at' => now()
            ]);
        
        return response()->json(['success' => true, 'message' => 'User unrestricted successfully']);
        
    } catch (\Exception $e) {
        Log::error('Error unrestricting user: ' . $e->getMessage());
        return response()->json(['error' => 'Failed to unrestrict user: ' . $e->getMessage()], 500);
    }
}

// Check if user is restricted (add this helper method)
private function isUserRestricted($futsal, $userId)
{
    $futsalData = DB::table('futsals')
        ->where('id', $futsal)
        ->select('restricted_users')
        ->first();
    
    if ($futsalData && $futsalData->restricted_users) {
        $restrictedUsers = json_decode($futsalData->restricted_users, true) ?: [];
        return in_array($userId, $restrictedUsers);
    }
    
    return false;
}

    // =============================================
    // FUTSAL SETTINGS 
    // =============================================
    
    public function getSettings($futsal): JsonResponse
{
    try {
        $settings = DB::table('futsal_settings')
            ->where('futsal_id', $futsal)
            ->first();
        
        if (!$settings) {
            return response()->json([
                'open_time' => '06:00',
                'close_time' => '22:00',
                'slot_duration' => 60,
                // 'break_time' => 0, // REMOVE THIS
                'default_price' => 1500,
                'peak_morning_start' => '06:00',
                'peak_morning_end' => '09:00',
                'peak_evening_start' => '17:00',
                'peak_evening_end' => '21:00',
                'peak_price_multiplier' => 1.30,
                'off_peak_price_multiplier' => 1.00
            ]);
        }
        
        return response()->json($settings);
    } catch (\Exception $e) {
        Log::error('Error fetching settings: ' . $e->getMessage());
        return response()->json([
            'open_time' => '06:00',
            'close_time' => '22:00',
            'slot_duration' => 60,
            // 'break_time' => 0, // REMOVE THIS
            'default_price' => 1500,
            'peak_morning_start' => '06:00',
            'peak_morning_end' => '09:00',
            'peak_evening_start' => '17:00',
            'peak_evening_end' => '21:00',
            'peak_price_multiplier' => 1.30,
            'off_peak_price_multiplier' => 1.00
        ]);
    }
}

    public function saveSettings(Request $request, $futsal): JsonResponse
{
    try {
        $validator = Validator::make($request->all(), [
            'open_time' => 'required|date_format:H:i',
            'close_time' => 'required|date_format:H:i|after:open_time',
            'slot_duration' => 'required|integer|min:30|max:180',
            'default_price' => 'required|numeric|min:0',
            'peak_morning_start' => 'nullable|date_format:H:i',
            'peak_morning_end' => 'nullable|date_format:H:i',
            'peak_evening_start' => 'nullable|date_format:H:i',
            'peak_evening_end' => 'nullable|date_format:H:i',
            'peak_price_multiplier' => 'nullable|numeric|min:0.50|max:2.00',
            'off_peak_price_multiplier' => 'nullable|numeric|min:0.50|max:1.00'
        ]);
        
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        
        // Remove break_time from the update array
        DB::table('futsal_settings')->updateOrInsert(
            ['futsal_id' => $futsal],
            [
                'open_time' => $request->open_time,
                'close_time' => $request->close_time,
                'slot_duration' => $request->slot_duration,
                // 'break_time' => 0, // REMOVE THIS LINE - column doesn't exist
                'default_price' => $request->default_price,
                'peak_morning_start' => $request->peak_morning_start ?? null,
                'peak_morning_end' => $request->peak_morning_end ?? null,
                'peak_evening_start' => $request->peak_evening_start ?? null,
                'peak_evening_end' => $request->peak_evening_end ?? null,
                'peak_price_multiplier' => $request->peak_price_multiplier ?? 1.30,
                'off_peak_price_multiplier' => $request->off_peak_price_multiplier ?? 1.00,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
        
        return response()->json([
            'success' => true,
            'message' => 'Settings saved successfully'
        ]);
    } catch (\Exception $e) {
        Log::error('Error saving settings: ' . $e->getMessage());
        return response()->json(['error' => 'Internal server error: ' . $e->getMessage()], 500);
    }
}
    
    // =============================================
    // SLOT GENERATION (NO BREAK TIME)
    // =============================================
    
    private function calculateTimeSlots($openTime, $closeTime, $slotDuration)
    {
        $slots = [];
        $current = Carbon::parse($openTime);
        $end = Carbon::parse($closeTime);
        
        while ($current->lt($end)) {
            $slotEnd = $current->copy()->addMinutes($slotDuration);
            
            if ($slotEnd->lte($end)) {
                $slots[] = [
                    'start_time' => $current->format('H:i:s'),
                    'end_time' => $slotEnd->format('H:i:s'),
                ];
                $current = $slotEnd;
            } else {
                break;
            }
        }
        
        return $slots;
    }

    private function calculateSlotPrice($startTime, $settings)
    {
        $startTimeFormatted = substr($startTime, 0, 5); // Convert H:i:s to H:i
        $basePrice = $settings->default_price;
        
        // Check if time falls in morning peak
        $isMorningPeak = false;
        if ($settings->peak_morning_start && $settings->peak_morning_end) {
            $isMorningPeak = $startTimeFormatted >= $settings->peak_morning_start && 
                             $startTimeFormatted < $settings->peak_morning_end;
        }
        
        // Check if time falls in evening peak
        $isEveningPeak = false;
        if ($settings->peak_evening_start && $settings->peak_evening_end) {
            $isEveningPeak = $startTimeFormatted >= $settings->peak_evening_start && 
                             $startTimeFormatted < $settings->peak_evening_end;
        }
        
        if ($isMorningPeak || $isEveningPeak) {
            $price = $basePrice * $settings->peak_price_multiplier;
            $priceType = 'peak';
        } else {
            $price = $basePrice * $settings->off_peak_price_multiplier;
            $priceType = 'off_peak';
        }
        
        return [
            'price' => round($price, 2),
            'price_type' => $priceType,
            'original_price' => $basePrice
        ];
    }
    
    public function generateSlots(Request $request, $futsal): JsonResponse
    {
        try {
            $settings = DB::table('futsal_settings')->where('futsal_id', $futsal)->first();
            if (!$settings) {
                return response()->json(['error' => 'Please configure settings first'], 400);
            }
            
            $validator = Validator::make($request->all(), [
                'slot_date' => 'required|date|after_or_equal:today',
                'price' => 'nullable|numeric|min:0',
            ]);
            
            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }
            
            $slotDate = $request->slot_date;
            $customPrice = $request->price;
            
            $timeSlots = $this->calculateTimeSlots(
                $settings->open_time,
                $settings->close_time,
                $settings->slot_duration
            );
            
            $createdSlots = [];
            $existingCount = 0;
            
            DB::beginTransaction();
            
            try {
                foreach ($timeSlots as $slot) {
                    // Calculate price based on time of day
                    if ($customPrice) {
                        $price = $customPrice;
                        $priceType = 'custom';
                        $originalPrice = null;
                    } else {
                        $priceData = $this->calculateSlotPrice($slot['start_time'], $settings);
                        $price = $priceData['price'];
                        $priceType = $priceData['price_type'];
                        $originalPrice = $priceData['original_price'];
                    }
                    
                    $timeSlot = DB::table('time_slots')
                        ->where('start_time', $slot['start_time'])
                        ->where('end_time', $slot['end_time'])
                        ->first();
                    
                    if (!$timeSlot) {
                        $timeSlotId = DB::table('time_slots')->insertGetId([
                            'start_time' => $slot['start_time'],
                            'end_time' => $slot['end_time'],
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    } else {
                        $timeSlotId = $timeSlot->id;
                    }
                    
                    $existing = DB::table('futsal_slots')
                        ->where('futsal_id', $futsal)
                        ->where('slot_id', $timeSlotId)
                        ->where('slot_date', $slotDate)
                        ->first();
                    
                    if ($existing) {
                        $existingCount++;
                        continue;
                    }
                    
                    $futsalSlotId = DB::table('futsal_slots')->insertGetId([
                        'futsal_id' => $futsal,
                        'slot_id' => $timeSlotId,
                        'price' => $price,
                        'price_type' => $priceType,
                        'original_price' => $originalPrice,
                        'slot_date' => $slotDate,
                        'is_available' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    
                    $createdSlots[] = [
                        'id' => $futsalSlotId,
                        'start_time' => $slot['start_time'],
                        'end_time' => $slot['end_time'],
                        'price' => $price,
                        'price_type' => $priceType,
                        'slot_date' => $slotDate,
                    ];
                }
                
                DB::commit();
                
                $peakCount = count(array_filter($createdSlots, fn($s) => $s['price_type'] === 'peak'));
                $offPeakCount = count(array_filter($createdSlots, fn($s) => $s['price_type'] === 'off_peak'));
                
                return response()->json([
                    'success' => true,
                    'message' => "Generated " . count($createdSlots) . " slots for " . $slotDate,
                    'data' => [
                        'total' => count($createdSlots),
                        'peak_slots' => $peakCount,
                        'off_peak_slots' => $offPeakCount,
                        'slots' => $createdSlots
                    ]
                ]);
                
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
            
        } catch (\Exception $e) {
            Log::error('Error generating slots: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }
    
    public function bulkGenerateSlots(Request $request, $futsal): JsonResponse
    {
        try {
            $settings = DB::table('futsal_settings')->where('futsal_id', $futsal)->first();
            if (!$settings) {
                return response()->json(['error' => 'Please configure settings first'], 400);
            }
            
            $validator = Validator::make($request->all(), [
                'start_date' => 'required|date|after_or_equal:today',
                'end_date' => 'required|date|after_or_equal:start_date',
                'price' => 'nullable|numeric|min:0',
                'days_of_week' => 'nullable|array',
                'days_of_week.*' => 'integer|between:0,6'
            ]);
            
            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }
            
            $startDate = Carbon::parse($request->start_date);
            $endDate = Carbon::parse($request->end_date);
            $customPrice = $request->price;
            $daysOfWeek = $request->days_of_week ?? [0,1,2,3,4,5,6];
            
            $timeSlots = $this->calculateTimeSlots(
                $settings->open_time,
                $settings->close_time,
                $settings->slot_duration
            );
            
            $createdCount = 0;
            $skippedCount = 0;
            $peakCount = 0;
            $offPeakCount = 0;
            
            DB::beginTransaction();
            
            try {
                $currentDate = $startDate->copy();
                
                while ($currentDate->lte($endDate)) {
                    if (in_array($currentDate->dayOfWeek, $daysOfWeek)) {
                        foreach ($timeSlots as $slot) {
                            // Calculate price based on time of day
                            if ($customPrice) {
                                $price = $customPrice;
                                $priceType = 'custom';
                                $originalPrice = null;
                            } else {
                                $priceData = $this->calculateSlotPrice($slot['start_time'], $settings);
                                $price = $priceData['price'];
                                $priceType = $priceData['price_type'];
                                $originalPrice = $priceData['original_price'];
                            }
                            
                            $timeSlot = DB::table('time_slots')
                                ->where('start_time', $slot['start_time'])
                                ->where('end_time', $slot['end_time'])
                                ->first();
                            
                            if (!$timeSlot) {
                                $timeSlotId = DB::table('time_slots')->insertGetId([
                                    'start_time' => $slot['start_time'],
                                    'end_time' => $slot['end_time'],
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ]);
                            } else {
                                $timeSlotId = $timeSlot->id;
                            }
                            
                            $existing = DB::table('futsal_slots')
                                ->where('futsal_id', $futsal)
                                ->where('slot_id', $timeSlotId)
                                ->where('slot_date', $currentDate->toDateString())
                                ->first();
                            
                            if ($existing) {
                                $skippedCount++;
                                continue;
                            }
                            
                            DB::table('futsal_slots')->insert([
                                'futsal_id' => $futsal,
                                'slot_id' => $timeSlotId,
                                'price' => $price,
                                'price_type' => $priceType,
                                'original_price' => $originalPrice,
                                'slot_date' => $currentDate->toDateString(),
                                'is_available' => true,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                            
                            $createdCount++;
                            if ($priceType === 'peak') $peakCount++;
                            else $offPeakCount++;
                        }
                    }
                    $currentDate->addDay();
                }
                
                DB::commit();
                
                return response()->json([
                    'success' => true,
                    'message' => "Generated $createdCount new slots from " . $startDate->format('Y-m-d') . " to " . $endDate->format('Y-m-d'),
                    'data' => [
                        'created' => $createdCount,
                        'skipped' => $skippedCount,
                        'peak_slots' => $peakCount,
                        'off_peak_slots' => $offPeakCount
                    ]
                ]);
                
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
            
        } catch (\Exception $e) {
            Log::error('Error bulk generating slots: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    // =============================================
    // FUTSAL SLOTS (Courts)
    // =============================================
    public function courts($futsal): JsonResponse
    {
        try {
            $futsalData = DB::table('futsals')->where('id', $futsal)->first();
            if (!$futsalData) {
                return response()->json(['error' => 'Futsal not found'], 404);
            }
            
            $isActive = isset($futsalData->active) ? $futsalData->active : true;
            
            // Auto-expire past slots
            $today = now()->toDateString();
            $now = now()->format('H:i:s');
            
            DB::table('futsal_slots')
                ->join('time_slots', 'futsal_slots.slot_id', '=', 'time_slots.id')
                ->where('futsal_slots.futsal_id', $futsal)
                ->where(function($query) use ($today, $now) {
                    $query->where('futsal_slots.slot_date', '<', $today)
                          ->orWhere(function($q) use ($today, $now) {
                              $q->where('futsal_slots.slot_date', '=', $today)
                                ->where('time_slots.end_time', '<', $now);
                          });
                })
                ->update([
                    'futsal_slots.is_available' => false,
                    'futsal_slots.updated_at' => now(),
                ]);

            // Get all slots
            $slots = DB::table('futsal_slots')
                ->join('time_slots', 'futsal_slots.slot_id', '=', 'time_slots.id')
                ->where('futsal_slots.futsal_id', $futsal)
                ->select(
                    'futsal_slots.*',
                    'time_slots.start_time',
                    'time_slots.end_time'
                )
                ->orderBy('futsal_slots.slot_date', 'asc')
                ->orderBy('time_slots.start_time', 'asc')
                ->get();

            $availableSlotsCount = DB::table('futsal_slots')
                ->where('futsal_id', $futsal)
                ->where('is_available', true)
                ->where('slot_date', '>=', $today)
                ->count();

            return response()->json([
                'slots' => $slots,
                'futsal_active' => $isActive,
                'can_modify' => $isActive,
                'available_slots_count' => $availableSlotsCount
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error fetching courts: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    public function storeCourt(Request $request, $futsal): JsonResponse
    {
        try {
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
                'slot_id' => 'required|exists:time_slots,id',
                'price' => 'required|numeric|min:0',
                'slot_date' => 'required|date|after_or_equal:today',
                'is_available' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $id = DB::table('futsal_slots')->insertGetId([
                'futsal_id' => $futsal,
                'slot_id' => $request->slot_id,
                'price' => $request->price,
                'slot_date' => $request->slot_date,
                'is_available' => $request->is_available ?? true,
                'created_at' => now(),
                'updated_at' => now(),
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
                'slot_id' => 'required|exists:time_slots,id',
                'price' => 'required|numeric|min:0',
                'slot_date' => 'required|date',
                'is_available' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            DB::table('futsal_slots')
                ->where('id', $id)
                ->where('futsal_id', $futsal)
                ->update([
                    'slot_id' => $request->slot_id,
                    'price' => $request->price,
                    'slot_date' => $request->slot_date,
                    'is_available' => $request->is_available ?? true,
                    'updated_at' => now(),
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
            $futsalData = DB::table('futsals')->where('id', $futsal)->first();
            if (!$futsalData) {
                return response()->json(['error' => 'Futsal not found'], 404);
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
                    'updated_at' => now(),
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
            $futsalData = DB::table('futsals')->where('id', $futsal)->first();
            if (!$futsalData) {
                return response()->json(['error' => 'Futsal not found'], 404);
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
    // BOOKINGS - ADMIN VIEW
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
                    'bookings.refund_status',
                    'bookings.refund_amount',
                    'bookings.refunded_at',
                    'bookings.created_at',
                    'bookings.updated_at',
                    'users.name as user_name',
                    'users.email as user_email',
                    'users.phone as user_phone',
                    DB::raw("CONCAT(time_slots.start_time, ' - ', time_slots.end_time) as slot_time"),
                    'futsal_slots.slot_date',
                    'futsal_slots.price'
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
        return response()->json([
            'error' => 'Admin cannot modify booking status',
            'message' => 'Bookings are automatically confirmed and cannot be modified by admin'
        ], 403);
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
    // PAYMENTS WITH REFUND DATA
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
                    'bookings.refund_status',
                    'bookings.refund_amount',
                    'bookings.refunded_at',
                    'bookings.status as booking_status',
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
    // REPORTS WITH REFUND DATA
    // =============================================
    public function reports(Request $request, $futsal): JsonResponse
    {
        try {
            $date = $request->date;
            $period = $request->period ?? 'daily';

            $baseQuery = DB::table('bookings')
                ->join('futsal_slots', 'bookings.futsal_slot_id', '=', 'futsal_slots.id')
                ->where('futsal_slots.futsal_id', $futsal);

            if ($date) {
                if ($period === 'daily') {
                    $baseQuery->whereDate('bookings.booking_date', $date);
                } elseif ($period === 'weekly') {
                    $start = date('Y-m-d', strtotime($date . ' -6 days'));
                    $baseQuery->whereBetween('bookings.booking_date', [$start, $date]);
                } elseif ($period === 'monthly') {
                    $year = date('Y', strtotime($date));
                    $month = date('m', strtotime($date));
                    $baseQuery->whereYear('bookings.booking_date', $year)
                              ->whereMonth('bookings.booking_date', $month);
                }
            }

            $totalBookings = $baseQuery->count();
            $confirmedBookings = (clone $baseQuery)->where('bookings.status', 'confirmed')->count();
            $cancelledBookings = (clone $baseQuery)->where('bookings.status', 'cancelled')->count();
            $pendingBookings = (clone $baseQuery)->where('bookings.status', 'pending')->count();
            
            $totalRevenue = (clone $baseQuery)
                ->where('bookings.payment_status', 'paid')
                ->where(function($q) {
                    $q->where('bookings.status', 'confirmed')
                      ->orWhere(function($q2) {
                          $q2->where('bookings.status', 'cancelled')
                             ->where('bookings.refund_status', 'completed');
                      });
                })
                ->sum('futsal_slots.price');
            
            $refundedAmount = (clone $baseQuery)
                ->where('bookings.status', 'cancelled')
                ->where('bookings.refund_status', 'completed')
                ->sum('bookings.refund_amount');
            
            $pendingRefunds = (clone $baseQuery)
                ->where('bookings.status', 'cancelled')
                ->where('bookings.refund_status', 'pending')
                ->count();
            
            $failedRefunds = (clone $baseQuery)
                ->where('bookings.status', 'cancelled')
                ->where('bookings.refund_status', 'failed')
                ->count();

            $recentBookings = (clone $baseQuery)
                ->join('time_slots', 'futsal_slots.slot_id', '=', 'time_slots.id')
                ->leftJoin('users', 'bookings.user_id', '=', 'users.id')
                ->orderBy('bookings.id', 'desc')
                ->limit(50)
                ->select(
                    'bookings.id',
                    'bookings.booking_date',
                    'bookings.status',
                    'bookings.payment_status',
                    'bookings.refund_status',
                    'bookings.refund_amount',
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
                'refunded_amount' => $refundedAmount,
                'pending_refunds' => $pendingRefunds,
                'failed_refunds' => $failedRefunds,
                'bookings' => $recentBookings,
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error generating report: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }
}