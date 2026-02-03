import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../styles/Futsals.css";

const Futsals = () => {
  const [search, setSearch] = useState("");

  return (
    <div className="futsals-page">
      <Header />

      <main className="futsals-main">
        {/* Title + description */}
        <section className="futsals-head">
          <h1>Find Futsals</h1>
          <p>Search futsals and explore available options in your area.</p>
        </section>

        {/* Search bar */}
        <section className="futsals-search-row">
          <input
            type="text"
            className="futsals-search-input"
            placeholder="Search futsals by name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </section>

        {/* Simple list of futsal cards (layout only) */}
        <section className="futsals-list-section">
          <h2 className="futsals-section-title">Futsals</h2>

          <div className="futsals-list">
            <div className="futsal-card">
              <div className="futsal-image" />
              <div className="futsal-content">
                <div className="futsal-title-placeholder" />
                <div className="futsal-line" />
                <div className="futsal-line short" />
              </div>
              <div className="futsal-side">
                <button className="futsal-button">View Details</button>
              </div>
            </div>

            <div className="futsal-card">
              <div className="futsal-image" />
              <div className="futsal-content">
                <div className="futsal-title-placeholder" />
                <div className="futsal-line" />
                <div className="futsal-line short" />
              </div>
              <div className="futsal-side">
                <button className="futsal-button">View Details</button>
              </div>
            </div>

            <div className="futsal-card">
              <div className="futsal-image" />
              <div className="futsal-content">
                <div className="futsal-title-placeholder" />
                <div className="futsal-line" />
                <div className="futsal-line short" />
              </div>
              <div className="futsal-side">
                <button className="futsal-button">View Details</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Futsals;
