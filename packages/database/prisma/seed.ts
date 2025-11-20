import { PrismaClient, UserRole, CourseStatus } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Admin',
      surname: 'User',
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  })
  console.log('✅ Admin user created')

  // Create student user
  const studentPassword = await bcrypt.hash('student123', 10)
  const student = await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: {
      email: 'student@example.com',
      password: studentPassword,
      name: 'Student',
      surname: 'User',
      role: UserRole.STUDENT,
      emailVerified: true,
    },
  })
  console.log('✅ Student user created')

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'web-development' },
      update: {},
      create: {
        name: 'Web Development',
        slug: 'web-development',
        description: 'Learn modern web development',
        order: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'mobile-development' },
      update: {},
      create: {
        name: 'Mobile Development',
        slug: 'mobile-development',
        description: 'Build mobile applications',
        order: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'data-science' },
      update: {},
      create: {
        name: 'Data Science',
        slug: 'data-science',
        description: 'Master data science and analytics',
        order: 3,
      },
    }),
  ])
  console.log('✅ Categories created')

  // Create a sample course
  const course = await prisma.course.create({
    data: {
      title: 'Complete Web Development Bootcamp',
      slug: 'complete-web-development-bootcamp',
      description: 'Learn web development from scratch',
      price: 99.99,
      status: CourseStatus.PUBLISHED,
      categoryId: categories[0].id,
      authorId: admin.id,
    },
  })
  console.log('✅ Sample course created')

  // Create course version
  const courseVersion = await prisma.courseVersion.create({
    data: {
      courseId: course.id,
      version: 1,
      title: 'Complete Web Development Bootcamp',
      description: 'Learn web development from scratch',
      isActive: true,
      publishedAt: new Date(),
    },
  })
  console.log('✅ Course version created')

  // Create promo code
  await prisma.promoCode.create({
    data: {
      code: 'LAUNCH50',
      description: 'Launch discount - 50% off',
      discount: 50,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      maxUses: 100,
    },
  })
  console.log('✅ Promo code created')

  console.log('🎉 Database seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
