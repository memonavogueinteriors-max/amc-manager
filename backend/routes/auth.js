const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');
const { SECRET } = require('../middleware/auth');

async function generateUniqueStaffId(db) {
  const result = await db.query(
    `SELECT unique_staff_id
     FROM users
     WHERE unique_staff_id LIKE 'VAC%'
     ORDER BY CAST(REPLACE(unique_staff_id, 'VAC', '') AS INTEGER) DESC
     LIMIT 1`
  );

  let next = 1;

  if (result.rows.length && result.rows[0].unique_staff_id) {
    const lastNumber = parseInt(result.rows[0].unique_staff_id.replace('VAC', ''), 10);
    if (!isNaN(lastNumber)) next = lastNumber + 1;
  }

  return 'VAC' + String(next).padStart(3, '0');
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const db = getDb();
    const result = await db.query('SELECT * FROM users WHERE email=$1', [email]);
    let user = result.rows[0];

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.unique_staff_id) {
      const uniqueStaffId = await generateUniqueStaffId(db);
      const updated = await db.query(
        'UPDATE users SET unique_staff_id=$1 WHERE id=$2 RETURNING *',
        [uniqueStaffId, user.id]
      );
      user = updated.rows[0];
    }

    const tokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      unique_staff_id: user.unique_staff_id,
      commission_type: user.commission_type,
      commission_value: user.commission_value
    };

    const token = jwt.sign(tokenPayload, SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: tokenPayload
    });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  try {
    const db = getDb();
    const hash = bcrypt.hashSync(password, 10);
    const userRole = role || 'sales';
    const uniqueStaffId = await generateUniqueStaffId(db);

    const result = await db.query(
      `INSERT INTO users (name,email,password,role,unique_staff_id)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, unique_staff_id`,
      [name, email, hash, userRole, uniqueStaffId]
    );

    res.json({
      id: result.rows[0].id,
      name,
      email,
      role: userRole,
      unique_staff_id: result.rows[0].unique_staff_id
    });
  } catch(e) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

module.exports = router;
