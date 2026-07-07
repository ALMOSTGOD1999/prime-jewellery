import vine from '@vinejs/vine'

export const updateKycValidator = vine.compile(
  vine.object({
    panNumber: vine.string().trim(),
    aadhaarNumber: vine.string().trim(),
    panProof: vine
      .file({
        size: '2mb',
        extnames: ['jpg', 'png', 'jpeg', 'webp'],
      })
      .optional(),
    aadhaarProof: vine
      .file({
        size: '2mb',
        extnames: ['jpg', 'png', 'jpeg', 'webp'],
      })
      .optional(),
  })
)
