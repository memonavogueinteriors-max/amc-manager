import React, { useEffect, useState } from "react";

export default function CustomerHistory() {

  const [customers, setCustomers] = useState([]);
const [search, setSearch] = useState("");
const [selectedCustomer, setSelectedCustomer] = useState(null);
const [history, setHistory] = useState(null);
const [loading, setLoading] = useState(false);
  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    try {

      const response = await fetch(
        "http://localhost:5000/api/customer-history/search?q="
      );

      const data = await response.json();

      setCustomers(data);

    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="page">

      <div className="topbar">

        <div className="topbar-title">
          👤 Customer History
        </div>

        <button className="btn">
          + New Customer
        </button>

      </div>

      <div className="page-content">

        {/* Statistics */}

        <div className="stats-grid">

          <div className="stat-card">
            <div className="stat-title">
              Total Customers
            </div>

            <div className="stat-value">
              {customers.length}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-title">
              Active Contracts
            </div>

            <div className="stat-value">
              0
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-title">
              Service Bookings
            </div>

            <div className="stat-value">
              0
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-title">
              Open Tickets
            </div>

            <div className="stat-value">
              0
            </div>
          </div>

        </div>

        {/* Main Card */}

        <div className="card">

          <div className="card-header">

            <div>

              <div className="card-title">
                Customer History
              </div>

              <div className="card-subtitle">
                View customer profiles, contracts and service history.
              </div>

            </div>

          </div>

          {/* Filters */}

          <div className="filters-row">

            <input
              className="search-input service-bookings-search"
              placeholder="Search Customer..."
            />

            <select className="form-input service-bookings-select">
              <option>All Customers</option>
            </select>

            <select className="form-input service-bookings-select">
              <option>All Contracts</option>
            </select>

          </div>

          {/* Table */}

          <div className="table-responsive">

            <table className="table">

              <thead>

                <tr>

                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Contracts</th>
                  <th>Bookings</th>
                  <th>Actions</th>

                </tr>

              </thead>

              <tbody>

                {customers.length === 0 ? (

                  <tr>

                    <td
                      colSpan="6"
                      style={{
                        textAlign: "center",
                        padding: 40
                      }}
                    >
                      No Customers Found.
                    </td>

                  </tr>

                ) : (

                  customers.map(customer => (

                    <tr key={customer.id}>

                      <td>{customer.name}</td>

                      <td>{customer.phone}</td>

                      <td>{customer.email}</td>

                      <td>-</td>

                      <td>-</td>

                      <td>

                        <button className="btn btn-sm">
                          View
                        </button>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </div>
  );
}