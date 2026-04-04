import React, { useState, useEffect } from "react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from "../../api/axios";
import "../../styles/SuperAdminReports.css";

const SuperAdminReports = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [futsals, setFutsals] = useState([]);
  const [selectedFutsal, setSelectedFutsal] = useState('all');
  const [reportPeriod, setReportPeriod] = useState('monthly');
  const [reportDate, setReportDate] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-01`;
  });
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadFutsals();
  }, []);

  const loadFutsals = async () => {
    try {
      const response = await api.get('/super-admin/futsals');
      setFutsals(response.data || []);
    } catch (error) {
      console.error('Failed to load futsals:', error);
    }
  };

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

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = {
        period: reportPeriod,
        date: reportDate,
        futsal_id: selectedFutsal !== 'all' ? selectedFutsal : null
      };
      
      const response = await api.get('/super-admin/reports', { params });
      if (response.data.success) {
        setReportData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!reportData) return;
    
    const doc = new jsPDF();
    let yOffset = 20;
    
    // Title
    doc.setFontSize(24);
    doc.setTextColor(44, 62, 80);
    doc.setFont('helvetica', 'bold');
    doc.text('FUTSAL HUB', 14, yOffset);
    
    doc.setFontSize(18);
    doc.setTextColor(52, 152, 219);
    doc.text('Super Admin Report', 14, yOffset + 10);
    yOffset += 20;
    
    // Futsal Info
    doc.setFontSize(12);
    doc.setTextColor(52, 73, 94);
    if (selectedFutsal !== 'all') {
      const futsal = futsals.find(f => f.id === parseInt(selectedFutsal));
      doc.text(`Futsal: ${futsal?.futsal_name || 'All Futsals'}`, 14, yOffset);
    } else {
      doc.text(`Report Type: All Futsals Combined`, 14, yOffset);
    }
    yOffset += 8;
    
    // Period Info
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    
    let periodText = '';
    let displayDate = '';
    
    if (reportPeriod === 'daily') {
      const date = new Date(reportDate);
      periodText = 'Daily Report';
      displayDate = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (reportPeriod === 'weekly') {
      const endDate = new Date(reportDate);
      const startDate = new Date(reportDate);
      startDate.setDate(startDate.getDate() - 6);
      periodText = 'Weekly Report';
      displayDate = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    } else if (reportPeriod === 'monthly') {
      const [year, month] = reportDate.split('-');
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      periodText = 'Monthly Report';
      displayDate = `${monthNames[parseInt(month) - 1]} ${year}`;
    }
    
    doc.text(`${periodText}`, 14, yOffset);
    doc.text(displayDate, 14, yOffset + 8);
    yOffset += 20;
    
    // Generation date
    const now = new Date();
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on: ${now.toLocaleString()}`, 14, yOffset);
    yOffset += 12;
    
    // ========== OVERALL SUMMARY ==========
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.setFont('helvetica', 'bold');
    doc.text('📊 OVERALL SUMMARY', 14, yOffset);
    yOffset += 8;
    
    doc.setFillColor(245, 247, 250);
    doc.rect(14, yOffset - 2, 180, 45, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    const col1 = 20;
    const col2 = 60;
    const col3 = 110;
    const col4 = 150;
    
    doc.text('Total Bookings:', col1, yOffset + 6);
    doc.text(`${reportData.total_bookings || 0}`, col2, yOffset + 6);
    
    doc.text('Confirmed:', col1, yOffset + 14);
    doc.text(`${reportData.confirmed || 0}`, col2, yOffset + 14);
    
    doc.text('Cancelled:', col1, yOffset + 22);
    doc.text(`${reportData.cancelled || 0}`, col2, yOffset + 22);
    
    doc.text('Pending:', col1, yOffset + 30);
    doc.text(`${reportData.pending || 0}`, col2, yOffset + 30);
    
    doc.text('Gross Revenue:', col3, yOffset + 6);
    doc.text(`Rs. ${(reportData.gross_revenue || 0).toLocaleString()}`, col4, yOffset + 6);
    
    doc.text('Refunded Amount:', col3, yOffset + 14);
    doc.text(`Rs. ${(reportData.refunded_amount || 0).toLocaleString()}`, col4, yOffset + 14);
    
    doc.text('Net Revenue:', col3, yOffset + 22);
    doc.text(`Rs. ${((reportData.gross_revenue || 0) - (reportData.refunded_amount || 0)).toLocaleString()}`, col4, yOffset + 22);
    
    yOffset += 52;
    
    // ========== REFUND STATISTICS ==========
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.setFont('helvetica', 'bold');
    doc.text('💰 REFUND STATISTICS', 14, yOffset);
    yOffset += 8;
    
    doc.setFillColor(255, 248, 225);
    doc.rect(14, yOffset - 2, 180, 40, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    doc.text('Pending Refunds:', 20, yOffset + 8);
    doc.text(`${reportData.pending_refunds || 0}`, 70, yOffset + 8);
    
    doc.text('Failed Refunds:', 20, yOffset + 18);
    doc.text(`${reportData.failed_refunds || 0}`, 70, yOffset + 18);
    
    doc.text('Completed Refunds:', 20, yOffset + 28);
    doc.text(`${reportData.completed_refunds || 0}`, 70, yOffset + 28);
    
    const totalCancelled = reportData.cancelled || 0;
    const successRate = totalCancelled > 0 
      ? Math.round(((reportData.completed_refunds || 0) / totalCancelled) * 100) 
      : 100;
    doc.text('Success Rate:', 110, yOffset + 18);
    doc.text(`${successRate}%`, 170, yOffset + 18);
    
    yOffset += 48;
    
    // ========== FUTSAL WISE BREAKDOWN ==========
    if (reportData.futsal_breakdown && reportData.futsal_breakdown.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.setFont('helvetica', 'bold');
      doc.text('🏟️ FUTSAL WISE BREAKDOWN', 14, yOffset);
      yOffset += 8;
      
      const futsalTableColumn = ["Futsal", "Location", "Bookings", "Confirmed", "Cancelled", "Revenue", "Refunds", "Net"];
      const futsalTableRows = [];
      
      reportData.futsal_breakdown.forEach(f => {
        futsalTableRows.push([
          f.futsal_name || 'N/A',
          f.location || 'N/A',
          f.total_bookings?.toString() || '0',
          f.confirmed?.toString() || '0',
          f.cancelled?.toString() || '0',
          `Rs. ${(f.revenue || 0).toLocaleString()}`,
          `Rs. ${(f.refunded_amount || 0).toLocaleString()}`,
          `Rs. ${((f.revenue || 0) - (f.refunded_amount || 0)).toLocaleString()}`
        ]);
      });
      
      autoTable(doc, {
        head: [futsalTableColumn],
        body: futsalTableRows,
        startY: yOffset,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 25 },
          2: { cellWidth: 18 },
          3: { cellWidth: 18 },
          4: { cellWidth: 18 },
          5: { cellWidth: 25 },
          6: { cellWidth: 25 },
          7: { cellWidth: 25 }
        }
      });
      
      yOffset = doc.lastAutoTable.finalY + 15;
    }
    
    // ========== BOOKING DETAILS TABLE ==========
    if (reportData.bookings && reportData.bookings.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.setFont('helvetica', 'bold');
      doc.text(' BOOKING DETAILS', 14, yOffset);
      yOffset += 8;
      
      const tableColumn = ["Futsal", "Customer", "Slot Date", "Time", "Status", "Payment", "Refund"];
      const tableRows = [];
      
      reportData.bookings.forEach(booking => {
        let refundDisplay = '';
        if (booking.status === 'cancelled') {
          if (booking.refund_status === 'pending') {
            refundDisplay = ' Pending';
          } else if (booking.refund_status === 'completed') {
            refundDisplay = `✓ Rs.${booking.refund_amount || 0}`;
          } else if (booking.refund_status === 'failed') {
            refundDisplay = ' Failed';
          } else {
            refundDisplay = '—';
          }
        } else {
          refundDisplay = '—';
        }
        
        const bookingData = [
          booking.futsal_name || 'N/A',
          booking.user_name || 'N/A',
          booking.slot_date || 'N/A',
          booking.slot_time || 'N/A',
          booking.status === 'cancelled' ? 'Cancelled' : (booking.status || 'N/A'),
          booking.payment_status === 'paid' ? '✓ Paid' : (booking.payment_status || 'N/A'),
          refundDisplay
        ];
        tableRows.push(bookingData);
      });
      
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: yOffset,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 30 },
          2: { cellWidth: 22 },
          3: { cellWidth: 28 },
          4: { cellWidth: 20 },
          5: { cellWidth: 20 },
          6: { cellWidth: 22 }
        }
      });
    }
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount} - Generated by Futsal Hub Super Admin System`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
    
    const fileName = `futsal_superadmin_report_${reportPeriod}_${reportDate.replace(/-/g, '')}_${selectedFutsal === 'all' ? 'all' : selectedFutsal}.pdf`;
    doc.save(fileName);
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

  return (
    <div className="superadmin-reports">
      <div className="page-header">
        <h1 className="page-title">Super Admin Reports</h1>
        <p className="page-sub">Generate comprehensive reports for all futsals or individual venues</p>
      </div>

      <div className="reports-filters card">
        <div className="filters-grid">
          <div className="form-field">
            <label className="form-label">Futsal</label>
            <select
              className="form-input"
              value={selectedFutsal}
              onChange={(e) => setSelectedFutsal(e.target.value)}
            >
              <option value="all"> All Futsals (Combined Report)</option>
              {futsals.map(futsal => (
                <option key={futsal.id} value={futsal.id}>
                   {futsal.futsal_name} - {futsal.location}
                </option>
              ))}
            </select>
          </div>

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
            <>
              <div className="form-field">
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
              <div className="form-field">
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
            </>
          )}

          <div className="form-field actions">
            <button 
              className="btn btn-primary" 
              onClick={generateReport} 
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate Report"}
            </button>
            
            {reportData && (
              <button 
                className="btn btn-secondary" 
                onClick={downloadPDF}
                disabled={loading}
              >
                📥 Download PDF
              </button>
            )}
          </div>
        </div>

        {reportData && (
          <div className="report-info">
            <strong>Showing:</strong> {formatDisplayDate()}
            {selectedFutsal !== 'all' && (
              <> • <strong>Futsal:</strong> {futsals.find(f => f.id === parseInt(selectedFutsal))?.futsal_name}</>
            )}
            <> • <strong>Period:</strong> {reportData.date_range?.start} to {reportData.date_range?.end}</>
          </div>
        )}
      </div>

      {reportData && (
        <div className="report-results">
          {/* Summary Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Bookings</div>
              <div className="stat-value">{reportData.total_bookings || 0}</div>
            </div>
            <div className="stat-card confirmed">
              <div className="stat-label">Confirmed</div>
              <div className="stat-value">{reportData.confirmed || 0}</div>
            </div>
            <div className="stat-card cancelled">
              <div className="stat-label">Cancelled</div>
              <div className="stat-value">{reportData.cancelled || 0}</div>
            </div>
            <div className="stat-card revenue">
              <div className="stat-label">Gross Revenue</div>
              <div className="stat-value">Rs. {(reportData.gross_revenue || 0).toLocaleString()}</div>
            </div>
            <div className="stat-card refunded">
              <div className="stat-label">Refunded</div>
              <div className="stat-value">Rs. {(reportData.refunded_amount || 0).toLocaleString()}</div>
            </div>
            <div className="stat-card net">
              <div className="stat-label">Net Revenue</div>
              <div className="stat-value">
                Rs. {((reportData.gross_revenue || 0) - (reportData.refunded_amount || 0)).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Futsal Wise Breakdown */}
          {reportData.futsal_breakdown && reportData.futsal_breakdown.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h3>🏟️ Futsal Wise Breakdown</h3>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Futsal</th>
                      <th>Location</th>
                      <th>Bookings</th>
                      <th>Confirmed</th>
                      <th>Cancelled</th>
                      <th>Revenue</th>
                      <th>Refunds</th>
                      <th>Net Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.futsal_breakdown.map((f, idx) => (
                      <tr key={idx}>
                        <td><strong>{f.futsal_name}</strong></td>
                        <td>{f.location}</td>
                        <td>{f.total_bookings || 0}</td>
                        <td className="text-success">{f.confirmed || 0}</td>
                        <td className="text-danger">{f.cancelled || 0}</td>
                        <td>Rs. {(f.revenue || 0).toLocaleString()}</td>
                        <td className="text-danger">Rs. {(f.refunded_amount || 0).toLocaleString()}</td>
                        <td className="text-success">Rs. {((f.revenue || 0) - (f.refunded_amount || 0)).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Booking Details */}
          {reportData.bookings && reportData.bookings.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h3>📅 Booking Details</h3>
                <span className="badge">{reportData.bookings.length} bookings</span>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Futsal</th>
                      <th>Customer</th>
                      <th>Slot Date</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Refund</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.bookings.map((booking) => (
                      <tr key={booking.id} className={booking.status === 'cancelled' ? 'cancelled-row' : ''}>
                        <td>{booking.futsal_name}</td>
                        <td>{booking.user_name}</td>
                        <td>{booking.slot_date}</td>
                        <td>{booking.slot_time}</td>
                        <td>
                          <span className={`status-badge ${booking.status}`}>
                            {booking.status === 'cancelled' ? 'Cancelled' : booking.status}
                          </span>
                        </td>
                        <td>
                          <span className={`payment-badge ${booking.payment_status}`}>
                            {booking.payment_status === 'paid' ? '✓ Paid' : booking.payment_status}
                          </span>
                        </td>
                        <td>
                          {booking.status === 'cancelled' && booking.refund_status === 'pending' && (
                            <span className="refund-badge pending">⏳ Pending</span>
                          )}
                          {booking.status === 'cancelled' && booking.refund_status === 'completed' && (
                            <span className="refund-badge completed">✓ Rs.{booking.refund_amount}</span>
                          )}
                          {booking.status === 'cancelled' && booking.refund_status === 'failed' && (
                            <span className="refund-badge failed">⚠️ Failed</span>
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
          <p>Select a futsal, period, and date, then click Generate Report.</p>
        </div>
      )}
    </div>
  );
};

export default SuperAdminReports;