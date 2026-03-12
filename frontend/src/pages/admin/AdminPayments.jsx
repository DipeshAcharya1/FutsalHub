import React from "react";

const AdminPayments = ({ payments, totalRevenue }) => {
  return (
    <div>
      <h2 className="page-title">Payments</h2>
      <p className="page-sub" style={{ marginBottom: 16 }}>
        All payment transactions linked to bookings at your futsal.
      </p>

      <div className="stats-row" style={{ marginBottom: 24 }}>
        <div className="stat-box">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-num">Rs. {totalRevenue.toLocaleString()}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Transactions</div>
          <div className="stat-num">{payments.length}</div>
        </div>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Booking Date</th>
              <th>Slot Time</th>
              <th>Method</th>
              <th>Transaction ID</th>
              <th>Amount</th>
              <th>Payment Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.user_name || "N/A"}</td>
                <td>{p.booking_date || "N/A"}</td>
                <td>{p.slot_time || "N/A"}</td>
                <td>{p.payment_method || "eSewa"}</td>
                <td className="small-text">{p.transaction_id || "N/A"}</td>
                <td>Rs. {parseFloat(p.amount || 0).toLocaleString()}</td>
                <td>{p.payment_date || "N/A"}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={8} className="empty-row">No payment records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPayments;