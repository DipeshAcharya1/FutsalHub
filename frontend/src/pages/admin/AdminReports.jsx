import React, { useState } from "react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
      generateDetailedPDF(reportData, reportPeriod, reportDate);
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

// Enhanced PDF Generation Function
export const generateDetailedPDF = (reportData, period, dateInfo) => {
  const doc = new jsPDF();
  let yOffset = 20;
  
  // Helper function to add new page if needed
  const checkPageBreak = (neededSpace) => {
    if (yOffset + neededSpace > doc.internal.pageSize.height - 20) {
      doc.addPage();
      yOffset = 20;
      return true;
    }
    return false;
  };
  
  // Title with gradient effect (simulated)
  doc.setFontSize(24);
  doc.setTextColor(44, 62, 80);
  doc.setFont('helvetica', 'bold');
  doc.text('FUTSAL HUB', 14, yOffset);
  
  doc.setFontSize(18);
  doc.setTextColor(52, 152, 219);
  doc.text('Booking Report', 14, yOffset + 10);
  
  yOffset += 20;
  
  // Report Period Info
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  
  let periodText = '';
  let displayDate = '';
  
  if (period === 'daily') {
    const date = new Date(dateInfo);
    periodText = 'Daily Report';
    displayDate = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } else if (period === 'weekly') {
    const endDate = new Date(dateInfo);
    const startDate = new Date(dateInfo);
    startDate.setDate(startDate.getDate() - 6);
    periodText = 'Weekly Report';
    displayDate = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  } else if (period === 'monthly') {
    const [year, month] = dateInfo.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    periodText = 'Monthly Report';
    displayDate = `${monthNames[parseInt(month) - 1]} ${year}`;
  }
  
  doc.text(`${periodText}`, 14, yOffset);
  doc.text(displayDate, 14, yOffset + 8);
  
  // Generation date
  const now = new Date();
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated on: ${now.toLocaleString()}`, 14, yOffset + 16);
  
  yOffset += 28;
  
  // ========== SUMMARY SECTION ==========
  checkPageBreak(50);
  
  // Section Header
  doc.setFontSize(14);
  doc.setTextColor(44, 62, 80);
  doc.setFont('helvetica', 'bold');
  doc.text('📊 SUMMARY', 14, yOffset);
  yOffset += 8;
  
  // Summary Stats Box
  doc.setFillColor(245, 247, 250);
  doc.rect(14, yOffset - 2, 180, 35, 'F');
  
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
  doc.text(`Rs. ${(reportData.revenue || 0).toLocaleString()}`, col4, yOffset + 6);
  
  doc.text('Refunded Amount:', col3, yOffset + 14);
  doc.text(`Rs. ${(reportData.refunded_amount || 0).toLocaleString()}`, col4, yOffset + 14);
  
  doc.text('Net Revenue:', col3, yOffset + 22);
  const netRevenue = (reportData.revenue || 0) - (reportData.refunded_amount || 0);
  doc.text(`Rs. ${netRevenue.toLocaleString()}`, col4, yOffset + 22);
  
  yOffset += 42;
  
  // ========== REFUND STATISTICS SECTION ==========
  checkPageBreak(40);
  
  doc.setFontSize(14);
  doc.setTextColor(44, 62, 80);
  doc.setFont('helvetica', 'bold');
  doc.text('💰 REFUND STATISTICS', 14, yOffset);
  yOffset += 8;
  
  doc.setFillColor(255, 248, 225);
  doc.rect(14, yOffset - 2, 180, 32, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Pending Refunds:', 20, yOffset + 8);
  doc.text(`${reportData.pending_refunds || 0}`, 70, yOffset + 8);
  
  doc.text('Failed Refunds:', 20, yOffset + 18);
  doc.text(`${reportData.failed_refunds || 0}`, 70, yOffset + 18);
  
  doc.text('Successful Refunds:', 110, yOffset + 8);
  const successfulRefunds = (reportData.cancelled || 0) - (reportData.failed_refunds || 0) - (reportData.pending_refunds || 0);
  doc.text(`${successfulRefunds}`, 170, yOffset + 8);
  
  const successRate = reportData.cancelled > 0 
    ? Math.round(((reportData.cancelled - (reportData.failed_refunds || 0) - (reportData.pending_refunds || 0)) / reportData.cancelled) * 100) 
    : 100;
  doc.text('Refund Success Rate:', 110, yOffset + 18);
  doc.text(`${successRate}%`, 170, yOffset + 18);
  
  yOffset += 38;
  
  // ========== REFUND BREAKDOWN SECTION ==========
  if (reportData.cancelled > 0) {
    checkPageBreak(50);
    
    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
    doc.setFont('helvetica', 'bold');
    doc.text('📋 REFUND BREAKDOWN', 14, yOffset);
    yOffset += 8;
    
    // Calculate refund totals
    const refundTotals = {};
    reportData.bookings.forEach(booking => {
      if (booking.status === 'cancelled' && booking.refund_amount) {
        const status = booking.refund_status || 'unknown';
        refundTotals[status] = (refundTotals[status] || 0) + (booking.refund_amount || 0);
      }
    });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    let refundY = yOffset;
    if (refundTotals.completed) {
      doc.setTextColor(39, 174, 96);
      doc.text(`✓ Completed Refunds:`, 20, refundY);
      doc.text(`Rs. ${refundTotals.completed.toLocaleString()}`, 80, refundY);
      refundY += 8;
    }
    if (refundTotals.pending) {
      doc.setTextColor(243, 156, 18);
      doc.text(`⏳ Pending Refunds:`, 20, refundY);
      doc.text(`Rs. ${refundTotals.pending.toLocaleString()}`, 80, refundY);
      refundY += 8;
    }
    if (refundTotals.failed) {
      doc.setTextColor(231, 76, 60);
      doc.text(`⚠️ Failed Refunds:`, 20, refundY);
      doc.text(`Rs. ${refundTotals.failed.toLocaleString()}`, 80, refundY);
      refundY += 8;
    }
    
    yOffset = refundY + 10;
  }
  
  // ========== BOOKING DETAILS TABLE ==========
  if (reportData.bookings && reportData.bookings.length > 0) {
    checkPageBreak(30);
    
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.setFont('helvetica', 'bold');
    doc.text('📅 BOOKING DETAILS', 14, yOffset);
    yOffset += 8;
    
    const tableColumn = [
      "Customer",
      "Date", 
      "Time", 
      "Status", 
      "Payment",
      "Refund Status",
      "Amount"
    ];
    
    const tableRows = [];
    
    reportData.bookings.forEach(booking => {
      let refundDisplay = '';
      let refundAmountDisplay = '';
      
      if (booking.status === 'cancelled') {
        if (booking.refund_status === 'pending') {
          refundDisplay = '⏳ Pending';
          refundAmountDisplay = `Rs. ${booking.refund_amount || 0}`;
        } else if (booking.refund_status === 'completed') {
          refundDisplay = '✓ Completed';
          refundAmountDisplay = `Rs. ${booking.refund_amount || 0}`;
        } else if (booking.refund_status === 'failed') {
          refundDisplay = '⚠️ Failed';
          refundAmountDisplay = `Rs. ${booking.refund_amount || 0}`;
        } else {
          refundDisplay = '—';
          refundAmountDisplay = '—';
        }
      } else {
        refundDisplay = '—';
        refundAmountDisplay = '—';
      }
      
      const statusDisplay = booking.status === 'cancelled' ? 'Cancelled' : booking.status;
      
      const bookingData = [
        booking.user_name || 'N/A',
        booking.booking_date || 'N/A',
        booking.slot_time || 'N/A',
        statusDisplay,
        booking.payment_status === 'paid' ? '✓ Paid' : (booking.payment_status || 'N/A'),
        refundDisplay,
        refundAmountDisplay
      ];
      tableRows.push(bookingData);
    });
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: yOffset,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { 
        fillColor: [52, 152, 219], 
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 22 },
        2: { cellWidth: 28 },
        3: { cellWidth: 22 },
        4: { cellWidth: 20 },
        5: { cellWidth: 25 },
        6: { cellWidth: 25 }
      },
      didDrawPage: (data) => {
        // Footer on each page
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Page ${i} of ${pageCount} - Generated by Futsal Booking System`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
          );
        }
      }
    });
  }
  
  // Add summary footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Add total summary on last page
    if (i === pageCount) {
      const lastY = doc.internal.pageSize.height - 25;
      doc.setDrawColor(200, 200, 200);
      doc.line(14, lastY - 5, doc.internal.pageSize.width - 14, lastY - 5);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Bookings: ${reportData.total_bookings || 0}`, 14, lastY);
      doc.text(`Net Revenue: Rs. ${netRevenue.toLocaleString()}`, 14, lastY + 6);
      doc.text(`Refund Success Rate: ${successRate}%`, 14, lastY + 12);
    }
    
    // Page number footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount} - Generated by Futsal Booking System`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  // Save PDF
  const fileName = `futsal_report_${period}_${dateInfo.replace(/-/g, '')}.pdf`;
  doc.save(fileName);
};

export default AdminReports;