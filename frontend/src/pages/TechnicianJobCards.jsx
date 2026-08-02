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
            <div className="card-title">
              New Technician Job Card
            </div>
          </div>

          <div className="jobcard-grid">

  <div>
    <label>Customer</label>

    <select
      className="input"
      value={form.client_id}
      onChange={(e) => {
        const id = e.target.value;

        setForm({
          ...form,
          client_id: id,
          contract_id: ""
        });

        loadContracts(id);
      }}
    >
      <option value="">Select Customer</option>

      {customers.map((customer) => (
        <option
          key={customer.id}
          value={customer.id}
        >
          {customer.name}
        </option>
      ))}
    </select>
  </div>

  <div>
    <label>Contract</label>

    <select
      className="input"
      value={form.contract_id}
      onChange={(e) =>
        setForm({
          ...form,
          contract_id: e.target.value
        })
      }
    >
      <option value="">Select Contract</option>

      {contracts.map((contract) => (
        <option
          key={contract.id}
          value={contract.id}
        >
          {contract.contract_number}
        </option>
      ))}
    </select>
  </div>

  <div>
    <label>Villa</label>

    <input
      className="input"
      placeholder="Select Villa"
    />
  </div>

  <div>
    <label>Technician</label>

    <input
      className="input"
      placeholder="Technician Name"
      value={form.technician_name}
      onChange={(e) =>
        setForm({
          ...form,
          technician_name: e.target.value
        })
      }
    />
  </div>

  <div>
    <label>Service Date</label>

    <input
      type="date"
      className="input"
      value={form.service_date}
      onChange={(e) =>
        setForm({
          ...form,
          service_date: e.target.value
        })
      }
    />
  </div>

  <div>
    <label>Service Type</label>

    <input
      className="input"
      placeholder="AC Cleaning"
      value={form.service_type}
      onChange={(e) =>
        setForm({
          ...form,
          service_type: e.target.value
        })
      }
    />
  </div>

</div>
          <hr />

          <h3>Before Photos</h3>

          <input
            type="file"
            multiple
            className="input"
          />

          <hr />

          <h3>After Photos</h3>

          <input
            type="file"
            multiple
            className="input"
          />

          <hr />

          <h3>Technician Notes</h3>

          <textarea
  className="input"
  rows="6"
  placeholder="Write notes..."
  value={form.technician_notes}
  onChange={(e) =>
    setForm({
      ...form,
      technician_notes: e.target.value
    })
  }
/>

          <hr />

          <h3>Customer Signature</h3>

          <input
            className="input"
            placeholder="Signature image or name"
          />

          <hr />

          <h3>Technician Signature</h3>

          <input
            className="input"
            placeholder="Signature image or name"
          />

          <br />
          <br />

          <button
  className="btn"
  onClick={saveJobCard}
>
  Save Job Card
</button>
<hr />

<div className="card-header">
  <div className="card-title">
    Existing Job Cards
  </div>
</div>

{jobCards.length === 0 ? (

  <div
    style={{
      padding:20,
      color:"#777"
    }}
  >
    No Job Cards Found.
  </div>

) : (

  <table className="table">

    <thead>

      <tr>

        <th>Job Card</th>
        <th>Technician</th>
        <th>Date</th>
        <th>Status</th>

      </tr>

    </thead>

    <tbody>

      {jobCards.map(card=>(

        <tr key={card.id}>

          <td>{card.job_card_no}</td>

          <td>{card.technician_name}</td>

          <td>{card.service_date}</td>

          <td>{card.status}</td>

        </tr>

      ))}

    </tbody>

  </table>

)}
        </div>

      </div>

    </div>
  );
}