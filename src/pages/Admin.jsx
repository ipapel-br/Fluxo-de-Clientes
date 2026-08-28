import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield,
  UserPlus,
  Search,
  Pencil,
  Power,
  ShieldCheck,
  Palette,
  Printer,
  ShoppingBag,
  History,
  Settings,
  Users,
  AlertTriangle,
  Clock,
  Mail,
  User as UserIcon,
  Building2,
  Trash2,
  Plus,
  Camera,
  Briefcase,
} from 'lucide-react';
import { localClient } from '@/api/localClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import UserAvatar from '@/components/ui/UserAvatar';
import AcessoNegado from '@/components/auth/AcessoNegado';
import { useAuth } from '@/contexts/AuthContext';
import { processAvatarFile } from '@/lib/avatarService';
import {
  PERFIS,
  PERFIS_LABELS,
  PERMISSOES_DEFINICAO,
  PERMISSOES_PADRAO_POR_PERFIL,
  getEffectivePermissions,
} from '@/lib/permissoes';
import { formatarDataHistorico } from '@/lib/historico';

const ROLE_ICONS = {
  [PERFIS.ADMIN]: ShieldCheck,
  [PERFIS.DESIGNER]: Palette,
  [PERFIS.PRINTER]: Printer,
  [PERFIS.SELLER]: ShoppingBag,
  [PERFIS.CONSULTANT]: Briefcase,
};

export default function Admin() {
  const {
    usuario,
    can,
    usuarios,
    revendas = [],
    recarregarUsuarios,
    adicionarUsuario,
    atualizarUsuario,
    adicionarRevenda,
    atualizarRevenda,
    excluirRevenda,
    configuracao,
    atualizarConfiguracao,
  } = useAuth();

  const canManageUsers = can('users_manage') || usuario?.role === PERFIS.ADMIN || usuario?.is_admin;
  const canManageRevendas = can('revendas_manage') || can('settings_manage') || canManageUsers;

  const [abaAtiva, setAbaAtiva] = useState(() => {
    if (canManageUsers) return 'usuarios';
    if (canManageRevendas) return 'revendas';
    return 'usuarios';
  });
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Form de novo usuário
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoPerfil, setNovoPerfil] = useState(PERFIS.SELLER);
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [erroNovo, setErroNovo] = useState('');

  // Form de edição de usuário
  const [editNome, setEditNome] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPerfil, setEditPerfil] = useState(PERFIS.SELLER);
  const [editStatus, setEditStatus] = useState('ativo');
  const [editPermissoes, setEditPermissoes] = useState({});
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [erroEdit, setErroEdit] = useState('');

  // Form de Revenda
  const [modalRevendaOpen, setModalRevendaOpen] = useState(false);
  const [revendaEditando, setRevendaEditando] = useState(null);
  const [nomeRevenda, setNomeRevenda] = useState('');
  const [logoRevenda, setLogoRevenda] = useState('');
  const [salvandoRevenda, setSalvandoRevenda] = useState(false);
  const [erroRevenda, setErroRevenda] = useState('');

  // Carregar logs de auditoria
  const carregarAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const logs = await localClient.entities.AuditLog.list('-created_at', 200);
      setAuditLogs(logs || []);
    } catch (err) {
      console.error('[Admin] Erro ao carregar auditoria:', err);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    if (abaAtiva === 'auditoria') {
      carregarAuditLogs();
    }
  }, [abaAtiva, carregarAuditLogs]);

  // Lista filtrada de usuários
  const usuariosFiltrados = useMemo(() => {
    if (!busca) return usuarios;
    const q = busca.toLowerCase();
    return usuarios.filter(
      (u) =>
        (u.nome || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (PERFIS_LABELS[u.role] || '').toLowerCase().includes(q)
    );
  }, [usuarios, busca]);

  // Abrir modal de criação
  function abrirNovoUsuario() {
    setNovoNome('');
    setNovoEmail('');
    setNovoPerfil(PERFIS.SELLER);
    setErroNovo('');
    setModalNovoOpen(true);
  }

  // Submeter novo usuário
  async function handleCriarUsuario(e) {
    e.preventDefault();
    setErroNovo('');
    setSalvandoNovo(true);
    try {
      const res = await adicionarUsuario({
        nome: novoNome,
        email: novoEmail,
        role: novoPerfil,
      });
      if (!res.success) {
        setErroNovo(res.error || 'Erro ao cadastrar.');
      } else {
        setModalNovoOpen(false);
        await recarregarUsuarios();
      }
    } finally {
      setSalvandoNovo(false);
    }
  }

  // Abrir modal de edição de usuário
  function abrirEditarUsuario(u) {
    setUsuarioEditando(u);
    setEditNome(u.nome || '');
    setEditEmail(u.email || '');
    setEditPerfil(u.role || PERFIS.SELLER);
    setEditStatus(u.status || 'ativo');

    // Calcular o estado atual das permissões do usuário
    const effective = getEffectivePermissions(u);
    setEditPermissoes(effective);
    setErroEdit('');
    setModalEditarOpen(true);
  }

  // Quando o administrador muda o perfil na edição, redefinir checkboxes para o padrão daquele perfil
  function handlePerfilChange(novoPerfilSelecionado) {
    setEditPerfil(novoPerfilSelecionado);
    const padrao = PERMISSOES_PADRAO_POR_PERFIL[novoPerfilSelecionado] || [];
    const novoMapa = {};
    PERMISSOES_DEFINICAO.forEach((grupo) => {
      grupo.permissoes.forEach((p) => {
        novoMapa[p.key] = novoPerfilSelecionado === PERFIS.ADMIN ? true : padrao.includes(p.key);
      });
    });
    setEditPermissoes(novoMapa);
  }

  // Alternar permissão granular individual
  function togglePermissao(key) {
    setEditPermissoes((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  // Salvar alterações do usuário
  async function handleSalvarEdicao() {
    if (!usuarioEditando) return;
    setErroEdit('');
    setSalvandoEdit(true);

    // Calcular overrides (diferenças em relação ao padrão do perfil selecionado)
    const padrao = PERMISSOES_PADRAO_POR_PERFIL[editPerfil] || [];
    const permissoesExtras = {};

    PERMISSOES_DEFINICAO.forEach((grupo) => {
      grupo.permissoes.forEach((p) => {
        const estaChecado = Boolean(editPermissoes[p.key]);
        const eraPadrao = padrao.includes(p.key);
        if (estaChecado !== eraPadrao) {
          permissoesExtras[p.key] = estaChecado;
        }
      });
    });

    try {
      const res = await atualizarUsuario(usuarioEditando.id, {
        nome: editNome.trim(),
        role: editPerfil,
        status: editStatus,
        permissoes_extras: permissoesExtras,
      });

      if (!res.success) {
        const msg = res.error || 'Erro ao salvar alterações.';
        console.error('[Admin] Erro ao salvar edição:', msg);
        setErroEdit(msg);
      } else {
        setModalEditarOpen(false);
        setUsuarioEditando(null);
        await recarregarUsuarios();
      }
    } catch (err) {
      console.error('[Admin] Exceção ao salvar edição:', err);
      setErroEdit('Erro inesperado ao salvar. Verifique o console.');
    } finally {
      setSalvandoEdit(false);
    }
  }

  // Desativar / Ativar usuário
  async function alternarStatusUsuario(u) {
    const novoStatus = u.status === 'ativo' ? 'inativo' : 'ativo';
    const acaoLabel = novoStatus === 'inativo' ? 'desativar' : 'ativar';

    if (!window.confirm(`Deseja realmente ${acaoLabel} o usuário ${u.nome}?`)) return;

    const res = await atualizarUsuario(u.id, { status: novoStatus });
    if (!res.success) {
      window.alert(res.error || `Não foi possível ${acaoLabel} o usuário.`);
    }
  }

  // Handlers para Revendas
  function abrirNovaRevenda() {
    setRevendaEditando(null);
    setNomeRevenda('');
    setLogoRevenda('');
    setErroRevenda('');
    setModalRevendaOpen(true);
  }

  function abrirEditarRevenda(rev) {
    setRevendaEditando(rev);
    setNomeRevenda(rev.nome || '');
    setLogoRevenda(rev.logo_url || '');
    setErroRevenda('');
    setModalRevendaOpen(true);
  }

  async function handleSalvarRevenda(e) {
    e?.preventDefault?.();
    if (!nomeRevenda.trim()) {
      setErroRevenda('Informe o nome da revenda.');
      return;
    }
    setSalvandoRevenda(true);
    setErroRevenda('');
    try {
      if (revendaEditando?.id) {
        const res = await atualizarRevenda(revendaEditando.id, {
          nome: nomeRevenda.trim(),
          logo_url: logoRevenda,
        });
        if (!res.success) {
          setErroRevenda(res.error || 'Erro ao atualizar revenda.');
          return;
        }
      } else {
        const res = await adicionarRevenda({
          nome: nomeRevenda.trim(),
          logo_url: logoRevenda,
        });
        if (!res.success) {
          setErroRevenda(res.error || 'Erro ao cadastrar revenda.');
          return;
        }
      }
      setModalRevendaOpen(false);
      setRevendaEditando(null);
    } catch (err) {
      console.error('[Admin] Erro ao salvar revenda:', err);
      setErroRevenda('Erro inesperado.');
    } finally {
      setSalvandoRevenda(false);
    }
  }

  async function handleExcluirRevenda(rev) {
    if (!window.confirm(`Deseja realmente remover a revenda "${rev.nome}"?`)) return;
    const res = await excluirRevenda(rev.id);
    if (!res.success) {
      window.alert(res.error || 'Não foi possível remover a revenda.');
    }
  }

  async function handleUploadLogoRevenda(rev, file) {
    if (!file) return;
    try {
      const b64 = await processAvatarFile(file);
      await atualizarRevenda(rev.id, { logo_url: b64 });
    } catch (err) {
      console.error('[Admin] Erro ao processar logo da revenda:', err);
    }
  }

  if (!canManageUsers && !canManageRevendas) {
    return <AcessoNegado mensagem="Esta área é de acesso exclusivo para administradores e consultores autorizados." />;
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Administração */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Shield size={18} />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {canManageUsers ? 'Administração' : 'Gestão de Revendas'}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {canManageUsers
              ? 'Controle de usuários, revendas cadastradas, permissões granulares e auditoria do sistema.'
              : 'Gerencie o catálogo de revendas parceiras e suas logomarcas.'}
          </p>
        </div>

        {abaAtiva === 'usuarios' && canManageUsers && (
          <Button onClick={abrirNovoUsuario} className="font-semibold shadow-xs">
            <UserPlus size={16} className="mr-1.5" /> Adicionar usuário
          </Button>
        )}
        {abaAtiva === 'revendas' && canManageRevendas && (
          <Button onClick={abrirNovaRevenda} className="font-semibold shadow-xs">
            <Plus size={16} className="mr-1.5" /> Adicionar revenda
          </Button>
        )}
      </div>

      {/* Abas da Administração */}
      <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="space-y-4">
        <TabsList className={`grid max-w-xl ${canManageUsers ? 'grid-cols-4' : 'grid-cols-1 max-w-xs'}`}>
          {canManageUsers && (
            <TabsTrigger value="usuarios" className="flex items-center gap-1.5">
              <Users size={14} /> Usuários ({usuarios.length})
            </TabsTrigger>
          )}
          {canManageRevendas && (
            <TabsTrigger value="revendas" className="flex items-center gap-1.5">
              <Building2 size={14} /> Revendas ({revendas.length})
            </TabsTrigger>
          )}
          {canManageUsers && (
            <TabsTrigger value="configuracoes" className="flex items-center gap-1.5">
              <Settings size={14} /> Configurações
            </TabsTrigger>
          )}
          {canManageUsers && (
            <TabsTrigger value="auditoria" className="flex items-center gap-1.5">
              <History size={14} /> Auditoria
            </TabsTrigger>
          )}
        </TabsList>

        {/* ABA: USUÁRIOS */}
        <TabsContent value="usuarios" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative max-w-xs w-full">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar usuário..."
                className="h-9 pl-8"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b border-border uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4">Perfil</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Último acesso</th>
                    <th className="py-3 px-4">Criado em</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {usuariosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted-foreground">
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  ) : (
                    usuariosFiltrados.map((u) => {
                      const RoleIcon = ROLE_ICONS[u.role] || UserIcon;
                      const isAtivo = u.status === 'ativo';
                      return (
                        <tr key={u.id} className="hover:bg-muted/30 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <UserAvatar name={u.nome} size="sm" />
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground truncate">{u.nome}</div>
                                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground/90 border border-border">
                              <RoleIcon size={12} /> {PERFIS_LABELS[u.role] || u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isAtivo ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" /> Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" /> Inativo
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {u.last_access_at ? formatarDataHistorico(u.last_access_at) : 'Nunca acessou'}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {formatarDataHistorico(u.created_date)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => abrirEditarUsuario(u)}
                                className="h-8 px-2 text-xs font-semibold shadow-2xs"
                              >
                                <Pencil size={13} className="mr-1" /> Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => alternarStatusUsuario(u)}
                                className={`h-8 px-2 text-xs font-medium ${
                                  isAtivo ? 'text-destructive hover:bg-destructive/10' : 'text-emerald-700 hover:bg-emerald-50'
                                }`}
                                title={isAtivo ? 'Desativar usuário' : 'Ativar usuário'}
                              >
                                <Power size={13} className="mr-1" /> {isAtivo ? 'Desativar' : 'Ativar'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ABA: REVENDAS */}
        <TabsContent value="revendas" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Cadastre as revendas parceiras para associar às demandas com logomarcas visíveis em todo o sistema.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b border-border uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Revenda</th>
                    <th className="py-3 px-4">Logomarca / Foto</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {revendas.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-10 text-center text-muted-foreground">
                        Nenhuma revenda cadastrada ainda. Clique em "Adicionar revenda" para começar.
                      </td>
                    </tr>
                  ) : (
                    revendas.map((r) => (
                      <tr key={r.id || r.nome} className="hover:bg-muted/30 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={r.nome} src={r.logo_url} size="md" />
                            <div>
                              <div className="font-bold text-foreground text-sm">{r.nome}</div>
                              <div className="text-xs text-muted-foreground">ID: {r.id || 'local'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <label
                            className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border border-border rounded-lg bg-background hover:bg-muted transition text-foreground"
                            title="Trocar logotipo da revenda"
                          >
                            <Camera size={13} className="text-muted-foreground" />
                            <span>{r.logo_url ? 'Alterar Logo' : 'Enviar Logo'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadLogoRevenda(r, f);
                              }}
                            />
                          </label>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => abrirEditarRevenda(r)}
                              className="h-8 px-2 text-xs font-semibold shadow-2xs"
                            >
                              <Pencil size={13} className="mr-1" /> Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExcluirRevenda(r)}
                              className="h-8 px-2 text-xs font-medium text-destructive hover:bg-destructive/10"
                              title="Remover revenda"
                            >
                              <Trash2 size={13} className="mr-1" /> Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ABA: CONFIGURAÇÕES */}
        <TabsContent value="configuracoes" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-6 max-w-2xl">
            <div>
              <h2 className="text-base font-bold text-foreground">Visualização do Vendedor</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Defina o que os usuários com perfil Vendedor podem visualizar na fila de prioridades.
              </p>
            </div>

            <div className="space-y-3">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  configuracao.seller_view_mode === 'all'
                    ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <input
                  type="radio"
                  name="seller_mode"
                  checked={configuracao.seller_view_mode === 'all'}
                  onChange={() => atualizarConfiguracao({ seller_view_mode: 'all' })}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-semibold text-sm text-foreground">Modo 1: Vendedor visualiza todas as demandas</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    O vendedor acompanha toda a fila global de demandas da empresa.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  configuracao.seller_view_mode === 'own'
                    ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <input
                  type="radio"
                  name="seller_mode"
                  checked={configuracao.seller_view_mode === 'own'}
                  onChange={() => atualizarConfiguracao({ seller_view_mode: 'own' })}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-semibold text-sm text-foreground">Modo 2: Vendedor visualiza somente suas próprias demandas</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    O vendedor tem acesso restrito apenas aos pedidos em que ele é o vendedor responsável.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </TabsContent>

        {/* ABA: AUDITORIA */}
        <TabsContent value="auditoria" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Log de Auditoria Administrativa</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Registro cronológico de acessos, alterações de perfil, permissões e ações críticas.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={carregarAuditLogs} className="text-xs">
                Atualizar logs
              </Button>
            </div>

            {loadingAudit ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-3 border-muted border-t-foreground rounded-full animate-spin" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                Nenhum registro de auditoria encontrado.
              </div>
            ) : (
              <div className="divide-y divide-border/60 max-h-[600px] overflow-y-auto text-xs">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 hover:bg-muted/20 transition flex items-start gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0 mt-0.5">
                      <Clock size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-foreground">
                          {log.user_nome} ({log.user_email || 'Sistema'})
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {formatarDataHistorico(log.created_at)}
                        </span>
                      </div>
                      <p className="text-foreground/90 font-medium mt-0.5">{log.details || log.action}</p>
                      <div className="text-[10px] text-muted-foreground font-mono mt-1">
                        Ação: <strong className="text-foreground/80">{log.action}</strong> · Entidade: {log.entity_type}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL: ADICIONAR USUÁRIO */}
      <Dialog open={modalNovoOpen} onOpenChange={setModalNovoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus size={18} /> Adicionar Novo Usuário
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe os dados do colaborador para cadastrá-lo e enviar o convite de acesso.
            </DialogDescription>
          </DialogHeader>

          {erroNovo && (
            <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive font-medium border border-destructive/20 flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{erroNovo}</span>
            </div>
          )}

          <form onSubmit={handleCriarUsuario} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="novo-nome" className="text-xs font-semibold flex items-center gap-1.5">
                <UserIcon size={13} /> Nome completo *
              </Label>
              <Input
                id="novo-nome"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Ex.: Maria Souza"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="novo-email" className="text-xs font-semibold flex items-center gap-1.5">
                <Mail size={13} /> E-mail corporativo *
              </Label>
              <Input
                id="novo-email"
                type="email"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                placeholder="maria@empresa.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Perfil Base</Label>
              <Select value={novoPerfil} onValueChange={setNovoPerfil}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione um perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PERFIS.SELLER}>
                    <div className="flex items-center gap-2">
                      <ShoppingBag size={14} /> Vendedor
                    </div>
                  </SelectItem>
                  <SelectItem value={PERFIS.CONSULTANT}>
                    <div className="flex items-center gap-2">
                      <Briefcase size={14} /> Consultor
                    </div>
                  </SelectItem>
                  <SelectItem value={PERFIS.DESIGNER}>
                    <div className="flex items-center gap-2">
                      <Palette size={14} /> Designer
                    </div>
                  </SelectItem>
                  <SelectItem value={PERFIS.PRINTER}>
                    <div className="flex items-center gap-2">
                      <Printer size={14} /> Impressor
                    </div>
                  </SelectItem>
                  <SelectItem value={PERFIS.ADMIN}>
                    <div className="flex items-center gap-2 font-semibold text-primary">
                      <ShieldCheck size={14} /> Administrador
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setModalNovoOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoNovo || !novoNome.trim() || !novoEmail.trim()}>
                {salvandoNovo ? 'Enviando convite...' : 'Cadastrar e Enviar Convite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDITAR USUÁRIO & PERMISSÕES GRANULARES */}
      <Dialog open={modalEditarOpen} onOpenChange={setModalEditarOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Pencil size={18} /> Editar Usuário e Permissões
            </DialogTitle>
            <DialogDescription className="text-xs">
              Altere dados básicos, perfil e personalize exceções de permissão individual para <strong className="text-foreground">{usuarioEditando?.nome}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {erroEdit && (
              <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive font-medium border border-destructive/20 flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{erroEdit}</span>
              </div>
            )}

            {/* Dados Básicos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-nome" className="text-xs font-semibold">Nome</Label>
                <Input
                  id="edit-nome"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-email" className="text-xs font-semibold">E-mail</Label>
                <Input
                  id="edit-email"
                  value={editEmail}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                  title="O e-mail é a chave de login do usuário"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Perfil Base</Label>
                <Select value={editPerfil} onValueChange={handlePerfilChange}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PERFIS.SELLER}>Vendedor</SelectItem>
                    <SelectItem value={PERFIS.CONSULTANT}>Consultor</SelectItem>
                    <SelectItem value={PERFIS.DESIGNER}>Designer</SelectItem>
                    <SelectItem value={PERFIS.PRINTER}>Impressor</SelectItem>
                    <SelectItem value={PERFIS.ADMIN}>Administrador</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Ao trocar o perfil base, as permissões padrão são carregadas automaticamente.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status da Conta</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo (Desativado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Matriz de Permissões Granulares */}
            <div className="space-y-4 pt-2 border-t border-border">
              <div>
                <h3 className="text-sm font-bold text-foreground">Permissões Individuais (Exceções de Perfil)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Conceda ou remova permissões específicas sem precisar alterar o perfil do usuário.
                </p>
              </div>

              <div className="space-y-4">
                {PERMISSOES_DEFINICAO.map((grupo) => (
                  <div key={grupo.modulo} className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2.5">
                    <div className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center justify-between">
                      <span>{grupo.modulo}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {grupo.permissoes.map((p) => {
                        const checado = Boolean(editPermissoes[p.key]);
                        return (
                          <label
                            key={p.key}
                            className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition cursor-pointer"
                          >
                            <Checkbox
                              checked={checado}
                              onCheckedChange={() => togglePermissao(p.key)}
                              disabled={editPerfil === PERFIS.ADMIN}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-foreground leading-snug">
                                {p.label}
                              </div>
                              <div className="text-[11px] text-muted-foreground leading-tight">
                                {p.descricao}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border bg-card">
            <Button variant="outline" onClick={() => setModalEditarOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarEdicao} disabled={salvandoEdit || !editNome.trim()} className="font-semibold">
              {salvandoEdit ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: ADICIONAR / EDITAR REVENDA */}
      <Dialog open={modalRevendaOpen} onOpenChange={setModalRevendaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 size={18} /> {revendaEditando ? 'Editar Revenda' : 'Adicionar Nova Revenda'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe o nome e a logomarca da revenda para associar às demandas.
            </DialogDescription>
          </DialogHeader>

          {erroRevenda && (
            <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive font-medium border border-destructive/20 flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{erroRevenda}</span>
            </div>
          )}

          <form onSubmit={handleSalvarRevenda} className="space-y-4 py-2">
            <div className="flex items-center gap-4">
              <UserAvatar name={nomeRevenda || 'Revenda'} src={logoRevenda} size="lg" />
              <div>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-border rounded-lg bg-muted/60 hover:bg-muted transition text-foreground">
                  <Camera size={14} /> {logoRevenda ? 'Trocar Logotipo' : 'Carregar Logotipo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        try {
                          const b64 = await processAvatarFile(f);
                          setLogoRevenda(b64);
                        } catch (err) {
                          console.error('Erro ao processar imagem:', err);
                        }
                      }
                    }}
                  />
                </label>
                {logoRevenda && (
                  <button
                    type="button"
                    onClick={() => setLogoRevenda('')}
                    className="block text-[11px] text-destructive hover:underline mt-1"
                  >
                    Remover foto
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nome-revenda" className="text-xs font-semibold flex items-center gap-1.5">
                <Building2 size={13} /> Nome da Revenda *
              </Label>
              <Input
                id="nome-revenda"
                value={nomeRevenda}
                onChange={(e) => setNomeRevenda(e.target.value)}
                placeholder="Ex.: Alfa Decorações"
                required
                autoFocus
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setModalRevendaOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoRevenda || !nomeRevenda.trim()}>
                {salvandoRevenda ? 'Salvando...' : revendaEditando ? 'Salvar Alterações' : 'Cadastrar Revenda'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
