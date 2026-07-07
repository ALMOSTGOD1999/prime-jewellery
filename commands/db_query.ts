import { inject } from '@adonisjs/core'
import { args, BaseCommand } from '@adonisjs/core/ace'
import { Database } from '@adonisjs/lucid/database'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class DbQuery extends BaseCommand {
  static commandName = 'db:query'
  static description = 'Execute a raw SQL query and display results'

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  @args.string({
    argumentName: 'sql',
    description: 'SQL query to execute',
    required: true,
  })
  declare sql: string

  @inject()
  async run(db: Database) {
    try {
      const startTime = Date.now()
      const result = await db.rawQuery(this.sql)
      const duration = Date.now() - startTime

      // Handle different result types
      if (result.rows) {
        // SELECT queries return rows
        if (result.rows.length === 0) {
          this.logger.info('Query executed successfully. No rows returned.')
        } else {
          this.logger.info(
            `Query executed successfully (${result.rows.length} rows, ${duration}ms):`
          )
          console.table(result.rows)
        }
      } else if (result[0]) {
        // Some databases return array format
        const rows = Array.isArray(result[0]) ? result[0] : result
        if (rows.length === 0) {
          this.logger.info('Query executed successfully. No rows returned.')
        } else {
          this.logger.info(`Query executed successfully (${rows.length} rows, ${duration}ms):`)
          console.table(rows)
        }
      } else {
        // INSERT, UPDATE, DELETE queries
        const rowCount = result.rowCount || result[1]?.rowCount || 0
        this.logger.success(
          `Query executed successfully (${rowCount} rows affected, ${duration}ms)`
        )
      }
    } catch (error) {
      this.logger.error('Query failed:')
      this.logger.error(error.message)
      process.exit(1)
    }
  }
}
