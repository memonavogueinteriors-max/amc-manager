const express = require('express');
const { getDb } = require('../db/database');
const { auth } = require('../middleware/auth');

// ── CLIENTS ───────────────────────────────────────────────
const clientsRouter = express.Router();

clientsRouter.get('/', auth, async (req, res) => {
  try {
    const result = await getDb().query(`
  SELECT
    cl.*,
    v.villa_number,
    v.block,
    c.package,
    c.property_type,
    c.monthly_value,
    c.end_date,
    c.status as contract_status,
    COUNT(c.id) OVER(PARTITION BY cl.id) as contract_count,
    SUM(c.monthly_value) OVER(PARTITION BY cl.id) as total_monthly
  FROM clients cl
  LEFT JOIN contracts c ON cl.id = c.client_id AND c.deleted=false
  LEFT JOIN villas v ON v.id = c.villa_id
  WHERE cl.deleted=false
  ORDER BY cl.name
`);
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

clientsRouter.post('/', auth, async (req, res) => {
  try {
    const { name, phone, email, address, notes, villa_id, package: pkg, start_date, property_type, sales_person_id, commission_amount } = req.body;

    const result = await getDb().query(
      'INSERT INTO clients (name, phone, email, address, notes) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [name, phone||'', email||'', address||'', notes||'']
    );
    const client_id = result.rows[0].id;

    if (villa_id && pkg && start_date) {
      const pkgPrices = {
        'Silver - 3 AC': 425, 'Gold - 3 AC': 546, 'Platinum - 3 AC': 712,
        'Silver - 4 AC': 479, 'Gold - 4 AC': 617, 'Platinum - 4 AC': 812,
        'Silver - 6 AC': 588, 'Gold - 6 AC': 758, 'Platinum - 6 AC': 1017
      };
      const pkgAnnual = {
        'Silver - 3 AC': 5100, 'Gold - 3 AC': 6550, 'Platinum - 3 AC': 8550,
        'Silver - 4 AC': 5750, 'Gold - 4 AC': 7400, 'Platinum - 4 AC': 9750,
        'Silver - 6 AC': 7050, 'Gold - 6 AC': 9100, 'Platinum - 6 AC': 12200
      };
      const pkgCallouts = {
        'Silver - 3 AC': 1, 'Gold - 3 AC': 2, 'Platinum - 3 AC': 3,
        'Silver - 4 AC': 1, 'Gold - 4 AC': 2, 'Platinum - 4 AC': 3,
        'Silver - 6 AC': 1, 'Gold - 6 AC': 2, 'Platinum - 6 AC': 3
      };

      const monthly_value = pkgPrices[pkg] || 425;
      const annual_value = pkgAnnual[pkg] || 5100;

      const year = new Date().getFullYear();
      const count = await getDb().query("SELECT COUNT(*) as c FROM contracts");
      const num = String(parseInt(count.rows[0].c) + 1).padStart(3, '0');
      const contract_number = `VAC-${year}-${num}`;
      const file_number = `FILE-${String(parseInt(count.rows[0].c) + 1).padStart(4, '0')}`;

      const startDate = new Date(start_date);
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
      const end_date = endDate.toISOString().split('T')[0];

      const nextService = new Date(startDate);
      nextService.setMonth(nextService.getMonth() + 4);
      const next_service_date = nextService.toISOString().split('T')[0];

      await getDb().query(
        `INSERT INTO contracts (
          contract_number, file_number, villa_id, client_id, package,
          monthly_value, annual_value, start_date, end_date, property_type,
          sales_person_id, commission_amount, visits_total,
          emergency_callouts_total, next_service_date, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          contract_number, file_number, parseInt(villa_id), client_id,
          pkg, monthly_value, annual_value, start_date, end_date,
          property_type || 'Villa',
          sales_person_id ? parseInt(sales_person_id) : null,
          parseFloat(commission_amount || 0),
          3, pkgCallouts[pkg] || 1, next_service_date, 'active'
        ]
      );

      if (sales_person_id && commission_amount && parseFloat(commission_amount) > 0) {
        const newContract = await getDb().query('SELECT id FROM contracts WHERE contract_number=$1', [contract_number]);
        if (newContract.rows[0]) {
          await getDb().query(
            'INSERT INTO commissions (user_id, contract_id, amount, type) VALUES ($1,$2,$3,$4)',
            [parseInt(sales_person_id), newContract.rows[0].id, parseFloat(commission_amount), 'contract_signup']
          );
        }
      }
    }

    res.json({ id: client_id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

clientsRouter.put('/:id', auth, async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    await getDb().query('UPDATE clients SET name=$1,phone=$2,email=$3,address=$4,notes=$5 WHERE id=$6',
      [name, phone, email, address, notes, req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

clientsRouter.delete('/:id', auth, async (req, res) => {
  try {
    await getDb().query('UPDATE clients SET deleted=true WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

clientsRouter.get('/recycle', auth, async (req, res) => {
  try {
    const result = await getDb().query('SELECT * FROM clients WHERE deleted=true ORDER BY name');
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

clientsRouter.put('/recycle/:id', auth, async (req, res) => {
  try {
    await getDb().query('UPDATE clients SET deleted=false WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── VILLAS ────────────────────────────────────────────────
const villasRouter = express.Router();

villasRouter.get('/', auth, async (req, res) => {
  try {
    const result = await getDb().query(`
      SELECT v.*, cl.name as client_name, cl.phone as client_phone,
             c.contract_number, c.package, c.status as contract_status,
             c.monthly_value, c.end_date
      FROM villas v
      LEFT JOIN clients cl ON v.client_id = cl.id
      LEFT JOIN contracts c ON v.id = c.villa_id AND c.status IN ('active','expiring','pending')
      WHERE v.deleted=false
      ORDER BY v.block, v.villa_number
    `);
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

villasRouter.post('/', auth, async (req, res) => {
  try {
    const { villa_number, block, client_id, bedrooms, size_sqft, notes } = req.body;
    const result = await getDb().query(
      'INSERT INTO villas (villa_number,block,client_id,bedrooms,size_sqft,notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [villa_number, block, client_id, bedrooms, size_sqft, notes]
    );
    res.json({ id: result.rows[0].id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

villasRouter.put('/:id', auth, async (req, res) => {
  try {
    const { villa_number, block, client_id, bedrooms, size_sqft, notes } = req.body;
    await getDb().query('UPDATE villas SET villa_number=$1,block=$2,client_id=$3,bedrooms=$4,size_sqft=$5,notes=$6 WHERE id=$7',
      [villa_number, block, client_id, bedrooms, size_sqft, notes, req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

villasRouter.delete('/:id', auth, async (req, res) => {
  try {
    await getDb().query('UPDATE villas SET deleted=true WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

villasRouter.get('/recycle', auth, async (req, res) => {
  try {
    const result = await getDb().query('SELECT * FROM villas WHERE deleted=true ORDER BY villa_number');
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

villasRouter.put('/recycle/:id', auth, async (req, res) => {
  try {
    await getDb().query('UPDATE villas SET deleted=false WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── TICKETS ───────────────────────────────────────────────
const ticketsRouter = express.Router();

ticketsRouter.get('/', auth, async (req, res) => {
  try {
    const { status, priority } = req.query;
    let sql = `SELECT t.*, v.villa_number, v.block, u.name as assigned_name
               FROM tickets t
               LEFT JOIN villas v ON t.villa_id = v.id
               LEFT JOIN users u ON t.assigned_to = u.id
               WHERE t.deleted=false`;
    const params = [];
    if (status) { sql += ` AND t.status = $${params.length+1}`; params.push(status); }
    if (priority) { sql += ` AND t.priority = $${params.length+1}`; params.push(priority); }
    sql += ` ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, t.created_at DESC`;
    const result = await getDb().query(sql, params);
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

ticketsRouter.get('/stats', auth, async (req, res) => {
  try {
    const db = getDb();
    const open = await db.query("SELECT COUNT(*) as c FROM tickets WHERE status NOT IN ('resolved','closed') AND deleted=false");
    const urgent = await db.query("SELECT COUNT(*) as c FROM tickets WHERE priority='urgent' AND status NOT IN ('resolved','closed') AND deleted=false");
    const resolved = await db.query("SELECT COUNT(*) as c FROM tickets WHERE status='resolved'");
    res.json({ open: parseInt(open.rows[0].c), urgent: parseInt(urgent.rows[0].c), resolved: parseInt(resolved.rows[0].c) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

ticketsRouter.post('/', auth, async (req, res) => {
  try {
    const { villa_id, contract_id, title, description, priority, assigned_to } = req.body;
    const count = await getDb().query('SELECT COUNT(*) as c FROM tickets');
    const ticket_number = `T-${parseInt(count.rows[0].c) + 100}`;
    const result = await getDb().query(
      'INSERT INTO tickets (ticket_number,villa_id,contract_id,title,description,priority,assigned_to) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [ticket_number, villa_id, contract_id, title, description, priority||'medium', assigned_to]
    );
    res.json({ id: result.rows[0].id, ticket_number });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

ticketsRouter.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, priority, status, assigned_to } = req.body;
    const resolved_at = status === 'resolved' ? new Date().toISOString() : null;
    await getDb().query('UPDATE tickets SET title=$1,description=$2,priority=$3,status=$4,assigned_to=$5,resolved_at=$6 WHERE id=$7',
      [title, description, priority, status, assigned_to, resolved_at, req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

ticketsRouter.delete('/:id', auth, async (req, res) => {
  try {
    await getDb().query('UPDATE tickets SET deleted=true WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

ticketsRouter.get('/recycle', auth, async (req, res) => {
  try {
    const result = await getDb().query('SELECT * FROM tickets WHERE deleted=true ORDER BY created_at DESC');
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

ticketsRouter.put('/recycle/:id', auth, async (req, res) => {
  try {
    await getDb().query('UPDATE tickets SET deleted=false WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SCHEDULE ──────────────────────────────────────────────
const scheduleRouter = express.Router();

scheduleRouter.get('/', auth, async (req, res) => {
  try {
    const result = await getDb().query(`
      SELECT s.*, v.villa_number, v.block
      FROM schedule s LEFT JOIN villas v ON s.villa_id = v.id
      ORDER BY s.scheduled_date ASC
    `);
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

scheduleRouter.post('/', auth, async (req, res) => {
  try {
    const { villa_id, ticket_id, service_type, technician, scheduled_date, duration_hours, notes } = req.body;
    const result = await getDb().query(
      'INSERT INTO schedule (villa_id,ticket_id,service_type,technician,scheduled_date,duration_hours,notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [villa_id, ticket_id, service_type, technician, scheduled_date, duration_hours, notes]
    );
    res.json({ id: result.rows[0].id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

scheduleRouter.put('/:id', auth, async (req, res) => {
  try {
    const { service_type, technician, scheduled_date, duration_hours, status, notes } = req.body;
    await getDb().query('UPDATE schedule SET service_type=$1,technician=$2,scheduled_date=$3,duration_hours=$4,status=$5,notes=$6 WHERE id=$7',
      [service_type, technician, scheduled_date, duration_hours, status, notes, req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── PROCUREMENT ───────────────────────────────────────────
const procurementRouter = express.Router();

procurementRouter.get('/orders', auth, async (req, res) => {
  try {
    const result = await getDb().query('SELECT * FROM procurement_orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

procurementRouter.post('/orders', auth, async (req, res) => {
  try {
    const { item_name, quantity, unit, unit_cost, supplier, expected_date, notes, serial_number, description, ordered_by, invoice_url, invoice_name } = req.body;
    const count = await getDb().query('SELECT COUNT(*) as c FROM procurement_orders');
    const order_number = `PO-${parseInt(count.rows[0].c) + 221}`;
    const total_cost = (parseFloat(unit_cost) || 0) * (parseFloat(quantity) || 0);
    const result = await getDb().query(
      'INSERT INTO procurement_orders (order_number,item_name,quantity,unit,unit_cost,total_cost,supplier,expected_date,notes,serial_number,description,ordered_by,invoice_url,invoice_name) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id',
      [order_number, item_name, quantity, unit||'unit', unit_cost, total_cost, supplier, expected_date, notes, serial_number, description, ordered_by, invoice_url, invoice_name]
    );
    res.json({ id: result.rows[0].id, order_number });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

procurementRouter.put('/orders/:id', auth, async (req, res) => {
  try {
    const { status, expected_date, notes } = req.body;
    await getDb().query('UPDATE procurement_orders SET status=$1,expected_date=$2,notes=$3 WHERE id=$4',
      [status, expected_date, notes, req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

procurementRouter.get('/inventory', auth, async (req, res) => {
  try {
    const result = await getDb().query('SELECT * FROM inventory ORDER BY item_name');
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

procurementRouter.put('/inventory/:id', auth, async (req, res) => {
  try {
    const { in_stock, min_level, unit_cost } = req.body;
    await getDb().query('UPDATE inventory SET in_stock=$1,min_level=$2,unit_cost=$3,last_updated=CURRENT_TIMESTAMP WHERE id=$4',
      [in_stock, min_level, unit_cost, req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── DASHBOARD ─────────────────────────────────────────────
const dashboardRouter = express.Router();

dashboardRouter.get('/', auth, async (req, res) => {
  try {
    const db = getDb();
    const contracts = await db.query("SELECT COUNT(*) as c FROM contracts WHERE deleted=false");
    const activeContracts = await db.query("SELECT COUNT(*) as c FROM contracts WHERE status='active' AND deleted=false");
    const expiringContracts = await db.query("SELECT COUNT(*) as c FROM contracts WHERE status='expiring' AND deleted=false");
    const monthlyRevenue = await db.query("SELECT SUM(monthly_value) as t FROM contracts WHERE status IN ('active','expiring') AND deleted=false");
    const openTickets = await db.query("SELECT COUNT(*) as c FROM tickets WHERE status NOT IN ('resolved','closed') AND deleted=false");
    const urgentTickets = await db.query("SELECT COUNT(*) as c FROM tickets WHERE priority='urgent' AND status NOT IN ('resolved','closed') AND deleted=false");
    const lowStock = await db.query("SELECT COUNT(*) as c FROM inventory WHERE in_stock < min_level");
    const pendingOrders = await db.query("SELECT COUNT(*) as c FROM procurement_orders WHERE status='pending'");
    const recentActivity = await db.query(`
      SELECT 'ticket' as type, title as label, created_at FROM tickets WHERE deleted=false
      UNION ALL SELECT 'contract' as type, contract_number as label, created_at FROM contracts WHERE deleted=false
      UNION ALL SELECT 'order' as type, order_number as label, created_at FROM procurement_orders
      ORDER BY created_at DESC LIMIT 8
    `);
    res.json({
      contracts: parseInt(contracts.rows[0].c),
      activeContracts: parseInt(activeContracts.rows[0].c),
      expiringContracts: parseInt(expiringContracts.rows[0].c),
      monthlyRevenue: parseFloat(monthlyRevenue.rows[0].t) || 0,
      openTickets: parseInt(openTickets.rows[0].c),
      urgentTickets: parseInt(urgentTickets.rows[0].c),
      lowStock: parseInt(lowStock.rows[0].c),
      pendingOrders: parseInt(pendingOrders.rows[0].c),
      recentActivity: recentActivity.rows
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── CONTRACTS ─────────────────────────────────────────────
const contractsRouter = express.Router();

contractsRouter.get('/', auth, async (req, res) => {
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
      WHERE c.deleted=false
    `;
    const params = [];
    if (status) { sql += ` AND c.status = $1`; params.push(status); }
    sql += ' ORDER BY c.created_at DESC';
    const result = await getDb().query(sql, params);
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

contractsRouter.get('/stats', auth, async (req, res) => {
  try {
    const db = getDb();
    const total = await db.query("SELECT COUNT(*) as c FROM contracts WHERE deleted=false");
    const active = await db.query("SELECT COUNT(*) as c FROM contracts WHERE status='active' AND deleted=false");
    const revenue = await db.query("SELECT SUM(monthly_value) as total FROM contracts WHERE status IN ('active','expiring') AND deleted=false");
    res.json({
      total: parseInt(total.rows[0].c),
      active: parseInt(active.rows[0].c),
      monthly_revenue: parseFloat(revenue.rows[0].total) || 0
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

contractsRouter.post('/', auth, async (req, res) => {
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
        3, pkgCallouts[pkg.split(' ')[0]] || 1,
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

contractsRouter.put('/:id', auth, async (req, res) => {
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

contractsRouter.delete('/:id', auth, async (req, res) => {
  try {
    await getDb().query('UPDATE contracts SET deleted=true WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

contractsRouter.get('/recycle', auth, async (req, res) => {
  try {
    const result = await getDb().query(`
      SELECT c.*, v.villa_number, v.block, cl.name as client_name
      FROM contracts c
      LEFT JOIN villas v ON c.villa_id = v.id
      LEFT JOIN clients cl ON c.client_id = cl.id
      WHERE c.deleted=true ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
contractsRouter.get('/:id', auth, async (req, res) => {
  try {
    const result = await getDb().query(`
      SELECT c.*, v.villa_number, v.block, cl.name as client_name,
             cl.phone as client_phone, sp.name as sales_person_name
      FROM contracts c
      LEFT JOIN villas v ON c.villa_id = v.id
      LEFT JOIN clients cl ON c.client_id = cl.id
      LEFT JOIN users sp ON c.sales_person_id = sp.id
      WHERE c.id = $1
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
contractsRouter.put('/recycle/:id', auth, async (req, res) => {
  try {
    await getDb().query('UPDATE contracts SET deleted=false WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = { clientsRouter, villasRouter, ticketsRouter, scheduleRouter, procurementRouter, dashboardRouter, contractsRouter };