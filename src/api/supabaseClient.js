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

export function createSupabaseEntityApi(entityName) {
  const table = entityName === 'Demanda' ? 'demandas' : 'statuses';
  const idPrefix = entityName.toLowerCase();

  return {
    async list(sortKey = 'ordem', limit = 500, skip = 0) {
      if (!supabase) return [];
      const descending = String(sortKey).startsWith('-');
      const field = descending ? String(sortKey).slice(1) : String(sortKey);

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(field, { ascending: !descending })
        .range(skip, skip + limit - 1);

      if (error) {
        console.error(`[Supabase] Erro ao listar ${table}:`, error);
        throw error;
      }
      return data || [];
    },

    async create(record) {
      if (!supabase) throw new Error('Supabase não configurado');
      const now = new Date().toISOString();
      const payload = {
        ...record,
        id: record.id || createId(idPrefix),
        created_date: record.created_date || now,
        updated_date: now,
      };

      const { data, error } = await supabase
        .from(table)
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error(`[Supabase] Erro ao criar ${table}:`, error);
        throw error;
      }
      return data;
    },

    async update(id, patch) {
      if (!supabase) throw new Error('Supabase não configurado');
      const now = new Date().toISOString();
      const payload = {
        ...patch,
        updated_date: now,
      };

      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`[Supabase] Erro ao atualizar ${table}:`, error);
        throw error;
      }
      return data;
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
      
      const promises = updates.map((item) =>
        supabase
          .from(table)
          .update({ ...item, updated_date: now })
          .eq('id', item.id)
          .select()
      );

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
