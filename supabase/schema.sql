-- ==============================================================================
-- FLUXO DE CLIENTES - SCHEMA SUPABASE & MIGRATION (RBAC, FÁBRICA, AUDITORIA)
-- Execute este script no SQL Editor do seu projeto Supabase
-- Script 100% idempotente (não apaga nem corrompe dados existentes)
-- ==============================================================================

-- 1. Tabela de Status
CREATE TABLE IF NOT EXISTS public.statuses (
    id TEXT PRIMARY KEY DEFAULT ('status_' || substr(md5(random()::text), 1, 8)),
    nome TEXT NOT NULL,
    cor TEXT NOT NULL DEFAULT '#64748b',
    concluido BOOLEAN NOT NULL DEFAULT FALSE,
    ordem INTEGER NOT NULL DEFAULT 0,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de Demandas (Com suporte a Design e Fábrica independentes)
CREATE TABLE IF NOT EXISTS public.demandas (
    id TEXT PRIMARY KEY DEFAULT ('demanda_' || substr(md5(random()::text), 1, 8)),
    cliente TEXT NOT NULL,
    demanda TEXT,
    vendedor TEXT,
    revenda TEXT,
    designer TEXT,
    fase_arte TEXT,
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

-- Adicionar colunas novas em demandas de forma segura
ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS design_position INTEGER DEFAULT 0;
ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS factory_position INTEGER DEFAULT 0;
ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS acabamento TEXT DEFAULT 'Autocolante';
ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS factory_status TEXT DEFAULT 'aguardando';
ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS urgencia TEXT DEFAULT 'rotina';
ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS seller_id TEXT;
ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS designer_id TEXT;
ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS bitrix_id TEXT;
ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS tipo_demanda TEXT;
ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS complexidade TEXT DEFAULT 'normal';

-- Sincronizar design_position inicial com ordem existente caso esteja zerado
UPDATE public.demandas SET design_position = ordem WHERE design_position = 0 AND ordem > 0;
UPDATE public.demandas SET factory_position = ordem WHERE factory_position = 0;

-- 3. Tabela de Usuários / Perfis com RBAC
CREATE TABLE IF NOT EXISTS public.usuarios (
    id TEXT PRIMARY KEY DEFAULT ('usuario_' || substr(md5(random()::text), 1, 8)),
    auth_user_id UUID,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'seller', -- 'admin', 'seller', 'designer', 'printer'
    revenda TEXT,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'ativo', -- 'ativo', 'inativo'
    permissoes_extras JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_access_at TIMESTAMPTZ,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'seller';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '["seller"]'::jsonb;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS revenda TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS permissoes_extras JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS last_access_at TIMESTAMPTZ;

-- 4. Tabela de Auditoria (Audit Logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('audit_' || substr(md5(random()::text), 1, 8)),
    user_id TEXT,
    user_nome TEXT,
    user_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_value JSONB,
    new_value JSONB,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabela de Configurações Globais
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id TEXT PRIMARY KEY DEFAULT 'config_geral',
    seller_view_mode TEXT NOT NULL DEFAULT 'all', -- 'all' (todas) ou 'own' (somente do vendedor)
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.configuracoes (id, seller_view_mode)
VALUES ('config_geral', 'all')
ON CONFLICT (id) DO NOTHING;

-- 6. Tabela de Notificações
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id TEXT PRIMARY KEY DEFAULT ('notif_' || substr(md5(random()::text), 1, 8)),
    demanda_id TEXT,
    cliente_nome TEXT,
    actor_id TEXT,
    actor_name TEXT NOT NULL,
    actor_email TEXT,
    actor_avatar TEXT,
    tipo TEXT NOT NULL DEFAULT 'alteracao',
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    target_users JSONB NOT NULL DEFAULT '[]'::jsonb,
    target_roles JSONB NOT NULL DEFAULT '["admin"]'::jsonb,
    read_by JSONB NOT NULL DEFAULT '[]'::jsonb,
    link_path TEXT DEFAULT '/',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS updated_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 7. Tabela de Revendas Parceiras
CREATE TABLE IF NOT EXISTS public.revendas (
    id TEXT PRIMARY KEY DEFAULT ('revenda_' || substr(md5(random()::text), 1, 8)),
    nome TEXT NOT NULL,
    contato TEXT,
    telefone TEXT,
    email TEXT,
    logo_url TEXT,
    status TEXT NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Índices para performance
CREATE INDEX IF NOT EXISTS idx_demandas_status_id ON public.demandas(status_id);
CREATE INDEX IF NOT EXISTS idx_demandas_ordem ON public.demandas(ordem);
CREATE INDEX IF NOT EXISTS idx_demandas_design_position ON public.demandas(design_position);
CREATE INDEX IF NOT EXISTS idx_demandas_factory_position ON public.demandas(factory_position);
CREATE INDEX IF NOT EXISTS idx_demandas_acabamento ON public.demandas(acabamento);
CREATE INDEX IF NOT EXISTS idx_demandas_factory_status ON public.demandas(factory_status);
CREATE INDEX IF NOT EXISTS idx_demandas_bitrix_id ON public.demandas(bitrix_id);
CREATE INDEX IF NOT EXISTS idx_statuses_ordem ON public.statuses(ordem);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON public.usuarios(role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created_at ON public.notificacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revendas_nome ON public.revendas(nome);

-- 9. Habilitação de Row Level Security (RLS)
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revendas ENABLE ROW LEVEL SECURITY;

-- 10. Políticas de acesso
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'statuses' AND policyname = 'Permitir acesso completo a statuses') THEN
        CREATE POLICY "Permitir acesso completo a statuses" ON public.statuses FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'demandas' AND policyname = 'Permitir acesso completo a demandas') THEN
        CREATE POLICY "Permitir acesso completo a demandas" ON public.demandas FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usuarios' AND policyname = 'Permitir acesso completo a usuarios') THEN
        CREATE POLICY "Permitir acesso completo a usuarios" ON public.usuarios FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Permitir acesso completo a audit_logs') THEN
        CREATE POLICY "Permitir acesso completo a audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuracoes' AND policyname = 'Permitir acesso completo a configuracoes') THEN
        CREATE POLICY "Permitir acesso completo a configuracoes" ON public.configuracoes FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notificacoes' AND policyname = 'Permitir acesso completo a notificacoes') THEN
        CREATE POLICY "Permitir acesso completo a notificacoes" ON public.notificacoes FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'revendas' AND policyname = 'Permitir acesso completo a revendas') THEN
        CREATE POLICY "Permitir acesso completo a revendas" ON public.revendas FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 11. Inserção de Status padrão iniciais
INSERT INTO public.statuses (id, nome, cor, concluido, ordem)
VALUES
    ('status_parado', 'Parado', '#ef4444', FALSE, 0),
    ('status_criacao', 'Criação', '#f59e0b', FALSE, 1),
    ('status_revisao', 'Revisão', '#f97316', FALSE, 2),
    ('status_amostra', 'Amostra', '#06b6d4', FALSE, 3),
    ('status_aprovado', 'Aprovado', '#0284c7', FALSE, 4),
    ('status_impressao', 'Impressão', '#8b5cf6', FALSE, 5),
    ('status_concluido', 'Concluído', '#22c55e', TRUE, 6)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    cor = EXCLUDED.cor,
    concluido = EXCLUDED.concluido,
    ordem = EXCLUDED.ordem;

-- 12. Inserção de Usuários padrão iniciais
INSERT INTO public.usuarios (id, nome, email, role, status, permissoes_extras)
VALUES
    ('usuario_admin_alan', 'Alan Santos', 'alan.d.santos2021@gmail.com', 'designer', 'ativo', '{"users_manage": true, "settings_manage": true, "revendas_manage": true}'::jsonb),
    ('usuario_grace_helen', 'Grace Helen', 'grace@fluxodeclientes.com', 'consultant', 'ativo', '{"revendas_manage": true}'::jsonb)
ON CONFLICT (email) DO NOTHING;

