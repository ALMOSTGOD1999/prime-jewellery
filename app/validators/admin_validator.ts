import vine from '@vinejs/vine'
import { UserGenderEnum } from '#enums/user'
import { IndianStatesEnum } from '#enums/settings'

export const adminUpdateProfileValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(100),
    email: vine.string().email(),
    phone: vine.string().minLength(10).maxLength(15),
    gender: vine.enum(UserGenderEnum),
    avatar: vine
      .file({
        size: '2MB',
        extnames: ['jpg', 'jpeg', 'png', 'webp'],
      })
      .nullable()
      .optional(),
    address: vine.string().maxLength(255).nullable().optional(),
    city: vine.string().maxLength(100).nullable().optional(),
    state: vine.enum(IndianStatesEnum).nullable().optional(),
    zipcode: vine.number().min(100000).max(999999).nullable().optional(),
  })
)

export const adminUpdatePasswordValidator = vine.compile(
  vine.object({
    password: vine.string().minLength(8),
  })
)

export const approvalValidator = vine.compile(
  vine.object({
    type: vine.enum(['approved', 'rejected', 'stopped', 'cancelled']),
    amount: vine.number().min(1).optional(),
    remark: vine.string().optional(),
    metadata: vine
      .array(
        vine.object({
          itemName: vine.string(),
          huid: vine.string(),
          quantity: vine.number().min(1),
          hsnCode: vine.string(),
          grossWeight: vine.number().min(0),
          netWeight: vine.number().min(0),
          ratePerGram: vine.number().min(0),
          valueOfOrnament: vine.number().min(0),
          diamondCharges: vine.number().min(0),
          makingCharge: vine.number().min(0),
          miscellaneousCharges: vine.number().min(0),
          cashAmount: vine.number().min(0),
          chequeAmount: vine.number().min(0),
          bankTransferAmount: vine.number().min(0),
          cardAmount: vine.number().min(0),
          advanceAmount: vine.number().min(0),
          ogAdjustmentAmount: vine.number().min(0),
        })
      )
      .optional()
      .nullable(),
  })
)

export const purchaseUpdateValidator = vine.compile(
  vine.object({
    amount: vine.number().min(1).optional(),
    buyerName: vine.string().trim().minLength(2).maxLength(100).optional(),
    quantity: vine.number().min(0.001).optional(),
    createdAt: vine.string().optional(), // DateTime string
    approvedAt: vine.string().nullable().optional(),
    rejectedAt: vine.string().nullable().optional(),
    stoppedAt: vine.string().nullable().optional(),
    cancelledAt: vine.string().nullable().optional(),
  })
)

export const adminCreateUserValidator = vine.compile(
  vine.object({
    name: vine.string(),
    email: vine.string().email(),
    phone: vine.string(),
    password: vine.string().trim().minLength(6),
    parentId: vine.string().optional(),
    role: vine.enum(['user', 'franchise']).optional(),
  })
)
