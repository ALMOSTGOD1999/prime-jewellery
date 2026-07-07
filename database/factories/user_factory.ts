import factory from '@adonisjs/lucid/factories'
import User from '#models/user'
import { UserGenderEnum, UserRoleEnum } from '#enums/user'
import { IndianStatesEnum } from '#enums/settings'

export const UserFactory = factory
  .define(User, async ({ faker }) => {
    const gender = faker.person.sex() as 'male' | 'female'
    const firstName = faker.person.firstName(gender)
    const lastName = faker.person.lastName(gender)
    return {
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }),
      phone: faker.phone.number({ style: 'international' }),
      gender: gender as unknown as UserGenderEnum,
      avatar: null,
      role: UserRoleEnum.USER,
      password: 'Abcd@1234',
      address: faker.location.streetAddress({ useFullAddress: true }),
      zipcode: Number.parseInt(faker.location.zipCode('######')),
      city: faker.location.city(),
      state: faker.helpers.enumValue(IndianStatesEnum),
    }
  })
  .build()
