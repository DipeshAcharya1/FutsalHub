<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\FutsalController;
use App\Http\Controllers\AdminDashboardController; 
use App\Http\Controllers\SuperAdminController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\Auth\PasswordResetController;
use Illuminate\Support\Facades\Mail;

// =============================================
// PUBLIC ROUTES (No authentication required)
// =============================================

Route::post('/register', [UserController::class, 'register']);
Route::post('/login',    [UserController::class, 'login']);
Route::post('/logout',   [UserController::class, 'logout']);
Route::middleware('auth:sanctum')->get('/verify-token', [UserController::class, 'verifyToken']);

Route::get('/home', [HomeController::class, 'index']);
Route::get('/popular-futsals', [HomeController::class, 'getPopularFutsals']); 
Route::get('/futsals/popular', [HomeController::class, 'getPopularFutsals']);
Route::get('/futsals/stats', [HomeController::class, 'getStats']);

// Google OAuth Routes
Route::get('/auth/google/redirect', [GoogleController::class, 'redirect'])->middleware('web');
Route::get('/auth/google/callback', [GoogleController::class, 'callback'])->middleware('web');

// Password reset routes
Route::post('/forgot-password', [PasswordResetController::class, 'forgotPassword']);
Route::post('/reset-password', [PasswordResetController::class, 'resetPassword']);

// =============================================
// FUTSAL PUBLIC ROUTES
// =============================================

Route::get('/futsals', [FutsalController::class, 'index']); 
Route::get('/futsals/locations', [FutsalController::class, 'getLocations']); 
Route::get('/futsals/{id}', [FutsalController::class, 'show']);
Route::get('/futsals/{futsalId}/available-slots', [FutsalController::class, 'getAvailableSlots']);

// =============================================
// PROTECTED ROUTES (require authentication)
// =============================================

Route::middleware('auth:sanctum')->group(function () {
    
    // =============================================
    // USER ROUTES
    // =============================================
    
    Route::get('/user/profile', [UserController::class, 'getProfile']);
    Route::put('/user/profile', [UserController::class, 'updateProfile']);
    Route::post('/user/avatar', [UserController::class, 'uploadAvatar']);
    Route::delete('/user/avatar', [UserController::class, 'deleteAvatar']);
    Route::post('/user/change-password', [UserController::class, 'changePassword']);
    Route::get('/user/bookings', [BookingController::class, 'getUserBookings']);
    Route::patch('/bookings/{id}/cancel', [BookingController::class, 'cancel']);

    // =============================================
    // BOOKING ROUTES (User booking operations)
    // =============================================
    
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::get('/bookings/{id}', [BookingController::class, 'show']);

    // =============================================
    // ADMIN ROUTES (for futsal managers)
    // =============================================
    
    // Futsal Info Management
    Route::get('/admin/futsals/{futsal}', [AdminDashboardController::class, 'futsal']);
    Route::post('/admin/futsals/{futsal}/update', [AdminDashboardController::class, 'updateFutsal']);
    Route::post('/admin/futsals/{futsal}/image', [AdminDashboardController::class, 'uploadImage']);
    Route::delete('/admin/futsals/{futsal}/image', [AdminDashboardController::class, 'deleteImage']);
    
    // Time Slots Master
    Route::get('/time-slots', [AdminDashboardController::class, 'timeSlots']);
    
    // Futsal Slots (Courts) - CRUD
    Route::get('/admin/futsals/{futsal}/courts', [AdminDashboardController::class, 'courts']);
    Route::post('/admin/futsals/{futsal}/courts', [AdminDashboardController::class, 'storeCourt']);
    Route::put('/admin/futsals/{futsal}/courts/{id}', [AdminDashboardController::class, 'updateCourt']);
    Route::patch('/admin/futsals/{futsal}/courts/{id}/toggle-active', [AdminDashboardController::class, 'toggleActive']);
    Route::delete('/admin/futsals/{futsal}/courts/{id}', [AdminDashboardController::class, 'deleteCourt']);
    
    // Bookings - Admin View Only (No modification)
    Route::get('/admin/futsals/{futsal}/bookings', [AdminDashboardController::class, 'bookings']);
    // Admin cannot update booking status - disabled for security
    // Route::patch('/admin/futsals/{futsal}/bookings/{id}/status', [AdminDashboardController::class, 'updateBookingStatus']);
    
    // Users for specific futsal
    Route::get('/admin/futsals/{futsal}/users', [AdminDashboardController::class, 'users']);
    
    // Payments
    Route::get('/admin/futsals/{futsal}/payments', [AdminDashboardController::class, 'payments']);
    
    // Reports
    Route::get('/admin/futsals/{futsal}/reports', [AdminDashboardController::class, 'reports']);

    // =============================================
    // SUPER ADMIN ROUTES
    // =============================================
    
    Route::prefix('super-admin')->group(function () {
        // Futsal Management
        Route::get('/futsals', [SuperAdminController::class, 'getFutsals']);
        Route::post('/futsals', [SuperAdminController::class, 'storeFutsal']);
        Route::put('/futsals/{id}', [SuperAdminController::class, 'updateFutsal']);
        Route::patch('/futsals/{id}/toggle-active', [SuperAdminController::class, 'toggleActive']);
        Route::delete('/futsals/{id}', [SuperAdminController::class, 'deleteFutsal']);
        
        // Admin Management
        Route::get('/admins', [SuperAdminController::class, 'getAdmins']);
        Route::post('/admins', [SuperAdminController::class, 'createAdmin']);
        Route::put('/admins/{id}', [SuperAdminController::class, 'updateAdmin']);
        Route::delete('/admins/{id}', [SuperAdminController::class, 'deleteAdmin']);
        
        // Reports and Stats
        Route::get('/bookings', [SuperAdminController::class, 'getBookings']);
        Route::get('/users', [SuperAdminController::class, 'getUsers']);
        Route::get('/stats', [SuperAdminController::class, 'getStats']);
    });
});

// =============================================
// FALLBACK ROUTE (404 for undefined API endpoints)
// =============================================

Route::fallback(function () {
    return response()->json([
        'success' => false,
        'message' => 'API endpoint not found'
    ], 404);
});

Route::get('/test-mail', function() {
    try {
        Mail::raw('Test email from Futsal Booking', function($message) {
            $message->to('test@example.com')
                    ->subject('Test Email');
        });
        return response()->json(['success' => true, 'message' => 'Mail sent!']);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'error' => $e->getMessage()]);
    }
});

Route::options('/{any}', function() {
    return response()->json([], 200)
        ->header('Access-Control-Allow-Origin', 'http://localhost:5173')
        ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        ->header('Access-Control-Allow-Credentials', 'true');
})->where('any', '.*');