import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import fs from 'node:fs'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Bank from '#models/bank'
import Purchase from '#models/purchase'
import Transaction from '#models/transaction'
import { TransactionTypeEnum } from '#enums/transaction'

export default class ImportUsersSeeder extends BaseSeeder {
  async run() {
    // Clear existing data (keep admin user)
    console.log('🧹 Clearing existing data...')
    await db.from('banks').delete()
    await db.from('kycs').delete()
    await db.from('salaries').delete()
    await db.from('withdrawls').delete()
    await db.from('achievements').delete()
    await db.from('purchases').delete()
    await db.from('transactions').delete()
    await db.from('investment_return_distributions').delete()
    await db.from('investments').delete()
    await db.from('users').whereNot('role', 'admin').delete()
    console.log('✅ Existing data cleared')

    const csvPath = app.makePath('database', 'seeders', 'all-users new.csv')
    const content = fs.readFileSync(csvPath, 'utf-8')
    const lines = content.split('\n').filter((line) => line.trim())

    // Parse CSV header
    const header = this.parseCSVLine(lines[0])
    const rows = lines.slice(1).map((line) => this.parseCSVLine(line))

    console.log(`📄 Found ${rows.length} users to import`)

    let created = 0
    let skipped = 0
    let errors = 0

    // First pass: Create all users (without parent relationships)
    for (const row of rows) {
      try {
        const memberCode = this.getField(row, header, 'member_code')
        const userId = this.extractUserId(memberCode)
        if (!userId) {
          skipped++
          continue
        }

        // Check if user already exists
        const exists = await User.find(userId)
        if (exists) {
          skipped++
          continue
        }

        const name =
          this.getField(row, header, 'member_name') || this.getField(row, header, 'full_name') || ''
        const email = this.getField(row, header, 'real_email') || `${userId}@primejewellery.com`
        const phone = this.getField(row, header, 'phone') || ''
        const isActivated = this.getField(row, header, 'is_activated') === 'true'
        const totalPurchase =
          this.parseNumber(this.getField(row, header, 'total_purchase_value')) || 0
        const createdAt = this.parseDate(this.getField(row, header, 'created_at'))
        const updatedAt = this.parseDate(this.getField(row, header, 'updated_at'))

        // Create user with explicit ID
        const user = new User()
        user.id = userId
        user.name = name.trim()
        user.email = email.trim()
        user.phone = phone.trim()
        user.password = 'Prime@123' // Default password - user should change on first login

        // Address fields
        user.address = this.getField(row, header, 'address') || null
        user.city = this.getField(row, header, 'city') || null
        user.zipcode = this.parseNumber(this.getField(row, header, 'pincode'))

        // State mapping
        const stateStr = this.getField(row, header, 'state')
        user.state = this.mapState(stateStr) as any

        // Wallet/Investment
        if (totalPurchase > 0) {
          user.walletBalance = totalPurchase
          user.totalInvested = totalPurchase
        }

        // Activation
        if (isActivated) {
          user.activatedAt = createdAt || DateTime.now()
        }

        user.role = 'user' as any
        user.gender = 'male' as any
        user.createdAt = createdAt || DateTime.now()
        user.updatedAt = updatedAt || DateTime.now()

        await user.save()

        // Create purchase record if user has purchase value
        if (totalPurchase > 0) {
          await Purchase.create({
            userId: user.id,
            amount: totalPurchase,
            buyerName: name.trim(),
            approvedAt: createdAt || DateTime.now(),
          })

          // Create corresponding wallet credit transaction
          await Transaction.create({
            userId: user.id,
            type: TransactionTypeEnum.WALLET_CREDIT,
            amount: totalPurchase,
            remark: 'Initial wallet balance from CSV import',
            approvedAt: createdAt || DateTime.now(),
          })
        } else if (isActivated) {
          // Activated users with no purchase value get activation purchase
          await Purchase.create({
            userId: user.id,
            amount: 1000,
            buyerName: name.trim(),
            remark: 'Account activation',
            approvedAt: createdAt || DateTime.now(),
          })
        }

        // Create bank record if bank data exists
        const bankName = this.getField(row, header, 'bank_name')
        const accountHolder = this.getField(row, header, 'account_holder')
        const accountNumber = this.getField(row, header, 'account_number')
        const ifscCode = this.getField(row, header, 'ifsc_code')

        if (bankName || accountNumber) {
          try {
            await Bank.create({
              id: userId,
              name: bankName || 'Not Provided',
              holderName: accountHolder || name.trim(),
              accountNumber: accountNumber || '0000000000',
              ifsc: ifscCode || 'NOTKNOWN',
              branch: 'Main Branch',
              approvedAt: isActivated ? createdAt || DateTime.now() : null,
            })
          } catch (e) {
            // Bank record may already exist
          }
        }

        // Create KYC record if verified (skipped - requires attachment files)
        // KYC can be completed later through the normal KYC verification process

        created++
      } catch (error) {
        errors++
        console.error(
          `❌ Error importing user: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    console.log(`✅ First pass complete: ${created} created, ${skipped} skipped, ${errors} errors`)

    // Second pass: Update parent-child relationships via sponsor_code
    let parentUpdated = 0
    let parentErrors = 0

    for (const row of rows) {
      try {
        const memberCode = this.getField(row, header, 'member_code')
        const sponsorCode = this.getField(row, header, 'sponsor_code')
        const userId = this.extractUserId(memberCode)

        if (!userId || !sponsorCode) continue

        const sponsorId = this.extractUserId(sponsorCode)
        if (!sponsorId) continue

        const user = await User.find(userId)
        const sponsor = await User.find(sponsorId)

        if (user && sponsor && user.id !== sponsor.id) {
          user.parentId = sponsorId
          await user.save()
          parentUpdated++
        }
      } catch (error) {
        parentErrors++
      }
    }

    console.log(
      `✅ Second pass complete: ${parentUpdated} parent relationships updated, ${parentErrors} errors`
    )
    console.log(`🎉 Import complete!`)
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  private getField(row: string[], header: string[], fieldName: string): string {
    const index = header.indexOf(fieldName)
    if (index === -1 || index >= row.length) return ''
    return row[index]
  }

  private extractUserId(memberCode: string): number | null {
    const match = memberCode.match(/PJ(\d+)/i)
    if (!match) return null
    return Number(match[1])
  }

  private parseNumber(value: string): number | null {
    const num = Number(value)
    return isNaN(num) || value === '' ? null : num
  }

  private parseDate(dateStr: string): DateTime | null {
    if (!dateStr) return null
    const dt = DateTime.fromISO(dateStr)
    return dt.isValid ? dt : null
  }

  private mapState(stateStr: string): string | null {
    if (!stateStr) return null
    const s = stateStr.toLowerCase().trim()

    const stateMap: Record<string, string> = {
      'andhra pradesh': 'Andhra Pradesh',
      'arunachal pradesh': 'Arunachal Pradesh',
      'assam': 'Assam',
      'bihar': 'Bihar',
      'chhattisgarh': 'Chhattisgarh',
      'goa': 'Goa',
      'gujarat': 'Gujarat',
      'haryana': 'Haryana',
      'himachal pradesh': 'Himachal Pradesh',
      'jharkhand': 'Jharkhand',
      'karnataka': 'Karnataka',
      'kerala': 'Kerala',
      'madhya pradesh': 'Madhya Pradesh',
      'maharashtra': 'Maharashtra',
      'manipur': 'Manipur',
      'meghalaya': 'Meghalaya',
      'mizoram': 'Mizoram',
      'nagaland': 'Nagaland',
      'odisha': 'Odisha',
      'punjab': 'Punjab',
      'rajasthan': 'Rajasthan',
      'sikkim': 'Sikkim',
      'tamil nadu': 'Tamil Nadu',
      'telangana': 'Telangana',
      'tripura': 'Tripura',
      'uttar pradesh': 'Uttar Pradesh',
      'uttarakhand': 'Uttarakhand',
      'west bengal': 'West Bengal',
      'west bangala': 'West Bengal',
      'wb': 'West Bengal',
      'delhi': 'Delhi (NCT)',
      'andaman and nicobar': 'Andaman and Nicobar Islands',
      'andaman & nicobar': 'Andaman and Nicobar Islands',
      'chandigarh': 'Chandigarh',
      'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
      'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
      'lakshadweep': 'Lakshadweep',
      'puducherry': 'Puducherry',
      'pondicherry': 'Puducherry',
      'jammu and kashmir': 'Jammu and Kashmir',
      'jammu & kashmir': 'Jammu and Kashmir',
      'ladakh': 'Ladakh',
    }

    return stateMap[s] || null
  }
}
