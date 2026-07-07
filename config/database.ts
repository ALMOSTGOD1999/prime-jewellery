import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: 'postgres',
  prettyPrintDebugQueries: true,
  connections: {
    postgres: {
      client: 'pg',
      // debug: true,
      connection: {
        connectionString: env.get('DATABASE_URL'),
      },
      pool: {
        min: 0,
        max: 10,
        idleTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        acquireTimeoutMillis: 30000,
        createRetryIntervalMillis: 200,
        reapIntervalMillis: 1000,
      },
      healthCheck: true,
      healthCheckInterval: 60000,
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

export default dbConfig
