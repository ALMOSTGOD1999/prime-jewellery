import vine from '@vinejs/vine'

export const updateBankValidator = vine.compile(
  vine.object({
    name: vine.string().trim(),
    branch: vine.string().trim(),
    ifsc: vine.string().trim(),
    holderName: vine.string().trim(),
    accountNumber: vine.string(),
    upi: vine.string().trim(),
    qr: vine
      .file({
        size: '2mb',
        extnames: ['jpg', 'png', 'jpeg', 'webp'],
      })
      .optional(),
  })
)
