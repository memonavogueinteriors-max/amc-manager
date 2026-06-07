import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '⊞', section: 'Main', exact: true },
  { to: '/contracts', label: 'Contracts', icon: '📄', section: null },
  { to: '/villas', label: 'Villas', icon: '🏡', section: null },
  { to: '/schedule', label: 'Schedule', icon: '📅', section: null },
  { to: '/procurement', label: 'Procurement', icon: '🚚', section: 'Operations' },
  { to: '/tickets', label: 'Service Tickets', icon: '🎫', section: null },
  { to: '/clients', label: 'Clients', icon: '👥', section: 'Management' },
  { to: '/reports', label: 'Reports', icon: '📊', section: null },
];

export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('amc_user') || '{}');

  const logout = () => {
    localStorage.removeItem('amc_token');
    localStorage.removeItem('amc_user');
    navigate('/login');
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-name">🏢 AMC Manager</div>
          <div className="logo-sub">Villa Service Portal</div>
        </div>
        <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: '1rem' }}>
          {navItems.map((item, i) => (
            <div key={i}>
              {item.section && <div className="nav-section">{item.section}</div>}
              <NavLink
                to={item.to}
                end={item.exact}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            </div>
          ))}
        </nav>
        <div style={{ padding: '1rem', borderTop: '0.5px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{user.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>{user.role?.toUpperCase()}</div>
          <button className="btn btn-sm" onClick={logout} style={{ width: '100%', justifyContent: 'center' }}>Logout</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
