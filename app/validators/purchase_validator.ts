import vine from '@vinejs/vine'

export const createPurchaseValidator = vine.compile(
  vine.object({
    amount: vine.number().min(10000),
    remark: vine.string().optional(),
  })
)

export const withdrawPurchaseIncomeValidator = vine.compile(
  vine.object({
    amount: vine.number().min(1),
  })
)


