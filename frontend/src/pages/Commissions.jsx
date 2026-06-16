import { useState, useEffect } from 'react';

const API = 'https://amc-manager-production.up.railway.app/api';
function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('amc_token') };
}

export default function Commissions() {
  const [commissions, setCommissions] = useState([]);
  const [salesStats, setSalesStats] = useState([]);
  const [tab, setTab] = useState('overview');

  const load = () => {
    fetch(`${API}/users/commissions`, { headers: authHeaders() }).then(r => r.json()).then(setCommissions).catch(console.error);
    fetch(`${API}/users/sales-stats`, { headers: authHeaders() }).then(r => r.json()).then(setSalesStats).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const markPaid = async (id) => {
    await fetch(`${API}/users/commissions/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status: 'paid' }) });
    load();
  };

  const totalPending = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const totalPaid = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Sales & Commissions</div>
      </div>
      <div className="content">
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '1.5rem' }}>
          <div className="metric-card">
            <div className="metric-label">Pending Commissions</div>
            <div className="metric-val" style={{ color: '#BA7517' }}>AED {Math.round(totalPending).toLocaleString()}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Paid Commissions</div>
            <div className="metric-val" style={{ color: '#3B6D11' }}>AED {Math.round(totalPaid).toLocaleString()}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Sales People</div>
            <div className="metric-val">{salesStats.length}</div>
          </div>
        </div>

        <div className="filter-row">
          <span className={`chip${tab === 'overview' ? ' active' : ''}`} onClick={() => setTab('overview')}>Sales Overview</span>
          <span className={`chip${tab === 'commissions' ? ' active' : ''}`} onClick={() => setTab('commissions')}>Commission Ledger</span>
        </div>

        {tab === 'overview' && (
          <div className="card">
            <div className="card-header"><div className="card-title">Sales Team Performance</div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Role</th><th>Contracts</th><th>Total Value</th><th>Monthly Target</th><th>Commission Earned</th><th>Achievement</th></tr></thead>
                <tbody>
                  {salesStats.length === 0 ? <tr><td colSpan={7} className="empty">No sales data yet</td></tr> :
                    salesStats.map(s => {
                      const achievement = s.sales_target > 0 ? Math.round((parseFloat(s.total_value || 0) / parseFloat(s.sales_target)) * 100) : 0;
                      return (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 500 }}>{s.name}</td>
                          <td><span className="pill pill-pending">{s.role}</span></td>
                          <td>{s.contracts_count || 0}</td>
                          <td>AED {Math.round(parseFloat(s.total_value || 0)).toLocaleString()}</td>
                          <td>AED {Math.round(parseFloat(s.sales_target || 0)).toLocaleString()}</td>
                          <td>AED {Math.round(parseFloat(s.total_commission || 0)).toLocaleString()}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="progress-bar" style={{ width: 80 }}>
                                <div className="progress-fill" style={{ width: `${Math.min(100, achievement)}%`, background: achievement >= 100 ? '#3B6D11' : achievement >= 50 ? '#BA7517' : '#A32D2D' }}></div>
                              </div>
                              <span style={{ fontSize: 12 }}>{achievement}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'commissions' && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Sales Person</th><th>Contract</th><th>Amount</th><th>Type</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {commissions.length === 0 ? <tr><td colSpan={7} className="empty">No commissions yet</td></tr> :
                    commissions.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500 }}>{c.user_name}</td>
                        <td>{c.contract_number || '—'}</td>
                        <td style={{ fontWeight: 500, color: '#3B6D11' }}>AED {parseFloat(c.amount).toLocaleString()}</td>
                        <td><span className="pill pill-pending">{c.type?.replace('_', ' ')}</span></td>
                        <td><span className={`pill pill-${c.status === 'paid' ? 'active' : 'expiring'}`}>{c.status}</span></td>
                        <td>{new Date(c.created_at).toLocaleDateString()}</td>
                        <td>
                          {c.status === 'pending' && (
                            <button className="btn btn-sm" style={{ background: '#EAF3DE', color: '#3B6D11' }} onClick={() => markPaid(c.id)}>Mark Paid</button>
                          )}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}