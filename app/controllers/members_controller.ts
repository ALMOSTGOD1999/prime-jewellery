import type { HttpContext } from '@adonisjs/core/http'
import { UserRoleEnum, UserLegEnum } from '#enums/user'
import UserService from '#services/user_service'
import BinaryTreeService from '#services/binary_tree_service'
import { addMemberValidator } from '#validators/auth_validator'
import User from '#models/user'

export default class MembersController {
  async index({ auth, inertia, request }: HttpContext) {
    const user = auth.getUserOrFail()

    const { search, status, scope = 'team' } = request.qs()

    const [directCount, teamCount, maxDepth, members] = await Promise.all([
      UserService.getChildrenCount(user),
      UserService.getTeamCount(user),
      UserService.getMaxDepth(user),
      UserService.getMembers(user, { scope, search, status }),
    ])

    return inertia.render('members', {
      members,
      counts: { direct: directCount, team: teamCount },
      maxDepth,
    })
  }

  async tree({ auth, inertia }: HttpContext) {
    const user = auth.getUserOrFail()
    const rootUser = await UserService.getTreeRoot(user)

    return inertia.render('tree', {
      rootUser,
    })
  }

  public async children({ params, response, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const targetUserId = Number(params.id)

    // 1. Admin can see everything
    if (user.role !== UserRoleEnum.ADMIN) {
      // 2. User can see their own children
      if (user.id !== targetUserId) {
        // 3. User can see children of their descendants
        const isDescendant = await UserService.isDescendant(user.id, targetUserId)

        if (!isDescendant) {
          return response.forbidden({
            message: 'You are not authorized to view this user children',
          })
        }
      }
    }

    const children = await UserService.getChildren(targetUserId)

    return response.json(children)
  }

  public async store({ request, response, auth, session }: HttpContext) {
    const parent = auth.getUserOrFail()
    const { name, password, email, phone, type, inviteCode, leg: formLeg } =
      await request.validateUsing(addMemberValidator)

    let finalParentId = parent.id
    let finalLeg: UserLegEnum | null = null

    if (inviteCode) {
      // Strip prefix (PJL = left, PJR = right) to get the numeric ID
      const cleanCode = inviteCode.replace(/^[a-zA-Z]+/i, '')

      // Prefer leg from form data; fall back to extracting from invite code prefix
      let leg: UserLegEnum | null = (formLeg as UserLegEnum) || null
      if (!leg) {
        const prefix = inviteCode.match(/^[a-zA-Z]+/i)?.[0]?.toLowerCase() || ''
        if (prefix.endsWith('l')) {
          leg = UserLegEnum.LEFT
        } else if (prefix.endsWith('r')) {
          leg = UserLegEnum.RIGHT
        }
      }

      try {
        const targetParent = await User.findOrFail(cleanCode)

        // Verify permission: Allow if it's the user themselves OR a descendant
        if (targetParent.id !== parent.id) {
          const isDescendant = await UserService.isDescendant(parent.id, targetParent.id)
          if (!isDescendant) {
            session.flash('error', 'You can only add members under your team hierarchy')
            return response.redirect().back()
          }
        }

        // If leg is specified, use DFS spillover to find placement
        if (leg) {
          const placementParent = await BinaryTreeService.findPlacement(targetParent.id, leg)
          finalParentId = placementParent.id
          finalLeg = leg
        } else {
          finalParentId = targetParent.id
        }
      } catch (error) {
        session.flash('error', 'Invalid Invite Code or User ID')
        return response.redirect().back()
      }
    }

    await User.create({
      name,
      password,
      email,
      phone,
      parentId: finalParentId,
      leg: finalLeg,
      role: type as UserRoleEnum,
    })

    session.flash('success', 'Member added successfully')
    return response.redirect().back()
  }

  /**
   * Look up a user by ID and return basic info (for parent ID autocomplete)
   */
  public async lookup({ params, response, auth }: HttpContext) {
    const currentUser = auth.getUserOrFail()
    const rawId = String(params.id)

    // Strip prefix (PJL = left, PJR = right)
    const cleanId = rawId.replace(/^[a-zA-Z]+/i, '')
    const userId = Number(cleanId)

    if (!userId) {
      return response.badRequest({ message: 'Invalid user ID' })
    }

    const user = await User.find(userId)
    if (!user) {
      return response.notFound({ message: 'User not found' })
    }

    // Non-admins can only look up users in their own team hierarchy
    if (currentUser.role !== UserRoleEnum.ADMIN) {
      if (user.id !== currentUser.id) {
        const isDescendant = await UserService.isDescendant(currentUser.id, user.id)
        if (!isDescendant) {
          return response.forbidden({ message: 'Not authorized' })
        }
      }
    }

    return response.json({
      id: user.id,
      name: user.name,
    })
  }
}
