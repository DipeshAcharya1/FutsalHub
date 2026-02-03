import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../styles/Home.css";

const Home = () => {
    const navigate = useNavigate();

    const handleGetStarted = () => {
        navigate("/login"); // go to login page
    };
     const handleViewAllCourts = () => {
      navigate("/futsals"); // go to futsals page
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
              <button className="hero-btn-secondary" onClick={handleViewAllCourts}>View All Futsals</button>
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-illustration" />
          </div>
        </section>

        {/* Popular Courts */}
        <section>
          <div className="section-title-row">
            <h2 className="section-title">Popular Futsals</h2>
            <button className="section-link" onClick={handleViewAllCourts}>View All Futsals &gt;</button>
          </div>

          <div className="courts-grid">
            <div className="court-card">
              <div className="court-image-placeholder" />
              <div className="court-body">
                <div className="court-name">City Sports Arena</div>
                <div className="court-location">Kathmandu, Nepal</div>
                <button className="court-btn">Book Now</button>
              </div>
            </div>

            <div className="court-card">
              <div className="court-image-placeholder" />
              <div className="court-body">
                <div className="court-name">Greenfield Futsal</div>
                <div className="court-location">Kathmandu, Nepal</div>
                <button className="court-btn">Book Now</button>
              </div>
            </div>

            <div className="court-card">
              <div className="court-image-placeholder" />
              <div className="court-body">
                <div className="court-name">Summit Futsal Center</div>
                <div className="court-location">Kathmandu, Nepal</div>
                <button className="court-btn">Book Now</button>
              </div>
            </div>
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
              <h4>Play &amp; Enjoy</h4>
              <p>Show up, play, and enjoy your game with friends.</p>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="why-section">
          <h2 className="why-title">Why Choose Us?</h2>
          <div className="why-grid">
            <div className="why-card">
              <h4>Convenient Booking</h4>
              <p>Quick and easy online reservations anytime.</p>
            </div>
            <div className="why-card">
              <h4>Best Facilities</h4>
              <p>Top-rated futsals in your area.</p>
            </div>
            <div className="why-card">
              <h4>Customer Support</h4>
              <p>We’re here to help with any queries.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
