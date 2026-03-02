import { CalendarClock, ClipboardList, LayoutDashboard, LogOut, Users } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

const MENU = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/atestados", label: "Todos os Atestados", icon: ClipboardList },
  { to: "/analises", label: "Painel de Análises", icon: CalendarClock },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Controle de Atestados</div>
        <nav className="sidebar-nav">
          {MENU.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} className="nav-item">
                <Icon size={15} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          {user?.role === "ADMIN" && (
            <NavLink to="/usuarios" className="nav-item">
              <Users size={15} />
              <span>Usuários</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <strong>{user?.username}</strong>
            <span>{user?.role}</span>
          </div>
          <button className="ghost-btn" onClick={handleLogout}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      <main className="main-area">
        <Outlet />
      </main>
    </div>
  );
}
