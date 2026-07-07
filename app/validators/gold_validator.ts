import vine from '@vinejs/vine'

export const purchaseValidator = vine.compile(
  vine.object({
    amount: vine.number().min(10000),
    goldWeight: vine.number().min(0.001).optional(),
    goldCarat: vine.string().in(['18ct', '22ct', '24ct']).optional(),
    goldRate: vine.number().min(1).optional(),
    goldPrice: vine.number().min(0).optional(),
    makingCharges: vine.number().min(0).optional(),
    gstAmount: vine.number().min(0).optional(),
    hallmarkAdditional: vine.number().min(0).optional(),
    totalItems: vine.number().min(1).optional(),
    remark: vine.string().maxLength(500).optional(),
  })
)
