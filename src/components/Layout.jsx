import { Outlet, NavLink } from 'react-router-dom';
import { ListOrdered, Printer, CheckCircle2, Shield } from 'lucide-react';
import UserMenu from '@/components/auth/UserMenu';
import NotificationBell from '@/components/notifications/NotificationBell';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';

export default function Layout() {
  const { can, usuario } = useAuth();

  const navClass = ({ isActive }) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
      isActive ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;

  const showPriority = can('priority_view');
  const showFactory = can('factory_view');
  const showCompleted = can('completed_view');
  const showAdmin = can('users_manage') || can('revendas_manage') || usuario?.role === 'admin' || usuario?.is_admin;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-2xs">
              <ListOrdered size={18} />
            </div>
            <span className="font-semibold tracking-tight">Fluxo de Clientes</span>
          </div>

          <div className="flex items-center gap-2.5">
            <nav className="flex items-center gap-1">
              {showPriority && (
                <NavLink to="/" end className={navClass}>
                  <ListOrdered size={15} />
                  <span>Prioridade</span>
                </NavLink>
              )}
              {showFactory && (
                <NavLink to="/impressao" className={navClass}>
                  <Printer size={15} />
                  <span>Impressão</span>
                </NavLink>
              )}
              {showCompleted && (
                <NavLink to="/concluidos" className={navClass}>
                  <CheckCircle2 size={15} />
                  <span>Concluído</span>
                </NavLink>
              )}
              {showAdmin && (
                <NavLink to="/admin" className={navClass}>
                  <Shield size={15} />
                  <span>Admin</span>
                </NavLink>
              )}
            </nav>

            <div className="h-5 w-px bg-border hidden sm:block" />

            <ThemeToggle />

            <NotificationBell />

            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}