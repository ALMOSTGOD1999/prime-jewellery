import InvoiceService from '#services/invoice_service'
import db from '@adonisjs/lucid/services/db'
import { writeFileSync } from 'fs'

async function main() {
  const rows = await db.rawQuery(
    `SELECT p.id, p.user_id FROM purchases p WHERE p.approved_at IS NOT NULL ORDER BY p.created_at DESC LIMIT 3`
  )
  const purchases = rows.rows || rows[0]?.rows || []
  console.log('Found purchases:', JSON.stringify(purchases, null, 2))

  if (purchases.length === 0) {
    console.log('No approved purchases found')
    process.exit(1)
  }

  const purchase = purchases[0]
  console.log(`\nGenerating invoice for purchase ${purchase.id} (user ${purchase.user_id})...`)

  try {
    const pdfBytes = await InvoiceService.generateGoldPurchaseInvoiceForAdmin(purchase.id)
    const outPath = `test-invoice-${purchase.id}.pdf`
    writeFileSync(outPath, Buffer.from(pdfBytes))
    console.log(`PDF written to ${outPath} (${pdfBytes.length} bytes)`)
  } catch (err: any) {
    console.error('Error:', err.message)
  }

  process.exit(0)
}

main()
