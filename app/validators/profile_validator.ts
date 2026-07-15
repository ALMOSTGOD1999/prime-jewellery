import vine from '@vinejs/vine'
import { UserGenderEnum } from '#enums/user'
import { IndianStatesEnum } from '#enums/settings'

export const updateProfileValidator = vine.compile(
  vine.object({
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

export const changePasswordValidator = vine.compile(
  vine.object({
    password: vine.string().minLength(8).confirmed({ confirmationField: 'password_confirmation' }),
    currentPassword: vine.string(),
  })
)
