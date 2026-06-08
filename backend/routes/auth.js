const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');
const { SECRET } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const db = getDb();
    const result = await db.prepare('SELECT * FROM users WHERE email = $1').get(email);
    if (!result || !bcrypt.compareSync(password, result.password))
      return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: result.id, name: result.name, email: result.email, role: result.role }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: result.id, name: result.name, email: result.email, role: result.role } });
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
    const result = await db.prepare('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id').run(name, email, hash, role || 'rm');
    res.json({ id: result.lastInsertRowid, name, email, role: role || 'rm' });
  } catch (e) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

module.exports = router;