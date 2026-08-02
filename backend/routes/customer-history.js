const express = require("express");

const router = express.Router();

const { getDb } = require("../db/database");

// Search Customers
router.get("/search", async (req, res) => {
  try {
    const db = getDb();

    const search = `%${req.query.q || ""}%`;

    const result = await db.query(
      `
   SELECT
  id,
  name,
  phone,
  email
FROM clients
WHERE
  deleted = false
  AND (
    name ILIKE $1
    OR phone ILIKE $1
    OR email ILIKE $1
  )
ORDER BY name ASC
LIMIT 25
      `,
      [search]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Unable to search customers."
    });
  }
});

// Customer History
router.get("/:id", async (req, res) => {
  try {
    const db = getDb();

    const customerResult = await db.query(
      `
      SELECT *
      FROM clients
      WHERE id = $1
      `,
      [req.params.id]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        message: "Customer not found."
      });
    }

    const customer = customerResult.rows[0];

    const contractsResult = await db.query(
      `
      SELECT *
      FROM contracts
      WHERE client_id = $1
      ORDER BY created_at DESC
      `,
      [req.params.id]
    );

   const bookingsResult = await db.query(
  `
  SELECT *
  FROM service_bookings
  WHERE customer_name = $1
  ORDER BY booking_date DESC
  `,
  [
    customer.name
  ]
);

    res.json({
      customer,
      contracts: contractsResult.rows,
      serviceBookings: bookingsResult.rows
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Unable to load customer history."
    });
  }
});

module.exports = router;