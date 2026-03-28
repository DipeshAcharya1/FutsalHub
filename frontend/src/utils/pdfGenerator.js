import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateReportPDF = (reportData, period, dateInfo, futsalName) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(44, 62, 80);
  doc.text('Futsal Booking Report', 14, 20);
  
  // Futsal info
  doc.setFontSize(12);
  doc.setTextColor(52, 73, 94);
  doc.text(`Futsal: ${futsalName}`, 14, 30);
  
  // Period info
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
  
  doc.text(periodText, 14, 38);
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(displayDate, 14, 46);
  
  // Generation date
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  const now = new Date();
  doc.text(`Generated on: ${now.toLocaleString()}`, 14, 54);
  
  // Summary stats with refund info
  doc.setFontSize(14);
  doc.setTextColor(44, 62, 80);
  doc.text('Summary', 14, 68);
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  
  const startY = 76;
  const col1 = 14;
  const col2 = 80;
  const col3 = 140;
  
  // First row
  doc.text('Total Bookings:', col1, startY);
  doc.text(reportData.total_bookings?.toString() || '0', col2, startY);
  
  doc.text('Confirmed:', col1, startY + 8);
  doc.text(reportData.confirmed?.toString() || '0', col2, startY + 8);
  
  doc.text('Pending:', col1, startY + 16);
  doc.text(reportData.pending?.toString() || '0', col2, startY + 16);
  
  doc.text('Cancelled:', col1, startY + 24);
  doc.text(reportData.cancelled?.toString() || '0', col2, startY + 24);
  
  // Second row - Revenue and Refund info
  doc.text('Gross Revenue:', col3, startY);
  doc.text(`Rs. ${(reportData.revenue || 0).toLocaleString()}`, col3 + 35, startY);
  
  doc.text('Refunded Amount:', col3, startY + 8);
  doc.text(`Rs. ${(reportData.refunded_amount || 0).toLocaleString()}`, col3 + 35, startY + 8);
  
  doc.text('Net Revenue:', col3, startY + 16);
  const netRevenue = (reportData.revenue || 0) - (reportData.refunded_amount || 0);
  doc.text(`Rs. ${netRevenue.toLocaleString()}`, col3 + 35, startY + 16);
  
  // Third row - Refund Statistics
  const refundStatsY = startY + 38;
  doc.setFontSize(12);
  doc.setTextColor(44, 62, 80);
  doc.text('Refund Statistics', 14, refundStatsY);
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Pending Refunds:', 14, refundStatsY + 8);
  doc.text(reportData.pending_refunds?.toString() || '0', 70, refundStatsY + 8);
  
  doc.text('Failed Refunds:', 14, refundStatsY + 16);
  doc.text(reportData.failed_refunds?.toString() || '0', 70, refundStatsY + 16);
  
  doc.text('Refund Success Rate:', 14, refundStatsY + 24);
  const successRate = reportData.cancelled > 0 
    ? Math.round(((reportData.cancelled - (reportData.failed_refunds || 0)) / reportData.cancelled) * 100) 
    : 100;
  doc.text(`${successRate}%`, 70, refundStatsY + 24);
  
  // Bookings table with refund info
  if (reportData.bookings && reportData.bookings.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text('Booking Details', 14, refundStatsY + 38);
    
    const tableColumn = ["Customer", "Date", "Time", "Status", "Payment", "Refund Status"];
    const tableRows = [];
    
    reportData.bookings.forEach(booking => {
      let refundDisplay = '';
      if (booking.status === 'cancelled') {
        if (booking.refund_status === 'pending') {
          refundDisplay = '⏳ Processing';
        } else if (booking.refund_status === 'completed') {
          refundDisplay = `✓ Refunded (Rs.${booking.refund_amount || 0})`;
        } else if (booking.refund_status === 'failed') {
          refundDisplay = '⚠️ Failed';
        } else {
          refundDisplay = 'No Refund';
        }
      } else {
        refundDisplay = '—';
      }
      
      const statusDisplay = booking.status === 'cancelled' 
        ? `Cancelled${booking.refund_status === 'completed' ? ' (Refunded)' : ''}`
        : booking.status;
      
      const bookingData = [
        booking.user_name || 'N/A',
        booking.booking_date || 'N/A',
        booking.slot_time || 'N/A',
        statusDisplay,
        booking.payment_status === 'paid' ? '✓ Paid' : (booking.payment_status || 'N/A'),
        refundDisplay
      ];
      tableRows.push(bookingData);
    });
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: refundStatsY + 44,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [52, 152, 219], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25 },
        5: { cellWidth: 35 }
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
      `Page ${i} of ${pageCount} - Generated by Futsal Booking System`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  // Save PDF
  const fileName = `futsal_report_${period}_${dateInfo}.pdf`;
  doc.save(fileName);
};