import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'yoyopod2024';

async function main() {
  console.log('🌱 Seeding database...');

  // Create app state
  await prisma.appState.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      isFirstRun: true,
      licenseAccepted: false,
      setupCompleted: false,
      deviceVariant: 'core',
    },
  });

  console.log('✅ App state created');

  // Create default user
  const existingUser = await prisma.user.findUnique({
    where: { username: 'parent' },
  });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    
    await prisma.user.create({
      data: {
        username: 'parent',
        password: hashedPassword,
        mustChangePassword: true,
        settings: {
          create: {
            deviceName: 'YoyoPod',
          },
        },
      },
    });

    console.log('✅ Default user created (username: parent, password: yoyopod2024)');
  } else {
    console.log('ℹ️  Default user already exists');
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

