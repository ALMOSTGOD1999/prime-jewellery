import 'reflect-metadata'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import fs from 'fs'

await app.boot()

try {
  const rows = await db
    .from('users')
    .whereIn('id', [997860, 248892])
    .select('id', 'name', 'parent_id', 'status', 'activated_at')
  const lines = rows.map(
    (r) =>
      `ID: PJ${r.id} | Name: ${r.name} | Parent: ${r.parent_id ? 'PJ' + r.parent_id : 'none'} | Status: ${r.status} | Activated: ${r.activated_at}`
  )
  fs.writeFileSync('scripts/out.txt', lines.join('\n') + '\n')
} catch (e) {
  fs.writeFileSync('scripts/out.txt', 'ERROR: ' + e.message)
}
process.exit(0)
