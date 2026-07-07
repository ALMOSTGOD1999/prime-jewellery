import { PDF, rgb } from '@libpdf/core'
import env from '#start/env'
import Transaction from '#models/transaction'
import Purchase from '#models/purchase'
import { DateTime } from 'luxon'
import { TransactionTypeEnum } from '#enums/transaction'
import { ToWords } from 'to-words'
import { IndianStatesEnum } from '#enums/settings'

interface InvoiceData {
  slNo: string
  invoiceNo: string
  invoiceDate: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerState: IndianStatesEnum | null
  items: Array<{
    itemName: string
    huid: string
    quantity: number
    hsnCode: string
    grossWeight: number
    netWeight: number
    ratePerGram: number
    valueOfOrnaments: number
    diamondCharges: number
    amount: number
  }>
  makingCharges: number
  miscellaneousCharges: number
  cgst: number
  sgst: number
  grandTotal: number
  cashAmount: number
  chequeAmount: number
  bankTransferAmount: number
  cardAmount: number
  advanceAmount: number
  ogAdjustmentAmount: number
  taxableAmount: number
  cgstAmount: number
  sgstAmount: number
  totalTax: number
  amountInWords: string
}

export default class InvoiceService {
  private static readonly goldPurchaseBreakup = {
    gold: 0.7,
    cgst: 0.015,
    sgst: 0.015,
    additional: 0.02,
    making: 0.25,
  }

  /**
   * Generate invoice PDF for a topup transaction
   */
  static async generateTopupInvoice(transactionId: string, userId: number): Promise<Uint8Array> {
    // Fetch transaction with user
    const transaction = await Transaction.query()
      .where('id', transactionId)
      .where('user_id', userId)
      .where('type', TransactionTypeEnum.TOPUP)
      .preload('user')
      .firstOrFail()

    // Check if metadata exists
    if (!transaction.metadata || transaction.metadata.length === 0) {
      throw new Error('Bill cannot be generated. Metadata not available for this topup.')
    }

    // Check if approved
    if (!transaction.approvedAt) {
      throw new Error('Bill can only be generated for approved topups.')
    }

    // Calculate SL NO based on user's approved topups sorted by createdAt
    const approvedTopups = await Transaction.query()
      .where('user_id', userId)
      .where('type', TransactionTypeEnum.TOPUP)
      .whereNotNull('approved_at')
      .orderBy('created_at', 'asc')
      .select('id')

    const slNoIndex = approvedTopups.findIndex((t) => t.id === transactionId)
    const slNo = String(slNoIndex + 1).padStart(3, '0')

    // Prepare invoice data
    const invoiceData = this.prepareInvoiceData(transaction, slNo)

    // Generate PDF
    return this.createPDF(invoiceData)
  }

  /**
   * Generate shareable invoice PDF for a gold purchase.
   */
  static async generateGoldPurchaseInvoice(
    purchaseId: string,
    userId: number
  ): Promise<Uint8Array> {
    const purchase = await Purchase.query()
      .where('id', purchaseId)
      .where('user_id', userId)
      .preload('user')
      .firstOrFail()

    const purchases = await Purchase.query().orderBy('created_at', 'asc').select('id')
    const invoiceIndex = purchases.findIndex((item) => item.id === purchase.id) + 1
    const invoiceNo = `PSJ${String(Math.max(invoiceIndex, 1)).padStart(6, '0')}`

    return this.createGoldPurchasePDF({
      invoiceNo,
      invoiceDate: purchase.createdAt.toFormat('dd-MM-yyyy'),
      buyerName: purchase.buyerName || purchase.user.name,
      customerPhone: purchase.user.phone,
      quantity: Number(purchase.quantity) || 1,
      totalAmount: Number(purchase.amount),
    })
  }

  private static async createGoldPurchasePDF(data: {
    invoiceNo: string
    invoiceDate: string
    buyerName: string
    customerPhone: string
    quantity: number
    totalAmount: number
  }): Promise<Uint8Array> {
    const pdf = PDF.create()
    pdf.setTitle(`Gold Purchase Invoice ${data.invoiceNo}`)

    const page = pdf.addPage({ size: 'a4' })
    const { width, height } = page
    const margin = 44
    const gold = rgb(0.82, 0.58, 0.18)
    const dark = rgb(0.16, 0.11, 0.06)
    const muted = rgb(0.42, 0.34, 0.22)
    const softGold = rgb(0.98, 0.94, 0.84)
    const border = rgb(0.86, 0.75, 0.52)
    let y = height - margin

    const formatAmount = (amount: number) => `Rs. ${amount.toFixed(2)}`
    const breakdown = this.calculateGoldPurchaseBreakup(data.totalAmount)

    page.drawRectangle({ x: 0, y: height - 118, width, height: 118, color: softGold })
    page.drawRectangle({ x: 0, y: height - 122, width, height: 4, color: gold })

    page.drawText('Prime Jewellers', {
      x: margin,
      y,
      size: 28,
      font: 'Helvetica-Bold',
      color: dark,
    })
    y -= 24
    page.drawText('Gold Purchase Invoice', {
      x: margin,
      y,
      size: 13,
      font: 'Helvetica-Bold',
      color: muted,
    })
    page.drawText(`Invoice No: ${data.invoiceNo}`, {
      x: width - margin - 165,
      y: height - margin,
      size: 11,
      font: 'Helvetica-Bold',
      color: dark,
    })
    page.drawText(`Date: ${data.invoiceDate}`, {
      x: width - margin - 165,
      y: height - margin - 18,
      size: 10,
      font: 'Helvetica',
      color: muted,
    })

    y = height - 155
    page.drawRectangle({
      x: margin,
      y: y - 78,
      width: width - margin * 2,
      height: 78,
      borderColor: border,
      borderWidth: 1,
    })
    page.drawText('Buyer Details', {
      x: margin + 16,
      y: y - 22,
      size: 12,
      font: 'Helvetica-Bold',
      color: dark,
    })
    page.drawText(`Name: ${data.buyerName}`, {
      x: margin + 16,
      y: y - 44,
      size: 10,
      font: 'Helvetica',
      color: dark,
    })
    page.drawText(`Phone: ${data.customerPhone}`, {
      x: margin + 16,
      y: y - 62,
      size: 10,
      font: 'Helvetica',
      color: muted,
    })
    page.drawText(`Quantity: ${data.quantity.toFixed(3)} gm`, {
      x: width / 2 + 20,
      y: y - 44,
      size: 10,
      font: 'Helvetica-Bold',
      color: dark,
    })
    page.drawText(`Invoice Total: ${formatAmount(data.totalAmount)}`, {
      x: width / 2 + 20,
      y: y - 62,
      size: 10,
      font: 'Helvetica-Bold',
      color: dark,
    })

    y -= 112
    this.drawGoldPurchaseRow(
      page,
      margin,
      y,
      width - margin * 2,
      'Component',
      'Rate',
      'Amount',
      true
    )
    y -= 30

    const rows = [
      ['Gold Value', '70%', breakdown.goldValue],
      ['CGST', '1.5%', breakdown.cgst],
      ['SGST', '1.5%', breakdown.sgst],
      ['Additional Charges', '2%', breakdown.additionalCharges],
      ['Making Charges', '25%', breakdown.makingCharges],
    ] as const

    rows.forEach(([label, rate, amount]) => {
      this.drawGoldPurchaseRow(
        page,
        margin,
        y,
        width - margin * 2,
        label,
        rate,
        formatAmount(amount)
      )
      y -= 28
    })

    page.drawRectangle({
      x: margin,
      y: y - 36,
      width: width - margin * 2,
      height: 36,
      color: softGold,
      borderColor: gold,
      borderWidth: 1,
    })
    page.drawText('Grand Total', {
      x: margin + 14,
      y: y - 23,
      size: 13,
      font: 'Helvetica-Bold',
      color: dark,
    })
    page.drawText(formatAmount(data.totalAmount), {
      x: width - margin - 130,
      y: y - 23,
      size: 13,
      font: 'Helvetica-Bold',
      color: dark,
    })

    const toWords = new ToWords({ localeCode: 'en-IN', converterOptions: { currency: true } })
    y -= 68
    page.drawText(`Amount in words: ${toWords.convert(data.totalAmount)}`, {
      x: margin,
      y,
      size: 10,
      font: 'Helvetica-Bold',
      color: dark,
    })

    y -= 48
    page.drawText('Note: This is a sample invoice design. Final design can be updated later.', {
      x: margin,
      y,
      size: 9,
      font: 'Helvetica-Oblique',
      color: muted,
    })

    page.drawLine({
      start: { x: width - margin - 170, y: 114 },
      end: { x: width - margin, y: 114 },
      color: border,
      thickness: 1,
    })
    page.drawText('Authorised Signatory', {
      x: width - margin - 150,
      y: 96,
      size: 10,
      font: 'Helvetica-Bold',
      color: dark,
    })
    page.drawText('Thank you for purchasing gold with Prime Jewellers.', {
      x: margin,
      y: 74,
      size: 9,
      font: 'Helvetica',
      color: muted,
    })

    return pdf.save()
  }

  private static calculateGoldPurchaseBreakup(totalAmount: number) {
    const rates = this.goldPurchaseBreakup
    return {
      goldValue: totalAmount * rates.gold,
      cgst: totalAmount * rates.cgst,
      sgst: totalAmount * rates.sgst,
      additionalCharges: totalAmount * rates.additional,
      makingCharges: totalAmount * rates.making,
    }
  }

  private static drawGoldPurchaseRow(
    page: any,
    x: number,
    y: number,
    width: number,
    label: string,
    rate: string,
    amount: string,
    isHeader = false
  ) {
    page.drawRectangle({
      x,
      y: y - 28,
      width,
      height: 28,
      color: isHeader ? rgb(0.16, 0.11, 0.06) : undefined,
      borderColor: rgb(0.86, 0.75, 0.52),
      borderWidth: 1,
    })
    const color = isHeader ? rgb(1, 0.94, 0.78) : rgb(0.16, 0.11, 0.06)
    page.drawText(label, {
      x: x + 14,
      y: y - 18,
      size: 10,
      font: isHeader ? 'Helvetica-Bold' : 'Helvetica',
      color,
    })
    page.drawText(rate, {
      x: x + width / 2,
      y: y - 18,
      size: 10,
      font: isHeader ? 'Helvetica-Bold' : 'Helvetica',
      color,
    })
    page.drawText(amount, {
      x: x + width - 130,
      y: y - 18,
      size: 10,
      font: isHeader ? 'Helvetica-Bold' : 'Helvetica',
      color,
    })
  }

  /**
   * Prepare invoice data from transaction
   */
  private static prepareInvoiceData(transaction: Transaction, slNo: string): InvoiceData {
    const user = transaction.user
    const currentYear = DateTime.now().year
    const nextYear = currentYear + 1

    // Calculate totals
    let makingCharges = 0
    let miscellaneousCharges = 0
    let cashAmount = 0
    let chequeAmount = 0
    let bankTransferAmount = 0
    let cardAmount = 0
    let advanceAmount = 0
    let ogAdjustmentAmount = 0

    const items = transaction.metadata!.map((item) => {
      makingCharges += item.makingCharge || 0
      miscellaneousCharges += item.miscellaneousCharges || 0
      cashAmount += item.cashAmount || 0
      chequeAmount += item.chequeAmount || 0
      bankTransferAmount += item.bankTransferAmount || 0
      cardAmount += item.cardAmount || 0
      advanceAmount += item.advanceAmount || 0
      ogAdjustmentAmount += item.ogAdjustmentAmount || 0

      const valueOfOrnaments = item.valueOfOrnament || 0
      const calculatedAmount = valueOfOrnaments * item.quantity

      return {
        itemName: item.itemName,
        huid: item.huid,
        quantity: item.quantity,
        hsnCode: item.hsnCode,
        grossWeight: item.grossWeight,
        netWeight: item.netWeight,
        ratePerGram: item.ratePerGram,
        valueOfOrnaments: valueOfOrnaments,
        diamondCharges: item.diamondCharges,
        amount: calculatedAmount,
      }
    })

    // Calculate tax based on user state
    // West Bengal: 3% CGST + 0% SGST = 3% total
    // Other states: 1.5% CGST + 1.5% SGST = 3% total
    const isWestBengal = user.state === IndianStatesEnum.WEST_BENGAL
    const cgstRate = isWestBengal ? 0.03 : 0.015
    const sgstRate = isWestBengal ? 0 : 0.015

    const taxableAmount = items.reduce(
      (sum, item) => sum + item.valueOfOrnaments * item.quantity,
      0
    )
    const cgstAmount = Math.round(taxableAmount * cgstRate)
    const sgstAmount = Math.round(taxableAmount * sgstRate)
    const totalTax = cgstAmount + sgstAmount

    // Grand total should match transaction amount
    const grandTotal = Number(transaction.amount)

    // Convert amount to words
    const toWords = new ToWords({
      localeCode: 'en-IN',
      converterOptions: {
        currency: true,
        ignoreDecimal: false,
        ignoreZeroCurrency: false,
        doNotAddOnly: false,
        currencyOptions: {
          name: 'Rupee',
          plural: 'Rupees',
          symbol: '₹',
          fractionalUnit: {
            name: 'Paisa',
            plural: 'Paise',
            symbol: '',
          },
        },
      },
    })
    const amountInWords = toWords.convert(grandTotal)

    return {
      slNo: `00${slNo}`,
      invoiceNo: `${slNo}/${currentYear}-${String(nextYear).slice(-2)}`,
      invoiceDate: transaction.createdAt.toFormat('dd-MM-yyyy'),
      orderNumber: `${user.id}${slNo}`,
      customerName: user.name,
      customerPhone: user.phone,
      customerState: user.state,
      items,
      makingCharges,
      miscellaneousCharges,
      cgst: cgstRate * 100,
      sgst: sgstRate * 100,
      grandTotal,
      cashAmount,
      chequeAmount,
      bankTransferAmount,
      cardAmount,
      advanceAmount,
      ogAdjustmentAmount,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      totalTax,
      amountInWords,
    }
  }

  /**
   * Create PDF document
   */
  private static async createPDF(data: InvoiceData): Promise<Uint8Array> {
    const pdf = PDF.create()
    pdf.setTitle(`Invoice ${data.invoiceNo}`)

    const page = pdf.addPage({ size: 'a4' })
    const { width, height } = page
    const margin = 40
    let yPos = height - margin

    // Fetch and embed logo
    let logoImage = null
    try {
      const logoUrl = 'https://cdn.imgchest.com/files/d7d2a3846fe3.jpeg'
      const logoResponse = await fetch(logoUrl)
      const logoBytes = new Uint8Array(await logoResponse.arrayBuffer())
      logoImage = pdf.embedPng(logoBytes)
    } catch (error) {
      console.error('Failed to load logo:', error)
    }

    // Header Section
    yPos = this.drawHeader(page, data, yPos, width, margin, logoImage)

    // Company Details
    yPos = this.drawCompanyDetails(page, yPos, width, margin)

    // Party Details
    yPos = this.drawPartyDetails(page, data, yPos, margin)

    // Invoice Metadata
    yPos = this.drawInvoiceMetadata(page, data, yPos, margin, width)

    // Items Table
    yPos = this.drawItemsTable(page, data, yPos, margin, width)

    // Additional Charges
    yPos = this.drawAdditionalCharges(page, data, yPos, margin, width)

    // Tax Summary
    yPos = this.drawTaxSummary(page, data, yPos, margin, width)

    // Payment Details
    yPos = this.drawPaymentDetails(page, data, yPos, margin, width)

    // Footer
    this.drawFooter(page, margin, width)

    return pdf.save()
  }

  private static drawHeader(
    page: any,
    data: InvoiceData,
    yPos: number,
    width: number,
    margin: number,
    logoImage: any
  ): number {
    // SL. NO., INVOICE BILL, ORIGINAL COPY
    page.drawText(`SL. NO. : ${data.slNo}`, {
      x: margin,
      y: yPos,
      size: 10,
      font: 'Helvetica',
    })

    page.drawText('INVOICE BILL', {
      x: width / 2 - 50,
      y: yPos,
      size: 12,
      font: 'Helvetica-Bold',
    })

    page.drawText('ORIGINAL COPY', {
      x: width - margin - 100,
      y: yPos,
      size: 10,
      font: 'Helvetica',
    })

    yPos -= 15

    // Draw logo if available
    if (logoImage) {
      const logoSize = 50
      page.drawImage(logoImage, {
        x: margin,
        y: yPos - logoSize + 15,
        width: logoSize,
        height: logoSize,
      })
    }

    // Company Name - larger font
    page.drawText('PRIME JEWELLERY PRIVATE LIMITED', {
      x: width / 2 - 150,
      y: yPos,
      size: 18,
      font: 'Helvetica-Bold',
    })

    yPos -= 18

    page.drawText('Unit of Hamare Sapne Marketing LLP', {
      x: width / 2 - 110,
      y: yPos,
      size: 10,
      font: 'Helvetica-Oblique',
    })

    yPos -= 25

    return yPos
  }

  private static drawCompanyDetails(
    page: any,
    yPos: number,
    width: number,
    margin: number
  ): number {
    page.drawText('Address: Kolkata, West Bengal', {
      x: margin,
      y: yPos,
      size: 9,
      font: 'Helvetica',
    })

    yPos -= 14

    page.drawText('www.primejewellers.com || Mob: 9147704213', {
      x: margin,
      y: yPos,
      size: 9,
      font: 'Helvetica',
    })

    yPos -= 22

    // GST and PAN
    const gstNumber = env.get('GST_NUMBER', '1234567890')
    const panNumber = env.get('PAN_NUMBER', '1234567890')
    const currentDate = DateTime.now().toFormat('dd/MM/yyyy')

    page.drawText(`GST NO. : ${gstNumber}`, {
      x: margin,
      y: yPos,
      size: 9,
      font: 'Helvetica',
    })

    page.drawText(`PAN NO. : ${panNumber}`, {
      x: width / 2 - 50,
      y: yPos,
      size: 9,
      font: 'Helvetica',
    })

    page.drawText(`Date : ${currentDate}`, {
      x: width - margin - 100,
      y: yPos,
      size: 9,
      font: 'Helvetica',
    })

    yPos -= 22

    // Border line
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: width - margin, y: yPos },
      color: rgb(0, 0, 0),
      thickness: 1,
    })

    yPos -= 18

    return yPos
  }

  private static drawPartyDetails(
    page: any,
    data: InvoiceData,
    yPos: number,
    margin: number
  ): number {
    page.drawText('Party Details:', {
      x: margin,
      y: yPos,
      size: 10,
      font: 'Helvetica-Bold',
    })

    yPos -= 16

    page.drawText(data.customerName.toUpperCase(), {
      x: margin,
      y: yPos,
      size: 10,
      font: 'Helvetica-Bold',
    })

    yPos -= 14

    page.drawText(`CONTACT NO : ${data.customerPhone}`, {
      x: margin,
      y: yPos,
      size: 9,
      font: 'Helvetica',
    })

    yPos -= 22

    return yPos
  }

  private static drawInvoiceMetadata(
    page: any,
    data: InvoiceData,
    yPos: number,
    margin: number,
    width: number
  ): number {
    // Draw table border
    const tableWidth = width - 2 * margin
    const rowHeight = 18

    page.drawRectangle({
      x: margin,
      y: yPos - rowHeight * 3,
      width: tableWidth,
      height: rowHeight * 3,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    })

    // Invoice No.
    page.drawText('Invoice No.', {
      x: margin + 5,
      y: yPos - 11,
      size: 9,
      font: 'Helvetica',
    })

    page.drawText(data.invoiceNo, {
      x: margin + 150,
      y: yPos - 11,
      size: 9,
      font: 'Helvetica',
    })

    yPos -= rowHeight

    // Invoice Date
    page.drawText('Invoice Date', {
      x: margin + 5,
      y: yPos - 11,
      size: 9,
      font: 'Helvetica',
    })

    page.drawText(data.invoiceDate, {
      x: margin + 150,
      y: yPos - 11,
      size: 9,
      font: 'Helvetica',
    })

    yPos -= rowHeight

    // Order No.
    page.drawText('Order No.', {
      x: margin + 5,
      y: yPos - 11,
      size: 9,
      font: 'Helvetica',
    })

    page.drawText(data.orderNumber, {
      x: margin + 150,
      y: yPos - 11,
      size: 9,
      font: 'Helvetica',
    })

    yPos -= rowHeight + 12

    return yPos
  }

  private static wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    const charWidth = fontSize * 0.5

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = testLine.length * charWidth

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    })

    if (currentLine) {
      lines.push(currentLine)
    }

    return lines.length > 0 ? lines : [text]
  }

  /**
   * Generate purchase invoice PDF for admin (no user_id filter).
   */
  static async generateGoldPurchaseInvoiceForAdmin(purchaseId: string): Promise<Uint8Array> {
    const purchase = await Purchase.query().where('id', purchaseId).preload('user').firstOrFail()

    const purchases = await Purchase.query().orderBy('created_at', 'asc').select('id')
    const invoiceIndex = purchases.findIndex((item) => item.id === purchase.id) + 1
    const invoiceNo = `PSJ${String(Math.max(invoiceIndex, 1)).padStart(6, '0')}`

    return this.createGoldPurchasePDF({
      invoiceNo,
      invoiceDate: purchase.createdAt.toFormat('dd-MM-yyyy'),
      buyerName: purchase.buyerName || purchase.user.name,
      customerPhone: purchase.user.phone,
      quantity: Number(purchase.quantity) || 1,
      totalAmount: Number(purchase.amount),
    })
  }

  private static drawItemsTable(
    page: any,
    data: InvoiceData,
    yPos: number,
    margin: number,
    width: number
  ): number {
    const tableWidth = width - 2 * margin
    const colWidths = [25, 60, 50, 30, 40, 45, 45, 50, 65, 60, 60]
    const headerHeight = 28
    const baseRowHeight = 22
    const lineHeight = 10

    // Table header background
    page.drawRectangle({
      x: margin,
      y: yPos - headerHeight,
      width: tableWidth,
      height: headerHeight,
      color: rgb(0.95, 0.95, 0.95),
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    })

    // Headers
    const headers = [
      'S.N.',
      'Item',
      'HUID',
      'Pcs',
      'HSN\nCode',
      'Gross\nWt.',
      'Net\nWt.',
      'Rate/\nGms.',
      'Value of\nOrnaments',
      'Diamond\nCharges',
      'Amount\n(₹)',
    ]

    let xPos = margin + 5
    headers.forEach((header, i) => {
      const lines = header.split('\n')
      lines.forEach((line, lineIndex) => {
        page.drawText(line, {
          x: xPos,
          y: yPos - 12 - lineIndex * 11,
          size: 8,
          font: 'Helvetica-Bold',
        })
      })
      xPos += colWidths[i]
    })

    yPos -= headerHeight

    // Draw items
    data.items.forEach((item, index) => {
      const wrappedItemName = this.wrapText(item.itemName, colWidths[1] - 5, 8)
      const rowHeight = Math.max(baseRowHeight, wrappedItemName.length * lineHeight + 4)

      page.drawRectangle({
        x: margin,
        y: yPos - rowHeight,
        width: tableWidth,
        height: rowHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.5,
      })

      xPos = margin + 5

      const values = [
        String(index + 1),
        '',
        item.huid,
        String(item.quantity),
        item.hsnCode,
        item.grossWeight.toFixed(2),
        item.netWeight.toFixed(2),
        item.ratePerGram.toFixed(0),
        item.valueOfOrnaments.toFixed(0),
        item.diamondCharges.toFixed(2),
        item.amount.toFixed(0),
      ]

      values.forEach((value, i) => {
        if (i === 1) {
          wrappedItemName.forEach((line, lineIndex) => {
            page.drawText(line, {
              x: xPos,
              y: yPos - 12 - lineIndex * lineHeight,
              size: 8,
              font: 'Helvetica',
            })
          })
        } else {
          page.drawText(value, {
            x: xPos,
            y: yPos - (rowHeight / 2 + 3),
            size: 8,
            font: 'Helvetica',
          })
        }
        xPos += colWidths[i]
      })

      yPos -= rowHeight
    })

    // Total quantity row
    const totalRowHeight = 22
    page.drawRectangle({
      x: margin,
      y: yPos - totalRowHeight,
      width: tableWidth,
      height: totalRowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    })

    page.drawText(
      `Total Quantity Pcs. : ${data.items
        .reduce((sum, item) => sum + item.quantity, 0)
        .toString()
        .padStart(2, '0')}`,
      {
        x: margin + 5,
        y: yPos - 14,
        size: 9,
        font: 'Helvetica-Bold',
      }
    )

    page.drawText(`Grand Total : ₹`, {
      x: width - margin - 150,
      y: yPos - 14,
      size: 9,
      font: 'Helvetica-Bold',
    })

    page.drawText(data.grandTotal.toFixed(0), {
      x: width - margin - 60,
      y: yPos - 14,
      size: 9,
      font: 'Helvetica-Bold',
    })

    yPos -= totalRowHeight + 10

    return yPos
  }

  private static drawAdditionalCharges(
    page: any,
    data: InvoiceData,
    yPos: number,
    margin: number,
    width: number
  ): number {
    const tableWidth = width - 2 * margin
    const rowHeight = 18

    // Additional charges rows
    const charges = [
      { label: 'Add: MAKING CHARGES', amount: data.makingCharges },
      { label: 'Add: ADDITIONAL CHARGES', amount: data.miscellaneousCharges },
      { label: `Add: CGST`, amount: data.cgstAmount, rate: `@${data.cgst}%` },
      { label: `Add: SGST`, amount: data.sgstAmount, rate: `@${data.sgst}%` },
    ]

    charges.forEach((charge) => {
      page.drawRectangle({
        x: margin,
        y: yPos - rowHeight,
        width: tableWidth,
        height: rowHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.5,
      })

      page.drawText(charge.label, {
        x: width - margin - 400,
        y: yPos - 11,
        size: 9,
        font: 'Helvetica',
      })

      if (charge.rate) {
        page.drawText(charge.rate, {
          x: width - margin - 200,
          y: yPos - 11,
          size: 9,
          font: 'Helvetica',
        })
      }

      page.drawText(charge.amount.toFixed(0), {
        x: width - margin - 60,
        y: yPos - 11,
        size: 9,
        font: 'Helvetica',
      })

      yPos -= rowHeight
    })

    yPos -= 12

    return yPos
  }

  private static drawTaxSummary(
    page: any,
    data: InvoiceData,
    yPos: number,
    margin: number,
    width: number
  ): number {
    const tableWidth = width - 2 * margin
    const rowHeight = 18

    // Tax summary header
    page.drawText(data.amountInWords, {
      x: margin + 5,
      y: yPos - 11,
      size: 10,
      font: 'Helvetica-Bold',
    })

    yPos -= 24

    // Tax table
    page.drawRectangle({
      x: margin,
      y: yPos - rowHeight * 2,
      width: tableWidth / 2,
      height: rowHeight * 2,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    })

    const taxHeaders = [
      'HSN/SAC',
      'Tax Rate',
      'Taxable Amt.',
      'CGST Amt.',
      'SGST Amt.',
      'Total Tax',
    ]
    const taxColWidths = [40, 38, 50, 45, 45, 45] // Custom widths for each column

    let xPos = margin + 5
    taxHeaders.forEach((header, index) => {
      page.drawText(header, {
        x: xPos,
        y: yPos - 11,
        size: 8,
        font: 'Helvetica-Bold',
      })
      xPos += taxColWidths[index]
    })

    yPos -= rowHeight

    // Tax values
    const hsnCode = data.items[0]?.hsnCode || '7113'
    xPos = margin + 5

    const taxValues = [
      hsnCode,
      `${data.cgst + data.sgst}%`,
      data.taxableAmount.toFixed(0),
      data.cgstAmount.toFixed(0),
      data.sgstAmount.toFixed(0),
      data.totalTax.toFixed(0),
    ]

    taxValues.forEach((value, index) => {
      page.drawText(value, {
        x: xPos,
        y: yPos - 11,
        size: 8,
        font: 'Helvetica',
      })
      xPos += taxColWidths[index]
    })

    yPos -= rowHeight + 12

    return yPos
  }

  private static drawPaymentDetails(
    page: any,
    data: InvoiceData,
    yPos: number,
    margin: number,
    width: number
  ): number {
    const tableWidth = width - 2 * margin
    const rowHeight = 15

    // Payment details table
    page.drawRectangle({
      x: margin,
      y: yPos - rowHeight * 2,
      width: tableWidth,
      height: rowHeight * 2,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    })

    // Row 1
    const payments1 = [
      { label: 'Cash', amount: data.cashAmount },
      { label: 'Bank Transfer', amount: data.bankTransferAmount },
      { label: 'Card', amount: data.cardAmount },
    ]

    let xPos = margin + 5
    const colWidth = tableWidth / 3

    payments1.forEach((payment) => {
      page.drawText(`${payment.label} : ${payment.amount.toFixed(2)}`, {
        x: xPos,
        y: yPos - 10,
        size: 8,
        font: 'Helvetica',
      })
      xPos += colWidth
    })

    yPos -= rowHeight

    // Row 2
    const payments2 = [
      { label: 'Cheque', amount: data.chequeAmount },
      { label: 'Advance', amount: data.advanceAmount },
      { label: 'O/G Adjustment', amount: data.ogAdjustmentAmount },
    ]

    xPos = margin + 5

    payments2.forEach((payment) => {
      page.drawText(`${payment.label} : ${payment.amount.toFixed(2)}`, {
        x: xPos,
        y: yPos - 10,
        size: 8,
        font: 'Helvetica',
      })
      xPos += colWidth
    })

    yPos -= rowHeight + 10

    return yPos
  }

  private static drawFooter(page: any, margin: number, width: number): void {
    const footerY = 80

    page.drawText('Bank Details', {
      x: margin,
      y: footerY,
      size: 8,
      font: 'Helvetica-Bold',
    })

    page.drawText("Receiver's Signatory", {
      x: margin,
      y: footerY - 15,
      size: 8,
      font: 'Helvetica',
    })

    page.drawText('For PRIME JEWELLERY PRIVATE LIMITED', {
      x: width - margin - 200,
      y: footerY + 20,
      size: 8,
      font: 'Helvetica',
    })

    page.drawText('Authorised Signatory', {
      x: width - margin - 200,
      y: footerY - 30,
      size: 8,
      font: 'Helvetica-Bold',
    })

    // Signature line
    page.drawLine({
      start: { x: width - margin - 200, y: footerY - 25 },
      end: { x: width - margin - 50, y: footerY - 25 },
      color: rgb(0, 0, 0),
      thickness: 1,
    })
  }
}
