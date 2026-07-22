const router = require('express').Router();
const { getDb } = require('../db/database');
const { auth } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

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
    const uniqueStaffId = await generateUniqueStaffId(db);
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


router.put('/commission/:id', auth, async (req, res) => {
  try {
    if (!['owner', 'admin', 'manager'].includes(req.user.role)) {
  return res.status(403).json({ error: 'Manager access required' });
}

    const { commission_type, commission_value } = req.body;

    const result = await getDb().query(
      'UPDATE users SET commission_type=$1, commission_value=$2 WHERE id=$3 RETURNING id, name, role, unique_staff_id, commission_type, commission_value',
      [
        commission_type || 'percentage',
        parseFloat(commission_value || 0),
        req.params.id
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
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
    const isSales = req.user.role === 'sales';

    const result = await getDb().query(`
      WITH contract_stats AS (
        SELECT
          c.sales_person_id,

          COUNT(DISTINCT c.id) as contracts_count,

          COALESCE(SUM(
            COALESCE(
              NULLIF(c.original_price, 0),
              NULLIF(c.annual_value, 0),
              NULLIF(c.monthly_value, 0) * 12,
              0
            )
          ), 0) as original_sales,

          COALESCE(SUM(COALESCE(c.discount_amount, 0)), 0) as total_discount,

          COALESCE(SUM(
            COALESCE(
              NULLIF(c.final_price, 0),
              GREATEST(
                COALESCE(NULLIF(c.original_price, 0), NULLIF(c.annual_value, 0), NULLIF(c.monthly_value, 0) * 12, 0)
                - COALESCE(c.discount_amount, 0),
                0
              )
            )
          ), 0) as final_sales,

          COALESCE(SUM(
            CASE
              WHEN c.package ILIKE '%silver%' THEN 500
              WHEN c.package ILIKE '%gold%' THEN 700
              WHEN c.package ILIKE '%platinum%' THEN 1100
              ELSE 0
            END
          ), 0) as package_commission,

          COALESCE(SUM(
            CASE
              WHEN c.notes ILIKE '%referral%' THEN 250
              ELSE 0
            END
          ), 0) as referral_bonus,

          COALESCE(SUM(
            CASE
              WHEN c.package ILIKE '%silver%' THEN 1
              ELSE 0
            END
          ), 0) as silver_sold,

          COALESCE(SUM(
            CASE
              WHEN c.package ILIKE '%gold%' THEN 1
              ELSE 0
            END
          ), 0) as gold_sold,

          COALESCE(SUM(
            CASE
              WHEN c.package ILIKE '%platinum%' THEN 1
              ELSE 0
            END
          ), 0) as platinum_sold

        FROM contracts c
        WHERE c.deleted = false
        GROUP BY c.sales_person_id
      ),

      monthly_stats AS (
        SELECT
          c.sales_person_id,

          COALESCE(SUM(
            COALESCE(
              NULLIF(c.final_price, 0),
              GREATEST(
                COALESCE(NULLIF(c.original_price, 0), NULLIF(c.annual_value, 0), NULLIF(c.monthly_value, 0) * 12, 0)
                - COALESCE(c.discount_amount, 0),
                0
              )
            )
          ), 0) as monthly_final_sales,

          COUNT(DISTINCT c.id) as monthly_contracts

        FROM contracts c
        WHERE c.deleted = false
          AND CASE
                WHEN c.start_date ~ '^\d{4}-\d{2}-\d{2}$'
                THEN c.start_date::date
                ELSE NULL
              END >= date_trunc('month', CURRENT_DATE)::date
          AND CASE
                WHEN c.start_date ~ '^\d{4}-\d{2}-\d{2}$'
                THEN c.start_date::date
                ELSE NULL
              END < (
                date_trunc('month', CURRENT_DATE) + interval '1 month'
              )::date
        GROUP BY c.sales_person_id
      ),

      client_stats AS (
        SELECT
          cl.created_by_user_id as user_id,
          COUNT(DISTINCT cl.id) as clients_count
        FROM clients cl
        WHERE cl.deleted = false
        GROUP BY cl.created_by_user_id
      ),

      paid_stats AS (
        SELECT
          cm.user_id,
          COALESCE(SUM(cm.amount), 0) as paid_commission
        FROM commissions cm
        WHERE cm.status = 'paid'
        GROUP BY cm.user_id
      )

      SELECT
        u.id,
        u.name,
        u.role,
        u.unique_staff_id,
        COALESCE(u.sales_target, 0) as sales_target,

        'package_fixed_plus_referral' as commission_type,
        0 as commission_value,

        COALESCE(cs.clients_count, 0) as clients_count,
        COALESCE(ct.contracts_count, 0) as contracts_count,

        COALESCE(ct.original_sales, 0) as original_sales,
        COALESCE(ct.total_discount, 0) as total_discount,
        COALESCE(ct.final_sales, 0) as total_value,

        COALESCE(ms.monthly_final_sales, 0) as monthly_sales,
        COALESCE(ms.monthly_contracts, 0) as monthly_contracts,

        CASE
          WHEN COALESCE(u.sales_target, 0) > 0
          THEN ROUND((COALESCE(ms.monthly_final_sales, 0) / COALESCE(u.sales_target, 0)) * 100, 1)
          ELSE 0
        END as target_progress,

        GREATEST(COALESCE(u.sales_target, 0) - COALESCE(ms.monthly_final_sales, 0), 0) as target_remaining,

        CASE
          WHEN COALESCE(u.sales_target, 0) > 0
           AND COALESCE(ms.monthly_final_sales, 0) >= COALESCE(u.sales_target, 0)
          THEN true
          ELSE false
        END as target_achieved,

        COALESCE(ct.package_commission, 0) as package_commission,
        COALESCE(ct.referral_bonus, 0) as referral_bonus,

        COALESCE(ct.package_commission, 0) + COALESCE(ct.referral_bonus, 0) as commission_due,

        COALESCE(ps.paid_commission, 0) as paid_commission,

        (
          COALESCE(ct.package_commission, 0)
          + COALESCE(ct.referral_bonus, 0)
          - COALESCE(ps.paid_commission, 0)
        ) as pending_commission,

        COALESCE(ct.silver_sold, 0) as silver_sold,
        COALESCE(ct.gold_sold, 0) as gold_sold,
        COALESCE(ct.platinum_sold, 0) as platinum_sold

      FROM users u

      LEFT JOIN client_stats cs
        ON cs.user_id = u.id

      LEFT JOIN contract_stats ct
        ON ct.sales_person_id = u.id

      LEFT JOIN monthly_stats ms
        ON ms.sales_person_id = u.id

      LEFT JOIN paid_stats ps
        ON ps.user_id = u.id

      WHERE u.role IN ('sales', 'manager')
        AND u.active = true
        AND ($1::boolean = false OR u.id = $2)

      ORDER BY total_value DESC NULLS LAST
    `, [isSales, req.user.id]);

    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
module.exports = router;

