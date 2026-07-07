import vine from '@vinejs/vine'

export const paginationValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).optional(),
  })
)

export const filterValidator = (allowedSortedBy: string[]) =>
  vine.compile(
    vine.object({
      search: vine.string().minLength(0).optional(),
      sortBy: vine.enum(allowedSortedBy).optional(),
      sortOrder: vine.enum(['asc', 'desc']).optional(),
    })
  )
