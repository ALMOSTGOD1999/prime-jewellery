import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import hash from '@adonisjs/core/services/hash'

export default class CreateTestUsers extends BaseCommand {
  static commandName = 'create:test-users'
  static description = 'Create 4 test users between PJ997860 and PJ248892'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const passwordHash = await hash.make('password')
    const now = DateTime.now()

    const users = [
      {
        id: 997861,
        name: 'Test id new 1',
        email: 'test1@test.com',
        phone: '9000000001',
        parentId: 997860,
      },
      {
        id: 997862,
        name: 'Test id new 2',
        email: 'test2@test.com',
        phone: '9000000002',
        parentId: 997861,
      },
      {
        id: 997863,
        name: 'Test id new 3',
        email: 'test3@test.com',
        phone: '9000000003',
        parentId: 997862,
      },
      {
        id: 997864,
        name: 'Test id new 4',
        email: 'test4@test.com',
        phone: '9000000004',
        parentId: 997863,
      },
    ]

    // Step 1: Check existing users
    const existing = await db
      .from('users')
      .whereIn('id', [997860, 248892])
      .select('id', 'name', 'parent_id', 'status')
    this.logger.info('EXISTING USERS:')
    for (const u of existing) {
      this.logger.info(
        `  PJ${u.id} ${u.name} parent:${u.parent_id ? 'PJ' + u.parent_id : 'none'} ${u.status}`
      )
    }

    if (existing.length < 2) {
      this.logger.error('One or both anchor users (PJ997860, PJ248892) not found!')
      return
    }

    // Step 2: Create 4 new users
    this.logger.info('')
    this.logger.info('CREATING USERS:')
    for (const u of users) {
      const exists = await db.from('users').where('id', u.id).first()
      if (exists) {
        this.logger.info(`  PJ${u.id} ${u.name} ALREADY EXISTS - skipping`)
        continue
      }

      await db.table('users').insert({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        gender: 'other',
        role: 'user',
        password: passwordHash,
        status: 'active',
        activated_at: now.toISO(),
        activation_amount: 1000,
        parent_id: u.parentId,
        leg: 'left',
        wallet_balance: 0,
        income_wallet: 0,
        reward_wallet: 0,
        repurchase_wallet: 0,
        working_wallet: 0,
        total_invested: 0,
        created_at: now.toISO(),
        updated_at: now.toISO(),
      })

      this.logger.success(`  Created PJ${u.id} ${u.name} (parent: PJ${u.parentId})`)
    }

    // Step 3: Move PJ248892 to be child of Test id new 4
    const current248892 = await db.from('users').where('id', 248892).select('parent_id').first()
    this.logger.info('')
    this.logger.info('MOVING PJ248892:')
    this.logger.info(
      `  Current parent: ${current248892?.parent_id ? 'PJ' + current248892.parent_id : 'none'}`
    )
    await db.from('users').where('id', 248892).update({ parent_id: 997864 })
    this.logger.success('  New parent: PJ997864 (Test id new 4)')

    // Step 4: Verify
    this.logger.info('')
    this.logger.info('FINAL CHAIN:')
    const chain = await db
      .from('users')
      .whereIn('id', [997860, 997861, 997862, 997863, 997864, 248892])
      .select('id', 'name', 'parent_id', 'status')
      .orderBy('id')

    for (const u of chain) {
      this.logger.info(
        `  PJ${u.id} ${u.name} parent:${u.parent_id ? 'PJ' + u.parent_id : 'root'} ${u.status}`
      )
    }

    this.logger.info('')
    this.logger.success('DONE! Password for all new users: password')
    this.logger.info('Login: PJ997861 / password, PJ997862 / password, etc.')
  }
}
