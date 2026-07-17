const router = require('express').Router();
const { getDb } = require('../db/database');
const { auth } = require('../middleware/auth');

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function currentMonthDates() {
  const now = new Date();

  return {
    from: formatDate(
      new Date(now.getFullYear(), now.getMonth(), 1)
    ),
    to: formatDate(now)
  };
}

function createFilter(alias, from, to, department) {
  const values = [from, to];

  const conditions = [
    `${alias}.created_at >= $1::date`,
    `${alias}.created_at < ($2::date + INTERVAL '1 day')`
  ];

  if (department) {
    values.push(department);
    conditions.push(
      `${alias}.department = $${values.length}`
    );
  }

  return {
    values,
    where: `WHERE ${conditions.join(' AND ')}`
  };
}

/**
 * GET /api/learning-reports/monthly
 */
router.get('/monthly', auth, async (req, res) => {
  try {
    const defaults = currentMonthDates();

    const from = req.query.from || defaults.from;
    const to = req.query.to || defaults.to;
    const department = req.query.department || '';

    const blackBoxFilter = createFilter(
      'bb',
      from,
      to,
      department
    );

    const ruleFilter = createFilter(
      'tr',
      from,
      to,
      department
    );

    const actionFilter = createFilter(
      'ia',
      from,
      to,
      department
    );

    const blackBoxSummary = await getDb().query(
      `
        SELECT
          COUNT(*)::INTEGER AS total,
          COUNT(*) FILTER (
            WHERE bb.status = 'New'
          )::INTEGER AS new_lessons,
          COUNT(*) FILTER (
            WHERE bb.status = 'Under Review'
          )::INTEGER AS under_review,
          COUNT(*) FILTER (
            WHERE bb.status = 'Implemented'
          )::INTEGER AS implemented,
          COUNT(*) FILTER (
            WHERE bb.company_rule = true
          )::INTEGER AS converted_to_rules
        FROM black_box_entries bb
        ${blackBoxFilter.where}
      `,
      blackBoxFilter.values
    );

    const trainingRuleSummary = await getDb().query(
      `
        SELECT
          COUNT(*)::INTEGER AS total,
          COUNT(*) FILTER (
            WHERE tr.status = 'Draft'
          )::INTEGER AS draft,
          COUNT(*) FILTER (
            WHERE tr.status = 'Active'
          )::INTEGER AS active,
          COUNT(*) FILTER (
            WHERE tr.status = 'Archived'
          )::INTEGER AS archived
        FROM training_rules tr
        ${ruleFilter.where}
      `,
      ruleFilter.values
    );

    const implementationSummary = await getDb().query(
      `
        SELECT
          COUNT(*)::INTEGER AS total,
          COUNT(*) FILTER (
            WHERE ia.status = 'Not Started'
          )::INTEGER AS not_started,
          COUNT(*) FILTER (
            WHERE ia.status = 'In Progress'
          )::INTEGER AS in_progress,
          COUNT(*) FILTER (
            WHERE ia.status = 'Verification Required'
          )::INTEGER AS verification_required,
          COUNT(*) FILTER (
            WHERE ia.status = 'Verified'
          )::INTEGER AS verified,
          COUNT(*) FILTER (
            WHERE ia.due_date < CURRENT_DATE
              AND ia.status NOT IN ('Verified', 'Rejected')
          )::INTEGER AS overdue
        FROM implementation_actions ia
        ${actionFilter.where}
      `,
      actionFilter.values
    );

    const blackBoxEntries = await getDb().query(
      `
        SELECT
          bb.id,
          bb.title,
          bb.department,
          bb.employee_name,
          bb.problem,
          bb.root_cause,
          bb.lesson_learned,
          bb.correct_solution,
          bb.status,
          bb.company_rule,
          bb.created_by_name,
          bb.created_at
        FROM black_box_entries bb
        ${blackBoxFilter.where}
        ORDER BY bb.created_at DESC
      `,
      blackBoxFilter.values
    );

    const trainingRules = await getDb().query(
      `
        SELECT
          tr.id,
          tr.title,
          tr.department,
          tr.official_rule,
          tr.responsible_department,
          tr.approved_by,
          tr.status,
          tr.effective_date,
          tr.created_at
        FROM training_rules tr
        ${ruleFilter.where}
        ORDER BY tr.created_at DESC
      `,
      ruleFilter.values
    );

    const implementationActions = await getDb().query(
      `
        SELECT
          ia.id,
          ia.title,
          ia.department,
          ia.source_type,
          ia.action_required,
          ia.responsible_person,
          ia.due_date,
          ia.status,
          ia.evidence,
          ia.manager_verification,
          ia.completion_date,
          ia.created_at
        FROM implementation_actions ia
        ${actionFilter.where}
        ORDER BY
          ia.due_date ASC NULLS LAST,
          ia.created_at DESC
      `,
      actionFilter.values
    );

    const contributors = await getDb().query(
      `
        SELECT
          COALESCE(
            NULLIF(bb.employee_name, ''),
            NULLIF(bb.created_by_name, ''),
            'Not specified'
          ) AS employee,
          COUNT(*)::INTEGER AS lessons_submitted
        FROM black_box_entries bb
        ${blackBoxFilter.where}
        GROUP BY employee
        ORDER BY lessons_submitted DESC, employee
      `,
      blackBoxFilter.values
    );

    const repeatedLessons = await getDb().query(
      `
        SELECT
          LOWER(TRIM(bb.title)) AS repeated_title,
          MIN(bb.title) AS title,
          COUNT(*)::INTEGER AS occurrences
        FROM black_box_entries bb
        ${blackBoxFilter.where}
        GROUP BY LOWER(TRIM(bb.title))
        HAVING COUNT(*) > 1
        ORDER BY occurrences DESC
      `,
      blackBoxFilter.values
    );

    res.json({
      period: {
        from,
        to,
        department: department || 'All Departments'
      },

      summary: {
        blackBox: blackBoxSummary.rows[0],
        trainingRules: trainingRuleSummary.rows[0],
        implementation: implementationSummary.rows[0]
      },

      blackBoxEntries: blackBoxEntries.rows,
      trainingRules: trainingRules.rows,
      implementationActions: implementationActions.rows,
      contributors: contributors.rows,
      repeatedLessons: repeatedLessons.rows
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

module.exports = router;