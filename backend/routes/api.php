<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AdminDashboardController;

Route::post('/register', [UserController::class, 'register']);
Route::post('/login',    [UserController::class, 'login']);
Route::post('/logout', [UserController::class, 'logout']);

Route::middleware('auth:sanctum')->group(function () {
	// Scoped to a specific futsal (manager-owned)
	Route::get('/futsals/{futsal}/courts', [AdminDashboardController::class, 'courts']);
	Route::post('/futsals/{futsal}/courts', [AdminDashboardController::class, 'storeCourt']);
	Route::put('/futsals/{futsal}/courts/{id}', [AdminDashboardController::class, 'updateCourt']);
	Route::patch('/futsals/{futsal}/courts/{id}/toggle-active', [AdminDashboardController::class, 'toggleActive']);

	Route::get('/futsals/{futsal}/courts/{id}/timeslots', [AdminDashboardController::class, 'timeslots']);
	Route::post('/futsals/{futsal}/courts/{id}/timeslots', [AdminDashboardController::class, 'storeTimeslot']);
	Route::put('/futsals/{futsal}/courts/{id}/timeslots/{tid}', [AdminDashboardController::class, 'updateTimeslot']);
	Route::delete('/futsals/{futsal}/courts/{id}/timeslots/{tid}', [AdminDashboardController::class, 'deleteTimeslot']);

	Route::get('/futsals/{futsal}/bookings', [AdminDashboardController::class, 'bookings']);
	Route::get('/futsals/{futsal}/users', [AdminDashboardController::class, 'users']);

	Route::get('/futsals/{futsal}/reports', [AdminDashboardController::class, 'reports']);

	// Super-admin utilities
	Route::get('/super-admin/futsals', [\App\Http\Controllers\UserController::class, 'listFutsals']);
	Route::post('/super-admin/admins', [\App\Http\Controllers\UserController::class, 'createAdmin']);

	// Super-admin full system controls
	Route::get('/super-admin/futsals/all', [\App\Http\Controllers\AdminDashboardController::class, 'allFutsals']);
	Route::post('/super-admin/futsals', [\App\Http\Controllers\AdminDashboardController::class, 'storeFutsal']);
	Route::put('/super-admin/futsals/{id}', [\App\Http\Controllers\AdminDashboardController::class, 'updateFutsal']);
	Route::patch('/super-admin/futsals/{id}/toggle-active', [\App\Http\Controllers\AdminDashboardController::class, 'toggleFutsalActive']);

	Route::get('/super-admin/bookings', [\App\Http\Controllers\AdminDashboardController::class, 'allBookings']);
	Route::get('/super-admin/users', [\App\Http\Controllers\AdminDashboardController::class, 'allUsers']);

	// Courts & timeslots global management
	Route::get('/super-admin/courts', [\App\Http\Controllers\AdminDashboardController::class, 'allCourts']);
	Route::post('/super-admin/courts', [\App\Http\Controllers\AdminDashboardController::class, 'storeCourtGlobal']);
	Route::put('/super-admin/courts/{id}', [\App\Http\Controllers\AdminDashboardController::class, 'updateCourtGlobal']);
	Route::patch('/super-admin/courts/{id}/toggle-active', [\App\Http\Controllers\AdminDashboardController::class, 'toggleCourtActiveGlobal']);

	Route::get('/super-admin/courts/{court}/timeslots', [\App\Http\Controllers\AdminDashboardController::class, 'timeslotsGlobal']);
	Route::post('/super-admin/courts/{court}/timeslots', [\App\Http\Controllers\AdminDashboardController::class, 'storeTimeslotGlobal']);
	Route::put('/super-admin/courts/{court}/timeslots/{tid}', [\App\Http\Controllers\AdminDashboardController::class, 'updateTimeslotGlobal']);
	Route::delete('/super-admin/courts/{court}/timeslots/{tid}', [\App\Http\Controllers\AdminDashboardController::class, 'deleteTimeslotGlobal']);
});



