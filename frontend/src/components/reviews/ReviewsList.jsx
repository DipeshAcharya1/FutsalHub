import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import ReviewCard from './ReviewCard';
import RatingSummary from './RatingSummary';
import './Reviews.css';

const ReviewsList = ({ futsalId, currentUserId, onReviewChanged }) => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('latest');
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [futsalId, currentPage, sortBy]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/futsals/${futsalId}/reviews`, {
        params: { page: currentPage, per_page: 10, sort: sortBy }
      });
      
      if (response.data.success) {
        setReviews(response.data.data.data);
        setStats(response.data.stats);
        setTotalPages(response.data.data.last_page);
        setTotalItems(response.data.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewChanged = () => {
    fetchReviews();
    onReviewChanged && onReviewChanged();
  };

  const getSortLabel = () => {
    switch(sortBy) {
      case 'latest': return 'Latest First';
      case 'highest': return 'Highest Rating';
      case 'lowest': return 'Lowest Rating';
      default: return 'Latest First';
    }
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="reviews-section">
        <div className="loading-reviews">
          <div className="loading-spinner"></div>
          <p>Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reviews-section">
      <div className="reviews-header">
        <h3>Customer Reviews</h3>
        <div className="reviews-sort">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="latest">Latest First</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
          </select>
        </div>
      </div>

      <RatingSummary stats={stats} />

      {totalItems > 0 && (
        <div className="reviews-count">
          Showing {reviews.length} of {totalItems} reviews
        </div>
      )}

      <div className="reviews-list">
        {reviews.map(review => (
          <ReviewCard
            key={review.id}
            review={review}
            currentUserId={currentUserId}
            onReviewDeleted={handleReviewChanged}
            onReviewUpdated={handleReviewChanged}
          />
        ))}
        
        {reviews.length === 0 && !loading && (
          <div className="no-reviews">
            <div className="no-reviews-icon"></div>
            <p>No reviews yet. Be the first to share your experience!</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                if (totalPages <= 5) return true;
                if (page === 1 || page === totalPages) return true;
                if (Math.abs(page - currentPage) <= 1) return true;
                return false;
              })
              .map((page, index, array) => {
                if (index > 0 && page - array[index - 1] > 1) {
                  return (
                    <React.Fragment key={`ellipsis-${page}`}>
                      <span className="page-ellipsis">...</span>
                      <button
                        className={`page-number ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                }
                return (
                  <button
                    key={page}
                    className={`page-number ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                );
              })}
          </div>
          <button
            className="page-btn"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewsList;