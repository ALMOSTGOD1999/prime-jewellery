const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')

async function main() {
  await c.connect()
  
  // Check audit logs for user 456594
  try {
    const r1 = await c.query('SELECT * FROM audit_logs WHERE entity_id = $1 ORDER BY created_at DESC LIMIT 10', ['456594'])
    console.log('=== Audit logs for user 456594 ===')
    console.log(JSON.stringify(r1.rows, null, 2))
  } catch(e) {
    console.log('Audit logs query error:', e.message)
  }

  // Check all audit_logs around Aug 17
  try {
    const r2 = await c.query("SELECT * FROM audit_logs WHERE created_at >= '2026-08-16' AND created_at <= '2026-08-18' ORDER BY created_at DESC LIMIT 20")
    console.log('\n=== Audit logs Aug 16-18 ===')
    console.log(JSON.stringify(r2.rows, null, 2))
  } catch(e) {
    console.log('Audit logs date query error:', e.message)
  }

  // Check audit_logs table structure
  try {
    const r3 = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'audit_logs' ORDER BY ordinal_position")
    console.log('\n=== Audit logs columns ===')
    console.log(JSON.stringify(r3.rows, null, 2))
  } catch(e) {
    console.log('Audit logs schema error:', e.message)
  }

  // Check if inactivate controller creates any log/transaction
  // Check updated_at range — was it Aug 17?
  try {
    const r4 = await c.query("SELECT id, name, status, updated_at FROM users WHERE updated_at >= '2026-08-16' AND updated_at <= '2026-08-18' AND status = 'inactive' LIMIT 20")
    console.log('\n=== Users inactivated around Aug 17 ===')
    console.log(JSON.stringify(r4.rows, null, 2))
  } catch(e) {
    console.log('Users inactivated query error:', e.message)
  }

  await c.end()
}

main().catch(e => { console.error(e); process.exit(1) })
