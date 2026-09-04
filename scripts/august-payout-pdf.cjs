const { DateTime } = require('luxon');
const { Client } = require('pg');
const { PDF, rgb } = require('@libpdf/core');
const fs = require('fs');
const path = require('path');

const dbUrl = process.argv[2] || process.env.DB_CONNECTION;
if (!dbUrl) { console.error('Usage: node august-payout-pdf.cjs <DATABASE_URL>'); process.exit(1); }

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();
  const period = DateTime.fromISO('2026-08-01');
  const monthEnd = period.endOf('month');
  const monthStart = period.startOf('month');

  // ─── Fetch Income Wallet Data ────────────────────────────
  const invResult = await client.query(
    `SELECT i.id, i.user_id, i.amount, i.monthly_return_rate, i.started_at, u.name, u.status
     FROM investments i JOIN users u ON u.id = i.user_id
     WHERE i.status = 'active' AND i.started_at <= $1 AND u.status = 'active'
     ORDER BY i.user_id`,
    [monthEnd.toSQL()]
  );

  const byUser = new Map();
  for (const inv of invResult.rows) {
    const startedAt = DateTime.fromJSDate(inv.started_at).setZone('Asia/Kolkata').startOf('day');
    const mEnd = monthEnd.setZone('Asia/Kolkata').startOf('day');
    const activeDays = Math.min(mEnd.diff(startedAt, 'days').days + 1, 30);
    const prorateFactor = Math.max(activeDays, 1) / 30;
    const rate = Number(inv.monthly_return_rate) || 3;
    const returnAmount = Math.round((Number(inv.amount) * rate * prorateFactor) / 100 * 100) / 100;
    const incomeShare = Math.round((returnAmount * 70) / 100 * 100) / 100;
    const repurchaseShare = Math.round((returnAmount * 20) / 100 * 100) / 100;

    if (!byUser.has(inv.user_id)) {
      byUser.set(inv.user_id, { name: inv.name, investments: [], totalReturn: 0, totalIncome: 0, totalRepurchase: 0 });
    }
    const u = byUser.get(inv.user_id);
    u.investments.push({ id: inv.id, amount: inv.amount, rate, activeDays, returnAmount, incomeShare, repurchaseShare });
    u.totalReturn += returnAmount;
    u.totalIncome += incomeShare;
    u.totalRepurchase += repurchaseShare;
  }

  const users = [...byUser.entries()].sort((a, b) => b[1].totalIncome - a[1].totalIncome);
  const totalIncomeWallet = users.reduce((s, [, u]) => s + u.totalIncome, 0);
  const totalRepurchase = users.reduce((s, [, u]) => s + u.totalRepurchase, 0);
  const totalAdmin = users.reduce((s, [, u]) => s + u.totalReturn - u.totalIncome - u.totalRepurchase, 0);
  const grandTotal = totalIncomeWallet + totalRepurchase + totalAdmin;

  // ─── Generate PDF ────────────────────────────────────────
  const pdf = PDF.create();
  pdf.setTitle('August 2026 Payout Report — Prime Jewellery');
  let page = pdf.addPage({ size: 'a4' });
  const { width, height } = page;
  const margin = 40;
  let y = height - margin;

  const gold = rgb(0.82, 0.58, 0.18);
  const dark = rgb(0.13, 0.13, 0.13);
  const muted = rgb(0.45, 0.45, 0.45);
  const white = rgb(1, 1, 1);
  const headerBg = rgb(0.13, 0.13, 0.13);
  const rowAlt = rgb(0.97, 0.97, 0.97);

  const fmt = (n) => '\u20B9' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Header
  page.drawText('PRIME JEWELLERY', { x: margin, y: y - 10, size: 22, font: 'Helvetica-Bold', color: gold });
  y -= 30;
  page.drawText('Monthly Payout Report — August 2026', { x: margin, y, size: 14, font: 'Helvetica', color: dark });
  y -= 15;
  page.drawText(`Generated: ${DateTime.now().setZone('Asia/Kolkata').toFormat('dd LLL yyyy, hh:mm a IST')}`, { x: margin, y, size: 9, font: 'Helvetica', color: muted });
  y -= 25;

  // Summary Box
  const boxW = width - margin * 2;
  page.drawRectangle({ x: margin, y: y - 75, width: boxW, height: 75, borderColor: gold, borderWidth: 1, color: rgb(0.99, 0.98, 0.95) });
  y -= 18;
  page.drawText('PAYOUT SUMMARY', { x: margin + 12, y, size: 12, font: 'Helvetica-Bold', color: gold });
  y -= 20;
  const sx = margin + 12;
  page.drawText('Total Income Wallet (70%):', { x: sx, y, size: 10, font: 'Helvetica', color: dark });
  page.drawText(fmt(totalIncomeWallet), { x: sx + 220, y, size: 10, font: 'Helvetica-Bold', color: dark });
  y -= 16;
  page.drawText('Total Repurchase Wallet (20%):', { x: sx, y, size: 10, font: 'Helvetica', color: dark });
  page.drawText(fmt(totalRepurchase), { x: sx + 220, y, size: 10, font: 'Helvetica-Bold', color: dark });
  y -= 16;
  page.drawText('Admin Share (10%):', { x: sx, y, size: 10, font: 'Helvetica', color: dark });
  page.drawText(fmt(totalAdmin), { x: sx + 220, y, size: 10, font: 'Helvetica-Bold', color: dark });
  y -= 16;
  page.drawText('Grand Total:', { x: sx, y, size: 11, font: 'Helvetica-Bold', color: gold });
  page.drawText(fmt(grandTotal), { x: sx + 220, y, size: 11, font: 'Helvetica-Bold', color: gold });
  y -= 25;

  // Table Header
  const cols = [
    { label: 'User Code', x: margin, w: 70 },
    { label: 'Name', x: margin + 72, w: 130 },
    { label: 'Inv. Amount', x: margin + 204, w: 75 },
    { label: 'Return', x: margin + 281, w: 70 },
    { label: 'Income 70%', x: margin + 353, w: 70 },
    { label: 'Repur. 20%', x: margin + 425, w: 65 },
  ];
  const tableW = cols[cols.length - 1].x + cols[cols.length - 1].w - margin;
  const rowH = 16;

  page.drawRectangle({ x: margin, y: y - 2, width: tableW, height: rowH, color: headerBg });
  for (const c of cols) {
    page.drawText(c.label, { x: c.x + 4, y: y + 2, size: 8, font: 'Helvetica-Bold', color: white });
  }
  y -= rowH;

  // Table Rows
  let rowNum = 0;
  for (const [userId, data] of users) {
    if (y < margin + 40) {
      page.drawText('— continued on next page —', { x: margin, y: y - 5, size: 9, font: 'Helvetica-Oblique', color: muted });
      let newPage = pdf.addPage({ size: 'a4' });
      page = newPage;
      y = height - margin;
      page.drawRectangle({ x: margin, y: y - 2, width: tableW, height: rowH, color: headerBg });
      for (const c of cols) {
        page.drawText(c.label, { x: c.x + 4, y: y + 2, size: 8, font: 'Helvetica-Bold', color: white });
      }
      y -= rowH;
      rowNum = 0;
    }

    if (rowNum % 2 === 1) {
      page.drawRectangle({ x: margin, y: y - 2, width: tableW, height: rowH, color: rowAlt });
    }

    const code = 'PJ' + String(userId).padStart(6, '0');
    const name = (data.name || '—').substring(0, 22);
    const invAmt = fmt(data.investments.reduce((s, i) => s + i.amount, 0));
    const ret = fmt(data.totalReturn);
    const inc = fmt(data.totalIncome);
    const rep = fmt(data.totalRepurchase);

    page.drawText(code, { x: cols[0].x + 4, y: y + 2, size: 8, font: 'Helvetica', color: dark });
    page.drawText(name, { x: cols[1].x + 4, y: y + 2, size: 8, font: 'Helvetica', color: dark });
    page.drawText(invAmt, { x: cols[2].x + 4, y: y + 2, size: 8, font: 'Helvetica', color: dark });
    page.drawText(ret, { x: cols[3].x + 4, y: y + 2, size: 8, font: 'Helvetica', color: dark });
    page.drawText(inc, { x: cols[4].x + 4, y: y + 2, size: 8, font: 'Helvetica-Bold', color: rgb(0, 0.5, 0) });
    page.drawText(rep, { x: cols[5].x + 4, y: y + 2, size: 8, font: 'Helvetica', color: dark });

    y -= rowH;
    rowNum++;
  }

  // Footer
  y -= 20;
  page.drawRectangle({ x: margin, y: y - 2, width: tableW, height: rowH, color: headerBg });
  page.drawText('TOTAL', { x: margin + 4, y: y + 2, size: 9, font: 'Helvetica-Bold', color: white });
  page.drawText(fmt(grandTotal), { x: cols[4].x + 4, y: y + 2, size: 9, font: 'Helvetica-Bold', color: white });

  y -= 30;
  page.drawText('This is a system-generated report. Prime Jewellery — Investment Return Payout for August 2026.', {
    x: margin, y, size: 8, font: 'Helvetica-Oblique', color: muted,
  });

  const pdfBytes = await pdf.save();
  const outPath = path.join(process.cwd(), 'august-2026-payout.pdf');
  fs.writeFileSync(outPath, pdfBytes);
  console.log('PDF saved to:', outPath);
  console.log('Users:', users.length, '| Grand Total:', fmt(grandTotal));

  await client.end();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
