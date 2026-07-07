import { WithdrawlTypeEnum } from '#enums/withdrawl'

export const WITHDRAWAL_DATES: Record<WithdrawlTypeEnum, number[]> = {
  [WithdrawlTypeEnum.ACTIVATION_CASHBACK]: [10],
  [WithdrawlTypeEnum.ACTIVATION_SPONSOR]: [], // Available anytime
  [WithdrawlTypeEnum.ACTIVATION_LEVEL]: [9],
  [WithdrawlTypeEnum.CASHBACK]: [5],
  [WithdrawlTypeEnum.LEVEL]: [9],
  [WithdrawlTypeEnum.SALARY]: [5, 20],
  [WithdrawlTypeEnum.EMI]: [],
  [WithdrawlTypeEnum.EMI_LEVEL]: [9],
  [WithdrawlTypeEnum.INVESTMENT_INCOME]: [], // Available anytime
}
