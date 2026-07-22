import { useEffect, useMemo, useState } from 'react';
import api from '../api';

function formatSize(bytes) {
  const value = Number(bytes || 0);

  if (!value) return '0 KB';
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(value) {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return date.toLocaleString();
}

function statusTone(status) {
  const normalized = String(status || '').toLowerCase();

  if (normalized.includes('successful')) {
    return {
      background: '#ecfdf3',
      color: '#027a48',
      border: '#abefc6'
    };
  }

  if (normalized.includes('running')) {
    return {
      background: '#eff8ff',
      color: '#175cd3',
      border: '#b2ddff'
    };
  }

  if (
    normalized.includes('failed') ||
    normalized.includes('error')
  ) {
    return {
      background: '#fef3f2',
      color: '#b42318',
      border: '#fecdca'
    };
  }

  return {
    background: '#f9fafb',
    color: '#344054',
    border: '#eaecf0'
  };
}

export default function BackupStatus() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStatus = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError('');

      const response = await api.get('/backup/status');
      setData(response.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          requestError.message ||
          'Unable to load backup status'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus(true);

    const interval = window.setInterval(() => {
      loadStatus(false);
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const tone = useMemo(
    () => statusTone(data?.status),
    [data?.status]
  );

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Owner Backup Center</h1>
            <p>Loading automatic backup status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Owner Backup Center</h1>
          <p>
            Daily automatic protection for all AMC software data.
          </p>
        </div>

        <button
          className="btn"
          type="button"
          onClick={() => loadStatus(true)}
        >
          Refresh Status
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: 14,
            marginBottom: 18,
            borderRadius: 10,
            border: '1px solid #fecdca',
            background: '#fef3f2',
            color: '#b42318'
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          padding: 18,
          marginBottom: 20,
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--surface, #fff)'
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-3)',
                marginBottom: 7,
                textTransform: 'uppercase',
                letterSpacing: '.06em'
              }}
            >
              Latest Backup
            </div>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: 999,
                padding: '7px 11px',
                fontWeight: 700,
                fontSize: 13,
                background: tone.background,
                color: tone.color,
                border: `1px solid ${tone.border}`
              }}
            >
              {data?.status || 'Not run'}
            </span>
          </div>

          {data?.driveLink && (
            <a
              className="btn btn-primary"
              href={data.driveLink}
              target="_blank"
              rel="noreferrer"
            >
              Open Latest Drive Backup
            </a>
          )}
        </div>

        {data?.error && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 9,
              background: '#fffaeb',
              border: '1px solid #fedf89',
              color: '#93370d'
            }}
          >
            {data.error}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          marginBottom: 20
        }}
      >
        {[
          ['Last Completed', formatDate(data?.completedAt)],
          ['Backup Size', formatSize(data?.sizeBytes)],
          ['Database Tables', data?.tableCount ?? 0],
          ['Total Records', data?.rowCount ?? 0],
          ['Uploaded Files', data?.uploadedFileCount ?? 0]
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              padding: 16,
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--surface, #fff)'
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-3)',
                marginBottom: 8
              }}
            >
              {label}
            </div>

            <div
              style={{
                fontSize: 20,
                fontWeight: 750,
                overflowWrap: 'anywhere'
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: 18,
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--surface, #fff)'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Automatic Backup Setup</h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14
          }}
        >
          <div>
            <strong>Schedule</strong>
            <div style={{ marginTop: 5, color: 'var(--text-3)' }}>
              Daily at 2:00 AM
            </div>
          </div>

          <div>
            <strong>Timezone</strong>
            <div style={{ marginTop: 5, color: 'var(--text-3)' }}>
              {data?.timezone || 'Asia/Dubai'}
            </div>
          </div>

          <div>
            <strong>Google Drive</strong>
            <div style={{ marginTop: 5, color: 'var(--text-3)' }}>
              {data?.driveConfigured
                ? 'Connected'
                : 'Not configured'}
            </div>
          </div>

          <div>
            <strong>Google Sheets</strong>
            <div style={{ marginTop: 5, color: 'var(--text-3)' }}>
              {data?.sheetsConfigured
                ? 'Connected'
                : 'Not configured'}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            padding: 13,
            borderRadius: 10,
            background: '#f9fafb',
            border: '1px solid #eaecf0',
            color: '#475467'
          }}
        >
          No manual backup is required. The system replaces the
          same latest Google Drive ZIP and updates the same Google
          Sheets status row automatically.
        </div>
      </div>
    </div>
  );
}
