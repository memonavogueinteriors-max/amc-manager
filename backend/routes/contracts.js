const router = require('express').Router();
const { getDb } = require('../db/database');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT c.*, v.villa_number, v.block, cl.name as client_name,
             u.name as rm_name, sp.name as sales_person_name
      FROM contracts c
      LEFT JOIN villas v ON c.villa_id = v.id
      LEFT JOIN clients cl ON c.client_id = cl.id
      LEFT JOIN users u ON c.relationship_manager_id = u.id
      LEFT JOIN users sp ON c.sales_person_id = sp.id
      WHERE c.deleted = false
    `;
    const params = [];
    if (status) { sql += ` AND c.status = $1`; params.push(status); }
    sql += ' ORDER BY c.created_at DESC';
    const result = await getDb().query(sql, params);
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const db = getDb();
    const total = await db.query("SELECT COUNT(*) as c FROM contracts WHERE deleted=false");
    const active = await db.query("SELECT COUNT(*) as c FROM contracts WHERE status='active' AND deleted=false");
    const expiring = await db.query("SELECT COUNT(*) as c FROM contracts WHERE status='expiring' AND deleted=false");
    const pending = await db.query("SELECT COUNT(*) as c FROM contracts WHERE status='pending' AND deleted=false");
    const revenue = await db.query("SELECT SUM(monthly_value) as total FROM contracts WHERE status IN ('active','expiring') AND deleted=false");
    res.json({
      total: parseInt(total.rows[0].c),
      active: parseInt(active.rows[0].c),
      expiring: parseInt(expiring.rows[0].c),
      pending: parseInt(pending.rows[0].c),
      monthly_revenue: parseFloat(revenue.rows[0].total) || 0
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      villa_id, client_id, package: pkg, monthly_value,
      start_date, end_date, property_type, relationship_manager_id,
      sales_person_id, commission_amount, notes
    } = req.body;

    if (!villa_id || !client_id || !pkg || !monthly_value || !start_date || !end_date)
      return res.status(400).json({ error: 'All fields required' });

    const year = new Date().getFullYear();
    const count = await getDb().query("SELECT COUNT(*) as c FROM contracts");
    const num = String(parseInt(count.rows[0].c) + 1).padStart(3, '0');
    const contract_number = `VAC-${year}-${num}`;
    const file_number = `FILE-${String(parseInt(count.rows[0].c) + 1).padStart(4, '0')}`;

    const pkgVisits = { Silver: 3, Gold: 3, Platinum: 3 };
    const pkgCallouts = { Silver: 1, Gold: 2, Platinum: 3 };

    const startDate = new Date(start_date);
    const nextService = new Date(startDate);
    nextService.setMonth(nextService.getMonth() + 4);
    const next_service_date = nextService.toISOString().split('T')[0];

    const result = await getDb().query(
      `INSERT INTO contracts (
        contract_number, file_number, villa_id, client_id, package,
        monthly_value, start_date, end_date, property_type,
        relationship_manager_id, sales_person_id, commission_amount,
        visits_total, emergency_callouts_total, next_service_date, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [
        contract_number, file_number, parseInt(villa_id), parseInt(client_id),
        pkg, parseFloat(monthly_value), start_date, end_date,
        property_type || 'Villa',
        relationship_manager_id ? parseInt(relationship_manager_id) : null,
        sales_person_id ? parseInt(sales_person_id) : null,
        parseFloat(commission_amount || 0),
        pkgVisits[pkg] || 3, pkgCallouts[pkg] || 1,
        next_service_date, notes || ''
      ]
    );

    if (sales_person_id && commission_amount && parseFloat(commission_amount) > 0) {
      await getDb().query(
        'INSERT INTO commissions (user_id, contract_id, amount, type) VALUES ($1,$2,$3,$4)',
        [parseInt(sales_person_id), result.rows[0].id, parseFloat(commission_amount), 'contract_signup']
      );
    }

    res.json({ id: result.rows[0].id, contract_number, file_number });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const {
      package: pkg, monthly_value, start_date, end_date, status,
      relationship_manager_id, sales_person_id, property_type,
      commission_amount, next_service_date, notes
    } = req.body;
    await getDb().query(
      `UPDATE contracts SET
        package=$1, monthly_value=$2, start_date=$3, end_date=$4,
        status=$5, relationship_manager_id=$6, notes=$7,
        property_type=$8, sales_person_id=$9, commission_amount=$10,
        next_service_date=$11
      WHERE id=$12`,
      [
        pkg, parseFloat(monthly_value), start_date, end_date, status,
        relationship_manager_id ? parseInt(relationship_manager_id) : null,
        notes || '', property_type || 'Villa',
        sales_person_id ? parseInt(sales_person_id) : null,
        parseFloat(commission_amount || 0),
        next_service_date || null,
        req.params.id
      ]
    );
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await getDb().query('UPDATE contracts SET deleted=true WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/recycle', auth, async (req, res) => {
  try {
    const result = await getDb().query(`
      SELECT c.*, v.villa_number, v.block, cl.name as client_name
      FROM contracts c
      LEFT JOIN villas v ON c.villa_id = v.id
      LEFT JOIN clients cl ON c.client_id = cl.id
      WHERE c.deleted = true ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/recycle/:id', auth, async (req, res) => {
  try {
    await getDb().query('UPDATE contracts SET deleted=false WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;