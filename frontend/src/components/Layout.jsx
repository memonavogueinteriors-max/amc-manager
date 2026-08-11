import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '\u25C8', section: 'Main', exact: true },
  { to: '/clients', label: 'Clients', icon: '\u{1F465}', section: null },
  { to: '/contracts', label: 'Contracts', icon: '\u{1F4C4}', section: null },
  { to: '/visits', label: 'Service Visit Report', icon: '\u{1F4CB}', section: null },
  { to: '/schedule', label: 'Schedule', icon: '\u{1F4C5}', section: null },
  { to: '/tickets', label: 'Service Ticket', icon: '\u{1F3AB}', section: null },

  { to: '/service-bookings', label: 'Daily Bookings', icon: '\u{1F4C5}', section: 'Services' },
  { to: '/technician-job-cards', label: 'Technician Job Card', icon: '\u{1F527}', section: null },
  { to: '/service-reports', label: 'Service Report', icon: '\u{1F4CB}', section: null },
  { to: '/customer-history', label: 'Customer History', icon: '\u{1F465}', section: null },

  { to: '/reports', label: 'Reports', icon: '\u{1F4CA}', section: 'Management' },
  { to: '/commissions', label: 'Commissions', icon: '\u{1F4B5}', section: null },
  { to: '/users', label: 'User Management', icon: '\u{1F464}', section: null },
  { to: '/backup-status', label: 'Backup Status', icon: '\u2601\uFE0F', section: null },
  { to: '/recycle', label: 'Recycle Bin', icon: '\u{1F5D1}\uFE0F', section: null },
];

export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('amc_user') || '{}');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const logout = () => {
    localStorage.removeItem('amc_token');
    localStorage.removeItem('amc_user');
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const visibleItems = navItems.filter((item) => {
    const path = item.to.replace('/', '');

    if (path === 'backup-status') {
      return user.role === 'owner' || user.role === 'admin';
    }

    if (user.role === 'owner' || user.role === 'admin') return true;

    if (user.role === 'manager') {
      return path !== 'commissions';
    }

    if (user.role === 'sales') {
      return ![
        'users',
        'commissions',
        'reports',
        'recycle',
      ].includes(path);
    }

    return true;
  });

  const roleLabel =
    user.role === 'manager'
      ? 'Operational Manager'
      : user.role || '';

  return (
    <div className="app-shell">
      <button
        type="button"
        className="mobile-menu-button"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open menu"
      >
        ?
      </button>

      {mobileMenuOpen && (
        <button
          type="button"
          className="mobile-sidebar-overlay"
          onClick={closeMobileMenu}
          aria-label="Close menu"
        />
      )}

      <aside className={`sidebar${mobileMenuOpen ? ' mobile-open' : ''}`}>
        <button
          type="button"
          className="mobile-menu-close"
          onClick={closeMobileMenu}
          aria-label="Close menu"
        >
          ×
        </button>

        <div className="sidebar-logo">
          <img
            src="/logo.png"
            alt="VAC Logo"
            style={{
              width: '100%',
              maxHeight: 70,
              objectFit: 'contain',
              marginBottom: 4,
            }}
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />

          <div
            className="logo-name"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            VAC
          </div>

          <div className="logo-sub">Service Portal</div>
        </div>

        <nav className="sidebar-navigation">
          {visibleItems.map((item) => (
            <div key={item.to}>
              {item.section && (
                <div className="nav-section">{item.section}</div>
              )}

              <NavLink
                to={item.to}
                end={item.exact}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `nav-link${isActive ? ' active' : ''}`
                }
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-name">{user.name}</div>

          <div className="sidebar-user-role">
            {roleLabel}
          </div>

          <button
            className="btn btn-sm"
            onClick={logout}
            style={{
              width: '100%',
              justifyContent: 'center',
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
