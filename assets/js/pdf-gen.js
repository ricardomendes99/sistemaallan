// PDF generation — replicates the official RDO template (RDO-001 Rev.03)
// Requires jsPDF loaded globally as window.jspdf

const PDFGen = (() => {

  // Thin wrapper — triggers browser download
  function generate(rdo, obra, criador, linhas) {
    const doc = _buildDoc(rdo, obra, criador, linhas);
    doc.save(`RDO_${obra.codigo_of}_${rdo.data_apontamento}.pdf`);
  }

  // Returns PDF as Blob (used by Assinafy — no download triggered)
  function generateBlob(rdo, obra, criador, linhas) {
    return _buildDoc(rdo, obra, criador, linhas).output('blob');
  }

  // Internal builder — returns a jsPDF instance without saving
  function _buildDoc(rdo, obra, criador, linhas) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const PW = 210, PH = 297;
    const ML = 10, MR = 10, MT = 10;
    const CW = PW - ML - MR;
    let y = MT;

    const orange = [249, 115, 22];
    const dark   = [30, 41, 59];
    const gray   = [100, 116, 139];
    const light  = [248, 250, 252];
    const white  = [255, 255, 255];
    const black  = [15, 23, 42];

    function line(x1, y1, x2, y2, color, lw) {
      doc.setDrawColor(...(color || [203, 213, 225]));
      doc.setLineWidth(lw || 0.3);
      doc.line(x1, y1, x2, y2);
    }
    function rect(x, r_y, w, h, fill, stroke) {
      if (fill)  { doc.setFillColor(...fill);   doc.rect(x, r_y, w, h, 'F'); }
      if (stroke){ doc.setDrawColor(...stroke); doc.setLineWidth(0.3); doc.rect(x, r_y, w, h, 'S'); }
    }
    function text(t, x, t_y, opts) {
      doc.setFontSize(opts.size || 9);
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
      doc.setTextColor(...(opts.color || black));
      doc.text(String(t || ''), x, t_y, { align: opts.align || 'left', baseline: 'top' });
    }
    function cell(label, value, x, c_y, w, h) {
      rect(x, c_y, w, h, null, [203,213,225]);
      text(label, x+1.5, c_y+1.5, { size: 7, bold: true, color: gray });
      text(value, x+1.5, c_y+5.5, { size: 8.5, color: black });
    }

    // Draw a checkbox using native jsPDF shapes (Unicode ☑/☐ not supported by Helvetica)
    function checkbox(x, c_y, checked, color) {
      const s = 3.2;
      doc.setDrawColor(...(color || gray));
      doc.setLineWidth(0.4);
      doc.rect(x, c_y, s, s);
      if (checked) {
        doc.setDrawColor(...(color || [22,101,52]));
        doc.setLineWidth(0.75);
        doc.line(x+0.55, c_y+1.6, x+1.3, c_y+2.5);
        doc.line(x+1.3,  c_y+2.5, x+s-0.3, c_y+0.4);
      }
    }

    // Draw a circle using native jsPDF shapes (Unicode ●/○ not supported by Helvetica)
    function circle(cx, cy, filled, fillColor) {
      const r = 1.1;
      if (filled) {
        doc.setFillColor(...(fillColor || orange));
        doc.circle(cx, cy, r, 'F');
      } else {
        doc.setDrawColor(...gray);
        doc.setLineWidth(0.3);
        doc.circle(cx, cy, r, 'S');
      }
    }

    // Draw a filled/outline square using native jsPDF shapes (Unicode ■/□ not supported)
    function square(x, sq_y, filled, fillColor) {
      const s = 3.2;
      if (filled) {
        doc.setFillColor(...(fillColor || orange));
        doc.rect(x, sq_y, s, s, 'F');
      } else {
        doc.setDrawColor(...gray);
        doc.setLineWidth(0.3);
        doc.rect(x, sq_y, s, s, 'S');
      }
    }

    // ── HEADER ─────────────────────────────────────────
    rect(ML, y, CW, 12, dark);
    rect(ML, y, 16, 12, orange);
    text('M', ML+4, y+2, { size: 16, bold: true, color: white });
    text('MODULAR SERVICE', ML+18, y+1.5, { size: 7, bold: true, color: [148,163,184] });
    text('RDO — RELATÓRIO DIÁRIO DE OBRA', ML+18, y+5, { size: 12, bold: true, color: white });
    text('RDO-001 - Revisão: 03', PW-MR-42, y+1.5, { size: 7, color: [148,163,184] });
    text(`Data: ${Utils.formatDate(rdo.data_apontamento)}`, PW-MR-42, y+5.5, { size: 8, bold: true, color: white });
    y += 12;

    // ── CLIENT ROW ─────────────────────────────────────
    const h_row = 9;
    cell('Cliente:', obra.cliente_nome, ML, y, 72, h_row);
    cell('Local da Obra:', obra.endereco_local, ML+72, y, 72, h_row);
    cell('Contato Cliente:', obra.cliente_contato, ML+144, y, 46, h_row);
    y += h_row;

    // ── EXECUTANTES ROW ────────────────────────────────
    cell('Executantes:', rdo.executantes || criador.nome_completo, ML, y, 100, h_row);
    cell('Data:', Utils.formatDate(rdo.data_apontamento), ML+100, y, 42, h_row);
    cell('OF:', obra.codigo_of, ML+142, y, 48, h_row);
    y += h_row;

    // ── ATIVIDADE ROW ─────────────────────────────────
    cell('Atividade:', rdo.atividade || '', ML, y, CW, h_row);
    y += h_row;

    // ── INFO TABLE HEADER ─────────────────────────────
    const tH = 6;
    rect(ML, y, CW, tH, dark);
    const cols = [38, 36, 42, 52, 11, 11];
    const headers = ['Dia da Atividade','Efetivo Modular','Horários','Tempo','Manhã','Tarde'];
    let cx = ML;
    headers.forEach((h, i) => {
      text(h, cx+cols[i]/2, y+1.5, { size: 7, bold: true, color: white, align: 'center' });
      if (i < headers.length-1) line(cx+cols[i], y, cx+cols[i], y+tH, [64,100,140]);
      cx += cols[i];
    });
    y += tH;

    // ── INFO TABLE BODY ───────────────────────────────
    const efetivo = rdo.efetivo || {};
    const dias_pt = ['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];
    const roles   = ['Montador','Auxiliar Montagem','Eletricista','Soldador','Encarregado','Técnico Segurança','Total'];
    const horarios = [
      ['Início:', rdo.horario_inicio || ''],
      ['Almoço:', rdo.horario_almoco || ''],
      ['Término:', rdo.horario_termino || ''],
    ];
    const tempos_opt = ['Bom (sem chuva)','Chuva Leve','Chuva Extrema'];
    const status_opt = ['Iniciada','Em Andamento','Concluída'];
    const roleKeys = ['montador','auxiliar','eletricista','soldador','encarregado','tecnico_seguranca'];

    const rH = 5.5;
    const nRows = 7;
    const diaDaSemana = Utils.getDayOfWeek(rdo.data_apontamento);

    for (let i = 0; i < nRows; i++) {
      const rowY = y + i * rH;
      const bg = i % 2 === 0 ? white : light;
      rect(ML, rowY, CW, rH, bg);
      line(ML, rowY+rH, ML+CW, rowY+rH, [226,232,240]);

      // col 0: Dia — native checkbox, no Unicode
      const isDia = dias_pt[i] === diaDaSemana;
      checkbox(ML+1.5, rowY+1.15, isDia, isDia ? [22,101,52] : gray);
      text(dias_pt[i], ML+6.5, rowY+1.2, { size: 7.5, bold: isDia, color: isDia ? [22,101,52] : black });

      // col 1: Efetivo
      cx = ML+38;
      const rKey = i < 6 ? roleKeys[i] : null;
      const count = rKey ? (efetivo[rKey] || 0) : Object.values(efetivo).reduce((s,v) => s+(+v||0), 0);
      text(roles[i], cx+1, rowY+1.2, { size: 7, color: i===6 ? orange : black, bold: i===6 });
      text(count > 0 ? String(count) : '', cx+29, rowY+1.2, { size: 7.5, bold: true, color: dark });

      // col 2: Horários (first 3 rows)
      cx = ML+74;
      if (i < 3) {
        text(horarios[i][0], cx+1, rowY+1.2, { size: 7, bold: true, color: gray });
        text(horarios[i][1], cx+15, rowY+1.2, { size: 7.5, color: black });
      }

      // col 3: Tempo/Status — native circles, no Unicode
      cx = ML+116;
      if (i < 3) {
        const isT = tempos_opt[i] === rdo.condicao_tempo_manha || tempos_opt[i] === rdo.condicao_tempo_tarde;
        circle(cx+2.5, rowY+rH/2, isT, orange);
        text(tempos_opt[i], cx+5.5, rowY+1.2, { size: 7, color: black });
      } else if (i === 3) {
        text('Status da Atividade', cx+1, rowY+1.2, { size: 7, bold: true, color: dark });
      } else {
        const sIdx = i - 4;
        if (sIdx < status_opt.length) {
          const isS = status_opt[sIdx] === rdo.status_atividade;
          circle(cx+2.5, rowY+rH/2, isS, orange);
          text(status_opt[sIdx], cx+5.5, rowY+1.2, { size: 7, color: black });
        }
      }

      // col 4/5: Manhã / Tarde — native squares, no Unicode
      const mC = ML+168, tC = ML+179;
      if (i < 3) {
        const mOk = tempos_opt[i] === rdo.condicao_tempo_manha;
        const aOk = tempos_opt[i] === rdo.condicao_tempo_tarde;
        square(mC+2.5, rowY+1.15, mOk, orange);
        square(tC+2.5, rowY+1.15, aOk, orange);
      }

      // vertical separators
      cx = ML;
      cols.forEach((w) => {
        cx += w;
        line(cx, y, cx, y + nRows*rH, [203,213,225]);
      });
    }
    y += nRows * rH;

    // ── HORA TABLE ────────────────────────────────────
    const hdrH = 6;
    rect(ML, y, CW, hdrH, dark);
    text('Hora', ML+6, y+1.5, { size: 8, bold: true, color: white });
    text('Discriminação das atividades', ML+30, y+1.5, { size: 8, bold: true, color: white });
    line(ML+22, y, ML+22, y+hdrH, [64,100,140]);
    y += hdrH;

    const slots = Utils.getSlotsInRange(rdo.horario_inicio, rdo.horario_termino);
    const slotH = 10;
    slots.forEach((slot, idx) => {
      const slotY = y + idx * slotH;
      const bg = idx % 2 === 0 ? white : light;
      rect(ML, slotY, CW, slotH, bg);
      rect(ML, slotY, CW, slotH, null, [226,232,240]);

      const isLunch = slot === Utils.floorHour(rdo.horario_almoco);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...(isLunch ? [217,119,6] : dark));
      doc.text(slot, ML+6, slotY+3, { baseline: 'top' });
      if (isLunch) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(...gray);
        doc.text('Intervalo de almoço', ML+25, slotY+3, { baseline: 'top' });
      } else {
        const linha = linhas.find(l => l.horario_ponto === slot);
        if (linha && linha.descricao_detalhada) {
          const txt = (linha.referencia_modulo ? `[${linha.referencia_modulo}] ` : '') + linha.descricao_detalhada;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...black);
          const lines = doc.splitTextToSize(txt, CW - 28);
          doc.text(lines.slice(0,1), ML+25, slotY+1.5, { baseline: 'top' });
          if (lines[1]) doc.text(lines.slice(1,2), ML+25, slotY+5.5, { baseline: 'top' });
          if (linha.status_atividade) {
            const sc = { 'Iniciada':[59,130,246],'Em Andamento':[234,179,8],'Concluída':[34,197,94] };
            const col = sc[linha.status_atividade] || gray;
            doc.setFillColor(...col);
            doc.roundedRect(PW-MR-24, slotY+2.5, 22, 4.5, 1, 1, 'F');
            doc.setFontSize(6); doc.setFont('helvetica','bold'); doc.setTextColor(...white);
            doc.text(linha.status_atividade, PW-MR-13, slotY+4, { align:'center', baseline:'top' });
          }
        }
      }
      line(ML+22, slotY, ML+22, slotY+slotH, [203,213,225]);
    });
    y += slots.length * slotH;

    // ── OBSERVATION NOTE ──────────────────────────────
    rect(ML, y, CW, 5, [248,250,252]);
    rect(ML, y, CW, 5, null, [226,232,240]);
    text('Observação: O RDO deve ser preenchido de hora em hora', ML+CW/2, y+1, { size: 7.5, color: gray, align: 'center' });
    y += 5;

    // ── OBSERVAÇÕES E DESVIOS ─────────────────────────
    const obsH = 20;
    rect(ML, y, CW, 5.5, dark);
    text('CAMPO OBSERVAÇÕES E DESVIOS', ML+CW/2, y+1, { size: 8, bold: true, color: white, align: 'center' });
    y += 5.5;
    rect(ML, y, CW, obsH, white, [203,213,225]);
    if (rdo.observacoes_desvios) {
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...black);
      doc.text(doc.splitTextToSize(rdo.observacoes_desvios, CW-4), ML+2, y+2, { baseline: 'top' });
    }
    y += obsH;

    // ── COMENTÁRIOS FISCALIZAÇÃO ──────────────────────
    const fiscH = 18;
    rect(ML, y, CW, 5.5, dark);
    text('CAMPO DESTINADO A COMENTÁRIOS FISCALIZAÇÃO', ML+CW/2, y+1, { size: 8, bold: true, color: white, align: 'center' });
    y += 5.5;
    rect(ML, y, CW, fiscH, white, [203,213,225]);
    if (rdo.comentarios_fiscalizacao) {
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...black);
      doc.text(doc.splitTextToSize(rdo.comentarios_fiscalizacao, CW-4), ML+2, y+2, { baseline: 'top' });
    }
    y += fiscH;

    // ── SIGNATURES ───────────────────────────────────
    const sigH = 28;
    rect(ML, y, CW, sigH, white, [203,213,225]);

    doc.setDrawColor(30,41,59); doc.setLineWidth(0.4);

    // Esquerda — Responsável Modular (gerente)
    if (rdo.assinatura_modular_base64) {
      try { doc.addImage(rdo.assinatura_modular_base64, 'PNG', ML+10, y+3, 80, 16); } catch {}
    }
    doc.line(ML+10, y+20, ML+CW/2-5, y+20);
    const sigModular = rdo.assinatura_modular_nome
      ? `Nome e Assinatura do Responsável Modular: ${rdo.assinatura_modular_nome}`
      : 'Nome e Assinatura do Responsável Modular:';
    text(sigModular, ML+CW/4, y+22, { size: 7.5, bold: true, color: dark, align: 'center' });

    // Direita — Responsável pela Obra
    if (rdo.assinatura_cliente_base64) {
      try { doc.addImage(rdo.assinatura_cliente_base64, 'PNG', ML+CW/2+5, y+3, 80, 16); } catch {}
    }
    doc.line(ML+CW/2+10, y+20, PW-MR-10, y+20);
    const sigObra = rdo.assinatura_nome_confirmacao
      ? `Nome e Assinatura do Responsável pela Obra: ${rdo.assinatura_nome_confirmacao}`
      : 'Nome e Assinatura do Responsável pela Obra:';
    text(sigObra, ML+CW*0.75, y+22, { size: 7.5, bold: true, color: dark, align: 'center' });

    y += sigH;

    // ── FOTOS ─────────────────────────────────────────
    if (rdo.fotos && rdo.fotos.length > 0) {
      if (y + 10 > PH - 20) { doc.addPage(); y = MT; }

      rect(ML, y, CW, 5.5, dark);
      text(`REGISTRO FOTOGRÁFICO (${rdo.fotos.length} foto${rdo.fotos.length > 1 ? 's' : ''})`, ML+CW/2, y+1, { size: 8, bold: true, color: white, align: 'center' });
      y += 5.5;

      const cols4 = 4;
      const fotoW = (CW - (cols4-1) * 2) / cols4;
      const fotoH = fotoW * 0.75;

      rdo.fotos.forEach((b64, idx) => {
        const col = idx % cols4;
        const row = Math.floor(idx / cols4);
        const fx  = ML + col * (fotoW + 2);
        const fy  = y + row * (fotoH + 2);

        if (fy + fotoH > PH - 15) { doc.addPage(); y = MT; }

        try {
          const fmt = b64.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(b64, fmt, fx, fy, fotoW, fotoH);
          rect(fx, fy, fotoW, fotoH, null, [203,213,225]);
        } catch {}
      });

      const fotoRows = Math.ceil(rdo.fotos.length / cols4);
      y += fotoRows * (fotoH + 2) + 2;
    }

    return doc;
  }

  return { generate, generateBlob, _buildDoc };
})();
