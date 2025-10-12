import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

