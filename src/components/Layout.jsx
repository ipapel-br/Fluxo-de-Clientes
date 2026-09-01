import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutGrid, Printer, CheckCircle2, Shield, Menu, User, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import UserMenu from '@/components/auth/UserMenu';
import NotificationBell from '@/components/notifications/NotificationBell';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import UserAvatar from '@/components/ui/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { PERFIS_LABELS, getUserRolesLabels } from '@/lib/permissoes';

export default function Layout() {
  const { can, usuario, logout, setLoginModalOpen } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navClass = ({ isActive }) =>
    `relative px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all duration-150 cursor-pointer ${
      isActive
        ? 'bg-secondary text-foreground font-semibold border border-border shadow-xs'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
    }`;

  const mobileNavClass = ({ isActive }) =>
    `flex items-center justify-between p-3 rounded-xl text-sm font-semibold transition ${
      isActive
        ? 'bg-primary text-primary-foreground shadow-xs'
        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
    }`;

  const showPriority = can('priority_view');
  const showFactory = can('factory_view');
  const showCompleted = can('completed_view');
  const showAdmin = can('users_manage') || can('revendas_manage') || usuario?.role === 'admin' || usuario?.is_admin;

  const roleLabelsList = usuario ? getUserRolesLabels(usuario) : [];
  const roleLabel = roleLabelsList.length > 0 ? roleLabelsList.join(', ') : (usuario ? (PERFIS_LABELS[usuario.role] || 'Colaborador') : '');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Topbar Superior */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          
          {/* Lado Esquerdo: Logo e Menu Mobile */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Botão Hamburger Mobile */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                  aria-label="Abrir menu de navegação"
                >
                  <Menu size={18} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[82vw] max-w-[320px] p-0 flex flex-col justify-between bg-card border-border">
                <div>
                  <SheetHeader className="p-4 border-b border-border text-left">
                    <SheetTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary border border-border text-foreground">
                        <LayoutGrid size={15} />
                      </div>
                      <span>Fluxo de Clientes</span>
                    </SheetTitle>
                  </SheetHeader>

                  <nav className="p-3 space-y-1">
                    {showPriority && (
                      <NavLink
                        to="/"
                        end
                        onClick={() => setMobileMenuOpen(false)}
                        className={mobileNavClass}
                      >
                        <div className="flex items-center gap-2.5">
                          <LayoutGrid size={16} />
                          <span>Demandas</span>
                        </div>
                      </NavLink>
                    )}
                    {showFactory && (
                      <NavLink
                        to="/impressao"
                        onClick={() => setMobileMenuOpen(false)}
                        className={mobileNavClass}
                      >
                        <div className="flex items-center gap-2.5">
                          <Printer size={16} />
                          <span>Produção</span>
                        </div>
                      </NavLink>
                    )}
                    {showCompleted && (
                      <NavLink
                        to="/concluidos"
                        onClick={() => setMobileMenuOpen(false)}
                        className={mobileNavClass}
                      >
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 size={16} />
                          <span>Concluídas</span>
                        </div>
                      </NavLink>
                    )}
                    {showAdmin && (
                      <NavLink
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className={mobileNavClass}
                      >
                        <div className="flex items-center gap-2.5">
                          <Shield size={16} />
                          <span>Administração</span>
                        </div>
                      </NavLink>
                    )}
                  </nav>
                </div>

                {/* Rodapé Mobile */}
                <div className="p-4 border-t border-border space-y-3 bg-muted/40">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Tema Visual
                    </label>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-secondary/70 rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                          theme === 'light'
                            ? 'bg-card text-foreground shadow-2xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Sun size={12} className={theme === 'light' ? 'text-amber-500' : ''} /> Claro
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-card text-foreground shadow-2xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Moon size={12} className={theme === 'dark' ? 'text-sky-400' : ''} /> Escuro
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('system')}
                        className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                          theme === 'system'
                            ? 'bg-card text-foreground shadow-2xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Monitor size={12} /> Auto
                      </button>
                    </div>
                  </div>

                  {usuario?.nome ? (
                    <div className="pt-2 border-t border-border space-y-2">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={usuario.nome} src={usuario.avatar_url} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{usuario.nome}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{roleLabel}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          logout();
                        }}
                        className="w-full justify-start text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      >
                        <LogOut size={13} className="mr-2" /> Sair da conta
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setLoginModalOpen(true);
                      }}
                      className="w-full text-xs font-semibold"
                    >
                      <User size={13} className="mr-2" /> Entrar
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo do Topo: ícone + "Fluxo de Clientes" */}
            <NavLink to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary border border-border text-foreground group-hover:border-foreground/30 transition">
                <LayoutGrid size={15} className="text-foreground" />
              </div>
              <span className="font-semibold text-sm tracking-tight text-foreground select-none">
                Fluxo de Clientes
              </span>
            </NavLink>
          </div>

          {/* Centro: Navegação Principal Desktop (Demandas, Produção, Concluídas) */}
          <nav className="hidden md:flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border/70">
            {showPriority && (
              <NavLink to="/" end className={navClass}>
                <span>Demandas</span>
              </NavLink>
            )}
            {showFactory && (
              <NavLink to="/impressao" className={navClass}>
                <span>Produção</span>
              </NavLink>
            )}
            {showCompleted && (
              <NavLink to="/concluidos" className={navClass}>
                <span>Concluídas</span>
              </NavLink>
            )}
          </nav>

          {/* Lado Direito: Ações / Notificações / Tema / Bloco de Usuário */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggle className="hidden sm:inline-flex" />

            <NotificationBell />

            <div className="h-4 w-px bg-border hidden sm:block" />

            <UserMenu />
          </div>
        </div>
      </header>

      {/* Conteúdo Central da Página com largura fluida e ampla */}
      <main className="flex-1 w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}