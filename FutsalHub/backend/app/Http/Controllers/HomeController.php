<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Futsal;
use App\Models\FutsalSlot;
use App\Models\Booking;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HomeController extends Controller
{
    /**
     * Get homepage data - featured/popular futsals
     */
    public function index(): JsonResponse
    {
        try {
            // Get active futsals with their details
            $futsals = Futsal::where('active', true)
                ->select('id', 'futsal_name', 'location', 'description', 'contact_number', 'image')
                ->limit(6)
                ->get()
                ->map(function($futsal) {
                    // Ensure image URL is full URL
                    $imageUrl = $futsal->image;
                    if ($imageUrl && !str_starts_with($imageUrl, 'http')) {
                        $imageUrl = asset($imageUrl);
                    }
                    
                    // Get average rating (you can implement this later)
                    $averageRating = 4.5; // Placeholder
                    
                    // Get total bookings count
                    $totalBookings = Booking::whereHas('futsalSlot', function($query) use ($futsal) {
                        $query->where('futsal_id', $futsal->id);
                    })->count();
                    
                    return [
                        'id' => $futsal->id,
                        'name' => $futsal->futsal_name,
                        'location' => $futsal->location,
                        'description' => $futsal->description,
                        'contact' => $futsal->contact_number,
                        'image' => $imageUrl,
                        'rating' => number_format($averageRating, 1),
                        'total_bookings' => $totalBookings,
                        'is_popular' => $totalBookings > 10,
                    ];
                });

            // Get statistics for homepage
            $stats = [
                'total_futsals' => Futsal::where('active', true)->count(),
                'total_bookings' => Booking::count(),
                'active_users' => DB::table('users')->where('role', 'user')->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'featured_futsals' => $futsals,
                    'stats' => $stats,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Home index error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load homepage data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all futsals for the futsals page
     */
    public function getAllFutsals(Request $request): JsonResponse
    {
        try {
            $search = $request->query('search');
            $location = $request->query('location');
            
            $query = Futsal::where('active', true);

            // Apply search filter
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('futsal_name', 'LIKE', "%{$search}%")
                      ->orWhere('location', 'LIKE', "%{$search}%")
                      ->orWhere('description', 'LIKE', "%{$search}%");
                });
            }

            // Apply location filter
            if ($location) {
                $query->where('location', 'LIKE', "%{$location}%");
            }

            $futsals = $query->select('id', 'futsal_name', 'location', 'description', 'contact_number', 'image')
                ->paginate(10)
                ->through(function($futsal) {
                    // Ensure image URL is full URL
                    $imageUrl = $futsal->image;
                    if ($imageUrl && !str_starts_with($imageUrl, 'http')) {
                        $imageUrl = asset($imageUrl);
                    }
                    
                    // Get today's date
                    $today = now()->toDateString();
                    
                    // Get available slots count
                    $availableSlots = FutsalSlot::where('futsal_id', $futsal->id)
                        ->where('is_available', true)
                        ->where('slot_date', '>=', $today)
                        ->count();

                    // Get minimum price
                    $minPrice = FutsalSlot::where('futsal_id', $futsal->id)
                        ->where('is_available', true)
                        ->where('slot_date', '>=', $today)
                        ->min('price');

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
                'data' => $futsals
            ]);
        } catch (\Exception $e) {
            Log::error('Get all futsals error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load futsals',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single futsal details
     */
    public function getFutsalDetails($id): JsonResponse
    {
        try {
            $futsal = Futsal::with('manager')
                ->where('id', $id)
                ->where('active', true)
                ->first();

            if (!$futsal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Futsal not found'
                ], 404);
            }

            // Ensure image URL is full URL
            $imageUrl = $futsal->image;
            if ($imageUrl && !str_starts_with($imageUrl, 'http')) {
                $imageUrl = asset($imageUrl);
            }

            // Get today's date
            $today = now()->toDateString();

            // Get available slots
            $availableSlots = FutsalSlot::with('timeSlot')
                ->where('futsal_id', $id)
                ->where('is_available', true)
                ->where('slot_date', '>=', $today)
                ->orderBy('slot_date')
                ->orderBy('time_slots.start_time')
                ->get()
                ->map(function($slot) {
                    return [
                        'id' => $slot->id,
                        'date' => $slot->slot_date,
                        'formatted_date' => date('d M Y', strtotime($slot->slot_date)),
                        'day' => date('l', strtotime($slot->slot_date)),
                        'start_time' => $slot->timeSlot->start_time ?? null,
                        'end_time' => $slot->timeSlot->end_time ?? null,
                        'price' => $slot->price,
                        'formatted_price' => 'Rs. ' . number_format($slot->price),
                        'formatted_time' => ($slot->timeSlot->start_time ?? '') . ' - ' . ($slot->timeSlot->end_time ?? ''),
                    ];
                });

            // Group slots by date
            $slotsByDate = $availableSlots->groupBy('date')->map(function($slots, $date) {
                return [
                    'date' => $date,
                    'formatted_date' => $slots->first()['formatted_date'],
                    'day' => $slots->first()['day'],
                    'slots' => $slots
                ];
            })->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $futsal->id,
                    'name' => $futsal->futsal_name,
                    'futsal_name' => $futsal->futsal_name,
                    'location' => $futsal->location,
                    'description' => $futsal->description,
                    'contact' => $futsal->contact_number,
                    'contact_number' => $futsal->contact_number,
                    'image' => $imageUrl,
                    'manager' => $futsal->manager->name ?? null,
                    'slots_by_date' => $slotsByDate,
                    'total_slots' => $availableSlots->count(),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Get futsal details error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load futsal details',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
        * Get popular futsals (featured) - Only returns 3
     */
    public function getPopularFutsals(): JsonResponse
    {
        try {
            // Get all futsals and sort by booking count
            $popularFutsals = Futsal::withCount(['futsalSlots' => function($query) {
                $query->whereHas('bookings');
            }])
            ->orderBy('futsal_slots_count', 'desc')
            ->limit(3)
            ->get()
            ->map(function($futsal) {
                // Ensure image URL is full URL
                $imageUrl = $futsal->image;
                if ($imageUrl && !str_starts_with($imageUrl, 'http')) {
                    $imageUrl = asset($imageUrl);
                }
                
                return [
                    'id' => $futsal->id,
                    'name' => $futsal->futsal_name,
                    'location' => $futsal->location,
                    'image' => $imageUrl,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $popularFutsals
            ]);
            
        } catch (\Exception $e) {
            Log::error('Get popular futsals error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load popular futsals',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get homepage statistics
     */
    public function getStats(): JsonResponse
    {
        try {
            $stats = [
                'total_futsals' => Futsal::where('active', true)->count(),
                'total_bookings' => Booking::count(),
                'happy_customers' => DB::table('users')->where('role', 'user')->count(),
                'cities_covered' => Futsal::where('active', true)->distinct('location')->count('location'),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            Log::error('Get stats error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load statistics',
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
            $date = $request->query('date', now()->toDateString());

            $slots = FutsalSlot::with('timeSlot')
                ->where('futsal_id', $futsalId)
                ->where('is_available', true)
                ->where('slot_date', $date)
                ->orderBy('time_slots.start_time')
                ->get()
                ->map(function($slot) {
                    return [
                        'id' => $slot->id,
                        'start_time' => $slot->timeSlot->start_time ?? null,
                        'end_time' => $slot->timeSlot->end_time ?? null,
                        'price' => $slot->price,
                        'formatted_price' => 'Rs. ' . number_format($slot->price),
                        'formatted_time' => ($slot->timeSlot->start_time ?? '') . ' - ' . ($slot->timeSlot->end_time ?? ''),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $slots
            ]);
        } catch (\Exception $e) {
            Log::error('Get available slots error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load available slots',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}