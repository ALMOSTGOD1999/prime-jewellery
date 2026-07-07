import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/user'
import { UserRoleEnum, UserGenderEnum } from '#enums/user'

export default class MakeUser extends BaseCommand {
  static commandName = 'make:user'
  static description = 'Create a new user'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'Name of the user' })
  declare name: string

  @args.string({ description: 'Email of the user' })
  declare email: string

  @args.string({ description: 'Phone number of the user' })
  declare phone: string

  @flags.string({ description: 'Gender of the user', default: 'male', alias: 'g' })
  declare gender: string

  @flags.string({ description: 'Role of the user', default: 'user', alias: 'r' })
  declare role: string

  @flags.string({ description: 'Password for the user', alias: 'p' })
  declare password?: string

  async run() {
    // Validate Gender
    const genderInput = this.gender.toLowerCase()
    const gender = Object.values(UserGenderEnum).includes(genderInput as UserGenderEnum)
      ? (genderInput as UserGenderEnum)
      : UserGenderEnum.MALE

    // Validate Role
    const roleInput = this.role.toLowerCase()
    const role = Object.values(UserRoleEnum).includes(roleInput as UserRoleEnum)
      ? (roleInput as UserRoleEnum)
      : UserRoleEnum.USER

    // Prompt for password if not provided
    let password = this.password
    if (!password) {
      password = await this.prompt.secure('Enter password')
    }

    try {
      const user = await User.create({
        name: this.name,
        email: this.email,
        phone: this.phone,
        gender: gender,
        role: role,
        password: password,
      })
      this.logger.success(`User created successfully! ID: ${user.id}`)
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`)
    }
  }
}
