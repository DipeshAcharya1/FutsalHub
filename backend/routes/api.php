<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\FutsalController;
use App\Http\Controllers\AdminDashboardController; 
use App\Http\Controllers\SuperAdminController;
use App\Http\Controllers\BookingController;

Route::post('/register', [UserController::class, 'register']);
Route::post('/login',    [UserController::class, 'login']);
Route::post('/logout',   [UserController::class, 'logout']);
Route::middleware('auth:sanctum')->get('/verify-token', [UserController::class, 'verifyToken']);

//  PUBLIC ROUTES (No authentication required) 
Route::get('/home', [HomeController::class, 'index']);
Route::get('/popular-futsals', [HomeController::class, 'getPopularFutsals']); 
Route::get('/futsals/popular', [HomeController::class, 'getPopularFutsals']);
Route::get('/futsals/stats', [HomeController::class, 'getStats']);

//  FUTSAL PUBLIC ROUTES 
Route::get('/futsals', [FutsalController::class, 'index']); 
Route::get('/futsals/locations', [FutsalController::class, 'getLocations']); 
Route::get('/futsals/{id}', [FutsalController::class, 'show']); // PUBLIC view Route::get('/futsals/{futsalId}/available-slots', [FutsalController::class, 'getAvailableSlots']);

//  PROTECTED ROUTES (require authentication) 
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user/profile', [UserController::class, 'getProfile']);
    Route::put('/user/profile', [UserController::class, 'updateProfile']);
    Route::post('/user/change-password', [UserController::class, 'changePassword']);
    Route::get('/user/bookings', [UserController::class, 'getUserBookings']);
    Route::patch('/bookings/{id}/cancel', [UserController::class, 'cancelBooking']);

    // ===== ADMIN ROUTES (for futsal managers) =====
    // These must come BEFORE the public /futsals/{id} route
    Route::get('/admin/futsals/{futsal}', [AdminDashboardController::class, 'futsal']);
    Route::post('/admin/futsals/{futsal}/update', [AdminDashboardController::class, 'updateFutsal']);
    Route::post('/admin/futsals/{futsal}/image', [AdminDashboardController::class, 'uploadImage']);
    Route::delete('/admin/futsals/{futsal}/image', [AdminDashboardController::class, 'deleteImage']);
    
    // Time slots
    Route::get('/time-slots', [AdminDashboardController::class, 'timeSlots']);
    
    // Futsal slots (courts)
    Route::get('/admin/futsals/{futsal}/courts', [AdminDashboardController::class, 'courts']);
    Route::post('/admin/futsals/{futsal}/courts', [AdminDashboardController::class, 'storeCourt']);
    Route::put('/admin/futsals/{futsal}/courts/{id}', [AdminDashboardController::class, 'updateCourt']);
    Route::patch('/admin/futsals/{futsal}/courts/{id}/toggle-active', [AdminDashboardController::class, 'toggleActive']);
    Route::delete('/admin/futsals/{futsal}/courts/{id}', [AdminDashboardController::class, 'deleteCourt']);
    
    // Bookings
    Route::get('/admin/futsals/{futsal}/bookings', [AdminDashboardController::class, 'bookings']);
    Route::patch('/admin/futsals/{futsal}/bookings/{id}/status', [AdminDashboardController::class, 'updateBookingStatus']);
    
    // Users (for a specific futsal)
    Route::get('/admin/futsals/{futsal}/users', [AdminDashboardController::class, 'users']);
    
    // Payments
    Route::get('/admin/futsals/{futsal}/payments', [AdminDashboardController::class, 'payments']);
    
    // Reports
    Route::get('/admin/futsals/{futsal}/reports', [AdminDashboardController::class, 'reports']);

    // ===== SUPER ADMIN ROUTES =====
    Route::prefix('super-admin')->group(function () {
        Route::get('/futsals', [SuperAdminController::class, 'getFutsals']);
        Route::post('/futsals', [SuperAdminController::class, 'storeFutsal']);
        Route::put('/futsals/{id}', [SuperAdminController::class, 'updateFutsal']);
        Route::patch('/futsals/{id}/toggle-active', [SuperAdminController::class, 'toggleActive']);
        Route::delete('/futsals/{id}', [SuperAdminController::class, 'deleteFutsal']);
        Route::get('/admins', [SuperAdminController::class, 'getAdmins']);
        Route::post('/admins', [SuperAdminController::class, 'createAdmin']);
        Route::put('/admins/{id}', [SuperAdminController::class, 'updateAdmin']);
        Route::delete('/admins/{id}', [SuperAdminController::class, 'deleteAdmin']);
        Route::get('/bookings', [SuperAdminController::class, 'getBookings']);
        Route::get('/users', [SuperAdminController::class, 'getUsers']);
        Route::get('/stats', [SuperAdminController::class, 'getStats']);
    });


    // Bookings routes
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::get('/user/bookings', [BookingController::class, 'getUserBookings']);
    Route::get('/bookings/{id}', [BookingController::class, 'show']);
    Route::patch('/bookings/{id}/cancel', [BookingController::class, 'cancel']);
});