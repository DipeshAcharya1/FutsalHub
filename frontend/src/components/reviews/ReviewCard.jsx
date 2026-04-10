import React, { useState } from 'react';
import RatingStars from './RatingStars';
import api from '../../api/axios';

const ReviewCard = ({ review, currentUserId, onReviewDeleted, onReviewUpdated }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState(review.rating);
  const [editTitle, setEditTitle] = useState(review.title || '');
  const [editComment, setEditComment] = useState(review.comment || '');
  const [submitting, setSubmitting] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      
      // Check if date is valid
      if (isNaN(date.getTime())) return 'N/A';
      
      // Reset time part for day comparison
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const reviewDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      const diffTime = today - reviewDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'N/A';
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    
    try {
      const response = await api.delete(`/reviews/${review.id}`);
      if (response.data.success) {
        alert('Review deleted successfully');
        onReviewDeleted && onReviewDeleted();
      }
    } catch (error) {
      console.error('Failed to delete review:', error);
      alert(error.response?.data?.message || 'Failed to delete review');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const response = await api.put(`/reviews/${review.id}`, {
        rating: editRating,
        title: editTitle,
        comment: editComment
      });
      
      if (response.data.success) {
        alert('Review updated successfully');
        setIsEditing(false);
        onReviewUpdated && onReviewUpdated();
      }
    } catch (error) {
      console.error('Failed to update review:', error);
      alert(error.response?.data?.message || 'Failed to update review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditRating(review.rating);
    setEditTitle(review.title || '');
    setEditComment(review.comment || '');
  };

  if (isEditing) {
    return (
      <div className="review-card editing">
        <form onSubmit={handleUpdate} className="review-edit-form">
          <div className="edit-rating-field">
            <label>Rating:</label>
            <RatingStars 
              rating={editRating} 
              interactive={true} 
              onRatingChange={setEditRating}
              size="large"
            />
          </div>
          
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              placeholder="Review title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={100}
            />
          </div>
          
          <div className="form-group">
            <textarea
              className="form-input"
              rows="3"
              placeholder="Share your experience..."
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              maxLength={1000}
            />
          </div>
          
          <div className="edit-actions">
            <button type="submit" className="btn-save" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="btn-cancel" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="review-card">
      <div className="review-header">
        <div className="reviewer-info">
          <div className="reviewer-name">{review.user?.name || 'Anonymous User'}</div>
          <div className="review-date">{formatDate(review.created_at)}</div>
        </div>
        <div className="review-rating">
          <RatingStars rating={review.rating} size="small" />
        </div>
      </div>
      
      {review.title && <h4 className="review-title">{review.title}</h4>}
      
      <p className="review-comment">{review.comment}</p>
      
      {review.images && review.images.length > 0 && (
        <div className="review-images">
          {review.images.map((img, idx) => (
            <img 
              key={idx} 
              src={img} 
              alt={`Review ${idx + 1}`} 
              className="review-image"
              onClick={() => window.open(img, '_blank')}
            />
          ))}
        </div>
      )}
      
      <div className="review-footer">
        {review.is_verified_purchase && (
          <span className="verified-badge">✓ Verified Purchase</span>
        )}
        
        {currentUserId === review.user_id && (
          <div className="review-actions">
            <button className="edit-review" onClick={() => setIsEditing(true)}>
              Edit
            </button>
            <button className="delete-review" onClick={handleDelete}>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewCard;