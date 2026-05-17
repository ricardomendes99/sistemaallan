-- RDO Digital — Modular Service
-- Execute este SQL no Supabase: SQL Editor > New query

-- Extensão UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────
-- TABELAS
-- ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS usuarios (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo    TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  senha_hash       TEXT NOT NULL,
  perfil           TEXT NOT NULL DEFAULT 'USUARIO',  -- 'ADMIN' | 'USUARIO'
  funcao_principal TEXT,
  ativo            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS obras (
  id_obra          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_obra        TEXT NOT NULL,
  codigo_of        TEXT NOT NULL,
  cliente_nome     TEXT NOT NULL,
  cliente_contato  TEXT,
  endereco_local   TEXT,
  status_obra      TEXT NOT NULL DEFAULT 'Ativa',  -- 'Ativa' | 'Pausada' | 'Concluída'
  data_cadastro    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rdos (
  id_rdo                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_obra                    UUID REFERENCES obras(id_obra) ON DELETE SET NULL,
  id_usuario_criador         UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  data_apontamento           DATE NOT NULL,
  dia_semana                 TEXT,
  status_documento           TEXT NOT NULL DEFAULT 'Rascunho',
  horario_inicio             TEXT,
  horario_almoco             TEXT,
  horario_termino            TEXT,
  condicao_tempo_manha       TEXT,
  condicao_tempo_tarde       TEXT,
  status_atividade           TEXT,
  atividade                  TEXT,
  executantes                TEXT,
  efetivo                    JSONB DEFAULT '{}'::JSONB,
  observacoes_desvios        TEXT,
  fotos                      JSONB DEFAULT '[]'::JSONB,
  assinatura_responsavel     TEXT,
  assinatura_cliente_base64  TEXT,
  assinatura_nome_confirmacao TEXT,
  cliente_token              TEXT,
  aprovacao_cliente          TEXT,
  nome_aprovador_cliente     TEXT,
  comentario_cliente         TEXT,
  data_aprovacao_cliente     TIMESTAMPTZ,
  data_fechamento            TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rdo_linhas (
  id_linha            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_rdo              UUID NOT NULL REFERENCES rdos(id_rdo) ON DELETE CASCADE,
  horario_ponto       TEXT NOT NULL,
  referencia_modulo   TEXT,
  descricao_detalhada TEXT,
  status_atividade    TEXT,
  UNIQUE(id_rdo, horario_ponto)
);

CREATE TABLE IF NOT EXISTS obra_usuarios (
  id_obra    UUID NOT NULL REFERENCES obras(id_obra) ON DELETE CASCADE,
  id_usuario UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  PRIMARY KEY (id_obra, id_usuario)
);

-- ─────────────────────────────────────
-- ROW LEVEL SECURITY
-- (app gerencia a própria autenticação)
-- ─────────────────────────────────────

ALTER TABLE usuarios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rdos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rdo_linhas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_usuarios ENABLE ROW LEVEL SECURITY;

-- Permitir acesso total via anon key (app controla auth internamente)
CREATE POLICY "anon_all" ON usuarios      FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "anon_all" ON obras         FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "anon_all" ON rdos          FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "anon_all" ON rdo_linhas    FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "anon_all" ON obra_usuarios FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);

-- ─────────────────────────────────────
-- GRANTS — papel anon precisa de permissão
-- explícita em nível de tabela além das políticas RLS
-- ─────────────────────────────────────

GRANT USAGE ON SCHEMA public TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE usuarios      TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE obras         TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE rdos          TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE rdo_linhas    TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE obra_usuarios TO anon;

-- ─────────────────────────────────────
-- SEED: usuário administrador padrão
-- senha: admin123
-- ─────────────────────────────────────

INSERT INTO usuarios (nome_completo, email, senha_hash, perfil, funcao_principal, ativo)
VALUES ('Administrador', 'admin@modular.com', 'YWRtaW4xMjM=', 'ADMIN', 'Encarregado', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ─────────────────────────────────────
-- FUNÇÃO auxiliar para backup/reset
-- ─────────────────────────────────────

CREATE OR REPLACE FUNCTION truncate_all_rdo_data()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  TRUNCATE obra_usuarios, rdo_linhas, rdos, obras, usuarios RESTART IDENTITY CASCADE;
END;
$$;

GRANT EXECUTE ON FUNCTION truncate_all_rdo_data() TO anon;
