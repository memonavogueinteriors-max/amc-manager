import React, { useEffect, useState } from "react";

export default function CustomerHistory() {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [history, setHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (search.trim() === "") {
      setCustomers([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/customer-history/search?q=${encodeURIComponent(
            search
          )}`
        );

        const data = await response.json();
        setCustomers(data);
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  async function loadCustomer(id) {
    setLoadingHistory(true);

    try {
      const response = await fetch(
        `http://localhost:5000/api/customer-history/${id}`
      );

      const data = await response.json();

      setHistory(data);
      setSelectedCustomer(id);
    } catch (err) {
      console.error(err);
    }

    setLoadingHistory(false);
  }

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-title">
          👤 Customer History
        </div>
      </div>

<div className="page-content">

  <div className="customer-history-layout">
        {/* Search */}

        <div className="customer-sidebar">

  <div className="card-header">
    <div className="card-title">
      Search Customer
    </div>
  </div>

  <input
    className="input"
    placeholder="Search by Name, Phone or Email"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
        </div>

        <div className="card-header" style={{ marginTop: 20 }}>
  <div className="card-title">
    Search Results
  </div>
</div>

{customers.length === 0 ? (
  <div
    style={{
      padding: 20,
      color: "#777"
    }}
  >
    No customers found.
  </div>
) : (
  customers.map((customer) => (
    <div
      key={customer.id}
      onClick={() => loadCustomer(customer.id)}
      className={
        selectedCustomer === customer.id
          ? "customer-list-item active"
          : "customer-list-item"
      }
    >
      <strong>{customer.name}</strong>

      <div style={{ fontSize: 13, color: "#666" }}>
        📞 {customer.phone}
      </div>

      <div style={{ fontSize: 13, color: "#888" }}>
        {customer.email}
      </div>
    </div>
  ))
)}
</div>
        {/* Customer Details */}

        <div className="customer-content">
          <div className="card-header">
            <div className="card-title">
              Customer Details
            </div>
          </div>

          {loadingHistory && (
            <div className="customer-card">
              Loading...
            </div>
          )}

          {!loadingHistory && history && (
    <div className="customer-card">

              <div className="customer-name">
    {history.customer.name}
</div>

              <div className="customer-info">
<strong>📞 Phone:</strong> {history.customer.phone || "-"}
</div>

             <div className="customer-info">
<strong>✉ Email:</strong> {history.customer.email || "-"}
</div>

             <div className="customer-info">
<strong>📍 Address:</strong> {history.customer.address || "-"}
</div>

              <hr />
<div className="summary-grid">

    <div className="summary-box">
        <h2>{history.contracts.length}</h2>
        <span>Contracts</span>
    </div>

    <div className="summary-box">
        <h2>{history.serviceBookings.length}</h2>
        <span>Bookings</span>
    </div>

    <div className="summary-box">
        <h2>0</h2>
        <span>Visits</span>
    </div>

    <div className="summary-box">
        <h2>0</h2>
        <span>Tickets</span>
    </div>

</div>

<br/>
              <div className="section-title">
AMC Contracts
</div>

              {history.contracts.length === 0 ? (
                <p>No contracts found.</p>
              ) : (
                history.contracts.map((contract) => (
                  <div
  key={contract.id}
  className="contract-card"
>
                    <strong>{contract.contract_number}</strong>

                    <div>Package: {contract.package}</div>

                    <div
  className={
    contract.status === "active"
      ? "status-badge status-active"
      : contract.status === "pending"
      ? "status-badge status-pending"
      : "status-badge status-expired"
  }
>
  {contract.status}
</div>

                    <div>Start: {contract.start_date}</div>

                    <div>End: {contract.end_date}</div>
                  </div>
                ))
              )}

              <hr />

              <div className="section-title">
Service Bookings
</div>

              {history.serviceBookings.length === 0 ? (
                <p>No service bookings found.</p>
              ) : (
                history.serviceBookings.map((booking) => (
  <div
    key={booking.id}
    className="booking-card"
  >
                    <strong>{booking.booking_no}</strong>

                    <div>Service: {booking.service_type}</div>

                    <div>Date: {booking.booking_date}</div>

                    <div
  className={
    booking.status === "Completed"
      ? "status-badge status-active"
      : booking.status === "Pending"
      ? "status-badge status-pending"
      : "status-badge status-expired"
  }
>
  {booking.status}
</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}