import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Datenbank wird mit Testdaten befüllt...');

  // 1. Admin User anlegen
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@system.local' },
    update: {},
    create: {
      email: 'admin@system.local',
      passwordHash,
      role: 'ADMIN'
    }
  });

  // 2. Mandant anlegen
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Muster GmbH (Hauptmandant)',
      locations: {
        create: {
          name: 'Standort Berlin - Werk 1',
          asbestosStatus: 'Asbest: Nicht sicher (Generalvermutung)',
          constructionYear: 1985,
          workAreas: {
            create: [
              {
                name: 'Produktionshalle A',
                dustExposureType: 'Innen',
                gasType: 'Brennbar',
                roomVolume: 1500
              },
              {
                name: 'Labor',
                isFeuchtarbeit: true,
                dailyExposureHours: 3.5
              }
            ]
          }
        }
      }
    }
  });

  console.log(`Erfolgreich! Mandant "${tenant.name}" wurde angelegt.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
