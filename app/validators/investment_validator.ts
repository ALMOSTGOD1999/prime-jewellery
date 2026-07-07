import vine from '@vinejs/vine'

export const createInvestmentValidator = vine.compile(
  vine.object({
    amount: vine.number().min(10000),
    remark: vine.string().optional(),
  })
)

export const withdrawInvestmentIncomeValidator = vine.compile(
  vine.object({
    amount: vine.number().min(1),
  })
)
