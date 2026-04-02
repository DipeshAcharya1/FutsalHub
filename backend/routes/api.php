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
use App\Http\Controllers\KhaltiController;

// PUBLIC ROUTES (No authentication required)
Route::post('/register', [UserController::class, 'register']);
Route::post('/login', [UserController::class, 'login']);
Route::post('/logout', [UserController::class, 'logout']);
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

// FUTSAL PUBLIC ROUTES
Route::get('/futsals', [FutsalController::class, 'index']); 
Route::get('/futsals/locations', [FutsalController::class, 'getLocations']); 
Route::get('/futsals/{id}', [FutsalController::class, 'show']);
Route::get('/futsals/{futsalId}/available-slots', [FutsalController::class, 'getAvailableSlots']);


Route::get('/verify-email/{id}/{token}', [UserController::class, 'verifyEmail']);

// =============================================
// PROTECTED ROUTES (require authentication)
// =============================================
Route::middleware('auth:sanctum')->group(function () {
    // USER ROUTES
    Route::get('/user/profile', [UserController::class, 'getProfile']);
    Route::put('/user/profile', [UserController::class, 'updateProfile']);
    Route::post('/user/avatar', [UserController::class, 'uploadAvatar']);
    Route::delete('/user/avatar', [UserController::class, 'deleteAvatar']);
    Route::post('/user/change-password', [UserController::class, 'changePassword']);
     Route::get('/verification-status', [UserController::class, 'checkVerificationStatus']);
    Route::post('/resend-verification', [UserController::class, 'resendVerification']);
    Route::get('/user/bookings', [BookingController::class, 'getUserBookings']);
    
    // BOOKING ROUTES
    Route::post('/bookings', [BookingController::class, 'createBooking']);
    Route::get('/bookings/{id}', [BookingController::class, 'show']);
    Route::post('/bookings/{id}/refund', [BookingController::class, 'cancelBooking']);
    Route::get('/payment/history', [BookingController::class, 'getPaymentHistory']);
    Route::post('/bookings/bulk/cancel', [BookingController::class, 'cancelBulkBooking']);
    Route::get('/bookings/bulk/{bulkBookingId}', [BookingController::class, 'getBulkBookingDetails']);


// =============================================
// KHALTI PAYMENT ROUTES 
// =============================================
Route::post('/khalti/initiate', [KhaltiController::class, 'initiatePayment']);
Route::post('/khalti/initiate-bulk', [KhaltiController::class, 'initiateBulkPayment']);
Route::post('/khalti/verify', [KhaltiController::class, 'verifyPayment']);


    // ADMIN ROUTES
    Route::get('/admin/futsals/{futsal}', [AdminDashboardController::class, 'futsal']);
    Route::post('/admin/futsals/{futsal}/update', [AdminDashboardController::class, 'updateFutsal']);
    Route::post('/admin/futsals/{futsal}/image', [AdminDashboardController::class, 'uploadImage']);
    Route::delete('/admin/futsals/{futsal}/image', [AdminDashboardController::class, 'deleteImage']);
    
    Route::get('/time-slots', [AdminDashboardController::class, 'timeSlots']);
    
    Route::get('/admin/futsals/{futsal}/courts', [AdminDashboardController::class, 'courts']);
    Route::post('/admin/futsals/{futsal}/courts', [AdminDashboardController::class, 'storeCourt']);
    Route::put('/admin/futsals/{futsal}/courts/{id}', [AdminDashboardController::class, 'updateCourt']);
    Route::patch('/admin/futsals/{futsal}/courts/{id}/toggle-active', [AdminDashboardController::class, 'toggleActive']);
    Route::delete('/admin/futsals/{futsal}/courts/{id}', [AdminDashboardController::class, 'deleteCourt']);
    
    Route::get('/admin/futsals/{futsal}/settings', [AdminDashboardController::class, 'getSettings']);
    Route::post('/admin/futsals/{futsal}/settings', [AdminDashboardController::class, 'saveSettings']);
    Route::post('/admin/futsals/{futsal}/generate-slots', [AdminDashboardController::class, 'generateSlots']);
    Route::post('/admin/futsals/{futsal}/bulk-generate-slots', [AdminDashboardController::class, 'bulkGenerateSlots']);

    Route::get('/admin/futsals/{futsal}/users/{userId}/bookings', [AdminDashboardController::class, 'getUserBookings']);
    Route::post('/admin/futsals/{futsal}/users/{userId}/restrict', [AdminDashboardController::class, 'restrictUser']);
    Route::post('/admin/futsals/{futsal}/users/{userId}/unrestrict', [AdminDashboardController::class, 'unrestrictUser']);

    Route::get('/admin/futsals/{futsal}/bookings', [AdminDashboardController::class, 'bookings']);
    Route::get('/admin/futsals/{futsal}/users', [AdminDashboardController::class, 'users']);
    Route::get('/admin/futsals/{futsal}/payments', [AdminDashboardController::class, 'payments']);
    Route::get('/admin/futsals/{futsal}/reports', [AdminDashboardController::class, 'reports']);

    // SUPER ADMIN ROUTES
    Route::prefix('super-admin')->group(function () {
        Route::get('/futsals', [SuperAdminController::class, 'getFutsals']);
        Route::get('/futsals/{id}', [SuperAdminController::class, 'getFutsalDetails']);
        Route::get('/futsal-stats', [SuperAdminController::class, 'getFutsalStats']);
        Route::post('/futsals', [SuperAdminController::class, 'storeFutsal']);
        Route::put('/futsals/{id}', [SuperAdminController::class, 'updateFutsal']);
        Route::patch('/futsals/{id}/toggle-active', [SuperAdminController::class, 'toggleActive']);
        Route::delete('/futsals/{id}', [SuperAdminController::class, 'deleteFutsal']);
        
        Route::get('/admins', [SuperAdminController::class, 'getAdmins']);
        Route::post('/admins', [SuperAdminController::class, 'createAdmin']);
        Route::put('/admins/{id}', [SuperAdminController::class, 'updateAdmin']);
        Route::delete('/admins/{id}', [SuperAdminController::class, 'deleteAdmin']);
        
        Route::get('/bookings', [SuperAdminController::class, 'getBookings']);
        Route::get('/bookings/{id}', [SuperAdminController::class, 'getBookingDetails']);
        
        Route::get('/users', [SuperAdminController::class, 'getUsers']);
        Route::get('/users/{id}', [SuperAdminController::class, 'getUserDetails']);
        
        Route::get('/payments', [SuperAdminController::class, 'getPayments']);
        
        Route::get('/time-slots', [SuperAdminController::class, 'getTimeSlots']);
        Route::post('/time-slots', [SuperAdminController::class, 'createTimeSlot']);
        Route::delete('/time-slots/{id}', [SuperAdminController::class, 'deleteTimeSlot']);
        
        Route::get('/stats', [SuperAdminController::class, 'getStats']);
        Route::get('/revenue', [SuperAdminController::class, 'getRevenue']);
        Route::get('/reports/booking-summary', [SuperAdminController::class, 'getBookingSummary']);
        
        Route::get('/dashboard', [SuperAdminController::class, 'getDashboardData']);
        Route::get('/activity-logs', [SuperAdminController::class, 'getActivityLogs']);
    });
});

// FALLBACK ROUTE
Route::fallback(function () {
    return response()->json([
        'success' => false,
        'message' => 'API endpoint not found'
    ], 404);
});