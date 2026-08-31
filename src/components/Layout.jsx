import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { ListOrdered, Printer, CheckCircle2, Shield, Menu, User, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import UserMenu from '@/components/auth/UserMenu';
import NotificationBell from '@/components/notifications/NotificationBell';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import UserAvatar from '@/components/ui/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { PERFIS_LABELS } from '@/lib/permissoes';

export default function Layout() {
  const { can, usuario, logout, setLoginModalOpen } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navClass = ({ isActive }) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
      isActive ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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

  const roleLabel = usuario ? (PERFIS_LABELS[usuario.role] || 'Colaborador') : '';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          {/* Logo e Botão Menu Mobile */}
          <div className="flex items-center gap-2">
            {/* Botão Hamburger Mobile */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
                  aria-label="Abrir menu de navegação"
                >
                  <Menu size={18} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[82vw] max-w-[320px] p-0 flex flex-col justify-between">
                <div>
                  {/* Cabeçalho do Menu Mobile */}
                  <SheetHeader className="p-4 border-b border-border text-left">
                    <SheetTitle className="flex items-center gap-2.5 text-base font-bold">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-2xs">
                        <ListOrdered size={18} />
                      </div>
                      <span>Fluxo de Clientes</span>
                    </SheetTitle>
                  </SheetHeader>

                  {/* Links de Navegação Mobile */}
                  <nav className="p-3 space-y-1">
                    {showPriority && (
                      <NavLink
                        to="/"
                        end
                        onClick={() => setMobileMenuOpen(false)}
                        className={mobileNavClass}
                      >
                        <div className="flex items-center gap-2.5">
                          <ListOrdered size={18} />
                          <span>Prioridades</span>
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
                          <Printer size={18} />
                          <span>Impressão</span>
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
                          <CheckCircle2 size={18} />
                          <span>Concluídos</span>
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
                          <Shield size={18} />
                          <span>Administração</span>
                        </div>
                      </NavLink>
                    )}
                  </nav>
                </div>

                {/* Rodapé do Menu Mobile (Perfil + Tema) */}
                <div className="p-4 border-t border-border space-y-3 bg-muted/20">
                  {/* Seletor de Tema no Menu Mobile */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Tema Visual
                    </label>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                          theme === 'light'
                            ? 'bg-background text-foreground shadow-2xs'
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
                            ? 'bg-background text-foreground shadow-2xs'
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
                            ? 'bg-background text-foreground shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Monitor size={12} /> Auto
                      </button>
                    </div>
                  </div>

                  {/* Usuário ou Botão Identificar-se */}
                  {usuario?.nome ? (
                    <div className="pt-2 border-t border-border space-y-2">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={usuario.nome} src={usuario.avatar_url} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">{usuario.nome}</p>
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
                        className="w-full justify-start h-8 text-xs text-destructive hover:bg-destructive/10"
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
                      <User size={13} className="mr-1.5" /> Identificar-se
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo do Topo */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-2xs">
                <ListOrdered size={18} />
              </div>
              <span className="font-semibold tracking-tight text-sm sm:text-base truncate">
                Fluxo de Clientes
              </span>
            </div>
          </div>

          {/* Ações da Direita */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Navegação Desktop */}
            <nav className="hidden md:flex items-center gap-1">
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

            <div className="h-5 w-px bg-border hidden md:block" />

            <ThemeToggle className="hidden sm:inline-flex" />

            <NotificationBell />

            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-3 sm:px-6 py-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}