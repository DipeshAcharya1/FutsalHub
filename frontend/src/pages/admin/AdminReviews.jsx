import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

const AdminReviews = ({ futsalId, isSuperAdmin = false }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    average_rating: 0,
    total_reviews: 0,
    approved_reviews: 0,
    pending_reviews: 0
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [currentPage, statusFilter]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      let url;
      if (isSuperAdmin) {
        url = `/super-admin/reviews?page=${currentPage}&per_page=10&status=${statusFilter}`;
      } else {
        url = `/admin/futsals/${futsalId}/reviews?page=${currentPage}&per_page=10&status=${statusFilter}`;
      }
      
      const response = await api.get(url);
      if (response.data.success) {
        setReviews(response.data.data.data || []);
        setTotalPages(response.data.data.last_page || 1);
        setTotalItems(response.data.data.total || 0);
        
        // Safely set stats with fallback values
        const statsData = response.data.stats || {};
        setStats({
          average_rating: parseFloat(statsData.average_rating) || 0,
          total_reviews: parseInt(statsData.total_reviews) || 0,
          approved_reviews: parseInt(statsData.approved_reviews) || 0,
          pending_reviews: parseInt(statsData.pending_reviews) || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReview = async (reviewId) => {
    setActionLoading(true);
    try {
      const response = await api.patch(`/admin/reviews/${reviewId}/moderate`, {
        is_approved: true
      });
      if (response.data.success) {
        alert('Review approved successfully');
        fetchReviews();
      }
    } catch (error) {
      console.error('Failed to approve review:', error);
      alert(error.response?.data?.message || 'Failed to approve review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectReview = async (reviewId) => {
    setActionLoading(true);
    try {
      const response = await api.patch(`/admin/reviews/${reviewId}/moderate`, {
        is_approved: false
      });
      if (response.data.success) {
        alert('Review rejected successfully');
        fetchReviews();
      }
    } catch (error) {
      console.error('Failed to reject review:', error);
      alert(error.response?.data?.message || 'Failed to reject review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!selectedReview) return;
    
    setActionLoading(true);
    try {
      const response = await api.delete(`/admin/reviews/${selectedReview.id}`);
      if (response.data.success) {
        alert('Review deleted successfully');
        setShowDeleteModal(false);
        setSelectedReview(null);
        fetchReviews();
      }
    } catch (error) {
      console.error('Failed to delete review:', error);
      alert(error.response?.data?.message || 'Failed to delete review');
    } finally {
      setActionLoading(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const numRating = parseInt(rating) || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} style={{ color: i <= numRating ? '#f39c12' : '#ddd', fontSize: '16px' }}>
          ★
        </span>
      );
    }
    return <div style={{ display: 'flex', gap: '2px' }}>{stars}</div>;
  };

  const getStatusBadge = (isApproved) => {
    if (isApproved) {
      return <span style={{ background: '#27ae60', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>Approved</span>;
    }
    return <span style={{ background: '#f39c12', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>Pending</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  if (loading && reviews.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid #eef2f6', 
          borderTopColor: '#3498db', 
          borderRadius: '50%', 
          margin: '0 auto 16px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Loading reviews...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>Review Management</h2>
        <p style={{ color: '#7f8c8d', margin: 0 }}>Manage customer reviews and ratings for your futsal</p>
      </div>
      
      {/* Statistics Cards */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px', 
          marginBottom: '24px' 
        }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50' }}>
              {stats.average_rating.toFixed(1)}
            </div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Average Rating</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50' }}>
              {stats.total_reviews}
            </div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Total Reviews</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#27ae60' }}>
              {stats.approved_reviews}
            </div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Approved</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f39c12' }}>
              {stats.pending_reviews}
            </div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Pending</div>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
          style={{ 
            padding: '8px 20px', 
            background: statusFilter === 'all' ? '#3498db' : '#f8f9fa', 
            color: statusFilter === 'all' ? 'white' : '#2c3e50', 
            border: statusFilter === 'all' ? 'none' : '1px solid #e0e0e0',
            borderRadius: '8px', 
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          All Reviews
        </button>
        <button 
          onClick={() => { setStatusFilter('approved'); setCurrentPage(1); }}
          style={{ 
            padding: '8px 20px', 
            background: statusFilter === 'approved' ? '#27ae60' : '#f8f9fa', 
            color: statusFilter === 'approved' ? 'white' : '#2c3e50', 
            border: statusFilter === 'approved' ? 'none' : '1px solid #e0e0e0',
            borderRadius: '8px', 
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Approved
        </button>
        <button 
          onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
          style={{ 
            padding: '8px 20px', 
            background: statusFilter === 'pending' ? '#f39c12' : '#f8f9fa', 
            color: statusFilter === 'pending' ? 'white' : '#2c3e50', 
            border: statusFilter === 'pending' ? 'none' : '1px solid #e0e0e0',
            borderRadius: '8px', 
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Pending
        </button>
      </div>

      {/* Reviews Table */}
      <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eef2f6' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Customer</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Rating</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Review</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Date</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Status</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <tr key={review.id} style={{ borderBottom: '1px solid #eef2f6' }}>
                    <td style={{ padding: '16px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>{review.user?.name || 'N/A'}</div>
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{review.user?.email || 'N/A'}</div>
                    </td>
                    <td style={{ padding: '16px', verticalAlign: 'top' }}>{renderStars(review.rating)}</td>
                    <td style={{ padding: '16px', verticalAlign: 'top' }}>
                      {review.title && <div style={{ fontWeight: '600', marginBottom: '8px' }}>{review.title}</div>}
                      {review.comment && (
                        <div style={{ color: '#555', fontSize: '14px', marginBottom: '8px' }}>
                          {review.comment.length > 100 ? review.comment.substring(0, 100) + '...' : review.comment}
                        </div>
                      )}
                      {review.is_verified_purchase && (
                        <div style={{ fontSize: '11px', color: '#27ae60', marginTop: '8px' }}>✓ Verified Purchase</div>
                      )}
                      {review.images && review.images.length > 0 && (
                        <div style={{ fontSize: '11px', color: '#7f8c8d', marginTop: '4px' }}>{review.images.length} photo(s)</div>
                      )}
                    </td>
                    <td style={{ padding: '16px', verticalAlign: 'top', fontSize: '13px', color: '#7f8c8d' }}>
                      {formatDate(review.created_at)}
                    </td>
                    <td style={{ padding: '16px', verticalAlign: 'top' }}>{getStatusBadge(review.is_approved)}</td>
                    <td style={{ padding: '16px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {!review.is_approved && (
                          <button 
                            onClick={() => handleApproveReview(review.id)} 
                            disabled={actionLoading}
                            style={{ 
                              background: '#27ae60', 
                              color: 'white', 
                              border: 'none', 
                              padding: '6px 12px', 
                              borderRadius: '6px', 
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Approve
                          </button>
                        )}
                        {review.is_approved && (
                          <button 
                            onClick={() => handleRejectReview(review.id)} 
                            disabled={actionLoading}
                            style={{ 
                              background: '#f39c12', 
                              color: 'white', 
                              border: 'none', 
                              padding: '6px 12px', 
                              borderRadius: '6px', 
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Reject
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setSelectedReview(review);
                            setShowDeleteModal(true);
                          }}
                          disabled={actionLoading}
                          style={{ 
                            background: '#e74c3c', 
                            color: 'white', 
                            border: 'none', 
                            padding: '6px 12px', 
                            borderRadius: '6px', 
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#7f8c8d' }}>
                    No reviews found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '24px', padding: '16px' }}>
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
            disabled={currentPage === 1}
            style={{ 
              padding: '8px 16px', 
              border: '1px solid #e0e0e0', 
              borderRadius: '6px', 
              background: 'white', 
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 1 ? 0.5 : 1
            }}
          >
            Previous
          </button>
          <span style={{ padding: '8px 16px', color: '#2c3e50' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
            disabled={currentPage === totalPages}
            style={{ 
              padding: '8px 16px', 
              border: '1px solid #e0e0e0', 
              borderRadius: '6px', 
              background: 'white', 
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage === totalPages ? 0.5 : 1
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedReview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowDeleteModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '16px 20px',
              background: '#e74c3c',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0 }}>Delete Review</h3>
              <button 
                onClick={() => setShowDeleteModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'white' }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <p>Are you sure you want to delete this review?</p>
              <p><strong>Customer:</strong> {selectedReview.user?.name}</p>
              <p><strong>Rating:</strong> {selectedReview.rating} stars</p>
              {selectedReview.title && <p><strong>Title:</strong> {selectedReview.title}</p>}
              <p style={{ color: '#e74c3c', fontWeight: '600', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #eef2f6' }}>
                This action cannot be undone.
              </p>
            </div>
            <div style={{
              padding: '16px 20px',
              background: '#f8f9fa',
              borderTop: '1px solid #eef2f6',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button 
                onClick={() => setShowDeleteModal(false)}
                style={{ padding: '8px 20px', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteReview}
                disabled={actionLoading}
                style={{ padding: '8px 20px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                {actionLoading ? 'Deleting...' : 'Delete Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;