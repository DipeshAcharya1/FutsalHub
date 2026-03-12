import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api from "../api/axios";
import "../styles/Home.css";

const Home = () => {
  const navigate = useNavigate();
  const [popularFutsals, setPopularFutsals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    fetchPopularFutsals();
  }, []);

  const fetchPopularFutsals = async () => {
    try {
      const response = await api.get('/popular-futsals');
      if (response.data.success) {
        setPopularFutsals(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch popular futsals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetStarted = () => {
    navigate("/login");
  };

  const handleViewAllCourts = () => {
    navigate("/futsals");
  };

  const handleViewDetails = (futsalId) => {
    navigate(`/futsal/${futsalId}`);
  };

  const handleImageError = (futsalId) => {
    setImageErrors(prev => ({ ...prev, [futsalId]: true }));
  };

  return (
    <div className="home">
      <Header />

      <main className="home-main">
        {/* Hero */}
        <section className="hero-section">
          <div className="hero-left">
            <h1 className="hero-title">
              Discover and Book Your <span>Futsal</span> Instantly
            </h1>
            <p className="hero-text">
              Find available futsals, select your desired time slot, and
              secure your booking in just a few clicks.
            </p>
            <div className="hero-actions">
              <button
                className="hero-btn-primary"
                onClick={handleGetStarted}
              >
                Get Started
              </button>
              <button className="hero-btn-secondary" onClick={handleViewAllCourts}>
                View All Futsals
              </button>
            </div>
          </div>

          <div className="hero-right">
            <div 
              className="hero-illustration"
              style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1529900748604-07564a03e7a6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80")',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          </div>
        </section>

        {/* Popular Courts - Only 3 */}
        <section>
          <div className="section-title-row">
            <h2 className="section-title">Popular Futsals</h2>
            <button className="section-link" onClick={handleViewAllCourts}>
              View All Futsals 
            </button>
          </div>

          <div className="courts-grid">
            {loading ? (
              // Loading skeletons - only 3
              [1, 2, 3].map((n) => (
                <div key={n} className="court-card skeleton">
                  <div className="court-image-placeholder skeleton-image" />
                  <div className="court-body">
                    <div className="skeleton-line"></div>
                    <div className="skeleton-line short"></div>
                  </div>
                </div>
              ))
            ) : popularFutsals.length > 0 ? (
              popularFutsals.slice(0, 3).map((futsal) => (
                <div key={futsal.id} className="court-card">
                  <div className="court-image-container">
                    {futsal.image && !imageErrors[futsal.id] ? (
                      <img 
                        src={futsal.image} 
                        alt={futsal.name}
                        className="court-image"
                        onError={() => handleImageError(futsal.id)}
                      />
                    ) : (
                      <div className="court-image-placeholder">
                        <span>No Image</span>
                      </div>
                    )}
                  </div>
                  <div className="court-body">
                    <div className="court-name">{futsal.name}</div>
                    <div className="court-location">{futsal.location}</div>
                    <button 
                      className="court-btn view-details-btn"
                      onClick={() => handleViewDetails(futsal.id)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">
                <p>No popular futsals available at the moment.</p>
              </div>
            )}
          </div>
        </section>

        {/* How It Works */}
        <section className="how-section">
          <h2 className="how-title">How It Works</h2>
          <div className="how-steps">
            <div className="how-card">
              <h4>Search Futsals</h4>
              <p>Browse nearby futsals and compare options.</p>
            </div>
            <div className="how-card">
              <h4>Easy Booking</h4>
              <p>Pick a time slot and confirm your booking in seconds.</p>
            </div>
            <div className="how-card">
              <h4>Play & Enjoy</h4>
              <p>Show up, play, and enjoy your game with friends.</p>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="why-section">
          <h2 className="how-title">Why Choose Us?</h2>
          <div className="why-grid">
            <div className="why-card">
              <h4>Convenient Booking</h4>
              <p>Quick and easy online reservations anytime.</p>
            </div>
            <div className="why-card">
              <h4>Best Facilities</h4>
              <p>Top-rated futsals in your area.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;