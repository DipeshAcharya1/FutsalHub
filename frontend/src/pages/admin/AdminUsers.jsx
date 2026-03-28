import React from "react";

const AdminUsers = ({ users }) => {
  return (
    <div>
      <h2 className="page-title">Users</h2>
      <p className="page-sub" style={{ marginBottom: 16 }}>
        Users who have booked at your futsal.
      </p>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.name || "N/A"}</td>
                <td>{u.email || "N/A"}</td>
                <td>{u.phone || "N/A"}</td>
                <td>{u.role || "user"}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="empty-row">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;