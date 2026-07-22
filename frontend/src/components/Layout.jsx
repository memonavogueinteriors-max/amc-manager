import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '\u25C8', section: 'Main', exact: true },
  { to: '/contracts', label: 'Contracts', icon: '\u{1F4C4}', section: null },
  { to: '/clients', label: 'Clients', icon: '\u{1F465}', section: null },
  { to: '/packages', label: 'Packages', icon: '\u{1F4E6}', section: 'Services' },
  { to: '/service-reports', label: 'Service Reports', icon: '\u{1F4CB}', section: null },
  { to: '/visits', label: 'Service Visits', icon: '\u{1F527}', section: null },
  { to: '/schedule', label: 'Schedule', icon: '\u{1F4C5}', section: null },
  { to: '/tickets', label: 'Service Tickets', icon: '\u{1F3AB}', section: null },
  { to: '/black-box', label: 'Black Box Thinking', icon: '\u{1F9E0}', section: 'Learning' },
  { to: '/training-rules', label: 'Training Rule Book', icon: '\u{1F4D8}', section: null },
  { to: '/implementation-tracker', label: 'Implementation Tracker', icon: '\u2705', section: null },
  { to: '/learning-reports', label: 'Learning Reports', icon: '\u{1F4C8}', section: null },
  { to: '/backup-status', label: 'Backup Status', icon: '\u2601\uFE0F', section: 'Owner' },
  { to: '/reports', label: 'Reports', icon: '\u{1F4CA}', section: 'Management' },
  { to: '/users', label: 'User Management', icon: '\u{1F464}', section: null },
  { to: '/commissions', label: 'Commissions', icon: '\u{1F4B5}', section: null },
  { to: '/recycle', label: 'Recycle Bin', icon: '\u{1F5D1}\uFE0F', section: null },
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

  if (path === 'backup-status') {
    return user.role === 'owner' || user.role === 'admin';
  }

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
