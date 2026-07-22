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
      error: 'Only management can manage Training Rule Book entries'
    });
  }

  next();
}

/**
 * GET /api/training-rules
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
      conditions.push(`tr.department = $${values.length}`);
    }

    if (status) {
      values.push(status);
      conditions.push(`tr.status = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      const parameter = `$${values.length}`;

      conditions.push(`
        (
          tr.title ILIKE ${parameter}
          OR tr.department ILIKE ${parameter}
          OR tr.original_problem ILIKE ${parameter}
          OR tr.lesson_learned ILIKE ${parameter}
          OR tr.official_rule ILIKE ${parameter}
          OR tr.steps_to_follow ILIKE ${parameter}
          OR tr.prohibited_actions ILIKE ${parameter}
          OR tr.responsible_department ILIKE ${parameter}
          OR tr.approved_by ILIKE ${parameter}
        )
      `);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const userId = Number(req.user?.id) || 0;

    const result = await getDb().query(
      `
        SELECT
          tr.*,
          COUNT(tra.id)::INTEGER AS acknowledgement_count,
          EXISTS (
            SELECT 1
            FROM training_rule_acknowledgements mine
            WHERE mine.rule_id = tr.id
              AND mine.user_id = $${values.length + 1}
          ) AS acknowledged_by_me
        FROM training_rules tr
        LEFT JOIN training_rule_acknowledgements tra
          ON tra.rule_id = tr.id
        ${whereClause}
        GROUP BY tr.id
        ORDER BY
          CASE tr.status
            WHEN 'Active' THEN 1
            WHEN 'Draft' THEN 2
            WHEN 'Archived' THEN 3
            ELSE 4
          END,
          tr.created_at DESC
      `,
      [...values, userId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/training-rules/stats
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const result = await getDb().query(`
      SELECT
        COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (
          WHERE status = 'Draft'
        )::INTEGER AS draft,
        COUNT(*) FILTER (
          WHERE status = 'Active'
        )::INTEGER AS active,
        COUNT(*) FILTER (
          WHERE status = 'Archived'
        )::INTEGER AS archived
      FROM training_rules
    `);

    const acknowledgements = await getDb().query(`
      SELECT COUNT(*)::INTEGER AS total
      FROM training_rule_acknowledgements
    `);

    res.json({
      total: result.rows[0]?.total || 0,
      draft: result.rows[0]?.draft || 0,
      active: result.rows[0]?.active || 0,
      archived: result.rows[0]?.archived || 0,
      acknowledgements:
        acknowledgements.rows[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/training-rules/black-box-options
 *
 * Returns Black Box lessons that have not yet been converted.
 */
router.get(
  '/black-box-options',
  auth,
  managementOnly,
  async (req, res) => {
    try {
      const result = await getDb().query(`
        SELECT
          bb.id,
          bb.title,
          bb.department,
          bb.problem,
          bb.lesson_learned,
          bb.correct_solution,
          bb.prevention_steps,
          bb.action_required,
          bb.responsible_person,
          bb.status
        FROM black_box_entries bb
        LEFT JOIN training_rules tr
          ON tr.black_box_entry_id = bb.id
        WHERE tr.id IS NULL
        ORDER BY bb.created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/training-rules/from-black-box/:id
 *
 * Converts a Black Box lesson into a Draft rule.
 */
router.post(
  '/from-black-box/:id',
  auth,
  managementOnly,
  async (req, res) => {
    const db = getDb();

    try {
      const blackBoxResult = await db.query(
        `
          SELECT *
          FROM black_box_entries
          WHERE id = $1
        `,
        [req.params.id]
      );

      const blackBoxEntry = blackBoxResult.rows[0];

      if (!blackBoxEntry) {
        return res.status(404).json({
          error: 'Black Box lesson not found'
        });
      }

      const existingRule = await db.query(
        `
          SELECT id
          FROM training_rules
          WHERE black_box_entry_id = $1
        `,
        [req.params.id]
      );

      if (existingRule.rows[0]) {
        return res.status(409).json({
          error: 'This lesson has already been converted into a rule'
        });
      }

      const officialRule =
        blackBoxEntry.correct_solution ||
        blackBoxEntry.lesson_learned;

      const stepsToFollow =
        blackBoxEntry.prevention_steps ||
        blackBoxEntry.action_required ||
        '';

      const responsibleDepartment =
        blackBoxEntry.department || '';

      const approvedBy =
        req.user?.name ||
        req.user?.email ||
        '';

      const result = await db.query(
        `
          INSERT INTO training_rules (
            title,
            department,
            original_problem,
            lesson_learned,
            official_rule,
            steps_to_follow,
            prohibited_actions,
            responsible_department,
            approved_by,
            effective_date,
            black_box_entry_id,
            status,
            created_by,
            created_by_name
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,
            CURRENT_DATE,$10,'Draft',$11,$12
          )
          RETURNING *
        `,
        [
          blackBoxEntry.title,
          blackBoxEntry.department,
          blackBoxEntry.problem,
          blackBoxEntry.lesson_learned,
          officialRule,
          stepsToFollow,
          '',
          responsibleDepartment,
          approvedBy,
          blackBoxEntry.id,
          req.user?.id || null,
          approvedBy
        ]
      );

      await db.query(
        `
          UPDATE black_box_entries
          SET
            company_rule = true,
            status = 'Rule Created',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [blackBoxEntry.id]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/training-rules/:id
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const ruleResult = await getDb().query(
      `
        SELECT *
        FROM training_rules
        WHERE id = $1
      `,
      [req.params.id]
    );

    if (!ruleResult.rows[0]) {
      return res.status(404).json({
        error: 'Training rule not found'
      });
    }

    const acknowledgementResult = await getDb().query(
      `
        SELECT *
        FROM training_rule_acknowledgements
        WHERE rule_id = $1
        ORDER BY acknowledged_at DESC
      `,
      [req.params.id]
    );

    res.json({
      ...ruleResult.rows[0],
      acknowledgements: acknowledgementResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/training-rules
 */
router.post('/', auth, managementOnly, async (req, res) => {
  try {
    const {
      title,
      department,
      original_problem = '',
      lesson_learned = '',
      official_rule,
      steps_to_follow = '',
      prohibited_actions = '',
      responsible_department = '',
      approved_by = '',
      effective_date = null,
      status = 'Draft'
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        error: 'Rule title is required'
      });
    }

    if (!department?.trim()) {
      return res.status(400).json({
        error: 'Department is required'
      });
    }

    if (!official_rule?.trim()) {
      return res.status(400).json({
        error: 'Official company rule is required'
      });
    }

    const createdByName =
      req.user?.name ||
      req.user?.email ||
      '';

    const result = await getDb().query(
      `
        INSERT INTO training_rules (
          title,
          department,
          original_problem,
          lesson_learned,
          official_rule,
          steps_to_follow,
          prohibited_actions,
          responsible_department,
          approved_by,
          effective_date,
          status,
          created_by,
          created_by_name
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
        )
        RETURNING *
      `,
      [
        title.trim(),
        department.trim(),
        original_problem.trim(),
        lesson_learned.trim(),
        official_rule.trim(),
        steps_to_follow.trim(),
        prohibited_actions.trim(),
        responsible_department.trim(),
        approved_by.trim(),
        effective_date || null,
        status,
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
 * PUT /api/training-rules/:id
 */
router.put(
  '/:id',
  auth,
  managementOnly,
  async (req, res) => {
    try {
      const {
        title,
        department,
        original_problem = '',
        lesson_learned = '',
        official_rule,
        steps_to_follow = '',
        prohibited_actions = '',
        responsible_department = '',
        approved_by = '',
        effective_date = null,
        status = 'Draft'
      } = req.body;

      if (!title?.trim()) {
        return res.status(400).json({
          error: 'Rule title is required'
        });
      }

      if (!department?.trim()) {
        return res.status(400).json({
          error: 'Department is required'
        });
      }

      if (!official_rule?.trim()) {
        return res.status(400).json({
          error: 'Official company rule is required'
        });
      }

      const result = await getDb().query(
        `
          UPDATE training_rules
          SET
            title = $1,
            department = $2,
            original_problem = $3,
            lesson_learned = $4,
            official_rule = $5,
            steps_to_follow = $6,
            prohibited_actions = $7,
            responsible_department = $8,
            approved_by = $9,
            effective_date = $10,
            status = $11,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $12
          RETURNING *
        `,
        [
          title.trim(),
          department.trim(),
          original_problem.trim(),
          lesson_learned.trim(),
          official_rule.trim(),
          steps_to_follow.trim(),
          prohibited_actions.trim(),
          responsible_department.trim(),
          approved_by.trim(),
          effective_date || null,
          status,
          req.params.id
        ]
      );

      if (!result.rows[0]) {
        return res.status(404).json({
          error: 'Training rule not found'
        });
      }

      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/training-rules/:id/acknowledge
 */
router.post('/:id/acknowledge', auth, async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    if (!userId) {
      return res.status(400).json({
        error: 'Your user account could not be identified'
      });
    }

    const ruleResult = await getDb().query(
      `
        SELECT id
        FROM training_rules
        WHERE id = $1
          AND status = 'Active'
      `,
      [req.params.id]
    );

    if (!ruleResult.rows[0]) {
      return res.status(404).json({
        error: 'Active training rule not found'
      });
    }

    const userName =
      req.user?.name ||
      req.user?.email ||
      '';

    const result = await getDb().query(
      `
        INSERT INTO training_rule_acknowledgements (
          rule_id,
          user_id,
          user_name
        )
        VALUES ($1,$2,$3)
        ON CONFLICT (rule_id, user_id)
        DO UPDATE SET
          user_name = EXCLUDED.user_name,
          acknowledged_at = CURRENT_TIMESTAMP
        RETURNING *
      `,
      [
        req.params.id,
        userId,
        userName
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/training-rules/:id
 */
router.delete(
  '/:id',
  auth,
  managementOnly,
  async (req, res) => {
    try {
      await getDb().query(
        `
          DELETE FROM training_rule_acknowledgements
          WHERE rule_id = $1
        `,
        [req.params.id]
      );

      const result = await getDb().query(
        `
          DELETE FROM training_rules
          WHERE id = $1
          RETURNING id
        `,
        [req.params.id]
      );

      if (!result.rows[0]) {
        return res.status(404).json({
          error: 'Training rule not found'
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