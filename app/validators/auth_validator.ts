import vine from '@vinejs/vine'

export const signupValidator = vine.compile(
  vine.object({
    referralCode: vine.string().optional(),
    name: vine.string(),
    email: vine.string(),
    phone: vine.string(),
    password: vine.string().trim().confirmed({ confirmationField: 'confirmPassword' }),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    userId: vine.string(),
    password: vine.string(),
  })
)

export const addMemberValidator = vine.compile(
  vine.object({
    name: vine.string(),
    email: vine.string(),
    phone: vine.string(),
    password: vine.string().trim().confirmed({ confirmationField: 'confirmPassword' }),
    type: vine.enum(['user', 'franchise']),
    inviteCode: vine.string(),
  })
)
