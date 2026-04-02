<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;
use Illuminate\Support\Str;

class KhaltiController extends Controller
{
    /**
     * Initialize payment for single slot
     */
    public function initiatePayment(Request $request): JsonResponse
    {
        try {
            Log::info('=== SINGLE PAYMENT INITIATION ===');
            
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
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }
            
            $slot = DB::table('futsal_slots')->where('id', $request->slot_id)->first();
            
            if (!$slot || !$slot->is_available) {
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
                'amount' => (int)($request->amount * 100),
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
     * Initialize bulk payment for multiple slots
     */
    public function initiateBulkPayment(Request $request): JsonResponse
    {
        try {
            Log::info('=== BULK PAYMENT INITIATION ===');
            Log::info('Request data:', $request->all());
            
            $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
                'slots' => 'required|array|min:1',
                'slots.*.slot_id' => 'required|exists:futsal_slots,id',
                'slots.*.amount' => 'required|numeric',
                'slots.*.futsal_id' => 'required|exists:futsals,id',
                'slots.*.booking_date' => 'required|date',
                'total_amount' => 'required|numeric',
                'total_slots' => 'required|integer'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = $request->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }
            
            // Check if all slots are available
            foreach ($request->slots as $slotData) {
                $slot = DB::table('futsal_slots')->where('id', $slotData['slot_id'])->first();
                if (!$slot || !$slot->is_available) {
                    return response()->json([
                        'success' => false,
                        'message' => 'One or more slots are no longer available'
                    ], 400);
                }
            }
            
            // Generate unique bulk booking ID
            $bulkBookingId = 'BULK_' . uniqid() . '_' . time();
            
            // Store bulk payment intent
            DB::table('bulk_payment_intents')->insert([
                'bulk_booking_id' => $bulkBookingId,
                'user_id' => $user->id,
                'slots_data' => json_encode($request->slots),
                'total_amount' => $request->total_amount,
                'total_slots' => $request->total_slots,
                'expires_at' => Carbon::now()->addMinutes(30),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $returnUrl = env('KHALTI_RETURN_URL', 'http://localhost:5173/payment/verify') . '?bulk_booking_id=' . $bulkBookingId;

            $payload = [
                'return_url' => $returnUrl,
                'website_url' => env('KHALTI_WEBSITE_URL', 'http://localhost:5173'),
                'amount' => (int)($request->total_amount * 100),
                'purchase_order_id' => $bulkBookingId,
                'purchase_order_name' => 'Bulk Booking - ' . $request->total_slots . ' slots',
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
                
                DB::table('bulk_payment_intents')
                    ->where('bulk_booking_id', $bulkBookingId)
                    ->update([
                        'pidx' => $data['pidx'],
                        'updated_at' => now(),
                    ]);

                return response()->json([
                    'success' => true,
                    'payment_url' => $data['payment_url'],
                    'bulk_booking_id' => $bulkBookingId,
                    'pidx'=> $data['pidx'],
                ]);
            } else {
                DB::table('bulk_payment_intents')->where('bulk_booking_id', $bulkBookingId)->delete();
                return response()->json([
                    'success' => false,
                    'message' => 'Payment initiation failed'
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('Bulk payment initiation error: ' . $e->getMessage());
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
        Log::info('=== PAYMENT VERIFICATION ===');
        Log::info('Request data:', $request->all());
        
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'pidx' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // FIRST: Check if booking already exists for this transaction
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
                
            if ($booking) {
                Log::info('Booking already exists', ['booking_id' => $booking->id]);
                return response()->json([
                    'success' => true,
                    'message' => 'Booking already confirmed!',
                    'booking' => $booking,
                ]);
            }
        }

        // SECOND: Check if it's a bulk payment
        $bulkIntent = DB::table('bulk_payment_intents')
            ->where('pidx', $request->pidx)
            ->first();

        if ($bulkIntent) {
            Log::info('Found bulk payment intent', ['bulk_booking_id' => $bulkIntent->bulk_booking_id]);
            
            // Check if bulk bookings already exist
            $existingBulkBookings = DB::table('bookings')
                ->where('bulk_booking_id', $bulkIntent->bulk_booking_id)
                ->first();
                
            if ($existingBulkBookings) {
                Log::info('Bulk bookings already exist', ['bulk_booking_id' => $bulkIntent->bulk_booking_id]);
                return response()->json([
                    'success' => true,
                    'message' => 'Bulk booking already confirmed!',
                ]);
            }
            
            return $this->verifyBulkPayment($bulkIntent, $request->pidx);
        }

        // THIRD: Check regular payment intent
        $intent = DB::table('payment_intents')
            ->where('pidx', $request->pidx)
            ->first();

        if (!$intent) {
            // Try to find by bulk_booking_id from the request
            $bulkBookingId = $request->bulk_booking_id;
            if ($bulkBookingId) {
                $bulkIntent = DB::table('bulk_payment_intents')
                    ->where('bulk_booking_id', $bulkBookingId)
                    ->first();
                    
                if ($bulkIntent) {
                    Log::info('Found bulk payment intent by bulk_booking_id', ['bulk_booking_id' => $bulkBookingId]);
                    
                    // Check if bulk bookings already exist
                    $existingBulkBookings = DB::table('bookings')
                        ->where('bulk_booking_id', $bulkIntent->bulk_booking_id)
                        ->first();
                        
                    if ($existingBulkBookings) {
                        return response()->json([
                            'success' => true,
                            'message' => 'Bulk booking already confirmed!',
                        ]);
                    }
                    
                    return $this->verifyBulkPayment($bulkIntent, $request->pidx);
                }
            }
            
            Log::error('Payment intent not found for pidx: ' . $request->pidx);
            return response()->json([
                'success' => false,
                'message' => 'Payment intent not found. Please contact support.'
            ], 404);
        }

        Log::info('Found payment intent', ['intent_id' => $intent->id]);
        
        // Verify with Khalti
        $response = Http::withHeaders([
            'Authorization' => 'Key ' . env('KHALTI_SECRET_KEY'),
            'Content-Type' => 'application/json',
        ])->post(env('KHALTI_BASE_URL') . '/epayment/lookup/', [
            'pidx' => $request->pidx,
        ]);

        if (!$response->successful()) {
            Log::error('Khalti lookup failed', ['response' => $response->body()]);
            return response()->json([
                'success' => false,
                'message' => 'Payment verification failed'
            ], 500);
        }

        $data = $response->json();
        Log::info('Khalti lookup response', ['data' => $data]);
        
        if ($data['status'] !== 'Completed') {
            return response()->json([
                'success' => false,
                'message' => 'Payment not completed. Status: ' . $data['status']
            ], 400);
        }

        // Check if slot is still available
        $slot = DB::table('futsal_slots')->where('id', $intent->slot_id)->first();
        
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
            return response()->json([
                'success' => false,
                'message' => 'Failed to create booking: ' . $e->getMessage()
            ], 500);
        }
    } catch (\Exception $e) {
        Log::error('Verification error: ' . $e->getMessage());
        Log::error($e->getTraceAsString());
        return response()->json([
            'success' => false,
            'message' => 'Verification error: ' . $e->getMessage()
        ], 500);
    }
}

    /**
     * Verify single payment and create booking
     */
    private function verifySinglePayment($intent, $pidx)
    {
        // Verify with Khalti
        $response = Http::withHeaders([
            'Authorization' => 'Key ' . env('KHALTI_SECRET_KEY'),
            'Content-Type' => 'application/json',
        ])->post(env('KHALTI_BASE_URL') . '/epayment/lookup/', [
            'pidx' => $pidx,
        ]);

        if (!$response->successful() || $response['status'] !== 'Completed') {
            DB::table('payment_intents')->where('id', $intent->id)->delete();
            return response()->json([
                'success' => false,
                'message' => 'Payment not completed'
            ], 400);
        }

        // Check if slot is still available
        $slot = DB::table('futsal_slots')->where('id', $intent->slot_id)->first();
        
        if (!$slot->is_available) {
            return response()->json([
                'success' => false,
                'message' => 'Slot is no longer available'
            ], 400);
        }
        
        DB::beginTransaction();
        
        try {
            // Create booking
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
                ->update(['is_available' => false]);
            
            // Create payment record
            DB::table('payments')->insert([
                'booking_id' => $bookingId,
                'amount' => $intent->amount,
                'payment_method' => 'Online',
                'transaction_id' => $pidx,
                'payment_date' => now(),
                'status' => 'completed',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            // Delete payment intent
            DB::table('payment_intents')->where('id', $intent->id)->delete();
            
            DB::commit();
            
            // Get booking details for response
            $booking = DB::table('bookings')
                ->join('futsal_slots', 'bookings.futsal_slot_id', '=', 'futsal_slots.id')
                ->join('time_slots', 'futsal_slots.slot_id', '=', 'time_slots.id')
                ->join('futsals', 'futsal_slots.futsal_id', '=', 'futsals.id')
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
            return response()->json([
                'success' => false,
                'message' => 'Failed to create booking: ' . $e->getMessage()
            ], 500);
        }
    }

    private function verifyBulkPayment($bulkIntent, $pidx)
{
    // First, check if bulk bookings already exist
    $existingBulkBookings = DB::table('bookings')
        ->where('bulk_booking_id', $bulkIntent->bulk_booking_id)
        ->first();
        
    if ($existingBulkBookings) {
        Log::info('Bulk bookings already exist', ['bulk_booking_id' => $bulkIntent->bulk_booking_id]);
        return response()->json([
            'success' => true,
            'message' => 'Bulk booking already confirmed!',
        ]);
    }
    
    // Verify with Khalti
    $response = Http::withHeaders([
        'Authorization' => 'Key ' . env('KHALTI_SECRET_KEY'),
        'Content-Type' => 'application/json',
    ])->post(env('KHALTI_BASE_URL') . '/epayment/lookup/', [
        'pidx' => $pidx,
    ]);

    if (!$response->successful()) {
        Log::error('Khalti lookup failed for bulk payment', ['response' => $response->body()]);
        return response()->json([
            'success' => false,
            'message' => 'Payment verification failed'
        ], 500);
    }

    $data = $response->json();
    Log::info('Khalti lookup response for bulk', ['data' => $data]);
    
    if ($data['status'] !== 'Completed') {
        DB::table('bulk_payment_intents')->where('id', $bulkIntent->id)->delete();
        return response()->json([
            'success' => false,
            'message' => 'Payment not completed. Status: ' . $data['status']
        ], 400);
    }

    $slots = json_decode($bulkIntent->slots_data, true);
    
    // Check if all slots are still available
    foreach ($slots as $slotData) {
        $slot = DB::table('futsal_slots')->where('id', $slotData['slot_id'])->first();
        if (!$slot || !$slot->is_available) {
            return response()->json([
                'success' => false,
                'message' => 'One or more slots are no longer available'
            ], 400);
        }
    }
    
    DB::beginTransaction();
    
    try {
        $bookingIds = [];
        $bulkBookingId = $bulkIntent->bulk_booking_id;
        $totalAmount = (float)$bulkIntent->total_amount; // Ensure it's a float
        
        foreach ($slots as $slotData) {
            $amount = (float)($slotData['amount'] ?? DB::table('futsal_slots')->where('id', $slotData['slot_id'])->value('price'));
            
            $bookingId = DB::table('bookings')->insertGetId([
                'user_id' => $bulkIntent->user_id,
                'futsal_slot_id' => $slotData['slot_id'],
                'booking_date' => $slotData['booking_date'],
                'status' => 'confirmed',
                'payment_status' => 'paid',
                'refund_status' => 'none',
                'refund_amount' => 0,
                'bulk_booking_id' => $bulkBookingId,
                'is_bulk_booking' => 1,
                'total_slots' => $bulkIntent->total_slots,
                'total_amount' => $totalAmount, // Use the total amount, not individual
                'booking_reference' => 'BK-BULK-' . strtoupper(Str::random(8)),
                'payment_method' => 'Online',
                'transaction_id' => $pidx,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $bookingIds[] = $bookingId;
            
            // Mark slot as unavailable
            DB::table('futsal_slots')
                ->where('id', $slotData['slot_id'])
                ->update([
                    'is_available' => false,
                    'updated_at' => now()
                ]);
        }
        
        // Create single payment record for the bulk booking
        DB::table('payments')->insert([
            'booking_id' => $bookingIds[0],
            'amount' => $totalAmount,
            'payment_method' => 'Online',
            'transaction_id' => $pidx,
            'status' => 'completed',
            'payment_date' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        // Delete the payment intent
        DB::table('bulk_payment_intents')->where('id', $bulkIntent->id)->delete();
        
        DB::commit();
        
        // Get booking details for email
        $booking = DB::table('bookings')
            ->join('futsal_slots', 'bookings.futsal_slot_id', '=', 'futsal_slots.id')
            ->join('time_slots', 'futsal_slots.slot_id', '=', 'time_slots.id')
            ->join('futsals', 'futsal_slots.futsal_id', '=', 'futsals.id')
            ->where('bookings.id', $bookingIds[0])
            ->first();
        
        // Add bulk info to booking object for email
        $booking->total_amount = $totalAmount;
        $booking->total_slots = $bulkIntent->total_slots;
        
        $this->sendBulkBookingConfirmation($booking, $bulkIntent->user_id, $slots);
        
        return response()->json([
            'success' => true,
            'message' => 'Payment successful! ' . count($bookingIds) . ' slots booked.',
            'booking' => $booking,
            'total_slots' => count($bookingIds),
        ]);
        
    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('Bulk booking creation error: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to create bookings: ' . $e->getMessage()
        ], 500);
    }
}

    /**
 * Send single booking confirmation email - FIXED
 */
private function sendBookingConfirmation($booking)
{
    try {
        $user = DB::table('users')->where('id', $booking->user_id)->first();
        
        if (!$user || !$user->email) {
            Log::error('Cannot send email: user not found', [
                'user_id' => $booking->user_id,
                'booking_id' => $booking->id ?? 'N/A'
            ]);
            return;
        }

        Log::info('Preparing confirmation email for: ' . $user->email, [
            'booking_id' => $booking->id,
            'futsal_name' => $booking->futsal_name ?? 'N/A'
        ]);

        // Prepare email content with proper fallbacks
        $futsalName = $booking->futsal_name ?? 'N/A';
        $slotDate = $booking->slot_date ?? $booking->booking_date ?? now();
        $startTime = $booking->start_time ?? 'N/A';
        $endTime = $booking->end_time ?? 'N/A';
        $price = $booking->price ?? '0';
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');

        $emailBody = "Hello {$user->name},\n\n"
            . " Your booking has been CONFIRMED!\n\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            . " BOOKING DETAILS\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            . "Booking ID: #{$booking->id}\n"
            . "Futsal: {$futsalName}\n"
            . "Date: " . date('d M Y', strtotime($slotDate)) . "\n"
            . "Time: {$startTime} - {$endTime}\n"
            . "Amount: Rs. {$price}\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            . " Important Information:\n"
            . "• Please arrive 15 minutes before your booking time\n"
            . "• Cancellation allowed up to 2 hours before the slot\n"
            . "• Show this email at the futsal counter\n\n"
            . " View your bookings: {$frontendUrl}/profile?tab=bookings\n\n"
            . "Thank you for choosing FutsalHub!\n"
            . " Have a great game!\n\n"
            . "Regards,\n"
            . "FutsalHub Team";

        // Use Mail::raw for plain text email (this works!)
        Mail::raw($emailBody, function ($message) use ($user, $booking) {
            $message->to($user->email, $user->name ?? 'Valued Customer')
                    ->subject(' Booking Confirmed - FutsalHub #' . $booking->id);
        });
        
        Log::info('✓ Confirmation email sent successfully to: ' . $user->email, [
            'booking_id' => $booking->id
        ]);
        
    } catch (\Exception $e) {
        Log::error('✗ Failed to send confirmation email: ' . $e->getMessage(), [
            'booking_id' => $booking->id ?? 'N/A',
            'trace' => $e->getTraceAsString()
        ]);
    }
}

/**
 * Send bulk booking confirmation email - FIXED
 */
private function sendBulkBookingConfirmation($booking, $userId, $slots)
{
    try {
        $user = DB::table('users')->where('id', $userId)->first();
        
        if (!$user || !$user->email) {
            Log::error('Cannot send bulk confirmation email: user not found', [
                'user_id' => $userId
            ]);
            return;
        }

        Log::info('Preparing bulk confirmation email for: ' . $user->email);

        // Build slots list
        $slotsList = '';
        $totalAmount = 0;
        
        foreach ($slots as $index => $slot) {
            $startTime = $slot['start_time'] ?? $slot['startTime'] ?? 'N/A';
            $endTime = $slot['end_time'] ?? $slot['endTime'] ?? 'N/A';
            $amount = $slot['amount'] ?? $slot['price'] ?? 0;
            $bookingDate = $slot['booking_date'] ?? $slot['date'] ?? now();
            $totalAmount += $amount;
            
            $slotsList .= "\n  " . ($index + 1) . ". " . date('d M Y', strtotime($bookingDate)) 
                . " | {$startTime} - {$endTime} | Rs. {$amount}";
        }

        $futsalName = $booking->futsal_name ?? $booking->name ?? 'Futsal Hub';
        $location = $booking->location ?? 'N/A';
        $totalSlots = count($slots);
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');

        $emailBody = "Hello {$user->name},\n\n"
            . " Your BULK BOOKING has been CONFIRMED!\n\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            . " BULK BOOKING DETAILS\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            . "Reference ID: #{$booking->id}\n"
            . "Futsal: {$futsalName}\n"
            . "Location: {$location}\n"
            . "Total Slots: {$totalSlots}\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            . " BOOKED SLOTS:\n"
            . "{$slotsList}\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            . " Total Amount: Rs. {$totalAmount}\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            . " Important Information:\n"
            . "• Please arrive 15 minutes before your first booking\n"
            . "• Cancellation allowed up to 2 hours before each slot\n"
            . "• Show this email at the futsal counter\n\n"
            . " View your bookings: {$frontendUrl}/profile?tab=bookings\n\n"
            . "Thank you for choosing FutsalHub!\n"
            . " Have a great game!\n\n"
            . "Regards,\n"
            . "FutsalHub Team";

        Mail::raw($emailBody, function ($message) use ($user, $booking) {
            $message->to($user->email, $user->name ?? 'Valued Customer')
                    ->subject(' Bulk Booking Confirmed - FutsalHub ' . $booking->id);
        });
        
        Log::info('✓ Bulk confirmation email sent successfully to: ' . $user->email);
        
    } catch (\Exception $e) {
        Log::error('✗ Failed to send bulk confirmation email: ' . $e->getMessage(), [
            'booking_id' => $booking->id ?? 'N/A',
            'trace' => $e->getTraceAsString()
        ]);
    }
}
}