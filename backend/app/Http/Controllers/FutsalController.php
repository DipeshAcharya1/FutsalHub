<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Futsal;
use App\Models\FutsalSlot;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class FutsalController extends Controller
{
    /**
     * Get all futsals with pagination, search, and filters
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $search = $request->query('search', '');
            $location = $request->query('location', '');
            $sort = $request->query('sort', 'name');
            $perPage = (int) $request->query('per_page', 10);

            $query = Futsal::query();

            // Apply search filter
            if (!empty($search)) {
                $query->where(function($q) use ($search) {
                    $q->where('futsal_name', 'LIKE', "%{$search}%")
                      ->orWhere('location', 'LIKE', "%{$search}%")
                      ->orWhere('description', 'LIKE', "%{$search}%");
                });
            }

            // Apply location filter
            if (!empty($location)) {
                $query->where('location', 'LIKE', "%{$location}%");
            }

            // Apply sorting
            switch ($sort) {
                case 'price_low':
                    $query->withMin('futsalSlots', 'price')
                          ->orderBy('futsal_slots_min_price', 'asc');
                    break;
                case 'price_high':
                    $query->withMin('futsalSlots', 'price')
                          ->orderBy('futsal_slots_min_price', 'desc');
                    break;
                case 'popular':
                    $query->withCount('bookings')
                          ->orderBy('bookings_count', 'desc');
                    break;
                default:
                    $query->orderBy('futsal_name', 'asc');
                    break;
            }

            // Get paginated results
            $futsals = $query->paginate($perPage);

            // Transform the data
            $transformed = $futsals->through(function($futsal) {
                $today = now()->toDateString();
                $currentTime = now()->format('H:i:s');
                
                // Count only future available slots (not expired)
                $availableSlots = FutsalSlot::where('futsal_id', $futsal->id)
                    ->where('is_available', true)
                    ->where('slot_date', '>=', $today)
                    ->where(function($query) use ($today, $currentTime) {
                        $query->where('slot_date', '>', $today)
                              ->orWhere(function($q) use ($today, $currentTime) {
                                  $q->where('slot_date', '=', $today)
                                    ->whereHas('timeSlot', function($timeQ) use ($currentTime) {
                                        $timeQ->where('start_time', '>', $currentTime);
                                    });
                              });
                    })
                    ->count();
                    
                $minPrice = FutsalSlot::where('futsal_id', $futsal->id)
                    ->where('is_available', true)
                    ->where('slot_date', '>=', $today)
                    ->min('price');

                // Ensure image URL is full URL
                $imageUrl = $futsal->image;
                if ($imageUrl && !str_starts_with($imageUrl, 'http')) {
                    $imageUrl = asset($imageUrl);
                }

                return [
                    'id' => $futsal->id,
                    'name' => $futsal->futsal_name,
                    'location' => $futsal->location,
                    'description' => $futsal->description,
                    'contact' => $futsal->contact_number,
                    'image' => $imageUrl,
                    'available_slots' => $availableSlots,
                    'price_from' => $minPrice ? 'Rs. ' . number_format($minPrice) : 'Contact for price',
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $transformed
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in index: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load futsals',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get unique locations for filter
     */
    public function getLocations(): JsonResponse
    {
        try {
            $locations = Futsal::select('location')
                ->distinct()
                ->whereNotNull('location')
                ->where('location', '!=', '')
                ->get()
                ->map(function($item) {
                    $count = Futsal::where('location', $item->location)->count();
                    
                    return [
                        'value' => $item->location,
                        'label' => $item->location,
                        'count' => $count
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $locations
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in getLocations: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load locations',
                'error' => $e->getMessage()
            ], 500);
        }
    }

   /**
 * Get single futsal details
 */
public function show($id): JsonResponse
{
    try {
        Log::info('Fetching futsal details for ID: ' . $id);
        
        // USE LARAVEL'S BUILT-IN SANCTUM AUTHENTICATION
        $user = null;
        
        // Try to authenticate using Sanctum
        if (auth('sanctum')->check()) {
            $user = auth('sanctum')->user();
            Log::info('User authenticated via Sanctum', ['user_id' => $user->id, 'user_email' => $user->email]);
        } else {
            Log::info('No authenticated user via Sanctum');
        }
        
        $futsal = Futsal::find($id);

        if (!$futsal) {
            Log::error('Futsal not found with ID: ' . $id);
            return response()->json([
                'success' => false,
                'message' => 'Futsal not found'
            ], 404);
        }

        // Check if user is restricted
        $isRestricted = false;
        $restrictedMessage = null;
        
        if ($user) {
            $restrictedUsers = $futsal->restricted_users ?? [];
            
            if (is_string($restrictedUsers)) {
                $restrictedUsers = json_decode($restrictedUsers, true) ?: [];
            }
            
            // Convert to integers for comparison
            $restrictedUsers = array_map('intval', $restrictedUsers);
            $userId = (int)$user->id;
            $isRestricted = in_array($userId, $restrictedUsers);
            
            Log::info('Restriction check', [
                'user_id' => $userId,
                'user_email' => $user->email,
                'restricted_users' => $restrictedUsers,
                'is_restricted' => $isRestricted
            ]);
            
            if ($isRestricted) {
                $restrictedMessage = 'You have been restricted from booking at this futsal. Please contact the administrator.';
            }
        }

        // If user is restricted, return early with restriction message
        if ($isRestricted) {
            $imageUrl = $futsal->image;
            if ($imageUrl && !str_starts_with($imageUrl, 'http')) {
                $imageUrl = asset($imageUrl);
            }
            
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $futsal->id,
                    'futsal_name' => $futsal->futsal_name,
                    'name' => $futsal->futsal_name,
                    'location' => $futsal->location,
                    'latitude' => $futsal->latitude,
                    'longitude' => $futsal->longitude,
                    'description' => $futsal->description,
                    'contact_number' => $futsal->contact_number,
                    'contact' => $futsal->contact_number,
                    'image' => $imageUrl,
                    'is_restricted' => true,
                    'restricted_message' => $restrictedMessage,
                    'slots_by_date' => []
                ]
            ]);
        }

        // Continue with normal response for non-restricted users
        $today = now()->toDateString();
        $currentTime = now()->format('H:i:s');
        
        $availableSlots = FutsalSlot::with('timeSlot')
            ->where('futsal_id', $id)
            ->where('is_available', true)
            ->where('slot_date', '>=', $today)
            ->where(function($query) use ($today, $currentTime) {
                $query->where('slot_date', '>', $today)
                    ->orWhere(function($q) use ($today, $currentTime) {
                        $q->where('slot_date', '=', $today)
                            ->whereHas('timeSlot', function($timeQ) use ($currentTime) {
                                $timeQ->where('start_time', '>', $currentTime);
                            });
                    });
            })
            ->orderBy('slot_date')
            ->get();

        $sortedSlots = $availableSlots->sortBy(function($slot) {
            return $slot->timeSlot->start_time ?? '00:00:00';
        })->values();

        $mappedSlots = $sortedSlots->map(function($slot) {
            return [
                'id' => $slot->id,
                'date' => $slot->slot_date,
                'formatted_date' => date('d M Y', strtotime($slot->slot_date)),
                'day' => date('l', strtotime($slot->slot_date)),
                'start_time' => $slot->timeSlot->start_time ?? null,
                'end_time' => $slot->timeSlot->end_time ?? null,
                'formatted_time' => ($slot->timeSlot->start_time ?? '') . ' - ' . ($slot->timeSlot->end_time ?? ''),
                'price' => (float) $slot->price,
                'formatted_price' => 'Rs. ' . number_format($slot->price),
                'is_expired' => false,
                'is_available' => $slot->is_available,
            ];
        });

        $slotsByDate = $mappedSlots->groupBy('date')->map(function($slots, $date) {
            return [
                'date' => $date,
                'formatted_date' => $slots->first()['formatted_date'],
                'day' => $slots->first()['day'],
                'slots' => $slots->values()
            ];
        })->values();

        $imageUrl = $futsal->image;
        if ($imageUrl && !str_starts_with($imageUrl, 'http')) {
            $imageUrl = asset($imageUrl);
        }

        $responseData = [
            'id' => $futsal->id,
            'futsal_name' => $futsal->futsal_name,
            'name' => $futsal->futsal_name,
            'location' => $futsal->location,
            'latitude' => $futsal->latitude,
            'longitude' => $futsal->longitude,
            'description' => $futsal->description,
            'contact_number' => $futsal->contact_number,
            'contact' => $futsal->contact_number,
            'image' => $imageUrl,
            'total_slots' => $availableSlots->count(),
            'slots_by_date' => $slotsByDate,
            'is_restricted' => false,
            'restricted_message' => null
        ];

        Log::info('Response data', ['is_restricted' => false, 'user_id' => $user ? $user->id : 'guest']);

        return response()->json([
            'success' => true,
            'data' => $responseData
        ]);
        
    } catch (\Exception $e) {
        Log::error('Error in show method for ID ' . $id . ': ' . $e->getMessage());
        Log::error($e->getTraceAsString());
        
        return response()->json([
            'success' => false,
            'message' => 'Failed to load futsal details',
            'error' => $e->getMessage()
        ], 500);
    }
}

    /**
     * Get available time slots for a specific date
     */
    public function getAvailableSlots(Request $request, $futsalId): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'date' => 'required|date|after_or_equal:today',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $date = $request->date;
            $currentTime = now()->format('H:i:s');
            $today = now()->toDateString();

            // Get slots for specific date
            $slots = FutsalSlot::with('timeSlot')
                ->where('futsal_id', $futsalId)
                ->where('is_available', true)
                ->where('slot_date', $date)
                ->get();

            // Filter slots that are not expired (for today, only future slots)
            $filteredSlots = $slots->filter(function($slot) use ($date, $currentTime, $today) {
                if ($date > $today) {
                    return true; // Future dates, all slots are valid
                }
                // Today, only slots that haven't started yet
                return $slot->timeSlot->start_time > $currentTime;
            });

            // Sort by start_time
            $sortedSlots = $filteredSlots->sortBy(function($slot) {
                return $slot->timeSlot->start_time ?? '00:00:00';
            })->values();

            $mappedSlots = $sortedSlots->map(function($slot) {
                return [
                    'id' => $slot->id,
                    'start_time' => $slot->timeSlot->start_time ?? null,
                    'end_time' => $slot->timeSlot->end_time ?? null,
                    'formatted_time' => ($slot->timeSlot->start_time ?? '') . ' - ' . ($slot->timeSlot->end_time ?? ''),
                    'price' => (float) $slot->price,
                    'formatted_price' => 'Rs. ' . number_format($slot->price),
                    'is_expired' => false,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $mappedSlots
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in getAvailableSlots: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load available slots',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}