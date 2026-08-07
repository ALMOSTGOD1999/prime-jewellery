import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime, Settings } from 'luxon'
import User from '#models/user'

export default class DebugTz extends BaseCommand {
  static commandName = 'debug-tz'
  static description = 'Print luxon default zone + TZ env'
  static options: CommandOptions = { startApp: true }

  async run() {
    this.logger.info(`process.env.TZ = ${JSON.stringify(process.env.TZ)}`)
    this.logger.info(`Settings.defaultZone = ${Settings.defaultZone}`)
    this.logger.info(`DateTime.local() = ${DateTime.local().toISO()}`)
    this.logger.info(`new Date() = ${new Date().toString()}`)
    const u = await User.find(705745)
    if (u?.activatedAt) {
      const d = u.activatedAt as unknown as Date
      this.logger.info(`type = ${typeof d}, isDate = ${d instanceof Date}`)
      this.logger.info(`d.toString() = ${d.toString()}`)
      this.logger.info(`d.toISOString() = ${d.toISOString()}`)
      const re = DateTime.fromJSDate(new Date(d.toString()))
      this.logger.info(`recreated zone = ${re.zoneName}, toSQL = ${re.toSQL()}`)
      const re2 = DateTime.fromJSDate(d)
      this.logger.info(`fromJSDate(d) zone = ${re2.zoneName}, toSQL = ${re2.toSQL()}`)
    }
  }
}
