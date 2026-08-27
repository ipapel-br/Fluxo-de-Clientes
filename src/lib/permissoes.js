/**
 * Sistema de Perfis e Permissões Granulares (RBAC)
 * Fluxo de Clientes
 */

export const PERFIS = {
  ADMIN: 'admin',
  SELLER: 'seller',
  DESIGNER: 'designer',
  PRINTER: 'printer',
};

export const PERFIS_LABELS = {
  [PERFIS.ADMIN]: 'Administrador',
  [PERFIS.SELLER]: 'Vendedor',
  [PERFIS.DESIGNER]: 'Designer',
  [PERFIS.PRINTER]: 'Impressor',
};

export const PERMISSOES_DEFINICAO = [
  {
    modulo: 'PRIORIDADE',
    permissoes: [
      { key: 'priority_view', label: 'Visualizar fila de prioridade', descricao: 'Acesso à aba de prioridades e lista de demandas' },
      { key: 'priority_create', label: 'Criar nova demanda', descricao: 'Pode cadastrar novas demandas no sistema' },
      { key: 'priority_edit', label: 'Editar demandas', descricao: 'Pode alterar informações das demandas na prioridade' },
      { key: 'priority_reorder', label: 'Reordenar prioridade (Drag & Drop)', descricao: 'Pode alterar a ordem manual de prioridade' },
    ],
  },
  {
    modulo: 'FÁBRICA',
    permissoes: [
      { key: 'factory_view', label: 'Visualizar fila da fábrica', descricao: 'Acesso à aba Fábrica e fila de produção' },
      { key: 'factory_edit', label: 'Editar informações da fábrica', descricao: 'Pode alterar acabamento e observações de fábrica' },
      { key: 'factory_reorder', label: 'Reordenar fábrica (Drag & Drop)', descricao: 'Pode alterar a ordem manual da fila de impressão' },
      { key: 'factory_start', label: 'Iniciar impressão', descricao: 'Pode colocar a demanda em status de impressão' },
      { key: 'factory_complete', label: 'Concluir impressão', descricao: 'Pode finalizar o processo de impressão da demanda' },
    ],
  },
  {
    modulo: 'CONCLUÍDO',
    permissoes: [
      { key: 'completed_view', label: 'Visualizar concluídos', descricao: 'Acesso à aba de demandas finalizadas' },
      { key: 'completed_reopen', label: 'Reabrir demandas', descricao: 'Pode reabrir demandas finalizadas para a fila ativa' },
    ],
  },
  {
    modulo: 'HISTÓRICO',
    permissoes: [
      { key: 'history_view', label: 'Visualizar histórico', descricao: 'Pode visualizar o histórico completo das demandas' },
    ],
  },
  {
    modulo: 'ADMINISTRAÇÃO',
    permissoes: [
      { key: 'users_manage', label: 'Gerenciar usuários e permissões', descricao: 'Cadastrar, editar, desativar e alterar permissões' },
      { key: 'settings_manage', label: 'Gerenciar configurações do sistema', descricao: 'Alterar regras e configurações globais' },
    ],
  },
];

// Permissões padrão para cada perfil
export const PERMISSOES_PADRAO_POR_PERFIL = {
  [PERFIS.ADMIN]: [
    'priority_view',
    'priority_create',
    'priority_edit',
    'priority_reorder',
    'factory_view',
    'factory_edit',
    'factory_reorder',
    'factory_start',
    'factory_complete',
    'completed_view',
    'completed_reopen',
    'history_view',
    'users_manage',
    'settings_manage',
    'admin_full_access',
  ],
  [PERFIS.SELLER]: [
    'priority_view',
    'priority_create',
    'priority_edit',
    'completed_view',
    'history_view',
  ],
  [PERFIS.DESIGNER]: [
    'priority_view',
    'priority_edit',
    'completed_view',
    'history_view',
  ],
  [PERFIS.PRINTER]: [
    'factory_view',
    'factory_edit',
    'factory_reorder',
    'factory_start',
    'factory_complete',
    'completed_view',
    'history_view',
  ],
};

/**
 * Verifica se um usuário possui uma determinada permissão.
 * @param {object} usuario Objeto do usuário autenticado
 * @param {string} permissionKey Chave da permissão
 * @returns {boolean}
 */
export function hasPermission(usuario, permissionKey) {
  if (!usuario) return false;
  if (usuario.role === PERFIS.ADMIN) return true;
  if (usuario.is_admin) return true;

  // 1. Verificar override explícito no usuário (true ou false)
  const extras = usuario.permissoes_extras || {};
  if (extras[permissionKey] === true) return true;
  if (extras[permissionKey] === false) return false;

  // 2. Fallback para permissões padrão do perfil
  const role = usuario.role || PERFIS.SELLER;
  const padrao = PERMISSOES_PADRAO_POR_PERFIL[role] || [];
  return padrao.includes(permissionKey);
}

/**
 * Retorna o mapa de todas as permissões efetivas do usuário
 * @param {object} usuario
 * @returns {Record<string, boolean>}
 */
export function getEffectivePermissions(usuario) {
  const result = {};
  if (!usuario) return result;

  const isAdmin = usuario.role === PERFIS.ADMIN || usuario.is_admin;
  const role = usuario.role || PERFIS.SELLER;
  const padrao = PERMISSOES_PADRAO_POR_PERFIL[role] || [];
  const extras = usuario.permissoes_extras || {};

  PERMISSOES_DEFINICAO.forEach((grupo) => {
    grupo.permissoes.forEach((p) => {
      if (isAdmin) {
        result[p.key] = true;
      } else if (extras[p.key] !== undefined) {
        result[p.key] = Boolean(extras[p.key]);
      } else {
        result[p.key] = padrao.includes(p.key);
      }
    });
  });

  return result;
}

/**
 * Retorna a rota inicial sugerida para o perfil do usuário
 * @param {object} usuario
 * @returns {string}
 */
export function getInitialRouteForUser(usuario) {
  if (!usuario) return '/';
  if (usuario.role === PERFIS.PRINTER && hasPermission(usuario, 'factory_view')) {
    return '/impressao';
  }
  return '/';
}
