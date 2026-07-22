const router = require('express').Router();
const { getDb } = require('../db/database');
const { auth } = require('../middleware/auth');

const managementRoles = ['admin', 'owner', 'manager'];

function canManage(user) {
  return managementRoles.includes(user?.role);
}

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
      conditions.push(`department = $${values.length}`);
    }

    if (status) {
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      const param = `$${values.length}`;

      conditions.push(`
        (
          title ILIKE ${param}
          OR employee_name ILIKE ${param}
          OR related_reference ILIKE ${param}
          OR problem ILIKE ${param}
          OR root_cause ILIKE ${param}
          OR lesson_learned ILIKE ${param}
          OR correct_solution ILIKE ${param}
          OR prevention_steps ILIKE ${param}
          OR responsible_person ILIKE ${param}
        )
      `);
    }

    const where = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const result = await getDb().query(
      `
        SELECT
          bb.*,
          EXISTS (
            SELECT 1
            FROM training_rules tr
            WHERE tr.black_box_entry_id = bb.id
          ) AS has_training_rule
        FROM black_box_entries bb
        ${where}
        ORDER BY bb.created_at DESC, bb.id DESC
      `,
      values
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const total = await getDb().query(`
      SELECT COUNT(*)::INTEGER AS total
      FROM black_box_entries
    `);

    const rules = await getDb().query(`
      SELECT COUNT(*)::INTEGER AS total
      FROM black_box_entries
      WHERE company_rule = true
    `);

    const byStatus = await getDb().query(`
      SELECT status, COUNT(*)::INTEGER AS total
      FROM black_box_entries
      GROUP BY status
      ORDER BY status
    `);

    const byDepartment = await getDb().query(`
      SELECT department, COUNT(*)::INTEGER AS total
      FROM black_box_entries
      GROUP BY department
      ORDER BY department
    `);

    res.json({
      total: total.rows[0]?.total || 0,
      rulesCreated: rules.rows[0]?.total || 0,
      byStatus: byStatus.rows,
      byDepartment: byDepartment.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await getDb().query(
      'SELECT * FROM black_box_entries WHERE id = $1',
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: 'Black Box entry not found'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      department,
      employee_name = '',
      related_reference = '',
      problem,
      root_cause = '',
      lesson_learned,
      correct_solution = '',
      prevention_steps = '',
      action_required = '',
      responsible_person = '',
      due_date = null,
      status = 'New',
      manager_review = '',
      company_rule = false
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!department?.trim()) {
      return res.status(400).json({ error: 'Department is required' });
    }

    if (!problem?.trim()) {
      return res.status(400).json({
        error: 'Problem or mistake is required'
      });
    }

    if (!lesson_learned?.trim()) {
      return res.status(400).json({
        error: 'Lesson learned is required'
      });
    }

    const result = await getDb().query(
      `
        INSERT INTO black_box_entries (
          title,
          department,
          employee_name,
          related_reference,
          problem,
          root_cause,
          lesson_learned,
          correct_solution,
          prevention_steps,
          action_required,
          responsible_person,
          due_date,
          status,
          manager_review,
          company_rule,
          created_by,
          created_by_name
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,
          $10,$11,$12,$13,$14,$15,$16,$17
        )
        RETURNING *
      `,
      [
        title.trim(),
        department.trim(),
        employee_name.trim(),
        related_reference.trim(),
        problem.trim(),
        root_cause.trim(),
        lesson_learned.trim(),
        correct_solution.trim(),
        prevention_steps.trim(),
        action_required.trim(),
        responsible_person.trim(),
        due_date || null,
        status,
        manager_review.trim(),
        company_rule === true || company_rule === 'true',
        req.user?.id || null,
        req.user?.name || req.user?.email || ''
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const current = await getDb().query(
      'SELECT * FROM black_box_entries WHERE id = $1',
      [req.params.id]
    );

    if (!current.rows[0]) {
      return res.status(404).json({
        error: 'Black Box entry not found'
      });
    }

    const entry = current.rows[0];

    const isCreator =
      entry.created_by &&
      Number(entry.created_by) === Number(req.user?.id);

    if (!canManage(req.user) && !isCreator) {
      return res.status(403).json({
        error: 'You do not have permission to edit this entry'
      });
    }

    const {
      title,
      department,
      employee_name = '',
      related_reference = '',
      problem,
      root_cause = '',
      lesson_learned,
      correct_solution = '',
      prevention_steps = '',
      action_required = '',
      responsible_person = '',
      due_date = null,
      status = 'New',
      manager_review = '',
      company_rule = false
    } = req.body;

    if (!title?.trim() || !department?.trim()) {
      return res.status(400).json({
        error: 'Title and department are required'
      });
    }

    if (!problem?.trim() || !lesson_learned?.trim()) {
      return res.status(400).json({
        error: 'Problem and lesson learned are required'
      });
    }

    const result = await getDb().query(
      `
        UPDATE black_box_entries
        SET
          title = $1,
          department = $2,
          employee_name = $3,
          related_reference = $4,
          problem = $5,
          root_cause = $6,
          lesson_learned = $7,
          correct_solution = $8,
          prevention_steps = $9,
          action_required = $10,
          responsible_person = $11,
          due_date = $12,
          status = $13,
          manager_review = $14,
          company_rule = $15,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $16
        RETURNING *
      `,
      [
        title.trim(),
        department.trim(),
        employee_name.trim(),
        related_reference.trim(),
        problem.trim(),
        root_cause.trim(),
        lesson_learned.trim(),
        correct_solution.trim(),
        prevention_steps.trim(),
        action_required.trim(),
        responsible_person.trim(),
        due_date || null,
        status,
        manager_review.trim(),
        company_rule === true || company_rule === 'true',
        req.params.id
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!canManage(req.user)) {
      return res.status(403).json({
        error: 'Only management can delete Black Box entries'
      });
    }

    const result = await getDb().query(
      `
        DELETE FROM black_box_entries
        WHERE id = $1
        RETURNING id
      `,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: 'Black Box entry not found'
      });
    }

    res.json({
      success: true,
      id: result.rows[0].id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;