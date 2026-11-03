import { afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const prismaDirectory = path.resolve(__dirname, '../prisma');
const sourceDatabase = path.join(prismaDirectory, 'dev.db');
const testDatabaseName = `.test-${process.pid}-${randomUUID()}.db`;
const testDatabase = path.join(prismaDirectory, testDatabaseName);

if (!fs.existsSync(sourceDatabase)) {
  throw new Error(`Test database source not found: ${sourceDatabase}`);
}

fs.copyFileSync(sourceDatabase, testDatabase);
process.env.DATABASE_URL = `file:./${testDatabaseName}`;

async function removeTestDatabase() {
  const prisma = require('../src/config/db');
  await prisma.$disconnect();
  for (const suffix of ['', '-journal', '-shm', '-wal']) {
    const filePath = `${testDatabase}${suffix}`;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

afterAll(removeTestDatabase);
process.on('exit', () => {
  for (const suffix of ['', '-journal', '-shm', '-wal']) {
    const filePath = `${testDatabase}${suffix}`;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});
