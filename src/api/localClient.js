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
    { id: 'status_a_fazer', nome: 'A fazer', cor: '#64748b', concluido: false, ordem: 0, created_date: timestamp, updated_date: timestamp },
    { id: 'status_em_andamento', nome: 'Em andamento', cor: '#f59e0b', concluido: false, ordem: 1, created_date: timestamp, updated_date: timestamp },
    { id: 'status_concluido', nome: 'Concluído', cor: '#16a34a', concluido: true, ordem: 2, created_date: timestamp, updated_date: timestamp },
  ];
};

const defaultUsuarios = () => {
  const timestamp = now();
  return [
    {
      id: 'usuario_admin_alan',
      nome: 'Alan Santos',
      email: 'alan.d.santos2021@gmail.com',
      role: 'admin',
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
      role: 'admin',
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

const initialState = () => ({
  demandas: [],
  statuses: defaultStatuses(),
  usuarios: defaultUsuarios(),
  audit_logs: [],
  configuracoes: defaultConfiguracao(),
});

function normalizeState(value) {
  const demandas = Array.isArray(value?.demandas)
    ? value.demandas.map(normalizeDemanda)
    : Array.isArray(value?.data?.Demanda)
      ? value.data.Demanda.map(normalizeDemanda)
      : [];
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

  // Garantir que alan.d.santos2021@gmail.com esteja presente e com perfil admin
  const alanEmail = 'alan.d.santos2021@gmail.com';
  const alanIndex = usuarios.findIndex(
    (u) => (u.email || '').toLowerCase().trim() === alanEmail
  );
  if (alanIndex >= 0) {
    usuarios[alanIndex] = {
      ...usuarios[alanIndex],
      role: 'admin',
      status: 'ativo',
    };
  } else {
    usuarios.unshift({
      id: 'usuario_admin_alan',
      nome: 'Alan Santos',
      email: alanEmail,
      role: 'admin',
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

  return {
    demandas: clone(demandas),
    statuses: statuses.length > 0 ? clone(statuses) : defaultStatuses(),
    usuarios: usuarios.length > 0 ? clone(usuarios) : defaultUsuarios(),
    audit_logs: clone(audit_logs),
    configuracoes: clone(configuracoes),
  };
}

function readState() {
  if (typeof window === 'undefined') return initialState();

  for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const state = normalizeState(JSON.parse(raw));
      if (key !== STORAGE_KEY) writeState(state);
      return state;
    } catch {
      // Ignore malformed values
    }
  }

  const state = initialState();
  writeState(state);
  return state;
}

function writeState(state) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  },
};

export const client = localClient;
