import { BaseJob } from 'adonis-resque'
import User from '#models/user'
import Achievement from '#models/achievement'
import RewardService from '#services/reward_service'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'

export default class CalculateAchievement extends BaseJob {
  async perform(userId: number) {
    try {
      // 1. Get all ancestors (upward tree) including the user itself in ONE query
      const ancestorIds = await this.getAncestors(userId)

      if (ancestorIds.length === 0) {
        logger.warn(`No ancestors found for user ${userId}`)
        return
      }

      // 2. Load all ancestor users at once (1 query instead of N)
      const users = await User.query().whereIn('id', ancestorIds)
      const userMap = new Map(users.map((u) => [u.id, u]))

      // 3. Get existing achievements for all users at once (1 query instead of N)
      const existingAchievements = await Achievement.query()
        .whereIn('user_id', ancestorIds)
        .select('user_id', 'criteria')

      // Build a map of user_id -> Set of criteria they already have
      const achievementMap = new Map<number, Set<number>>()
      for (const ach of existingAchievements) {
        if (!achievementMap.has(ach.userId)) {
          achievementMap.set(ach.userId, new Set())
        }
        achievementMap.get(ach.userId)!.add(ach.criteria)
      }

      // 4. Calculate achievements for all users and collect them for batch insert
      const achievementsToCreate: Array<{
        userId: number
        power: number
        weaker: number
        criteria: number
        reward: string
      }> = []

      for (const ancestorId of ancestorIds) {
        const user = userMap.get(ancestorId)
        if (!user) continue

        // Calculate power and weaker for this user
        const { power, weaker } = await RewardService.getPowerAndWeaker(user)

        // Get the highest achievement this user is eligible for
        const eligibleReward = RewardService.getAchievementInfo(power, weaker)

        if (!eligibleReward) {
          // User doesn't meet any achievement criteria
          continue
        }

        // Check if user already has this achievement
        const userAchievements = achievementMap.get(ancestorId)
        if (userAchievements?.has(eligibleReward.criteria)) {
          // User already has this achievement
          continue
        }

        // Add to batch create list
        achievementsToCreate.push({
          userId: ancestorId,
          power: Math.floor(power),
          weaker: Math.floor(weaker),
          criteria: eligibleReward.criteria,
          reward: eligibleReward.reward,
        })

        logger.info(
          `Queued achievement for user ${ancestorId}: ${eligibleReward.reward} (${eligibleReward.criteria})`
        )
      }

      // 5. Batch insert all achievements (1 query instead of N)
      if (achievementsToCreate.length > 0) {
        try {
          await Achievement.createMany(achievementsToCreate)
          logger.info(
            `Successfully created ${achievementsToCreate.length} achievement(s) for user ${userId} and ancestors`
          )
        } catch (error: any) {
          // Handle duplicate key error (concurrent job execution)
          if (error?.code === '23505' || error?.constraint) {
            logger.warn(
              `Some achievements may have been created by another concurrent job for user ${userId}`
            )
          } else {
            throw error
          }
        }
      } else {
        logger.info(`No new achievements to create for user ${userId} and ancestors`)
      }
    } catch (error) {
      logger.error(`Error calculating achievements for user ${userId}: ${error.message}`)
      throw error
    }
  }

  private async getAncestors(userId: number): Promise<number[]> {
    // Use recursive CTE to get all ancestors including the user itself
    const result = await db.rawQuery(
      `
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id
        FROM users
        WHERE id = ?
        UNION ALL
        SELECT u.id, u.parent_id
        FROM users u
        INNER JOIN ancestors a ON u.id = a.parent_id
      )
      SELECT id FROM ancestors
      `,
      [userId]
    )

    return result.rows.map((r: any) => r.id)
  }
}
