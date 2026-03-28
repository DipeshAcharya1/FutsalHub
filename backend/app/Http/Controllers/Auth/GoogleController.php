<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    public function redirect(Request $request)
    {
        try {
            Log::info('Google redirect started');
            
            // Check if Google config exists
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
            
            // Get user from Google
            $googleUser = Socialite::driver('google')->user();
            
            Log::info('Google user retrieved', [
                'email' => $googleUser->getEmail(),
                'name' => $googleUser->getName(),
                'id' => $googleUser->getId()
            ]);
            
            if (!$googleUser->getEmail()) {
                throw new \Exception('No email provided by Google');
            }
            
            // Check if user exists
            $user = User::where('email', $googleUser->getEmail())->first();
            
            if (!$user) {
                // Create new user (SIGN UP)
                Log::info('Creating new user via Google', [
                    'email' => $googleUser->getEmail(),
                    'name' => $googleUser->getName()
                ]);
                
                $user = User::create([
                    'name' => $googleUser->getName(),
                    'email' => $googleUser->getEmail(),
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                    'password' => Hash::make(uniqid()),
                    'role' => 'user',
                ]);
                
                Log::info('User created successfully', ['user_id' => $user->id]);
            } else {
                // Existing user (SIGN IN)
                Log::info('Existing user found', ['user_id' => $user->id]);
                
                // Update Google ID if not set
                if (!$user->google_id) {
                    $user->update([
                        'google_id' => $googleUser->getId(),
                        'avatar' => $googleUser->getAvatar(),
                    ]);
                    Log::info('Updated user with Google ID');
                }
            }
            
            // Create token
            $token = $user->createToken('auth_token')->plainTextToken;
            
            // Get futsal ID if admin
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
                'is_new_user' => !$user->wasRecentlyCreated ? false : true,
            ];
            
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
            $redirectUrl = $frontendUrl . '/google-callback?token=' . $token . '&user=' . urlencode(json_encode($userData));
            
            Log::info('Redirecting to frontend', ['url' => $redirectUrl]);
            
            return redirect($redirectUrl);
            
        } catch (\Exception $e) {
            Log::error('Google callback error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return redirect(env('FRONTEND_URL', 'http://localhost:5173') . '/login?error=' . urlencode($e->getMessage()));
        }
    }
    
    public function testConfig()
    {
        try {
            return response()->json([
                'success' => true,
                'config' => [
                    'client_id' => config('services.google.client_id'),
                    'redirect' => config('services.google.redirect'),
                    'client_id_exists' => !empty(config('services.google.client_id')),
                    'secret_exists' => !empty(config('services.google.client_secret')),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}