import vine from '@vinejs/vine'

export const activateAccountValidator = vine.compile(
  vine.object({
    proof: vine.file({
      size: '2MB',
      extnames: ['jpg', 'jpeg', 'png'],
    }),
    utr: vine.string().minLength(1),
  })
)
