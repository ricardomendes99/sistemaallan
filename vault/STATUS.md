# STATUS — RDO Digital

**Data:** 2026-05-16  
**Última atualização:** 2026-05-29 — passe de acessibilidade (Web Interface Guidelines) + modo offline (PWA) no fluxo de campo  
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

## Dev — rodar localmente
- Servir a partir da raiz (favicons usam caminho absoluto `/faviconemodular/...`): `node _serve.js` → http://localhost:8123/
- Recompilar CSS após editar `tailwind.css`: `npm run build:css`
