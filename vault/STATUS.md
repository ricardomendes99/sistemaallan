# STATUS — RDO Digital

**Data:** 2026-05-16  
**Última atualização:** 2026-05-30 — integração Assinafy corrigida end-to-end (proxy local, trava de envio, download do PDF assinado via artifacts.certificated)  
**Fase:** MVP v2 — completo e pronto para uso local

## Arquivos do sistema

```
index.html                        ← Login (admin@modular.com / admin123)

assets/css/tailwind.css           ← FONTE do CSS (Tailwind v3 + @layer components)
assets/css/output.css             ← CSS COMPILADO carregado por todas as páginas
                                     build: npm run build:css  (watch: npm run watch:css)
                                     ⚠️ editar tailwind.css e recompilar — NÃO editar output.css à mão

assets/js/config.js               ← URL + anon key do Supabase
assets/js/idb.js                  ← Wrapper IndexedDB (cache offline + fila/outbox)
assets/js/db.js                   ← Dados (offline-first): cache + outbox + sync
assets/js/auth.js
assets/js/utils.js                ← Regras RN01–RN05
assets/js/ui.js                   ← Toast, UIConfirm, dark mode, sidebar, a11y + badge de sync
assets/js/assinafy.js             ← Integração de assinatura digital (Assinafy)
assets/js/pdf-gen.js              ← PDF replicando RDO-001 Rev.03
assets/js/vendor/supabase.min.js  ← Lib Supabase AUTO-HOSPEDADA (offline; antes era CDN)
assets/js/vendor/jspdf.umd.min.js ← jsPDF auto-hospedado (assinatura offline)
sw.js                             ← Service Worker (PWA): cacheia o app shell p/ abrir offline

admin/
  dashboard.html                  ← Métricas + alertas (RN04) + nav completa
  obras.html                      ← CRUD obras + vinculação de equipe por obra
  usuarios.html                   ← CRUD usuários RBAC
  rdo-view.html                   ← RDO detail + gerar link cliente + comentário fiscal
  rdo-print.html                  ← Visualização HTML fiel ao template (imprimir/PDF browser)
  historico.html                  ← Histórico com filtros
  relatorio-executivo.html        ← Relatório CEO: KPIs, resumo por obra, desvios, ressalvas

campo/
  home.html                       ← Obras filtradas por vinculação do usuário
  rdo.html                        ← Formulário hora-a-hora + auto-save
  assinatura.html                 ← Pad touch + finalização + gera PDF

cliente/
  ver.html                        ← Portal de aprovação (link com token, sem login)
```

## Fluxo completo

1. **Admin** cadastra obra em `obras.html`
2. **Admin** clica "👥 Equipe" e vincula usuários à obra
3. **Usuário** loga → vê apenas suas obras → preenche RDO hora a hora → assina
4. **Admin** em `rdo-view.html` clica "Gerar Link para Cliente" → copia URL → envia ao cliente
5. **Cliente** acessa a URL, lê o RDO, escreve comentário (opcional), clica "Confirmar Aprovação"
6. **Admin** vê aprovação + comentário do cliente em `rdo-view.html`
7. **CEO/reunião** acessa `relatorio-executivo.html` → seleciona data → imprime ou visualiza

## Regras implementadas
- RN01–RN05 todas ativas
- Vínculo usuário↔obra controlado pelo admin
- Token de acesso cliente (sem login, link com token único)
- Relatório executivo com KPIs, desvios, ressalvas de clientes

## Passe de acessibilidade — 2026-05-29 (Web Interface Guidelines)

Revisão das 13 páginas + CSS contra as Vercel Web Interface Guidelines.

**Globais**
- `assets/css/main.css` **removido** (era arquivo morto; nenhuma página o carregava).
- `tailwind.css`: `transition-all`→`transition`; `.btn` com `touch-action:manipulation`; `.modal-box` com `overscroll-contain`; `.tbl`/`.metric-value` com `tabular-nums`; `color-scheme` no `<html>`.
- `ui.js`: helpers globais via `MutationObserver` →
  1. esconde SVGs decorativos (`aria-hidden`);
  2. gerenciador de modal (`role=dialog`, trap de foco, Esc, retorno de foco);
  3. toast com `aria-live`.
- `<meta theme-color>` em todas as páginas; barras fixas do campo com `env(safe-area-inset-bottom)`.
- Skip link "Pular para o conteúdo" nas páginas admin (`<main id="conteudo">`).

**Padrões aplicados**
- `<label for>` em todos os formulários; `autocomplete`/`name`/`inputmode` nos inputs.
- `<div onclick>` de navegação/disclosure → `<a>`/`<button>` (teclado, `aria-expanded`).
- `aria-label` em botões só-ícone; foco visível restaurado (`.link-box`).

**Pendências opcionais (não-bugs):** virtualização da lista do histórico (>50), deep-link de abas/filtros na URL.

## Modo offline (PWA) — 2026-05-29 — fluxo de campo

Implementado para o **uso de campo** (login + listar obras + preencher RDO hora-a-hora + fotos + assinatura) funcionar **sem internet** e sincronizar ao reconectar.

**Como funciona**
- `idb.js` (IndexedDB): store `kv` guarda o snapshot do cache; store `outbox` guarda a fila de escritas.
- `db.js` é **offline-first quando `idb.js` está carregado**: `init()` carrega o snapshot local (abre offline na hora), depois tenta sincronizar a fila e baixar dados frescos. Toda escrita atualiza o cache, salva o snapshot, **enfileira** a operação e tenta enviar. Sem rede, fica na fila e sobe no `online`/retry 30s/próximo `init`. IDs são `uuid()` no cliente → inserts offline sem conflito; ordem preservada pela fila.
- **Retrocompatível:** páginas que NÃO carregam `idb.js` (admin, cliente) usam `db.js` no modo online clássico (sem persistência/fila).
- `sw.js` (Service Worker) cacheia o app shell; Supabase (lib e API) e jsPDF foram **auto-hospedados** em `assets/js/vendor/`.
- `ui.js` mostra um **badge** "Offline · N p/ enviar" / "Sincronizando…" (some quando tudo sincronizado).

**Páginas com offline:** `index.html`, `campo/home.html`, `campo/rdo.html`, `campo/assinatura.html` (carregam `idb.js`, `db.js?v=4`, vendor e registram o SW).

**Requisitos / limites**
- **1ª abertura precisa de internet** (cacheia o app e baixa usuários p/ login offline).
- Em produção, **servir por HTTPS** (Service Worker + `crypto.randomUUID` exigem contexto seguro; `localhost` conta).
- **Anexos/plantas (Storage)** continuam exigindo internet (tela de admin).
- Conflitos: "última escrita vence" via `updated_at`.

**Como testar offline (Chrome):** abrir 1x online → DevTools ▸ Network ▸ **Offline** → recarregar (app abre) → preencher e assinar um RDO (badge "Offline") → voltar online → badge "Sincronizando…" some e o RDO aparece no admin/Supabase. Validado por harness de lógica (mock Supabase+IndexedDB): preencher offline → reabrir offline (dados persistem) → reconectar → sobe na ordem correta.

## Banco — colunas pendentes na tabela `rdos` (rodar no SQL editor do Supabase)

Verificado em 2026-05-29 contra o Supabase real: faltam 3 colunas em `rdos` que o código grava (o anon key não roda DDL, então rodar manualmente):

```sql
alter table public.rdos
  add column if not exists comentarios_fiscalizacao   text,  -- comentário de fiscalização (admin) — NÃO salvava sem isso
  add column if not exists assinatura_modular_base64   text,  -- assinatura do Responsável Modular (gerente)
  add column if not exists assinatura_modular_nome      text;
```

> ⚠️ Sem essas colunas, a finalização/edição que as inclui falha no sync (em modo offline o item da fila é descartado → perda). O Supabase é **compartilhado** com outros projetos (há tabelas de outros sistemas), mas as 6 tabelas do RDO são isoladas.

## Assinaturas do RDO (modelo — 2026-05-29, atualizado 2026-05-30)

Três papéis distintos:
- **Responsável pela Obra** (executor: montador/soldador/eletricista) → preenche e assina **no campo** (`campo/assinatura.html`), pad obrigatório → `assinatura_cliente_base64` + `assinatura_nome_confirmacao`.
- **Responsável Modular** (gerente) → **no painel admin** (`rdo-view`): valida o RDO e assina (pad opcional + **nome obrigatório**) → `assinatura_modular_base64` + `assinatura_modular_nome`. NÃO via API.
- **Cliente** → assinatura digital **via API (Assinafy)**, no admin, **depois** que o gerente valida/assina.

Fluxo: **campo preenche+assina → gerente valida+assina no admin → envia ao cliente (Assinafy)**. O botão "Enviar para Assinatura Digital" fica **bloqueado** até **3 condições simultâneas**: **(1)** ≥1 signatário (e-mail do cliente) na obra, **(2)** campo assinou (`assinatura_cliente_base64`), **(3)** gerente assinou (`assinatura_modular_nome`). Trava na UI (aviso visual) + em `enviarAssinatura()`. Signatários cadastrados no card "Assinatura Digital" do `rdo-view` ou em Obras → Signatários.

Exibidas em `rdo-view.html`, `rdo-print.html` e no **PDF (`pdf-gen.js`)** — esquerda = Responsável Modular (gerente), direita = Responsável pela Obra.

### Integração Assinafy — estado técnico (2026-05-30)

**Configuração (.env):**
```
ASSINAFY_API_KEY=<chave>
ASSINAFY_ACCOUNT_ID=<workspace_id>   ← é o Workspace ID (não Account ID)
```

**Proxy local (`_serve.js`):**  
O servidor de dev expõe `/assinafy-proxy/*` que injeta `Authorization: Bearer <API_KEY>` e encaminha para `https://api.assinafy.com.br/v1/*`. Em produção o nginx faz o mesmo. `config.js` é gerado dinamicamente do `.env` (expõe `window.ASSINAFY_ACCOUNT_ID`).

**Endpoints usados (paths sem `/assinafy-proxy`):**
| Ação | Método | Path |
|------|--------|------|
| Upload PDF | POST | `/workspaces/{id}/documents` |
| Criar signatário | POST | `/workspaces/{id}/signers` |
| Listar signatários (reuso) | GET | `/workspaces/{id}/signers` |
| Criar assignment | POST | `/documents/{id}/assignments` |
| Verificar status | GET | `/documents/{id}` |
| Download assinado | GET | `/documents/{id}/download/certificated` |

**Download do PDF assinado:**  
`GET /documents/{id}` retorna `data.artifacts.certificated` com a URL completa. O código extrai o path e roteia pelo proxy: `new URL(artifactUrl).pathname.replace('/v1', '')` → `fetch(PROXY + apiPath)`.

**Colunas na tabela `rdos` (Supabase) — adicionar se não existirem:**
```sql
alter table public.rdos
  add column if not exists assinafy_document_id  text,
  add column if not exists assinafy_status        text,   -- nao_enviado | enviado | assinado | rejeitado
  add column if not exists assinafy_sent_at       timestamptz,
  add column if not exists assinafy_signed_at     timestamptz;
```

**Status mapeado da API:** `certificated` / `signed` / `completed` → `assinado`; `rejected` / `declined` → `rejeitado`; demais → `enviado`.

## Modo escuro — sistema todo (2026-05-29)

O conteúdo do **admin** não era feito p/ dark (cores fixas claras → texto sumia no escuro). Resolvido com **tokens de cor** em `tailwind.css`:
- `:root` (claro) e `html.dark` (escuro) definem `--c-text`, `--c-text-2`, `--c-text-3`, `--c-muted`, `--c-surface`, `--c-surface-2`, `--c-border`. `@media print` reseta p/ claro (não imprime escuro).
- As cores neutras fixas (inline e nos `<style>`) das 7 telas admin foram convertidas p/ `var(--c-*)`. Barras escuras (`section-label`, `kpi-strip`, `rep-header`), badges de status e o laranja da marca **mantidos**.
- Overrides `.dark .admin-content/.modal-box/.report .text-slate-900/800/700/600` cobrem classes Tailwind fixas (ex.: números do dashboard).
- **Assinaturas** (PNG transparente) usam fundo `#ffffff` fixo p/ aparecerem no dark.
- `campo/` e `cliente/` já eram dark-aware (classes `dark:`). **`index.html` (login) e `rdo-print.html` ficam sempre claros** (não carregam `ui.js`/dark; login é split claro/escuro por design; print é p/ papel).

## Dev — rodar localmente
- Servir a partir da raiz (favicons usam caminho absoluto `/faviconemodular/...`): `node _serve.js` → http://localhost:8123/
- Recompilar CSS após editar `tailwind.css`: `npm run build:css`
