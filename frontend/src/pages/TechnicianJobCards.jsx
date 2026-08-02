import React, { useEffect, useState } from "react";

export default function TechnicianJobCards() {

  const [jobCards, setJobCards] = useState([]);
const [customers, setCustomers] = useState([]);
const [contracts, setContracts] = useState([]);
const [form, setForm] = useState({
  contract_id: "",
  client_id: "",
  villa_id: "",
  technician_name: "",
  service_date: "",
  service_type: "",
  technician_notes: "",
  status: "Pending",
  before_photos: [],
  after_photos: [],
  customer_signature: "",
  technician_signature: ""
});
  useEffect(() => {
  loadJobCards();
  loadCustomers();
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

async function loadCustomers() {
  try {
    const response = await fetch(
      "http://localhost:5000/api/technician-job-cards/customers"
    );

    const data = await response.json();

    setCustomers(data);
  } catch (err) {
    console.error(err);
  }
}

async function loadContracts(customerId) {
  try {
    if (!customerId) {
      setContracts([]);
      return;
    }

    const response = await fetch(
      `http://localhost:5000/api/customer-history/${customerId}`
    );

    const data = await response.json();

    setContracts(data.contracts || []);
  } catch (err) {
    console.error(err);
  }
}

async function saveJobCard() {
  try {
    const response = await fetch(
      "http://localhost:5000/api/technician-job-cards",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      }
    );

    if (!response.ok) {
      throw new Error("Unable to save Job Card.");
    }

    await loadJobCards();

    alert("Job Card Created Successfully.");

    setForm({
      contract_id: "",
      client_id: "",
      villa_id: "",
      technician_name: "",
      service_date: "",
      service_type: "",
      technician_notes: "",
      status: "Pending",
      before_photos: [],
      after_photos: [],
      customer_signature: "",
      technician_signature: ""
    });

  } catch (err) {
    console.error(err);
    alert("Unable to save Job Card.");
  }
}

return (
  <div className="page"><div className="topbar">

  <div className="topbar-title">
    Technician Job Cards
  </div>

  <button
    className="btn"
    onClick={saveJobCard}
  >
    + New Job Card
  </button>

</div>

      <div className="page-content">
<div className="stats-grid">

  <div className="stat-card">
    <div className="stat-title">
      TOTAL JOB CARDS
    </div>

    <div className="stat-value">
      {jobCards.length}
    </div>
  </div>

  <div className="stat-card">
    <div className="stat-title">
      PENDING
    </div>

    <div className="stat-value">
      {
        jobCards.filter(
          j => j.status === "Pending"
        ).length
      }
    </div>
  </div>

  <div className="stat-card">
    <div className="stat-title">
      COMPLETED
    </div>

    <div className="stat-value">
      {
        jobCards.filter(
          j => j.status === "Completed"
        ).length
      }
    </div>
  </div>

</div>

            <div className="card">

  <div className="card-header">

    <div>

      <div className="card-title">
        Job Cards
      </div>

      <div className="card-subtitle">
        Manage technician field visits and maintenance work.
      </div>

    </div>

    <button
      className="btn"
      onClick={() => {
        // We'll connect the drawer next
      }}
    >
      + New Job Card
    </button>

  </div>

  <div className="filters-row">

    <input
      className="input"
      placeholder="Search Job Card..."
    />

    <select className="input">
      <option>All Status</option>
      <option>Pending</option>
      <option>Completed</option>
    </select>

    <select className="input">
      <option>All Technicians</option>
    </select>

  </div>

  <table className="table jobcard-table">

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
              padding: 30,
              color: "#777"
            }}
          >
            No Job Cards Found.
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
  );
}