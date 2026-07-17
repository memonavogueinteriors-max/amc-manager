const router = require('express').Router();
const { getDb } = require('../db/database');
const { auth } = require('../middleware/auth');

const managementRoles = ['admin', 'owner', 'manager'];

function canManage(user) {
  return managementRoles.includes(user?.role);
}

function managementOnly(req, res, next) {
  if (!canManage(req.user)) {
    return res.status(403).json({
      error: 'Only management can manage implementation actions'
    });
  }

  next();
}

/**
 * GET /api/implementation-tracker
 */
router.get('/', auth, async (req, res) => {
  try {
    const {
      search = '',
      department = '',
      status = ''
    } = req.query;

    const conditions = [];
    const values = [];

    if (department) {
      values.push(department);
      conditions.push(`ia.department = $${values.length}`);
    }

    if (status) {
      values.push(status);
      conditions.push(`ia.status = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      const parameter = `$${values.length}`;

      conditions.push(`
        (
          ia.title ILIKE ${parameter}
          OR ia.department ILIKE ${parameter}
          OR ia.action_required ILIKE ${parameter}
          OR ia.responsible_person ILIKE ${parameter}
          OR ia.evidence ILIKE ${parameter}
          OR ia.manager_verification ILIKE ${parameter}
          OR bb.title ILIKE ${parameter}
          OR tr.title ILIKE ${parameter}
        )
      `);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const result = await getDb().query(
      `
        SELECT
          ia.*,
          bb.title AS black_box_title,
          tr.title AS training_rule_title
        FROM implementation_actions ia
        LEFT JOIN black_box_entries bb
          ON bb.id = ia.black_box_entry_id
        LEFT JOIN training_rules tr
          ON tr.id = ia.training_rule_id
        ${whereClause}
        ORDER BY
          CASE ia.status
            WHEN 'Verification Required' THEN 1
            WHEN 'In Progress' THEN 2
            WHEN 'Not Started' THEN 3
            WHEN 'Implemented' THEN 4
            WHEN 'Verified' THEN 5
            WHEN 'Rejected' THEN 6
            ELSE 7
          END,
          ia.due_date ASC NULLS LAST,
          ia.created_at DESC
      `,
      values
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/implementation-tracker/stats
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const result = await getDb().query(`
      SELECT
        COUNT(*)::INTEGER AS total,

        COUNT(*) FILTER (
          WHERE status = 'Not Started'
        )::INTEGER AS not_started,

        COUNT(*) FILTER (
          WHERE status = 'In Progress'
        )::INTEGER AS in_progress,

        COUNT(*) FILTER (
          WHERE status = 'Implemented'
        )::INTEGER AS implemented,

        COUNT(*) FILTER (
          WHERE status = 'Verification Required'
        )::INTEGER AS verification_required,

        COUNT(*) FILTER (
          WHERE status = 'Verified'
        )::INTEGER AS verified,

        COUNT(*) FILTER (
          WHERE due_date < CURRENT_DATE
          AND status NOT IN ('Verified', 'Rejected')
        )::INTEGER AS overdue
      FROM implementation_actions
    `);

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/implementation-tracker/source-options
 */
router.get('/source-options', auth, async (req, res) => {
  try {
    const blackBoxResult = await getDb().query(`
      SELECT
        id,
        title,
        department,
        action_required,
        responsible_person,
        due_date,
        status
      FROM black_box_entries
      ORDER BY created_at DESC
    `);

    const trainingRuleResult = await getDb().query(`
      SELECT
        id,
        title,
        department,
        official_rule,
        responsible_department,
        effective_date,
        status
      FROM training_rules
      ORDER BY created_at DESC
    `);

    res.json({
      blackBox: blackBoxResult.rows,
      trainingRules: trainingRuleResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/implementation-tracker/:id
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await getDb().query(
      `
        SELECT
          ia.*,
          bb.title AS black_box_title,
          tr.title AS training_rule_title
        FROM implementation_actions ia
        LEFT JOIN black_box_entries bb
          ON bb.id = ia.black_box_entry_id
        LEFT JOIN training_rules tr
          ON tr.id = ia.training_rule_id
        WHERE ia.id = $1
      `,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: 'Implementation action not found'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/implementation-tracker
 */
router.post('/', auth, managementOnly, async (req, res) => {
  try {
    const {
      title,
      source_type = 'Black Box',
      black_box_entry_id = null,
      training_rule_id = null,
      department = '',
      action_required,
      responsible_person = '',
      due_date = null,
      status = 'Not Started',
      evidence = '',
      manager_verification = '',
      completion_date = null
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        error: 'Action title is required'
      });
    }

    if (!action_required?.trim()) {
      return res.status(400).json({
        error: 'Action required is required'
      });
    }

    const createdByName =
      req.user?.name ||
      req.user?.email ||
      '';

    const result = await getDb().query(
      `
        INSERT INTO implementation_actions (
          title,
          source_type,
          black_box_entry_id,
          training_rule_id,
          department,
          action_required,
          responsible_person,
          due_date,
          status,
          evidence,
          manager_verification,
          completion_date,
          created_by,
          created_by_name
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,
          $8,$9,$10,$11,$12,$13,$14
        )
        RETURNING *
      `,
      [
        title.trim(),
        source_type,
        black_box_entry_id || null,
        training_rule_id || null,
        department.trim(),
        action_required.trim(),
        responsible_person.trim(),
        due_date || null,
        status,
        evidence.trim(),
        manager_verification.trim(),
        completion_date || null,
        req.user?.id || null,
        createdByName
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/implementation-tracker/:id
 */
router.put(
  '/:id',
  auth,
  managementOnly,
  async (req, res) => {
    try {
      const {
        title,
        source_type = 'Black Box',
        black_box_entry_id = null,
        training_rule_id = null,
        department = '',
        action_required,
        responsible_person = '',
        due_date = null,
        status = 'Not Started',
        evidence = '',
        manager_verification = '',
        completion_date = null
      } = req.body;

      if (!title?.trim()) {
        return res.status(400).json({
          error: 'Action title is required'
        });
      }

      if (!action_required?.trim()) {
        return res.status(400).json({
          error: 'Action required is required'
        });
      }

      const finalCompletionDate =
        status === 'Verified'
          ? completion_date || new Date().toISOString().slice(0, 10)
          : completion_date || null;

      const result = await getDb().query(
        `
          UPDATE implementation_actions
          SET
            title = $1,
            source_type = $2,
            black_box_entry_id = $3,
            training_rule_id = $4,
            department = $5,
            action_required = $6,
            responsible_person = $7,
            due_date = $8,
            status = $9,
            evidence = $10,
            manager_verification = $11,
            completion_date = $12,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $13
          RETURNING *
        `,
        [
          title.trim(),
          source_type,
          black_box_entry_id || null,
          training_rule_id || null,
          department.trim(),
          action_required.trim(),
          responsible_person.trim(),
          due_date || null,
          status,
          evidence.trim(),
          manager_verification.trim(),
          finalCompletionDate,
          req.params.id
        ]
      );

      if (!result.rows[0]) {
        return res.status(404).json({
          error: 'Implementation action not found'
        });
      }

      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/implementation-tracker/:id
 */
router.delete(
  '/:id',
  auth,
  managementOnly,
  async (req, res) => {
    try {
      const result = await getDb().query(
        `
          DELETE FROM implementation_actions
          WHERE id = $1
          RETURNING id
        `,
        [req.params.id]
      );

      if (!result.rows[0]) {
        return res.status(404).json({
          error: 'Implementation action not found'
        });
      }

      res.json({
        success: true,
        id: result.rows[0].id
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;