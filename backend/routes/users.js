const router = require('express').Router();
const { getDb } = require('../db/database');
const { auth } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

function getStaffPrefix(role = '') {
  const r = role.toLowerCase();
  if (r === 'sales') return 'VAC-SALES';
  if (r === 'manager') return 'VAC-MGR';
  if (r === 'owner' || r === 'admin') return 'VAC-OWN';
  return 'VAC-USER';
}

async function generateUniqueStaffId(db, role = 'sales') {
  const prefix = getStaffPrefix(role);

  const result = await db.query(
    `SELECT unique_staff_id
     FROM users
     WHERE unique_staff_id LIKE $1
     ORDER BY unique_staff_id DESC
     LIMIT 1`,
    [`${prefix}-%`]
  );

  let next = 1;

  if (result.rows.length && result.rows[0].unique_staff_id) {
    const lastNumber = parseInt(result.rows[0].unique_staff_id.split('-').pop(), 10);
    if (!isNaN(lastNumber)) next = lastNumber + 1;
  }

  return `${prefix}-${String(next).padStart(3, '0')}`;
}

router.get('/', auth, async (req, res) => {
  try {
    const result = await getDb().query(
      `SELECT
        id,
        name,
        email,
        role,
        phone,
        sales_target,
        active,
        unique_staff_id,
        commission_type,
        commission_value,
        google_calendar_connected,
        google_calendar_email,
        created_at
       FROM users
       ORDER BY name`
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, email, password, role, phone, sales_target, active, commission_type, commission_value } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password required' });
    }

    const db = getDb();
    const userRole = role || 'sales';
    const uniqueStaffId = await generateUniqueStaffId(db, userRole);
    const hash = bcrypt.hashSync(password, 10);

    const result = await db.query(
      `INSERT INTO users (
        name,
        email,
        password,
        role,
        phone,
        sales_target,
        active,
        unique_staff_id,
        commission_type,
        commission_value
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id, unique_staff_id`,
      [
        name,
        email,
        hash,
        userRole,
        phone || '',
        sales_target || 0,
        active !== false,
        uniqueStaffId,
        commission_type || 'percentage',
        parseFloat(commission_value || 0)
      ]
    );

    res.json({
      id: result.rows[0].id,
      unique_staff_id: result.rows[0].unique_staff_id
    });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Email already exists' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, email, role, phone, sales_target, active, commission_type, commission_value } = req.body;

    const result = await getDb().query(
      `UPDATE users SET
        name=$1,
        email=$2,
        role=$3,
        phone=$4,
        sales_target=$5,
        active=$6,
        commission_type=$7,
        commission_value=$8
       WHERE id=$9
       RETURNING id`,
      [
        name,
        email,
        role,
        phone || '',
        sales_target || 0,
        active !== false,
        commission_type || 'percentage',
        parseFloat(commission_value || 0),
        req.params.id
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id/password', auth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    const hash = bcrypt.hashSync(password, 10);

    await getDb().query(
      'UPDATE users SET password=$1 WHERE id=$2',
      [hash, req.params.id]
    );

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id/status', auth, async (req, res) => {
  try {
    const { active } = req.body;
    const userId = parseInt(req.params.id);

    if (req.user && req.user.id === userId) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    const target = await getDb().query(
      'SELECT id, role FROM users WHERE id=$1',
      [userId]
    );

    if (!target.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (target.rows[0].role === 'admin' || target.rows[0].role === 'owner') {
      return res.status(400).json({ error: 'Owner/Admin account cannot be deactivated' });
    }

    await getDb().query(
      'UPDATE users SET active=$1 WHERE id=$2',
      [active === true, userId]
    );

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (req.user && req.user.id === userId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const target = await getDb().query(
      'SELECT id, role FROM users WHERE id=$1',
      [userId]
    );

    if (!target.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (target.rows[0].role === 'admin' || target.rows[0].role === 'owner') {
      return res.status(400).json({ error: 'Owner/Admin account cannot be deleted' });
    }

    await getDb().query(
      'DELETE FROM users WHERE id=$1',
      [userId]
    );

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/commissions', auth, async (req, res) => {
  try {
    const result = await getDb().query(`
      SELECT c.*, u.name as user_name, u.unique_staff_id, ct.contract_number, ct.monthly_value
      FROM commissions c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN contracts ct ON c.contract_id = ct.id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/commissions', auth, async (req, res) => {
  try {
    const { user_id, contract_id, amount, type, notes } = req.body;

    const result = await getDb().query(
      'INSERT INTO commissions (user_id, contract_id, amount, type, notes) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [user_id, contract_id, amount, type || 'contract_signup', notes || '']
    );

    res.json({ id: result.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/commissions/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;

    await getDb().query(
      'UPDATE commissions SET status=$1 WHERE id=$2',
      [status, req.params.id]
    );

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/sales-stats', auth, async (req, res) => {
  try {
    const result = await getDb().query(`
      SELECT
        u.id,
        u.name,
        u.role,
        u.unique_staff_id,
        u.sales_target,
        u.commission_type,
        u.commission_value,
        COUNT(DISTINCT cl.id) as clients_count,
        COUNT(DISTINCT c.id) as contracts_count,
        COALESCE(SUM(c.monthly_value), 0) as total_value,
        CASE
          WHEN u.commission_type = 'fixed' THEN COUNT(DISTINCT c.id) * COALESCE(u.commission_value, 0)
          ELSE COALESCE(SUM(c.monthly_value), 0) * COALESCE(u.commission_value, 0) / 100
        END as commission_due,
        COALESCE(SUM(cm.amount), 0) as paid_commission
      FROM users u
      LEFT JOIN clients cl ON cl.created_by_user_id = u.id AND cl.deleted=false
      LEFT JOIN contracts c ON c.sales_person_id = u.id AND c.deleted=false
      LEFT JOIN commissions cm ON cm.user_id = u.id AND cm.status = 'paid'
      WHERE u.role IN ('sales', 'manager') AND u.active = true
      GROUP BY u.id, u.name, u.role, u.unique_staff_id, u.sales_target, u.commission_type, u.commission_value
      ORDER BY total_value DESC NULLS LAST
    `);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
