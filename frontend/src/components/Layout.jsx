import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '⊞', section: 'Main', exact: true },
  { to: '/contracts', label: 'Contracts', icon: '📄', section: null },
  { to: '/clients', label: 'Clients', icon: '👥', section: null },
  { to: '/packages', label: 'Packages', icon: '📦', section: 'Services' },
  { to: '/service-reports', label: 'Service Reports', icon: '📋', section: null },
  { to: '/visits', label: 'Service Visits', icon: '🔧', section: null },
  { to: '/schedule', label: 'Schedule', icon: '📅', section: null },
  { to: '/tickets', label: 'Service Tickets', icon: '🎫', section: null },
  { to: '/black-box', label: 'Black Box Thinking', icon: '🧠', section: 'Learning' },
  { to: '/training-rules', label: 'Training Rule Book', icon: '📘', section: null },
  { to: '/implementation-tracker', label: 'Implementation Tracker', icon: '✅', section: null },
  { to: '/learning-reports', label: 'Learning Reports', icon: '📈', section: null },
  { to: '/reports', label: 'Reports', icon: '📊', section: 'Management' },
  { to: '/users', label: 'User Management', icon: '👤', section: null },
  { to: '/commissions', label: 'Commissions', icon: '💵', section: null },
  { to: '/recycle', label: 'Recycle Bin', icon: '🗑️', section: null },
];

export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('amc_user') || '{}');

  const logout = () => {
    localStorage.removeItem('amc_token');
    localStorage.removeItem('amc_user');
    navigate('/login');
  };

 const visibleItems = navItems.filter(item => {
  const path = item.to.replace('/', '');

  // Owner/Admin can see everything
  if (user.role === 'owner' || user.role === 'admin') return true;
  // Manager can see all remaining modules except the separate Commissions page.
  // because commission is already inside Sales Dashboard
  if (user.role === 'manager') {
    return path !== 'commissions';
  }

  // Sales can see only their allowed working pages
  // Sales cannot see Users, Commissions, Reports or Recycle Bin.
  if (user.role === 'sales') {
    return ![
      'users',
      'commissions',
      'reports',
      'recycle'
    ].includes(path);
  }

  return true;
});

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="VAC Logo" style={{width:'100%', maxHeight:70, objectFit:'contain', marginBottom:4}} onError={e => e.target.style.display='none'} />
          <div className="logo-name" style={{fontSize:13, fontWeight:600}}>VAC AMC Management</div>
          <div className="logo-sub">Service Portal</div>
        </div>
        <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: '1rem' }}>
          {visibleItems.map((item, i) => (
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
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase' }}>{user.role}</div>
          <button className="btn btn-sm" onClick={logout} style={{ width: '100%', justifyContent: 'center' }}>Logout</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}