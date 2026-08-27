import { Outlet, NavLink } from 'react-router-dom';
import { ListOrdered } from 'lucide-react';

export default function Layout() {
  const navClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
      isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
    }`;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ListOrdered size={18} />
            </div>
            <span className="font-semibold tracking-tight">Fila de Demandas</span>
          </div>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navClass}>
              Prioridades
            </NavLink>
            <NavLink to="/concluidos" className={navClass}>
              Concluídos
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}