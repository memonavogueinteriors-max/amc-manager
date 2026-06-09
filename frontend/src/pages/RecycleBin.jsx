import { useState, useEffect } from 'react';

const API = 'https://amc-manager-production.up.railway.app/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('amc_token')
  };
}

export default function RecycleBin() {
  const [tab, setTab] = useState('clients');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`${API}/${tab}/recycle`, { headers: authHeaders() });
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const restore = async (id) => {
    await fetch(`${API}/${tab}/recycle/${id}`, { method: 'PUT', headers: authHeaders() });
    load();
  };

  const tabs = ['clients', 'villas', 'contracts', 'tickets'];

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Recycle Bin</div>
      </div>
      <div className="content">
        <div className="filter-row">
          {tabs.map(t => (
            <span key={t} className={`chip${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </span>
          ))}
        </div>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name / Title</th>
                <th>Details</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="loading">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={3} className="empty">Recycle bin is empty</td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>
                    {item.name || item.villa_number || item.contract_number || item.title || '—'}
                  </td>
                  <td style={{ color: 'var(--text-2)', fontSize: 12 }}>
                    {item.email || item.block || item.package || item.priority || '—'}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm"
                      style={{ background: '#EAF3DE', color: '#3B6D11' }}
                      onClick={() => restore(item.id)}
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
