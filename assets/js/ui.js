/* ui.js — shared UI helpers: toast, sidebar, confirm */

// ── Toast ────────────────────────────────────────────────
const Toast = (() => {
  let container = null;

  function getContainer() {
    if (!container) {
      container = document.querySelector('.toast-container') || document.createElement('div');
      container.className = 'toast-container';
      container.setAttribute('role', 'status');
      container.setAttribute('aria-live', 'polite');
      if (!container.isConnected) document.body.appendChild(container);
    }
    return container;
  }

  const ICONS = {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };

  function show(message, type = 'info', duration = 3500) {
    const c = getContainer();
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      ${ICONS[type] || ICONS.info}
      <span class="flex-1">${message}</span>
      <button type="button" aria-label="Fechar aviso" onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600 ml-1 shrink-0" style="background:none;border:none;cursor:pointer;line-height:1;padding:0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    c.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }

  return {
    success: (msg, d) => show(msg, 'success', d),
    error:   (msg, d) => show(msg, 'error',   d),
    warning: (msg, d) => show(msg, 'warning', d),
    info:    (msg, d) => show(msg, 'info',     d),
  };
})();

// ── Confirm dialog ───────────────────────────────────────
function UIConfirm(message, onConfirm, { danger = false, confirmText = 'Confirmar', cancelText = 'Cancelar' } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-modal w-full max-w-sm p-6 animate-slide-up">
      <p class="font-bold text-slate-800 mb-2 text-base">Confirmar ação</p>
      <p class="text-sm text-slate-600 mb-6">${message}</p>
      <div class="flex gap-3 justify-end">
        <button id="ui-cancel" class="btn btn-secondary">${cancelText}</button>
        <button id="ui-confirm" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${confirmText}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#ui-cancel').onclick  = () => overlay.remove();
  overlay.querySelector('#ui-confirm').onclick = () => { overlay.remove(); onConfirm(); };
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

// ── Dark mode ────────────────────────────────────────────
function initDarkMode() {
  const saved = localStorage.getItem('dark-mode');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved !== null ? saved === '1' : prefersDark;
  document.documentElement.classList.toggle('dark', isDark);
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('dark-mode', isDark ? '1' : '0');
  updateDarkToggleIcon();
}

function updateDarkToggleIcon() {
  const isDark = document.documentElement.classList.contains('dark');
  const btn = document.getElementById('dark-toggle');
  if (!btn) return;
  btn.innerHTML = isDark
    ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
    : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  btn.title = isDark ? 'Modo claro' : 'Modo escuro';
  btn.setAttribute('aria-label', isDark ? 'Ativar modo claro' : 'Ativar modo escuro');
}

initDarkMode();

// ── Sidebar toggle (admin) ───────────────────────────────
function initSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const mainWrap = document.getElementById('admin-wrap');
  const toggle   = document.getElementById('sidebar-toggle');
  if (!sidebar || !toggle) return;

  // One-time migration: reset stuck state from old broken code
  if (!localStorage.getItem('sidebar-v2')) {
    localStorage.removeItem('sidebar-collapsed');
    localStorage.setItem('sidebar-v2', '1');
  }

  const collapsed = localStorage.getItem('sidebar-collapsed') === '1';
  applySidebarState(collapsed, true);

  toggle.addEventListener('click', () => {
    const isCollapsed = sidebar.style.width === '4rem';
    applySidebarState(!isCollapsed);
    localStorage.setItem('sidebar-collapsed', !isCollapsed ? '1' : '0');
  });

  // Inject dark mode toggle button into sidebar footer
  const logoutBtn = sidebar.querySelector('[aria-label="Sair"]');
  if (logoutBtn && !document.getElementById('dark-toggle')) {
    const darkBtn = document.createElement('button');
    darkBtn.id = 'dark-toggle';
    darkBtn.onclick = toggleDarkMode;
    darkBtn.className = 'nav-label text-slate-500 hover:text-amber-400 transition-colors p-1';
    darkBtn.style.cssText = 'background:none;border:none;cursor:pointer';
    logoutBtn.parentElement.insertBefore(darkBtn, logoutBtn);
    updateDarkToggleIcon();
  }

  function applySidebarState(collapse, instant) {
    const logoFull  = sidebar.querySelector('#logo-full');
    const logoIcon  = sidebar.querySelector('#logo-icon');
    const logoutBtn = sidebar.querySelector('[title="Sair"]');
    const userRow       = sidebar.querySelector('[class*="border-t"] > div');

    if (!instant) {
      sidebar.style.transition  = 'width 250ms ease';
      if (mainWrap) mainWrap.style.transition = 'margin-left 250ms ease';
    }

    if (collapse) {
      sidebar.style.width = '4rem';
      if (mainWrap) mainWrap.style.marginLeft = '4rem';

      sidebar.querySelectorAll('.nav-label').forEach(el => el.classList.add('hidden'));
      if (logoFull) logoFull.style.display = 'none';
      if (logoIcon) logoIcon.style.display = 'block';

      if (userRow)  { userRow.classList.remove('gap-2.5','px-2'); userRow.classList.add('flex-col','gap-1','py-1'); }
      if (logoutBtn){ logoutBtn.classList.remove('hidden'); logoutBtn.style.padding = '6px'; }
    } else {
      sidebar.style.width = '16rem';
      if (mainWrap) mainWrap.style.marginLeft = '16rem';

      sidebar.querySelectorAll('.nav-label').forEach(el => el.classList.remove('hidden'));
      if (logoFull) logoFull.style.display = '';
      if (logoIcon) logoIcon.style.display = 'none';

      if (userRow)  { userRow.classList.add('gap-2.5','px-2'); userRow.classList.remove('flex-col','gap-1','py-1'); }
      if (logoutBtn){ logoutBtn.style.padding = ''; }
    }
  }
}

document.addEventListener('DOMContentLoaded', initSidebar);

// ── Badge de sincronização (offline / pendentes) ─────────
// Aparece só quando offline ou há itens na fila; some quando tudo sincronizado.
function initSyncBadge() {
  if (!(window.DB && typeof DB.onSyncChange === 'function')) return;
  let el = document.getElementById('sync-badge');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sync-badge';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'position:fixed;left:.75rem;bottom:4.75rem;z-index:90;display:none;align-items:center;gap:.4rem;padding:.35rem .7rem;border-radius:9999px;font-size:.72rem;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,.18);pointer-events:none';
    document.body.appendChild(el);
  }
  DB.onSyncChange(st => {
    if (!st.offlineEnabled || (st.online && st.pending === 0)) { el.style.display = 'none'; return; }
    let bg, fg, txt, icon;
    if (!st.online)      { bg = '#FEF3C7'; fg = '#92400E'; icon = '⚡'; txt = st.pending > 0 ? `Offline · ${st.pending} p/ enviar` : 'Offline'; }
    else if (st.syncing) { bg = '#DBEAFE'; fg = '#1E40AF'; icon = '⟳'; txt = `Sincronizando… ${st.pending}`; }
    else                 { bg = '#DBEAFE'; fg = '#1E40AF'; icon = '⟳'; txt = `${st.pending} p/ enviar`; }
    el.style.background = bg; el.style.color = fg;
    el.textContent = icon + ' ' + txt;
    el.style.display = 'inline-flex';
  });
}
document.addEventListener('DOMContentLoaded', initSyncBadge);

// ── A11y: esconde SVGs decorativos de leitores de tela ───
// Cobre conteúdo injetado dinamicamente via MutationObserver.
(function () {
  function hideSvgs(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('svg').forEach(svg => {
      if (!svg.hasAttribute('aria-hidden') && !svg.hasAttribute('aria-label') && svg.getAttribute('role') !== 'img') {
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
      }
    });
  }
  function run() {
    hideSvgs(document);
    new MutationObserver(muts => {
      muts.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.tagName === 'svg') hideSvgs(n.parentNode || n); else hideSvgs(n);
      }));
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();

// ── A11y: modais (.modal-overlay) — Esc, trap de foco, foco inicial/retorno ─
(function () {
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  let lastFocused = null;

  const isShown = o => o.isConnected && getComputedStyle(o).display !== 'none';
  const visibleFocusables = o => [...o.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null || el === document.activeElement);

  function activate(overlay) {
    if (overlay.dataset.a11yActive === '1') return;
    overlay.dataset.a11yActive = '1';
    lastFocused = document.activeElement;
    const box = overlay.querySelector('.modal-box, [role="dialog"]') || overlay.firstElementChild;
    if (box) {
      if (!box.getAttribute('role')) box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
    }
    const f = visibleFocusables(overlay);
    if (f.length) f[0].focus();
  }
  function deactivate(overlay) {
    if (overlay.dataset.a11yActive !== '1') return;
    overlay.dataset.a11yActive = '0';
    if (lastFocused && document.contains(lastFocused)) { try { lastFocused.focus(); } catch (e) {} }
  }
  function close(overlay) {
    if (overlay.id) overlay.style.display = 'none'; else overlay.remove();
    deactivate(overlay);
  }

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' && e.key !== 'Tab') return;
    const open = [...document.querySelectorAll('.modal-overlay')].filter(isShown);
    if (!open.length) return;
    const overlay = open[open.length - 1];
    if (e.key === 'Escape') { e.preventDefault(); close(overlay); return; }
    const f = visibleFocusables(overlay);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  function watch(overlay) {
    new MutationObserver(() => { isShown(overlay) ? activate(overlay) : deactivate(overlay); })
      .observe(overlay, { attributes: true, attributeFilter: ['style', 'class'] });
    if (isShown(overlay)) activate(overlay);
  }
  function scan() {
    document.querySelectorAll('.modal-overlay').forEach(o => {
      if (!o.dataset.a11yWatch) { o.dataset.a11yWatch = '1'; watch(o); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
