import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import api from '../api';

const departments = [
  'Sales',
  'Operations',
  'Management',
  'Customer Service'
];

function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getMonthStart() {
  const now = new Date();

  return getLocalDate(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
}

export default function LearningReports() {
  const reportRef = useRef(null);

  const [filters, setFilters] = useState({
    from: getMonthStart(),
    to: getLocalDate(),
    department: ''
  });

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const loadReport = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(
        '/learning-reports/monthly',
        {
          params: {
            from: filters.from,
            to: filters.to,
            department:
              filters.department || undefined
          }
        }
      );

      const data = response.data || {};

      setReport({
        period: data.period || {
          from: filters.from,
          to: filters.to,
          department:
            filters.department || 'All Departments'
        },

        summary: {
          blackBox: data.summary?.blackBox || {},
          trainingRules:
            data.summary?.trainingRules || {},
          implementation:
            data.summary?.implementation || {}
        },

        blackBoxEntries: Array.isArray(
          data.blackBoxEntries
        )
          ? data.blackBoxEntries
          : [],

        trainingRules: Array.isArray(
          data.trainingRules
        )
          ? data.trainingRules
          : [],

        implementationActions: Array.isArray(
          data.implementationActions
        )
          ? data.implementationActions
          : [],

        contributors: Array.isArray(data.contributors)
          ? data.contributors
          : [],

        repeatedLessons: Array.isArray(
          data.repeatedLessons
        )
          ? data.repeatedLessons
          : []
      });
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Unable to generate the Learning Report'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const updateFilter = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value
    }));
  };

  const printReport = () => {
    if (!reportRef.current) return;

    const printWindow = window.open(
      '',
      '_blank',
      'width=1100,height=800'
    );

    if (!printWindow) {
      setError(
        'The print window was blocked. Allow popups and try again.'
      );

      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>AMC Learning Report</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              color: #151515;
              margin: 30px;
              line-height: 1.5;
            }

            h1, h2, h3 {
              margin-top: 0;
            }

            .card {
              border: 1px solid #d9d9d9;
              border-radius: 10px;
              padding: 16px;
              margin-bottom: 16px;
            }

            .metric-label {
              font-size: 11px;
              text-transform: uppercase;
              color: #666;
            }

            .metric-val {
              font-size: 28px;
              font-weight: 700;
              margin: 5px 0;
            }

            .metric-sub {
              font-size: 11px;
              color: #666;
            }

            .chip {
              display: inline-block;
              border: 1px solid #bbb;
              border-radius: 20px;
              padding: 3px 8px;
              font-size: 11px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }

            th, td {
              border-bottom: 1px solid #ddd;
              padding: 9px;
              text-align: left;
              vertical-align: top;
              font-size: 11px;
            }

            th {
              background: #f5f5f5;
              text-transform: uppercase;
            }

            button {
              display: none !important;
            }

            @page {
              size: A4;
              margin: 14mm;
            }
          </style>
        </head>

        <body>
          ${reportRef.current.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  const downloadPdf = async () => {
    if (!reportRef.current) return;

    try {
      setExporting(true);
      setError('');

      const canvas = await html2canvas(
        reportRef.current,
        {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true
        }
      );

      const imageData = canvas.toDataURL(
        'image/png',
        1
      );

      const pdf = new jsPDF(
        'p',
        'mm',
        'a4'
      );

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const printableWidth =
        pageWidth - margin * 2;
      const printableHeight =
        pageHeight - margin * 2;

      const imageHeight =
        canvas.height *
        printableWidth /
        canvas.width;

      let heightRemaining = imageHeight;
      let position = margin;

      pdf.addImage(
        imageData,
        'PNG',
        margin,
        position,
        printableWidth,
        imageHeight
      );

      heightRemaining -= printableHeight;

      while (heightRemaining > 0) {
        position =
          margin -
          (imageHeight - heightRemaining);

        pdf.addPage();

        pdf.addImage(
          imageData,
          'PNG',
          margin,
          position,
          printableWidth,
          imageHeight
        );

        heightRemaining -= printableHeight;
      }

      const fileName =
        `AMC-Learning-Report-${filters.from}-to-${filters.to}.pdf`;

      pdf.save(fileName);
    } catch (err) {
      setError(
        err.message ||
        'Unable to download the PDF report'
      );
    } finally {
      setExporting(false);
    }
  };

  const blackBox =
    report?.summary?.blackBox || {};

  const trainingRules =
    report?.summary?.trainingRules || {};

  const implementation =
    report?.summary?.implementation || {};

  return (
    <div style={{ padding: 24 }}>
      <div style={headerStyle}>
        <div>
          <div className="topbar-title">
            Learning Reports
          </div>

          <div style={subtitleStyle}>
            Review company lessons, rules,
            implementation progress and repeated
            mistakes for a selected period.
          </div>
        </div>

        <div style={buttonRowStyle}>
          <button
            className="btn"
            onClick={printReport}
            disabled={!report || loading}
          >
            Print
          </button>

          <button
            className="btn btn-primary"
            onClick={downloadPdf}
            disabled={
              !report ||
              loading ||
              exporting
            }
          >
            {exporting
              ? 'Creating PDF...'
              : 'Download PDF'}
          </button>
        </div>
      </div>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      <div
        className="card"
        style={filterGridStyle}
      >
        <FieldGroup label="From date">
          <input
            className="form-input"
            type="date"
            value={filters.from}
            onChange={(event) =>
              updateFilter(
                'from',
                event.target.value
              )
            }
          />
        </FieldGroup>

        <FieldGroup label="To date">
          <input
            className="form-input"
            type="date"
            value={filters.to}
            onChange={(event) =>
              updateFilter(
                'to',
                event.target.value
              )
            }
          />
        </FieldGroup>

        <FieldGroup label="Department">
          <select
            className="form-input"
            value={filters.department}
            onChange={(event) =>
              updateFilter(
                'department',
                event.target.value
              )
            }
          >
            <option value="">
              All departments
            </option>

            {departments.map(
              (department) => (
                <option
                  key={department}
                  value={department}
                >
                  {department}
                </option>
              )
            )}
          </select>
        </FieldGroup>

        <button
          className="btn btn-primary"
          onClick={loadReport}
          disabled={loading}
        >
          {loading
            ? 'Generating...'
            : 'Generate Report'}
        </button>
      </div>

      {loading ? (
        <div
          className="card"
          style={emptyStyle}
        >
          Generating Learning Report...
        </div>
      ) : !report ? (
        <div
          className="card"
          style={emptyStyle}
        >
          No report data is available.
        </div>
      ) : (
        <div
          ref={reportRef}
          style={{
            background: '#ffffff',
            color: '#151515',
            padding: 4
          }}
        >
          <div
            className="card"
            style={reportHeaderStyle}
          >
            <div>
              <div style={reportTitleStyle}>
                AMC Learning and Improvement Report
              </div>

              <div style={reportSubtitleStyle}>
                Black Box Thinking, Training Rule
                Book and Implementation Tracker
              </div>
            </div>

            <div style={periodBoxStyle}>
              <div>
                <strong>Period:</strong>{' '}
                {formatDate(report.period.from)}
                {' â€” '}
                {formatDate(report.period.to)}
              </div>

              <div>
                <strong>Department:</strong>{' '}
                {report.period.department}
              </div>

              <div>
                <strong>Generated:</strong>{' '}
                {new Date().toLocaleString()}
              </div>
            </div>
          </div>

          <SectionTitle>
            Executive Summary
          </SectionTitle>

          <div style={metricGridStyle}>
            <MetricCard
              label="New Lessons"
              value={blackBox.total || 0}
              text={`${blackBox.implemented || 0} implemented`}
            />

            <MetricCard
              label="Rules Created"
              value={trainingRules.total || 0}
              text={`${trainingRules.active || 0} active`}
            />

            <MetricCard
              label="Implementation Actions"
              value={implementation.total || 0}
              text={`${implementation.verified || 0} verified`}
            />

            <MetricCard
              label="Overdue Actions"
              value={implementation.overdue || 0}
              text="Require management attention"
            />
          </div>

          <div style={summaryGridStyle}>
            <SummaryCard
              title="Black Box Thinking"
              rows={[
                [
                  'New lessons',
                  blackBox.new_lessons || 0
                ],
                [
                  'Under review',
                  blackBox.under_review || 0
                ],
                [
                  'Implemented',
                  blackBox.implemented || 0
                ],
                [
                  'Converted to rules',
                  blackBox.converted_to_rules || 0
                ]
              ]}
            />

            <SummaryCard
              title="Training Rule Book"
              rows={[
                [
                  'Draft rules',
                  trainingRules.draft || 0
                ],
                [
                  'Active rules',
                  trainingRules.active || 0
                ],
                [
                  'Archived rules',
                  trainingRules.archived || 0
                ]
              ]}
            />

            <SummaryCard
              title="Implementation"
              rows={[
                [
                  'Not started',
                  implementation.not_started || 0
                ],
                [
                  'In progress',
                  implementation.in_progress || 0
                ],
                [
                  'Verification required',
                  implementation.verification_required || 0
                ],
                [
                  'Verified',
                  implementation.verified || 0
                ]
              ]}
            />
          </div>

          <SectionTitle>
            Black Box Lessons
          </SectionTitle>

          <ReportTable
            headers={[
              'Lesson',
              'Department',
              'Employee',
              'Problem',
              'Lesson Learned',
              'Status'
            ]}
            rows={report.blackBoxEntries.map(
              (entry) => [
                entry.title,
                entry.department,
                entry.employee_name ||
                  entry.created_by_name ||
                  'Not specified',
                entry.problem,
                entry.lesson_learned,
                entry.status
              ]
            )}
            emptyText="No Black Box lessons were recorded during this period."
          />

          <SectionTitle>
            Training Rules
          </SectionTitle>

          <ReportTable
            headers={[
              'Rule',
              'Department',
              'Official Rule',
              'Approved By',
              'Effective Date',
              'Status'
            ]}
            rows={report.trainingRules.map(
              (rule) => [
                rule.title,
                rule.department,
                rule.official_rule,
                rule.approved_by ||
                  'Not approved',
                formatDate(
                  rule.effective_date
                ),
                rule.status
              ]
            )}
            emptyText="No Training Rules were created during this period."
          />

          <SectionTitle>
            Implementation Actions
          </SectionTitle>

          <ReportTable
            headers={[
              'Action',
              'Department',
              'Responsible',
              'Due Date',
              'Status',
              'Evidence'
            ]}
            rows={report.implementationActions.map(
              (action) => [
                action.title,
                action.department ||
                  'Not specified',
                action.responsible_person ||
                  'Not assigned',
                formatDate(
                  action.due_date
                ),
                action.status,
                action.evidence ||
                  'No evidence'
              ]
            )}
            emptyText="No implementation actions were created during this period."
          />

          <SectionTitle>
            Employee Contributions
          </SectionTitle>

          <ReportTable
            headers={[
              'Employee',
              'Lessons Submitted'
            ]}
            rows={report.contributors.map(
              (contributor) => [
                contributor.employee,
                contributor.lessons_submitted
              ]
            )}
            emptyText="No employee contributions were recorded."
          />

          <SectionTitle>
            Repeated Lessons or Problems
          </SectionTitle>

          <ReportTable
            headers={[
              'Repeated Lesson',
              'Occurrences'
            ]}
            rows={report.repeatedLessons.map(
              (lesson) => [
                lesson.title,
                lesson.occurrences
              ]
            )}
            emptyText="No repeated lesson titles were detected during this period."
          />

          <div
            className="card"
            style={recommendationStyle}
          >
            <div style={recommendationTitleStyle}>
              Management Review
            </div>

            <div style={recommendationTextStyle}>
              Review overdue and verification-required
              actions first. Confirm that approved
              lessons have been converted into active
              company rules and that responsible
              employees have completed implementation.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  text
}) {
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

function SummaryCard({
  title,
  rows
}) {
  return (
    <div className="card">
      <div style={summaryTitleStyle}>
        {title}
      </div>

      {rows.map(([label, value]) => (
        <div
          key={label}
          style={summaryRowStyle}
        >
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function FieldGroup({
  label,
  children
}) {
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

function SectionTitle({
  children
}) {
  return (
    <div style={sectionTitleStyle}>
      {children}
    </div>
  );
}

function ReportTable({
  headers,
  rows,
  emptyText
}) {
  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: 'hidden',
        marginBottom: 22
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  style={tableHeaderStyle}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  style={emptyStyle}
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map(
                    (value, columnIndex) => (
                      <td
                        key={columnIndex}
                        style={tableCellStyle}
                      >
                        {value ?? 'â€”'}
                      </td>
                    )
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return 'â€”';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  marginBottom: 24
};

const buttonRowStyle = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap'
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

const filterGridStyle = {
  display: 'grid',
  gridTemplateColumns:
    '1fr 1fr 1.4fr auto',
  gap: 12,
  alignItems: 'end',
  marginBottom: 20
};

const reportHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 20,
  padding: 22,
  marginBottom: 22
};

const reportTitleStyle = {
  fontSize: 23,
  fontWeight: 800
};

const reportSubtitleStyle = {
  color: '#666',
  fontSize: 12,
  marginTop: 6
};

const periodBoxStyle = {
  fontSize: 11,
  lineHeight: 1.8,
  textAlign: 'right'
};

const metricGridStyle = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(4, minmax(0, 1fr))',
  gap: 14,
  marginBottom: 20
};

const summaryGridStyle = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(3, minmax(0, 1fr))',
  gap: 14,
  marginBottom: 22
};

const summaryTitleStyle = {
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 12
};

const summaryRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  padding: '7px 0',
  borderBottom: '1px solid #ececec',
  fontSize: 12
};

const sectionTitleStyle = {
  fontSize: 17,
  fontWeight: 800,
  margin: '26px 0 10px',
  paddingBottom: 8,
  borderBottom: '2px solid #151515'
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: 760
};

const tableHeaderStyle = {
  padding: '11px 12px',
  textAlign: 'left',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '.04em',
  color: '#666',
  background: '#f6f6f6',
  borderBottom: '1px solid #d9d9d9'
};

const tableCellStyle = {
  padding: 12,
  fontSize: 11,
  lineHeight: 1.5,
  verticalAlign: 'top',
  borderBottom: '1px solid #ececec',
  whiteSpace: 'pre-wrap'
};

const emptyStyle = {
  padding: 34,
  textAlign: 'center',
  color: '#777',
  fontSize: 12
};

const recommendationStyle = {
  marginTop: 24,
  padding: 18,
  borderLeft: '4px solid #151515'
};

const recommendationTitleStyle = {
  fontSize: 14,
  fontWeight: 800,
  marginBottom: 6
};

const recommendationTextStyle = {
  fontSize: 12,
  color: '#555',
  lineHeight: 1.7
};
