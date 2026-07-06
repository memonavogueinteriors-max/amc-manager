const router = require('express').Router();
const { getDb } = require('../db/database');
const { auth } = require('../middleware/auth');

function canManageAMC(req) {
  return ['owner', 'admin', 'manager'].includes(req.user.role);
}

router.get('/', auth, async (req, res) => {
  try {
    const result = await getDb().query(`
      SELECT sr.*, v.villa_number, v.block, cl.name as client_name, c.contract_number, c.package
      FROM service_reports sr
      LEFT JOIN villas v ON sr.villa_id = v.id
      LEFT JOIN contracts c ON sr.contract_id = c.id
      LEFT JOIN clients cl ON c.client_id = cl.id
      ORDER BY sr.created_at DESC
    `);

    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    if (!canManageAMC(req)) {
      return res.status(403).json({ error: 'Sales users can view service reports only. Manager access required to create reports.' });
    }

    const {
      visit_id,
      contract_id,
      villa_id,
      visit_date,
      visit_type,
      technician,
      manager,
      checklist,
      notes
    } = req.body;

    const result = await getDb().query(
      'INSERT INTO service_reports (visit_id,contract_id,villa_id,visit_date,visit_type,technician,manager,checklist,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
      [
        visit_id,
        contract_id,
        villa_id,
        visit_date,
        visit_type,
        technician,
        manager,
        JSON.stringify(checklist || {}),
        notes
      ]
    );

    res.json({ id: result.rows[0].id });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (!canManageAMC(req)) {
      return res.status(403).json({ error: 'Sales users can view service reports only. Manager access required to update reports.' });
    }

    const {
      checklist,
      notes,
      manager_approved,
      client_signature,
      report_url
    } = req.body;

    await getDb().query(
      'UPDATE service_reports SET checklist=$1,notes=$2,manager_approved=$3,client_signature=$4,report_url=$5 WHERE id=$6',
      [
        JSON.stringify(checklist || {}),
        notes,
        manager_approved,
        client_signature,
        report_url,
        req.params.id
      ]
    );

    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await getDb().query(`
      SELECT sr.*, v.villa_number, v.block, cl.name as client_name,
             cl.phone as client_phone, c.contract_number, c.package, c.ac_units
      FROM service_reports sr
      LEFT JOIN villas v ON sr.villa_id = v.id
      LEFT JOIN contracts c ON sr.contract_id = c.id
      LEFT JOIN clients cl ON c.client_id = cl.id
      WHERE sr.id = $1
    `, [req.params.id]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(result.rows[0]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;