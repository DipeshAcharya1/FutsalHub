import React, { useState } from "react";

const AdminReports = ({ 
  reportData, reportPeriod, setReportPeriod, reportDate, setReportDate, onGenerateReport, loading,
  onDownloadPDF 
}) => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const handlePeriodChange = (e) => {
    const period = e.target.value;
    setReportPeriod(period);
    
    if (period === 'daily') {
      setReportDate(new Date().toISOString().slice(0, 10));
    } else if (period === 'weekly') {
      setReportDate(new Date().toISOString().slice(0, 10));
    } else if (period === 'monthly') {
      setReportDate(`${year}-${month.toString().padStart(2, '0')}-01`);
    }
  };

  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setMonth(newMonth);
    setReportDate(`${year}-${newMonth.toString().padStart(2, '0')}-01`);
  };

  const handleYearChange = (e) => {
    const newYear = e.target.value;
    setYear(newYear);
    setReportDate(`${newYear}-${month.toString().padStart(2, '0')}-01`);
  };

  const handleGenerateReport = () => {
    onGenerateReport(reportDate);
  };

  const handleDownloadPDF = () => {
    if (reportData) {
      onDownloadPDF(reportPeriod, reportDate);
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 2; i <= currentYear + 1; i++) {
    years.push(i);
  }

  const formatDisplayDate = () => {
    if (!reportDate) return '';
    
    if (reportPeriod === 'monthly') {
      const [y, m] = reportDate.split('-');
      return `${months[parseInt(m) - 1]} ${y}`;
    } else if (reportPeriod === 'weekly') {
      const endDate = new Date(reportDate);
      const startDate = new Date(reportDate);
      startDate.setDate(startDate.getDate() - 6);
      return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    } else {
      return new Date(reportDate).toLocaleDateString();
    }
  };

  // Safe check for reportData - FIX THE ERROR HERE
  const getStatusBadge = (status, refundStatus) => {
    if (status === 'cancelled') {
      if (refundStatus === 'pending') {
        return <span className="status-badge status-cancelled-refund-pending">Cancelled (Refunding)</span>;
      } else if (refundStatus === 'completed') {
        return <span className="status-badge status-cancelled-refunded">Cancelled (Refunded)</span>;
      } else if (refundStatus === 'failed') {
        return <span className="status-badge status-cancelled-refund-failed">Cancelled (Refund Failed)</span>;
      }
      return <span className="status-badge status-cancelled">Cancelled</span>;
    }
    return <span className="status-badge status-confirmed">Confirmed</span>;
  };

  return (
    <div>
      <h2 className="page-title">Reports</h2>
      <p className="page-sub">Generate booking and revenue reports including refund data.</p>

      <div className="card report-card">
        <div className="form-field">
          <label className="form-label">Period</label>
          <select
            className="form-input"
            value={reportPeriod}
            onChange={handlePeriodChange}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {reportPeriod === 'daily' && (
          <div className="form-field">
            <label className="form-label">Select Date</label>
            <input
              className="form-input"
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </div>
        )}

        {reportPeriod === 'weekly' && (
          <div className="form-field">
            <label className="form-label">Select End Date</label>
            <input
              className="form-input"
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
            <small className="form-help">Shows data for the 7 days ending on this date</small>
          </div>
        )}

        {reportPeriod === 'monthly' && (
          <div className="form-row">
            <div className="form-field" style={{ flex: 1, marginRight: '10px' }}>
              <label className="form-label">Month</label>
              <select
                className="form-input"
                value={month}
                onChange={handleMonthChange}
              >
                {months.map((monthName, index) => (
                  <option key={index + 1} value={index + 1}>
                    {monthName}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field" style={{ flex: 1 }}>
              <label className="form-label">Year</label>
              <select
                className="form-input"
                value={year}
                onChange={handleYearChange}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleGenerateReport} 
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>
          
          {reportData && (
            <button 
              className="btn btn-secondary" 
              onClick={handleDownloadPDF}
              disabled={loading}
              style={{ minWidth: '120px' }}
            >
              📥 Download PDF
            </button>
          )}
        </div>

        {reportData && (
          <div className="report-info" style={{ marginTop: '15px', padding: '10px', background: '#f0f8ff', borderRadius: '4px' }}>
            <strong>Showing:</strong> {formatDisplayDate()}
          </div>
        )}
      </div>

      {/* Only render stats if reportData exists */}
      {reportData && (
        <div style={{ marginTop: 24 }}>
          <div className="stats-row" style={{ marginBottom: 20 }}>
            <div className="stat-box">
              <div className="stat-label">Total Bookings</div>
              <div className="stat-num">{reportData.total_bookings || 0}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Confirmed</div>
              <div className="stat-num" style={{ color: '#27ae60' }}>{reportData.confirmed || 0}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Cancelled</div>
              <div className="stat-num" style={{ color: '#e74c3c' }}>{reportData.cancelled || 0}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Pending</div>
              <div className="stat-num" style={{ color: '#f39c12' }}>{reportData.pending || 0}</div>
            </div>
          </div>

          <div className="stats-row" style={{ marginBottom: 20 }}>
            <div className="stat-box">
              <div className="stat-label">Gross Revenue</div>
              <div className="stat-num">Rs. {(reportData.revenue || 0).toLocaleString()}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Refunded Amount</div>
              <div className="stat-num" style={{ color: '#e74c3c' }}>- Rs. {(reportData.refunded_amount || 0).toLocaleString()}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Net Revenue</div>
              <div className="stat-num" style={{ color: '#27ae60' }}>
                Rs. {((reportData.revenue || 0) - (reportData.refunded_amount || 0)).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="stats-row" style={{ marginBottom: 20 }}>
            <div className="stat-box">
              <div className="stat-label">Pending Refunds</div>
              <div className="stat-num" style={{ color: '#f39c12' }}>{reportData.pending_refunds || 0}</div>
              <div className="stat-help">Awaiting processing</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Failed Refunds</div>
              <div className="stat-num" style={{ color: '#e74c3c' }}>{reportData.failed_refunds || 0}</div>
              <div className="stat-help">Need manual intervention</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Success Rate</div>
              <div className="stat-num">
                {reportData.cancelled > 0 
                  ? Math.round(((reportData.cancelled - (reportData.failed_refunds || 0)) / reportData.cancelled) * 100) 
                  : 100}%
              </div>
              <div className="stat-help">Refund success rate</div>
            </div>
          </div>

          {/* Safe check for bookings array */}
          {reportData.bookings && reportData.bookings.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h3>Booking Details</h3>
                <span className="badge">{reportData.bookings.length} bookings</span>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Booking Date</th>
                      <th>Slot Time</th>
                      <th>Status</th>
                      <th>Payment Status</th>
                      <th>Refund Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.bookings.map((b) => (
                      <tr key={b.id} className={b.status === 'cancelled' ? 'cancelled-booking' : ''}>
                        <td>{b.user_name || "N/A"}</td>
                        <td>{b.booking_date || "N/A"}</td>
                        <td>{b.slot_time || "N/A"}</td>
                        <td>{getStatusBadge(b.status, b.refund_status)}</td>
                        <td>
                          <span className={`status-badge status-${b.payment_status || "unknown"}`}>
                            {b.payment_status === 'paid' ? '✓ Paid' : (b.payment_status || 'N/A')}
                          </span>
                        </td>
                        <td>
                          {b.status === 'cancelled' && b.refund_status === 'pending' && (
                            <span className="refund-badge refund-pending">⏳ Refund Pending</span>
                          )}
                          {b.status === 'cancelled' && b.refund_status === 'completed' && (
                            <span className="refund-badge refund-completed">✓ Refunded (Rs.{b.refund_amount})</span>
                          )}
                          {b.status === 'cancelled' && b.refund_status === 'failed' && (
                            <span className="refund-badge refund-failed">⚠️ Refund Failed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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