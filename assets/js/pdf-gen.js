// PDF generation — replicates the official RDO template (RDO-001 Rev.03)
// Requires jsPDF loaded globally as window.jspdf

const PDFGen = (() => {

  function generate(rdo, obra, criador, linhas) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const PW = 210, PH = 297;
    const ML = 10, MR = 10, MT = 10;
    const CW = PW - ML - MR; // 190mm content width
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

    // ── HEADER ─────────────────────────────────────────
    rect(ML, y, CW, 12, dark);
    // Logo M box
    rect(ML, y, 16, 12, orange);
    text('M', ML+4, y+2, { size: 16, bold: true, color: white });

    text('MODULAR SERVICE', ML+18, y+1.5, { size: 7, bold: true, color: [148,163,184] });
    text('RDO — RELATÓRIO DIÁRIO DE OBRA', ML+18, y+5, { size: 12, bold: true, color: white });

    // Revision box (right)
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
    rect(ML, y, CW, tH, [30,41,59]);
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

      // col 0: Dia
      const isDia = dias_pt[i] === diaDaSemana;
      text((isDia ? '☑ ' : '☐ ') + dias_pt[i], ML+1, rowY+1.2, { size: 7.5, bold: isDia, color: isDia ? [22,101,52] : black });

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

      // col 3: Tempo/Status
      cx = ML+116;
      if (i < 3) {
        const isT = tempos_opt[i] === rdo.condicao_tempo_manha || tempos_opt[i] === rdo.condicao_tempo_tarde;
        text((isT ? '●' : '○') + ' ' + tempos_opt[i], cx+1, rowY+1.2, { size: 7, color: black });
      } else if (i === 3) {
        // Status label row
        text('Status da Atividade', cx+1, rowY+1.2, { size: 7, bold: true, color: dark });
      } else {
        const sIdx = i - 4;
        if (sIdx < status_opt.length) {
          const isS = status_opt[sIdx] === rdo.status_atividade;
          text((isS ? '●' : '○') + ' ' + status_opt[sIdx], cx+1, rowY+1.2, { size: 7, color: black });
        }
      }

      // col 4/5: Manhã / Tarde (weather checks)
      const mC = ML+168, tC = ML+179;
      if (i < 3) {
        const mOk = tempos_opt[i] === rdo.condicao_tempo_manha;
        const aOk = tempos_opt[i] === rdo.condicao_tempo_tarde;
        text(mOk ? '■' : '□', mC+2, rowY+1.2, { size: 9, color: mOk ? orange : gray });
        text(aOk ? '■' : '□', tC+2, rowY+1.2, { size: 9, color: aOk ? orange : gray });
      }

      // vertical separators
      cx = ML;
      cols.forEach((w, ci) => {
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

    const slots = Utils.getSlots();
    const slotH = 10;
    slots.forEach((slot, idx) => {
      const slotY = y + idx * slotH;
      const bg = idx % 2 === 0 ? white : light;
      rect(ML, slotY, CW, slotH, bg);
      rect(ML, slotY, CW, slotH, null, [226,232,240]);

      const isLunch = slot === rdo.horario_almoco;
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
          // Status mini tag
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

    // ── OBSERVAÇÕES E DESVIOS ────────────────────────
    const obsH = 20;
    rect(ML, y, CW, 5.5, dark);
    text('CAMPO OBSERVAÇÕES E DESVIOS', ML+CW/2, y+1, { size: 8, bold: true, color: white, align: 'center' });
    y += 5.5;
    rect(ML, y, CW, obsH, white, [203,213,225]);
    if (rdo.observacoes_desvios) {
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...black);
      const obsLines = doc.splitTextToSize(rdo.observacoes_desvios, CW-4);
      doc.text(obsLines, ML+2, y+2, { baseline: 'top' });
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
      const fiscLines = doc.splitTextToSize(rdo.comentarios_fiscalizacao, CW-4);
      doc.text(fiscLines, ML+2, y+2, { baseline: 'top' });
    }
    y += fiscH;

    // ── SIGNATURES ───────────────────────────────────
    const sigH = 28;
    rect(ML, y, CW, sigH, white, [203,213,225]);

    // Modular signature
    doc.setDrawColor(30,41,59); doc.setLineWidth(0.4);
    doc.line(ML+10, y+20, ML+CW/2-5, y+20);
    text('Modular', ML+CW/4, y+22, { size: 8, bold: true, color: dark, align: 'center' });

    // Client signature
    if (rdo.assinatura_cliente_base64) {
      try { doc.addImage(rdo.assinatura_cliente_base64, 'PNG', ML+CW/2+5, y+3, 80, 16); } catch {}
    }
    doc.line(ML+CW/2+10, y+20, PW-MR-10, y+20);
    const sigLabel = rdo.assinatura_nome_confirmacao
      ? `Nome e Assinatura do Cliente: ${rdo.assinatura_nome_confirmacao}`
      : 'Nome e Assinatura do Cliente:';
    text(sigLabel, ML+CW*0.75, y+22, { size: 8, bold: true, color: dark, align: 'center' });

    // ── FOTOS ─────────────────────────────────────────
    if (rdo.fotos && rdo.fotos.length > 0) {
      // Check if we need a new page
      if (y + 10 > PH - 20) { doc.addPage(); y = MT; }

      rect(ML, y, CW, 5.5, dark);
      text(`REGISTRO FOTOGRÁFICO (${rdo.fotos.length} foto${rdo.fotos.length > 1 ? 's' : ''})`, ML + CW / 2, y + 1, { size: 8, bold: true, color: white, align: 'center' });
      y += 5.5;

      const cols4 = 4;
      const fotoW = (CW - (cols4 - 1) * 2) / cols4; // ~45mm each with 2mm gap
      const fotoH = fotoW * 0.75; // 4:3 ratio

      rdo.fotos.forEach((b64, idx) => {
        const col = idx % cols4;
        const row = Math.floor(idx / cols4);
        const fx  = ML + col * (fotoW + 2);
        const fy  = y + row * (fotoH + 2);

        // New page if needed
        if (fy + fotoH > PH - 15) {
          doc.addPage();
          y = MT;
        }

        try {
          const fmt = b64.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(b64, fmt, fx, fy, fotoW, fotoH);
          rect(fx, fy, fotoW, fotoH, null, [203, 213, 225]);
        } catch (e) { /* skip invalid image */ }
      });

      const fotoRows = Math.ceil(rdo.fotos.length / cols4);
      y += fotoRows * (fotoH + 2) + 2;
    }

    // ── SAVE ──────────────────────────────────────────
    const fname = `RDO_${obra.codigo_of}_${rdo.data_apontamento}.pdf`;
    doc.save(fname);
  }

  return { generate };
})();
