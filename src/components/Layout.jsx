import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  Printer,
  CheckCircle2,
  Shield,
  Menu,
  User,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Building2,
  ChevronDown,
  Eye,
  EyeOff,
  Store,
  Lock,
} from 'lucide-react';
import UserMenu from '@/components/auth/UserMenu';
import NotificationBell from '@/components/notifications/NotificationBell';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import UserAvatar from '@/components/ui/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { PERFIS, PERFIS_LABELS, getUserRolesLabels, userHasRole } from '@/lib/permissoes';

export default function Layout() {
  const {
    can,
    usuario,
    logout,
    setLoginModalOpen,
    revendas,
    activeRevenda,
    setActiveRevenda,
    adminViewMode,
    toggleAdminViewMode,
  } = useAuth();
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

  // Regras de RBAC para Revenda:
  // Vendedor: Não pode trocar de revenda nem visualizar outras revendas. Fica restrito à sua revenda.
  const isVendedor = Boolean(
    (usuario?.role === PERFIS.SELLER || userHasRole(usuario, PERFIS.SELLER)) &&
    !usuario?.is_admin &&
    usuario?.role !== PERFIS.ADMIN &&
    usuario?.role !== PERFIS.CONSULTANT &&
    !userHasRole(usuario, PERFIS.CONSULTANT)
  );

  const isAdmin = Boolean(usuario?.is_admin || usuario?.role === PERFIS.ADMIN);
  const isConsultor = Boolean(usuario?.role === PERFIS.CONSULTANT || userHasRole(usuario, PERFIS.CONSULTANT));
  const podeTrocarRevenda = isAdmin || isConsultor || can('revendas_manage');

  // Nome da revenda atual para exibição
  const revendaAtualLabel = isVendedor
    ? (usuario?.revenda || 'Minha Revenda')
    : (activeRevenda === '__all__' || !activeRevenda ? 'Todas as Revendas' : activeRevenda);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Topbar Superior */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          
          {/* Lado Esquerdo: Seletor de Revenda e Menu Mobile */}
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
                        <Store size={15} />
                      </div>
                      <span className="truncate">{revendaAtualLabel}</span>
                    </SheetTitle>
                  </SheetHeader>

                  {/* Seletor no menu mobile para quem pode trocar */}
                  {podeTrocarRevenda && (
                    <div className="p-3 border-b border-border/60 bg-muted/30">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                        Selecionar Revenda
                      </div>
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRevenda('__all__');
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                            activeRevenda === '__all__'
                              ? 'bg-primary text-primary-foreground font-semibold'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <span>Todas as Revendas</span>
                        </button>
                        {revendas.map((rev) => (
                          <button
                            key={rev.id || rev.nome}
                            type="button"
                            onClick={() => {
                              setActiveRevenda(rev.nome);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                              activeRevenda === rev.nome
                                ? 'bg-primary text-primary-foreground font-semibold'
                                : 'hover:bg-muted text-foreground'
                            }`}
                          >
                            <span className="truncate">{rev.nome}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

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
                          <span>Painel Geral</span>
                        </div>
                      </NavLink>
                    )}
                  </nav>
                </div>

                <div className="p-4 border-t border-border space-y-3 bg-muted/20">
                  {usuario ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={usuario.nome} src={usuario.avatar_url} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-foreground truncate">{usuario.nome}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{usuario.email}</div>
                          {usuario.revenda && (
                            <div className="text-[10px] text-primary font-medium truncate mt-0.5">
                              {usuario.revenda}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-xs font-semibold text-destructive hover:bg-destructive/10"
                      >
                        <LogOut size={13} className="mr-2" /> Sair
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="default"
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

            {/* 1. Ajustes de UI / Componentes:
                Seletor de Revenda: Substituir o ícone e o texto atuais de fluxo de clientes
                por um componente de seleção (Select / Dropdown) de revendas. */}
            {isVendedor ? (
              /* Vendedor: Bloqueado em sua revenda designada */
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/80 border border-border text-foreground select-none max-w-[220px]"
                title={`Revenda vinculada: ${usuario?.revenda || 'Sem revenda'}`}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-background border border-border text-foreground shrink-0">
                  <Store size={13} className="text-foreground" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold leading-none">
                    Revenda
                  </span>
                  <span className="font-bold text-xs tracking-tight text-foreground truncate">
                    {usuario?.revenda || 'Sem revenda'}
                  </span>
                </div>
                <Lock size={12} className="text-muted-foreground/60 shrink-0 ml-auto" />
              </div>
            ) : (
              /* Admin & Consultor: Dropdown interativo de revendas */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary border border-border hover:border-foreground/30 text-foreground transition cursor-pointer shadow-2xs max-w-[240px] group"
                    title="Alternar revenda ativa"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-background border border-border text-foreground shrink-0 group-hover:border-foreground/40 transition">
                      <Store size={13} className="text-foreground" />
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold leading-none">
                        Revenda
                      </span>
                      <span className="font-bold text-xs tracking-tight text-foreground truncate">
                        {revendaAtualLabel}
                      </span>
                    </div>
                    <ChevronDown size={13} className="text-muted-foreground group-hover:text-foreground transition shrink-0 ml-1" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[220px] p-1.5 shadow-xl rounded-xl bg-popover border-border">
                  <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    Filtrar por Revenda
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setActiveRevenda('__all__')}
                    className={`text-xs py-2 px-2.5 rounded-lg cursor-pointer flex items-center justify-between ${
                      activeRevenda === '__all__' ? 'font-bold bg-accent text-accent-foreground' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Store size={14} className="opacity-70" />
                      <span>Todas as Revendas</span>
                    </div>
                    {activeRevenda === '__all__' && (
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {revendas.length === 0 ? (
                    <div className="px-2 py-2 text-xs text-muted-foreground italic text-center">
                      Nenhuma revenda cadastrada
                    </div>
                  ) : (
                    revendas.map((rev) => {
                      const isSelected = activeRevenda === rev.nome;
                      return (
                        <DropdownMenuItem
                          key={rev.id || rev.nome}
                          onClick={() => setActiveRevenda(rev.nome)}
                          className={`text-xs py-2 px-2.5 rounded-lg cursor-pointer flex items-center justify-between ${
                            isSelected ? 'font-bold bg-accent text-accent-foreground' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <UserAvatar name={rev.nome} src={rev.logo_url} size="xs" />
                            <span className="truncate">{rev.nome}</span>
                          </div>
                          {isSelected && (
                            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 ml-2" />
                          )}
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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

          {/* Lado Direito: Ações / Alternador de Visão Admin / Notificações / Tema / Bloco de Usuário */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Alternador de Visão do Admin:
                Adicionar um botão/ícone em formato de olho imediatamente ao lado do botão de alternância de tema.
                Esse botão servirá como toggle para alternar entre:
                - Modo Pessoal: Visualizar apenas as próprias demandas.
                - Modo Global: Visualizar as demandas de todos. */}
            {isAdmin && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={toggleAdminViewMode}
                className={`relative h-9 w-9 rounded-full border-border transition cursor-pointer shadow-2xs ${
                  adminViewMode === 'pessoal'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
                    : 'bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                }`}
                title={
                  adminViewMode === 'pessoal'
                    ? 'Visão Admin: Modo Pessoal ativo (Mostrando apenas as suas demandas). Clique para alternar para Modo Global.'
                    : 'Visão Admin: Modo Global ativo (Mostrando demandas de todos). Clique para alternar para Modo Pessoal.'
                }
                aria-label="Alternar visão do administrador"
              >
                {adminViewMode === 'pessoal' ? (
                  <EyeOff size={16} className="text-amber-600 dark:text-amber-400" />
                ) : (
                  <Eye size={16} className="text-foreground/80" />
                )}
                {/* Ponto indicador de modo pessoal */}
                {adminViewMode === 'pessoal' && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                )}
              </Button>
            )}

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