import { Outlet, NavLink, useNavigate } from 'react-router-dom';


export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('amc_user') || '{}');

  const logout = () => {
    localStorage.removeItem('amc_token');
    localStorage.removeItem('amc_user');
    navigate('/login');
  };

  const visibleItems = navItems.filter(item => {
    if (user.role === 'owner') return true;
    if (user.role === 'manager') return !['users', 'commissions'].includes(item.to.replace('/', ''));
    if (user.role === 'sales') return ['/', '/contracts', '/clients', '/villas', '/packages'].includes(item.to);
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