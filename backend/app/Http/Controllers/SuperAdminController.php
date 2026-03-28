<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Futsal;
use App\Models\Booking;
use App\Models\FutsalSlot;
use App\Models\TimeSlot;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class SuperAdminController extends Controller
{
    /**
     * Ensure only super-admin can access
     */
    private function authorizeSuperAdmin(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'super-admin') {
            abort(403, 'Super admin only');
        }
    }

    // ==============================
    // FUTSALS - COMPLETE CRUD
    // ==============================

    /**
     * Get all futsals with their managers
     */
    public function getFutsals(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        return Futsal::with('manager:id,name,email')
            ->orderBy('id', 'desc')
            ->get()
            ->map(function($futsal) {
                return [
                    'id' => $futsal->id,
                    'futsal_name' => $futsal->futsal_name,
                    'location' => $futsal->location,
                    'contact_number' => $futsal->contact_number,
                    'description' => $futsal->description,
                    'image' => $futsal->image ? asset($futsal->image) : null,
                    'active' => $futsal->active ?? true,
                    'manager_id' => $futsal->manager_id,
                    'manager_name' => $futsal->manager->name ?? null,
                    'manager_email' => $futsal->manager->email ?? null,
                    'created_at' => $futsal->created_at,
                ];
            });
    }

    /**
     * Get single futsal details with all related data
     */
    public function getFutsalDetails(Request $request, $id)
    {
        try {
            $this->authorizeSuperAdmin($request);

            Log::info('Getting futsal details for ID: ' . $id);
            
            $futsal = Futsal::with('manager')->findOrFail($id);
            
            Log::info('Futsal found: ' . $futsal->futsal_name);
            
            // Get slots count
            $today = Carbon::today()->toDateString();
            $currentTime = Carbon::now()->format('H:i:s');
            
            $totalSlots = FutsalSlot::where('futsal_id', $id)->count();
            Log::info('Total slots: ' . $totalSlots);
            
            $availableSlots = FutsalSlot::where('futsal_id', $id)
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
            Log::info('Available slots: ' . $availableSlots);
            
            $bookedSlots = Booking::whereHas('futsalSlot', function($q) use ($id) {
                $q->where('futsal_id', $id);
            })->count();
            Log::info('Booked slots: ' . $bookedSlots);
            
            // Get bookings for this futsal
            $bookings = Booking::with(['user', 'futsalSlot.timeSlot'])
                ->whereHas('futsalSlot', function($q) use ($id) {
                    $q->where('futsal_id', $id);
                })
                ->latest()
                ->take(20)
                ->get()
                ->map(function($b) {
                    return [
                        'id' => $b->id,
                        'user_name' => $b->user->name ?? 'N/A',
                        'user_email' => $b->user->email ?? 'N/A',
                        'slot_date' => $b->futsalSlot->slot_date,
                        'time_slot' => $b->futsalSlot->timeSlot ? 
                            ($b->futsalSlot->timeSlot->start_time . ' - ' . $b->futsalSlot->timeSlot->end_time) : 'N/A',
                        'price' => $b->futsalSlot->price,
                        'status' => $b->status,
                        'payment_status' => $b->payment_status,
                        'booking_date' => $b->booking_date,
                    ];
                });
            
            // Get revenue
            $totalRevenue = Payment::whereHas('booking.futsalSlot', function($q) use ($id) {
                $q->where('futsal_id', $id);
            })->sum('amount') ?? 0;
            Log::info('Total revenue: ' . $totalRevenue);
            
            // Get slots by date - FIXED: Use join or sort in PHP
            $slots = FutsalSlot::with('timeSlot')
                ->where('futsal_id', $id)
                ->where('slot_date', '>=', $today)
                ->get();
            
            // Sort in PHP to avoid SQL column issues
            $slotsByDate = $slots->sortBy(function($slot) {
                return $slot->slot_date . ' ' . ($slot->timeSlot->start_time ?? '00:00:00');
            })->groupBy('slot_date')
            ->map(function($slots, $date) {
                return [
                    'date' => $date,
                    'formatted_date' => Carbon::parse($date)->format('d M Y'),
                    'day' => Carbon::parse($date)->format('l'),
                    'slots' => $slots->map(function($slot) {
                        return [
                            'id' => $slot->id,
                            'start_time' => $slot->timeSlot->start_time,
                            'end_time' => $slot->timeSlot->end_time,
                            'price' => $slot->price,
                            'is_available' => $slot->is_available,
                        ];
                    })->values()
                ];
            })->values();

            return response()->json([
                'futsal' => [
                    'id' => $futsal->id,
                    'name' => $futsal->futsal_name,
                    'location' => $futsal->location,
                    'contact' => $futsal->contact_number,
                    'description' => $futsal->description,
                    'image' => $futsal->image ? asset($futsal->image) : null,
                    'active' => $futsal->active,
                    'manager' => $futsal->manager ? [
                        'id' => $futsal->manager->id,
                        'name' => $futsal->manager->name,
                        'email' => $futsal->manager->email,
                    ] : null,
                ],
                'stats' => [
                    'total_slots' => $totalSlots,
                    'available_slots' => $availableSlots,
                    'booked_slots' => $bookedSlots,
                    'total_revenue' => $totalRevenue,
                ],
                'recent_bookings' => $bookings,
                'slots_by_date' => $slotsByDate,
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in getFutsalDetails: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get futsal-wise statistics
     */
    public function getFutsalStats(Request $request)
    {
        $this->authorizeSuperAdmin($request);
        
        $stats = [];
        $futsals = Futsal::all();
        
        foreach ($futsals as $futsal) {
            $today = Carbon::today()->toDateString();
            $currentTime = Carbon::now()->format('H:i:s');
            
            $totalBookings = Booking::whereHas('futsalSlot', function($q) use ($futsal) {
                $q->where('futsal_id', $futsal->id);
            })->count();
            
            $totalRevenue = Payment::whereHas('booking.futsalSlot', function($q) use ($futsal) {
                $q->where('futsal_id', $futsal->id);
            })->sum('amount') ?? 0;
            
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
            
            $stats[] = [
                'futsal_id' => $futsal->id,
                'futsal_name' => $futsal->futsal_name,
                'location' => $futsal->location,
                'total_bookings' => $totalBookings,
                'total_revenue' => $totalRevenue,
                'available_slots' => $availableSlots,
                'is_active' => $futsal->active ?? true,
            ];
        }
        
        return response()->json($stats);
    }

    /**
     * Create a new futsal
     */
    public function storeFutsal(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'location' => 'required|string|max:150',
            'contact_number' => 'nullable|string|max:20',
            'description' => 'nullable|string',
            'manager_id' => 'nullable|exists:users,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $imageUrl = null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('futsals', 'public');
            $imageUrl = asset('storage/' . $path);
        }

        $futsal = Futsal::create([
            'futsal_name' => $data['name'],
            'location' => $data['location'],
            'contact_number' => $data['contact_number'] ?? null,
            'description' => $data['description'] ?? null,
            'image' => $imageUrl,
            'manager_id' => $data['manager_id'] ?? null,
            'active' => true,
        ]);

        if ($data['manager_id']) {
            User::where('id', $data['manager_id'])->update(['role' => 'admin']);
        }

        return response()->json([
            'message' => 'Futsal created successfully',
            'futsal' => $futsal
        ], 201);
    }

    /**
     * Update an existing futsal
     */
    public function updateFutsal(Request $request, $id)
    {
        $this->authorizeSuperAdmin($request);

        $futsal = Futsal::findOrFail($id);

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'location' => 'required|string|max:150',
            'contact_number' => 'nullable|string|max:20',
            'description' => 'nullable|string',
            'manager_id' => 'nullable|exists:users,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $updateData = [
            'futsal_name' => $data['name'],
            'location' => $data['location'],
            'contact_number' => $data['contact_number'] ?? $futsal->contact_number,
            'description' => $data['description'] ?? $futsal->description,
            'manager_id' => $data['manager_id'] ?? null,
        ];

        if ($request->hasFile('image')) {
            if ($futsal->image) {
                $oldPath = str_replace(asset('storage/'), '', $futsal->image);
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }
            $path = $request->file('image')->store('futsals', 'public');
            $updateData['image'] = asset('storage/' . $path);
        }

        $futsal->update($updateData);

        if ($data['manager_id']) {
            User::where('id', $data['manager_id'])->update(['role' => 'admin']);
        }

        return response()->json([
            'message' => 'Futsal updated successfully',
            'futsal' => $futsal
        ]);
    }

    /**
     * Toggle futsal active status
     */
    public function toggleActive(Request $request, $id)
    {
        $this->authorizeSuperAdmin($request);

        $futsal = Futsal::findOrFail($id);
        $futsal->active = !$futsal->active;
        $futsal->save();

        return response()->json([
            'message' => 'Futsal status updated',
            'active' => $futsal->active
        ]);
    }

    /**
     * Delete a futsal
     */
    public function deleteFutsal(Request $request, $id)
    {
        $this->authorizeSuperAdmin($request);

        $futsal = Futsal::findOrFail($id);
        
        $hasBookings = FutsalSlot::where('futsal_id', $id)
            ->whereHas('bookings')
            ->exists();
            
        if ($hasBookings) {
            return response()->json([
                'message' => 'Cannot delete futsal with existing bookings'
            ], 400);
        }

        if ($futsal->image) {
            $oldPath = str_replace(asset('storage/'), '', $futsal->image);
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        FutsalSlot::where('futsal_id', $id)->delete();
        $futsal->delete();

        return response()->json([
            'message' => 'Futsal deleted successfully'
        ]);
    }

    // ==============================
    // ADMINS/MANAGERS MANAGEMENT
    // ==============================

    public function getAdmins(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        return User::where('role', 'admin')
            ->with('futsalsManaged')
            ->orderBy('id', 'desc')
            ->get()
            ->map(function($admin) {
                return [
                    'id' => $admin->id,
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'phone' => $admin->phone,
                    'created_at' => $admin->created_at,
                    'managed_futsals' => $admin->futsalsManaged->map(function($f) {
                        return [
                            'id' => $f->id,
                            'name' => $f->futsal_name
                        ];
                    }),
                ];
            });
    }

    public function createAdmin(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|min:8|confirmed',
            'futsal_id' => 'nullable|exists:futsals,id',
        ]);

        $admin = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => Hash::make($data['password']),
            'role' => 'admin',
        ]);

        if (!empty($data['futsal_id'])) {
            Futsal::where('id', $data['futsal_id'])
                ->update(['manager_id' => $admin->id]);
        }

        $admin->load('futsalsManaged');

        return response()->json([
            'message' => 'Admin created successfully',
            'admin' => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'phone' => $admin->phone,
                'role' => $admin->role,
                'managed_futsals' => $admin->futsalsManaged,
            ]
        ], 201);
    }

    public function updateAdmin(Request $request, $id)
    {
        $this->authorizeSuperAdmin($request);

        $admin = User::where('role', 'admin')->findOrFail($id);

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email,' . $id,
            'phone' => 'nullable|string|max:20',
            'password' => 'nullable|min:8|confirmed',
            'futsal_id' => 'nullable|exists:futsals,id',
        ]);

        $updateData = [
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? $admin->phone,
        ];

        if (!empty($data['password'])) {
            $updateData['password'] = Hash::make($data['password']);
        }

        $admin->update($updateData);

        if (isset($data['futsal_id'])) {
            Futsal::where('manager_id', $admin->id)->update(['manager_id' => null]);
            if (!empty($data['futsal_id'])) {
                Futsal::where('id', $data['futsal_id'])
                    ->update(['manager_id' => $admin->id]);
            }
        }

        return response()->json([
            'message' => 'Admin updated successfully',
            'admin' => $admin
        ]);
    }

    public function deleteAdmin(Request $request, $id)
    {
        $this->authorizeSuperAdmin($request);

        $admin = User::where('role', 'admin')->findOrFail($id);
        Futsal::where('manager_id', $admin->id)->update(['manager_id' => null]);
        $admin->delete();

        return response()->json([
            'message' => 'Admin deleted successfully'
        ]);
    }

     /**
     * Get all bookings with refund status
     */
    public function getBookings(Request $request)
    {
        $this->authorizeSuperAdmin($request);
        
        $futsalId = $request->query('futsal_id');
        
        $query = Booking::with(['user', 'futsalSlot.futsal', 'futsalSlot.timeSlot']);
        
        if ($futsalId) {
            $query->whereHas('futsalSlot', function($q) use ($futsalId) {
                $q->where('futsal_id', $futsalId);
            });
        }
        
        $bookings = $query->latest()->get()->map(function ($b) {
            $slotTime = $b->futsalSlot->timeSlot ? 
                ($b->futsalSlot->timeSlot->start_time . ' - ' . $b->futsalSlot->timeSlot->end_time) : 
                'N/A';
                
            return [
                'id' => $b->id,
                'user_name' => $b->user->name ?? 'N/A',
                'user_email' => $b->user->email ?? 'N/A',
                'futsal_id' => $b->futsalSlot->futsal->id ?? null,
                'futsal_name' => $b->futsalSlot->futsal->futsal_name ?? 'N/A',
                'slot_date' => $b->futsalSlot->slot_date ?? 'N/A',
                'booking_date' => $b->booking_date,
                'time_slot' => $slotTime,
                'price' => $b->futsalSlot->price ?? 0,
                'status' => $b->status,
                'payment_status' => $b->payment_status,
                'refund_status' => $b->refund_status ?? 'none',
                'refund_amount' => $b->refund_amount ?? 0,
                'refunded_at' => $b->refunded_at,
                'created_at' => $b->created_at,
            ];
        });

        return response()->json($bookings);
    }

    // ==============================
    // USERS - ALL USERS
    // ==============================

    public function getUsers(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        return User::select('id', 'name', 'email', 'phone', 'role', 'created_at')
            ->orderBy('id', 'desc')
            ->get()
            ->map(function($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role' => $user->role,
                    'registered_at' => $user->created_at->format('Y-m-d'),
                ];
            });
    }

   /**
     * Get payments with refund status
     */
    public function getPayments(Request $request)
    {
        $this->authorizeSuperAdmin($request);
        
        $futsalId = $request->query('futsal_id');
        
        $query = Payment::with(['booking.user', 'booking.futsalSlot.futsal']);
        
        if ($futsalId) {
            $query->whereHas('booking.futsalSlot', function($q) use ($futsalId) {
                $q->where('futsal_id', $futsalId);
            });
        }
        
        $payments = $query->latest()->get()->map(function($payment) {
            return [
                'id' => $payment->id,
                'booking_id' => $payment->booking_id,
                'user_name' => $payment->booking->user->name ?? 'N/A',
                'user_email' => $payment->booking->user->email ?? 'N/A',
                'futsal_id' => $payment->booking->futsalSlot->futsal->id ?? null,
                'futsal_name' => $payment->booking->futsalSlot->futsal->futsal_name ?? 'N/A',
                'amount' => $payment->amount,
                'payment_method' => $payment->payment_method,
                'transaction_id' => $payment->transaction_id,
                'payment_date' => $payment->payment_date,
                'refund_status' => $payment->booking->refund_status ?? 'none',
                'refund_amount' => $payment->booking->refund_amount ?? 0,
                'refunded_at' => $payment->booking->refunded_at,
                'booking_status' => $payment->booking->status,
                'created_at' => $payment->created_at,
            ];
        });

        return response()->json($payments);
    }

    /**
     * Get dashboard statistics with refund data
     */
    public function getStats(Request $request)
    {
        $this->authorizeSuperAdmin($request);
        
        $futsalId = $request->query('futsal_id');
        
        $totalFutsals = Futsal::count();
        $totalUsers = User::count();
        $totalAdmins = User::where('role', 'admin')->count();
        
        $bookingsQuery = Booking::query();
        $revenueQuery = Payment::query();
        
        if ($futsalId) {
            $bookingsQuery->whereHas('futsalSlot', function($q) use ($futsalId) {
                $q->where('futsal_id', $futsalId);
            });
            $revenueQuery->whereHas('booking.futsalSlot', function($q) use ($futsalId) {
                $q->where('futsal_id', $futsalId);
            });
        }
        
        $totalBookings = $bookingsQuery->count();
        $confirmedBookings = (clone $bookingsQuery)->where('status', 'confirmed')->count();
        $cancelledBookings = (clone $bookingsQuery)->where('status', 'cancelled')->count();
        $pendingBookings = (clone $bookingsQuery)->where('status', 'pending')->count();
        
        // Revenue calculation - exclude cancelled bookings that were refunded
        $totalRevenue = (clone $revenueQuery)
            ->where('status', 'completed')
            ->whereHas('booking', function($q) {
                $q->where('status', 'confirmed')
                  ->orWhere(function($q2) {
                      $q2->where('status', 'cancelled')
                         ->where('refund_status', 'completed');
                  });
            })
            ->sum('amount') ?? 0;
        
        // Refund statistics
        $refundedAmount = (clone $bookingsQuery)
            ->where('status', 'cancelled')
            ->where('refund_status', 'completed')
            ->sum('refund_amount') ?? 0;
        
        $pendingRefunds = (clone $bookingsQuery)
            ->where('status', 'cancelled')
            ->where('refund_status', 'pending')
            ->count();
        
        $failedRefunds = (clone $bookingsQuery)
            ->where('status', 'cancelled')
            ->where('refund_status', 'failed')
            ->count();
        
        $recentBookings = (clone $bookingsQuery)
            ->with(['user', 'futsalSlot.futsal', 'futsalSlot.timeSlot'])
            ->latest()
            ->limit(10)
            ->get()
            ->map(function($b) {
                return [
                    'id' => $b->id,
                    'user_name' => $b->user->name ?? 'N/A',
                    'futsal_name' => $b->futsalSlot->futsal->futsal_name ?? 'N/A',
                    'slot_date' => $b->futsalSlot->slot_date ?? 'N/A',
                    'status' => $b->status,
                    'payment_status' => $b->payment_status,
                    'refund_status' => $b->refund_status ?? 'none',
                    'refund_amount' => $b->refund_amount ?? 0,
                ];
            });

        return response()->json([
            'total_futsals' => $totalFutsals,
            'total_users' => $totalUsers,
            'total_admins' => $totalAdmins,
            'total_bookings' => $totalBookings,
            'confirmed_bookings' => $confirmedBookings,
            'cancelled_bookings' => $cancelledBookings,
            'pending_bookings' => $pendingBookings,
            'total_revenue' => $totalRevenue,
            'refunded_amount' => $refundedAmount,
            'pending_refunds' => $pendingRefunds,
            'failed_refunds' => $failedRefunds,
            'recent_bookings' => $recentBookings,
        ]);
    }

}