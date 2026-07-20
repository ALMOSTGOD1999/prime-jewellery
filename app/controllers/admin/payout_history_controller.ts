import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { PDF, rgb } from '@libpdf/core'

export default class AdminPayoutHistoryController {
  async index({ inertia, request }: HttpContext) {
    const qs = request.qs() as Record<string, string>
    const month = qs.month || DateTime.now().minus({ months: 1 }).toFormat('yyyy-MM')
    const page = Math.max(1, Number(qs.page || 1))
    const limit = 50
    const offset = (page - 1) * limit

    // Convert "2026-06" to "June 2026" for remark matching
    const monthName = DateTime.fromISO(month + '-01').toFormat('LLLL yyyy')

    // Available months from snapshots (accurate month tracking)
    const months = await db.rawQuery(
      `SELECT DISTINCT to_char(month, 'YYYY-MM') as month
       FROM monthly_income_snapshots
       WHERE paid_out_at IS NOT NULL
       ORDER BY month DESC`
    )

    // Transactions matching the month name in remark
    const txns = await db.rawQuery(
      `SELECT t.id, t.user_id, u.name as user_name, t.amount, t.type, t.remark, t.created_at
       FROM transactions t LEFT JOIN users u ON t.user_id = u.id
       WHERE (t.remark ILIKE '%' || ? || '%')
         AND (t.remark ILIKE '%working income%' OR t.remark ILIKE '%investment return%' OR t.remark ILIKE '%REVERSAL%Duplicate%')
       ORDER BY t.created_at DESC LIMIT ? OFFSET ?`,
      [monthName, limit, offset]
    )

    const countResult = await db.rawQuery(
      `SELECT count(*)::int as total FROM transactions
       WHERE (remark ILIKE '%' || ? || '%')
         AND (remark ILIKE '%working income%' OR remark ILIKE '%investment return%' OR remark ILIKE '%REVERSAL%Duplicate%')`,
      [monthName]
    )

    const summary = await db.rawQuery(
      `SELECT count(*)::int as total_txns, count(DISTINCT user_id)::int as unique_users,
         coalesce(sum(amount) FILTER (WHERE type = 'wallet_credit'), 0)::float as total_credited,
         coalesce(sum(amount) FILTER (WHERE type = 'wallet_debit'), 0)::float as total_reversed
       FROM transactions
       WHERE (remark ILIKE '%' || ? || '%')
         AND (remark ILIKE '%working income%' OR remark ILIKE '%investment return%' OR remark ILIKE '%REVERSAL%Duplicate%')`,
      [monthName]
    )

    const totalRecords = countResult.rows[0].total

    return inertia.render('admin/payout/history', {
      months: months.rows.map((r: any) => r.month),
      selectedMonth: month,
      summary: summary.rows[0],
      transactions: {
        page,
        perPage: limit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        data: txns.rows,
      },
    })
  }

  /**
   * Download payout history as CSV or PDF with bank details
   */
  async download({ request, response }: HttpContext) {
    const qs = request.qs() as Record<string, string>
    const month = qs.month || DateTime.now().minus({ months: 1 }).toFormat('yyyy-MM')
    const format = (qs.format || 'csv').toLowerCase()
    const wallet = (qs.wallet || 'all').toLowerCase()

    if (!['csv', 'pdf'].includes(format)) {
      return response.status(400).send('Invalid format. Use csv or pdf.')
    }

    if (!['all', 'income', 'working'].includes(wallet)) {
      return response.status(400).send('Invalid wallet. Use all, income, or working.')
    }

    const monthName = DateTime.fromISO(month + '-01').toFormat('LLLL yyyy')

    // Build wallet filter clause (exclude repurchase wallet transactions)
    let walletFilter = ''
    if (wallet === 'income') {
      walletFilter = `AND (t.remark ILIKE '%investment return%') AND NOT (t.remark ILIKE '%repurchase%')`
    } else if (wallet === 'working') {
      walletFilter = `AND (t.remark ILIKE '%working income%') AND NOT (t.remark ILIKE '%repurchase%')`
    } else {
      walletFilter = `AND (t.remark ILIKE '%working income%' OR t.remark ILIKE '%investment return%' OR t.remark ILIKE '%REVERSAL%Duplicate%') AND NOT (t.remark ILIKE '%repurchase%')`
    }

    // Fetch all transactions with bank details
    const result = await db.rawQuery(
      `SELECT
         t.id,
         t.user_id,
         u.name as user_name,
         u.email as user_email,
         u.phone as user_phone,
         t.amount,
         t.type,
         t.remark,
         t.created_at,
         b.name as bank_name,
         b.branch as bank_branch,
         b.ifsc as bank_ifsc,
         b.holder_name as bank_holder_name,
         b.account_number as bank_account_number,
         b.upi as bank_upi
       FROM transactions t
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN banks b ON u.id = b.id
       WHERE (t.remark ILIKE '%' || ? || '%')
         ${walletFilter}
       ORDER BY t.created_at ASC`,
      [monthName]
    )

    const rows = result.rows as any[]

    if (rows.length === 0) {
      return response.status(404).send('No payout data found for the selected month.')
    }

    const walletLabel =
      wallet === 'income'
        ? 'Income-Wallet'
        : wallet === 'working'
          ? 'Working-Wallet'
          : 'All-Wallets'
    const filename = `payout-history-${walletLabel}-${month}`

    if (format === 'csv') {
      return this.generateCSV(response, rows, filename)
    } else {
      return this.generatePDF(response, rows, month, monthName, walletLabel)
    }
  }

  /**
   * Generate and stream CSV response
   */
  private generateCSV(response: any, rows: any[], filename: string) {
    const headers = [
      'Transaction ID',
      'User ID',
      'User Name',
      'User Email',
      'User Phone',
      'Amount (₹)',
      'Type',
      'Wallet',
      'Remark',
      'Date',
      'Bank Name',
      'Bank Branch',
      'Bank IFSC',
      'Account Holder Name',
      'Account Number',
      'UPI',
    ]

    const csvRows = rows.map((row: any) => {
      const walletType =
        row.remark?.toLowerCase().includes('cashback wallet') ||
        row.remark?.toLowerCase().includes('income wallet')
          ? 'Income Wallet'
          : row.remark?.toLowerCase().includes('working wallet')
            ? 'Working Wallet'
            : 'Other'

      return [
        row.id,
        `PJ${String(row.user_id).padStart(6, '0')}`,
        escapeCsvField(row.user_name || ''),
        escapeCsvField(row.user_email || ''),
        escapeCsvField(row.user_phone || ''),
        row.amount,
        row.type === 'wallet_credit' ? 'Credit' : row.type === 'wallet_debit' ? 'Debit' : row.type,
        walletType,
        escapeCsvField(row.remark || ''),
        row.created_at
          ? DateTime.fromJSDate(new Date(row.created_at)).toFormat('dd-MM-yyyy hh:mm a')
          : '',
        escapeCsvField(row.bank_name || '—'),
        escapeCsvField(row.bank_branch || '—'),
        escapeCsvField(row.bank_ifsc || '—'),
        escapeCsvField(row.bank_holder_name || '—'),
        escapeCsvField(row.bank_account_number || '—'),
        escapeCsvField(row.bank_upi || '—'),
      ]
    })

    const csvContent = [headers.join(','), ...csvRows.map((r: any[]) => r.join(','))].join('\n')

    // Add BOM for Excel UTF-8 compatibility
    const bom = '\uFEFF'
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', `attachment; filename="${filename}.csv"`)
    return response.send(bom + csvContent)
  }

  /**
   * Generate and stream PDF response
   */
  private async generatePDF(
    response: any,
    rows: any[],
    month: string,
    monthName: string,
    walletLabel: string
  ) {
    const pdf = PDF.create()
    pdf.setTitle(`Payout History — ${monthName} — ${walletLabel}`)

    let page = pdf.addPage({ size: 'a4' })
    const { height } = page
    const margin = 28
    const pageBottom = margin + 20
    let yPos = height - margin

    const dark = rgb(0.1, 0.1, 0.1)
    const muted = rgb(0.4, 0.4, 0.4)
    const headerBg = rgb(0.13, 0.27, 0.42)
    const white = rgb(1, 1, 1)
    const creditGreen = rgb(0.1, 0.6, 0.3)
    const debitRed = rgb(0.8, 0.2, 0.2)
    const rowBgEven = rgb(0.96, 0.96, 0.98)

    // Title block
    page.drawText('Prime Jewellery', {
      x: margin,
      y: yPos,
      size: 16,
      font: 'Helvetica-Bold',
      color: headerBg,
    })
    yPos -= 22
    page.drawText(`Payout History — ${monthName}`, {
      x: margin,
      y: yPos,
      size: 12,
      font: 'Helvetica-Bold',
      color: dark,
    })
    yPos -= 16
    page.drawText(
      `Wallet: ${walletLabel.replace(/-/g, ' ')}  |  Records: ${rows.length}  |  Generated: ${DateTime.now().toFormat('dd-MM-yyyy hh:mm a')}`,
      {
        x: margin,
        y: yPos,
        size: 8,
        font: 'Helvetica',
        color: muted,
      }
    )
    yPos -= 22

    // Column layout (wider to avoid text overflow / wrapping)
    const colWidths = [52, 55, 90, 62, 36, 52, 120, 88]
    const colHeaders = [
      'Date',
      'User ID',
      'Name',
      'Amount',
      'Type',
      'Wallet',
      'Remark',
      'Bank Details',
    ]
    const tableWidth = colWidths.reduce((a, b) => a + b, 0)

    const drawHeader = (p: any, y: number) => {
      let x = margin
      p.drawRectangle({ x: margin, y: y - 2, width: tableWidth, height: 16, color: headerBg })
      for (const [i, header] of colHeaders.entries()) {
        p.drawText(header, {
          x: x + 2,
          y: y + 1,
          size: 7,
          font: 'Helvetica-Bold',
          color: white,
        })
        x += colWidths[i]
      }
      return y - 18
    }

    yPos = drawHeader(page, yPos)

    // Row height: main text (size 7 ~9pt tall) + bank detail (size 6.5 ~8pt tall) + padding = ~22pt per entry
    const MIN_ROW_SPACE = 36

    for (const [idx, row] of rows.entries()) {
      // Page break check
      if (yPos < pageBottom + MIN_ROW_SPACE) {
        page = pdf.addPage({ size: 'a4' })
        yPos = height - margin
        yPos = drawHeader(page, yPos)
      }

      const isCredit = row.type === 'wallet_credit'
      const isReversal = row.remark?.includes('REVERSAL')
      const isWorking = row.remark?.toLowerCase().includes('working wallet')
      const isCashback =
        row.remark?.toLowerCase().includes('cashback wallet') ||
        row.remark?.toLowerCase().includes('income wallet')

      const walletType = isCashback ? 'Cashback' : isWorking ? 'Working' : 'Other'
      const amountColor = isReversal ? debitRed : isCredit ? creditGreen : dark
      const amountPrefix = isReversal ? '−₹' : isCredit ? '+₹' : '₹'
      const typeLabel = isReversal ? 'REVERSAL' : isCredit ? 'Credit' : 'Debit'
      const dateStr = row.created_at
        ? DateTime.fromJSDate(new Date(row.created_at)).toFormat('dd/MM/yy')
        : ''
      const userId = `PJ${String(row.user_id).padStart(6, '0')}`
      const userName = this.truncate(row.user_name || '—', 22)
      const remark = this.truncate(row.remark || '—', 28)

      // Compact bank info string for main table column
      let bankInfo = '—'
      if (row.bank_account_number) {
        const last4 = String(row.bank_account_number).slice(-4)
        bankInfo = `${this.truncate(row.bank_name || 'Bank', 14)} ...${last4}`
      }

      // Alternate row background
      if (idx % 2 === 0) {
        page.drawRectangle({
          x: margin,
          y: yPos - 2,
          width: tableWidth,
          height: MIN_ROW_SPACE - 2,
          color: rowBgEven,
        })
      }

      // Draw main row values
      let x = margin
      const mainValues = [
        { text: dateStr, color: muted },
        { text: userId, color: dark },
        { text: userName, color: dark },
        {
          text: `${amountPrefix}${Number(row.amount).toLocaleString('en-IN')}`,
          color: amountColor,
        },
        { text: typeLabel, color: isReversal ? debitRed : muted },
        { text: walletType, color: muted },
        { text: remark, color: muted },
        { text: bankInfo, color: muted },
      ]

      for (const [i, col] of mainValues.entries()) {
        page.drawText(col.text, {
          x: x + 2,
          y: yPos,
          size: 7,
          font: 'Helvetica',
          color: col.color,
        })
        x += colWidths[i]
      }

      // Draw full bank details on a second line inside the same row block
      yPos -= 12
      if (row.bank_name || row.bank_account_number || row.bank_ifsc) {
        const bankParts = [
          row.bank_name,
          row.bank_branch,
          row.bank_holder_name,
          row.bank_account_number ? `A/C: ${row.bank_account_number}` : null,
          row.bank_ifsc ? `IFSC: ${row.bank_ifsc}` : null,
          row.bank_upi ? `UPI: ${row.bank_upi}` : null,
        ].filter(Boolean)

        const bankLine = bankParts.length > 0 ? bankParts.join('  |  ') : '—'
        page.drawText(this.truncate(bankLine, 110), {
          x: margin + 4,
          y: yPos,
          size: 6.5,
          font: 'Helvetica',
          color: muted,
        })
      }

      yPos -= 16
    }

    // Footer on last page
    page.drawText(`Prime Jewellery — Payout History Report`, {
      x: margin,
      y: pageBottom - 10,
      size: 8,
      font: 'Helvetica',
      color: muted,
    })

    const pdfBytes = await pdf.save()
    response.header('Content-Type', 'application/pdf')
    response.header(
      'Content-Disposition',
      `attachment; filename="${month}-${walletLabel.toLowerCase()}-payout-history.pdf"`
    )
    return response.send(Buffer.from(pdfBytes))
  }

  private truncate(text: string, maxLen: number): string {
    if (!text) return ''
    return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text
  }
}

/**
 * Escape a field value for CSV (wrap in quotes if it contains commas, quotes, or newlines)
 */
function escapeCsvField(value: string): string {
  if (!value) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
