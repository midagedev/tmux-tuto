import { NavLink, Outlet } from 'react-router-dom';

const mainLinks = [
  { to: '/learn', label: 'Learn' },
  { to: '/practice', label: 'Practice' },
  { to: '/cheatsheet', label: 'Cheatsheet' },
  { to: '/playbooks', label: 'Playbooks' },
  { to: '/bookmarks', label: 'Bookmarks' },
  { to: '/progress', label: 'Progress' },
];

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="left-panel" aria-label="Primary Navigation">
        <NavLink to="/" className="brand">
          tmux-tuto
        </NavLink>
        <nav className="main-nav">
          {mainLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <Outlet />
      </main>

      <aside className="right-panel" aria-label="Context Panel">
        <h2>Context</h2>
        <p>현재 화면의 목표, 단축키 힌트, 최근 진행 정보를 이 영역에 표시합니다.</p>
      </aside>
    </div>
  );
}
