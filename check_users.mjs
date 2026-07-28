import 'reflect-metadata'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

// Load env first
process.env.NODE_ENV = 'development'

const { configure } = await import('@adonisjs/core')
const app = configure({
  baseURL: new URL('./', import.meta.url),
  environment: 'console',
})

const { default: db } = await import('@adonisjs/lucid/services/db')

const rows = await db.from('users').whereIn('id', [997860, 248892]).select('id', 'name', 'parent_id', 'status', 'activated_at')
console.log('EXISTING USERS:')
console.log(JSON.stringify(rows, null, 2))

// Also check who PJ248892's current parent is
const parent = await db.from('users').where('id', rows[0]?.parent_id || 0).select('id', 'name').first()
console.log('\nPJ248892 parent:', JSON.stringify(parent, null, 2))

process.exit(0)
