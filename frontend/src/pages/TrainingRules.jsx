import { useEffect, useMemo, useState } from 'react';
import api from '../api';

const emptyForm = {
  title: '',
  department: 'Sales',
  original_problem: '',
  lesson_learned: '',
  official_rule: '',
  steps_to_follow: '',
  prohibited_actions: '',
  responsible_department: '',
  approved_by: '',
  effective_date: '',
  status: 'Draft'
};

const departments = [
  'Sales',
  'Operations',
  'Management',
  'Customer Service'
];

const statuses = ['Draft', 'Active', 'Archived'];

export default function TrainingRules() {
  const [rules, setRules] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    active: 0,
    archived: 0,
    acknowledgements: 0
  });

  const [blackBoxOptions, setBlackBoxOptions] = useState([]);
  const [selectedBlackBoxId, setSelectedBlackBoxId] = useState('');

  const [filters, setFilters] = useState({
    search: '',
    department: '',
    status: ''
  });

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedRule, setSelectedRule] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');

  const user = JSON.parse(
    localStorage.getItem('amc_user') || '{}'
  );

  const canManage = [
    'admin',
    'owner',
    'manager'
  ].includes(user.role);

  const loadRules = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/training-rules', {
        params: {
          search: filters.search || undefined,
          department: filters.department || undefined,
          status: filters.status || undefined
        }
      });

      setRules(response.data);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Unable to load Training Rule Book'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/training-rules/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Unable to load rule statistics:', err);
    }
  };

  const loadBlackBoxOptions = async () => {
    if (!canManage) return;

    try {
      const response = await api.get(
        '/training-rules/black-box-options'
      );

      setBlackBoxOptions(response.data);
    } catch (err) {
      console.error(
        'Unable to load Black Box lessons:',
        err
      );
    }
  };

  useEffect(() => {
    const delay = setTimeout(loadRules, 250);
    return () => clearTimeout(delay);
  }, [
    filters.search,
    filters.department,
    filters.status
  ]);

  useEffect(() => {
    loadStats();
    loadBlackBoxOptions();
  }, []);

  const activePercentage = useMemo(() => {
    if (!stats.total) return 0;

    return Math.round(
      (Number(stats.active || 0) /
        Number(stats.total || 1)) *
      100
    );
  }, [stats]);

  const openNewForm = () => {
    setEditingId(null);

    setForm({
      ...emptyForm,
      approved_by:
        user.name ||
        user.email ||
        ''
    });

    setSelectedRule(null);
    setShowForm(true);
    setError('');
  };

  const openEditForm = (rule) => {
    setEditingId(rule.id);

    setForm({
      title: rule.title || '',
      department: rule.department || 'Sales',
      original_problem: rule.original_problem || '',
      lesson_learned: rule.lesson_learned || '',
      official_rule: rule.official_rule || '',
      steps_to_follow: rule.steps_to_follow || '',
      prohibited_actions: rule.prohibited_actions || '',
      responsible_department:
        rule.responsible_department || '',
      approved_by: rule.approved_by || '',
      effective_date: rule.effective_date
        ? String(rule.effective_date).slice(0, 10)
        : '',
      status: rule.status || 'Draft'
    });

    setSelectedRule(null);
    setShowForm(true);
    setError('');
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  };

  const updateField = (name, value) => {
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const saveRule = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');

      if (editingId) {
        await api.put(
          `/training-rules/${editingId}`,
          form
        );
      } else {
        await api.post('/training-rules', form);
      }

      closeForm();

      await Promise.all([
        loadRules(),
        loadStats(),
        loadBlackBoxOptions()
      ]);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Unable to save this training rule'
      );
    } finally {
      setSaving(false);
    }
  };

  const convertBlackBoxLesson = async () => {
    if (!selectedBlackBoxId) {
      setError(
        'Select a Black Box lesson first.'
      );

      return;
    }

    try {
      setConverting(true);
      setError('');

      const response = await api.post(
        `/training-rules/from-black-box/${selectedBlackBoxId}`
      );

      setSelectedBlackBoxId('');
      setSelectedRule(response.data);

      await Promise.all([
        loadRules(),
        loadStats(),
        loadBlackBoxOptions()
      ]);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Unable to convert this lesson'
      );
    } finally {
      setConverting(false);
    }
  };

  const acknowledgeRule = async (rule) => {
    try {
      setError('');

      await api.post(
        `/training-rules/${rule.id}/acknowledge`
      );

      await Promise.all([
        loadRules(),
        loadStats()
      ]);

      setSelectedRule((current) =>
        current && current.id === rule.id
          ? {
              ...current,
              acknowledged_by_me: true,
              acknowledgement_count:
                Number(
                  current.acknowledgement_count || 0
                ) + 1
            }
          : current
      );
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Unable to acknowledge this rule'
      );
    }
  };

  const deleteRule = async (rule) => {
    const confirmed = window.confirm(
      `Delete "${rule.title}" permanently?`
    );

    if (!confirmed) return;

    try {
      setError('');

      await api.delete(
        `/training-rules/${rule.id}`
      );

      setSelectedRule(null);

      await Promise.all([
        loadRules(),
        loadStats(),
        loadBlackBoxOptions()
      ]);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Unable to delete this rule'
      );
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={headerRowStyle}>
        <div>
          <div className="topbar-title">
            Training Rule Book
          </div>

          <div style={subtitleStyle}>
            Official company procedures created from
            lessons, mistakes and approved improvements.
          </div>
        </div>

        {canManage && (
          <button
            className="btn btn-primary"
            onClick={openNewForm}
          >
            + Create Manual Rule
          </button>
        )}
      </div>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      <div style={metricGridStyle}>
        <MetricCard
          label="Total Rules"
          value={stats.total || 0}
          text="All company rules"
        />

        <MetricCard
          label="Active Rules"
          value={stats.active || 0}
          text={`${activePercentage}% currently active`}
        />

        <MetricCard
          label="Draft Rules"
          value={stats.draft || 0}
          text="Waiting for approval"
        />

        <MetricCard
          label="Acknowledgements"
          value={stats.acknowledgements || 0}
          text="Employee confirmations"
        />
      </div>

      {canManage && (
        <div
          className="card"
          style={{
            marginBottom: 18,
            padding: 18
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              marginBottom: 5
            }}
          >
            Convert Black Box Lesson
          </div>

          <div style={smallTextStyle}>
            Select an approved lesson and create a draft
            Training Rule automatically.
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 10,
              marginTop: 14
            }}
          >
            <select
              className="form-input"
              value={selectedBlackBoxId}
              onChange={(event) =>
                setSelectedBlackBoxId(
                  event.target.value
                )
              }
            >
              <option value="">
                Select a Black Box lesson
              </option>

              {blackBoxOptions.map((entry) => (
                <option
                  key={entry.id}
                  value={entry.id}
                >
                  {entry.department} — {entry.title}
                </option>
              ))}
            </select>

            <button
              className="btn btn-primary"
              onClick={convertBlackBoxLesson}
              disabled={
                converting ||
                !selectedBlackBoxId
              }
            >
              {converting
                ? 'Converting...'
                : 'Create Draft Rule'}
            </button>
          </div>

          {blackBoxOptions.length === 0 && (
            <div
              style={{
                ...smallTextStyle,
                marginTop: 10
              }}
            >
              No unconverted Black Box lessons are
              available.
            </div>
          )}
        </div>
      )}

      <div
        className="card"
        style={filterCardStyle}
      >
        <FormGroup label="Search rules">
          <input
            className="form-input"
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value
              }))
            }
            placeholder="Search title, rule, problem or department..."
          />
        </FormGroup>

        <FormGroup label="Department">
          <select
            className="form-input"
            value={filters.department}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                department:
                  event.target.value
              }))
            }
          >
            <option value="">
              All departments
            </option>

            {departments.map((department) => (
              <option
                key={department}
                value={department}
              >
                {department}
              </option>
            ))}
          </select>
        </FormGroup>

        <FormGroup label="Status">
          <select
            className="form-input"
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value
              }))
            }
          >
            <option value="">
              All statuses
            </option>

            {statuses.map((status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            ))}
          </select>
        </FormGroup>

        <button
          className="btn"
          onClick={() =>
            setFilters({
              search: '',
              department: '',
              status: ''
            })
          }
        >
          Clear
        </button>
      </div>

      <div
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>
                  Rule
                </th>

                <th style={tableHeaderStyle}>
                  Department
                </th>

                <th style={tableHeaderStyle}>
                  Status
                </th>

                <th style={tableHeaderStyle}>
                  Effective Date
                </th>

                <th style={tableHeaderStyle}>
                  Approved By
                </th>

                <th style={tableHeaderStyle}>
                  Read By
                </th>

                <th style={tableHeaderStyle}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    style={emptyStyle}
                  >
                    Loading Training Rule Book...
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    style={emptyStyle}
                  >
                    No rules created yet. Convert a
                    Black Box lesson or create a manual
                    rule.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id}>
                    <td style={tableCellStyle}>
                      <button
                        style={titleButtonStyle}
                        onClick={() =>
                          setSelectedRule(rule)
                        }
                      >
                        {rule.title}
                      </button>

                      <div style={rowSubtitleStyle}>
                        {rule.official_rule}
                      </div>
                    </td>

                    <td style={tableCellStyle}>
                      <span className="chip">
                        {rule.department}
                      </span>
                    </td>

                    <td style={tableCellStyle}>
                      <span className="chip">
                        {rule.status}
                      </span>
                    </td>

                    <td style={tableCellStyle}>
                      {formatDate(
                        rule.effective_date
                      )}
                    </td>

                    <td style={tableCellStyle}>
                      {rule.approved_by || '—'}
                    </td>

                    <td style={tableCellStyle}>
                      {rule.acknowledgement_count || 0}
                    </td>

                    <td style={tableCellStyle}>
                      <div style={actionRowStyle}>
                        <button
                          className="btn btn-sm"
                          onClick={() =>
                            setSelectedRule(rule)
                          }
                        >
                          View
                        </button>

                        {canManage && (
                          <button
                            className="btn btn-sm"
                            onClick={() =>
                              openEditForm(rule)
                            }
                          >
                            Edit
                          </button>
                        )}

                        {rule.status === 'Active' &&
                          !rule.acknowledged_by_me && (
                            <button
                              className="btn btn-sm"
                              onClick={() =>
                                acknowledgeRule(rule)
                              }
                            >
                              I Understand
                            </button>
                          )}

                        {rule.acknowledged_by_me && (
                          <span className="chip">
                            Read
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <div style={modalTitleStyle}>
                  {editingId
                    ? 'Edit Training Rule'
                    : 'Create Training Rule'}
                </div>

                <div style={smallTextStyle}>
                  Create the official procedure employees
                  must follow.
                </div>
              </div>

              <button
                className="btn"
                onClick={closeForm}
              >
                Close
              </button>
            </div>

            {error && (
              <div style={errorStyle}>
                {error}
              </div>
            )}

            <form onSubmit={saveRule}>
              <div style={formGridStyle}>
                <InputField
                  label="Rule title *"
                  value={form.title}
                  onChange={(value) =>
                    updateField('title', value)
                  }
                  required
                />

                <SelectField
                  label="Department *"
                  value={form.department}
                  onChange={(value) =>
                    updateField(
                      'department',
                      value
                    )
                  }
                  options={departments}
                />

                <TextAreaField
                  label="Original problem"
                  value={form.original_problem}
                  onChange={(value) =>
                    updateField(
                      'original_problem',
                      value
                    )
                  }
                  placeholder="What problem caused this rule?"
                />

                <TextAreaField
                  label="Lesson learned"
                  value={form.lesson_learned}
                  onChange={(value) =>
                    updateField(
                      'lesson_learned',
                      value
                    )
                  }
                  placeholder="What did the company learn?"
                />

                <TextAreaField
                  label="Official company rule *"
                  value={form.official_rule}
                  onChange={(value) =>
                    updateField(
                      'official_rule',
                      value
                    )
                  }
                  placeholder="Write the official rule clearly"
                  required
                />

                <TextAreaField
                  label="Steps employees must follow"
                  value={form.steps_to_follow}
                  onChange={(value) =>
                    updateField(
                      'steps_to_follow',
                      value
                    )
                  }
                  placeholder="Step 1, Step 2, Step 3..."
                />

                <TextAreaField
                  label="What employees must not do"
                  value={form.prohibited_actions}
                  onChange={(value) =>
                    updateField(
                      'prohibited_actions',
                      value
                    )
                  }
                  placeholder="Actions that are prohibited"
                />

                <InputField
                  label="Responsible department"
                  value={
                    form.responsible_department
                  }
                  onChange={(value) =>
                    updateField(
                      'responsible_department',
                      value
                    )
                  }
                />

                <InputField
                  label="Approved by"
                  value={form.approved_by}
                  onChange={(value) =>
                    updateField(
                      'approved_by',
                      value
                    )
                  }
                />

                <InputField
                  label="Effective date"
                  type="date"
                  value={form.effective_date}
                  onChange={(value) =>
                    updateField(
                      'effective_date',
                      value
                    )
                  }
                />

                <SelectField
                  label="Status"
                  value={form.status}
                  onChange={(value) =>
                    updateField('status', value)
                  }
                  options={statuses}
                />
              </div>

              <div style={formActionStyle}>
                <button
                  type="button"
                  className="btn"
                  onClick={closeForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingId
                      ? 'Update Rule'
                      : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedRule && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <div style={modalTitleStyle}>
                  {selectedRule.title}
                </div>

                <div style={tagRowStyle}>
                  <span className="chip">
                    {selectedRule.department}
                  </span>

                  <span className="chip">
                    {selectedRule.status}
                  </span>

                  {selectedRule.black_box_entry_id && (
                    <span className="chip">
                      From Black Box
                    </span>
                  )}
                </div>
              </div>

              <button
                className="btn"
                onClick={() =>
                  setSelectedRule(null)
                }
              >
                Close
              </button>
            </div>

            <Detail
              label="Original problem"
              value={
                selectedRule.original_problem ||
                'Not specified'
              }
            />

            <Detail
              label="Lesson learned"
              value={
                selectedRule.lesson_learned ||
                'Not specified'
              }
            />

            <Detail
              label="Official company rule"
              value={selectedRule.official_rule}
            />

            <Detail
              label="Steps employees must follow"
              value={
                selectedRule.steps_to_follow ||
                'Not specified'
              }
            />

            <Detail
              label="Employees must not"
              value={
                selectedRule.prohibited_actions ||
                'Not specified'
              }
            />

            <Detail
              label="Responsible department"
              value={
                selectedRule.responsible_department ||
                'Not assigned'
              }
            />

            <Detail
              label="Approved by"
              value={
                selectedRule.approved_by ||
                'Not approved'
              }
            />

            <Detail
              label="Effective date"
              value={formatDate(
                selectedRule.effective_date
              )}
            />

            <Detail
              label="Employee acknowledgements"
              value={`${
                selectedRule.acknowledgement_count || 0
              } employee(s)`}
            />

            <div style={formActionStyle}>
              {selectedRule.status === 'Active' &&
                !selectedRule.acknowledged_by_me && (
                  <button
                    className="btn btn-primary"
                    onClick={() =>
                      acknowledgeRule(selectedRule)
                    }
                  >
                    I Have Read and Understood
                  </button>
                )}

              {selectedRule.acknowledged_by_me && (
                <span className="chip">
                  Read and Understood
                </span>
              )}

              {canManage && (
                <>
                  <button
                    className="btn"
                    onClick={() =>
                      openEditForm(selectedRule)
                    }
                  >
                    Edit Rule
                  </button>

                  <button
                    className="btn"
                    onClick={() =>
                      deleteRule(selectedRule)
                    }
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, text }) {
  return (
    <div className="card">
      <div className="metric-label">
        {label}
      </div>

      <div className="metric-val">
        {value}
      </div>

      <div className="metric-sub">
        {text}
      </div>
    </div>
  );
}

function FormGroup({ label, children }) {
  return (
    <div
      className="form-group"
      style={{ marginBottom: 0 }}
    >
      <label className="form-label">
        {label}
      </label>

      {children}
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  required = false
}) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
      </label>

      <input
        className="form-input"
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        required={required}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
      </label>

      <select
        className="form-input"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder = '',
  required = false
}) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
      </label>

      <textarea
        className="form-input"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        required={required}
        rows="5"
        style={{ resize: 'vertical' }}
      />
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div style={detailStyle}>
      <div style={detailLabelStyle}>
        {label}
      </div>

      <div style={detailValueStyle}>
        {value}
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '—';

  return new Date(value).toLocaleDateString();
}

const headerRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  marginBottom: 24
};

const subtitleStyle = {
  color: 'var(--text-3)',
  fontSize: 13,
  marginTop: 5,
  maxWidth: 760
};

const smallTextStyle = {
  color: 'var(--text-3)',
  fontSize: 12
};

const errorStyle = {
  color: 'var(--red)',
  background: 'var(--surface, #ffffff)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: 13,
  marginBottom: 16,
  fontSize: 13
};

const metricGridStyle = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(4, minmax(0, 1fr))',
  gap: 14,
  marginBottom: 20
};

const filterCardStyle = {
  marginBottom: 18,
  display: 'grid',
  gridTemplateColumns:
    '2fr 1fr 1fr auto',
  gap: 12,
  alignItems: 'end'
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: 980
};

const tableHeaderStyle = {
  padding: '12px 14px',
  textAlign: 'left',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '.04em',
  color: 'var(--text-3)',
  borderBottom: '1px solid var(--border)'
};

const tableCellStyle = {
  padding: 14,
  borderBottom: '1px solid var(--border)',
  fontSize: 13,
  verticalAlign: 'top'
};

const emptyStyle = {
  padding: 36,
  textAlign: 'center',
  color: 'var(--text-3)',
  fontSize: 13
};

const titleButtonStyle = {
  border: 0,
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left',
  color: 'var(--text-1)',
  fontWeight: 700
};

const rowSubtitleStyle = {
  color: 'var(--text-3)',
  fontSize: 11,
  marginTop: 5,
  maxWidth: 320,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

const actionRowStyle = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap'
};

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  background: 'rgba(0,0,0,.58)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20
};

const modalStyle = {
  width: 'min(980px, 100%)',
  maxHeight: '92vh',
  overflowY: 'auto',
  background: 'var(--surface, #ffffff)',
  color: 'var(--text-1)',
  borderRadius: 14,
  border: '1px solid var(--border)',
  padding: 24,
  boxShadow:
    '0 24px 80px rgba(0,0,0,.28)'
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 14,
  marginBottom: 20
};

const modalTitleStyle = {
  fontSize: 20,
  fontWeight: 700
};

const tagRowStyle = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginTop: 8
};

const formGridStyle = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(2, minmax(0, 1fr))',
  gap: '0 16px'
};

const formActionStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  flexWrap: 'wrap',
  marginTop: 22
};

const detailStyle = {
  padding: '13px 0',
  borderBottom: '1px solid var(--border)'
};

const detailLabelStyle = {
  color: 'var(--text-3)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '.04em',
  marginBottom: 5
};

const detailValueStyle = {
  fontSize: 14,
  whiteSpace: 'pre-wrap',
  lineHeight: 1.65
};