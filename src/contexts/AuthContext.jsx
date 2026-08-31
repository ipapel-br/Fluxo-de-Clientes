import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { localClient } from '@/api/localClient';
import { supabase, isSupabaseConfigured } from '@/api/supabaseClient';
import {
  PERFIS,
  hasPermission as checkHasPermission,
  getEffectivePermissions,
  getInitialRouteForUser,
} from '@/lib/permissoes';
import { syncAvatarsFromUsers, saveAvatar } from '@/lib/avatarService';

const AUTH_STORAGE_KEY = 'fluxo-clientes:current-user';

function safeStorageGet(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return null;
}

function safeStorageSet(key, value) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
}

function safeStorageRemove(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {}
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const stored = safeStorageGet(AUTH_STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      // Garantir que alan.d.santos2021@gmail.com tenha acesso admin e perfil designer/admin
      if (parsed && (parsed.email || '').toLowerCase().trim() === 'alan.d.santos2021@gmail.com') {
        parsed.is_admin = true;
        if (!parsed.role) parsed.role = 'designer';
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [usuariosLista, setUsuariosLista] = useState([]);
  const [revendasLista, setRevendasLista] = useState([]);
  const [configuracao, setConfiguracao] = useState({ seller_view_mode: 'all' });
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [carregandoAuth, setCarregandoAuth] = useState(true);

  // Carregar lista de usuários, revendas e configurações
  const carregarUsuariosEConfig = useCallback(async () => {
    try {
      const [users, revs, configs] = await Promise.all([
        localClient.entities.Usuario.list('nome', 500),
        localClient.entities.Revenda.list('nome', 500),
        localClient.entities.Configuracao.list('id', 1),
      ]);
      const lista = users || [];
      const listaRevs = revs || [];
      setUsuariosLista(lista);
      setRevendasLista(listaRevs);
      syncAvatarsFromUsers(lista);
      listaRevs.forEach((r) => {
        if (r.logo_url && r.nome) {
          saveAvatar(r.nome, r.logo_url);
        }
      });
      if (configs && configs.length > 0) {
        setConfiguracao(configs[0]);
      }
    } catch (err) {
      console.error('[AuthContext] Erro ao carregar usuários/revendas/configurações:', err);
    }
  }, []);

  // Registrar auditoria
  const registrarAuditoria = useCallback(
    async (acao, entityType, entityId, oldValue = null, newValue = null, details = '') => {
      try {
        const payload = {
          user_id: usuario?.id || 'sistema',
          user_nome: usuario?.nome || 'Sistema',
          user_email: usuario?.email || '',
          action: acao,
          entity_type: entityType,
          entity_id: entityId || '',
          old_value: oldValue,
          new_value: newValue,
          details: details || '',
          created_at: new Date().toISOString(),
        };
        await localClient.entities.AuditLog.create(payload);
      } catch (err) {
        console.error('[AuthContext] Erro ao registrar auditoria:', err);
      }
    },
    [usuario]
  );

  // Registrar presença do usuário atual (atualiza last_access_at no banco e estado local)
  const registrarPresenca = useCallback(async (userId) => {
    if (!userId) return;
    const agora = new Date().toISOString();
    try {
      await localClient.entities.Usuario.update(userId, { last_access_at: agora });
      setUsuariosLista((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, last_access_at: agora } : u))
      );
    } catch (err) {
      console.warn('[AuthContext] Erro ao registrar presença:', err);
    }
  }, []);

  // Verificar sessão inicial e sincronizar com Supabase se configurado
  useEffect(() => {
    async function inicializar() {
      setCarregandoAuth(true);
      try {
        await carregarUsuariosEConfig();

        // Se o Supabase estiver ativo, checar se há sessão ativa no Auth
        if (isSupabaseConfigured && supabase) {
          const { data } = await supabase.auth.getSession();
          const session = data?.session;
          if (session?.user?.email) {
            const email = session.user.email.toLowerCase().trim();
            const users = await localClient.entities.Usuario.list('nome', 500);
            const perfilEncontrado = users.find(
              (u) => (u.email || '').toLowerCase().trim() === email
            );

            if (perfilEncontrado && perfilEncontrado.status === 'ativo') {
              const dados = {
                ...perfilEncontrado,
                auth_user_id: session.user.id,
              };
              setUsuario(dados);
              safeStorageSet(AUTH_STORAGE_KEY, JSON.stringify(dados));
            } else if (!perfilEncontrado) {
              // E-mail não autorizado na lista
              setUsuario(null);
              safeStorageRemove(AUTH_STORAGE_KEY);
            }
          }
        }
      } catch (e) {
        console.error('[AuthContext] Erro na inicialização do auth:', e);
      } finally {
        setCarregandoAuth(false);
      }
    }
    inicializar();
  }, [carregarUsuariosEConfig]);

  // Heartbeat em tempo real de presença e último acesso
  useEffect(() => {
    if (!usuario?.id) return;

    // Atualiza imediatamente na inicialização/login
    registrarPresenca(usuario.id);

    // Heartbeat a cada 2 minutos
    const interval = setInterval(() => {
      registrarPresenca(usuario.id);
    }, 2 * 60 * 1000);

    // Atualiza ao voltar o foco para a janela (com throttle de 60 segundos)
    let lastTouch = Date.now();
    const handleFocus = () => {
      if (Date.now() - lastTouch > 60 * 1000) {
        lastTouch = Date.now();
        registrarPresenca(usuario.id);
      }
    };

    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [usuario?.id, registrarPresenca]);

  // Se não estiver logado, abrir modal de login
  useEffect(() => {
    if (!carregandoAuth && (!usuario || !usuario.email)) {
      setLoginModalOpen(true);
    }
  }, [usuario, carregandoAuth]);

  // Permissões efetivas do usuário atual
  const permissoes = useMemo(() => {
    return getEffectivePermissions(usuario);
  }, [usuario]);

  const can = useCallback(
    (permissionKey) => {
      return checkHasPermission(usuario, permissionKey);
    },
    [usuario]
  );

  /**
   * Login por e-mail (com restrição estrita a usuários cadastrados e ativos)
   */
  async function entrarComEmail(email) {
    const emailLimpo = (email || '').trim().toLowerCase();
    if (!emailLimpo) {
      return { success: false, error: 'Por favor, informe seu e-mail.' };
    }

    try {
      let users = [];
      try {
        users = await localClient.entities.Usuario.list('nome', 500);
      } catch {
        users = [];
      }

      // Se a base local estiver completamente vazia, permitir login do primeiro admin padrão
      if (users.length === 0 && !isSupabaseConfigured) {
        const adminCriado = await localClient.entities.Usuario.create({
          nome: 'Administrador',
          email: emailLimpo,
          role: PERFIS.ADMIN,
          status: 'ativo',
          permissoes_extras: {},
        });
        users = [adminCriado];
      }

      let encontrado = users.find(
        (u) => (u.email || '').trim().toLowerCase() === emailLimpo
      );

      // Se for o e-mail do Alan Santos e não estiver cadastrado ainda, provisiona automaticamente como Designer + Admin
      if (!encontrado && emailLimpo === 'alan.d.santos2021@gmail.com') {
        const novoAdmin = await localClient.entities.Usuario.create({
          nome: 'Alan Santos',
          email: 'alan.d.santos2021@gmail.com',
          role: PERFIS.DESIGNER,
          is_admin: true,
          status: 'ativo',
          permissoes_extras: {},
        });
        encontrado = novoAdmin;
      }

      // Verificação de autorização prévia
      if (!encontrado) {
        return {
          success: false,
          error: 'Seu e-mail não possui acesso ao sistema. Entre em contato com o administrador.',
        };
      }

      // Verificação de usuário ativo
      if (encontrado.status === 'inativo') {
        return {
          success: false,
          error: 'Seu usuário está desativado no sistema. Entre em contato com o administrador.',
        };
      }

      // Supabase Auth opcional (futuro)
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: authData } = await supabase.auth.signInWithOtp({ email: emailLimpo });
          if (authData?.user?.id) {
            encontrado.auth_user_id = authData.user.id;
          }
        } catch {}
      }

      const agora = new Date().toISOString();

      // Garantir que alan.d.santos2021@gmail.com sempre tenha is_admin = true e papel Designer (ou o selecionado)
      if (emailLimpo === 'alan.d.santos2021@gmail.com') {
        encontrado.is_admin = true;
        if (encontrado.role === PERFIS.ADMIN) {
          encontrado.role = PERFIS.DESIGNER;
        }
        await localClient.entities.Usuario.update(encontrado.id, {
          is_admin: true,
          role: encontrado.role || PERFIS.DESIGNER,
          last_access_at: agora,
        });
      } else {
        await localClient.entities.Usuario.update(encontrado.id, { last_access_at: agora });
      }

      const dadosUsuario = {
        id: encontrado.id,
        auth_user_id: encontrado.auth_user_id || null,
        nome: encontrado.nome,
        email: encontrado.email,
        avatar_url: encontrado.avatar_url || '',
        role: encontrado.role || PERFIS.DESIGNER,
        is_admin: encontrado.is_admin || encontrado.role === PERFIS.ADMIN || emailLimpo === 'alan.d.santos2021@gmail.com',
        status: encontrado.status || 'ativo',
        permissoes_extras: encontrado.permissoes_extras || {},
        last_access_at: agora,
      };

      setUsuario(dadosUsuario);
      safeStorageSet(AUTH_STORAGE_KEY, JSON.stringify(dadosUsuario));
      setLoginModalOpen(false);
      await carregarUsuariosEConfig();

      await registrarAuditoria(
        'LOGIN',
        'usuario',
        encontrado.id,
        null,
        null,
        `Usuário ${encontrado.nome} acessou o sistema.`
      );

      return { success: true, usuario: dadosUsuario };
    } catch (err) {
      console.error('[AuthContext] Erro ao autenticar:', err);
      return { success: false, error: 'Erro ao conectar ao sistema de autenticação.' };
    }
  }

  /**
   * Adicionar usuário (Apenas Administrador)
   */
  async function adicionarUsuario({ nome, email, role = PERFIS.SELLER, permissoes_extras = {} }) {
    if (!can('users_manage') && usuario?.role !== PERFIS.ADMIN) {
      return { success: false, error: 'Você não tem permissão para gerenciar usuários.' };
    }

    const nomeLimpo = (nome || '').trim();
    const emailLimpo = (email || '').trim().toLowerCase();

    if (!nomeLimpo) {
      return { success: false, error: 'Informe o nome completo.' };
    }
    if (!emailLimpo || !emailLimpo.includes('@')) {
      return { success: false, error: 'Informe um e-mail válido.' };
    }

    try {
      const users = await localClient.entities.Usuario.list('nome', 500);
      const existe = users.find((u) => (u.email || '').trim().toLowerCase() === emailLimpo);
      if (existe) {
        return { success: false, error: 'Já existe um usuário com este e-mail cadastrado.' };
      }

      // Se Supabase configurado, pode disparar convite via Supabase Auth
      let authUserId = null;
      if (isSupabaseConfigured && supabase) {
        try {
          // Tentativa de envio de Magic Link / Convite Supabase
          const { error: inviteError } = await supabase.auth.signInWithOtp({
            email: emailLimpo,
            options: {
              data: { nome: nomeLimpo, role },
            },
          });
          if (inviteError) {
            console.warn('[Supabase Auth] Aviso ao enviar link/convite de e-mail:', inviteError.message);
          }
        } catch (e) {
          console.warn('[Supabase Auth] Erro silencioso no disparo do convite:', e);
        }
      }

      const novo = await localClient.entities.Usuario.create({
        nome: nomeLimpo,
        email: emailLimpo,
        role: role || PERFIS.SELLER,
        status: 'ativo',
        permissoes_extras: permissoes_extras || {},
        auth_user_id: authUserId,
      });

      await registrarAuditoria(
        'CRIAR_USUARIO',
        'usuario',
        novo.id,
        null,
        novo,
        `${usuario?.nome || 'Admin'} adicionou o usuário ${nomeLimpo} (${role})`
      );

      await carregarUsuariosEConfig();
      return { success: true, usuario: novo };
    } catch (err) {
      console.error('[AuthContext] Erro ao adicionar usuário:', err);
      return { success: false, error: 'Erro ao cadastrar novo usuário.' };
    }
  }

  /**
   * Atualizar usuário (Apenas Administrador)
   */
  async function atualizarUsuario(id, patch) {
    if (!can('users_manage') && usuario?.role !== PERFIS.ADMIN) {
      return { success: false, error: 'Você não tem permissão para gerenciar usuários.' };
    }

    try {
      const users = await localClient.entities.Usuario.list('nome', 500);
      const antigo = users.find((u) => u.id === id);
      if (!antigo) {
        return { success: false, error: 'Usuário não encontrado.' };
      }

      // Proteção: não permitir desativar ou remover admin do último administrador ativo
      const adminsAtivos = users.filter((u) => u.role === PERFIS.ADMIN && u.status === 'ativo');
      if (antigo.role === PERFIS.ADMIN && antigo.status === 'ativo' && adminsAtivos.length <= 1) {
        if (patch.status === 'inativo') {
          return { success: false, error: 'Não é permitido desativar o único Administrador ativo do sistema.' };
        }
        if (patch.role && patch.role !== PERFIS.ADMIN) {
          return { success: false, error: 'Não é permitido remover o perfil de Administrador do único admin ativo.' };
        }
      }

      const atualizado = await localClient.entities.Usuario.update(id, patch);

      // Se for o próprio usuário logado, atualiza o estado local
      if (usuario?.id === id) {
        const novoUsuarioLogado = { ...usuario, ...atualizado };
        setUsuario(novoUsuarioLogado);
        safeStorageSet(AUTH_STORAGE_KEY, JSON.stringify(novoUsuarioLogado));
      }

      await registrarAuditoria(
        'ATUALIZAR_USUARIO',
        'usuario',
        id,
        antigo,
        atualizado,
        `${usuario?.nome || 'Admin'} atualizou dados de ${antigo.nome}`
      );

      await carregarUsuariosEConfig();
      return { success: true, usuario: atualizado };
    } catch (err) {
      console.error('[AuthContext] Erro ao atualizar usuário:', err);
      return { success: false, error: 'Erro ao salvar alterações do usuário.' };
    }
  }

  /**
   * Desativar usuário
   */
  async function desativarUsuario(id) {
    return atualizarUsuario(id, { status: 'inativo' });
  }

  /**
   * Ativar usuário
   */
  async function ativarUsuario(id) {
    return atualizarUsuario(id, { status: 'ativo' });
  }

  /**
   * Excluir usuário permanentemente
   */
  async function excluirUsuario(id) {
    if (!can('users_manage') && usuario?.role !== PERFIS.ADMIN) {
      return { success: false, error: 'Você não tem permissão para excluir usuários.' };
    }

    try {
      const users = await localClient.entities.Usuario.list('nome', 500);
      const alvo = users.find((u) => u.id === id);
      if (!alvo) {
        return { success: false, error: 'Usuário não encontrado.' };
      }

      // Proteção 1: Não permitir excluir a si próprio
      if (usuario?.id === id || (usuario?.email && alvo.email && usuario.email.toLowerCase().trim() === alvo.email.toLowerCase().trim())) {
        return { success: false, error: 'Você não pode excluir sua própria conta enquanto estiver conectado.' };
      }

      // Proteção 2: Não permitir excluir a conta do desenvolvedor Alan Santos
      if ((alvo.email || '').toLowerCase().trim() === 'alan.d.santos2021@gmail.com') {
        return { success: false, error: 'A conta principal do desenvolvedor não pode ser excluída.' };
      }

      // Proteção 3: Não permitir excluir o único administrador ativo
      const adminsAtivos = users.filter((u) => u.role === PERFIS.ADMIN && u.status === 'ativo' && u.id !== id);
      if (alvo.role === PERFIS.ADMIN && adminsAtivos.length === 0) {
        return { success: false, error: 'Não é permitido excluir o único Administrador ativo do sistema.' };
      }

      await localClient.entities.Usuario.delete(id);

      await registrarAuditoria(
        'EXCLUIR_USUARIO',
        'usuario',
        id,
        alvo,
        null,
        `${usuario?.nome || 'Admin'} excluiu o usuário ${alvo.nome} (${alvo.email})`
      );

      await carregarUsuariosEConfig();
      return { success: true };
    } catch (err) {
      console.error('[AuthContext] Erro ao excluir usuário:', err);
      return { success: false, error: 'Erro ao excluir usuário.' };
    }
  }

  /**
   * Atualizar configurações do sistema
   */
  async function atualizarConfiguracao(patch) {
    if (!can('settings_manage')) {
      return { success: false, error: 'Sem permissão para alterar configurações.' };
    }
    try {
      const atualizada = await localClient.entities.Configuracao.update('config_geral', patch);
      setConfiguracao(atualizada);
      await registrarAuditoria(
        'ATUALIZAR_CONFIG',
        'configuracoes',
        'config_geral',
        configuracao,
        atualizada,
        `${usuario?.nome || 'Admin'} atualizou configurações do sistema.`
      );
      return { success: true, configuracao: atualizada };
    } catch (err) {
      console.error('[AuthContext] Erro ao atualizar configuração:', err);
      return { success: false, error: 'Erro ao salvar configurações.' };
    }
  }

  /**
   * Atualizar avatar do usuário logado (base64 ou URL)
   */
  async function atualizarAvatar(avatarUrl) {
    if (!usuario?.id) return;
    try {
      await localClient.entities.Usuario.update(usuario.id, { avatar_url: avatarUrl });
      const updated = { ...usuario, avatar_url: avatarUrl };
      setUsuario(updated);
      safeStorageSet(AUTH_STORAGE_KEY, JSON.stringify(updated));
      if (usuario.nome) saveAvatar(usuario.nome, avatarUrl);
      if (usuario.email) saveAvatar(usuario.email, avatarUrl);
      if (usuario.id) saveAvatar(usuario.id, avatarUrl);
      await carregarUsuariosEConfig();
    } catch (err) {
      console.error('[AuthContext] Erro ao atualizar avatar:', err);
    }
  }

  // Listas de usuários ativos categorizados estritamente por papel base
  const vendedoresCadastrados = useMemo(() => {
    return usuariosLista
      .filter((u) => u.status === 'ativo' && (u.role === PERFIS.SELLER || u.role === PERFIS.CONSULTANT))
      .map((u) => ({ id: u.id, nome: u.nome, email: u.email, avatar_url: u.avatar_url, role: u.role }));
  }, [usuariosLista]);

  const designersCadastrados = useMemo(() => {
    return usuariosLista
      .filter((u) => u.status === 'ativo' && u.role === PERFIS.DESIGNER)
      .map((u) => ({ id: u.id, nome: u.nome, email: u.email, avatar_url: u.avatar_url, role: u.role }));
  }, [usuariosLista]);

  const impressoresCadastrados = useMemo(() => {
    return usuariosLista
      .filter((u) => u.status === 'ativo' && u.role === PERFIS.PRINTER)
      .map((u) => ({ id: u.id, nome: u.nome, email: u.email, avatar_url: u.avatar_url, role: u.role }));
  }, [usuariosLista]);

  /**
   * Adicionar Revenda
   */
  async function adicionarRevenda({ nome, logo_url = '' }) {
    if (!can('revendas_manage') && !can('settings_manage') && usuario?.role !== PERFIS.ADMIN) {
      return { success: false, error: 'Sem permissão para cadastrar revendas.' };
    }
    try {
      const criada = await localClient.entities.Revenda.create({
        nome: nome.trim(),
        logo_url,
      });
      if (logo_url && nome) {
        saveAvatar(nome, logo_url);
      }
      await carregarUsuariosEConfig();
      return { success: true, revenda: criada };
    } catch (err) {
      console.error('[AuthContext] Erro ao cadastrar revenda:', err);
      return { success: false, error: 'Erro ao cadastrar revenda.' };
    }
  }

  /**
   * Atualizar Revenda
   */
  async function atualizarRevenda(id, patch) {
    if (!can('revendas_manage') && !can('settings_manage') && usuario?.role !== PERFIS.ADMIN) {
      return { success: false, error: 'Sem permissão para editar revendas.' };
    }
    try {
      const atualizada = await localClient.entities.Revenda.update(id, patch);
      if (atualizada.logo_url && atualizada.nome) {
        saveAvatar(atualizada.nome, atualizada.logo_url);
      }
      await carregarUsuariosEConfig();
      return { success: true, revenda: atualizada };
    } catch (err) {
      console.error('[AuthContext] Erro ao atualizar revenda:', err);
      return { success: false, error: 'Erro ao atualizar revenda.' };
    }
  }

  /**
   * Excluir Revenda
   */
  async function excluirRevenda(id) {
    if (!can('revendas_manage') && !can('settings_manage') && usuario?.role !== PERFIS.ADMIN) {
      return { success: false, error: 'Sem permissão para excluir revendas.' };
    }
    try {
      await localClient.entities.Revenda.delete(id);
      await carregarUsuariosEConfig();
      return { success: true };
    } catch (err) {
      console.error('[AuthContext] Erro ao excluir revenda:', err);
      return { success: false, error: 'Erro ao excluir revenda.' };
    }
  }

  function logout() {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    setUsuario(null);
    safeStorageRemove(AUTH_STORAGE_KEY);
    setLoginModalOpen(true);
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        usuarios: usuariosLista,
        revendas: revendasLista,
        vendedores: vendedoresCadastrados,
        designers: designersCadastrados,
        impressores: impressoresCadastrados,
        configuracao,
        permissoes,
        can,
        carregandoAuth,
        entrarComEmail,
        adicionarUsuario,
        atualizarUsuario,
        atualizarAvatar,
        desativarUsuario,
        ativarUsuario,
        excluirUsuario,
        adicionarRevenda,
        atualizarRevenda,
        excluirRevenda,
        atualizarConfiguracao,
        recarregarUsuarios: carregarUsuariosEConfig,
        registrarAuditoria,
        logout,
        loginModalOpen,
        setLoginModalOpen,
        isAutenticado: Boolean(usuario?.nome && usuario?.email && usuario?.status === 'ativo'),
        initialRoute: getInitialRouteForUser(usuario),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
