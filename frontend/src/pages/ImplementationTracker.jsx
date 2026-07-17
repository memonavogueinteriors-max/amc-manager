import { useEffect, useMemo, useState } from 'react';
import api from '../api';

const statuses = [
  'Not Started',
  'In Progress',
  'Implemented',
  'Verification Required',
  'Verified',
  'Rejected'
];

const departments = [
  'Sales',
  'Operations',
  'Management',
  'Customer Service'
];

const emptyForm = {
  title: '',
  source_type: 'Black Box',
  black_box_entry_id: '',
  training_rule_id: '',
  department: 'Sales',
  action_required: '',
  responsible_person: '',
  due_date: '',
  status: 'Not Started',
  evidence: '',
  manager_verification: '',
  completion_date: ''
};

export default function ImplementationTracker() {
  const [actions, setActions] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    not_started: 0,
    in_progress: 0,
    implemented: 0,
    verification_required: 0,
    verified: 0,
    overdue: 0
  });

  const [sourceOptions, setSourceOptions] = useState({
    blackBox: [],
    trainingRules: []
  });

  const [filters, setFilters] = useState({
    search: '',
    department: '',
    status: ''
  });

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const user = JSON.parse(
    localStorage.getItem('amc_user') || '{}'
  );

  const canManage = [
    'admin',
    'owner',
    'manager'
  ].includes(user.role);

  const loadActions = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(
        '/implementation-tracker',
        {
          params: {
            search: filters.search || undefined,
            department:
              filters.department || undefined,
            status: filters.status || undefined
          }
        }
      );

      setActions(response.data);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Unable to load implementation actions'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get(
        '/implementation-tracker/stats'
      );

      setStats(response.data);
    } catch (err) {
      console.error(
        'Unable to load implementation statistics:',
        err
      );
    }
  };

  const loadSourceOptions = async () => {
    try {
      const response = await api.get(
        '/implementation-tracker/source-options'
      );

      setSourceOptions(response.data);
    } catch (err) {
      console.error(
        'Unable to load source options:',
        err
      );
    }
  };

  useEffect(() => {
    const delay = setTimeout(loadActions, 250);

    return () => clearTimeout(delay);
  }, [
    filters.search,
    filters.department,
    filters.status
  ]);

  useEffect(() => {
    loadStats();
    loadSourceOptions();
  }, []);

  const openNewForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSelectedAction(null);
    setShowForm(true);
    setError('');
  };

  const openEditForm = (action) => {
    setEditingId(action.id);

    setForm({
      title: action.title || '',
      source_type:
        action.source_type || 'Black Box',
      black_box_entry_id:
        action.black_box_entry_id || '',
      training_rule_id:
        action.training_rule_id || '',
      department: action.department || 'Sales',
      action_required:
        action.action_required || '',
      responsible_person:
        action.responsible_person || '',
      due_date: action.due_date
        ? String(action.due_date).slice(0, 10)
        : '',
      status: action.status || 'Not Started',
      evidence: action.evidence || '',
      manager_verification:
        action.manager_verification || '',
      completion_date: action.completion_date
        ? String(action.completion_date).slice(0, 10)
        : ''
    });

    setSelectedAction(null);
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

  const selectSourceType = (value) => {
    setForm((current) => ({
      ...current,
      source_type: value,
      black_box_entry_id: '',
      training_rule_id: ''
    }));
  };

  const selectBlackBoxSource = (id) => {
    const entry = sourceOptions.blackBox.find(
      (item) => String(item.id) === String(id)
    );

    setForm((current) => ({
      ...current,
      black_box_entry_id: id,
      training_rule_id: '',
      title: entry?.title || current.title,
      department:
        entry?.department || current.department,
      action_required:
        entry?.action_required ||
        current.action_required,
      responsible_person:
        entry?.responsible_person ||
        current.responsible_person,
      due_date: entry?.due_date
        ? String(entry.due_date).slice(0, 10)
        : current.due_date
    }));
  };

  const selectTrainingRuleSource = (id) => {
    const rule = sourceOptions.trainingRules.find(
      (item) => String(item.id) === String(id)
    );

    setForm((current) => ({
      ...current,
      training_rule_id: id,
      black_box_entry_id: '',
      title: rule?.title || current.title,
      department:
        rule?.department || current.department,
      action_required:
        rule?.official_rule ||
        current.action_required
    }));
  };

  const saveAction = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');

      const payload = {
        ...form,
        black_box_entry_id:
          form.black_box_entry_id || null,
        training_rule_id:
          form.training_rule_id || null,
        due_date: form.due_date || null,
        completion_date:
          form.completion_date || null
      };

      if (editingId) {
        await api.put(
          `/implementation-tracker/${editingId}`,
          payload
        );
      } else {
        await api.post(
          '/implementation-tracker',
          payload
        );
      }

      closeForm();

      await Promise.all([
        loadActions(),
        loadStats()
      ]);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Unable to save implementation action'
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteAction = async (action) => {
    const confirmed = window.confirm(
      `Delete "${action.title}" permanently?`
    );

    if (!confirmed) return;

    try {
      setError('');

      await api.delete(
        `/implementation-tracker/${action.id}`
      );

      setSelectedAction(null);

      await Promise.all([
        loadActions(),
        loadStats()
      ]);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Unable to delete implementation action'
      );
    }
  };

  const overdueActions = useMemo(() => {
    return actions.filter((action) => {
      if (!action.due_date) return false;

      const completedStatuses = [
        'Verified',
        'Rejected'
      ];

      return (
        new Date(action.due_date) <
          new Date(new Date().toDateString()) &&
        !completedStatuses.includes(action.status)
      );
    });
  }, [actions]);

  return (
    <div style={{ padding: 24 }}>
      <div style={headerStyle}>
        <div>
          <div className="topbar-title">
            Implementation Tracker
          </div>

          <div style={subtitleStyle}>
            Track whether lessons and company rules
            were actually implemented, verified and
            completed.
          </div>
        </div>

        {canManage && (
          <button
            className="btn btn-primary"
            onClick={openNewForm}
          >
            + Add Implementation Action
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
          label="Total Actions"
          value={stats.total || 0}
          text="All implementation actions"
        />

        <MetricCard
          label="In Progress"
          value={stats.in_progress || 0}
          text="Currently being implemented"
        />

        <MetricCard
          label="Verification Required"
          value={
            stats.verification_required || 0
          }
          text="Waiting for management review"
        />

        <MetricCard
          label="Overdue"
          value={stats.overdue || 0}
          text="Past the assigned deadline"
        />
      </div>

      {overdueActions.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: 18,
            borderLeft: '4px solid var(--red)',
            padding: 16
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 5
            }}
          >
            Overdue implementation actions
          </div>

          <div style={subtitleStyle}>
            {overdueActions.length} action(s) require
            immediate attention.
          </div>
        </div>
      )}

      <div
        className="card"
        style={filterGridStyle}
      >
        <FieldGroup label="Search actions">
          <input
            className="form-input"
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value
              }))
            }
            placeholder="Search action, person, evidence or lesson..."
          />
        </FieldGroup>

        <FieldGroup label="Department">
          <select
            className="form-input"
            value={filters.department}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                department: event.target.value
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
        </FieldGroup>

        <FieldGroup label="Status">
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
        </FieldGroup>

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
                  Action
                </th>

                <th style={tableHeaderStyle}>
                  Source
                </th>

                <th style={tableHeaderStyle}>
                  Department
                </th>

                <th style={tableHeaderStyle}>
                  Responsible
                </th>

                <th style={tableHeaderStyle}>
                  Due Date
                </th>

                <th style={tableHeaderStyle}>
                  Status
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
                    Loading implementation actions...
                  </td>
                </tr>
              ) : actions.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    style={emptyStyle}
                  >
                    No implementation actions have been
                    created yet.
                  </td>
                </tr>
              ) : (
                actions.map((action) => {
                  const overdue =
                    action.due_date &&
                    new Date(action.due_date) <
                      new Date(
                        new Date().toDateString()
                      ) &&
                    ![
                      'Verified',
                      'Rejected'
                    ].includes(action.status);

                  return (
                    <tr key={action.id}>
                      <td style={tableCellStyle}>
                        <button
                          style={titleButtonStyle}
                          onClick={() =>
                            setSelectedAction(action)
                          }
                        >
                          {action.title}
                        </button>

                        <div style={rowSubtitleStyle}>
                          {action.action_required}
                        </div>
                      </td>

                      <td style={tableCellStyle}>
                        <span className="chip">
                          {action.source_type}
                        </span>

                        <div style={rowSubtitleStyle}>
                          {action.black_box_title ||
                            action.training_rule_title ||
                            'Manual action'}
                        </div>
                      </td>

                      <td style={tableCellStyle}>
                        {action.department || '—'}
                      </td>

                      <td style={tableCellStyle}>
                        {action.responsible_person ||
                          'Not assigned'}
                      </td>

                      <td style={tableCellStyle}>
                        <span
                          style={
                            overdue
                              ? {
                                  color: 'var(--red)',
                                  fontWeight: 700
                                }
                              : {}
                          }
                        >
                          {formatDate(action.due_date)}
                        </span>
                      </td>

                      <td style={tableCellStyle}>
                        <span className="chip">
                          {action.status}
                        </span>
                      </td>

                      <td style={tableCellStyle}>
                        <div style={actionRowStyle}>
                          <button
                            className="btn btn-sm"
                            onClick={() =>
                              setSelectedAction(action)
                            }
                          >
                            View
                          </button>

                          {canManage && (
                            <button
                              className="btn btn-sm"
                              onClick={() =>
                                openEditForm(action)
                              }
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
                    ? 'Edit Implementation Action'
                    : 'Add Implementation Action'}
                </div>

                <div style={subtitleStyle}>
                  Assign the action, deadline, evidence
                  and verification status.
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

            <form onSubmit={saveAction}>
              <div style={formGridStyle}>
                <SelectField
                  label="Source type"
                  value={form.source_type}
                  onChange={selectSourceType}
                  options={[
                    'Black Box',
                    'Training Rule',
                    'Manual'
                  ]}
                />

                {form.source_type ===
                  'Black Box' && (
                  <div className="form-group">
                    <label className="form-label">
                      Black Box lesson
                    </label>

                    <select
                      className="form-input"
                      value={
                        form.black_box_entry_id
                      }
                      onChange={(event) =>
                        selectBlackBoxSource(
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Select lesson
                      </option>

                      {sourceOptions.blackBox.map(
                        (entry) => (
                          <option
                            key={entry.id}
                            value={entry.id}
                          >
                            {entry.department} —{' '}
                            {entry.title}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

                {form.source_type ===
                  'Training Rule' && (
                  <div className="form-group">
                    <label className="form-label">
                      Training Rule
                    </label>

                    <select
                      className="form-input"
                      value={
                        form.training_rule_id
                      }
                      onChange={(event) =>
                        selectTrainingRuleSource(
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Select Training Rule
                      </option>

                      {sourceOptions.trainingRules.map(
                        (rule) => (
                          <option
                            key={rule.id}
                            value={rule.id}
                          >
                            {rule.department} —{' '}
                            {rule.title}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

                <InputField
                  label="Action title *"
                  value={form.title}
                  onChange={(value) =>
                    updateField('title', value)
                  }
                  required
                />

                <SelectField
                  label="Department"
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
                  label="Action required *"
                  value={form.action_required}
                  onChange={(value) =>
                    updateField(
                      'action_required',
                      value
                    )
                  }
                  placeholder="Explain exactly what must be implemented"
                  required
                />

                <InputField
                  label="Responsible person"
                  value={
                    form.responsible_person
                  }
                  onChange={(value) =>
                    updateField(
                      'responsible_person',
                      value
                    )
                  }
                />

                <InputField
                  label="Due date"
                  type="date"
                  value={form.due_date}
                  onChange={(value) =>
                    updateField(
                      'due_date',
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

                <TextAreaField
                  label="Evidence of implementation"
                  value={form.evidence}
                  onChange={(value) =>
                    updateField(
                      'evidence',
                      value
                    )
                  }
                  placeholder="Document, screenshot, process change or result"
                />

                <TextAreaField
                  label="Manager verification"
                  value={
                    form.manager_verification
                  }
                  onChange={(value) =>
                    updateField(
                      'manager_verification',
                      value
                    )
                  }
                  placeholder="Management confirmation or rejection reason"
                />

                <InputField
                  label="Completion date"
                  type="date"
                  value={form.completion_date}
                  onChange={(value) =>
                    updateField(
                      'completion_date',
                      value
                    )
                  }
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
                      ? 'Update Action'
                      : 'Create Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedAction && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <div style={modalTitleStyle}>
                  {selectedAction.title}
                </div>

                <div style={tagRowStyle}>
                  <span className="chip">
                    {selectedAction.source_type}
                  </span>

                  <span className="chip">
                    {selectedAction.status}
                  </span>

                  <span className="chip">
                    {selectedAction.department}
                  </span>
                </div>
              </div>

              <button
                className="btn"
                onClick={() =>
                  setSelectedAction(null)
                }
              >
                Close
              </button>
            </div>

            <Detail
              label="Related source"
              value={
                selectedAction.black_box_title ||
                selectedAction.training_rule_title ||
                'Manual action'
              }
            />

            <Detail
              label="Action required"
              value={
                selectedAction.action_required
              }
            />

            <Detail
              label="Responsible person"
              value={
                selectedAction.responsible_person ||
                'Not assigned'
              }
            />

            <Detail
              label="Due date"
              value={formatDate(
                selectedAction.due_date
              )}
            />

            <Detail
              label="Evidence"
              value={
                selectedAction.evidence ||
                'No evidence added'
              }
            />

            <Detail
              label="Manager verification"
              value={
                selectedAction.manager_verification ||
                'Not verified'
              }
            />

            <Detail
              label="Completion date"
              value={formatDate(
                selectedAction.completion_date
              )}
            />

            {canManage && (
              <div style={formActionStyle}>
                <button
                  className="btn"
                  onClick={() =>
                    openEditForm(selectedAction)
                  }
                >
                  Edit Action
                </button>

                <button
                  className="btn"
                  onClick={() =>
                    deleteAction(selectedAction)
                  }
                >
                  Delete
                </button>
              </div>
            )}
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

function FieldGroup({ label, children }) {
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
        required={required}
        onChange={(event) =>
          onChange(event.target.value)
        }
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
        required={required}
        rows="5"
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
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

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  marginBottom: 24
};

const subtitleStyle = {
  color: 'var(--text-3)',
  fontSize: 13,
  marginTop: 5
};

const errorStyle = {
  color: 'var(--red)',
  background: 'var(--surface, #fff)',
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

const filterGridStyle = {
  display: 'grid',
  gridTemplateColumns:
    '2fr 1fr 1fr auto',
  gap: 12,
  alignItems: 'end',
  marginBottom: 18
};

const tableStyle = {
  width: '100%',
  minWidth: 980,
  borderCollapse: 'collapse'
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
  fontSize: 13,
  verticalAlign: 'top',
  borderBottom: '1px solid var(--border)'
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
  color: 'var(--text-1)',
  fontWeight: 700,
  textAlign: 'left'
};

const rowSubtitleStyle = {
  color: 'var(--text-3)',
  fontSize: 11,
  marginTop: 5,
  maxWidth: 300,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
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
  padding: 20,
  background: 'rgba(0,0,0,.58)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const modalStyle = {
  width: 'min(980px, 100%)',
  maxHeight: '92vh',
  overflowY: 'auto',
  background: 'var(--surface, #fff)',
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