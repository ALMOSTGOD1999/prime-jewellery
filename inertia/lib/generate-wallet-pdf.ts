import { PDF, rgb } from '@libpdf/core'

interface Transaction {
  id: string
  amount: number
  type: 'wallet_credit' | 'wallet_debit'
  remark: string | null
  approved_at: string | null
  created_at: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatINR(amount: number) {
  return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)
}

const PAGE_WIDTH = 595 // A4
const PAGE_HEIGHT = 842
const MARGIN_LEFT = 50
const MARGIN_RIGHT = 50
const MARGIN_TOP = 50
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

export async function generateWalletHistoryPdf(
  walletLabel: string,
  transactions: Transaction[],
  userName: string,
  userCode: string
) {
  const pdf = PDF.create()
  let page = pdf.addPage({ size: 'a4' })
  let y = PAGE_HEIGHT - MARGIN_TOP

  // --- Header ---
  page.drawText('Prime Jewellery', {
    x: MARGIN_LEFT,
    y,
    size: 20,
    color: rgb(0.1, 0.1, 0.1),
  })
  y -= 28

  page.drawText(`${walletLabel} History`, {
    x: MARGIN_LEFT,
    y,
    size: 14,
    color: rgb(0.3, 0.3, 0.3),
  })
  y -= 18

  page.drawText(`${userCode} — ${userName}`, {
    x: MARGIN_LEFT,
    y,
    size: 10,
    color: rgb(0.4, 0.4, 0.4),
  })
  y -= 10

  page.drawText(`Generated: ${new Date().toLocaleString('en-IN')}`, {
    x: MARGIN_LEFT,
    y,
    size: 8,
    color: rgb(0.5, 0.5, 0.5),
  })
  y -= 25

  // --- Summary ---
  const totalCredits = transactions
    .filter((t) => t.type === 'wallet_credit')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const totalDebits = transactions
    .filter((t) => t.type === 'wallet_debit')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const balance = totalCredits - totalDebits

  // Summary box
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 50,
    width: CONTENT_WIDTH,
    height: 55,
    color: rgb(0.96, 0.96, 0.96),
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 0.5,
  })

  const summaryY = y - 15
  const col1 = MARGIN_LEFT + 15
  const col2 = MARGIN_LEFT + CONTENT_WIDTH / 3 + 15
  const col3 = MARGIN_LEFT + (CONTENT_WIDTH * 2) / 3 + 15

  page.drawText('Balance', { x: col1, y: summaryY, size: 8, color: rgb(0.4, 0.4, 0.4) })
  page.drawText(formatINR(balance), {
    x: col1,
    y: summaryY - 14,
    size: 12,
    color: rgb(0.1, 0.1, 0.1),
  })

  page.drawText('Total Credits', { x: col2, y: summaryY, size: 8, color: rgb(0.4, 0.4, 0.4) })
  page.drawText(formatINR(totalCredits), {
    x: col2,
    y: summaryY - 14,
    size: 12,
    color: rgb(0.0, 0.6, 0.3),
  })

  page.drawText('Total Debits', { x: col3, y: summaryY, size: 8, color: rgb(0.4, 0.4, 0.4) })
  page.drawText(formatINR(totalDebits), {
    x: col3,
    y: summaryY - 14,
    size: 12,
    color: rgb(0.8, 0.2, 0.2),
  })

  y -= 70

  // --- Table Header ---
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 22,
    width: CONTENT_WIDTH,
    height: 22,
    color: rgb(0.15, 0.15, 0.15),
  })

  const colDate = MARGIN_LEFT + 8
  const colRemark = MARGIN_LEFT + 90
  const colType = MARGIN_LEFT + CONTENT_WIDTH - 170
  const colAmount = MARGIN_LEFT + CONTENT_WIDTH - 70

  page.drawText('Date', { x: colDate, y: y - 15, size: 8, color: rgb(1, 1, 1) })
  page.drawText('Remark', { x: colRemark, y: y - 15, size: 8, color: rgb(1, 1, 1) })
  page.drawText('Type', { x: colType, y: y - 15, size: 8, color: rgb(1, 1, 1) })
  page.drawText('Amount', { x: colAmount, y: y - 15, size: 8, color: rgb(1, 1, 1) })

  y -= 28

  // --- Table Rows ---
  const ROW_HEIGHT = 20
  const usableHeight = MARGIN_TOP + 30 // bottom margin

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]
    const isCredit = tx.type === 'wallet_credit'

    // Page break
    if (y < usableHeight) {
      page = pdf.addPage({ size: 'a4' })
      y = PAGE_HEIGHT - MARGIN_TOP

      // Repeat header
      page.drawRectangle({
        x: MARGIN_LEFT,
        y: y - 22,
        width: CONTENT_WIDTH,
        height: 22,
        color: rgb(0.15, 0.15, 0.15),
      })
      page.drawText('Date', { x: colDate, y: y - 15, size: 8, color: rgb(1, 1, 1) })
      page.drawText('Remark', { x: colRemark, y: y - 15, size: 8, color: rgb(1, 1, 1) })
      page.drawText('Type', { x: colType, y: y - 15, size: 8, color: rgb(1, 1, 1) })
      page.drawText('Amount', { x: colAmount, y: y - 15, size: 8, color: rgb(1, 1, 1) })
      y -= 28
    }

    // Alternating row background
    if (i % 2 === 0) {
      page.drawRectangle({
        x: MARGIN_LEFT,
        y: y - ROW_HEIGHT + 5,
        width: CONTENT_WIDTH,
        height: ROW_HEIGHT,
        color: rgb(0.97, 0.97, 0.97),
      })
    }

    // Row border
    page.drawRectangle({
      x: MARGIN_LEFT,
      y: y - ROW_HEIGHT + 5,
      width: CONTENT_WIDTH,
      height: ROW_HEIGHT,
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 0.3,
    })

    const rowY = y - 10

    // Date
    page.drawText(formatDate(tx.created_at), {
      x: colDate,
      y: rowY,
      size: 8,
      color: rgb(0.3, 0.3, 0.3),
    })

    // Remark (truncate to fit)
    const remark = tx.remark || (isCredit ? 'Wallet credited' : 'Wallet debited')
    const maxRemarkLen = 45
    const displayRemark = remark.length > maxRemarkLen ? remark.slice(0, maxRemarkLen) + '…' : remark
    page.drawText(displayRemark, {
      x: colRemark,
      y: rowY,
      size: 8,
      color: rgb(0.2, 0.2, 0.2),
    })

    // Type
    page.drawText(isCredit ? 'Credit' : 'Debit', {
      x: colType,
      y: rowY,
      size: 8,
      color: isCredit ? rgb(0.0, 0.55, 0.25) : rgb(0.8, 0.15, 0.15),
    })

    // Amount
    const amountStr = `${isCredit ? '+' : '-'}${formatINR(Number(tx.amount))}`
    page.drawText(amountStr, {
      x: colAmount,
      y: rowY,
      size: 8,
      color: isCredit ? rgb(0.0, 0.55, 0.25) : rgb(0.8, 0.15, 0.15),
    })

    y -= ROW_HEIGHT
  }

  // --- Footer ---
  y -= 15
  if (y < usableHeight) {
    page = pdf.addPage({ size: 'a4' })
    y = PAGE_HEIGHT - MARGIN_TOP
  }
  page.drawText(`${transactions.length} transaction(s)  •  Prime Jewellery`, {
    x: MARGIN_LEFT,
    y,
    size: 8,
    color: rgb(0.6, 0.6, 0.6),
  })

  // --- Save & Download ---
  const bytes = await pdf.save()
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${walletLabel.replace(/\s+/g, '_')}_History_${userCode}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
