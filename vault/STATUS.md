# STATUS — RDO Digital

**Data:** 2026-05-16  
**Última atualização:** 2026-06-03 — botão de recolher/expandir a sidebar refeito (chevron flutuante na borda, estilo LiveClin); endpoint Assinafy corrigido p/ `/accounts/{id}` (era `/workspaces`, dava 404 no envio); bug de perda de escrita offline corrigido no `db.js`; offline validado em navegador real (Playwright)  
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

## Botão de recolher/expandir a sidebar — 2026-06-03

O antigo toggle era um ícone "painel" 20×20 solto na topbar branca (sem caixa/padding) → parecia pequeno e desalinhado. Refeito como **botão circular flutuante na "costura" entre sidebar e conteúdo**, com chevron `‹`/`›` que gira ao abrir/fechar (padrão tipo LiveClin).

- **CSS** (`tailwind.css`, `@layer components`): `.sidebar-edge-toggle` — círculo 28px, branco/borda no claro, slate no escuro, sombra, hover com leve `scale`, `:focus-visible` com ring. `.is-collapsed svg` gira 180°. **Recompilar:** `npm run build:css`.
- **JS** (`ui.js` → `initSidebar`): injeta o botão no `body` (aparece em **todas** as páginas admin), esconde o `#sidebar-toggle` antigo, reposiciona o botão na borda (`left = largura − 14px`) e gira o chevron a cada toggle. Estado persiste em `localStorage` (`sidebar-collapsed`).
- **Config** (`tailwind.config.js`): `sidebar-edge-toggle` e `is-collapsed` adicionados à `safelist` (classe gerada por JS — o `content` não escaneia `.js`, então sem isso o purge removia as regras base).
- **Logos** (7 páginas admin): `logo.png` e `M logo.png` originais eram canvas 3759×2115 quase vazios → logo renderizava minúsculo. Recortados nos bounding boxes justos (script Node temporário, decode/encode PNG puro c/ zlib). M → `M logo.png` quadrado **1178×1178**, recolhido em `h-12` (48px). Wordmark → **novo** `assets/img/logo-wordmark.png` **764×271** (recorte tight + downscale 1/4), aberto em `h-16` (64px). A `logo.png` original foi **mantida** intacta (compartilhada por login, cliente, campo e PDFs — recortá-la mudaria a proporção em todos).

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

**Como testar offline (Chrome):** abrir 1x online → DevTools ▸ Network ▸ **Offline** → recarregar (app abre) → preencher e assinar um RDO (badge "Offline") → voltar online → badge "Sincronizando…" some e o RDO aparece no admin/Supabase. Validado por harness de lógica (mock) **E em navegador real (Playwright) em 2026-06-03 — 10/10**: SW cacheia o shell (18 itens), snapshot persiste no IndexedDB (usuários/obras baixados), app abre offline, escrita offline fica na outbox. ⚠️ **Bug corrigido nesse teste:** o `supabase-js` OFFLINE retorna `{error}` "Failed to fetch" em vez de lançar exceção — o `sync()` antigo tratava como erro de servidor e **descartava a escrita offline** (o RDO sumia ao reconectar). Fix em `db.js`: `_isNetErr()` separa erro de rede (mantém o item) de erro de servidor (descarta). Smoke test: `pw-offline-test.cjs` na raiz.

## Banco — colunas da tabela `rdos` — ✅ todas aplicadas

Todas as colunas necessárias já existem no Supabase (aplicadas até 2026-05-30):

```
comentarios_fiscalizacao   text
assinatura_modular_base64  text
assinatura_modular_nome    text
assinafy_document_id       text
assinafy_status            text   -- nao_enviado | enviado | assinado | rejeitado
assinafy_sent_at           timestamptz
assinafy_signed_at         timestamptz
```

> O Supabase é compartilhado com outros projetos, mas as 6 tabelas do RDO são isoladas.

## Assinaturas do RDO (modelo — 2026-05-29, atualizado 2026-05-30)

Três papéis distintos:
- **Responsável pela Obra** (executor: montador/soldador/eletricista) → preenche e assina **no campo** (`campo/assinatura.html`), pad obrigatório → `assinatura_cliente_base64` + `assinatura_nome_confirmacao`.
- **Responsável Modular** (gerente) → **no painel admin** (`rdo-view`): valida o RDO e assina (pad opcional + **nome obrigatório**) → `assinatura_modular_base64` + `assinatura_modular_nome`. NÃO via API.
- **Cliente** → assinatura digital **via API (Assinafy)**, no admin, **depois** que o gerente valida/assina.

Fluxo: **campo preenche+assina → gerente valida+assina no admin → envia ao cliente (Assinafy)**. O botão "Enviar para Assinatura Digital" fica **bloqueado** até **3 condições simultâneas**: **(1)** ≥1 signatário (e-mail do cliente) na obra, **(2)** campo assinou (`assinatura_cliente_base64`), **(3)** gerente assinou (`assinatura_modular_nome`). Trava na UI (aviso visual) + em `enviarAssinatura()`. Signatários cadastrados no card "Assinatura Digital" do `rdo-view` ou em Obras → Signatários.

Exibidas em `rdo-view.html`, `rdo-print.html` e no **PDF (`pdf-gen.js`)** — esquerda = Responsável Modular (gerente), direita = Responsável pela Obra.

### Integração Assinafy — estado técnico (2026-05-30; corrigido 2026-06-03)

> [!warning] Correção 2026-06-03: os endpoints com escopo de conta são **`/accounts/{id}/...`**, NÃO `/workspaces/{id}/...` (este dava 404 "Página não encontrada"). Validado por probe: `GET /accounts` retorna o id `10302ff66...`; `/accounts/{id}/documents` e `/accounts/{id}/signers` → 200. Corrigido em `assinafy.js` (upload + signers). `ASSINAFY_ACCOUNT_ID` é um **Account ID**.

**Configuração (.env):**
```
ASSINAFY_API_KEY=<chave>
ASSINAFY_ACCOUNT_ID=<account_id>     ← é o ACCOUNT ID (confirmado via GET /accounts); endpoints usam /accounts/{id}
```

**Proxy local (`_serve.js`):**  
O servidor de dev expõe `/assinafy-proxy/*` que injeta `Authorization: Bearer <API_KEY>` e encaminha para `https://api.assinafy.com.br/v1/*`. Em produção o nginx faz o mesmo. `config.js` é gerado dinamicamente do `.env` (expõe `window.ASSINAFY_ACCOUNT_ID`).

**Endpoints usados (paths sem `/assinafy-proxy`):**
| Ação | Método | Path |
|------|--------|------|
| Upload PDF | POST | `/accounts/{id}/documents` |
| Criar signatário | POST | `/accounts/{id}/signers` |
| Listar signatários (reuso) | GET | `/accounts/{id}/signers` |
| Criar assignment | POST | `/documents/{id}/assignments` |
| Verificar status | GET | `/documents/{id}` |
| Download assinado | GET | `/documents/{id}/download/certificated` |

**Download do PDF assinado:**  
`GET /documents/{id}` retorna `data.artifacts.certificated` com a URL completa. O código extrai o path e roteia pelo proxy: `new URL(artifactUrl).pathname.replace('/v1', '')` → `fetch(PROXY + apiPath)`.

**Colunas na tabela `rdos` (Supabase) — ✅ aplicadas em 2026-05-30:**
```sql
-- já existem no banco:
assinafy_document_id  text
assinafy_status        text   -- nao_enviado | enviado | assinado | rejeitado
assinafy_sent_at       timestamptz
assinafy_signed_at     timestamptz
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
