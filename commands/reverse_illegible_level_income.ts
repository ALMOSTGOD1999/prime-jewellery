import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Transaction from '#models/transaction'

/**
 * Reverse illegitimate level income for specific users who received income
 * from downline purchases made BEFORE the downline member was activated.
 *
 * PJ IDs map directly to user IDs: PJ170335 → user id 170335
 *
 * Usage:
 *   node ace reverse-illegible-level-income          (dry run — shows what would be reversed)
 *   node ace reverse-illegible-level-income --apply   (actually reverses)
 */
export default class ReverseIllegibleLevelIncome extends BaseCommand {
  static commandName = 'reverse-illegible-level-income'
  static description = 'Reverse level income received from pre-activation purchases'
  static options: CommandOptions = { startApp: true }

  async run() {
    const apply = process.argv.includes('--apply')

    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info('  REVERSE ILLEGITIMATE LEVEL INCOME')
    this.logger.info(`  Mode: ${apply ? 'APPLY (live)' : 'DRY RUN (no changes)'}`)
    this.logger.info('══════════════════════════════════════════════════')

    // PJ IDs map to numeric user IDs
    const targetIds = [170335, 741392, 216409]

    const targets = await User.query().whereIn('id', targetIds)

    if (targets.length === 0) {
      this.logger.error('Could not find any of the target users!')
      return
    }

    this.logger.info(`Found ${targets.length} target users:`)
    for (const u of targets) {
      this.logger.info(`  - ${u.name} (ID: ${u.id})`)
    }

    let totalReversed = 0
    let totalTransactions = 0

    for (const target of targets) {
      this.logger.info(`\n── Processing ${target.name} (ID: ${target.id}) ──`)

      // Find all Membership Level Income WALLET_CREDIT transactions for this user
      const levelIncomeTxns = await Transaction.query()
        .where('user_id', target.id)
        .where('type', 'wallet_credit')
        .where('remark', 'like', 'Membership Level Income %')
        .whereNotNull('approved_at')
        .orderBy('approved_at', 'asc')

      this.logger.info(`  Found ${levelIncomeTxns.length} level income transactions`)

      const illegitimate: Array<{
        txn: Transaction
        memberId: number
        memberName: string
        level: number
        amount: number
        reason: string
      }> = []

      for (const txn of levelIncomeTxns) {
        // Parse remark: "Membership Level Income (Level N) from NAME (ID M)"
        const match = txn.remark?.match(
          /Membership Level Income \(Level (\d+)\) from (.+) \(ID (\d+)\)/
        )
        if (!match) {
          this.logger.info(`  WARN: Could not parse remark for txn ${txn.id}: ${txn.remark}`)
          continue
        }

        const level = Number(match[1])
        const memberName = match[2]
        const memberId = Number(match[3])

        // Fetch the downline member
        const member = await User.find(memberId)
        if (!member) {
          this.logger.info(`  WARN: Member ID ${memberId} not found — skipping txn ${txn.id}`)
          continue
        }

        if (!member.activatedAt) {
          // Member was never activated — their purchases shouldn't generate level income
          illegitimate.push({
            txn,
            memberId,
            memberName,
            level,
            amount: Number(txn.amount),
            reason: `Member ${memberName} (ID ${memberId}) was NEVER activated`,
          })
          continue
        }

        // Check if the earliest approved purchase was BEFORE the member's activation
        const earliestPurchase = await db
          .from('purchases')
          .where('user_id', memberId)
          .whereNotNull('approved_at')
          .whereNull('cancelled_at')
          .orderBy('approved_at', 'asc')
          .first()

        if (earliestPurchase) {
          const purchaseDate = DateTime.fromJSDate(
            new Date(earliestPurchase.approved_at)
          ).startOf('day')
          const memberActivatedAt = DateTime.fromJSDate(
            new Date(member.activatedAt.toString())
          ).startOf('day')

          if (purchaseDate < memberActivatedAt) {
            illegitimate.push({
              txn,
              memberId,
              memberName,
              level,
              amount: Number(txn.amount),
              reason: `Earliest purchase (${purchaseDate.toFormat('yyyy-MM-dd')}) BEFORE activation (${memberActivatedAt.toFormat('yyyy-MM-dd')})`,
            })
          }
        }
      }

      if (illegitimate.length === 0) {
        this.logger.info('  No illegitimate transactions found.')
        continue
      }

      this.logger.info(`  ${illegitimate.length} illegitimate transactions:`)
      let userTotal = 0
      for (const item of illegitimate) {
        this.logger.info(
          `    - Txn ${item.txn.id}: Rs.${item.amount} (Level ${item.level}) from ${item.memberName} (ID ${item.memberId})`
        )
        this.logger.info(`      Reason: ${item.reason}`)
        userTotal += item.amount
      }
      this.logger.info(`  Subtotal to reverse: Rs.${userTotal}`)

      if (apply) {
        this.logger.info('  Applying reversals...')

        await db.transaction(async (trx) => {
          for (const item of illegitimate) {
            // Debit working wallet
            await User.query({ client: trx })
              .where('id', target.id)
              .decrement('working_wallet', item.amount)

            // Create reversal transaction
            await Transaction.create(
              {
                userId: target.id,
                type: 'wallet_debit' as any,
                amount: item.amount,
                remark: `REVERSAL: Level ${item.level} income from ${item.memberName} (ID ${item.memberId}) — purchase before activation (Original Txn #${item.txn.id})`,
                approvedAt: DateTime.now(),
              },
              { client: trx }
            )
          }
        })

        this.logger.info(`  OK: Reversed Rs.${userTotal} for ${target.name}`)
        totalReversed += userTotal
      } else {
        this.logger.info(`  [DRY RUN] Would reverse Rs.${userTotal}`)
        totalReversed += userTotal
      }

      totalTransactions += illegitimate.length
    }

    this.logger.info('\n══════════════════════════════════════════════════')
    this.logger.info('  SUMMARY')
    this.logger.info('══════════════════════════════════════════════════')
    this.logger.info(`  Transactions to reverse: ${totalTransactions}`)
    this.logger.info(`  Total amount: Rs.${totalReversed}`)
    this.logger.info(`  Mode: ${apply ? 'APPLIED' : 'DRY RUN — run with --apply to execute'}`)
    this.logger.info('══════════════════════════════════════════════════')
  }
}
