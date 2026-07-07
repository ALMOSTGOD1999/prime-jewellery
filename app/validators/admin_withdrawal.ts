import vine from '@vinejs/vine'
import { WithdrawlStatusEnum } from '#enums/withdrawl'

export const updateWithdrawalValidator = vine.compile(
  vine.object({
    status: vine.enum(WithdrawlStatusEnum),
    remark: vine.string().optional().requiredWhen('status', '=', WithdrawlStatusEnum.REJECTED),
  })
)
