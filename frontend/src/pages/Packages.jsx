import { useState, useEffect } from 'react';

const API = 'https://amc-manager-production.up.railway.app/api';
function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('amc_token') };
}

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetch(`${API}/packages`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        const cleanPackages = (Array.isArray(data) ? data : [])
          .filter(packageItem =>
            !String(packageItem?.name || '').includes('\u00e2')
          );

        setPackages(cleanPackages);
      })
      .catch(console.error);
  }, []);

  const tiers = ['All', 'Silver', 'Gold', 'Platinum'];
  const filtered = filter === 'All' ? packages : packages.filter(p => p.tier === filter);

  const tierColor = {
    Silver: { bg: '#F1EFE8', color: '#5F5E5A', border: '#B4B2A9' },
    Gold: { bg: '#FAEEDA', color: '#854F0B', border: '#EF9F27' },
    Platinum: { bg: '#E6F1FB', color: '#185FA5', border: '#85B7EB' }
  };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Packages</div>
      </div>
      <div className="content">
        <div className="filter-row">
          {tiers.map(t => (
            <span key={t} className={`chip${filter === t ? ' active' : ''}`} onClick={() => setFilter(t)}>{t}</span>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.5rem' }}>
          {filtered.map(pkg => (
            <div key={pkg.id} className="card" style={{ cursor: 'pointer', border: selected?.id === pkg.id ? `2px solid ${tierColor[pkg.tier]?.border}` : '' }}
              onClick={() => setSelected(selected?.id === pkg.id ? null : pkg)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{pkg.name}</span>
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 500, background: tierColor[pkg.tier]?.bg, color: tierColor[pkg.tier]?.color }}>{pkg.tier}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>AED {pkg.annual_price?.toLocaleString()}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-3)' }}>/yr</span></div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>AED {pkg.monthly_price?.toLocaleString()}/mo</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{pkg.villa_size}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{pkg.ac_units} AC units</div>
            </div>
          ))}
        </div>

        {selected && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">{selected.name} â€” Full Package Details</div>
              <button className="btn btn-sm" onClick={() => setSelected(null)}>âœ•</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <div style={{ fontWeight: 500, marginBottom: 12, fontSize: 13 }}>AC Services</div>
                {[
                  ['AC Service Visits/Year', selected.services?.ac_visits],
                  ['Emergency Call-outs', selected.services?.emergency_callouts],
                  ['Response Time', selected.services?.response_time],
                  ['Duct Cleaning', selected.services?.duct_cleaning ? 'âœ“ Included' : 'âœ• Not included'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-2)' }}>{label}</span>
                    <span style={{ fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontWeight: 500, marginBottom: 12, fontSize: 13 }}>Electrical & Plumbing</div>
                {[
                  ['Electrical Visits/Year', selected.services?.electrical_visits],
                  ['Plumbing Visits/Year', selected.services?.plumbing_visits],
                  ['Annual Price', `AED ${selected.annual_price?.toLocaleString()}`],
                  ['Monthly Price', `AED ${selected.monthly_price?.toLocaleString()}`],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-2)' }}>{label}</span>
                    <span style={{ fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            {selected.tier === 'Silver' && <div style={{ marginTop: 12, padding: 10, background: '#F1EFE8', borderRadius: 8, fontSize: 12, color: '#5F5E5A' }}>Essential villa protection â€” AC + electrical & plumbing check</div>}
            {selected.tier === 'Gold' && <div style={{ marginTop: 12, padding: 10, background: '#FAEEDA', borderRadius: 8, fontSize: 12, color: '#854F0B' }}>Most popular â€” AC + duct + electrical & plumbing. Saves AED 1,500 vs buying separately</div>}
            {selected.tier === 'Platinum' && <div style={{ marginTop: 12, padding: 10, background: '#E6F1FB', borderRadius: 8, fontSize: 12, color: '#185FA5' }}>Complete care â€” Full villa AC + duct + electrical + plumbing. Saves AED 2,500 vs buying separately</div>}
          </div>
        )}
      </div>
    </div>
  );
}
