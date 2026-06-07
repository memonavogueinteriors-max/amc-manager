const express = require('express');
const db = global.amcDb;
const { auth } = require('../middleware/auth');

// ── CLIENTS ──────────────────────────────────────────────
const clientsRouter = express.Router();

clientsRouter.get('/', auth, (req, res) => {
  const clients = db.prepare(`
    SELECT cl.*, COUNT(c.id) as contract_count, SUM(c.monthly_value) as total_monthly
    FROM clients cl
    LEFT JOIN contracts c ON cl.id = c.client_id AND c.status IN ('active','expiring')
    GROUP BY cl.id ORDER BY cl.name
  `).all();
  res.json(clients);
});

clientsRouter.get('/:id', auth, (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  client.contracts = db.prepare('SELECT * FROM contracts WHERE client_id = ?').all(req.params.id);
  client.villas = db.prepare('SELECT * FROM villas WHERE client_id = ?').all(req.params.id);
  res.json(client);
});

clientsRouter.post('/', auth, (req, res) => {
  const { name, phone, email, address, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const result = db.prepare('INSERT INTO clients (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)').run(name, phone, email, address, notes);
  res.json({ id: result.lastInsertRowid });
});

clientsRouter.put('/:id', auth, (req, res) => {
  const { name, phone, email, address, notes } = req.body;
  db.prepare('UPDATE clients SET name=?, phone=?, email=?, address=?, notes=? WHERE id=?').run(name, phone, email, address, notes, req.params.id);
  res.json({ success: true });
});

clientsRouter.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── VILLAS ───────────────────────────────────────────────
const villasRouter = express.Router();

villasRouter.get('/', auth, (req, res) => {
  const villas = db.prepare(`
    SELECT v.*, cl.name as client_name, cl.phone as client_phone,
           c.contract_number, c.package, c.status as contract_status,
           c.monthly_value, c.end_date
    FROM villas v
    LEFT JOIN clients cl ON v.client_id = cl.id
    LEFT JOIN contracts c ON v.id = c.villa_id AND c.status IN ('active','expiring','pending')
    ORDER BY v.block, v.villa_number
  `).all();
  res.json(villas);
});

villasRouter.post('/', auth, (req, res) => {
  const { villa_number, block, client_id, bedrooms, size_sqft, notes } = req.body;
  if (!villa_number || !block) return res.status(400).json({ error: 'Villa number and block required' });
  const result = db.prepare('INSERT INTO villas (villa_number, block, client_id, bedrooms, size_sqft, notes) VALUES (?, ?, ?, ?, ?, ?)').run(villa_number, block, client_id, bedrooms, size_sqft, notes);
  res.json({ id: result.lastInsertRowid });
});

villasRouter.put('/:id', auth, (req, res) => {
  const { villa_number, block, client_id, bedrooms, size_sqft, notes } = req.body;
  db.prepare('UPDATE villas SET villa_number=?, block=?, client_id=?, bedrooms=?, size_sqft=?, notes=? WHERE id=?').run(villa_number, block, client_id, bedrooms, size_sqft, notes, req.params.id);
  res.json({ success: true });
});

// ── TICKETS ──────────────────────────────────────────────
const ticketsRouter = express.Router();

const ticketQuery = `
  SELECT t.*, v.villa_number, v.block, u.name as assigned_name
  FROM tickets t
  LEFT JOIN villas v ON t.villa_id = v.id
  LEFT JOIN users u ON t.assigned_to = u.id
`;

ticketsRouter.get('/', auth, (req, res) => {
  const { status, priority } = req.query;
  let query = ticketQuery;
  const params = [];
  const conditions = [];
  if (status) { conditions.push('t.status = ?'); params.push(status); }
  if (priority) { conditions.push('t.priority = ?'); params.push(priority); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY CASE t.priority WHEN "urgent" THEN 1 WHEN "medium" THEN 2 ELSE 3 END, t.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

ticketsRouter.get('/stats', auth, (req, res) => {
  const open = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status NOT IN ('resolved','closed')").get().c;
  const urgent = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE priority='urgent' AND status NOT IN ('resolved','closed')").get().c;
  const resolved = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status='resolved' AND strftime('%Y-%m', resolved_at) = strftime('%Y-%m', 'now')").get().c;
  res.json({ open, urgent, resolved });
});

ticketsRouter.post('/', auth, (req, res) => {
  const { villa_id, contract_id, title, description, priority, assigned_to } = req.body;
  if (!villa_id || !title) return res.status(400).json({ error: 'Villa and title required' });
  const count = db.prepare('SELECT COUNT(*) as c FROM tickets').get().c;
  const ticket_number = `T-${String(count + 100).padStart(3, '0')}`;
  const result = db.prepare('INSERT INTO tickets (ticket_number, villa_id, contract_id, title, description, priority, assigned_to) VALUES (?, ?, ?, ?, ?, ?, ?)').run(ticket_number, villa_id, contract_id, title, description, priority || 'medium', assigned_to);
  res.json({ id: result.lastInsertRowid, ticket_number });
});

ticketsRouter.put('/:id', auth, (req, res) => {
  const { title, description, priority, status, assigned_to } = req.body;
  const resolved_at = status === 'resolved' ? new Date().toISOString() : null;
  db.prepare('UPDATE tickets SET title=?, description=?, priority=?, status=?, assigned_to=?, resolved_at=? WHERE id=?').run(title, description, priority, status, assigned_to, resolved_at, req.params.id);
  res.json({ success: true });
});

// ── SCHEDULE ─────────────────────────────────────────────
const scheduleRouter = express.Router();

scheduleRouter.get('/', auth, (req, res) => {
  const items = db.prepare(`
    SELECT s.*, v.villa_number, v.block
    FROM schedule s LEFT JOIN villas v ON s.villa_id = v.id
    ORDER BY s.scheduled_date ASC
  `).all();
  res.json(items);
});

scheduleRouter.post('/', auth, (req, res) => {
  const { villa_id, ticket_id, service_type, technician, scheduled_date, duration_hours, notes } = req.body;
  if (!villa_id || !service_type || !scheduled_date) return res.status(400).json({ error: 'Required fields missing' });
  const result = db.prepare('INSERT INTO schedule (villa_id, ticket_id, service_type, technician, scheduled_date, duration_hours, notes) VALUES (?, ?, ?, ?, ?, ?, ?)').run(villa_id, ticket_id, service_type, technician, scheduled_date, duration_hours, notes);
  res.json({ id: result.lastInsertRowid });
});

scheduleRouter.put('/:id', auth, (req, res) => {
  const { service_type, technician, scheduled_date, duration_hours, status, notes } = req.body;
  db.prepare('UPDATE schedule SET service_type=?, technician=?, scheduled_date=?, duration_hours=?, status=?, notes=? WHERE id=?').run(service_type, technician, scheduled_date, duration_hours, status, notes, req.params.id);
  res.json({ success: true });
});

// ── PROCUREMENT ──────────────────────────────────────────
const procurementRouter = express.Router();

procurementRouter.get('/orders', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM procurement_orders ORDER BY created_at DESC').all());
});

procurementRouter.post('/orders', auth, (req, res) => {
  const { item_name, quantity, unit, unit_cost, supplier, expected_date, notes } = req.body;
  if (!item_name || !quantity) return res.status(400).json({ error: 'Item and quantity required' });
  const count = db.prepare('SELECT COUNT(*) as c FROM procurement_orders').get().c;
  const order_number = `PO-${String(count + 220 + 1).padStart(3, '0')}`;
  const total_cost = (unit_cost || 0) * quantity;
  const result = db.prepare('INSERT INTO procurement_orders (order_number, item_name, quantity, unit, unit_cost, total_cost, supplier, expected_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(order_number, item_name, quantity, unit, unit_cost, total_cost, supplier, expected_date, notes);
  res.json({ id: result.lastInsertRowid, order_number });
});

procurementRouter.put('/orders/:id', auth, (req, res) => {
  const { status, expected_date, notes } = req.body;
  db.prepare('UPDATE procurement_orders SET status=?, expected_date=?, notes=? WHERE id=?').run(status, expected_date, notes, req.params.id);
  res.json({ success: true });
});

procurementRouter.get('/inventory', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM inventory ORDER BY item_name').all());
});

procurementRouter.put('/inventory/:id', auth, (req, res) => {
  const { in_stock, min_level, unit_cost } = req.body;
  db.prepare('UPDATE inventory SET in_stock=?, min_level=?, unit_cost=?, last_updated=CURRENT_TIMESTAMP WHERE id=?').run(in_stock, min_level, unit_cost, req.params.id);
  res.json({ success: true });
});

// ── DASHBOARD STATS ──────────────────────────────────────
const dashboardRouter = express.Router();

dashboardRouter.get('/', auth, (req, res) => {
  const contracts = db.prepare("SELECT COUNT(*) as c FROM contracts").get().c;
  const activeContracts = db.prepare("SELECT COUNT(*) as c FROM contracts WHERE status='active'").get().c;
  const expiringContracts = db.prepare("SELECT COUNT(*) as c FROM contracts WHERE status='expiring'").get().c;
  const monthlyRevenue = db.prepare("SELECT SUM(monthly_value) as t FROM contracts WHERE status IN ('active','expiring')").get().t || 0;
  const openTickets = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status NOT IN ('resolved','closed')").get().c;
  const urgentTickets = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE priority='urgent' AND status NOT IN ('resolved','closed')").get().c;
  const lowStock = db.prepare("SELECT COUNT(*) as c FROM inventory WHERE in_stock < min_level").get().c;
  const pendingOrders = db.prepare("SELECT COUNT(*) as c FROM procurement_orders WHERE status='pending'").get().c;
  const recentActivity = db.prepare(`
    SELECT 'ticket' as type, title as label, created_at FROM tickets
    UNION ALL SELECT 'contract' as type, contract_number as label, created_at FROM contracts
    UNION ALL SELECT 'order' as type, order_number as label, created_at FROM procurement_orders
    ORDER BY created_at DESC LIMIT 8
  `).all();
  res.json({ contracts, activeContracts, expiringContracts, monthlyRevenue, openTickets, urgentTickets, lowStock, pendingOrders, recentActivity });
});

module.exports = { clientsRouter, villasRouter, ticketsRouter, scheduleRouter, procurementRouter, dashboardRouter };
