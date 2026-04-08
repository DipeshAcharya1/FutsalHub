import React from "react";
import Pagination from "../../components/Pagination";

const UsersTab = ({ users, loading, currentPage, itemsPerPage, onPageChange }) => {
  // Calculate paginated data
  const totalItems = users.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = users.slice(startIndex, endIndex);

  return (
    <section className="tab-content">
      <div className="content-header">
        <h3>All Users</h3>
      </div>

      {loading && <div className="loading-text">Loading users...</div>}

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td>{u.phone || "-"}</td>
                <td>
                  <span className={`role-badge ${u.role}`}>
                    {u.role === 'super-admin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </td>
                <td>{u.registered_at}</td>
              </tr>
            ))}
            {paginatedUsers.length === 0 && !loading && (
              <tr>
                <td colSpan="5" className="empty-message">No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
      />
    </section>
  );
};

export default UsersTab;