<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class PasswordResetController extends Controller
{
    public function forgotPassword(Request $request): JsonResponse
    {
        Log::info('Forgot password request', ['email' => $request->email]);
        
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Email not found'
            ], 422);
        }

        try {
            $user = User::where('email', $request->email)->first();
            $token = Str::random(64);
            
            // Delete old tokens
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            
            // Store new token
            DB::table('password_reset_tokens')->insert([
                'email' => $request->email,
                'token' => Hash::make($token),
                'created_at' => now()
            ]);
            
            $resetLink = env('FRONTEND_URL', 'http://localhost:5173') . "/reset-password?token={$token}&email={$request->email}";
            
            // Send email
            $this->sendResetEmail($user, $resetLink);
            
            Log::info('Reset email sent successfully', ['email' => $request->email]);
            
            return response()->json([
                'success' => true,
                'message' => 'Password reset link sent to your email'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Forgot password error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to send reset link'
            ], 500);
        }
    }

    public function resetPassword(Request $request): JsonResponse
    {
        Log::info('Reset password request', ['email' => $request->email]);
        
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'token' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $resetData = DB::table('password_reset_tokens')
                ->where('email', $request->email)
                ->first();

            if (!$resetData) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or expired reset link'
                ], 400);
            }

            // Check if token expired (60 minutes)
            $createdAt = strtotime($resetData->created_at);
            if (time() - $createdAt > 3600) {
                DB::table('password_reset_tokens')->where('email', $request->email)->delete();
                return response()->json([
                    'success' => false,
                    'message' => 'Reset link has expired'
                ], 400);
            }

            // Verify token
            if (!Hash::check($request->token, $resetData->token)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid reset token'
                ], 400);
            }

            // Update password
            $user = User::where('email', $request->email)->first();
            $user->password = Hash::make($request->password);
            $user->save();

            // Delete used token
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();

            // Send confirmation email
            $this->sendConfirmationEmail($user);

            return response()->json([
                'success' => true,
                'message' => 'Password reset successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Reset password error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to reset password'
            ], 500);
        }
    }

    private function sendResetEmail($user, $resetLink)
    {
        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reset Your Password</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .button { 
                    display: inline-block; 
                    padding: 12px 24px; 
                    background: #3498db; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 5px;
                }
            </style>
        </head>
        <body>
            <div class='container'>
                <h2>Futsal Booking</h2>
                <p>Hello <strong>{$user->name}</strong>,</p>
                <p>We received a request to reset your password. Click the button below:</p>
                <p style='text-align: center;'>
                    <a href='{$resetLink}' class='button'>Reset Password</a>
                </p>
                <p>This link will expire in 60 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <hr>
                <p style='font-size: 12px;'>Futsal Booking System</p>
            </div>
        </body>
        </html>
        ";

        Mail::html($html, function ($message) use ($user) {
            $message->to($user->email, $user->name)
                    ->subject('Reset Your Password - Futsal Booking');
        });
    }

    private function sendConfirmationEmail($user)
    {
        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <title>Password Changed</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
                .success { color: #27ae60; font-size: 48px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='success'>✓</div>
                <h2>Password Changed Successfully!</h2>
                <p>Hello <strong>{$user->name}</strong>,</p>
                <p>Your password has been changed successfully.</p>
                <p>You can now log in with your new password.</p>
                <hr>
                <p style='font-size: 12px;'>Futsal Booking System</p>
            </div>
        </body>
        </html>
        ";

        Mail::html($html, function ($message) use ($user) {
            $message->to($user->email, $user->name)
                    ->subject('Password Changed Successfully - Futsal Booking');
        });
    }
}