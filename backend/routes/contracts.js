const router = require('express').Router();
const { getDb } = require('../db/database');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT c.*, v.villa_number, v.block, cl.name as client_name, u.name as rm_name
               FROM contracts c
               LEFT JOIN villas v ON c.villa_id = v.id
               LEFT JOIN clients cl ON c.client_id = cl.id
               LEFT JOIN users u ON c.relationship_manager_id = u.id`;
    const params = [];
    if (status) { sql += ` WHERE c.status = $1`; params.push(status); }
    sql += ' ORDER BY c.created_at DESC';
    const result = await getDb().query(sql, params);
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const db = getDb();
    const total = await db.query('SELECT COUNT(*) as c FROM contracts');
    const active = await db.query("SELECT COUNT(*) as c FROM contracts WHERE status='active'");
    const expiring = await db.query("SELECT COUNT(*) as c FROM contracts WHERE status='expiring'");
    const pending = await db.query("SELECT COUNT(*) as c FROM contracts WHERE status='pending'");
    const revenue = await db.query("SELECT SUM(monthly_value) as total FROM contracts WHERE status IN ('active','expiring')");
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
    const { villa_id, client_id, package: pkg, monthly_value, start_date, end_date, relationship_manager_id, notes } = req.body;
    if (!villa_id || !client_id || !pkg || !monthly_value || !start_date || !end_date)
      return res.status(400).json({ error: 'All fields required' });
    const count = await getDb().query('SELECT COUNT(*) as c FROM contracts');
    const contract_number = `AMC-${String(parseInt(count.rows[0].c) + 1).padStart(3,'0')}`;
    const result = await getDb().query(
      'INSERT INTO contracts (contract_number,villa_id,client_id,package,monthly_value,start_date,end_date,relationship_manager_id,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
      [contract_number, parseInt(villa_id), parseInt(client_id), pkg, parseFloat(monthly_value), start_date, end_date, relationship_manager_id ? parseInt(relationship_manager_id) : null, notes]
    );
    res.json({ id: result.rows[0].id, contract_number });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { package: pkg, monthly_value, start_date, end_date, status, relationship_manager_id, notes } = req.body;
    await getDb().query(
      'UPDATE contracts SET package=$1,monthly_value=$2,start_date=$3,end_date=$4,status=$5,relationship_manager_id=$6,notes=$7 WHERE id=$8',
      [pkg, parseFloat(monthly_value), start_date, end_date, status, relationship_manager_id ? parseInt(relationship_manager_id) : null, notes, req.params.id]
    );
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await getDb().query('DELETE FROM contracts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;