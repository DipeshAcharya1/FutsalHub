import React from 'react';

const RatingStars = ({ rating, size = 'medium', interactive = false, onRatingChange, showNumber = false }) => {
  const [hoverRating, setHoverRating] = React.useState(0);
  
  const getStarSize = () => {
    switch(size) {
      case 'small': return '16px';
      case 'large': return '28px';
      default: return '20px';
    }
  };

  const handleClick = (value) => {
    if (interactive && onRatingChange) {
      onRatingChange(value);
    }
  };

  const starSize = getStarSize();
  
  return (
    <div className="rating-stars" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-btn ${star <= (hoverRating || rating) ? 'active' : ''}`}
            onClick={() => handleClick(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: starSize,
              cursor: interactive ? 'pointer' : 'default',
              color: star <= (hoverRating || rating) ? '#f39c12' : '#ddd',
              transition: 'color 0.2s ease',
              padding: 0
            }}
          >
            ★
          </button>
        ))}
      </div>
      {showNumber && (
        <span style={{ marginLeft: '8px', fontSize: '14px', color: '#666' }}>
          {rating?.toFixed(1) || '0.0'}
        </span>
      )}
    </div>
  );
};

export default RatingStars;