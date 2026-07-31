import React from 'react';

export default function ServiceBookings() {
  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-title">
          📅 Service Bookings
        </div>
      </div>

      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              Service Bookings
            </div>

            <button className="btn">
              + New Booking
            </button>
          </div>

          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#777"
            }}
          >
            No service bookings found.
          </div>
        </div>
      </div>
    </div>
  );
}