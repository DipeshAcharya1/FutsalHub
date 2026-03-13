<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class UserController extends Controller
{
	

	/**
	 * Register a new user and return an API token.
	 */
	public function register(Request $request): JsonResponse
	{
		$data = $request->validate([
			'name' => 'required|string|max:255',
			'email' => 'required|email|unique:users,email',
			'phone' => 'required|string|min:10',
			'password' => 'required|string|min:8|confirmed',
		]);

		$user = User::create([
			'name' => $data['name'],
			'email' => $data['email'],
			'phone' => $data['phone'],
			'password' => Hash::make($data['password']),
		]);

		$token = $user->createToken('auth_token')->plainTextToken;

		return response()->json([
			'access_token' => $token,
			'token_type' => '',
			'user' => $user,
		], 201);
	}

	/**
	 * Login user and return an API token.
	 */
	public function login(Request $request): JsonResponse
	{
		$credentials = $request->validate([
			'email' => 'required|email',
			'password' => 'required|string',
		]);

		$user = User::where('email', $credentials['email'])->first();

		if (! $user || ! Hash::check($credentials['password'], $user->password)) {
			return response()->json(['message' => 'The provided credentials are incorrect.'], 401);
		}

		$token = $user->createToken('auth_token')->plainTextToken;

		$userFutsalId = DB::table('futsals')
		->where('manager_id', $user->id)
		->value('id'); // gets the futsal id managed by this admin (or null)

		return response()->json([
			'access_token' => $token,
			'token_type' => '',
			'user' => [
				'id' => $user->id,
				'name' => $user->name,
				'email' => $user->email,
				'role' => $user->role,
				'futsal_id' => $userFutsalId, // include it here!
			]
		]);
	}

	/**
	 * Logout (revoke current token).
	 */
	public function logout(Request $request): JsonResponse
	{
		$user = $request->user();
		if ($user && $request->user()->currentAccessToken()) {
			$request->user()->currentAccessToken()->delete();
		}

		return response()->json(['message' => 'Logged out successfully.']);
	}

	/**
	 * Get user profile
	 */
	public function getProfile(Request $request): JsonResponse
	{
		try {
			$user = $request->user();
			return response()->json([
				'success' => true,
				'data' => $user
			]);
		} catch (\Exception $e) {
			return response()->json([
				'success' => false,
				'message' => 'Failed to load profile'
			], 500);
		}
	}

	/**
	 * Update user profile
	 */
	public function updateProfile(Request $request): JsonResponse
	{
		try {
			$validator = Validator::make($request->all(), [
				'name' => 'required|string|max:255',
				'email' => 'required|email|unique:users,email,' . $request->user()->id,
				'phone' => 'nullable|string|max:20',
			]);

			if ($validator->fails()) {
				return response()->json([
					'success' => false,
					'errors' => $validator->errors()
				], 422);
			}

			$user = $request->user();
			$user->name = $request->name;
			$user->email = $request->email;
			$user->phone = $request->phone;
			$user->save();

			return response()->json([
				'success' => true,
				'message' => 'Profile updated successfully',
				'data' => $user
			]);
		} catch (\Exception $e) {
			return response()->json([
				'success' => false,
				'message' => 'Failed to update profile'
			], 500);
		}
	}

	/**
	 * Change user password
	 */
	public function changePassword(Request $request): JsonResponse
	{
		try {
			$validator = Validator::make($request->all(), [
				'current_password' => 'required|string',
				'new_password' => 'required|string|min:6|confirmed',
			]);

			if ($validator->fails()) {
				return response()->json([
					'success' => false,
					'errors' => $validator->errors()
				], 422);
			}

			$user = $request->user();

			if (!Hash::check($request->current_password, $user->password)) {
				return response()->json([
					'success' => false,
					'message' => 'Current password is incorrect'
				], 422);
			}

			$user->password = Hash::make($request->new_password);
			$user->save();

			return response()->json([
				'success' => true,
				'message' => 'Password changed successfully'
			]);
		} catch (\Exception $e) {
			return response()->json([
				'success' => false,
				'message' => 'Failed to change password'
			], 500);
		}
	}

	/**
	 * Get user bookings
	 */
	public function getUserBookings(Request $request): JsonResponse
	{
		try {
			$user = $request->user();
			
			$bookings = DB::table('bookings')
				->join('futsal_slots', 'bookings.futsal_slot_id', '=', 'futsal_slots.id')
				->join('time_slots', 'futsal_slots.slot_id', '=', 'time_slots.id')
				->join('futsals', 'futsal_slots.futsal_id', '=', 'futsals.id')
				->where('bookings.user_id', $user->id)
				->select(
					'bookings.id',
					'bookings.booking_date',
					'bookings.status',
					'bookings.payment_status',
					'futsals.futsal_name',
					'futsals.location',
					'time_slots.start_time',
					'time_slots.end_time',
					'futsal_slots.price'
				)
				->orderBy('bookings.created_at', 'desc')
				->get();

			return response()->json([
				'success' => true,
				'data' => $bookings
			]);
		} catch (\Exception $e) {
			return response()->json([
				'success' => false,
				'message' => 'Failed to load bookings'
			], 500);
		}
	}

	/**
	 * Cancel booking
	 */
	public function cancelBooking(Request $request, $id): JsonResponse
	{
		try {
			$user = $request->user();
			
			$booking = DB::table('bookings')
				->where('id', $id)
				->where('user_id', $user->id)
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

			DB::table('bookings')
				->where('id', $id)
				->update([
					'status' => 'cancelled',
					'updated_at' => now()
				]);

			return response()->json([
				'success' => true,
				'message' => 'Booking cancelled successfully'
			]);
		} catch (\Exception $e) {
			return response()->json([
				'success' => false,
				'message' => 'Failed to cancel booking'
			], 500);
		}
	}


	/**
	 * Return all futsals (super-admin only)
	 */
	public function listFutsals(Request $request): JsonResponse
	{
		if (! $request->user() || $request->user()->role !== 'super-admin') {
			return response()->json(['message' => 'Forbidden'], 403);
		}
		if (! Schema::hasTable('futsals')) {
			return response()->json([]);
		}
		$futsals = DB::table('futsals')->orderBy('id', 'asc')->get();
		return response()->json($futsals);
	}

	/**
	 * Verify if token is valid
	 */
	public function verifyToken(Request $request): JsonResponse
	{
		try {
			// If we reach here, the auth middleware already verified the token
			return response()->json([
				'valid' => true,
				'user' => $request->user()
			]);
		} catch (\Exception $e) {
			return response()->json([
				'valid' => false,
				'message' => 'Invalid token'
			], 401);
		}
}

	/**
	 * Create an admin (futsal manager) user. If futsal_id provided, assign manager_id.
	 */
	public function createAdmin(Request $request): JsonResponse
	{
		if (! $request->user() || $request->user()->role !== 'super-admin') {
			return response()->json(['message' => 'Forbidden'], 403);
		}
		$data = $request->validate([
			'name' => 'required|string|max:255',
			'email' => 'required|email|unique:users,email',
			'phone' => 'nullable|string|max:20',
			'password' => 'required|string|min:8|confirmed',
			'futsal_id' => 'nullable|integer',
		]);

		$user = User::create([
			'name' => $data['name'],
			'email' => $data['email'],
			'phone' => $data['phone'] ?? null,
			'password' => Hash::make($data['password']),
			'role' => 'admin',
		]);

		if (! empty($data['futsal_id']) && Schema::hasTable('futsals')) {
			DB::table('futsals')->where('id', $data['futsal_id'])->update(['manager_id' => $user->id, 'updated_at' => now()]);
		}

		return response()->json($user, 201);
	}

	
	
}
