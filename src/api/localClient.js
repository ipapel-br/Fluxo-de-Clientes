import { isSupabaseConfigured, createSupabaseEntityApi, normalizeDemanda, normalizeUsuario } from './supabaseClient';

const STORAGE_KEY = 'fluxo-clientes:v1';
const LEGACY_STORAGE_KEYS = ['fluxo-clientes.standalone.v1', 'fluxo-clientes-local-state'];

const now = () => new Date().toISOString();

const clone = (value) => {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

const createId = (prefix) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const defaultStatuses = () => {
  const timestamp = now();
  return [
    { id: 'status_parado', nome: 'Parado', cor: '#ef4444', concluido: false, ordem: 0, created_date: timestamp, updated_date: timestamp },
    { id: 'status_criacao', nome: 'Criação', cor: '#f59e0b', concluido: false, ordem: 1, created_date: timestamp, updated_date: timestamp },
    { id: 'status_revisao', nome: 'Revisão', cor: '#f97316', concluido: false, ordem: 2, created_date: timestamp, updated_date: timestamp },
    { id: 'status_amostra', nome: 'Amostra', cor: '#06b6d4', concluido: false, ordem: 3, created_date: timestamp, updated_date: timestamp },
    { id: 'status_impressao', nome: 'Impressão', cor: '#8b5cf6', concluido: false, ordem: 4, created_date: timestamp, updated_date: timestamp },
    { id: 'status_concluido', nome: 'Concluído', cor: '#22c55e', concluido: true, ordem: 5, created_date: timestamp, updated_date: timestamp },
  ];
};

const defaultUsuarios = () => {
  const timestamp = now();
  return [
    {
      id: 'usuario_admin_alan',
      nome: 'Alan Santos',
      email: 'alan.d.santos2021@gmail.com',
      role: 'designer',
      roles: ['designer'],
      is_admin: true,
      status: 'ativo',
      permissoes_extras: {},
      created_date: timestamp,
      updated_date: timestamp,
      last_access_at: timestamp,
    },
    {
      id: 'usuario_grace_helen',
      nome: 'Grace Helen',
      email: 'grace@fluxodeclientes.com',
      role: 'consultant',
      roles: ['consultant', 'seller'],
      status: 'ativo',
      permissoes_extras: {},
      created_date: timestamp,
      updated_date: timestamp,
      last_access_at: timestamp,
    },
    {
      id: 'usuario_admin_master',
      nome: 'Administrador',
      email: 'admin@fluxodeclientes.com',
      role: 'designer',
      roles: ['designer', 'seller'],
      is_admin: true,
      status: 'ativo',
      permissoes_extras: {},
      created_date: timestamp,
      updated_date: timestamp,
      last_access_at: timestamp,
    },
  ];
};

const defaultConfiguracao = () => [
  { id: 'config_geral', seller_view_mode: 'all', updated_at: now() },
];

const defaultDemandas = () => {
  const timestamp = now();
  return [
    {
      id: 'demanda_01_luise',
      cliente: 'Luise Torres',
      demanda: 'Recriando arte dos quadros',
      etiqueta: 'alta',
      prazo: '2026-08-31', // Hoje
      fase_arte: 'iniciando',
      designer: '',
      vendedor: 'Lucas Cavalcante',
      revenda: 'iPapel',
      status_id: 'status_criacao',
      ordem: 0,
      design_position: 0,
      factory_position: 0,
      factory_status: 'pendente_design',
      created_date: timestamp,
      updated_date: timestamp,
    },
    {
      id: 'demanda_02_colecao',
      cliente: 'COLEÇÃO - Nathaly',
      demanda: 'Tenho mais três durante a semana',
      etiqueta: 'urgente',
      prazo: '2026-08-28', // Vencido
      fase_arte: 'no_meio',
      designer: 'Alan Oliveira',
      vendedor: 'Marlon Oliveira',
      revenda: 'Papelée',
      status_id: 'status_criacao',
      ordem: 1,
      design_position: 1,
      factory_position: 1,
      factory_status: 'pendente_design',
      created_date: timestamp,
      updated_date: timestamp,
    },
    {
      id: 'demanda_03_raimundo',
      cliente: 'Raimundo de Araújo Rocha',
      demanda: 'Bitrix #18929',
      bitrix_id: '18929',
      etiqueta: 'alta',
      prazo: '2026-08-31', // Hoje
      fase_arte: '',
      designer: 'Alan Santos',
      vendedor: 'Joice Castro',
      revenda: '',
      status_id: 'status_impressao',
      ordem: 2,
      design_position: 2,
      factory_position: 2,
      factory_status: 'aguardando',
      created_date: timestamp,
      updated_date: timestamp,
    },
    {
      id: 'demanda_04_lenara',
      cliente: 'Lenara Celes Gama Vasconcelos',
      demanda: 'Bitrix #18913',
      bitrix_id: '18913',
      etiqueta: 'alta',
      prazo: '2026-06-05', // Vencido
      fase_arte: '',
      designer: 'Alan Santos',
      vendedor: 'Joice Castro',
      revenda: '',
      status_id: 'status_impressao',
      ordem: 3,
      design_position: 3,
      factory_position: 3,
      factory_status: 'aguardando',
      created_date: timestamp,
      updated_date: timestamp,
    },
    {
      id: 'demanda_05_excelencia',
      cliente: 'Excelência Lingerie',
      demanda: '',
      etiqueta: 'alta',
      prazo: '2026-08-28', // Vencido
      fase_arte: '',
      designer: 'Alan Santos',
      vendedor: 'Joice Castro',
      revenda: '',
      status_id: 'status_impressao',
      ordem: 4,
      design_position: 4,
      factory_position: 4,
      factory_status: 'aguardando',
      created_date: timestamp,
      updated_date: timestamp,
    },
  ];
};

const defaultRevendas = () => [
  { id: 'revenda_ipapel', nome: 'iPapel', logo_url: '' },
  { id: 'revenda_papelee', nome: 'Papelée', logo_url: '' },
];

const initialState = () => ({
  demandas: defaultDemandas(),
  statuses: defaultStatuses(),
  usuarios: defaultUsuarios(),
  revendas: defaultRevendas(),
  audit_logs: [],
  configuracoes: defaultConfiguracao(),
  notificacoes: [],
});

function normalizeState(value) {
  let demandas = Array.isArray(value?.demandas)
    ? value.demandas.map(normalizeDemanda)
    : Array.isArray(value?.data?.Demanda)
      ? value.data.Demanda.map(normalizeDemanda)
      : [];

  if (demandas.length === 0) {
    demandas = defaultDemandas().map(normalizeDemanda);
  }
  const statuses = Array.isArray(value?.statuses)
    ? value.statuses
    : Array.isArray(value?.data?.Status)
      ? value.data.Status
      : [];
  let usuarios = Array.isArray(value?.usuarios)
    ? value.usuarios.map(normalizeUsuario)
    : Array.isArray(value?.data?.Usuario)
      ? value.data.Usuario.map(normalizeUsuario)
      : defaultUsuarios();

  // Garantir que alan.d.santos2021@gmail.com esteja presente com perfil designer e flag admin
  const alanEmail = 'alan.d.santos2021@gmail.com';
  const alanIndex = usuarios.findIndex(
    (u) => (u.email || '').toLowerCase().trim() === alanEmail
  );
  if (alanIndex >= 0) {
    usuarios[alanIndex] = {
      ...usuarios[alanIndex],
      role: usuarios[alanIndex].role === 'admin' ? 'designer' : (usuarios[alanIndex].role || 'designer'),
      is_admin: true,
      status: 'ativo',
    };
  } else {
    usuarios.unshift({
      id: 'usuario_admin_alan',
      nome: 'Alan Santos',
      email: alanEmail,
      role: 'designer',
      is_admin: true,
      status: 'ativo',
      permissoes_extras: {},
      created_date: now(),
      updated_date: now(),
      last_access_at: now(),
    });
  }

  const audit_logs = Array.isArray(value?.audit_logs)
    ? value.audit_logs
    : [];
  const configuracoes = Array.isArray(value?.configuracoes)
    ? value.configuracoes
    : defaultConfiguracao();
  const revendas = Array.isArray(value?.revendas)
    ? value.revendas
    : Array.isArray(value?.data?.Revenda)
      ? value.data.Revenda
      : defaultRevendas();
  const notificacoes = Array.isArray(value?.notificacoes)
    ? value.notificacoes
    : Array.isArray(value?.data?.Notificacao)
      ? value.data.Notificacao
      : [];

  // 1. Lista canônica e estrita de status:
  // Parado, Criação, Revisão, Amostra, Impressão, Concluído
  const padraoStatuses = defaultStatuses();
  
  // Mapa de normalização de IDs antigos ou nomes similares
  const aliasMap = {
    'status_a_fazer': 'status_parado',
    'status_em_andamento': 'status_criacao',
    'a fazer': 'status_parado',
    'em andamento': 'status_criacao',
  };

  // Atualizar status_id em demandas caso apontem para status legados
  const demandasNormalizadas = demandas.map((d) => {
    let sid = d.status_id;
    if (aliasMap[sid]) {
      sid = aliasMap[sid];
    }
    return { ...d, status_id: sid };
  });

  return {
    demandas: clone(demandasNormalizadas),
    statuses: clone(padraoStatuses),
    usuarios: usuarios.length > 0 ? clone(usuarios) : defaultUsuarios(),
    revendas: revendas.length > 0 ? clone(revendas) : defaultRevendas(),
    audit_logs: clone(audit_logs),
    configuracoes: clone(configuracoes),
    notificacoes: clone(notificacoes),
  };
}

let inMemoryState = null;

function readState() {
  if (inMemoryState) return inMemoryState;

  if (typeof window === 'undefined') {
    inMemoryState = initialState();
    return inMemoryState;
  }

  for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
    try {
      const raw = window.localStorage ? window.localStorage.getItem(key) : null;
      if (!raw) continue;
      const state = normalizeState(JSON.parse(raw));
      if (key !== STORAGE_KEY) writeState(state);
      inMemoryState = state;
      return state;
    } catch {
      // Storage access blocked or malformed JSON
    }
  }

  const state = initialState();
  inMemoryState = state;
  writeState(state);
  return state;
}

function writeState(state) {
  inMemoryState = state;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Limita logs de auditoria e notificações para evitar estouro de quota
      if (state.audit_logs && state.audit_logs.length > 200) {
        state.audit_logs = state.audit_logs.slice(-200);
      }
      if (state.notificacoes && state.notificacoes.length > 200) {
        state.notificacoes = state.notificacoes.slice(-200);
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch (err) {
    try {
      if (state.audit_logs) state.audit_logs = state.audit_logs.slice(-50);
      if (state.notificacoes) state.notificacoes = state.notificacoes.slice(-50);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('fluxo-clientes:avatars');
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch {
      console.warn('[localClient] Armazenamento local cheio, mantido em memória:', err);
    }
  }
}

function compareValues(left, right) {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), 'pt-BR', { numeric: true, sensitivity: 'base' });
}

function sortRecords(records, sortKey) {
  if (!sortKey) return [...records];
  const descending = String(sortKey).startsWith('-');
  const field = descending ? String(sortKey).slice(1) : String(sortKey);
  return [...records].sort((left, right) => {
    const result = compareValues(left[field], right[field]);
    return descending ? -result : result;
  });
}

const COLLECTION_MAP = {
  Demanda: 'demandas',
  Usuario: 'usuarios',
  Status: 'statuses',
  AuditLog: 'audit_logs',
  Configuracao: 'configuracoes',
  Revenda: 'revendas',
  Notificacao: 'notificacoes',
};

function createLocalStorageEntityApi(entityName) {
  const collectionKey = COLLECTION_MAP[entityName] || entityName.toLowerCase();
  const idPrefix = entityName.toLowerCase();

  return {
    async list(sortKey = 'nome', limit = 500, skip = 0) {
      const collection = readState()[collectionKey] || [];
      const sorted = sortRecords(collection, sortKey).slice(skip, skip + limit);
      if (entityName === 'Demanda') return clone(sorted.map(normalizeDemanda));
      if (entityName === 'Usuario') return clone(sorted.map(normalizeUsuario));
      return clone(sorted);
    },

    async create(data) {
      const state = readState();
      const timestamp = now();
      let record = { ...clone(data), id: data.id || createId(idPrefix), created_date: timestamp, updated_date: timestamp };
      if (entityName === 'Demanda') record = normalizeDemanda(record);
      if (entityName === 'Usuario') record = normalizeUsuario(record);

      state[collectionKey] = state[collectionKey] || [];
      state[collectionKey].push(record);
      writeState(state);
      return clone(record);
    },

    async update(id, patch) {
      const state = readState();
      state[collectionKey] = state[collectionKey] || [];
      const index = state[collectionKey].findIndex((item) => item.id === id);
      if (index < 0) {
        // Se for configuracao e não existir, cria
        if (entityName === 'Configuracao') {
          const record = { id, ...clone(patch), updated_at: now() };
          state[collectionKey].push(record);
          writeState(state);
          return clone(record);
        }
        throw new Error(`${entityName} não encontrado.`);
      }
      let updated = { ...state[collectionKey][index], ...clone(patch), id, updated_date: now() };
      if (entityName === 'Demanda') updated = normalizeDemanda(updated);
      if (entityName === 'Usuario') updated = normalizeUsuario(updated);

      state[collectionKey][index] = updated;
      writeState(state);
      return clone(updated);
    },

    async delete(id) {
      const state = readState();
      state[collectionKey] = (state[collectionKey] || []).filter((item) => item.id !== id);
      writeState(state);
      return { success: true };
    },

    async bulkUpdate(updates = []) {
      const state = readState();
      const patches = new Map(updates.map((patch) => [patch.id, patch]));
      state[collectionKey] = (state[collectionKey] || []).map((item) => {
        const patch = patches.get(item.id);
        if (!patch) return item;
        let res = { ...item, ...clone(patch), id: item.id, updated_date: now() };
        if (entityName === 'Demanda') res = normalizeDemanda(res);
        return res;
      });
      writeState(state);
      return clone((state[collectionKey] || []).filter((item) => patches.has(item.id)));
    },

    async updateMany(query = {}, command = {}) {
      const state = readState();
      const patch = command.$set ?? {};
      state[collectionKey] = (state[collectionKey] || []).map((item) => {
        const matches = Object.entries(query).every(([field, value]) => item[field] === value);
        return matches ? { ...item, ...clone(patch), id: item.id, updated_date: now() } : item;
      });
      writeState(state);
      return { success: true };
    },
  };
}

export const localClient = {
  isSupabase: isSupabaseConfigured,
  entities: {
    Demanda: isSupabaseConfigured
      ? createSupabaseEntityApi('Demanda')
      : createLocalStorageEntityApi('Demanda'),
    Status: isSupabaseConfigured
      ? createSupabaseEntityApi('Status')
      : createLocalStorageEntityApi('Status'),
    Usuario: isSupabaseConfigured
      ? createSupabaseEntityApi('Usuario')
      : createLocalStorageEntityApi('Usuario'),
    AuditLog: isSupabaseConfigured
      ? createSupabaseEntityApi('AuditLog')
      : createLocalStorageEntityApi('AuditLog'),
    Configuracao: isSupabaseConfigured
      ? createSupabaseEntityApi('Configuracao')
      : createLocalStorageEntityApi('Configuracao'),
    Revenda: isSupabaseConfigured
      ? createSupabaseEntityApi('Revenda')
      : createLocalStorageEntityApi('Revenda'),
    Notificacao: isSupabaseConfigured
      ? createSupabaseEntityApi('Notificacao')
      : createLocalStorageEntityApi('Notificacao'),
  },
};

export const client = localClient;
