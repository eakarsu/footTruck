const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');

async function main() {
  const email = (process.env.ADMIN_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
  const name = process.env.ADMIN_NAME || process.env.BOOTSTRAP_ADMIN_NAME || 'Runtime Administrator';
  if (!email || !email.includes('@')) throw new Error('ADMIN_EMAIL is required');
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters');
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: { email, password: hash, name, role: 'ADMIN', emailVerified: true },
    update: { password: hash, name, role: 'ADMIN', emailVerified: true },
  });
  console.log(`Provisioned administrator ${email}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
