const { sendTicketAlert, sendBookingAlert } = require('../notify');
const router = require('express').Router();
const { getDb } = require('../db/database');
const { auth } = require('../middleware/auth');
const crypto = require('crypto');

router.get('/', auth, async (req, res) => {
  try {
    const result = await getDb().query('SELECT * FROM packages ORDER BY ac_units, annual_price');
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/visits', auth, async (req, res) => {
  try {
    const result = await getDb().query(`
      SELECT sv.*, v.villa_number, v.block, cl.name as client_name, c.contract_number, c.package
      FROM service_visits sv
      LEFT JOIN villas v ON sv.villa_id = v.id
      LEFT JOIN contracts c ON sv.contract_id = c.id
      LEFT JOIN clients cl ON c.client_id = cl.id
      ORDER BY sv.visit_date DESC
    `);
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/visits', auth, async (req, res) => {
  try {
    const { contract_id, villa_id, visit_date, service_type, technician, incharge, comments, client_satisfaction, report_url, report_name, status } = req.body;
    const result = await getDb().query(
      'INSERT INTO service_visits (contract_id,villa_id,visit_date,service_type,technician,incharge,comments,client_satisfaction,report_url,report_name,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id',
      [contract_id, villa_id, visit_date, service_type, technician, incharge, comments, client_satisfaction||5, report_url, report_name, status||'scheduled']
    );
    res.json({ id: result.rows[0].id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/visits/:id', auth, async (req, res) => {
  try {
    const { visit_date, service_type, technician, incharge, comments, client_satisfaction, report_url, report_name, status } = req.body;
    await getDb().query(
      'UPDATE service_visits SET visit_date=$1,service_type=$2,technician=$3,incharge=$4,comments=$5,client_satisfaction=$6,report_url=$7,report_name=$8,status=$9 WHERE id=$10',
      [visit_date, service_type, technician, incharge, comments, client_satisfaction, report_url, report_name, status, req.params.id]
    );
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/visits/:id', auth, async (req, res) => {
  try {
    await getDb().query('DELETE FROM service_visits WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/expenses', auth, async (req, res) => {
  try {
    const result = await getDb().query('SELECT * FROM expenses ORDER BY date DESC');
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/expenses', auth, async (req, res) => {
  try {
    const { category, description, amount, date, paid_by, slip_url, slip_name, project } = req.body;
    const result = await getDb().query(
      'INSERT INTO expenses (category,description,amount,date,paid_by,slip_url,slip_name,project) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
      [category, description, parseFloat(amount), date, paid_by, slip_url, slip_name, project]
    );
    res.json({ id: result.rows[0].id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/expenses/:id', auth, async (req, res) => {
  try {
    const { category, description, amount, date, paid_by, slip_url, slip_name, project } = req.body;
    await getDb().query(
      'UPDATE expenses SET category=$1,description=$2,amount=$3,date=$4,paid_by=$5,slip_url=$6,slip_name=$7,project=$8 WHERE id=$9',
      [category, description, parseFloat(amount), date, paid_by, slip_url, slip_name, project, req.params.id]
    );
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/expenses/:id', auth, async (req, res) => {
  try {
    await getDb().query('DELETE FROM expenses WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/expenses/stats', auth, async (req, res) => {
  try {
    const total = await getDb().query('SELECT SUM(amount) as total FROM expenses');
    const byCategory = await getDb().query('SELECT category, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC');
    res.json({ total: parseFloat(total.rows[0].total) || 0, byCategory: byCategory.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/ticket-link', auth, async (req, res) => {
  try {
    const { villa_id, client_name, client_phone } = req.body;
    const token = crypto.randomBytes(16).toString('hex');
    await getDb().query(
      'INSERT INTO client_tickets (token,villa_id,client_name,client_phone) VALUES ($1,$2,$3,$4)',
      [token, villa_id, client_name, client_phone]
    );
    const link = `${process.env.FRONTEND_URL || 'https://amc-manager-gray.vercel.app'}/ticket/${token}`;
    res.json({ link, token });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/ticket/:token', async (req, res) => {
  try {
    const result = await getDb().query('SELECT * FROM client_tickets WHERE token=$1', [req.params.token]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Invalid link' });
    res.json(result.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
router.put('/ticket/:token', async (req, res) => {
  try {
    const { description, photo_url } = req.body;
    await getDb().query(
      'UPDATE client_tickets SET description=$1,photo_url=$2,status=$3 WHERE token=$4',
      [description, photo_url, 'submitted', req.params.token]
    );
    const ticket = await getDb().query('SELECT * FROM client_tickets WHERE token=$1', [req.params.token]);
    if (ticket.rows[0]) sendTicketAlert(ticket.rows[0]);
    res.json({ success: true });  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/tickets-submitted', auth, async (req, res) => {
  try {
    const result = await getDb().query(`
      SELECT ct.*, v.villa_number, v.block
      FROM client_tickets ct
      LEFT JOIN villas v ON ct.villa_id = v.id
      ORDER BY ct.created_at DESC
    `);
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/booking-link', auth, async (req, res) => {
  try {
    const { contract_id, villa_id, client_name, available_dates } = req.body;
    const token = crypto.randomBytes(16).toString('hex');
    await getDb().query(
      'INSERT INTO booking_links (token,contract_id,villa_id,client_name,available_dates) VALUES ($1,$2,$3,$4,$5)',
      [token, contract_id, villa_id, client_name, JSON.stringify(available_dates)]
    );
    const link = `${process.env.FRONTEND_URL || 'https://amc-manager-gray.vercel.app'}/booking/${token}`;
    res.json({ link, token });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/booking/:token', async (req, res) => {
  try {
    const result = await getDb().query('SELECT * FROM booking_links WHERE token=$1', [req.params.token]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Invalid link' });
    res.json(result.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/booking/:token', async (req, res) => {
  try {
    const { selected_date } = req.body;
    await getDb().query(
      'UPDATE booking_links SET selected_date=$1,status=$2 WHERE token=$3',
      [selected_date, 'confirmed', req.params.token]
    );
    const booking = await getDb().query('SELECT * FROM booking_links WHERE token=$1', [req.params.token]);
    if (booking.rows[0]) sendBookingAlert({ ...booking.rows[0], selected_date });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;