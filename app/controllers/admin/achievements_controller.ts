import { DateTime } from 'luxon'

import type { HttpContext } from '@adonisjs/core/http'

import Achievement from '#models/achievement'
import User from '#models/user'

export default class AdminAchievementsController {
  public async index({ request, inertia }: HttpContext) {
    const { page = 1, limit = 10, search, collected } = request.qs()

    const achievements = await Achievement.query()
      .preload('user')
      .if(search, (query) => {
        query.where((q) => {
          q.where('reward', 'like', `%${search}%`).orWhereHas('user', (uq) => {
            uq.where('name', 'like', `%${search}%`).orWhere('id', 'like', `%${search}%`)
          })
        })
      })
      .if(collected === 'true', (query) => {
        query.whereNotNull('collectedAt')
      })
      .if(collected === 'false', (query) => {
        query.whereNull('collectedAt')
      })
      .orderBy('createdAt', 'desc')
      .paginate(page, limit)

    return inertia.render('admin/achievements/index', {
      achievements,
      filters: { search, collected },
    })
  }

  public async userAchievements({ params, request, inertia }: HttpContext) {
    const { page = 1, limit = 10, search, collected } = request.qs()
    const userId = params.userId

    const user = await User.findOrFail(userId)

    const achievements = await Achievement.query()
      .preload('user')
      .where('userId', userId)
      .if(search, (query) => {
        query.where('reward', 'like', `%${search}%`)
      })
      .if(collected === 'true', (query) => {
        query.whereNotNull('collectedAt')
      })
      .if(collected === 'false', (query) => {
        query.whereNull('collectedAt')
      })
      .orderBy('createdAt', 'desc')
      .paginate(page, limit)

    return inertia.render('admin/achievements/index', {
      achievements,
      filters: { search, collected },
      targetUser: user,
    })
  }

  public async collect({ params, request, response, session }: HttpContext) {
    const achievement = await Achievement.findOrFail(params.id)
    const { collectedAt } = request.only(['collectedAt'])

    achievement.collectedAt = collectedAt ? DateTime.fromISO(collectedAt) : DateTime.now()
    await achievement.save()

    session.flash('success', 'Achievement marked as collected')
    return response.redirect().back()
  }
}
