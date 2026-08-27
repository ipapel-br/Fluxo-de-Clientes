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

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const createId = (prefix) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

export function normalizeDemanda(item) {
  if (!item) return item;
  const etiqueta = item.etiqueta || (Array.isArray(item.etiquetas) && item.etiquetas[0]) || '';
  return {
    ...item,
    etiqueta,
    etiquetas: item.etiquetas || (etiqueta ? [etiqueta] : []),
    designer: item.designer || '',
    fase_arte: item.fase_arte || '',
    vendedor: item.vendedor || '',
    revenda: item.revenda || '',
    acabamento: item.acabamento || 'Autocolante',
    factory_status: item.factory_status || 'aguardando',
    urgencia: item.urgencia || 'rotina',
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
};

const TABLE_MAP = {
  Demanda: 'demandas',
  Usuario: 'usuarios',
  Status: 'statuses',
  AuditLog: 'audit_logs',
  Configuracao: 'configuracoes',
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
        if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('not found')) {
          console.warn(`[Supabase] Tabela '${table}' não encontrada no banco. Usando armazenamento local temporário.`);
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
        created_date: record.created_date || now,
        updated_date: now,
      };

      if (entityName === 'Demanda' && currentPayload.etiqueta !== undefined) {
        currentPayload.etiquetas = currentPayload.etiqueta ? [currentPayload.etiqueta] : [];
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

        if (error.code === 'PGRST205' || error.message?.toLowerCase().includes("could not find the table")) {
          console.warn(`[Supabase] Tabela '${table}' ainda não foi criada no banco remoto. Salvando no armazenamento local temporário.`);
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

      if (entityName === 'Demanda' && currentPayload.etiqueta !== undefined) {
        currentPayload.etiquetas = currentPayload.etiqueta ? [currentPayload.etiqueta] : [];
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

        if (error.code === 'PGRST205' || error.message?.toLowerCase().includes("could not find the table")) {
          console.warn(`[Supabase] Tabela '${table}' ainda não foi criada no banco remoto. Atualizando no armazenamento local temporário.`);
          return fallbackStorage.update(table, id, currentPayload);
        }

        console.error(`[Supabase] Erro ao atualizar ${table}:`, error);
        throw error;
      }
    },

    async delete(id) {
      if (!supabase) throw new Error('Supabase não configurado');
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`[Supabase] Erro ao deletar em ${table}:`, error);
        throw error;
      }
      return { success: true };
    },

    async bulkUpdate(updates = []) {
      if (!supabase || updates.length === 0) return [];
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
