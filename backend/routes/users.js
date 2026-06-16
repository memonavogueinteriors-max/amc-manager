const router = require('express').Router();
const { getDb } = require('../db/database');
const { auth } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

router.get('/', auth, async (req, res) => {
  try {
    const result = await getDb().query('SELECT id, name, email, role, phone, sales_target, active, created_at FROM users ORDER BY name');
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, email, password, role, phone, sales_target } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
    const hash = bcrypt.hashSync(password, 10);
    const result = await getDb().query(
      'INSERT INTO users (name, email, password, role, phone, sales_target) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [name, email, hash, role || 'sales', phone, sales_target || 0]
    );
    res.json({ id: result.rows[0].id });
  } catch(e) { res.status(400).json({ error: 'Email already exists' }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, email, role, phone, sales_target, active } = req.body;
    await getDb().query(
      'UPDATE users SET name=$1, email=$2, role=$3, phone=$4, sales_target=$5, active=$6 WHERE id=$7',
      [name, email, role, phone, sales_target, active, req.params.id]
    );
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/password', auth, async (req, res) => {
  try {
    const { password } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    await getDb().query('UPDATE users SET password=$1 WHERE id=$2', [hash, req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/commissions', auth, async (req, res) => {
  try {
    const result = await getDb().query(`
      SELECT c.*, u.name as user_name, ct.contract_number, ct.monthly_value
      FROM commissions c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN contracts ct ON c.contract_id = ct.id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/commissions', auth, async (req, res) => {
  try {
    const { user_id, contract_id, amount, type, notes } = req.body;
    const result = await getDb().query(
      'INSERT INTO commissions (user_id, contract_id, amount, type, notes) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [user_id, contract_id, amount, type || 'contract_signup', notes]
    );
    res.json({ id: result.rows[0].id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/commissions/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    await getDb().query('UPDATE commissions SET status=$1 WHERE id=$2', [status, req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/sales-stats', auth, async (req, res) => {
  try {
    const result = await getDb().query(`
      SELECT u.id, u.name, u.role, u.sales_target,
        COUNT(c.id) as contracts_count,
        SUM(c.monthly_value) as total_value,
        SUM(cm.amount) as total_commission
      FROM users u
      LEFT JOIN contracts c ON c.sales_person_id = u.id AND c.deleted=false
      LEFT JOIN commissions cm ON cm.user_id = u.id AND cm.status = 'paid'
      WHERE u.role IN ('sales', 'manager') AND u.active = true
      GROUP BY u.id, u.name, u.role, u.sales_target
      ORDER BY total_value DESC NULLS LAST
    `);
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;