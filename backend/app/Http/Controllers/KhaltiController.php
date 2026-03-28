<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class KhaltiController extends Controller
{
    /**
     * Initialize payment - Store in payment_intents
     */
    public function initiatePayment(Request $request): JsonResponse
    {
        try {
            $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
                'slot_id' => 'required|exists:futsal_slots,id',
                'amount' => 'required|numeric|min:1',
                'futsal_id' => 'required|exists:futsals,id',
                'booking_date' => 'required|date',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = $request->user();
            $slot = DB::table('futsal_slots')->where('id', $request->slot_id)->first();
            
            if (!$slot->is_available) {
                return response()->json([
                    'success' => false,
                    'message' => 'Slot is no longer available'
                ], 400);
            }

            // Generate unique transaction ID
            $transactionId = 'TXN_' . uniqid() . '_' . time();

            // Store payment intent
            DB::table('payment_intents')->insert([
                'transaction_id' => $transactionId,
                'user_id' => $user->id,
                'slot_id' => $request->slot_id,
                'futsal_id' => $request->futsal_id,
                'amount' => $request->amount,
                'booking_date' => $request->booking_date,
                'expires_at' => Carbon::now()->addMinutes(30),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $returnUrl = env('KHALTI_RETURN_URL', 'http://localhost:5173/payment/verify') . '?transaction_id=' . $transactionId;

            $payload = [
                'return_url' => $returnUrl,
                'website_url' => env('KHALTI_WEBSITE_URL', 'http://localhost:5173'),
                'amount' => $request->amount * 100,
                'purchase_order_id' => $transactionId,
                'purchase_order_name' => 'Futsal Booking',
                'customer_info' => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone ?? 'N/A',
                ],
            ];

            $response = Http::withHeaders([
                'Authorization' => 'Key ' . env('KHALTI_SECRET_KEY'),
                'Content-Type' => 'application/json',
            ])->post(env('KHALTI_BASE_URL') . '/epayment/initiate/', $payload);

            if ($response->successful()) {
                $data = $response->json();
                
                DB::table('payment_intents')
                    ->where('transaction_id', $transactionId)
                    ->update([
                        'pidx' => $data['pidx'],
                        'updated_at' => now(),
                    ]);

                return response()->json([
                    'success' => true,
                    'payment_url' => $data['payment_url'],
                    'transaction_id' => $transactionId,
                ]);
            } else {
                DB::table('payment_intents')->where('transaction_id', $transactionId)->delete();
                return response()->json([
                    'success' => false,
                    'message' => 'Payment initiation failed'
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('Payment initiation error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Payment error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify payment and create booking AFTER successful payment
     */
   public function verifyPayment(Request $request): JsonResponse
    {
        try {
            $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
                'pidx' => 'required|string',
                'transaction_id' => 'required|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            // First, check if booking already exists for this transaction
            $existingPayment = DB::table('payments')
                ->where('transaction_id', $request->pidx)
                ->first();

            if ($existingPayment && $existingPayment->booking_id) {
                $booking = DB::table('bookings')
                    ->join('futsal_slots', 'bookings.futsal_slot_id', '=', 'futsal_slots.id')
                    ->join('time_slots', 'futsal_slots.slot_id', '=', 'time_slots.id')
                    ->join('futsals', 'futsal_slots.futsal_id', '=', 'futsals.id')
                    ->leftJoin('users', 'bookings.user_id', '=', 'users.id')
                    ->where('bookings.id', $existingPayment->booking_id)
                    ->first();
                
                // Send confirmation email if not sent
                $this->sendBookingConfirmation($booking);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Booking already confirmed!',
                    'booking' => $booking,
                ]);
            }

            // Get payment intent
            $intent = DB::table('payment_intents')
                ->where('transaction_id', $request->transaction_id)
                ->first();

            if (!$intent) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment intent not found. Please contact support.'
                ], 404);
            }

            // Verify with Khalti
            $response = Http::withHeaders([
                'Authorization' => 'Key ' . env('KHALTI_SECRET_KEY'),
                'Content-Type' => 'application/json',
            ])->post(env('KHALTI_BASE_URL') . '/epayment/lookup/', [
                'pidx' => $request->pidx,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                
                if ($data['status'] === 'Completed') {
                    // Check if slot is still available
                    $slot = DB::table('futsal_slots')
                        ->where('id', $intent->slot_id)
                        ->first();
                    
                    if (!$slot->is_available) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Slot is no longer available. Your payment will be refunded.'
                        ], 400);
                    }
                    
                    DB::beginTransaction();
                    
                    try {
                        // CREATE BOOKING AFTER SUCCESSFUL PAYMENT
                        $bookingId = DB::table('bookings')->insertGetId([
                            'user_id' => $intent->user_id,
                            'futsal_slot_id' => $intent->slot_id,
                            'booking_date' => $intent->booking_date,
                            'status' => 'confirmed',
                            'payment_status' => 'paid',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                        
                        // Mark slot as unavailable
                        DB::table('futsal_slots')
                            ->where('id', $intent->slot_id)
                            ->update([
                                'is_available' => false,
                                'updated_at' => now(),
                            ]);
                        
                        // Create payment record
                        DB::table('payments')->insert([
                            'booking_id' => $bookingId,
                            'amount' => $intent->amount,
                            'payment_method' => 'Online',
                            'transaction_id' => $request->pidx,
                            'payment_date' => now(),
                            'status' => 'completed',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                        
                        // Delete payment intent
                        DB::table('payment_intents')->where('id', $intent->id)->delete();
                        
                        DB::commit();
                        
                        // Get booking details for email
                        $booking = DB::table('bookings')
                            ->join('futsal_slots', 'bookings.futsal_slot_id', '=', 'futsal_slots.id')
                            ->join('time_slots', 'futsal_slots.slot_id', '=', 'time_slots.id')
                            ->join('futsals', 'futsal_slots.futsal_id', '=', 'futsals.id')
                            ->leftJoin('users', 'bookings.user_id', '=', 'users.id')
                            ->where('bookings.id', $bookingId)
                            ->first();
                        
                        // Send confirmation email
                        $this->sendBookingConfirmation($booking);
                        
                        return response()->json([
                            'success' => true,
                            'message' => 'Payment successful! Booking confirmed.',
                            'booking' => $booking,
                        ]);
                        
                    } catch (\Exception $e) {
                        DB::rollBack();
                        Log::error('Booking creation error: ' . $e->getMessage());
                        throw $e;
                    }
                } else {
                    DB::table('payment_intents')->where('id', $intent->id)->delete();
                    
                    return response()->json([
                        'success' => false,
                        'message' => 'Payment not completed. Status: ' . $data['status']
                    ], 400);
                }
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment verification failed'
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('Verification error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Verification error: ' . $e->getMessage()
            ], 500);
        }
    }

    private function sendBookingConfirmation($booking)
{
    try {
        // Get user email properly
        $user = DB::table('users')->where('id', $booking->user_id)->first();
        
        if (!$user || !$user->email) {
            Log::error('Cannot send email: user not found or no email', ['user_id' => $booking->user_id ?? 'unknown']);
            return;
        }

        Log::info('Sending booking confirmation email to: ' . $user->email);
        
        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <title>Booking Confirmed - FutsalHub</title>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f4f4f4;
                    margin: 0;
                    padding: 20px;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .header {
                    background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0;
                    font-size: 24px;
                }
                .content {
                    padding: 30px;
                }
                .booking-details {
                    background: #f8f9fa;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }
                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #e0e0e0;
                }
                .detail-row:last-child {
                    border-bottom: none;
                }
                .price {
                    font-size: 20px;
                    font-weight: 700;
                    color: #27ae60;
                }
                .button {
                    display: inline-block;
                    background: #3498db;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 6px;
                    margin-top: 20px;
                }
                .footer {
                    background: #f8f9fa;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #777;
                    border-top: 1px solid #e0e0e0;
                }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>Booking Confirmed! ✓</h1>
                    <p>Thank you for booking with FutsalHub</p>
                </div>
                <div class='content'>
                    <h2>Hello " . ($user->name ?? 'Valued Customer') . ",</h2>
                    <p>Your booking has been <strong>CONFIRMED</strong> and payment has been received successfully.</p>
                    <div class='booking-details'>
                        <h3>Booking Details</h3>
                        <div class='detail-row'>
                            <span>Booking ID:</span>
                            <strong>#" . ($booking->id ?? 'N/A') . "</strong>
                        </div>
                        <div class='detail-row'>
                            <span>Futsal:</span>
                            <strong>" . ($booking->futsal_name ?? 'N/A') . "</strong>
                        </div>
                        <div class='detail-row'>
                            <span>Location:</span>
                            <strong>" . ($booking->location ?? 'N/A') . "</strong>
                        </div>
                        <div class='detail-row'>
                            <span>Date:</span>
                            <strong>" . ($booking->slot_date ? date('d M Y', strtotime($booking->slot_date)) : 'N/A') . "</strong>
                        </div>
                        <div class='detail-row'>
                            <span>Time:</span>
                            <strong>" . ($booking->start_time ?? 'N/A') . " - " . ($booking->end_time ?? 'N/A') . "</strong>
                        </div>
                        <div class='detail-row'>
                            <span>Amount Paid:</span>
                            <strong class='price'>Rs. " . ($booking->price ?? '0') . "</strong>
                        </div>
                    </div>
                    <p>Please arrive at the venue 15 minutes before your scheduled time.</p>
                    <div style='text-align: center;'>
                        <a href='" . env('FRONTEND_URL', 'http://localhost:5173') . "/my-bookings' class='button'>View My Bookings</a>
                    </div>
                </div>
                <div class='footer'>
                    <p>FutsalHub - Easy Futsal Booking</p>
                    <p>Email: support@futsalhub.com | Phone: +977 9800000000</p>
                </div>
            </div>
        </body>
        </html>
        ";

        Mail::html($html, function ($message) use ($user) {
            $message->to($user->email, $user->name ?? 'Valued Customer')
                    ->subject('Booking Confirmed - FutsalHub #' . ($booking->id ?? 'N/A'));
        });
        
        Log::info('Booking confirmation email sent successfully to: ' . $user->email);
        
    } catch (\Exception $e) {
        Log::error('Failed to send confirmation email: ' . $e->getMessage());
    }
}
}