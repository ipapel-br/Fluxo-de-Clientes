import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

// Limpar /rest/v1/ ou barra final se tiver sido colada por engano
const supabaseUrl = rawUrl
  ? rawUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
  : '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('sua-url-aqui')
);

const customStorage = {
  getItem: (key) => {
    try {
      return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(key, value);
    } catch {}
  },
  removeItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) window.localStorage.removeItem(key);
    } catch {}
  },
};

function getSupabaseInstance() {
  if (!isSupabaseConfigured) return null;
  if (typeof window !== 'undefined') {
    if (!window.__SUPABASE_CLIENT__) {
      window.__SUPABASE_CLIENT__ = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storage: customStorage,
        },
      });
    }
    return window.__SUPABASE_CLIENT__;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: customStorage,
    },
  });
}

export const supabase = getSupabaseInstance();

const createId = (prefix) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

export function normalizeDemanda(item) {
  if (!item) return item;
  const etiqueta = item.etiqueta || (Array.isArray(item.etiquetas) && item.etiquetas[0]) || '';
  
  let factoryStatus = item.factory_status;
  if (!factoryStatus) {
    factoryStatus = item.status_id === 'status_impressao' ? 'aguardando' : 'pendente_design';
  }

  return {
    ...item,
    etiqueta,
    etiquetas: item.etiquetas || (etiqueta ? [etiqueta] : []),
    designer: item.designer || '',
    fase_arte: item.fase_arte || '',
    vendedor: item.vendedor || '',
    revenda: item.revenda || '',
    acabamento: item.acabamento || 'Autocolante',
    factory_status: factoryStatus,
    urgencia: item.urgencia || 'rotina',
    tipo_demanda: item.tipo_demanda || '',
    complexidade: item.complexidade || 'normal',
    design_position: item.design_position !== undefined ? item.design_position : (item.ordem || 0),
    factory_position: item.factory_position !== undefined ? item.factory_position : (item.ordem || 0),
    historico: Array.isArray(item.historico) ? item.historico : [],
  };
}

export function normalizeUsuario(item) {
  if (!item) return item;
  return {
    ...item,
    role: item.role || 'seller',
    revenda: item.revenda || '',
    status: item.status || 'ativo',
    permissoes_extras: item.permissoes_extras || {},
  };
}

const fallbackStorage = {
  read(table) {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(`fluxo-fallback:${table}`) : null;
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  write(table, items) {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`fluxo-fallback:${table}`, JSON.stringify(items));
      }
    } catch {}
  },
  list(table) {
    return this.read(table);
  },
  create(table, record) {
    const items = this.read(table);
    items.push(record);
    this.write(table, items);
    return record;
  },
  update(table, id, patch) {
    const items = this.read(table);
    const idx = items.findIndex((i) => i.id === id);
    if (idx >= 0) {
      items[idx] = { ...items[idx], ...patch };
      this.write(table, items);
      return items[idx];
    }
    return patch;
  },
  delete(table, id) {
    const items = this.read(table);
    const filtered = items.filter((i) => i.id !== id);
    this.write(table, filtered);
    return { success: true };
  },
  bulkUpdate(table, updates = []) {
    const items = this.read(table);
    const patches = new Map(updates.map((p) => [p.id, p]));
    const updated = items.map((item) => {
      const patch = patches.get(item.id);
      return patch ? { ...item, ...patch, updated_date: new Date().toISOString() } : item;
    });
    this.write(table, updated);
    return updated.filter((item) => patches.has(item.id));
  },
};

const TABLE_MAP = {
  Demanda: 'demandas',
  Usuario: 'usuarios',
  Status: 'statuses',
  AuditLog: 'audit_logs',
  Configuracao: 'configuracoes',
  Revenda: 'revendas',
  Notificacao: 'notificacoes',
};

export function createSupabaseEntityApi(entityName) {
  const table = TABLE_MAP[entityName] || entityName.toLowerCase();
  const idPrefix = entityName.toLowerCase();

  return {
    async list(sortKey = 'ordem', limit = 500, skip = 0) {
      if (!supabase) {
        const rows = fallbackStorage.list(table);
        if (entityName === 'Demanda') return rows.map(normalizeDemanda);
        if (entityName === 'Usuario') return rows.map(normalizeUsuario);
        return rows;
      }

      const descending = String(sortKey).startsWith('-');
      const field = descending ? String(sortKey).slice(1) : String(sortKey);

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(field, { ascending: !descending })
        .range(skip, skip + limit - 1);

      if (error) {
        if (
          error.code === 'PGRST205' ||
          error.code === '57014' ||
          error.message?.includes('schema cache') ||
          error.message?.includes('not found') ||
          error.message?.includes('timeout') ||
          error.message?.includes('canceling statement')
        ) {
          console.warn(`[Supabase] Tabela '${table}' inacessível ou tempo limite atingido (${error.message || error.code}). Usando armazenamento local temporário.`);
          const rows = fallbackStorage.list(table);
          if (entityName === 'Demanda') return rows.map(normalizeDemanda);
          if (entityName === 'Usuario') return rows.map(normalizeUsuario);
          return rows;
        }
        console.error(`[Supabase] Erro ao listar ${table}:`, error);
        throw error;
      }
      const rows = data || [];
      if (entityName === 'Demanda') return rows.map(normalizeDemanda);
      if (entityName === 'Usuario') return rows.map(normalizeUsuario);
      return rows;
    },

    async create(record) {
      if (!supabase) return fallbackStorage.create(table, record);
      const now = new Date().toISOString();
      const currentPayload = {
        ...record,
        id: record.id || createId(idPrefix),
      };

      if (entityName === 'Notificacao' || entityName === 'Revenda' || entityName === 'AuditLog' || entityName === 'Configuracao') {
        currentPayload.created_at = record.created_at || now;
      } else {
        currentPayload.created_date = record.created_date || now;
        currentPayload.updated_date = now;
      }

      if (entityName === 'Demanda') {
        if (currentPayload.etiqueta !== undefined) {
          currentPayload.etiquetas = currentPayload.etiqueta ? [currentPayload.etiqueta] : [];
          delete currentPayload.etiqueta;
        }
      }

      for (let attempt = 0; attempt < 4; attempt++) {
        const { data, error } = await supabase
          .from(table)
          .insert(currentPayload)
          .select()
          .single();

        if (!error) {
          const res = { ...currentPayload, ...data, ...record };
          if (entityName === 'Demanda') return normalizeDemanda(res);
          if (entityName === 'Usuario') return normalizeUsuario(res);
          return res;
        }

        const match = error.message?.match(/Could not find the '([^']+)' column/);
        if (match && match[1]) {
          const missingCol = match[1];
          console.warn(
            `[Supabase] Coluna '${missingCol}' não existe na tabela '${table}'. Recomenda-se rodar o script SQL de atualização.`
          );
          delete currentPayload[missingCol];
          continue;
        }

        if (
          error.code === 'PGRST205' ||
          error.code === '57014' ||
          error.message?.toLowerCase().includes("could not find the table") ||
          error.message?.includes('timeout')
        ) {
          console.warn(`[Supabase] Tabela '${table}' ainda não foi criada no banco remoto ou tempo limite atingido. Salvando no armazenamento local temporário.`);
          return fallbackStorage.create(table, currentPayload);
        }

        console.error(`[Supabase] Erro ao criar em ${table}:`, error);
        throw error;
      }
    },

    async update(id, patch) {
      if (!supabase) return fallbackStorage.update(table, id, patch);
      const now = new Date().toISOString();
      const currentPayload = {
        ...patch,
        updated_date: now,
      };

      if (entityName === 'Demanda') {
        if (currentPayload.etiqueta !== undefined) {
          currentPayload.etiquetas = currentPayload.etiqueta ? [currentPayload.etiqueta] : [];
          delete currentPayload.etiqueta;
        }
      }

      for (let attempt = 0; attempt < 4; attempt++) {
        const { data, error } = await supabase
          .from(table)
          .update(currentPayload)
          .eq('id', id)
          .select()
          .single();

        if (!error) {
          const res = { ...currentPayload, ...data, ...patch };
          if (entityName === 'Demanda') return normalizeDemanda(res);
          if (entityName === 'Usuario') return normalizeUsuario(res);
          return res;
        }

        const match = error.message?.match(/Could not find the '([^']+)' column/);
        if (match && match[1]) {
          const missingCol = match[1];
          console.warn(
            `[Supabase] Coluna '${missingCol}' não existe na tabela '${table}'. Recomenda-se rodar o script SQL de atualização.`
          );
          delete currentPayload[missingCol];
          continue;
        }

        if (
          error.code === 'PGRST205' ||
          error.code === '57014' ||
          error.message?.toLowerCase().includes("could not find the table") ||
          error.message?.includes('timeout')
        ) {
          console.warn(`[Supabase] Tabela '${table}' ainda não foi criada no banco remoto ou tempo limite atingido. Atualizando no armazenamento local temporário.`);
          return fallbackStorage.update(table, id, currentPayload);
        }

        console.error(`[Supabase] Erro ao atualizar ${table}:`, error);
        throw error;
      }
    },

    async delete(id) {
      if (!supabase) return fallbackStorage.delete(table, id);
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', id);

        if (error) {
          if (error.code === 'PGRST205' || error.message?.toLowerCase().includes("could not find the table")) {
            console.warn(`[Supabase] Tabela '${table}' não encontrada no banco. Removendo do armazenamento local temporário.`);
            return fallbackStorage.delete(table, id);
          }
          console.error(`[Supabase] Erro ao deletar em ${table}:`, error);
          return fallbackStorage.delete(table, id);
        }
        return { success: true };
      } catch (err) {
        console.error(`[Supabase] Exceção ao deletar em ${table}:`, err);
        return fallbackStorage.delete(table, id);
      }
    },

    async bulkUpdate(updates = []) {
      if (!supabase || updates.length === 0) {
        return fallbackStorage.bulkUpdate ? fallbackStorage.bulkUpdate(table, updates) : [];
      }
      const now = new Date().toISOString();
      
      const promises = updates.map(async (item) => {
        const currentPayload = { ...item, updated_date: now };
        for (let attempt = 0; attempt < 4; attempt++) {
          const res = await supabase
            .from(table)
            .update(currentPayload)
            .eq('id', item.id)
            .select();

          if (!res.error) return res;

          const match = res.error.message?.match(/Could not find the '([^']+)' column/);
          if (match && match[1]) {
            delete currentPayload[match[1]];
            continue;
          }

          if (res.error.code === 'PGRST205' || res.error.message?.toLowerCase().includes("could not find the table")) {
            fallbackStorage.update(table, item.id, currentPayload);
            return { data: [currentPayload], error: null };
          }

          return res;
        }
      });

      const results = await Promise.all(promises);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        console.error(`[Supabase] Erro em bulkUpdate ${table}:`, errors);
      }
      return results.flatMap((r) => r.data || []);
    },

    async updateMany(query = {}, command = {}) {
      if (!supabase) throw new Error('Supabase não configurado');
      const patch = command.$set ?? {};
      const now = new Date().toISOString();

      let req = supabase.from(table).update({ ...patch, updated_date: now });
      for (const [key, value] of Object.entries(query)) {
        req = req.eq(key, value);
      }

      const { error } = await req;
      if (error) {
        console.error(`[Supabase] Erro em updateMany ${table}:`, error);
        throw error;
      }
      return { success: true };
    },
  };
}
