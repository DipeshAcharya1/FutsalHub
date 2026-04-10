
import React from 'react';
import RatingStars from './RatingStars';

const RatingSummary = ({ stats }) => {
  if (!stats || stats.total === 0) {
    return (
      <div className="rating-summary empty">
        <div className="average-rating">
          <div className="average-number">0.0</div>
          <RatingStars rating={0} size="medium" />
          <div className="total-reviews">No reviews yet</div>
        </div>
        <div className="rating-bars">
          <div className="no-reviews-message">Be the first to review!</div>
        </div>
      </div>
    );
  }

  const renderRatingBar = (rating, count, percentage) => {
    return (
      <div className="rating-bar-item" key={rating}>
        <span className="rating-star">{rating} ★</span>
        <div className="rating-bar-bg">
          <div className="rating-bar-fill" style={{ width: `${percentage}%` }}></div>
        </div>
        <span className="rating-count">{count}</span>
      </div>
    );
  };

  return (
    <div className="rating-summary">
      <div className="average-rating">
        <div className="average-number">{stats.average?.toFixed(1) || '0.0'}</div>
        <RatingStars rating={Math.round(stats.average || 0)} size="medium" />
        <div className="total-reviews">Based on {stats.total} reviews</div>
      </div>
      <div className="rating-bars">
        {[5, 4, 3, 2, 1].map(rating => (
          renderRatingBar(rating, stats.distribution?.[rating] || 0, stats.percentages?.[rating] || 0)
        ))}
      </div>
    </div>
  );
};

export default RatingSummary;