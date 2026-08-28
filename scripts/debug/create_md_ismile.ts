import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/user'

export default class CreateMdIsmile extends BaseCommand {
  static commandName = 'create:md-ismile'
  static description = 'Create MD Ismile as parent of PJ190183 (root user with random ID)'
  static options: CommandOptions = { startApp: true }

  async run() {
    const admin = await User.find(190183)
    if (!admin) {
      this.logger.error('PJ190183 not found')
      return
    }

    // Check if MD Ismile already exists
    const existing = await User.query().where('name', 'MD Ismile').first()
    if (existing) {
      this.logger.warning(`MD Ismile already exists: PJ${String(existing.id).padStart(6, '0')}`)
      this.logger.info(`Updating PJ190183 parent to PJ${String(existing.id).padStart(6, '0')}...`)
      admin.parentId = existing.id
      await admin.save()
      this.logger.success(`Done! PJ190183 now under PJ${String(existing.id).padStart(6, '0')}`)
      return
    }

    this.logger.info('Creating MD Ismile as root user...')

    // Create MD Ismile as root user (no parent) — random ID auto-generated
    const mdIsmile = await User.create({
      name: 'MD Ismile',
      email: 'mdismile@primejewellery.com',
      phone: '0000000000',
      password: 'Prime@123',
      parentId: null,
      role: 'user' as any,
      gender: 'male' as any,
    })

    // Now set PJ190183's parent to MD Ismile
    admin.parentId = mdIsmile.id
    await admin.save()

    this.logger.success(
      `Created root user: PJ${String(mdIsmile.id).padStart(6, '0')} — ${mdIsmile.name}`
    )
    this.logger.success(
      `Updated PJ190183 (Admin) — parent is now PJ${String(mdIsmile.id).padStart(6, '0')} (${mdIsmile.name})`
    )
    this.logger.info(`Default password for MD Ismile: Prime@123`)
  }
}
