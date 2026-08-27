-- ==============================================================================
-- FLUXO DE CLIENTES - SCHEMA SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==============================================================================

-- 1. Criação da tabela de Status
CREATE TABLE IF NOT EXISTS public.statuses (
    id TEXT PRIMARY KEY DEFAULT ('status_' || substr(md5(random()::text), 1, 8)),
    nome TEXT NOT NULL,
    cor TEXT NOT NULL DEFAULT '#64748b',
    concluido BOOLEAN NOT NULL DEFAULT FALSE,
    ordem INTEGER NOT NULL DEFAULT 0,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Criação da tabela de Demandas
CREATE TABLE IF NOT EXISTS public.demandas (
    id TEXT PRIMARY KEY DEFAULT ('demanda_' || substr(md5(random()::text), 1, 8)),
    cliente TEXT NOT NULL,
    demanda TEXT,
    vendedor TEXT,
    revenda TEXT,
    prazo TEXT,
    data_especifica TEXT,
    etiquetas JSONB NOT NULL DEFAULT '[]'::jsonb,
    observacao TEXT,
    status_id TEXT REFERENCES public.statuses(id) ON DELETE SET NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    historico JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Índices para ganho de performance
CREATE INDEX IF NOT EXISTS idx_demandas_status_id ON public.demandas(status_id);
CREATE INDEX IF NOT EXISTS idx_demandas_ordem ON public.demandas(ordem);
CREATE INDEX IF NOT EXISTS idx_statuses_ordem ON public.statuses(ordem);

-- 4. Habilitação de Row Level Security (RLS)
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de acesso (Permitir leitura e escrita para chaves anon / autenticadas)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'statuses' AND policyname = 'Permitir acesso completo a statuses'
    ) THEN
        CREATE POLICY "Permitir acesso completo a statuses" ON public.statuses FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'demandas' AND policyname = 'Permitir acesso completo a demandas'
    ) THEN
        CREATE POLICY "Permitir acesso completo a demandas" ON public.demandas FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 6. Inserção dos Status padrão iniciais (caso a tabela esteja vazia)
INSERT INTO public.statuses (id, nome, cor, concluido, ordem)
VALUES
    ('status_a_fazer', 'A fazer', '#64748b', FALSE, 0),
    ('status_em_andamento', 'Em andamento', '#f59e0b', FALSE, 1),
    ('status_concluido', 'Concluído', '#16a34a', TRUE, 2)
ON CONFLICT (id) DO NOTHING;
