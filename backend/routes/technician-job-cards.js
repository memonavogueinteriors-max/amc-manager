const express = require("express");

const router = express.Router();

const { getDb } = require("../db/database");

// Get all Job Cards
router.get("/", async (req, res) => {
  try {
    const db = getDb();

    const result = await db.query(`
      SELECT *
      FROM technician_job_cards
      ORDER BY created_at DESC
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
module.exports = router;