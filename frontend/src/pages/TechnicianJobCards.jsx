import React, { useEffect, useState } from "react";

export default function TechnicianJobCards() {

  const [jobCards, setJobCards] = useState([]);

  useEffect(() => {
    loadJobCards();
  }, []);

  async function loadJobCards() {
    try {
      const response = await fetch(
        "http://localhost:5000/api/technician-job-cards"
      );

      const data = await response.json();

      setJobCards(data);

    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="page">

      <div className="topbar">

        <div className="topbar-title">
          🔧 Technician Job Cards
        </div>

        <button className="btn">
          + New Job Card
        </button>

      </div>

      <div className="page-content">

        {/* Statistics */}

        <div className="stats-grid">

          <div className="stat-card">
            <div className="stat-title">Total Job Cards</div>
            <div className="stat-value">
              {jobCards.length}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-title">Pending</div>
            <div className="stat-value">
              {
                jobCards.filter(j => j.status === "Pending").length
              }
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-title">Completed</div>
            <div className="stat-value">
              {
                jobCards.filter(j => j.status === "Completed").length
              }
            </div>
          </div>

        </div>

        {/* Main Card */}

        <div className="card">

          <div className="card-header">

            <div>

              <div className="card-title">
                Technician Job Cards
              </div>

              <div className="card-subtitle">
                Manage technician field visits and maintenance jobs.
              </div>

            </div>

          </div>

          {/* Filters */}

          <div className="filters-row">

            <input
              className="search-input service-bookings-search"
              placeholder="Search Job Card..."
            />

            <select className="form-input service-bookings-select">
              <option>All Status</option>
            </select>

            <select className="form-input service-bookings-select">
              <option>All Technicians</option>
            </select>

          </div>

          {/* Table */}

          <div className="table-responsive">

            <table className="table">

              <thead>

                <tr>

                  <th>Job Card</th>
                  <th>Customer</th>
                  <th>Technician</th>
                  <th>Service Date</th>
                  <th>Status</th>
                  <th>Actions</th>

                </tr>

              </thead>

              <tbody>

                {jobCards.length === 0 ? (

                  <tr>

                    <td
                      colSpan="6"
                      style={{
                        textAlign: "center",
                        padding: 40
                      }}
                    >
                      No Technician Job Cards Found.
                    </td>

                  </tr>

                ) : (

                  jobCards.map(card => (

                    <tr key={card.id}>

                      <td>{card.job_card_no}</td>

                      <td>{card.client_name || "-"}</td>

                      <td>{card.technician_name}</td>

                      <td>{card.service_date}</td>

                      <td>{card.status}</td>

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