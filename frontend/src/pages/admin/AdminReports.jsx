import React from "react";

const AdminReports = ({ 
  reportData, reportPeriod, setReportPeriod, reportDate, setReportDate, onGenerateReport, loading 
}) => {
  return (
    <div>
      <h2 className="page-title">Reports</h2>
      <p className="page-sub" style={{ marginBottom: 16 }}>
        Generate booking and revenue reports by period.
      </p>

      <div className="card report-card">
        <div className="form-field">
          <label className="form-label">Period</label>
          <select
            className="form-input"
            value={reportPeriod}
            onChange={e => setReportPeriod(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Date</label>
          <input
            className="form-input"
            type="date"
            value={reportDate}
            onChange={e => setReportDate(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={onGenerateReport} disabled={loading}>
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {reportData && (
        <div style={{ marginTop: 24 }}>
          <div className="stats-row" style={{ marginBottom: 20 }}>
            <div className="stat-box">
              <div className="stat-label">Total Bookings</div>
              <div className="stat-num">{reportData.total_bookings || 0}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Confirmed</div>
              <div className="stat-num">{reportData.confirmed || 0}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Pending</div>
              <div className="stat-num">{reportData.pending || 0}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Cancelled</div>
              <div className="stat-num">{reportData.cancelled || 0}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Revenue</div>
              <div className="stat-num">Rs. {(reportData.revenue || 0).toLocaleString()}</div>
            </div>
          </div>

          {reportData.bookings?.length > 0 && (
            <div className="card">
              <div className="card-head"><h3>Recent Bookings</h3></div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Booking Date</th>
                    <th>Slot Time</th>
                    <th>Status</th>
                    <th>Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.bookings.map(b => (
                    <tr key={b.id}>
                      <td>{b.user_name || "N/A"}</td>
                      <td>{b.booking_date || "N/A"}</td>
                      <td>{b.slot_time || "N/A"}</td>
                      <td>
                        <span className={"status-badge status-" + (b.status || "unknown")}>
                          {b.status || "N/A"}
                        </span>
                      </td>
                      <td>
                        <span className={"status-badge status-" + (b.payment_status || "unknown")}>
                          {b.payment_status || "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!reportData && !loading && (
        <div className="empty-state">
          <p>Select a period and date, then click Generate Report.</p>
        </div>
      )}
    </div>
  );
};

export default AdminReports;