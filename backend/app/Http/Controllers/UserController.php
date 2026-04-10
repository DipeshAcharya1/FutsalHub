<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Auth\Events\Registered;
use Carbon\Carbon;

class UserController extends Controller
{
	/**
     * Register a new user and send verification email
     */
    public function register(Request $request): JsonResponse
{
    try {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'required|string|min:10',
            'password' => 'required|string|min:8|confirmed',
            'google_id' => 'nullable|string',
            'avatar' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $userData = [
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'email_verified_at' => $request->google_id ? now() : null, // Auto-verify if Google signup
        ];
        
        // Add Google data if present
        if ($request->google_id) {
            $userData['google_id'] = $request->google_id;
            $userData['avatar'] = $request->avatar;
        }

        $user = User::create($userData);

        // Send verification email only for non-Google users
        if (!$request->google_id) {
            try {
                $this->sendVerificationEmail($user);
            } catch (\Exception $e) {
                Log::error('Failed to send verification email: ' . $e->getMessage());
            }
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'email_verified' => $request->google_id ? true : false,
            ],
            'message' => 'Registration successful!'
        ], 201);
        
    } catch (\Exception $e) {
        Log::error('Registration error: ' . $e->getMessage());
        return response()->json([
            'message' => 'Registration failed: ' . $e->getMessage()
        ], 500);
    }
}

    /**
 * Send verification email to user
 */
private function sendVerificationEmail($user)
{
    $verificationToken = sha1($user->email);
    $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
    $verificationUrl = "{$frontendUrl}/verify-email/{$user->id}/{$verificationToken}";

    $subject = "Verify Your Email Address - FutsalHub";
    
    $html = "
    <!DOCTYPE html>
    <html>
    <head>
        <title>Verify Your Email</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .button { display: inline-block; padding: 12px 30px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; }
            .warning { background: #fff3cd; padding: 10px; border-radius: 5px; font-size: 12px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>FutsalHub</h1>
                <p>Verify Your Email Address</p>
            </div>
            <div class='content'>
                <h2>Hello {$user->name},</h2>
                <p>Thank you for registering with FutsalHub! Please verify your email address to start booking futsal slots.</p>
                <div style='text-align: center;'>
                    <a href='{$verificationUrl}' class='button'>Verify Email Address</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style='word-break: break-all; font-size: 12px; color: #666;'>{$verificationUrl}</p>
                <div class='warning'>
                    <strong>⚠️ Note:</strong> This verification link will expire in 60 minutes.
                </div>
            </div>
            <div class='footer'>
                <p>© 2026 FutsalHub. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    ";

    // FIXED: Use Mail::html() instead of Mail::send()
    Mail::html($html, function ($message) use ($user, $subject) {
        $message->to($user->email, $user->name)
                ->subject($subject);
    });
}

    /**
     * Login user with email verification check
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'The provided credentials are incorrect.'], 401);
        }

        // Check if email is verified
        if (!$user->email_verified_at) {
            return response()->json([
                'message' => 'Please verify your email address before logging in.',
                'email_verified' => false,
                'email' => $user->email
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        $userFutsalId = DB::table('futsals')
            ->where('manager_id', $user->id)
            ->value('id');

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar' => $user->avatar,
                'futsal_id' => $userFutsalId,
                'email_verified' => true,
            ]
        ]);
    }

    /**
     * Verify email
     */
    public function verifyEmail(Request $request, $id, $token): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        }

        if (sha1($user->email) !== $token) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid verification token'
            ], 400);
        }

        if ($user->email_verified_at) {
            return response()->json([
                'success' => false,
                'message' => 'Email already verified'
            ], 400);
        }

        $user->email_verified_at = now();
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Email verified successfully! You can now login.'
        ]);
    }
	/**
	 * Check verification status
	 */
	public function checkVerificationStatus(Request $request): JsonResponse
	{
		$user = $request->user();
		
		return response()->json([
			'success' => true,
			'email_verified' => !is_null($user->email_verified_at),
			'email' => $user->email
		]);
	}


    /**
     * Resend verification email
     */
    public function resendVerification(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        if ($user->email_verified_at) {
            return response()->json([
                'success' => false,
                'message' => 'Email already verified'
            ], 400);
        }

        $this->sendVerificationEmail($user);

        return response()->json([
            'success' => true,
            'message' => 'Verification email sent! Please check your inbox.'
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
			if ($user->avatar && !str_starts_with($user->avatar, 'http')) {
				$user->avatar = asset($user->avatar);
			}
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
				'phone' => 'required|string|max:10|regex:/^[0-9]+$/',
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
	 * Upload profile avatar
	 */
	public function uploadAvatar(Request $request): JsonResponse
	{
		try {
			$validator = Validator::make($request->all(), [
				'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
			]);

			if ($validator->fails()) {
				return response()->json([
					'success' => false,
					'errors' => $validator->errors()
				], 422);
			}

			$user = $request->user();
			
			// Delete old avatar
			if ($user->avatar) {
				$oldPath = str_replace(asset('storage/'), '', $user->avatar);
				if (Storage::disk('public')->exists($oldPath)) {
					Storage::disk('public')->delete($oldPath);
				}
			}

			// Upload new avatar
			$path = $request->file('avatar')->store('avatars', 'public');
			$avatarUrl = asset('storage/' . $path);
			
			$user->avatar = $avatarUrl;
			$user->save();

			return response()->json([
				'success' => true,
				'message' => 'Avatar uploaded successfully',
				'avatar_url' => $avatarUrl
			]);
		} catch (\Exception $e) {
			return response()->json([
				'success' => false,
				'message' => 'Failed to upload avatar'
			], 500);
		}
	}

	/**
	 * Delete profile avatar
	 */
	public function deleteAvatar(Request $request): JsonResponse
	{
		try {
			$user = $request->user();
			
			if ($user->avatar) {
				$oldPath = str_replace(asset('storage/'), '', $user->avatar);
				if (Storage::disk('public')->exists($oldPath)) {
					Storage::disk('public')->delete($oldPath);
				}
				$user->avatar = null;
				$user->save();
			}

			return response()->json([
				'success' => true,
				'message' => 'Avatar deleted successfully'
			]);
		} catch (\Exception $e) {
			return response()->json([
				'success' => false,
				'message' => 'Failed to delete avatar'
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

			// Send password change confirmation email
			try {
				$this->sendPasswordChangeConfirmationEmail($user);
			} catch (\Exception $e) {
				Log::error('Failed to send password change email: ' . $e->getMessage());
				// Don't fail the request if email fails
			}

			return response()->json([
				'success' => true,
				'message' => 'Password changed successfully'
			]);
		} catch (\Exception $e) {
			Log::error('Change password error: ' . $e->getMessage());
			return response()->json([
				'success' => false,
				'message' => 'Failed to change password'
			], 500);
		}
	}

	/**
	 * Send password change confirmation email
	 */
	private function sendPasswordChangeConfirmationEmail($user)
	{
		$html = "
		<!DOCTYPE html>
		<html>
		<head>
			<title>Password Changed Successfully</title>
			<style>
				body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px; }
				.container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
				.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
				.header h1 { margin: 0; font-size: 24px; }
				.header p { margin: 10px 0 0; opacity: 0.9; }
				.content { padding: 30px; text-align: center; }
				.success-icon { font-size: 64px; color: #27ae60; margin-bottom: 20px; }
				.button { display: inline-block; padding: 12px 30px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
				.footer { text-align: center; padding: 20px; font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; }
				.warning { background: #fff3cd; padding: 10px; border-radius: 5px; font-size: 12px; margin-top: 20px; }
				.detail-box { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: left; }
			</style>
		</head>
		<body>
			<div class='container'>
				<div class='header'>
					<h1>FutsalHub</h1>
					<p>Password Changed Successfully</p>
				</div>
				<div class='content'>
					<div class='success-icon'>✓</div>
					<h2>Hello {$user->name},</h2>
					<p>Your password has been changed successfully.</p>
					<div class='detail-box'>
						<strong>Account Details:</strong><br>
						Email: {$user->email}<br>
						Changed on: " . now()->format('F j, Y \a\t g:i A') . "
					</div>
					<p>If you made this change, you can ignore this email.</p>
					<div class='warning'>
						<strong>⚠️ Did not make this change?</strong><br>
						Please contact our support team immediately to secure your account.
					</div>
					<p>You can now log in with your new password.</p>
					<div style='text-align: center;'>
						<a href='" . env('FRONTEND_URL', 'http://localhost:5173') . "/login' class='button'>Login to Your Account</a>
					</div>
				</div>
				<div class='footer'>
					<p>© 2026 FutsalHub. All rights reserved.</p>
					<p>If you did not request this change, please contact us at support@futsalhub.com</p>
				</div>
			</div>
		</body>
		</html>
		";

		Mail::html($html, function ($message) use ($user) {
			$message->to($user->email, $user->name)
					->subject('Password Changed Successfully - FutsalHub');
		});
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

			if ($booking->status !== 'confirmed') {
				return response()->json([
					'success' => false,
					'message' => 'Only confirmed bookings can be cancelled'
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
	 * Create an admin (futsal manager) user.
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