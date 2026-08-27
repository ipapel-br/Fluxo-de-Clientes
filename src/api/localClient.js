import { isSupabaseConfigured, createSupabaseEntityApi } from './supabaseClient';

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

const initialState = () => ({ demandas: [], statuses: defaultStatuses() });

function normalizeState(value) {
  const demandas = Array.isArray(value?.demandas)
    ? value.demandas
    : Array.isArray(value?.data?.Demanda)
      ? value.data.Demanda
      : [];
  const statuses = Array.isArray(value?.statuses)
    ? value.statuses
    : Array.isArray(value?.data?.Status)
      ? value.data.Status
      : [];

  return {
    demandas: clone(demandas),
    statuses: statuses.length > 0 ? clone(statuses) : defaultStatuses(),
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
      // Ignore malformed values and try the next compatible storage key.
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

function createLocalStorageEntityApi(entityName) {
  const collectionKey = entityName === 'Demanda' ? 'demandas' : 'statuses';
  const idPrefix = entityName.toLowerCase();

  return {
    async list(sortKey = 'ordem', limit = 500, skip = 0) {
      const collection = readState()[collectionKey];
      return clone(sortRecords(collection, sortKey).slice(skip, skip + limit));
    },

    async create(data) {
      const state = readState();
      const timestamp = now();
      const record = { ...clone(data), id: data.id || createId(idPrefix), created_date: timestamp, updated_date: timestamp };
      state[collectionKey].push(record);
      writeState(state);
      return clone(record);
    },

    async update(id, patch) {
      const state = readState();
      const index = state[collectionKey].findIndex((item) => item.id === id);
      if (index < 0) throw new Error(`${entityName} não encontrado.`);
      const updated = { ...state[collectionKey][index], ...clone(patch), id, updated_date: now() };
      state[collectionKey][index] = updated;
      writeState(state);
      return clone(updated);
    },

    async delete(id) {
      const state = readState();
      state[collectionKey] = state[collectionKey].filter((item) => item.id !== id);
      writeState(state);
      return { success: true };
    },

    async bulkUpdate(updates = []) {
      const state = readState();
      const patches = new Map(updates.map((patch) => [patch.id, patch]));
      state[collectionKey] = state[collectionKey].map((item) => {
        const patch = patches.get(item.id);
        return patch ? { ...item, ...clone(patch), id: item.id, updated_date: now() } : item;
      });
      writeState(state);
      return clone(state[collectionKey].filter((item) => patches.has(item.id)));
    },

    async updateMany(query = {}, command = {}) {
      const state = readState();
      const patch = command.$set ?? {};
      state[collectionKey] = state[collectionKey].map((item) => {
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
  },
};

export const client = localClient;
