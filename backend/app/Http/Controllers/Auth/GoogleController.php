<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Str;

class GoogleController extends Controller
{
    public function redirect(Request $request)
    {
        try {
            Log::info('Google redirect started');
            
            if (!config('services.google.client_id')) {
                Log::error('Google client ID not configured');
                return redirect(env('FRONTEND_URL', 'http://localhost:5173') . '/login?error=google_not_configured');
            }
            
            return Socialite::driver('google')->redirect();
            
        } catch (\Exception $e) {
            Log::error('Google redirect error: ' . $e->getMessage());
            return redirect(env('FRONTEND_URL', 'http://localhost:5173') . '/login?error=' . urlencode($e->getMessage()));
        }
    }

    public function callback()
    {
        try {
            Log::info('Google callback started');
            
            $googleUser = Socialite::driver('google')->user();
            
            Log::info('Google user retrieved', [
                'email' => $googleUser->getEmail(),
                'name' => $googleUser->getName(),
                'id' => $googleUser->getId()
            ]);
            
            if (!$googleUser->getEmail()) {
                throw new \Exception('No email provided by Google');
            }
            
            // Check if user already exists
            $user = User::where('email', $googleUser->getEmail())->first();
            $isNewUser = false;
            
            if (!$user) {
                // SIGN UP: Create new user (one-click registration)
                Log::info('Creating new user via Google Sign In', [
                    'email' => $googleUser->getEmail(),
                    'name' => $googleUser->getName()
                ]);
                
                $user = User::create([
                    'name' => $googleUser->getName(),
                    'email' => $googleUser->getEmail(),
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                    'password' => Hash::make(Str::random(32)), // Random password (user will use Google to login)
                    'phone' => null,
                    'role' => 'user',
                    'email_verified_at' => now(), // Google verified email
                ]);
                
                $isNewUser = true;
                Log::info('New user created via Google', ['user_id' => $user->id]);
            } else {
                // SIGN IN: Existing user
                Log::info('Existing user signing in via Google', ['user_id' => $user->id]);
                
                // Update Google ID if not set
                if (!$user->google_id) {
                    $user->update([
                        'google_id' => $googleUser->getId(),
                        'avatar' => $googleUser->getAvatar(),
                    ]);
                    Log::info('Updated user with Google ID');
                }
            }
            
            // Create token and login immediately
            $token = $user->createToken('auth_token')->plainTextToken;
            
            $userFutsalId = null;
            if ($user->role === 'admin') {
                $userFutsalId = DB::table('futsals')
                    ->where('manager_id', $user->id)
                    ->value('id');
            }
            
            $userData = [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar' => $user->avatar,
                'futsal_id' => $userFutsalId,
                'is_new_user' => $isNewUser,
                'email_verified' => true,
                'phone' => $user->phone,
            ];
            
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
            $redirectUrl = $frontendUrl . '/google-callback?token=' . urlencode($token) . '&user=' . urlencode(json_encode($userData));
            
            Log::info('Redirecting to frontend with login', ['url' => $redirectUrl]);
            
            return redirect($redirectUrl);
            
        } catch (\Exception $e) {
            Log::error('Google callback error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return redirect(env('FRONTEND_URL', 'http://localhost:5173') . '/login?error=' . urlencode($e->getMessage()));
        }
    }
}