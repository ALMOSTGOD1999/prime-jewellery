const pg = require('pg')
const c = new pg.Client('postgresql://neondb_owner:npg_JfiP2jrmbs9o@ep-young-darkness-aorwi5hv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require')
c.connect().then(async () => {
  const r = await c.query("SELECT key FROM platform_configs WHERE key LIKE '%2026%' ORDER BY key")
  console.log(r.rows.map(r => r.key).join('\n'))
  await c.end()
})
