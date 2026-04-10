<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Models\Futsal;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ReviewController extends Controller
{
    // Get reviews for a futsal (public)
    public function getFutsalReviews($futsalId, Request $request)
    {
        $perPage = $request->get('per_page', 10);
        $sort = $request->get('sort', 'latest');
        
        $query = Review::with('user')
            ->where('futsal_id', $futsalId)
            ->where('is_approved', true);
        
        switch ($sort) {
            case 'highest':
                $query->orderBy('rating', 'desc');
                break;
            case 'lowest':
                $query->orderBy('rating', 'asc');
                break;
            default:
                $query->orderBy('created_at', 'desc');
        }
        
        $reviews = $query->paginate($perPage);
        $stats = $this->getRatingStats($futsalId);
        
        return response()->json([
            'success' => true,
            'data' => $reviews,
            'stats' => $stats
        ]);
    }
    
    // Get rating statistics
    private function getRatingStats($futsalId)
    {
        $ratings = Review::where('futsal_id', $futsalId)
            ->where('is_approved', true)
            ->select('rating', DB::raw('count(*) as count'))
            ->groupBy('rating')
            ->pluck('count', 'rating')
            ->toArray();
        
        $distribution = [];
        for ($i = 5; $i >= 1; $i--) {
            $distribution[$i] = $ratings[$i] ?? 0;
        }
        
        $total = array_sum($distribution);
        $average = $total > 0 ? round(array_sum(array_map(function($rating, $count) {
            return $rating * $count;
        }, array_keys($ratings), $ratings)) / $total, 1) : 0;
        
        return [
            'average' => $average,
            'total' => $total,
            'distribution' => $distribution,
            'percentages' => array_map(function($count) use ($total) {
                return $total > 0 ? round(($count / $total) * 100) : 0;
            }, $distribution)
        ];
    }
    
    // Submit a review (authenticated user)
    public function submitReview(Request $request)
    {
        $request->validate([
            'futsal_id' => 'required|exists:futsals,id',
            'rating' => 'required|integer|min:1|max:5',
            'title' => 'nullable|string|max:100',
            'comment' => 'nullable|string|max:1000',
            'images' => 'nullable|array|max:5',
            'images.*' => 'image|mimes:jpeg,png,jpg|max:2048'
        ]);
        
        $user = Auth::user();
        
        // Check if user has already reviewed this futsal
        $existingReview = Review::where('user_id', $user->id)
            ->where('futsal_id', $request->futsal_id)
            ->first();
            
        if ($existingReview) {
            return response()->json([
                'success' => false,
                'message' => 'You have already reviewed this futsal'
            ], 400);
        }
        
        // Check if user has completed a booking at this futsal
        $hasBooked = Booking::where('user_id', $user->id)
            ->whereHas('futsalSlot', function($q) use ($request) {
                $q->where('futsal_id', $request->futsal_id);
            })
            ->where('status', 'confirmed')
            ->exists();
        
        // Upload images
        $imagePaths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('reviews', 'public');
                $imagePaths[] = asset('storage/' . $path);
            }
        }
        
        $review = Review::create([
            'user_id' => $user->id,
            'futsal_id' => $request->futsal_id,
            'rating' => $request->rating,
            'title' => $request->title,
            'comment' => $request->comment,
            'images' => $imagePaths,
            'is_verified_purchase' => $hasBooked,
            'is_approved' => true
        ]);
        
        $this->updateFutsalRating($request->futsal_id);
        
        return response()->json([
            'success' => true,
            'message' => 'Review submitted successfully',
            'data' => $review->load('user')
        ]);
    }
    
    // Update review (edit own review)
    public function updateReview(Request $request, $reviewId)
    {
        $review = Review::where('id', $reviewId)
            ->where('user_id', Auth::id())
            ->firstOrFail();
        
        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'title' => 'nullable|string|max:100',
            'comment' => 'nullable|string|max:1000'
        ]);
        
        $review->update([
            'rating' => $request->rating,
            'title' => $request->title,
            'comment' => $request->comment
        ]);
        
        $this->updateFutsalRating($review->futsal_id);
        
        return response()->json([
            'success' => true,
            'message' => 'Review updated successfully',
            'data' => $review->load('user')
        ]);
    }
    
    // Delete review (user deletes own review)
    public function deleteReview($reviewId)
    {
        $review = Review::where('id', $reviewId)
            ->where('user_id', Auth::id())
            ->firstOrFail();
        
        // Delete images
        if ($review->images && is_array($review->images)) {
            foreach ($review->images as $image) {
                $path = str_replace(asset('storage/'), '', $image);
                if (Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                }
            }
        }
        
        $futsalId = $review->futsal_id;
        $review->delete();
        $this->updateFutsalRating($futsalId);
        
        return response()->json([
            'success' => true,
            'message' => 'Review deleted successfully'
        ]);
    }
    
    // Update futsal average rating
    private function updateFutsalRating($futsalId)
    {
        $stats = $this->getRatingStats($futsalId);
        
        Futsal::where('id', $futsalId)->update([
            'average_rating' => $stats['average'],
            'total_reviews' => $stats['total'],
            'rating_distribution' => json_encode($stats['distribution'])
        ]);
    }
    
    // =============================================
    // ADMIN ROUTES
    // =============================================
    
    // Get reviews for admin (for a specific futsal they manage)
    public function getFutsalReviewsForAdmin(Request $request, $futsalId)
    {
        $admin = Auth::user();
        
        // Check if admin has access to this futsal
        if ($admin->role === 'admin') {
            $futsal = Futsal::where('id', $futsalId)
                ->where('manager_id', $admin->id)
                ->first();
                
            if (!$futsal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to this futsal'
                ], 403);
            }
        }
        
        $perPage = $request->get('per_page', 10);
        $status = $request->get('status', 'all');
        
        $query = Review::with(['user', 'futsal'])
            ->where('futsal_id', $futsalId);
        
        if ($status === 'approved') {
            $query->where('is_approved', true);
        } elseif ($status === 'pending') {
            $query->where('is_approved', false);
        }
        
        $reviews = $query->orderBy('created_at', 'desc')->paginate($perPage);
        
        $stats = [
            'total_reviews' => Review::where('futsal_id', $futsalId)->count(),
            'approved_reviews' => Review::where('futsal_id', $futsalId)->where('is_approved', true)->count(),
            'pending_reviews' => Review::where('futsal_id', $futsalId)->where('is_approved', false)->count(),
            'average_rating' => Review::where('futsal_id', $futsalId)->where('is_approved', true)->avg('rating') ?? 0,
        ];
        
        return response()->json([
            'success' => true,
            'data' => $reviews,
            'stats' => $stats
        ]);
    }
    
    // Get all reviews for super admin
    public function getAllReviewsForSuperAdmin(Request $request)
    {
        $perPage = $request->get('per_page', 10);
        $status = $request->get('status', 'all');
        $futsalId = $request->get('futsal_id');
        
        $query = Review::with(['user', 'futsal']);
        
        if ($status === 'approved') {
            $query->where('is_approved', true);
        } elseif ($status === 'pending') {
            $query->where('is_approved', false);
        }
        
        if ($futsalId) {
            $query->where('futsal_id', $futsalId);
        }
        
        $reviews = $query->orderBy('created_at', 'desc')->paginate($perPage);
        
        $statsQuery = Review::query();
        if ($futsalId) {
            $statsQuery->where('futsal_id', $futsalId);
        }
        
        $stats = [
            'total_reviews' => (clone $statsQuery)->count(),
            'approved_reviews' => (clone $statsQuery)->where('is_approved', true)->count(),
            'pending_reviews' => (clone $statsQuery)->where('is_approved', false)->count(),
            'average_rating' => (clone $statsQuery)->where('is_approved', true)->avg('rating') ?? 0,
        ];
        
        return response()->json([
            'success' => true,
            'data' => $reviews,
            'stats' => $stats
        ]);
    }
    
    // Moderate review (approve/reject)
    public function moderateReview(Request $request, $reviewId)
    {
        $user = Auth::user();
        $review = Review::findOrFail($reviewId);
        
        // Check permission
        if ($user->role === 'admin') {
            $futsal = Futsal::findOrFail($review->futsal_id);
            if ($futsal->manager_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to moderate this review'
                ], 403);
            }
        } elseif ($user->role !== 'super-admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }
        
        $request->validate([
            'is_approved' => 'required|boolean'
        ]);
        
        $review->is_approved = $request->is_approved;
        $review->save();
        
        $this->updateFutsalRating($review->futsal_id);
        
        return response()->json([
            'success' => true,
            'message' => $request->is_approved ? 'Review approved successfully' : 'Review rejected successfully',
            'data' => $review
        ]);
    }
    
    // Delete review by admin
    public function deleteReviewByAdmin(Request $request, $reviewId)
    {
        $user = Auth::user();
        $review = Review::findOrFail($reviewId);
        
        // Check permission
        if ($user->role === 'admin') {
            $futsal = Futsal::findOrFail($review->futsal_id);
            if ($futsal->manager_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to delete this review'
                ], 403);
            }
        } elseif ($user->role !== 'super-admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }
        
        // Delete images
        if ($review->images && is_array($review->images)) {
            foreach ($review->images as $image) {
                $path = str_replace(asset('storage/'), '', $image);
                if (Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                }
            }
        }
        
        $futsalId = $review->futsal_id;
        $review->delete();
        $this->updateFutsalRating($futsalId);
        
        return response()->json([
            'success' => true,
            'message' => 'Review deleted successfully'
        ]);
    }
}