import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api from "../api/axios";
import "../styles/Futsals.css";

const Futsals = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [allFutsals, setAllFutsals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    perPage: 10,
    totalItems: 0
  });
  const [filters, setFilters] = useState({
    sort: "name",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [imageErrors, setImageErrors] = useState({});

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch futsals when debouncedSearch changes
  useEffect(() => {
    fetchFutsals();
  }, [debouncedSearch]);

  // Apply sorting and pagination when filters or allFutsals change
  useEffect(() => {
    if (allFutsals.length > 0) {
      applySortingAndPagination();
    }
  }, [filters.sort, allFutsals, currentPage]);

  const fetchFutsals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        page: 1,
        per_page: 100, // Fetch all to sort on frontend
      });

      const response = await api.get(`/futsals?${params}`);
      if (response.data.success) {
        let fetchedFutsals = response.data.data.data;
        setAllFutsals(fetchedFutsals);
        setPagination({
          current: 1,
          total: Math.ceil(fetchedFutsals.length / pagination.perPage),
          perPage: pagination.perPage,
          totalItems: fetchedFutsals.length,
        });
        setImageErrors({});
      }
    } catch (error) {
      console.error("Failed to fetch futsals:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract numeric price
  const extractNumericPrice = (priceFrom) => {
    if (!priceFrom) return Infinity;
    const match = String(priceFrom).match(/\d+/g);
    if (match) {
      return parseInt(match.join(''));
    }
    return Infinity;
  };

  // Sort futsals by selected criteria
  const sortFutsals = (futsalsList, sortType) => {
    const sorted = [...futsalsList];
    switch(sortType) {
      case 'name':
        return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'popular':
        return sorted.sort((a, b) => (b.available_slots || 0) - (a.available_slots || 0));
      case 'price_low':
        return sorted.sort((a, b) => extractNumericPrice(a.price_from) - extractNumericPrice(b.price_from));
      case 'price_high':
        return sorted.sort((a, b) => extractNumericPrice(b.price_from) - extractNumericPrice(a.price_from));
      default:
        return sorted;
    }
  };

  const applySortingAndPagination = () => {
    // Apply sorting
    const sorted = sortFutsals(allFutsals, filters.sort);
    
    // Apply pagination
    const startIndex = (currentPage - 1) * pagination.perPage;
    const endIndex = startIndex + pagination.perPage;
    const paginated = sorted.slice(startIndex, endIndex);
    
    setFutsals(paginated);
  };

  const [futsals, setFutsals] = useState([]);

  const handleViewDetails = (futsalId) => {
    navigate(`/futsal/${futsalId}`);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handleSortChange = (e) => {
    const newSort = e.target.value;
    setFilters(prev => ({ ...prev, sort: newSort }));
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setFilters({ sort: "name" });
    setCurrentPage(1);
    setImageErrors({});
    fetchFutsals();
  };

  const clearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
    setCurrentPage(1);
    setImageErrors({});
  };

  const handleImageError = (futsalId) => {
    setImageErrors(prev => ({ ...prev, [futsalId]: true }));
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (pagination.total <= maxVisiblePages) {
      for (let i = 1; i <= pagination.total; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pageNumbers.push(i);
        pageNumbers.push('...');
        pageNumbers.push(pagination.total);
      } else if (currentPage >= pagination.total - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = pagination.total - 3; i <= pagination.total; i++) pageNumbers.push(i);
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pageNumbers.push(i);
        pageNumbers.push('...');
        pageNumbers.push(pagination.total);
      }
    }
    return pageNumbers;
  };

  return (
    <div className="futsals-page">
      <Header />

      <main className="futsals-main">
        <section className="futsals-head">
          <h1>Find Futsals</h1>
          <p>Search futsals and explore available options in your area.</p>
        </section>

        <section className="futsals-search-section">
          <div className="futsals-search-row">
            <input
              type="text"
              className="futsals-search-input"
              placeholder="Search futsals by name, location, or description..."
              value={search}
              onChange={handleSearchChange}
            />
            {search && (
              <button 
                className="clear-search-btn"
                onClick={clearSearch}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="futsals-filters">
            <select 
              className="filter-select"
              value={filters.sort}
              onChange={handleSortChange}
            >
              <option value="name">Sort by: Name</option>
              <option value="popular">Sort by: Popularity</option>
              <option value="price_low">Sort by: Price: Low to High</option>
              <option value="price_high">Sort by: Price: High to Low</option>
            </select>

            {(search || filters.sort !== 'name') && (
              <button className="clear-filters-btn" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        </section>

        {!loading && (
          <p className="results-count">
            {futsals.length > 0 
              ? `Showing ${futsals.length} of ${pagination.totalItems || 0} futsals`
              : 'No futsals found'
            }
          </p>
        )}

        <section className="futsals-list-section">
          <h2 className="futsals-section-title">Available Futsals</h2>

          {loading ? (
            <div className="futsals-list">
              {[1, 2, 3].map((n) => (
                <div key={n} className="futsal-card skeleton">
                  <div className="futsal-image-container skeleton-image" />
                  <div className="futsal-content">
                    <div className="skeleton-title"></div>
                    <div className="skeleton-line"></div>
                    <div className="skeleton-line short"></div>
                  </div>
                  <div className="futsal-side">
                    <div className="skeleton-button"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="futsals-list">
              {futsals.length > 0 ? (
                futsals.map((futsal) => (
                  <div key={futsal.id} className="futsal-card">
                    <div className="futsal-image-container">
                      {futsal.image && !imageErrors[futsal.id] ? (
                        <img 
                          src={futsal.image} 
                          alt={futsal.name}
                          className="futsal-image"
                          onError={() => handleImageError(futsal.id)}
                        />
                      ) : (
                        <div className="no-image">No Image</div>
                      )}
                    </div>
                    <div className="futsal-content">
                      <h3 className="futsal-name">{futsal.name}</h3>
                      <p className="futsal-location">
                        {futsal.location}
                      </p>
                      <p className="futsal-description">{futsal.description}</p>
                      <div className="futsal-meta">
                        <span className="futsal-slots">
                          {futsal.available_slots} slots 
                        </span>
                        <span className="futsal-price">
                          {futsal.price_from}
                        </span>
                      </div>
                    </div>
                    <div className="futsal-side">
                      <button 
                        className="futsal-button"
                        onClick={() => handleViewDetails(futsal.id)}
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-results">
                  <p>No futsals found matching your search.</p>
                  <button className="clear-filters-btn" onClick={clearFilters}>
                    Clear Search
                  </button>
                </div>
              )}
            </div>
          )}

          {pagination.total > 1 && (
            <div className="pagination">
              <button 
                className="page-btn prev-btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>
              
              <div className="page-numbers">
                {getPageNumbers().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="page-ellipsis">...</span>
                  ) : (
                    <button
                      key={page}
                      className={`page-number ${currentPage === page ? 'active' : ''}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>
              
              <button 
                className="page-btn next-btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.total}
              >
                Next →
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Futsals;