import React from "react";

const FutsalHeader = ({ futsal, imageError, setImageError }) => {
  return (
    <div className="futsal-header">
      <div className="futsal-image-container">
        {futsal.image && !imageError ? (
          <img 
            src={futsal.image} 
            alt={futsal.name}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="no-image">No Image Available</div>
        )}
      </div>
      <div className="futsal-info">
        <h1>{futsal.name}</h1>
        <p className="location">
          <span className="icon"></span> {futsal.location}
        </p>
        <p className="contact">
          <span className="icon"></span> {futsal.contact || "Contact not available"}
        </p>
        <p className="description">{futsal.description}</p>
      </div>
    </div>
  );
};

export default FutsalHeader;