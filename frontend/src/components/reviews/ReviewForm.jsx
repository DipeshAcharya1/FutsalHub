import React, { useState } from 'react';
import RatingStars from './RatingStars';
import api from '../../api/axios';

const ReviewForm = ({ futsalId, futsalName, onReviewSubmitted, onClose }) => {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      alert('You can upload maximum 5 images');
      return;
    }
    
    setImages([...images, ...files]);
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const removeImage = (index) => {
    const newImages = [...images];
    const newPreviews = [...imagePreviews];
    URL.revokeObjectURL(newPreviews[index]);
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!rating) {
      alert('Please select a rating');
      return;
    }
    
    setSubmitting(true);
    
    const formData = new FormData();
    formData.append('futsal_id', futsalId);
    formData.append('rating', rating);
    if (title) formData.append('title', title);
    if (comment) formData.append('comment', comment);
    
    images.forEach((image, index) => {
      formData.append(`images[${index}]`, image);
    });
    
    try {
      const response = await api.post('/reviews', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        alert('Review submitted successfully!');
        onReviewSubmitted && onReviewSubmitted();
        onClose();
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="review-modal-header">
          <h3>Write a Review for {futsalName}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="rating-section">
            <label>Your Rating </label>
            <RatingStars 
              rating={rating} 
              interactive={true} 
              onRatingChange={setRating}
              size="large"
            />
          </div>
          
          <div className="form-group">
            <label>Review Title </label>
            <input
              type="text"
              className="form-input"
              placeholder="Summarize your experience"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>
          
          <div className="form-group">
            <label>Your Review</label>
            <textarea
              className="form-input"
              rows="4"
              placeholder="Share your experience at this futsal..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
            />
            <div className="char-count">{comment.length}/1000</div>
          </div>
          
          <div className="form-group">
            <label>Upload Photos (Optional, up to 5)</label>
            <input
              type="file"
              className="form-input"
              accept="image/*"
              multiple
              onChange={handleImageChange}
            />
            {imagePreviews.length > 0 && (
              <div className="image-previews">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="image-preview-item">
                    <img src={preview} alt={`Preview ${index + 1}`} />
                    <button type="button" className="remove-image" onClick={() => removeImage(index)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewForm;