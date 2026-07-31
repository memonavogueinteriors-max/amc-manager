const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// Get all bookings
router.get('/', async (req, res) => {
  try {
    const db = getDb();

    const result = await db.query(`
      SELECT *
      FROM service_bookings
      ORDER BY booking_date DESC, created_at DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to load service bookings.' });
  }
});

// Create booking
router.post('/', async (req, res) => {
  try {
    const db = getDb();

    const {
      customer_name,
      mobile,
      whatsapp,
      address,
      google_map,
      service_type,
      booking_date,
      booking_time,
      assigned_technician,
      status,
      price,
      notes,
      created_by
    } = req.body;

    const count = await db.query(
      `SELECT COUNT(*) FROM service_bookings`
    );

    const booking_no =
      'SB-' +
      String(Number(count.rows[0].count) + 1).padStart(4, '0');

    const result = await db.query(
      `
      INSERT INTO service_bookings
      (
        booking_no,
        customer_name,
        mobile,
        whatsapp,
        address,
        google_map,
        service_type,
        booking_date,
        booking_time,
        assigned_technician,
        status,
        price,
        notes,
        created_by
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
      `,
      [
        booking_no,
        customer_name,
        mobile,
        whatsapp,
        address,
        google_map,
        service_type,
        booking_date,
        booking_time,
        assigned_technician,
        status || 'New',
        price || 0,
        notes,
        created_by
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to create booking.' });
  }
});

// Update booking
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();

    const {
      customer_name,
      mobile,
      whatsapp,
      address,
      google_map,
      service_type,
      booking_date,
      booking_time,
      assigned_technician,
      status,
      price,
      notes
    } = req.body;

    const result = await db.query(
      `
      UPDATE service_bookings
      SET
        customer_name=$1,
        mobile=$2,
        whatsapp=$3,
        address=$4,
        google_map=$5,
        service_type=$6,
        booking_date=$7,
        booking_time=$8,
        assigned_technician=$9,
        status=$10,
        price=$11,
        notes=$12,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=$13
      RETURNING *
      `,
      [
        customer_name,
        mobile,
        whatsapp,
        address,
        google_map,
        service_type,
        booking_date,
        booking_time,
        assigned_technician,
        status,
        price,
        notes,
        req.params.id
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to update booking.' });
  }
});

// Delete booking
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();

    await db.query(
      `DELETE FROM service_bookings WHERE id=$1`,
      [req.params.id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to delete booking.' });
  }
});

module.exports = router;