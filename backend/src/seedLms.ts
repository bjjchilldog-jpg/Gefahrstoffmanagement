import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding LMS Test Data...');

  // 1. Create employees
  const pin1 = await bcrypt.hash('1234', 10);
  const pin2 = await bcrypt.hash('9876', 10);

  const emp1 = await prisma.employee.create({
    data: {
      firstName: 'Max',
      lastName: 'Mustermann',
      employeeNumber: '1001',
      pin: pin1,
      department: 'Lager',
      email: 'max@example.com'
    }
  });

  const emp2 = await prisma.employee.create({
    data: {
      firstName: 'Erika',
      lastName: 'Musterfrau',
      employeeNumber: '1002',
      pin: pin2,
      department: 'Labor',
      supervisorId: emp1.id,
      email: 'erika@example.com'
    }
  });

  // 2. Create Training Module
  const webhookSecret = crypto.randomBytes(16).toString('hex');
  const mod1 = await prisma.trainingModule.create({
    data: {
      title: 'Grundlagen Gefahrstoffrecht (Demo)',
      description: 'Sicherheitsunterweisung nach § 14 GefStoffV',
      targetAudience: 'Alle Mitarbeiter',
      content: JSON.stringify([
        { type: 'text', text: 'Willkommen zur Unterweisung. Bitte achten Sie immer auf die korrekte Kennzeichnung von Gefahrstoffen gemäß CLP-Verordnung.' }
      ]),
      quizQuestions: JSON.stringify([
        { question: 'Darf man am Arbeitsplatz essen?', options: ['Ja', 'Nein'], correctIndex: 1 },
        { question: 'Wo findet man Informationen zum sicheren Umgang mit einem Gefahrstoff?', options: ['Im Sicherheitsdatenblatt', 'In der Kantine', 'Auf der Rechnung'], correctIndex: 0 }
      ]),
      webhookSecret
    }
  });

  // 3. Assign Training Module
  await prisma.employeeTrainingRecord.create({
    data: {
      employeeId: emp1.id,
      trainingModuleId: mod1.id,
      status: 'ASSIGNED'
    }
  });

  await prisma.employeeTrainingRecord.create({
    data: {
      employeeId: emp2.id,
      trainingModuleId: mod1.id,
      status: 'ASSIGNED'
    }
  });

  console.log('LMS Data seeded successfully:');
  console.log(`- Employee 1: ${emp1.firstName} ${emp1.lastName} (Nummer: 1001, PIN: 1234)`);
  console.log(`- Employee 2: ${emp2.firstName} ${emp2.lastName} (Nummer: 1002, PIN: 9876)`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
