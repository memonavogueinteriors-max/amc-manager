const express = require("express");

const router = express.Router();

const { getDb } = require("../db/database");

// Get all Job Cards
router.get("/", async (req, res) => {
  try {
    const db = getDb();

    const result = await db.query(`
      SELECT
        jc.*,
        c.name AS customer_name,
        jc.technician_name,
        v.villa_number AS property_type,
        ct.contract_number
      FROM technician_job_cards jc
      LEFT JOIN clients c
        ON jc.client_id = c.id
      LEFT JOIN villas v
        ON jc.villa_id = v.id
      LEFT JOIN contracts ct
        ON jc.contract_id = ct.id
      ORDER BY jc.created_at DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Unable to load Technician Job Cards."
    });
  }
});
// Create Job Card
router.post("/", async (req, res) => {
  try {

    const db = getDb();

  const {
  contract_id,
  client_id,
  villa_id,
  technician_name,
  service_date,
      service_type,
      before_photos,
      after_photos,
      technician_notes,
      customer_signature,
      technician_signature,
      status
    } = req.body;

    const count = await db.query(
      "SELECT COUNT(*) FROM technician_job_cards"
    );

    const job_card_no =
      "JC-" +
      String(Number(count.rows[0].count) + 1).padStart(5, "0");

    const result = await db.query(
      `
      INSERT INTO technician_job_cards
      (
        job_card_no,
        contract_id,
        client_id,
        villa_id,
        technician_name,
        service_date,
        service_type,
        before_photos,
        after_photos,
        technician_notes,
        customer_signature,
        technician_signature,
        status
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
      `,
      [
  job_card_no,
  contract_id || null,
  client_id || null,
  villa_id || null,
  technician_name,
  service_date || null,
  service_type,
  before_photos || [],
  after_photos || [],
  technician_notes,
  customer_signature,
  technician_signature,
  status || "Pending"
]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Unable to create Job Card."
    });
  }
});
// Get Customers
router.get("/customers", async (req, res) => {
  try {
    const db = getDb();

    const result = await db.query(`
      SELECT
        id,
        name
      FROM clients
      ORDER BY name ASC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Unable to load customers."
    });
  }
});
// Get Contracts by Customer
router.get("/contracts/:customerId", async (req, res) => {

  console.log("Contracts route hit:", req.params.customerId);

  try {

    const db = getDb();

    console.log("Loading contracts for customer:", req.params.customerId);

const result = await db.query(
      `
      SELECT
        c.id,
        c.contract_number,
        c.villa_id,
        c.client_id,
        cl.name AS customer_name,
        v.villa_number
      FROM contracts c
      LEFT JOIN clients cl
        ON c.client_id = cl.id
      LEFT JOIN villas v
        ON c.villa_id = v.id
      WHERE c.client_id = $1
        AND COALESCE(c.deleted, false) = false
      ORDER BY c.contract_number
      `,
      [req.params.customerId]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Unable to load contracts."
    });
  }
});
// Get Technicians
router.get("/technicians", async (req, res) => {
  try {

    const db = getDb();

    const result = await db.query(`
      SELECT
        id,
        name
      FROM users
      WHERE LOWER(role) = 'technician'
      ORDER BY name
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Unable to load technicians."
    });
  }
});
// Get Villa by Contract
router.get("/villa/:contractId", async (req, res) => {
  try {

    const db = getDb();

    const result = await db.query(
      `
      SELECT
  v.id,
  v.villa_number
FROM contracts c
JOIN villas v
  ON c.villa_id = v.id
WHERE c.id = $1
      `,
      [req.params.contractId]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Unable to load villa."
    });
  }
});
// Get Single Job Card
router.get("/:id", async (req, res) => {
  try {

    const db = getDb();

    const result = await db.query(
      `
      SELECT *
      FROM technician_job_cards
      WHERE id = $1
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Job Card not found."
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Unable to load Job Card."
    });
  }
});
// Update Job Card
router.put("/:id", async (req, res) => {
  try {

    const db = getDb();

    const {
      contract_id,
      client_id,
      villa_id,
      technician_name,
      service_date,
      service_type,
      before_photos,
      after_photos,
      technician_notes,
      customer_signature,
      technician_signature,
      status
    } = req.body;

    const result = await db.query(
      `
      UPDATE technician_job_cards
      SET
        contract_id = $1,
        client_id = $2,
        villa_id = $3,
        technician_name = $4,
        service_date = $5,
        service_type = $6,
        before_photos = $7,
        after_photos = $8,
        technician_notes = $9,
        customer_signature = $10,
        technician_signature = $11,
        status = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
      `,
      [
        contract_id,
        client_id,
        villa_id,
        technician_name,
        service_date,
        service_type,
        before_photos || [],
        after_photos || [],
        technician_notes,
        customer_signature,
        technician_signature,
        status,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Job Card not found."
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Unable to update Job Card."
    });
  }
});
module.exports = router;
