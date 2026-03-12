<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
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
