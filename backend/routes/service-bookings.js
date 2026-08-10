const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { auth } = require('../middleware/auth');

const STATUSES = [
  'New Lead',
  'Confirmed',
  'Technician Assigned',
  'On the Way',
  'Work Started',
  'Completed',
  'Invoice Sent',
  'Paid',
  'Cancelled'
];

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeMoney(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function validateBooking(body = {}, isUpdate = false) {
  const booking = {
    customer_name: normalizeString(body.customer_name),
    mobile: normalizeString(body.mobile),
    whatsapp: normalizeString(body.whatsapp),
    email: normalizeString(body.email),
    address: normalizeString(body.address),
    google_maps_link: normalizeString(body.google_maps_link || body.google_map),
    service_type: normalizeString(body.service_type),
    booking_date: normalizeString(body.booking_date),
    preferred_time: normalizeString(body.preferred_time || body.booking_time),
    assigned_technician: normalizeString(body.assigned_technician),
    status: normalizeString(body.status) || 'New Lead',
    price: normalizeMoney(body.price),
    discount: normalizeMoney(body.discount),
    payment_method: normalizeString(body.payment_method),
    notes: normalizeString(body.notes)
  };

  const errors = [];

  if (!booking.customer_name) errors.push('Customer name is required.');
  if (!booking.mobile) errors.push('Mobile is required.');
  if (!booking.service_type) errors.push('Service type is required.');
  if (!booking.booking_date) errors.push('Booking date is required.');
  if (booking.booking_date && Number.isNaN(Date.parse(booking.booking_date))) {
    errors.push('Booking date is invalid.');
  }
  if (booking.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.email)) {
    errors.push('Email is invalid.');
  }
  if (!STATUSES.includes(booking.status)) {
    errors.push(`Status must be one of: ${STATUSES.join(', ')}.`);
  }
  if (!Number.isFinite(booking.price) || booking.price < 0) {
    errors.push('Price must be a non-negative number.');
  }
  if (!Number.isFinite(booking.discount) || booking.discount < 0) {
    errors.push('Discount must be a non-negative number.');
  }
  if (booking.discount > booking.price) {
    errors.push('Discount cannot be greater than price.');
  }

  booking.final_amount = Math.max(booking.price - booking.discount, 0);

  if (isUpdate && !body) errors.push('Booking data is required.');

  return { booking, errors };
}

async function generateBookingNumber(db) {
  const result = await db.query(`
    SELECT booking_no
    FROM service_bookings sb
    LEFT JOIN users u ON u.id = sb.created_by
    WHERE booking_no ~ '^SB-[0-9]+$'
    ORDER BY CAST(SUBSTRING(booking_no FROM 4) AS INTEGER) DESC
    LIMIT 1
  `);

  const lastNumber = result.rows[0]
    ? Number(result.rows[0].booking_no.replace('SB-', ''))
    : 0;

  return `SB-${String(lastNumber + 1).padStart(4, '0')}`;
}

router.get('/statuses', auth, (req, res) => {
  res.json(STATUSES);
});

router.get('/', auth, async (req, res) => {
  try {
    const db = getDb();
    const { search = '', status = '', service = '' } = req.query;
    const conditions = [];
    const values = [];

    if (normalizeString(search)) {
      values.push(`%${normalizeString(search)}%`);
      conditions.push(`(
        booking_no ILIKE $${values.length}
        OR customer_name ILIKE $${values.length}
        OR mobile ILIKE $${values.length}
        OR whatsapp ILIKE $${values.length}
        OR email ILIKE $${values.length}
        OR assigned_technician ILIKE $${values.length}
      )`);
    }

    if (normalizeString(status)) {
      values.push(normalizeString(status));
      conditions.push(`status = $${values.length}`);
    }

    if (normalizeString(service)) {
      values.push(normalizeString(service));
      conditions.push(`service_type = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(`
      SELECT
        sb.id,
        booking_no,
        customer_name,
        mobile,
        whatsapp,
        email,
        address,
        COALESCE(sb.google_maps_link, sb.google_map, '') AS google_maps_link,
        service_type,
        booking_date,
        COALESCE(sb.preferred_time, sb.booking_time::text, '') AS preferred_time,
        assigned_technician,
        status,
        price,
        discount,
        final_amount,
        payment_method,
        notes,
        created_by,
        u.name AS salesperson_name,
        sb.commission_rate,
        sb.commission_amount,
        sb.created_at,
        sb.updated_at
      FROM service_bookings sb
      LEFT JOIN users u ON u.id = sb.created_by
      ${whereClause}
      ORDER BY sb.booking_date DESC, sb.created_at DESC
    `, values);

    res.json(result.rows);
  } catch (err) {
    console.error('Service bookings load error:', err);
    res.status(500).json({ error: 'Unable to load service bookings.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await getDb().query(`
      SELECT
        *,
        COALESCE(sb.google_maps_link, sb.google_map, '') AS google_maps_link,
        COALESCE(sb.preferred_time, sb.booking_time::text, '') AS preferred_time
      FROM service_bookings sb
      LEFT JOIN users u ON u.id = sb.created_by
      WHERE sb.id = $1
    `, [req.params.id]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Service booking not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Service booking load error:', err);
    res.status(500).json({ error: 'Unable to load service booking.' });
  }
});

router.post('/', auth, async (req, res) => {
  const { booking, errors } = validateBooking(req.body);

  if (errors.length) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  const db = getDb();
  let client;

  try {
    client = await db.connect();
    await client.query('BEGIN');
    await client.query('LOCK TABLE service_bookings IN EXCLUSIVE MODE');

    const bookingNo = await generateBookingNumber(client);

    const result = await client.query(`
      INSERT INTO service_bookings (
        booking_no,
        customer_name,
        mobile,
        whatsapp,
        email,
        address,
        google_map,
        google_maps_link,
        service_type,
        booking_date,
        preferred_time,
        assigned_technician,
        status,
        price,
        discount,
        final_amount,
        payment_method,
        notes,
        created_by,
        sb.commission_rate,
        commission_amount
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
      )
      RETURNING *
    `, [
      bookingNo,
      booking.customer_name,
      booking.mobile,
      booking.whatsapp,
      booking.email,
      booking.address,
      booking.google_maps_link,
      booking.google_maps_link,
      booking.service_type,
      booking.booking_date,
      booking.preferred_time,
      booking.assigned_technician,
      booking.status,
      booking.price,
      booking.discount,
      booking.final_amount,
      booking.payment_method,
      booking.notes,
      req.user?.id || null,
      10,
      Number((booking.price * 0.10).toFixed(2))
    ]);

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Service booking create error:', err);
    res.status(500).json({ error: 'Unable to create service booking.' });
  } finally {
    if (client) client.release();
  }
});

router.put('/:id', auth, async (req, res) => {
  const { booking, errors } = validateBooking(req.body, true);

  if (errors.length) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  try {
    const result = await getDb().query(`
      UPDATE service_bookings
      SET
        customer_name = $1,
        mobile = $2,
        whatsapp = $3,
        email = $4,
        address = $5,
        google_map = $6,
        google_maps_link = $7,
        service_type = $8,
        booking_date = $9,
        preferred_time = $10,
        assigned_technician = $11,
        status = $12,
        price = $13,
        discount = $14,
        final_amount = $15,
        payment_method = $16,
        notes = $17,
        commission_rate = 10,
        commission_amount = ROUND($13 * 0.10, 2),
        updated_at = CURRENT_TIMESTAMP
      WHERE sb.id = $18
      RETURNING *
    `, [
      booking.customer_name,
      booking.mobile,
      booking.whatsapp,
      booking.email,
      booking.address,
      booking.google_maps_link,
      booking.google_maps_link,
      booking.service_type,
      booking.booking_date,
      booking.preferred_time,
      booking.assigned_technician,
      booking.status,
      booking.price,
      booking.discount,
      booking.final_amount,
      booking.payment_method,
      booking.notes,
      req.params.id
    ]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Service booking not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Service booking update error:', err);
    res.status(500).json({ error: 'Unable to update service booking.' });
  }
});
router.post('/:id/job-card', auth, async (req, res) => {
  try {
    const db = getDb();

    // Load booking
    const bookingResult = await db.query(
      `SELECT * FROM service_bookings WHERE id = $1`,
      [req.params.id]
    );

    if (!bookingResult.rows.length) {
      return res.status(404).json({
        error: 'Service booking not found.'
      });
    }

    const booking = bookingResult.rows[0];

    // Existing job card?
    const existing = await db.query(
      `SELECT *
       FROM technician_job_cards
       WHERE service_booking_id = $1
       LIMIT 1`,
      [booking.id]
    );

    if (existing.rows.length) {
      return res.json(existing.rows[0]);
    }

    // Generate Job Card Number
    const count = await db.query(
      `SELECT COUNT(*) FROM technician_job_cards`
    );

    const job_card_no =
      'JC-' +
      String(Number(count.rows[0].count) + 1).padStart(5, '0');

    // Create Job Card
    const result = await db.query(
      `
      INSERT INTO technician_job_cards
      (
        job_card_no,
        service_booking_id,
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
      (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
      )
      RETURNING *
      `,
      [
        job_card_no,
        booking.id,
        null,
        null,
        null,
        booking.assigned_technician || '',
        booking.booking_date,
        booking.service_type,
        [],
        [],
        booking.notes || '',
        '',
        '',
        'Pending'
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Unable to create Job Card.'
    });
  }
});
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await getDb().query(
      'DELETE FROM service_bookings WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Service booking not found.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Service booking delete error:', err);
    res.status(500).json({ error: 'Unable to delete service booking.' });
  }
});

module.exports = router;













