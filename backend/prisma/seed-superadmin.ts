/**
 * Superadmin Seed/Reset Script
 * =============================
 * 
 * Nutzung:
 *   npx ts-node prisma/seed-superadmin.ts --create admin@firma.de MeinPasswort123!
 *   npx ts-node prisma/seed-superadmin.ts --reset  admin@firma.de MeinPasswort123!
 * 
 * --create: Legt einen Root-Admin an (oder aktiviert einen bestehenden User als Admin)
 * --reset:  LÖSCHT ALLE DATEN und legt nur den Root-Admin an.
 *           Schreibt vor dem Löschen ein Manifest auf die Festplatte.
 * 
 * SICHERHEIT: Dieses Script läuft NUR auf der CLI, niemals als API-Route.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const prisma = new PrismaClient();

async function askConfirmation(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim() === 'RESET BESTÄTIGEN');
    });
  });
}

async function writeManifest(adminEmail: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const manifestPath = path.resolve(process.cwd(), `reset-manifest-${timestamp}.json`);

  // Zähle alle Tabellen
  const counts: Record<string, number> = {};
  const tables = [
    'user', 'tenant', 'location', 'workArea', 'hazardousSubstance',
    'biologicalSubstance', 'document', 'auditLog', 'employee',
    'trainingModule', 'employeeTrainingRecord', 'regulation', 'revisionTask'
  ];

  for (const table of tables) {
    try {
      counts[table] = await (prisma as any)[table].count();
    } catch {
      counts[table] = -1; // Tabelle existiert nicht
    }
  }

  // DB-File Hash
  const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
  let dbHash = 'N/A';
  if (fs.existsSync(dbPath)) {
    const dbBuffer = fs.readFileSync(dbPath);
    dbHash = crypto.createHash('sha256').update(dbBuffer).digest('hex');
  }

  const manifest = {
    type: 'FACTORY_RESET',
    timestamp: new Date().toISOString(),
    executedBy: adminEmail,
    hostname: require('os').hostname(),
    databaseHashBefore: dbHash,
    recordCounts: counts,
    warning: 'ALLE DATEN WURDEN UNWIDERRUFLICH GELÖSCHT. Dieses Manifest dokumentiert den Zustand vor dem Reset.'
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  return manifestPath;
}

async function createAdmin(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { passwordHash, role: 'ADMIN', status: 'ACTIVE', tokenVersion: { increment: 1 } }
    });
    console.log(`✅ Bestehender User "${email}" auf ADMIN/ACTIVE gesetzt.`);
  } else {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        firstName: 'Root',
        lastName: 'Administrator',
        tokenVersion: 0
      }
    });
    console.log(`✅ Root-Admin "${email}" angelegt (ADMIN, ACTIVE).`);
  }
}

async function factoryReset(email: string, password: string) {
  console.log('\n⚠️  FACTORY RESET');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('WARNUNG: Dieser Vorgang LÖSCHT ALLE DATEN unwiderruflich:');
  console.log('  - Alle Mandanten, Standorte, Arbeitsbereiche');
  console.log('  - Alle Gefahrstoffe, Biostoffe, Dokumente');
  console.log('  - Alle Mitarbeiter, Unterweisungsnachweise, LMS-Module');
  console.log('  - Alle Audit-Logs, Gefährdungsbeurteilungen');
  console.log('  - Alle Benutzer-Accounts');
  console.log('═══════════════════════════════════════════════════════════\n');

  const confirmed = await askConfirmation('Tippen Sie "RESET BESTÄTIGEN" ein: ');
  if (!confirmed) {
    console.log('❌ Abgebrochen.');
    process.exit(0);
  }

  // Manifest schreiben BEVOR gelöscht wird
  const manifestPath = await writeManifest(email);
  console.log(`📄 Manifest geschrieben: ${manifestPath}`);

  // Tabellen in der richtigen Reihenfolge löschen (FK-Constraints)
  console.log('🗑️  Lösche alle Daten...');
  
  const deleteOps = [
    prisma.passwordResetToken.deleteMany(),
    prisma.notificationTask.deleteMany(),
    prisma.employeeTrainingRecord.deleteMany(),
    prisma.trainingNeed.deleteMany(),
    prisma.trainingModule.deleteMany(),
    prisma.employeeExposure.deleteMany(),
    prisma.effectivenessCheck.deleteMany(),
    prisma.substanceMedia.deleteMany(),
    prisma.substanceProfileItem.deleteMany(),
    prisma.substanceProfile.deleteMany(),
    prisma.vorsorgeReport.deleteMany(),
    prisma.gbuSnapshot.deleteMany(),
    prisma.revisionTask.deleteMany(),
    prisma.regulation.deleteMany(),
    prisma.operatingInstruction.deleteMany(),
    prisma.localSubstanceInventory.deleteMany(),
    prisma.hazardousSubstanceMaster.deleteMany(),
    prisma.hazardousSubstance.deleteMany(),
    prisma.biologicalSubstance.deleteMany(),
    prisma.document.deleteMany(),
    prisma.asbestosFinding.deleteMany(),
    prisma.employee.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.user.deleteMany(),
    prisma.workArea.deleteMany(),
    prisma.location.deleteMany(),
    prisma.legalSettings.deleteMany(),
    prisma.tenant.deleteMany(),
  ];

  for (const op of deleteOps) {
    try { await op; } catch (e) { /* Skip if table doesn't exist */ }
  }

  console.log('✅ Alle Daten gelöscht.');

  // Root-Admin anlegen
  await createAdmin(email, password);
  console.log('\n🎉 Factory-Reset abgeschlossen. System ist bereit für den Neukunden.');
  console.log(`   Login: ${email}`);
  console.log(`   Manifest: ${manifestPath}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0];
  const email = args[1];
  const password = args[2];

  if (!mode || !email || !password) {
    console.log('Nutzung:');
    console.log('  npx ts-node prisma/seed-superadmin.ts --create admin@firma.de Passwort123!');
    console.log('  npx ts-node prisma/seed-superadmin.ts --reset  admin@firma.de Passwort123!');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Passwort muss mindestens 8 Zeichen lang sein.');
    process.exit(1);
  }

  try {
    if (mode === '--create') {
      await createAdmin(email, password);
    } else if (mode === '--reset') {
      await factoryReset(email, password);
    } else {
      console.error(`❌ Unbekannter Modus: ${mode}. Erlaubt: --create, --reset`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
