<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Futsal;
use App\Models\Booking;
use App\Models\FutsalSlot;
use App\Models\TimeSlot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

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
                    'active' => $futsal->active ?? true,
                    'manager_id' => $futsal->manager_id,
                    'manager_name' => $futsal->manager->name ?? null,
                    'manager_email' => $futsal->manager->email ?? null,
                    'created_at' => $futsal->created_at,
                ];
            });
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
        ]);

        $futsal = Futsal::create([
            'futsal_name' => $data['name'],
            'location' => $data['location'],
            'contact_number' => $data['contact_number'] ?? null,
            'description' => $data['description'] ?? null,
            'manager_id' => $data['manager_id'] ?? null,
            'active' => true,
        ]);

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
        ]);

        $futsal->update([
            'futsal_name' => $data['name'],
            'location' => $data['location'],
            'contact_number' => $data['contact_number'] ?? $futsal->contact_number,
            'description' => $data['description'] ?? $futsal->description,
            'manager_id' => $data['manager_id'] ?? null,
        ]);

        // If manager changed, update the user's role if needed
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
     * Delete a futsal (careful with this!)
     */
    public function deleteFutsal(Request $request, $id)
    {
        $this->authorizeSuperAdmin($request);

        $futsal = Futsal::findOrFail($id);
        
        // Check if there are any bookings
        $hasBookings = FutsalSlot::where('futsal_id', $id)
            ->whereHas('bookings')
            ->exists();
            
        if ($hasBookings) {
            return response()->json([
                'message' => 'Cannot delete futsal with existing bookings'
            ], 400);
        }

        // Delete all slots first
        FutsalSlot::where('futsal_id', $id)->delete();
        
        // Delete the futsal
        $futsal->delete();

        return response()->json([
            'message' => 'Futsal deleted successfully'
        ]);
    }

    // ==============================
    // ADMINS/MANAGERS MANAGEMENT
    // ==============================

    /**
     * Get all admins/managers
     */
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
                    'managed_futsals' => $admin->futsalsManaged->map(function($f) {
                        return [
                            'id' => $f->id,
                            'name' => $f->futsal_name
                        ];
                    }),
                ];
            });
    }

    /**
     * Create a new admin/manager
     */
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

        // Create admin user
        $admin = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => Hash::make($data['password']),
            'role' => 'admin',
        ]);

        // Assign to futsal if selected
        if (!empty($data['futsal_id'])) {
            Futsal::where('id', $data['futsal_id'])
                ->update(['manager_id' => $admin->id]);
        }

        // Load the managed futsal
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

    /**
     * Update an admin
     */
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

        // Update futsal assignment
        if (isset($data['futsal_id'])) {
            // Remove from current futsal
            Futsal::where('manager_id', $admin->id)->update(['manager_id' => null]);
            
            // Assign to new futsal
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

    /**
     * Delete an admin
     */
    public function deleteAdmin(Request $request, $id)
    {
        $this->authorizeSuperAdmin($request);

        $admin = User::where('role', 'admin')->findOrFail($id);
        
        // Remove from any futsal they manage
        Futsal::where('manager_id', $admin->id)->update(['manager_id' => null]);
        
        $admin->delete();

        return response()->json([
            'message' => 'Admin deleted successfully'
        ]);
    }

    // ==============================
    // BOOKINGS - ALL BOOKINGS
    // ==============================

    public function getBookings(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        return Booking::with(['user', 'futsalSlot.futsal', 'futsalSlot.timeSlot'])
            ->latest()
            ->get()
            ->map(function ($b) {
                return [
                    'id' => $b->id,
                    'user_id' => $b->user_id,
                    'user_name' => $b->user->name ?? 'N/A',
                    'user_email' => $b->user->email ?? 'N/A',
                    'futsal_id' => $b->futsalSlot->futsal->id ?? null,
                    'futsal_name' => $b->futsalSlot->futsal->futsal_name ?? 'N/A',
                    'slot_date' => $b->futsalSlot->slot_date ?? 'N/A',
                    'booking_date' => $b->booking_date,
                    'time' => $b->futsalSlot->timeSlot ? 
                        ($b->futsalSlot->timeSlot->start_time . ' - ' . $b->futsalSlot->timeSlot->end_time) : 
                        'N/A',
                    'status' => $b->status,
                    'payment_status' => $b->payment_status,
                    'created_at' => $b->created_at,
                ];
            });
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

    // ==============================
    // DASHBOARD STATISTICS
    // ==============================

    public function getStats(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        return response()->json([
            'total_futsals' => Futsal::count(),
            'total_users' => User::count(),
            'total_admins' => User::where('role', 'admin')->count(),
            'total_bookings' => Booking::count(),
            'total_revenue' => DB::table('payments')->sum('amount') ?? 0,
            'recent_bookings' => Booking::with(['user', 'futsalSlot.futsal'])
                ->latest()
                ->limit(5)
                ->get()
                ->map(function($b) {
                    return [
                        'id' => $b->id,
                        'user' => $b->user->name ?? 'N/A',
                        'futsal' => $b->futsalSlot->futsal->futsal_name ?? 'N/A',
                        'status' => $b->status,
                    ];
                }),
        ]);
    }
}