import vine from '@vinejs/vine'

export const adminWalletWithdrawValidator = vine.compile(
  vine.object({
    userId: vine.number().exists({ table: 'users', column: 'id' }),
    remark: vine.string().optional(),
  })
)
