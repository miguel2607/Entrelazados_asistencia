import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: (active: boolean) => (
    <svg className={`h-5 w-5 ${active ? 'text-[#2d1b69]' : 'text-[#4b5563]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ), end: true },
  { to: '/ninos', label: 'Niños', icon: (active: boolean) => (
    <svg className={`h-5 w-5 ${active ? 'text-[#2d1b69]' : 'text-[#4b5563]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ) },
  { to: '/acudientes', label: 'Acudientes', icon: (active: boolean) => (
    <svg className={`h-5 w-5 ${active ? 'text-[#2d1b69]' : 'text-[#4b5563]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ) },
  { to: '/asistencia', label: 'Asistencia', icon: (active: boolean) => (
    <svg className={`h-5 w-5 ${active ? 'text-[#2d1b69]' : 'text-[#4b5563]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ) },
  { to: '/servicios', label: 'Servicios', icon: (active: boolean) => (
    <svg className={`h-5 w-5 ${active ? 'text-[#2d1b69]' : 'text-[#4b5563]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ) },
  { to: '/paquetes', label: 'Paquetes', icon: (active: boolean) => (
    <svg className={`h-5 w-5 ${active ? 'text-[#2d1b69]' : 'text-[#4b5563]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ) },
  { to: '/planes', label: 'Planes', icon: (active: boolean) => (
    <svg className={`h-5 w-5 ${active ? 'text-[#2d1b69]' : 'text-[#4b5563]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ) },
  { to: '/padres', label: 'Panel padres', end: true, icon: (active: boolean) => (
    <svg className={`h-5 w-5 ${active ? 'text-[#2d1b69]' : 'text-[#4b5563]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ) },
  { to: '/padres/gestion', label: 'Padres', icon: (active: boolean) => (
    <svg className={`h-5 w-5 ${active ? 'text-[#2d1b69]' : 'text-[#4b5563]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ) },
  { to: '/padres/asistencia', label: 'Asist. padres', icon: (active: boolean) => (
    <svg className={`h-5 w-5 ${active ? 'text-[#2d1b69]' : 'text-[#4b5563]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ) },
  { to: '/padres/planes', label: 'Planes padres', icon: (active: boolean) => (
    <svg className={`h-5 w-5 ${active ? 'text-[#2d1b69]' : 'text-[#4b5563]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ) },
];

export function Layout() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f7ff]">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} border-r border-[#e2e8f0] bg-white pt-6 transition-all duration-300`}>
        <div className={`mb-10 flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-6'} animate-fade-in`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2d1b69] to-[#4c1d95] text-white shadow-lg shadow-indigo-200">
            <span className="text-xl font-bold">P</span>
          </div>
          {!sidebarCollapsed && (
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#2d1b69] to-[#4c1d95]">
              Playroom
            </span>
          )}
        </div>

        <div className={`mb-4 flex ${sidebarCollapsed ? 'justify-center px-2' : 'justify-end px-4'}`}>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2e8f0] text-[#4b5563] hover:bg-[#f8f9fa] hover:text-[#111827]"
            title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {sidebarCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              )}
            </svg>
          </button>
        </div>
        
        <nav className={`space-y-1.5 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map((item, idx) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={Boolean((item as { end?: boolean }).end)}
              className={({ isActive }) =>
                [
                  `flex items-center rounded-xl py-3 text-sm font-semibold transition-all duration-300 animate-slide-in-right ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-4'}`,
                  `stagger-${(idx % 5) + 1}`,
                  isActive
                    ? 'bg-indigo-50 text-[#2d1b69] shadow-sm'
                    : 'text-[#4b5563] hover:bg-[#f8f9fa] hover:text-[#111827] hover:translate-x-1',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {item.icon(isActive)}
                  {!sidebarCollapsed && item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-[#e2e8f0] bg-white px-8 flex items-center justify-between sticky top-0 z-10 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#06b6d4] animate-pulse" />
            <h1 className="text-sm font-semibold text-[#4b5563]">
              Sistema de Gestión Integral
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-[#111827]">{username ?? 'Admin'}</span>
              <span className="text-[10px] text-[#4b5563]">Panel de Control</span>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center border-2 border-white shadow-sm">
              <span className="text-[#2d1b69] text-sm font-bold">{(username ?? 'A')[0].toUpperCase()}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#4b5563] border border-[#e2e8f0] hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all duration-200"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Salir
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
          <div className="animate-fade-in stagger-2">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
