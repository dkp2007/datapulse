import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { formatNumber } from './widgets.js';

export async function buildBoardPdf({ dashboard, widgets, widgetData, biz }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = 0;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  if (biz?.business_name) {
    doc.text(biz.business_name, M, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const bits = [];
    if (biz.gstin) bits.push(`GSTIN: ${biz.gstin}`);
    const addr = [biz.address_line, biz.city, biz.state, biz.pincode].filter(Boolean).join(', ');
    if (addr) bits.push(addr);
    let ly = 76;
    for (const b of bits) {
      doc.text(b, M, ly);
      ly += 12;
    }
  } else {
    doc.text(dashboard.name, M, 60);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(36, 124, 209);
  doc.text(dashboard.name, M, biz?.business_name ? 120 : 90);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    M,
    biz?.business_name ? 134 : 104
  );
  y = biz?.business_name ? 156 : 126;

  const kpis = widgets.filter((w) => w.widget_type === 'kpi');
  if (kpis.length) {
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('The headline numbers', M, y);
    y += 18;
    doc.setFont('helvetica', 'normal');

    const cardW = (W - M * 2 - 12 * (Math.min(kpis.length, 4) - 1)) / Math.min(kpis.length, 4);
    let x = M;
    for (const k of kpis.slice(0, 4)) {
      const d = widgetData[k.id]?.data;
      doc.setFillColor(238, 247, 253);
      doc.roundedRect(x, y, cardW, 58, 6, 6, 'F');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(String(k.title).slice(0, 24), x + 10, y + 16);
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(d?.kind === 'scalar' ? formatNumber(d.value) : '—', x + 10, y + 36);
      if (d?.deltaPct !== null && d?.deltaPct !== undefined) {
        doc.setFontSize(7);
        doc.setTextColor(d.deltaPct >= 0 ? 5 : 220, d.deltaPct >= 0 ? 150 : 38, d.deltaPct >= 0 ? 105 : 38);
        doc.text(`${d.deltaPct >= 0 ? '▲' : '▼'} ${Math.abs(d.deltaPct)}%`, x + 10, y + 50);
      }
      doc.setFont('helvetica', 'normal');
      x += cardW + 12;
      if (x + cardW > W - M && k !== kpis.slice(0, 4).at(-1)) {
        x = M;
        y += 70;
      }
    }
    y += 76;
  }

  for (const w of widgets) {
    if (w.widget_type === 'kpi') continue;

    if (y > 640) {
      doc.addPage();
      y = 60;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(String(w.title).slice(0, 60), M, y);
    y += 10;

    if (w.widget_type === 'chart') {
      const el = document.querySelector(`[data-widget-id="${w.id}"] canvas`);
      if (el) {
        try {
          const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
          const imgW = W - M * 2;
          const imgH = Math.min(240, (canvas.height / canvas.width) * imgW);
          doc.addImage(canvas.toDataURL('image/png'), 'PNG', M, y, imgW, imgH);
          y += imgH + 20;
          continue;
        } catch {
          // fall through to table
        }
      }
      const d = widgetData[w.id]?.data;
      if (d?.kind === 'series') {
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        for (const r of d.rows.slice(0, 14)) {
          doc.text(`${r.dimension}: ${formatNumber(r.values?.[0])}`, M + 8, y + 8);
          y += 12;
        }
        y += 10;
      }
      continue;
    }

    if (w.widget_type === 'table') {
      const spec = w.spec ?? {};
      const cols = spec.columns ?? [];
      const d = widgetData[w.id]?.data;
      const rows = d?.rows ?? [];
      doc.setFontSize(8);
      for (let i = 0; i < Math.min(rows.length, 16); i++) {
        if (y > 780) {
          doc.addPage();
          y = 60;
        }
        const line = cols.map((c) => String(rows[i][c] ?? '')).join('   |   ').slice(0, 110);
        doc.setTextColor(i === 0 ? 15 : 71, i === 0 ? 23 : 85, i === 0 ? 42 : 105);
        doc.text(line, M + 8, y + 8);
        y += 12;
      }
      y += 12;
    }
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${biz?.business_name ?? 'DataPulse'} — page ${p} of ${pages}`,
      W / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'center' }
    );
  }

  return doc;
}
