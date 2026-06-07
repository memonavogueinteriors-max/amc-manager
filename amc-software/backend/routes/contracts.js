const router = require('express').Router();
const db = global.amcDb;
const { auth } = require('../middleware/auth');

const contractQuery = `
  SELECT c.*, v.villa_number, v.block, cl.name as client_name, cl.phone as client_phone,
         u.name as rm_name
  FROM contracts c
  LEFT JOIN villas v ON c.villa_id = v.id
  LEFT JOIN clients cl ON c.client_id = cl.id
  LEFT JOIN users u ON c.relationship_manager_id = u.id
`;

router.get('/', auth, (req, res) => {
  const { status, package: pkg } = req.query;
  let query = contractQuery;
  const params = [];
  const conditions = [];
  if (status) { conditions.push('c.status = ?'); params.push(status); }
  if (pkg) { conditions.push('c.package = ?'); params.push(pkg); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY c.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/stats', auth, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM contracts').get().c;
  const active = db.prepare("SELECT COUNT(*) as c FROM contracts WHERE status='active'").get().c;
  const expiring = db.prepare("SELECT COUNT(*) as c FROM contracts WHERE status='expiring'").get().c;
  const pending = db.prepare("SELECT COUNT(*) as c FROM contracts WHERE status='pending'").get().c;
  const revenue = db.prepare("SELECT SUM(monthly_value) as total FROM contracts WHERE status IN ('active','expiring')").get().total || 0;
  res.json({ total, active, expiring, pending, monthly_revenue: revenue });
});

router.get('/:id', auth, (req, res) => {
  const contract = db.prepare(contractQuery + ' WHERE c.id = ?').get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Not found' });
  res.json(contract);
});

router.post('/', auth, (req, res) => {
  const { villa_id, client_id, package: pkg, monthly_value, start_date, end_date, relationship_manager_id, notes } = req.body;
  if (!villa_id || !client_id || !pkg || !monthly_value || !start_date || !end_date)
    return res.status(400).json({ error: 'Missing required fields' });
  const count = db.prepare('SELECT COUNT(*) as c FROM contracts').get().c;
  const contract_number = `AMC-${String(count + 1).padStart(3, '0')}`;
  const result = db.prepare(
    'INSERT INTO contracts (contract_number, villa_id, client_id, package, monthly_value, start_date, end_date, relationship_manager_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(contract_number, villa_id, client_id, pkg, monthly_value, start_date, end_date, relationship_manager_id, notes);
  res.json({ id: result.lastInsertRowid, contract_number });
});

router.put('/:id', auth, (req, res) => {
  const { package: pkg, monthly_value, start_date, end_date, status, relationship_manager_id, notes } = req.body;
  db.prepare('UPDATE contracts SET package=?, monthly_value=?, start_date=?, end_date=?, status=?, relationship_manager_id=?, notes=? WHERE id=?')
    .run(pkg, monthly_value, start_date, end_date, status, relationship_manager_id, notes, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM contracts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
