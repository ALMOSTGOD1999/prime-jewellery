import type { HttpContext } from '@adonisjs/core/http'
import Achievement from '#models/achievement'

export default class AchievementsController {
  public async index({ auth, request, inertia }: HttpContext) {
    const user = auth.user!
    const { page = 1, limit = 10, search, collected } = request.qs()

    const achievements = await Achievement.query()
      .where('userId', user.id)
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

    return inertia.render('achievements/index', {
      achievements,
      filters: { search, collected },
    })
  }
}
