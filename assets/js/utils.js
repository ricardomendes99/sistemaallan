const Utils = (() => {
  const DIAS = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const SLOTS = Array.from({length: 24}, (_, h) => String(h).padStart(2,'0') + ':00');

  function today() { return new Date().toISOString().split('T')[0]; }

  function formatDate(d) {
    if (!d) return '';
    const [y,m,dd] = d.split('-');
    return `${dd}/${m}/${y}`;
  }

  function getDayOfWeek(d) {
    if (!d) return '';
    const [y,m,dd] = d.split('-').map(Number);
    return DIAS[new Date(y, m-1, dd).getDay()];
  }

  function getSlots() { return [...SLOTS]; }

  // ── Business Rules ────────────────────────────────
  function validateLinha(linha) {
    if (!linha.status_atividade) return 'Selecione o status da atividade.';
    if (!linha.descricao_detalhada || linha.descricao_detalhada.trim().length < 20)
      return 'A descrição deve ter pelo menos 20 caracteres (RN02).';
    return null;
  }

  // RN05: all slots between start/end (excluding lunch) must be filled
  function validateRDOCompleto(rdo, linhas) {
    if (!rdo.horario_inicio || !rdo.horario_termino) return 'Preencha os horários de início e término.';
    const idx_start = SLOTS.indexOf(rdo.horario_inicio);
    const idx_end   = SLOTS.indexOf(rdo.horario_termino);
    if (idx_start < 0 || idx_end < 0 || idx_end <= idx_start) return 'Horários inválidos.';

    for (let i = idx_start; i <= idx_end; i++) {
      const slot = SLOTS[i];
      if (slot === rdo.horario_almoco) continue;
      const l = linhas.find(x => x.horario_ponto === slot);
      if (!l || !l.descricao_detalhada || l.descricao_detalhada.trim().length < 20)
        return `Hora ${slot} está incompleta. Preencha todas as horas (RN05).`;
    }
    return null;
  }

  // ── UI helpers ────────────────────────────────────
  function toast(msg, type = 'success') {
    const palette = { success:'#16A34A', error:'#DC2626', warning:'#D97706', info:'#2563EB' };
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;top:1rem;right:1rem;z-index:9999;padding:.75rem 1.25rem;
      border-radius:.5rem;color:#fff;font-size:.875rem;font-weight:600;
      background:${palette[type]||palette.success};box-shadow:0 4px 12px rgba(0,0,0,.2);
      transition:opacity .3s;max-width:90vw;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3200);
  }

  function statusBadge(s) {
    const map = {
      'Rascunho':            'background:#FEF3C7;color:#92400E',
      'Pendente_Assinatura': 'background:#DBEAFE;color:#1E40AF',
      'Finalizado':          'background:#DCFCE7;color:#166534',
      'Ativa':               'background:#DCFCE7;color:#166534',
      'Pausada':             'background:#FEF3C7;color:#92400E',
      'Concluída':           'background:#F1F5F9;color:#475569',
    };
    const style = map[s] || 'background:#F1F5F9;color:#64748B';
    return `<span style="${style};padding:.2rem .6rem;border-radius:9999px;font-size:.75rem;font-weight:700">${s}</span>`;
  }

  return { today, formatDate, getDayOfWeek, getSlots, validateLinha, validateRDOCompleto, toast, statusBadge, DIAS };
})();
