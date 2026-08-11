import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  red: '#dc2626', orange: '#ea580c', bg: '#F8FAFC',
  text: '#0F172A', muted: '#334155', ghost: '#64748B',
  border: '#E2E8F0', tableHeader: '#4B5563', white: '#FFFFFF',
};

function formatBRL(v) {
  if (v == null || isNaN(v)) return 'R$ —';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatPct(v) {
  if (v == null || isNaN(v)) return '—';
  return (v * 100).toFixed(4) + '%';
}
function hoje() { return new Date().toLocaleDateString('pt-BR'); }

const GHOST_WIDTHS = [80, 65, 90, 55, 70, 85, 60, 75];

function SkeletonKPIs({ labels }) {
  const valores = ['R$ 12.543,90', 'R$ 4.218,30', 'R$ 8.325,60', 'R$ 45.230,00', '127', '8'];
  const descs   = ['PIS + COFINS pagos a maior', 'PIS pago sobre base inflada', 'COFINS pago sobre base inflada', 'Retirado da base', 'Notas processadas', 'Períodos cobertos'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
      {labels.map((k, idx) => (
        <div key={k} style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: '#CBD5E1', marginBottom: 5 }}>{k}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#CBD5E1', marginBottom: 3 }}>{valores[idx] || '—'}</div>
          <div style={{ fontSize: 10, color: '#E2E8F0' }}>{descs[idx] || ''}</div>
        </div>
      ))}
    </div>
  );
}

function SkeletonTabela({ colunas, linhas = 5 }) {
  const dadosFicticios = [
    ['2024-01', '12', 'R$ 45.230,00', 'R$ 5.427,60', 'R$ 39.802,40', 'R$ 148,96', 'R$ 685,54', 'R$ 834,50'],
    ['2024-02', '8',  'R$ 31.180,00', 'R$ 3.741,60', 'R$ 27.438,40', 'R$ 102,84', 'R$ 473,14', 'R$ 575,98'],
    ['2024-03', '15', 'R$ 58.900,00', 'R$ 7.068,00', 'R$ 51.832,00', 'R$ 194,37', 'R$ 894,06', 'R$ 1.088,43'],
    ['2024-04', '10', 'R$ 42.750,00', 'R$ 5.130,00', 'R$ 37.620,00', 'R$ 141,07', 'R$ 648,82', 'R$ 789,89'],
    ['2024-05', '6',  'R$ 24.600,00', 'R$ 2.952,00', 'R$ 21.648,00', 'R$ 81,17',  'R$ 373,39', 'R$ 454,56'],
  ];
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ background: S.tableHeader }}>
          {colunas.map((h, i) => (
            <th key={i} style={{ color: '#fff', padding: '10px 12px', textAlign: i === 0 ? 'left' : 'right', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 11 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array(linhas).fill(null).map((_, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? S.bg : S.white, borderBottom: `1px solid ${S.border}` }}>
            {colunas.map((_, j) => (
              <td key={j} style={{ padding: '10px 12px', textAlign: j === 0 ? 'left' : 'right', color: '#CBD5E1', fontWeight: j === 0 ? 600 : 400, whiteSpace: 'nowrap' }}>
                {dadosFicticios[i]?.[j] || '—'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function parsearXMLNFe(xmlText) {
  try {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const get = (el, tag) => el?.getElementsByTagNameNS('*', tag)[0]?.textContent?.trim() || '';
    const ide   = doc.getElementsByTagNameNS('*', 'ide')[0];
    const emit  = doc.getElementsByTagNameNS('*', 'emit')[0];
    const dest  = doc.getElementsByTagNameNS('*', 'dest')[0];
    const total = doc.getElementsByTagNameNS('*', 'ICMSTot')[0];
    if (!ide || !total) return null;
    if (get(ide, 'tpNF') === '0') return null;
    const dhEmi = get(ide, 'dhEmi') || get(ide, 'dEmi') || '';
    const dataEmissao = dhEmi.substring(0, 10);
    if (!dataEmissao) return null;
    const competencia = dataEmissao.substring(0, 7);
    const nNF      = get(ide, 'nNF');
    const nomeEmit = get(emit, 'xNome');
    const cnpjEmit = get(emit, 'CNPJ');
    const nomeDest = get(dest, 'xNome');
    const cnpjDest = get(dest, 'CNPJ') || get(dest, 'CPF');
    const vNF      = parseFloat(get(total, 'vNF')     || '0');
    const vICMS    = parseFloat(get(total, 'vICMS')   || '0');
    const vPIS     = parseFloat(get(total, 'vPIS')    || '0');
    const vCOFINS  = parseFloat(get(total, 'vCOFINS') || '0');
    if (vNF <= 0) return null;
    const baseSemICMS   = Math.max(0, vNF - vICMS);
    const aliqPIS       = vNF > 0 ? vPIS    / vNF : 0;
    const aliqCOFINS    = vNF > 0 ? vCOFINS / vNF : 0;
    const pisCorreto    = baseSemICMS * aliqPIS;
    const cofinsCorreto = baseSemICMS * aliqCOFINS;
    const creditoPIS    = Math.max(0, vPIS    - pisCorreto);
    const creditoCOFINS = Math.max(0, vCOFINS - cofinsCorreto);
    const creditoTotal  = creditoPIS + creditoCOFINS;
    return {
      nNF, dataEmissao, competencia, nomeEmit, cnpjEmit, nomeDest, cnpjDest,
      vNF, vICMS, vPIS, vCOFINS, baseSemICMS, aliqPIS, aliqCOFINS,
      pisCorreto, cofinsCorreto, creditoPIS, creditoCOFINS, creditoTotal,
    };
  } catch { return null; }
}

function agruparPorCompetencia(notas) {
  const map = {};
  notas.forEach(n => {
    if (!map[n.competencia]) map[n.competencia] = {
      competencia: n.competencia, qtdNF: 0,
      vNF: 0, vICMS: 0, vPIS: 0, vCOFINS: 0,
      baseSemICMS: 0, pisCorreto: 0, cofinsCorreto: 0,
      creditoPIS: 0, creditoCOFINS: 0, creditoTotal: 0,
    };
    const c = map[n.competencia];
    c.qtdNF++; c.vNF += n.vNF; c.vICMS += n.vICMS;
    c.vPIS += n.vPIS; c.vCOFINS += n.vCOFINS;
    c.baseSemICMS += n.baseSemICMS; c.pisCorreto += n.pisCorreto;
    c.cofinsCorreto += n.cofinsCorreto; c.creditoPIS += n.creditoPIS;
    c.creditoCOFINS += n.creditoCOFINS; c.creditoTotal += n.creditoTotal;
  });
  return Object.values(map).sort((a, b) => a.competencia.localeCompare(b.competencia));
}

// ── Função exportar PDF de um elemento ────────────────────────────────────
async function exportarPDF(elementId, nomeArquivo, notasParaPDF = null, perfilParaPDF = null, clienteParaPDF = null, incluirCabecalho = true) {
  // Se for memória de cálculo, gera em texto real
  if (elementId === 'memoria-calculo-pdf' && notasParaPDF) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const margem = 14;
    let y = margem;

    function checarPagina(altura = 10) {
      if (y + altura > 275) { doc.addPage(); y = margem; }
    }

    function linha(texto, x, tamanho = 9, cor = [30, 30, 30], bold = false) {
      doc.setFontSize(tamanho);
      doc.setTextColor(...cor);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(texto, x, y);
    }

    function linhaDir(texto, tamanho = 9, cor = [30, 30, 30], bold = false) {
      doc.setFontSize(tamanho);
      doc.setTextColor(...cor);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(texto, W - margem, y, { align: 'right' });
    }

    function separador(cor = [226, 232, 240]) {
      checarPagina(4);
      doc.setDrawColor(...cor);
      doc.setLineWidth(0.3);
      doc.line(margem, y, W - margem, y);
      y += 4;
    }

    function blocoKV(label, valor, corValor = [30, 30, 30]) {
      checarPagina(6);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(label, margem + 4, y);
      doc.setFontSize(9);
      doc.setTextColor(...corValor);
      doc.setFont('helvetica', 'bold');
      doc.text(valor, W - margem, y, { align: 'right' });
      y += 5.5;
    }

    // ── CABEÇALHO DO ESCRITÓRIO ──
    if (incluirCabecalho && perfilParaPDF) {
      if (perfilParaPDF.logo_url) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((res, rej) => {
            img.onload = res; img.onerror = rej;
            img.src = perfilParaPDF.logo_url;
          });
          const canvas = document.createElement('canvas');
          canvas.width = img.width; canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          const imgData = canvas.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', margem, y, 40, 15);
          y += 18;
        } catch { y += 5; }
      }

      if (perfilParaPDF.nome_escritorio) {
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.setTextColor(11, 31, 77);
        doc.text(perfilParaPDF.nome_escritorio, margem, y); y += 5;
      }
      if (perfilParaPDF.crc) {
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(perfilParaPDF.crc, margem, y); y += 4;
      }

      // Dados de contato à direita
      let yContato = margem + (perfilParaPDF.logo_url ? 18 : 0);
      const contatos = [
        perfilParaPDF.endereco && `📍 ${perfilParaPDF.endereco}`,
        perfilParaPDF.telefone && `📞 ${perfilParaPDF.telefone}`,
        perfilParaPDF.whatsapp && `💬 ${perfilParaPDF.whatsapp}`,
        perfilParaPDF.email    && `✉️ ${perfilParaPDF.email}`,
        perfilParaPDF.site     && `🌐 ${perfilParaPDF.site}`,
      ].filter(Boolean);
      contatos.forEach(c => {
        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(c, W - margem, yContato, { align: 'right' });
        yContato += 4;
      });

      separador([11, 31, 77]);
      y += 2;
    }

    // ── TÍTULO ──
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.setTextColor(11, 31, 77);
    doc.text('MEMÓRIA DE CÁLCULO — EXCLUSÃO ICMS', margem, y); y += 6;

    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('RE 574.706 · STF Tema 69 · A Tese do Século', margem, y); y += 8;

    // ── IDENTIFICAÇÃO ──
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margem, y, W - margem * 2, 28, 2, 2, 'F');
    y += 5;

    const cols = [
      ['Contribuinte', clienteParaPDF?.razao_social || '—'],
      ['CNPJ', clienteParaPDF?.cnpj || '—'],
      ['Regime', clienteParaPDF?.regime || '—'],
      ['Data do Parecer', new Date().toLocaleDateString('pt-BR')],
    ];
    cols.forEach(([label, valor]) => {
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
      doc.text(label.toUpperCase(), margem + 4, y);
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
      doc.text(valor, margem + 4, y + 4);
      y += 0;
    });
    // grade 2x2
    y -= 8;
    const colW = (W - margem * 2) / 2;
    cols.forEach(([label, valor], idx) => {
      const cx = margem + 4 + (idx % 2) * colW;
      const cy = y + Math.floor(idx / 2) * 10;
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
      doc.text(label.toUpperCase(), cx, cy);
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
      doc.text(valor, cx, cy + 4);
    });
    y += 22;

    // ── RESUMO GERAL ──
    const totCredito = notasParaPDF.reduce((s, n) => s + n.creditoTotal, 0);
    const totPIS     = notasParaPDF.reduce((s, n) => s + n.creditoPIS, 0);
    const totCOFINS  = notasParaPDF.reduce((s, n) => s + n.creditoCOFINS, 0);
    const totICMS    = notasParaPDF.reduce((s, n) => s + n.vICMS, 0);
    const totNF      = notasParaPDF.reduce((s, n) => s + n.vNF, 0);

    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margem, y, W - margem * 2, 22, 2, 2, 'F');
    doc.setDrawColor(134, 239, 172);
    doc.roundedRect(margem, y, W - margem * 2, 22, 2, 2, 'S');
    y += 5;

    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 163, 74);
    doc.text('CRÉDITO TOTAL RECUPERÁVEL', margem + 4, y);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 163, 74);
    doc.text(formatBRL(totCredito), W - margem, y + 5, { align: 'right' });

    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
    doc.text(`PIS: ${formatBRL(totPIS)}`, margem + 4, y + 8);
    doc.text(`COFINS: ${formatBRL(totCOFINS)}`, margem + 40, y + 8);
    doc.text(`ICMS excluído: ${formatBRL(totICMS)}`, margem + 85, y + 8);
    doc.text(`Total NFs: ${formatBRL(totNF)}`, margem + 140, y + 8);
    y += 18;

    separador();

    // ── NOTA POR NOTA ──
    for (let idx = 0; idx < notasParaPDF.length; idx++) {
    const n = notasParaPDF[idx];
      checarPagina(70);

      // Cabeçalho da NF
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(margem, y, W - margem * 2, 8, 1, 1, 'F');
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
      doc.text(`NF ${n.nNF}`, margem + 3, y + 5.5);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
      doc.text(`${n.dataEmissao}   |   ${n.nomeEmit}   |   Competência: ${n.competencia}`, margem + 25, y + 5.5);
      y += 11;

      // Bloco APURAÇÃO DA BASE
      doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(11, 31, 77);
      doc.text('APURAÇÃO DA BASE', margem + 2, y); y += 4;

      blocoKV('① Valor total da NF', formatBRL(n.vNF));
      blocoKV('② ICMS indevido na base de cálculo', `− ${formatBRL(n.vICMS)}`, [234, 88, 12]);

      // Linha resultado base
      checarPagina(7);
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3);
      doc.line(margem + 2, y, W - margem, y); y += 3;
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
      doc.text('③ Base correta (① − ②)', margem + 4, y);
      doc.text(formatBRL(n.baseSemICMS), W - margem, y, { align: 'right' });
      y += 7;

      // Bloco PIS
      checarPagina(30);
      doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
      doc.text('APURAÇÃO DO PIS', margem + 2, y); y += 4;

      blocoKV('④ Alíquota PIS efetiva', formatPct(n.aliqPIS));
      blocoKV('⑤ PIS recolhido sobre base original (① × ④)', formatBRL(n.vPIS));
      blocoKV('⑥ PIS correto sobre base correta (③ × ④)', formatBRL(n.pisCorreto));

      checarPagina(7);
      doc.setDrawColor(191, 219, 254); doc.line(margem + 2, y, W - margem, y); y += 3;
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
      doc.text('⑦ Crédito PIS recuperável (⑤ − ⑥)', margem + 4, y);
      doc.setTextColor(22, 163, 74);
      doc.text(formatBRL(n.creditoPIS), W - margem, y, { align: 'right' });
      y += 7;

      // Bloco COFINS
      checarPagina(30);
      doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(11, 31, 77);
      doc.text('APURAÇÃO DA COFINS', margem + 2, y); y += 4;

      blocoKV('⑧ Alíquota COFINS efetiva', formatPct(n.aliqCOFINS));
      blocoKV('⑨ COFINS recolhido sobre base original (① × ⑧)', formatBRL(n.vCOFINS));
      blocoKV('⑩ COFINS correto sobre base correta (③ × ⑧)', formatBRL(n.cofinsCorreto));

      checarPagina(7);
      doc.setDrawColor(165, 180, 252); doc.line(margem + 2, y, W - margem, y); y += 3;
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(11, 31, 77);
      doc.text('⑪ Crédito COFINS recuperável (⑨ − ⑩)', margem + 4, y);
      doc.setTextColor(22, 163, 74);
      doc.text(formatBRL(n.creditoCOFINS), W - margem, y, { align: 'right' });
      y += 7;

      // TOTAL da NF
      checarPagina(12);
      doc.setFillColor(11, 31, 77);
      doc.roundedRect(margem, y, W - margem * 2, 10, 1, 1, 'F');
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(147, 197, 253);
      doc.text('⑫ TOTAL RECUPERÁVEL DESTA NF (⑦ + ⑪)', margem + 4, y + 6.5);
      doc.setFontSize(11); doc.setTextColor(110, 231, 183);
      doc.text(formatBRL(n.creditoTotal), W - margem, y + 6.5, { align: 'right' });
      y += 14;

      // Fundamento
      doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(148, 163, 184);
      doc.text('Fundamento: RE 574.706 · STF Tema 69 · CF/88 art. 195, I, b', margem + 2, y);
      y += 8;

      // Separador entre notas
      if (idx < notasParaPDF.length - 1) {
        checarPagina(4);
        doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.5);
        doc.line(margem, y, W - margem, y);
        y += 6;
      }
	  
	  await new Promise(r => setTimeout(r, 0));
     }
    // ── TOTAL GERAL ──
    checarPagina(20);
    doc.setFillColor(11, 31, 77);
    doc.roundedRect(margem, y, W - margem * 2, 16, 2, 2, 'F');
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('TOTAL GERAL RECUPERÁVEL', margem + 4, y + 10);
    doc.setFontSize(14); doc.setTextColor(110, 231, 183);
    doc.text(formatBRL(totCredito), W - margem, y + 10, { align: 'right' });
    y += 20;

    // ── DISCLAIMER ──
    checarPagina(16);
    doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(220, 38, 38);
    const disclaimer = 'Aviso Legal: Este parecer tem caráter diagnóstico e informativo. Não substitui análise de contador (CRC) ou advogado tributarista (OAB). A decisão de aproveitamento de créditos é de exclusiva responsabilidade do profissional responsável pelo contribuinte. e-FiscalTribe® — Zenthor Consultoria & BPO · ' + new Date().toLocaleDateString('pt-BR');
    const linhasDisclaimer = doc.splitTextToSize(disclaimer, W - margem * 2);
    doc.text(linhasDisclaimer, margem, y);

    doc.save(nomeArquivo + '.pdf');
    return;
  }

  // Fallback — screenshot para outras abas
  const el = document.getElementById(elementId);
  if (!el) return;
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = (canvas.height * pdfW) / canvas.width;
  let posY = 0;
  const pageH = pdf.internal.pageSize.getHeight();
  while (posY < pdfH) {
    pdf.addImage(imgData, 'PNG', 0, -posY, pdfW, pdfH);
    posY += pageH;
    if (posY < pdfH) pdf.addPage();
  }
  pdf.save(nomeArquivo + '.pdf');
}

function imprimirElemento(elementId, titulo) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const conteudo = el.innerHTML;
  const janela = window.open('', '_blank');
  janela.document.write(`
    <html><head><title>${titulo}</title>
    <style>
      body { font-family: Inter, sans-serif; padding: 20px; color: #0F172A; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background: #4B5563; color: #fff; padding: 8px 10px; text-align: left; }
      td { padding: 7px 10px; border-bottom: 1px solid #E2E8F0; }
      tr:nth-child(even) { background: #F8FAFC; }
      @media print { body { padding: 0; } }
    </style>
    </head><body>${conteudo}</body></html>
  `);
  janela.document.close();
  janela.focus();
  setTimeout(() => { janela.print(); }, 500);
}

// ── Memória de Cálculo ─────────────────────────────────────────────────────
function MemoriaCalculo({ n }) {
  return (
    <div style={{ background: 'linear-gradient(135deg,#EFF6FF,#F0FDF4)', borderLeft: `4px solid ${S.blue}`, padding: '20px 24px' }}>
      <div style={{ fontWeight: 800, color: S.navy, fontSize: 14, marginBottom: 16 }}>
        📐 Memória de Cálculo
        <span style={{ fontSize: 11, fontWeight: 400, color: S.ghost, marginLeft: 10 }}>NF {n.nNF} · {n.nomeEmit} · {n.dataEmissao}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 14 }}>
        <div style={{ background: S.white, borderRadius: 10, padding: '14px 16px', border: `1px solid ${S.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: S.navy, letterSpacing: 1, marginBottom: 10 }}>APURAÇÃO DA BASE</div>
          {[
            { label: '① Valor total da NF', value: formatBRL(n.vNF), color: S.text },
            { label: '② ICMS indevido na base', value: `− ${formatBRL(n.vICMS)}`, color: S.orange },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
              <span style={{ fontSize: 11, color: S.muted }}>{item.label}</span>
              <span style={{ fontWeight: 600, color: item.color, whiteSpace: 'nowrap' }}>{item.value}</span>
            </div>
          ))}
          <div style={{ borderTop: `2px solid ${S.border}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: S.blue }}>③ Base correta (①−②)</span>
            <span style={{ fontWeight: 800, color: S.blue, fontSize: 14, whiteSpace: 'nowrap' }}>{formatBRL(n.baseSemICMS)}</span>
          </div>
        </div>
        <div style={{ background: S.white, borderRadius: 10, padding: '14px 16px', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: S.blue, letterSpacing: 1, marginBottom: 10 }}>APURAÇÃO DO PIS</div>
          {[
            { label: '④ Alíquota PIS efetiva', value: formatPct(n.aliqPIS) },
            { label: '⑤ PIS recolhido (①×④)', value: formatBRL(n.vPIS) },
            { label: '⑥ PIS correto (③×④)', value: formatBRL(n.pisCorreto) },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
              <span style={{ fontSize: 11, color: S.muted }}>{item.label}</span>
              <span style={{ fontWeight: 600, color: S.muted, whiteSpace: 'nowrap' }}>{item.value}</span>
            </div>
          ))}
          <div style={{ borderTop: '2px solid #bfdbfe', paddingTop: 8, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: S.blue }}>⑦ Crédito PIS (⑤−⑥)</span>
            <span style={{ fontWeight: 800, color: S.green, fontSize: 14, whiteSpace: 'nowrap' }}>{formatBRL(n.creditoPIS)}</span>
          </div>
        </div>
        <div style={{ background: S.white, borderRadius: 10, padding: '14px 16px', border: '1px solid #a5b4fc' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: S.navy, letterSpacing: 1, marginBottom: 10 }}>APURAÇÃO DA COFINS</div>
          {[
            { label: '⑧ Alíquota COFINS efetiva', value: formatPct(n.aliqCOFINS) },
            { label: '⑨ COFINS recolhido (①×⑧)', value: formatBRL(n.vCOFINS) },
            { label: '⑩ COFINS correto (③×⑧)', value: formatBRL(n.cofinsCorreto) },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
              <span style={{ fontSize: 11, color: S.muted }}>{item.label}</span>
              <span style={{ fontWeight: 600, color: S.muted, whiteSpace: 'nowrap' }}>{item.value}</span>
            </div>
          ))}
          <div style={{ borderTop: '2px solid #a5b4fc', paddingTop: 8, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: S.navy }}>⑪ Crédito COFINS (⑨−⑩)</span>
            <span style={{ fontWeight: 800, color: S.green, fontSize: 14, whiteSpace: 'nowrap' }}>{formatBRL(n.creditoCOFINS)}</span>
          </div>
        </div>
      </div>
      <div style={{ background: S.navy, borderRadius: 10, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: '#93c5fd', fontWeight: 700, letterSpacing: 1 }}>⑫ TOTAL RECUPERÁVEL DESTA NF (⑦+⑪)</div>
          <div style={{ fontSize: 10, color: '#64748B', marginTop: 3 }}>RE 574.706 · STF Tema 69 · CF/88 art. 195, I, b</div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#6EE7B7' }}>{formatBRL(n.creditoTotal)}</div>
      </div>
    </div>
  );
}

// ── Relatório Profissional ─────────────────────────────────────────────────
function RelatorioProfissional({ notas, cliente, perfil }) {
  const competencias = agruparPorCompetencia(notas);
  const totalCredito = notas.reduce((s, n) => s + n.creditoTotal,  0);
  const totalPIS     = notas.reduce((s, n) => s + n.creditoPIS,    0);
  const totalCOFINS  = notas.reduce((s, n) => s + n.creditoCOFINS, 0);
  const totalICMS    = notas.reduce((s, n) => s + n.vICMS,         0);
  const totalNF      = notas.reduce((s, n) => s + n.vNF,           0);
  const [expandida, setExpandida] = useState(null);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: S.text }}>

      {/* CABEÇALHO CLEAN — sem banner navy */}
      <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            {perfil?.logo_url
              ? <img src={perfil.logo_url} alt="Logo" style={{ height: 56, objectFit: 'contain', borderRadius: 8, marginBottom: 8 }} />
              : <div style={{ height: 56, width: 160, background: S.bg, borderRadius: 8, border: `2px dashed ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <span style={{ color: S.ghost, fontSize: 11 }}>Logo do Escritório</span>
                </div>
            }
            {perfil?.nome_escritorio && <div style={{ fontWeight: 700, fontSize: 16, color: S.navy }}>{perfil.nome_escritorio}</div>}
            {perfil?.crc            && <div style={{ fontSize: 12, color: S.ghost, marginTop: 2 }}>{perfil.crc}</div>}
            {perfil?.responsavel    && <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>{perfil.responsavel}</div>}
          </div>
          <div style={{ textAlign: 'right', fontSize: 12 }}>
            {perfil?.endereco && <div style={{ color: S.muted, marginBottom: 3 }}>📍 {perfil.endereco}</div>}
            {perfil?.telefone && <div style={{ color: S.muted, marginBottom: 3 }}>📞 {perfil.telefone}</div>}
            {perfil?.whatsapp && <div style={{ color: S.muted, marginBottom: 3 }}>💬 {perfil.whatsapp}</div>}
            {perfil?.email    && <div style={{ color: S.muted, marginBottom: 3 }}>✉️ {perfil.email}</div>}
            {perfil?.site     && <div style={{ color: S.muted }}>🌐 {perfil.site}</div>}
          </div>
        </div>

        <div style={{ borderTop: `2px solid ${S.navy}`, paddingTop: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: S.navy, letterSpacing: 2, marginBottom: 6 }}>PARECER TÉCNICO TRIBUTÁRIO</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: S.navy, marginBottom: 4 }}>Exclusão do ICMS da Base de Cálculo do PIS e da COFINS</div>
          <div style={{ fontSize: 13, color: S.ghost, marginBottom: 20 }}>RE 574.706 · STF Tema 69 · A Tese do Século</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            {[
              { label: 'CONTRIBUINTE',    value: cliente?.razao_social || '—' },
              { label: 'CNPJ',            value: cliente?.cnpj || '—' },
              { label: 'REGIME',          value: cliente?.regime || '—' },
              { label: 'PERÍODO',         value: competencias.length > 0 ? `${competencias[0].competencia} a ${competencias[competencias.length-1].competencia}` : '—' },
              { label: 'NF-e ANALISADAS', value: notas.length },
              { label: 'DATA DO PARECER', value: hoje() },
            ].map(item => (
              <div key={item.label} style={{ background: S.bg, borderRadius: 8, padding: '10px 12px', border: `1px solid ${S.border}` }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: S.ghost, letterSpacing: 1.5, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: S.text }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RESUMO EXECUTIVO */}
      <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 4, height: 24, background: S.green, borderRadius: 2 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: S.navy }}>Resumo Executivo</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'CRÉDITO TOTAL', value: formatBRL(totalCredito), color: S.green, bg: '#F0FDF4', border: '#86efac' },
            { label: 'CRÉDITO PIS',   value: formatBRL(totalPIS),     color: S.blue,  bg: '#EFF6FF', border: '#bfdbfe' },
            { label: 'CRÉDITO COFINS',value: formatBRL(totalCOFINS),  color: S.navy,  bg: '#EFF6FF', border: '#bfdbfe' },
            { label: 'ICMS EXCLUÍDO', value: formatBRL(totalICMS),    color: S.orange,bg: '#FFF7ED', border: '#fed7aa' },
          ].map(k => (
            <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: k.color, letterSpacing: 1.5, marginBottom: 5 }}>{k.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: S.muted, lineHeight: 1.9, background: S.bg, borderRadius: 8, padding: '12px 16px' }}>
          A análise de <strong style={{ color: S.text }}>{notas.length} notas fiscais de saída</strong> identificou que o ICMS de{' '}
          <strong style={{ color: S.orange }}>{formatBRL(totalICMS)}</strong> foi indevidamente incluído na base do PIS/COFINS,
          contrariando o RE 574.706 (Tema 69) do STF. O crédito recuperável totaliza{' '}
          <strong style={{ color: S.green }}>{formatBRL(totalCredito)}</strong> — sendo{' '}
          <strong>{formatBRL(totalPIS)}</strong> de PIS e <strong>{formatBRL(totalCOFINS)}</strong> de COFINS —
          sobre <strong>{formatBRL(totalNF)}</strong> em {competencias.length} competências analisadas.
        </div>
      </div>

      {/* FUNDAMENTAÇÃO LEGAL */}
      <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 4, height: 24, background: S.blue, borderRadius: 2 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: S.navy }}>Fundamentação Legal</div>
        </div>
        {[
          { norma: 'RE 574.706 / STF Tema 69',  tipo: 'STF — REPERCUSSÃO GERAL', cor: S.green, desc: 'O ICMS não compõe a base de cálculo do PIS e da COFINS. Decisão vinculante para todos os contribuintes e órgãos da Administração Pública.' },
          { norma: 'ADC 49 — Modulação',         tipo: 'STF — MODULAÇÃO',         cor: S.blue,  desc: 'Efeitos a partir de 15/03/2017, ressalvados contribuintes com ação judicial ou administrativa já ajuizada anteriormente.' },
          { norma: 'Lei 10.637/2002',             tipo: 'LEGISLAÇÃO FEDERAL',      cor: S.navy,  desc: 'PIS não-cumulativo — base de cálculo é o faturamento/receita bruta, sem inclusão de tributos de terceiros.' },
          { norma: 'Lei 10.833/2003',             tipo: 'LEGISLAÇÃO FEDERAL',      cor: S.navy,  desc: 'COFINS não-cumulativa — mesma base de cálculo do PIS, excluindo tributos de terceiros.' },
          { norma: 'IN RFB 2.055/2021',           tipo: 'INSTRUÇÃO NORMATIVA',     cor: S.muted, desc: 'Regulamenta restituição e compensação via PER/DCOMP perante a Receita Federal.' },
          { norma: 'CTN art. 168 / LC 118/2005',  tipo: 'PRAZO PRESCRICIONAL',     cor: S.red,   desc: 'Prazo de 5 anos para restituição ou compensação, contados do pagamento indevido.' },
        ].map(item => (
          <div key={item.norma} style={{ display: 'flex', marginBottom: 10, background: S.bg, borderRadius: 10, overflow: 'hidden', border: `1px solid ${S.border}` }}>
            <div style={{ width: 4, background: item.cor, flexShrink: 0 }} />
            <div style={{ padding: '10px 14px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: item.cor }}>{item.norma}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: item.cor, background: `${item.cor}15`, padding: '2px 7px', borderRadius: 20 }}>{item.tipo}</span>
              </div>
              <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* APURAÇÃO POR COMPETÊNCIA */}
      <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 4, height: 24, background: S.orange, borderRadius: 2 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: S.navy }}>Apuração por Competência</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: S.navy }}>
                {['Competência','NF-es','Valor Total','ICMS Excluído','Base s/ ICMS','PIS Pago','PIS Correto','Créd. PIS','COFINS Pago','COFINS Correto','Créd. COFINS','TOTAL'].map(h => (
                  <th key={h} style={{ color: '#fff', padding: '9px 10px', textAlign: h === 'Competência' ? 'left' : 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {competencias.map((c, i) => (
                <tr key={c.competencia} style={{ background: i % 2 === 0 ? S.bg : S.white, borderBottom: `1px solid ${S.border}` }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: S.blue }}>{c.competencia}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: S.muted }}>{c.qtdNF}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.vNF)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: S.orange, fontWeight: 600 }}>{formatBRL(c.vICMS)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.baseSemICMS)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.vPIS)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.pisCorreto)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(c.creditoPIS)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.vCOFINS)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.cofinsCorreto)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(c.creditoCOFINS)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: S.green, fontWeight: 700 }}>{formatBRL(c.creditoTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: S.navy }}>
                <td style={{ padding: '9px 10px', color: '#fff', fontWeight: 700 }}>TOTAL</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: '#CBD5E1' }}>{notas.length}</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: '#CBD5E1' }}>{formatBRL(totalNF)}</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: '#FED7AA', fontWeight: 700 }}>{formatBRL(totalICMS)}</td>
                <td /><td /><td />
                <td style={{ padding: '9px 10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(totalPIS)}</td>
                <td /><td />
                <td style={{ padding: '9px 10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(totalCOFINS)}</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(totalCredito)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* MEMÓRIA DE CÁLCULO NO RELATÓRIO */}
      <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 4, height: 24, background: S.navy, borderRadius: 2 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: S.navy }}>Memória de Cálculo — Nota por Nota</div>
          <span style={{ fontSize: 11, color: S.ghost }}>Clique para expandir</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: S.tableHeader }}>
                {['','NF','Data','Emitente','Valor NF','ICMS','Base s/ ICMS','Créd. PIS','Créd. COFINS','Total'].map(h => (
                  <th key={h} style={{ color: '#fff', padding: '9px 10px', textAlign: ['','NF','Data','Emitente'].includes(h) ? 'left' : 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {notas.map((n, i) => {
                const key    = 'rel_' + n.nNF + n.dataEmissao + n.cnpjEmit;
                const aberta = expandida === key;
                return (
                  <>
                    <tr key={key} onClick={() => setExpandida(aberta ? null : key)}
                      style={{ background: aberta ? '#EFF6FF' : i % 2 === 0 ? S.bg : S.white, cursor: 'pointer', borderBottom: `1px solid ${S.border}` }}>
                      <td style={{ padding: '7px 6px', textAlign: 'center', color: S.ghost, fontSize: 10 }}>{aberta ? '▼' : '▶'}</td>
                      <td style={{ padding: '7px 10px', fontWeight: 600, color: S.text }}>{n.nNF}</td>
                      <td style={{ padding: '7px 10px', color: S.muted, whiteSpace: 'nowrap' }}>{n.dataEmissao}</td>
                      <td style={{ padding: '7px 10px', color: S.muted, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.nomeEmit}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(n.vNF)}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: S.orange, fontWeight: 600 }}>{formatBRL(n.vICMS)}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(n.baseSemICMS)}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(n.creditoPIS)}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(n.creditoCOFINS)}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: S.green, fontWeight: 700 }}>{formatBRL(n.creditoTotal)}</td>
                    </tr>
                    {aberta && (
                      <tr key={key + '_d'}>
                        <td colSpan={10} style={{ padding: 0 }}>
                          <MemoriaCalculo n={n} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRÓXIMOS PASSOS */}
      <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 4, height: 24, background: S.green, borderRadius: 2 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: S.navy }}>Próximos Passos</div>
        </div>
        <div style={{ fontSize: 11, color: S.orange, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '9px 12px', marginBottom: 14 }}>
          ⚠️ Os procedimentos variam conforme o regime. Confirme com o profissional responsável antes de executar.
        </div>
        {[
          { regime: 'Lucro Presumido', color: S.blue,  bg: '#EFF6FF', border: '#bfdbfe', passos: [
            { n: '01', t: 'Retificar EFD-Contribuições', d: 'Excluir o ICMS da base de PIS/COFINS em cada competência conforme este parecer.' },
            { n: '02', t: 'Apurar o Crédito',            d: 'Calcular diferença entre PIS/COFINS recolhido e o devido sobre a base correta.' },
            { n: '03', t: 'Gerar PER/DCOMP',             d: 'Protocolar via e-CAC com certificado digital habilitado.' },
            { n: '04', t: 'Aguardar Homologação',        d: 'Prazo médio: 30 a 360 dias. Manter documentação para eventual diligência.' },
            { n: '05', t: 'Arquivar Memória',            d: 'Guardar este parecer e XMLs por 5 anos para defesa em eventual CARF.' },
          ]},
          { regime: 'Lucro Real', color: S.navy, bg: '#F5F3FF', border: '#c4b5fd', passos: [
            { n: '01', t: 'Retificar EFD-Contribuições', d: 'Excluir ICMS da base. Verificar impacto no LALUR e LACS.' },
            { n: '02', t: 'Ajustar IRPJ/CSLL',           d: 'Avaliar impacto na apuração do lucro real e ajustar se necessário.' },
            { n: '03', t: 'Gerar PER/DCOMP',             d: 'Protocolar via e-CAC. Créditos podem ser compensados com outros tributos.' },
            { n: '04', t: 'Arquivar Documentação',       d: 'Acompanhar despacho decisório e manter documentação arquivada.' },
          ]},
          { regime: 'Simples Nacional', color: S.green, bg: '#F0FDF4', border: '#86efac', passos: [
            { n: '01', t: 'Avaliar Viabilidade',         d: 'Aproveitamento direto é mais restrito. Avaliar com advogado tributarista.' },
            { n: '02', t: 'Verificar PGDAS-D',           d: 'Verificar valores de PIS/COFINS segregados que permitam a tese.' },
            { n: '03', t: 'Considerar Ação Judicial',    d: 'Mandado de segurança é a via mais comum para o Simples Nacional.' },
            { n: '04', t: 'Arquivar Documentação',       d: 'Manter parecer e XMLs como fundamento para eventual ação.' },
          ]},
        ].map(bloco => (
          <div key={bloco.regime} style={{ background: bloco.bg, border: `1px solid ${bloco.border}`, borderRadius: 10, padding: '14px 18px', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: bloco.color, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${bloco.border}` }}>{bloco.regime}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bloco.passos.map(p => (
                <div key={p.n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: bloco.color, color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{p.n}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: bloco.color, marginBottom: 2 }}>{p.t}</div>
                    <div style={{ fontSize: 11, color: S.muted, lineHeight: 1.6 }}>{p.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* DISCLAIMER */}
      <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 18, flexShrink: 0 }}>⚖️</div>
        <div style={{ fontSize: 11, color: S.ghost, lineHeight: 1.8 }}>
          <strong style={{ color: S.red }}>Aviso Legal:</strong> Parecer de caráter diagnóstico e informativo. Não substitui análise
          de contador (CRC) ou advogado tributarista (OAB). Aproveitamento de créditos e retificação de obrigações são de
          exclusiva responsabilidade do profissional responsável.{' '}
          {perfil?.nome_escritorio && `${perfil.nome_escritorio} · `}
          e-FiscalTribe® — Zenthor Consultoria &amp; BPO · {hoje()}.
        </div>
      </div>
    </div>
  );
}

// ── Componente Principal ───────────────────────────────────────────────────
export default function ExclusaoICMS({ cliente }) {
  const [notas, setNotas]             = useState([]);
  const [erros, setErros]             = useState([]);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso]     = useState({ atual: 0, total: 0, loteAtual: 0, totalLotes: 0 });
  const [tamLote, setTamLote]         = useState(100);
  const [aba, setAba]                 = useState('competencia');
  const [expandida, setExpandida]     = useState(null);
  const [busca, setBusca]             = useState('');
  const [pagina, setPagina]           = useState(1);
  const [porPagina, setPorPagina]     = useState(25);
  const [perfil, setPerfil]           = useState(null);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [perfilForm, setPerfilForm]   = useState({});
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [historico, setHistorico]     = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [salvando, setSalvando]       = useState(false);
  const [abaHistorico, setAbaHistorico] = useState(false);
  const [gerandoPDF, setGerandoPDF]   = useState(false);
  const inputRef = useRef();
  const logoRef  = useRef();

  useEffect(() => { carregarPerfil(); carregarHistorico(); }, []);

  async function carregarPerfil() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('perfil_escritorio').select('*').eq('usuario_id', user.id).single();
    if (data) { setPerfil(data); setPerfilForm(data); }
  }

  async function carregarHistorico() {
	await new Promise(r => setTimeout(r, 800));
    setCarregandoHistorico(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCarregandoHistorico(false); return; }
    const { data } = await supabase.from('diagnosticos_exclusao_icms')
      .select('*').eq('usuario_id', user.id).order('created_at', { ascending: false });
    setHistorico(data || []);
    setCarregandoHistorico(false);
  }

  async function salvarPerfil() {
    setSalvandoPerfil(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { ...perfilForm, usuario_id: user.id, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('perfil_escritorio').upsert(payload, { onConflict: 'usuario_id' }).select().single();
    if (!error && data) { setPerfil(data); setEditandoPerfil(false); }
    setSalvandoPerfil(false);
  }

  async function uploadLogo(file) {
    const { data: { user } } = await supabase.auth.getUser();
    const ext  = file.name.split('.').pop();
    const path = `${user.id}/logo.${ext}`;
    const { error } = await supabase.storage.from('logos-escritorio').upload(path, file, { upsert: true });
    if (error) return;
    const { data: urlData } = supabase.storage.from('logos-escritorio').getPublicUrl(path);
    setPerfilForm(p => ({ ...p, logo_url: urlData.publicUrl }));
  }

  async function salvarDiagnostico() {
    if (!notas.length) return;
    setSalvando(true);
    const { data: { user } } = await supabase.auth.getUser();
    const comps = agruparPorCompetencia(notas);
    const { error } = await supabase.from('diagnosticos_exclusao_icms').insert([{
      usuario_id:     user.id,
      cliente_id:     cliente?.id?.toString() || null,
      nome_cliente:   cliente?.razao_social || '',
      cnpj_cliente:   cliente?.cnpj || '',
      regime:         cliente?.regime || '',
      periodo_inicio: comps[0]?.competencia || '',
      periodo_fim:    comps[comps.length - 1]?.competencia || '',
      total_nfs:      notas.length,
      total_icms:     notas.reduce((s, n) => s + n.vICMS, 0),
      total_pis:      notas.reduce((s, n) => s + n.creditoPIS, 0),
      total_cofins:   notas.reduce((s, n) => s + n.creditoCOFINS, 0),
      total_credito:  notas.reduce((s, n) => s + n.creditoTotal, 0),
      resultado_json: { notas, competencias: comps },
    }]);
    if (error) { alert('Erro ao salvar: ' + error.message); }
    else { alert('Diagnóstico salvo com sucesso!'); await carregarHistorico(); }
    setSalvando(false);
  }

  async function excluirDiagnostico(id) {
    if (!window.confirm('Excluir este diagnóstico do histórico?')) return;
    await supabase.from('diagnosticos_exclusao_icms').delete().eq('id', id);
    setHistorico(h => h.filter(d => d.id !== id));
  }

  function abrirDiagnostico(diag) {
    setNotas(diag.resultado_json?.notas || []);
    setAbaHistorico(false);
    setAba('competencia');
  }

  async function handleExportarPDF(elementId, nome) {
    setGerandoPDF(true);
    try { await exportarPDF(elementId, nome); }
    finally { setGerandoPDF(false); }
  }

  const processarArquivos = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    const xmlFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.xml'));
    if (xmlFiles.length === 0) return;
    setProcessando(true); setNotas([]); setErros([]); setPagina(1); setExpandida(null);
    const totalLotes = Math.ceil(xmlFiles.length / tamLote);
    setProgresso({ atual: 0, total: xmlFiles.length, loteAtual: 0, totalLotes });
    const resultados = [], falhas = [];
    for (let i = 0; i < xmlFiles.length; i += tamLote) {
      const lote    = xmlFiles.slice(i, i + tamLote);
      const loteNum = Math.floor(i / tamLote) + 1;
      await Promise.all(lote.map(async (file) => {
        try {
          const nota = parsearXMLNFe(await file.text());
          if (nota) resultados.push({ ...nota, arquivo: file.name });
          else falhas.push(file.name);
        } catch { falhas.push(file.name); }
      }));
      setProgresso({ atual: Math.min(i + tamLote, xmlFiles.length), total: xmlFiles.length, loteAtual: loteNum, totalLotes });
      await new Promise(r => setTimeout(r, 30));
    }
    resultados.sort((a, b) => a.dataEmissao.localeCompare(b.dataEmissao));
    setNotas(resultados); setErros(falhas); setProcessando(false);
  }, [tamLote]);

  const exportarCSV = () => {
    const csv = [
      ['NF','Data','Competência','Emitente','Valor NF','ICMS','Base s/ ICMS','Alíq PIS','PIS Pago','PIS Correto','Créd PIS','Alíq COFINS','COFINS Pago','COFINS Correto','Créd COFINS','Total'],
      ...notas.map(n => [n.nNF, n.dataEmissao, n.competencia, n.nomeEmit, n.vNF.toFixed(2), n.vICMS.toFixed(2), n.baseSemICMS.toFixed(2), (n.aliqPIS*100).toFixed(4), n.vPIS.toFixed(2), n.pisCorreto.toFixed(2), n.creditoPIS.toFixed(2), (n.aliqCOFINS*100).toFixed(4), n.vCOFINS.toFixed(2), n.cofinsCorreto.toFixed(2), n.creditoCOFINS.toFixed(2), n.creditoTotal.toFixed(2)])
    ].map(r => r.join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `exclusao_icms_${cliente?.cnpj || 'cliente'}.csv`;
    a.click();
  };

  const competencias   = agruparPorCompetencia(notas);
  const totalCredito   = notas.reduce((s, n) => s + n.creditoTotal,  0);
  const totalPIS       = notas.reduce((s, n) => s + n.creditoPIS,    0);
  const totalCOFINS    = notas.reduce((s, n) => s + n.creditoCOFINS, 0);
  const totalICMS      = notas.reduce((s, n) => s + n.vICMS,         0);
  const totalNF        = notas.reduce((s, n) => s + n.vNF,           0);
  const temDados       = notas.length > 0;
  const pct            = progresso.total > 0 ? Math.round((progresso.atual / progresso.total) * 100) : 0;
  const notasFiltradas = notas.filter(n => !busca || n.nNF?.includes(busca) || n.nomeEmit?.toLowerCase().includes(busca.toLowerCase()) || n.competencia?.includes(busca));
  const totalPaginas   = Math.ceil(notasFiltradas.length / porPagina);
  const notasPagina    = notasFiltradas.slice((pagina - 1) * porPagina, pagina * porPagina);

  // botões de ação por aba
  function BotoesAba({ elementId, nomeArquivo }) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button onClick={() => imprimirElemento(elementId, nomeArquivo)}
          style={{ padding: '5px 11px', background: S.white, border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 11, color: S.muted, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          🖨️ Imprimir
        </button>
        <button onClick={() => handleExportarPDF(elementId, nomeArquivo)} disabled={gerandoPDF}
          style={{ padding: '5px 11px', background: S.navy, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', opacity: gerandoPDF ? 0.6 : 1 }}>
          {gerandoPDF ? '⏳ PDF...' : '📄 PDF'}
        </button>
      </div>
    );
  }

  // ── TELA PERFIL ──────────────────────────────────────────────────────────
  if (editandoPerfil) return (
    <div style={{ background: S.bg, minHeight: '100%', padding: 16, fontFamily: 'Inter, sans-serif' }}>
      <button onClick={() => setEditandoPerfil(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: S.white, border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 12, color: S.ghost, cursor: 'pointer', marginBottom: 20 }}>
        ← Voltar
      </button>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: S.navy, marginBottom: 4 }}>Perfil do Escritório</h2>
      <div style={{ fontSize: 12, color: S.ghost, marginBottom: 20 }}>Estas informações aparecem no cabeçalho do relatório.</div>

      <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: S.navy, marginBottom: 14 }}>Logo do Escritório</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {perfilForm.logo_url
            ? <img src={perfilForm.logo_url} alt="Logo" style={{ height: 64, objectFit: 'contain', borderRadius: 8, border: `1px solid ${S.border}` }} />
            : <div style={{ width: 120, height: 64, background: S.bg, borderRadius: 8, border: `2px dashed ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: S.ghost }}>Sem logo</span>
              </div>
          }
          <div>
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: S.blue, color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
    📁 Selecionar PNG
    <input ref={logoRef} type="file" accept=".png,.jpg,.jpeg" style={{ display: 'none' }}
      onChange={e => { if (e.target.files[0]) uploadLogo(e.target.files[0]); }} />
    </label>
    {(perfilForm.logo_url || perfil?.logo_url) && (
    <button onClick={() => { setPerfilForm(p => ({ ...p, logo_url: '' })); setPerfil(p => ({ ...p, logo_url: '' })); }}
      style={{ marginLeft: 10, padding: '8px 14px', background: '#FEF2F2', color: S.red, border: `1px solid #FECACA`, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
      🗑 Remover Logo
      </button>
      )}
      <div style={{ fontSize: 11, color: S.ghost, marginTop: 6 }}>PNG, JPG — fundo transparente recomendado</div>
       </div>
        </div>
      </div>

      <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: S.navy, marginBottom: 14 }}>Dados do Escritório</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {[
       ['nome_escritorio', 'Nome do Escritório / Empresa',  'Ex: Zenthor Consultoria & BPO'],
       ['responsavel',     'Nome do Responsável',            'Ex: Dr. João Silva'],
       ['crc',             'CRC / OAB',                     'Ex: CRC-SP 123456/O-1'],
       ['endereco',        'Endereço Completo',              'Ex: Rua das Flores, 123 — São Paulo/SP'],
       ['telefone',        'Telefone',                      'Ex: (11) 99999-9999'],
       ['whatsapp',        'WhatsApp',                      'Ex: (11) 99999-9999'],
       ['email',           'E-mail',                        'Ex: contato@escritorio.com.br'],
       ['site',            'Site',                          'Ex: www.escritorio.com.br'],
       ].map(([key, label, placeholder]) => (
       <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
       <label style={{ fontSize: 11, fontWeight: 600, color: S.muted }}>{label}</label>
       <input
      value={perfilForm[key] || ''}
      onChange={e => setPerfilForm(p => ({ ...p, [key]: e.target.value }))}
      placeholder={placeholder}
      style={{ padding: '8px 12px', border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 13, color: S.text, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
      </div>
      ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={salvarPerfil} disabled={salvandoPerfil}
          style={{ padding: '9px 20px', background: S.blue, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {salvandoPerfil ? 'Salvando...' : '💾 Salvar Perfil'}
        </button>
        <button onClick={() => setEditandoPerfil(false)}
          style={{ padding: '9px 16px', background: S.white, border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 13, color: S.ghost, cursor: 'pointer' }}>
          Cancelar
        </button>
      </div>
    </div>
  );

  // ── TELA PRINCIPAL ───────────────────────────────────────────────────────
  return (
    <div style={{ background: S.bg, minHeight: '100%', padding: 16, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>

      {/* CABEÇALHO */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: S.text, margin: 0, marginBottom: 4 }}>Exclusão ICMS — Base PIS/COFINS</h1>
          <div style={{ fontSize: 12, color: S.ghost }}>
            RE 574.706 · STF Tema 69 · A Tese do Século
            {cliente && <span style={{ marginLeft: 8, color: S.blue, fontWeight: 600 }}>· {cliente.razao_social}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setEditandoPerfil(true)}
            style={{ padding: '7px 12px', background: S.white, border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 12, color: S.muted, cursor: 'pointer' }}>
            🏢 Perfil do Escritório
          </button>
          <button onClick={() => setAbaHistorico(h => !h)}
            style={{ padding: '7px 12px', background: abaHistorico ? S.navy : S.white, border: `1px solid ${abaHistorico ? S.navy : S.border}`, borderRadius: 7, fontSize: 12, color: abaHistorico ? '#fff' : S.muted, cursor: 'pointer' }}>
            📂 Histórico ({historico.length})
          </button>
          <button onClick={salvarDiagnostico} disabled={salvando || !temDados}
            style={{ padding: '7px 12px', background: temDados ? S.green : '#E2E8F0', color: temDados ? '#fff' : S.ghost, border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: temDados ? 'pointer' : 'default' }}>
            {salvando ? 'Salvando...' : '💾 Salvar'}
          </button>
          {temDados && (
            <button onClick={() => { setNotas([]); setErros([]); }}
              style={{ padding: '7px 12px', background: S.white, border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 12, color: S.ghost, cursor: 'pointer' }}>
              🗑 Limpar
            </button>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: S.blue, color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            📂 Importar XMLs
            <input ref={inputRef} type="file" accept=".xml" multiple style={{ display: 'none' }}
              onChange={e => processarArquivos(e.target.files)} />
          </label>
        </div>
      </div>

      {/* HISTÓRICO */}
      {abaHistorico && (
        <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: S.navy, marginBottom: 12 }}>📂 Histórico de Diagnósticos</div>
          {carregandoHistorico ? (
            <div style={{ overflowX: 'auto' }}>
              <SkeletonTabela colunas={['Data','Cliente','CNPJ','Período','NF-es','Crédito Total','Ações']} linhas={3} />
            </div>
          ) : historico.length === 0 ? (
            <div style={{ fontSize: 13, color: S.ghost, textAlign: 'center', padding: 24 }}>Nenhum diagnóstico salvo ainda.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: S.tableHeader }}>
                    {['Data','Cliente','CNPJ','Período','NF-es','Crédito Total','Ações'].map(h => (
                      <th key={h} style={{ color: '#fff', padding: '9px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historico.map((d, i) => (
                    <tr key={d.id} style={{ background: i % 2 === 0 ? S.bg : S.white, borderBottom: `1px solid ${S.border}` }}>
                      <td style={{ padding: '9px 12px', color: S.muted, whiteSpace: 'nowrap' }}>{new Date(d.created_at).toLocaleDateString('pt-BR')}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 600, color: S.text }}>{d.nome_cliente || '—'}</td>
                      <td style={{ padding: '9px 12px', color: S.muted }}>{d.cnpj_cliente || '—'}</td>
                      <td style={{ padding: '9px 12px', color: S.muted, whiteSpace: 'nowrap' }}>{d.periodo_inicio} a {d.periodo_fim}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center', color: S.muted }}>{d.total_nfs}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: S.green }}>{formatBRL(d.total_credito)}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => abrirDiagnostico(d)}
                            style={{ padding: '4px 10px', background: S.blue, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Abrir</button>
                          <button onClick={() => excluirDiagnostico(d.id)}
                            style={{ padding: '4px 10px', background: '#FEF2F2', color: S.red, border: `1px solid #FECACA`, borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DROP ZONE */}
      {!temDados && !processando && (
        <div onDrop={e => { e.preventDefault(); processarArquivos(e.dataTransfer.files); }}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          style={{ border: `2px dashed ${S.border}`, borderRadius: 12, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: S.white }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: S.text, marginBottom: 6 }}>Arraste os XMLs aqui ou clique para selecionar</div>
          <div style={{ fontSize: 12, color: S.ghost }}>Suporta centenas de arquivos em lote · Apenas NF-e de saída são processadas</div>
		  <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
         {[
          { valor: 50,  label: '50 NFs',  rec: 'PCs lentos' },
          { valor: 100, label: '100 NFs', rec: 'Recomendado' },
          { valor: 200, label: '200 NFs', rec: 'PCs modernos' },
          { valor: 500, label: '500 NFs', rec: 'PCs rápidos' },
          ].map(op => (
          <button key={op.valor} onClick={() => setTamLote(op.valor)}
         style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: tamLote === op.valor ? 700 : 400, cursor: 'pointer',
        border: `2px solid ${tamLote === op.valor ? S.blue : S.border}`,
        background: tamLote === op.valor ? '#EFF6FF' : S.white,
        color: tamLote === op.valor ? S.blue : S.ghost }}>
       {op.label}
       <span style={{ fontSize: 9, display: 'block', fontWeight: 400 }}>{op.rec}</span>
       </button>
       ))}
       </div>
        </div>
      )}

      {/* SKELETON PREVIEW */}
      {!temDados && !processando && (
        <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: `1px solid ${S.border}` }}>
            <SkeletonKPIs labels={['Crédito Total','Crédito PIS','Crédito COFINS','ICMS Excluído','NF-e Analisadas','Competências']} />
          </div>
          <div style={{ display: 'flex', borderBottom: `1px solid ${S.border}`, padding: '0 16px', overflowX: 'auto' }}>
            {['📅 Por Competência','📄 Por Nota Fiscal','📐 Memória de Cálculo','📋 Relatório Profissional'].map((t, i) => (
              <div key={t} style={{ padding: '11px 16px', fontSize: 12, color: i === 0 ? S.blue : S.ghost, borderBottom: i === 0 ? `2px solid ${S.blue}` : '2px solid transparent', fontWeight: i === 0 ? 700 : 400, whiteSpace: 'nowrap' }}>{t}</div>
            ))}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <SkeletonTabela colunas={['Competência','NF-es','Valor Total','ICMS Excluído','Base s/ ICMS','Créd. PIS','Créd. COFINS','Total']} linhas={5} />
          </div>
          <div style={{ padding: 14, textAlign: 'center', borderTop: `1px solid ${S.border}` }}>
            <span style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 500 }}>Aguardando importação de XMLs</span>
          </div>
        </div>
      )}

      {/* PROGRESSO */}
      {(processando || gerandoPDF) && (
  <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: S.navy }}>
        {gerandoPDF
          ? `📄 Gerando PDF — nota ${progressoPDF} de ${totalNotasPDF}`
          : `📥 Importando XMLs — lote ${progresso.loteAtual} de ${progresso.totalLotes}`}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: S.blue }}>
        {gerandoPDF
          ? `${totalNotasPDF > 0 ? Math.round((progressoPDF / totalNotasPDF) * 100) : 0}%`
          : `${pct}%`}
      </span>
    </div>
    <div style={{ background: S.border, borderRadius: 99, height: 10, overflow: 'hidden', marginBottom: 8 }}>
      <div style={{
        background: gerandoPDF
          ? `linear-gradient(90deg, ${S.blue}, ${S.green})`
          : S.blue,
        height: 10, borderRadius: 99,
        width: gerandoPDF
          ? `${totalNotasPDF > 0 ? (progressoPDF / totalNotasPDF) * 100 : 0}%`
          : `${pct}%`,
        transition: 'width 0.3s'
      }} />
    </div>
    <div style={{ fontSize: 11, color: S.ghost }}>
      {gerandoPDF
        ? `Processando memória de cálculo nota por nota...`
        : `${progresso.atual} de ${progresso.total} arquivos — lote de ${tamLote} NFs`}
    </div>
  </div>
)}

      {erros.length > 0 && (
        <div style={{ background: '#FFF7ED', border: `1px solid #FED7AA`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: S.orange }}>
          ⚠️ {erros.length} arquivo(s) ignorados — NF-e de entrada, sem ICMS ou formato inválido.
        </div>
      )}

      {/* KPIs */}
      {temDados && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Crédito Total',   value: formatBRL(totalCredito), color: S.green,  desc: 'PIS + COFINS pagos a maior' },
            { label: 'Crédito PIS',     value: formatBRL(totalPIS),     color: S.blue,   desc: 'PIS pago sobre base inflada' },
            { label: 'Crédito COFINS',  value: formatBRL(totalCOFINS),  color: S.navy,   desc: 'COFINS pago sobre base inflada' },
            { label: 'ICMS Excluído',   value: formatBRL(totalICMS),    color: S.orange, desc: 'Retirado da base' },
            { label: 'NF-e Analisadas', value: notas.length,            color: S.ghost,  desc: 'Notas processadas' },
            { label: 'Competências',    value: competencias.length,     color: S.ghost,  desc: 'Períodos cobertos' },
          ].map(k => (
            <div key={k.label} style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: S.ghost, marginBottom: 5 }}>{k.label}</div>
              <div style={{ fontSize: typeof k.value === 'number' ? 22 : 15, fontWeight: 700, color: k.color, marginBottom: 3 }}>{k.value}</div>
              <div style={{ fontSize: 10, color: S.ghost }}>{k.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* ABAS */}
      {temDados && (
        <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${S.border}`, overflowX: 'auto', alignItems: 'center' }}>
            {[
              { key: 'competencia', label: '📅 Por Competência' },
              { key: 'notas',       label: '📄 Por Nota Fiscal' },
              { key: 'memoria',     label: '📐 Memória de Cálculo' },
              { key: 'relatorio',   label: '📋 Relatório Profissional' },
            ].map(t => (
              <button key={t.key} onClick={() => setAba(t.key)}
                style={{ padding: '11px 16px', fontSize: 12, fontWeight: aba === t.key ? 700 : 400,
                  color: aba === t.key ? S.blue : S.ghost, background: 'none', border: 'none',
                  borderBottom: aba === t.key ? `2px solid ${S.blue}` : '2px solid transparent',
                  cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={exportarCSV}
              style={{ margin: '6px 6px', background: S.green, color: '#fff', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              ⬇ CSV
            </button>
          </div>

          {/* ABA — Por Competência */}
          {aba === 'competencia' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${S.border}` }}>
                <BotoesAba elementId="print-competencia" nomeArquivo={`competencia_${cliente?.cnpj || 'cliente'}`} />
              </div>
              <div id="print-competencia" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: S.tableHeader }}>
                      {['Competência','NF-es','Valor Total','ICMS Excluído','Base s/ ICMS','PIS Pago','PIS Correto','Créd. PIS','COFINS Pago','COFINS Correto','Créd. COFINS','Total'].map(h => (
                        <th key={h} style={{ color: '#fff', padding: '10px', textAlign: h === 'Competência' ? 'left' : 'right', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {competencias.map((c, i) => (
                      <tr key={c.competencia} onClick={() => { setAba('notas'); setBusca(c.competencia); setPagina(1); }}
                        style={{ background: i % 2 === 0 ? S.bg : S.white, cursor: 'pointer', borderBottom: `1px solid ${S.border}` }}>
                        <td style={{ padding: '9px 10px', fontWeight: 700, color: S.blue }}>{c.competencia}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{c.qtdNF}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.vNF)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: S.orange, fontWeight: 600 }}>{formatBRL(c.vICMS)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.baseSemICMS)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.vPIS)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.pisCorreto)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(c.creditoPIS)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.vCOFINS)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(c.cofinsCorreto)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(c.creditoCOFINS)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: S.green, fontWeight: 700 }}>{formatBRL(c.creditoTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: S.navy }}>
                      <td style={{ padding: '10px', color: '#fff', fontWeight: 700 }}>TOTAL</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#CBD5E1' }}>{notas.length}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#CBD5E1' }}>{formatBRL(totalNF)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#FED7AA', fontWeight: 700 }}>{formatBRL(totalICMS)}</td>
                      <td /><td /><td />
                      <td style={{ padding: '10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(totalPIS)}</td>
                      <td /><td />
                      <td style={{ padding: '10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(totalCOFINS)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(totalCredito)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ABA — Por Nota Fiscal */}
          {aba === 'notas' && (
            <div style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }}
                  placeholder="Buscar por NF, emitente ou competência..."
                  style={{ flex: 1, minWidth: 180, padding: '7px 12px', border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 12 }} />
                <select value={porPagina} onChange={e => { setPorPagina(Number(e.target.value)); setPagina(1); }}
                  style={{ padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 12 }}>
                  {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} por página</option>)}
                </select>
                <span style={{ fontSize: 11, color: S.ghost }}>{notasFiltradas.length} NF-es</span>
                <BotoesAba elementId="print-notas" nomeArquivo={`notas_${cliente?.cnpj || 'cliente'}`} />
              </div>
              <div id="print-notas" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: S.tableHeader }}>
                      {['','NF','Data','Competência','Emitente','Valor NF','ICMS','Base s/ ICMS','Créd. PIS','Créd. COFINS','Total'].map(h => (
                        <th key={h} style={{ color: '#fff', padding: '9px 10px', textAlign: ['','NF','Data','Competência','Emitente'].includes(h) ? 'left' : 'right', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {notasPagina.map((n, i) => {
                      const key    = n.nNF + n.dataEmissao + n.cnpjEmit;
                      const aberta = expandida === key;
                      return (
                        <>
                          <tr key={key} onClick={() => setExpandida(aberta ? null : key)}
                            style={{ background: aberta ? '#EFF6FF' : i % 2 === 0 ? S.bg : S.white, cursor: 'pointer', borderBottom: `1px solid ${S.border}` }}>
                            <td style={{ padding: '8px 6px', textAlign: 'center', color: S.ghost, fontSize: 10 }}>{aberta ? '▼' : '▶'}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: S.text }}>{n.nNF}</td>
                            <td style={{ padding: '8px 10px', color: S.muted, whiteSpace: 'nowrap' }}>{n.dataEmissao}</td>
                            <td style={{ padding: '8px 10px', color: S.blue, fontWeight: 600 }}>{n.competencia}</td>
                            <td style={{ padding: '8px 10px', color: S.muted, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.nomeEmit}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(n.vNF)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: S.orange, fontWeight: 600 }}>{formatBRL(n.vICMS)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: S.muted }}>{formatBRL(n.baseSemICMS)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(n.creditoPIS)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(n.creditoCOFINS)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: S.green, fontWeight: 700 }}>{formatBRL(n.creditoTotal)}</td>
                          </tr>
                          {aberta && (
                            <tr key={key + '_mem'}>
                              <td colSpan={11} style={{ padding: 0 }}>
                                <MemoriaCalculo n={n} />
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPaginas > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                  <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                    style={{ padding: '5px 12px', border: `1px solid ${S.border}`, borderRadius: 6, background: S.white, fontSize: 12, cursor: 'pointer', opacity: pagina === 1 ? 0.4 : 1 }}>‹</button>
                  {Array.from({ length: Math.min(7, totalPaginas) }, (_, i) => {
                    const p = totalPaginas <= 7 ? i + 1 : pagina <= 4 ? i + 1 : pagina >= totalPaginas - 3 ? totalPaginas - 6 + i : pagina - 3 + i;
                    return <button key={p} onClick={() => setPagina(p)}
                      style={{ padding: '5px 10px', border: `1px solid ${p === pagina ? S.blue : S.border}`, borderRadius: 6, background: p === pagina ? S.blue : S.white, color: p === pagina ? '#fff' : S.text, fontSize: 12, cursor: 'pointer', fontWeight: p === pagina ? 700 : 400 }}>{p}</button>;
                  })}
                  <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                    style={{ padding: '5px 12px', border: `1px solid ${S.border}`, borderRadius: 6, background: S.white, fontSize: 12, cursor: 'pointer', opacity: pagina === totalPaginas ? 0.4 : 1 }}>›</button>
                </div>
              )}
            </div>
          )}

          {/* ABA — Memória de Cálculo */}
          {aba === 'memoria' && (
            <div style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ background: '#EFF6FF', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: S.navy, fontWeight: 600 }}>
                  📐 Clique em qualquer NF para expandir o detalhamento
                </div>
                <BotoesAba elementId="print-memoria" nomeArquivo={`memoria_calculo_${cliente?.cnpj || 'cliente'}`} />
              </div>
              <div id="print-memoria" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: S.tableHeader }}>
                      {['','NF','Data','Emitente','Valor NF','ICMS Excluído','Base s/ ICMS','Alíq. PIS','PIS Pago','PIS Correto','Créd. PIS','Alíq. COFINS','COFINS Pago','COFINS Correto','Créd. COFINS','TOTAL'].map(h => (
                        <th key={h} style={{ color: '#fff', padding: '9px 8px', textAlign: ['','NF','Data','Emitente'].includes(h) ? 'left' : 'right', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {notas.map((n, i) => {
                      const key    = 'mem_' + n.nNF + n.dataEmissao + n.cnpjEmit;
                      const aberta = expandida === key;
                      return (
                        <>
                          <tr key={key} onClick={() => setExpandida(aberta ? null : key)}
                            style={{ background: aberta ? '#EFF6FF' : i % 2 === 0 ? S.bg : S.white, cursor: 'pointer', borderBottom: `1px solid ${S.border}` }}>
                            <td style={{ padding: '8px 6px', textAlign: 'center', color: S.ghost, fontSize: 10 }}>{aberta ? '▼' : '▶'}</td>
                            <td style={{ padding: '8px 8px', fontWeight: 600, color: S.text, whiteSpace: 'nowrap' }}>{n.nNF}</td>
                            <td style={{ padding: '8px 8px', color: S.muted, whiteSpace: 'nowrap' }}>{n.dataEmissao}</td>
                            <td style={{ padding: '8px 8px', color: S.muted, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.nomeEmit}</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', color: S.muted }}>{formatBRL(n.vNF)}</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', color: S.orange, fontWeight: 600 }}>{formatBRL(n.vICMS)}</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', color: S.blue, fontWeight: 600 }}>{formatBRL(n.baseSemICMS)}</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', color: S.muted }}>{formatPct(n.aliqPIS)}</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', color: S.muted }}>{formatBRL(n.vPIS)}</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', color: S.muted }}>{formatBRL(n.pisCorreto)}</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(n.creditoPIS)}</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', color: S.muted }}>{formatPct(n.aliqCOFINS)}</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', color: S.muted }}>{formatBRL(n.vCOFINS)}</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', color: S.muted }}>{formatBRL(n.cofinsCorreto)}</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', color: S.green, fontWeight: 600 }}>{formatBRL(n.creditoCOFINS)}</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', color: S.green, fontWeight: 700 }}>{formatBRL(n.creditoTotal)}</td>
                          </tr>
                          {aberta && (
                            <tr key={key + '_det'}>
                              <td colSpan={16} style={{ padding: 0 }}>
                                <MemoriaCalculo n={n} />
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: S.navy }}>
                      <td colSpan={4} style={{ padding: '10px', color: '#fff', fontWeight: 700 }}>TOTAL GERAL</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#CBD5E1' }}>{formatBRL(totalNF)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#FED7AA', fontWeight: 700 }}>{formatBRL(totalICMS)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#93c5fd', fontWeight: 700 }}>{formatBRL(notas.reduce((s,n)=>s+n.baseSemICMS,0))}</td>
                      <td /><td /><td />
                      <td style={{ padding: '10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(totalPIS)}</td>
                      <td /><td /><td />
                      <td style={{ padding: '10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700 }}>{formatBRL(totalCOFINS)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#6EE7B7', fontWeight: 700, fontSize: 13 }}>{formatBRL(totalCredito)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ABA — Relatório Profissional */}
          {aba === 'relatorio' && (
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, gap: 8 }}>
                <BotoesAba elementId="print-relatorio" nomeArquivo={`relatorio_${cliente?.cnpj || 'cliente'}`} />
              </div>
              <div id="print-relatorio">
                <RelatorioProfissional notas={notas} cliente={cliente} perfil={perfil} />
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}