/* ui.js — shared UI helpers: toast, sidebar, confirm */

// ── Toast ────────────────────────────────────────────────
const Toast = (() => {
  let container = null;

  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
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
      <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600 ml-1 shrink-0" style="background:none;border:none;cursor:pointer;line-height:1;padding:0">
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
