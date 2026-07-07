import { z } from 'zod'

export const memberSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.email(),
  phone: z.string(),
  gender: z.enum(['male', 'female', 'other']),
  avatar: z.string().nullable(),
  role: z.enum(['admin', 'user']),
  activatedAt: z.string().or(z.date()).nullable(),
  parentId: z.number().nullable(),
  leg: z.enum(['left', 'right']).nullable().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  depth: z.number().optional(),
})

export type Member = z.infer<typeof memberSchema>

// Helper to determine member status based on logged-in user
export function getMemberStatus(
  member: Member,
  currentUserId: number
): 'active' | 'inactive' | 'direct' | null {
  // Check if this member is a direct child of the current user
  if (member.parentId !== currentUserId) {
    return null // Not a direct child
  }

  // Is a direct child, now check activation status
  return member.activatedAt ? 'active' : 'inactive'
}
