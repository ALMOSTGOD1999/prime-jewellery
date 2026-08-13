import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Transaction from '#models/transaction'
import MembershipLevelIncome from '#models/membership_level_income'
import { TransactionTypeEnum } from '#enums/transaction'

const MAX_LEVELS = 15
const DEFAULT_ACTIVATION_AMOUNT = 1000

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * One-time Membership Level Income.
 *
 * When a user activates, every activated upline within 15 levels earns a
 * one-time credit equal to a configurable percentage of the member's
 * activation amount (percentages live in `membership_level_incomes`).
 *
 * Eligibility: the downline member must have been activated on the same IST
 * calendar day or after the upline's activation day. Same-day batches count.
 *
 * Credits go to the upline's income wallet as approved wallet_credit
 * transactions (approved at the member's activation event time).
 */
export default class MembershipLevelIncomeService {
  static async grantForActivation(member: User): Promise<{ grants: number; total: number }> {
    if (!member.activatedAt || !member.parentId) {
      return { grants: 0, total: 0 }
    }

    const activatedAt: DateTime = member.activatedAt

    // Idempotency guard: never grant twice for the same activated member.
    const alreadyGranted = await Transaction.query()
      .where('type', TransactionTypeEnum.WALLET_CREDIT)
      .where('remark', 'like', `Membership Level Income % (ID ${member.id})`)
      .first()
    if (alreadyGranted) {
      return { grants: 0, total: 0 }
    }

    const levels = await MembershipLevelIncome.getActiveLevels()
    const pctByLevel = new Map(levels.map((l) => [l.level, l.percentage]))

    const memberDay = activatedAt.setZone('Asia/Kolkata').startOf('day').toMillis()

    // Walk the parent chain up to MAX_LEVELS, collecting eligible uplines.
    const grants: Array<{ upline: User; depth: number; amount: number }> = []
    let cursor: number | null = member.parentId
    for (let depth = 1; depth <= MAX_LEVELS && cursor; depth++) {
      const upline: User | null = await User.find(cursor)
      if (!upline) break

      const uplineDay = upline.activatedAt
        ? upline.activatedAt.setZone('Asia/Kolkata').startOf('day').toMillis()
        : null

      if (uplineDay !== null && uplineDay <= memberDay) {
        const pct = pctByLevel.get(depth) ?? 0
        const amount = roundMoney(((member.activationAmount || DEFAULT_ACTIVATION_AMOUNT) * pct) / 100)
        if (amount > 0) {
          grants.push({ upline, depth, amount })
        }
      }

      cursor = upline.parentId
    }

    if (grants.length === 0) {
      return { grants: 0, total: 0 }
    }

    const apply = async (trx: any) => {
      let total = 0
      for (const grant of grants) {
        await Transaction.create(
          {
            userId: grant.upline.id,
            type: TransactionTypeEnum.WALLET_CREDIT,
            amount: grant.amount,
            remark: `Membership Level Income (Level ${grant.depth}) from ${member.name} (ID ${member.id})`,
            approvedAt: activatedAt,
          },
          { client: trx }
        )
        await User.query({ client: trx })
          .where('id', grant.upline.id)
          .increment('income_wallet', grant.amount)
        total += grant.amount
      }
      return total
    }

    const total = await db.transaction(apply)
    return { grants: grants.length, total }
  }
}
