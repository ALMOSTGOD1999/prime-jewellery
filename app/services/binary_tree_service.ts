import User from '#models/user'
import { UserLegEnum } from '#enums/user'

export default class BinaryTreeService {
  /**
   * Find the placement position for a new user using DFS spillover.
   *
   * Algorithm: Start at the root user, follow the leg (left/right) down the tree.
   * At each node, check if the leg child exists. If not, place the new user there.
   * If yes, move to that child and repeat indefinitely.
   *
   * @param rootUserId - The user whose invite link was used
   * @param leg - Which leg to place the new user in ('left' or 'right')
   * @returns The parent user under whom the new user should be placed
   */
  static async findPlacement(rootUserId: number, leg: UserLegEnum): Promise<User> {
    let currentUser = await User.findOrFail(rootUserId)

    while (true) {
      // Check if the leg child exists
      const child = await User.query()
        .where('parentId', currentUser.id)
        .where('leg', leg)
        .first()

      if (!child) {
        // Found empty spot - place new user here
        return currentUser
      }

      // Move to the child and continue DFS
      currentUser = child
    }
  }

  /**
   * Get the left child of a user
   */
  static async getLeftChild(userId: number): Promise<User | null> {
    return User.query()
      .where('parentId', userId)
      .where('leg', UserLegEnum.LEFT)
      .first()
  }

  /**
   * Get the right child of a user
   */
  static async getRightChild(userId: number): Promise<User | null> {
    return User.query()
      .where('parentId', userId)
      .where('leg', UserLegEnum.RIGHT)
      .first()
  }

  /**
   * Check if a user has space in a specific leg
   */
  static async hasSpace(userId: number, leg: UserLegEnum): Promise<boolean> {
    const child = await User.query()
      .where('parentId', userId)
      .where('leg', leg)
      .first()

    return !child
  }

  /**
   * Get the full path from root to a user (for debugging/display)
   */
  static async getPath(userId: number): Promise<{ user: User; leg: UserLegEnum | null }[]> {
    const path: { user: User; leg: UserLegEnum | null }[] = []
    let currentUser = await User.findOrFail(userId)

    while (currentUser) {
      path.unshift({ user: currentUser, leg: currentUser.leg })
      if (currentUser.parentId) {
        currentUser = await User.findOrFail(currentUser.parentId)
      } else {
        break
      }
    }

    return path
  }
}
