// Create test users script - run with: node scripts/create_test_users.mjs
import 'reflect-metadata'
import { configure } from '@adonisjs/core'

// Boot the app FIRST before importing any services
const app = configure({
  baseURL: new URL('./', import.meta.url),
  environment: 'console',
})
await app.boot()

// NOW import services that depend on the booted app
const { default: db } = await import('@adonisjs/lucid/services/db')
const { default: hash } = await import('@adonisjs/core/services/hash')
const fs = await import('fs')

const passwordHash = await hash.make('password')
const now = new Date().toISOString()

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

const results = []

// Step 1: Check existing users
const existing = await db
  .from('users')
  .whereIn('id', [997860, 248892])
  .select('id', 'name', 'parent_id', 'status')
results.push('EXISTING USERS:')
for (const u of existing) {
  results.push(
    '  PJ' +
      u.id +
      ' ' +
      u.name +
      ' parent:' +
      (u.parent_id ? 'PJ' + u.parent_id : 'none') +
      ' ' +
      u.status
  )
}

// Step 2: Create 4 new users
results.push('')
results.push('CREATING USERS:')
for (const u of users) {
  const existingCheck = await db.from('users').where('id', u.id).first()
  if (existingCheck) {
    results.push('  PJ' + u.id + ' ' + u.name + ' ALREADY EXISTS - skipping')
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
    activated_at: now,
    activation_amount: 1000,
    parent_id: u.parentId,
    leg: 'left',
    wallet_balance: 0,
    income_wallet: 0,
    reward_wallet: 0,
    repurchase_wallet: 0,
    working_wallet: 0,
    total_invested: 0,
  })
  results.push('  Created PJ' + u.id + ' ' + u.name + ' (parent: PJ' + u.parentId + ')')
}

// Step 3: Move PJ248892 to be child of Test id new 4
const current248892 = await db.from('users').where('id', 248892).select('parent_id').first()
results.push('')
results.push('MOVING PJ248892:')
results.push(
  '  Current parent: ' + (current248892?.parent_id ? 'PJ' + current248892.parent_id : 'none')
)
await db.from('users').where('id', 248892).update({ parent_id: 997864 })
results.push('  New parent: PJ997864 (Test id new 4)')

// Step 4: Verify
results.push('')
results.push('FINAL CHAIN:')
const chain = await db
  .from('users')
  .whereIn('id', [997860, 997861, 997862, 997863, 997864, 248892])
  .select('id', 'name', 'parent_id', 'status')
  .orderBy('id')
for (const u of chain) {
  results.push(
    '  PJ' +
      u.id +
      ' ' +
      u.name +
      ' parent:' +
      (u.parent_id ? 'PJ' + u.parent_id : 'root') +
      ' ' +
      u.status
  )
}

results.push('')
results.push('DONE! Password for all new users: password')
results.push('Login: PJ997861 / password, PJ997862 / password, etc.')

fs.writeFileSync('scripts/results.txt', results.join('\n') + '\n')
console.log(results.join('\n'))

process.exit(0)
