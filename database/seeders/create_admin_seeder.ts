import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import { UserRoleEnum } from '#enums/user'

export default class CreateAdminSeeder extends BaseSeeder {
  async run() {
    // Check if admin already exists
    const existingAdmin = await User.query().where('role', UserRoleEnum.ADMIN).first()
    if (existingAdmin) {
      console.log(`Admin already exists: ID ${existingAdmin.id}, Name: ${existingAdmin.name}`)
      // Update password anyway
      existingAdmin.password = 'Prime4321'
      await existingAdmin.save()
      console.log('✅ Admin password updated to Prime4321')
      return
    }

    // Try to use existing user 190183 (Admin from CSV)
    let admin = await User.find(190183)

    if (admin) {
      admin.role = UserRoleEnum.ADMIN
      admin.password = 'Prime4321'
      await admin.save()
      console.log(`✅ User 190183 promoted to admin with password Prime4321`)
    } else {
      // Create a new admin user
      admin = await User.create({
        id: 1,
        name: 'Admin',
        email: 'admin@primejewellery.com',
        phone: '0000000000',
        password: 'Prime4321',
        role: UserRoleEnum.ADMIN,
        gender: 'male' as any,
      })
      console.log(`✅ Admin user created with ID 1 and password Prime4321`)
    }
  }
}
