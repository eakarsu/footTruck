const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');

async function main() {
  if ((await prisma.user.count()) !== 0) throw new Error('Seed refused: users already exist');
  const email = (process.env.ADMIN_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
  if (!email || password.length < 12) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD (12+) are required to seed');
  const hash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({ data: { email, password: hash, name: process.env.PROVISION_ADMIN_NAME || 'Runtime Administrator', role: 'ADMIN', emailVerified: true } });
  const trucks = [];
  for (const [name, cuisineType] of [['Sunset Smash Burgers', 'American'], ['Verde Taco Co.', 'Mexican']]) {
    const truck = await prisma.truck.create({ data: { name, cuisineType, ownerId: admin.id, description: `${name} demo truck` } });
    await prisma.truckMembership.create({ data: { truckId: truck.id, userId: admin.id, role: 'MANAGER' } });
    const menu = await prisma.menu.create({ data: { name: 'Main Menu', truckId: truck.id, isDefault: true } });
    const cat = await prisma.menuCategory.create({ data: { name: 'Mains', menuId: menu.id } });
    for (const [itemName, price] of [['Signature Meal', 12.5], ['Garden Side', 6.5], ['House Drink', 3.5]]) {
      await prisma.menuItem.create({ data: { name: itemName, price, categoryId: cat.id, allergens: [], tags: ['demo'] } });
    }
    await prisma.inventoryItem.create({ data: { name: 'Portioned ingredient', category: 'PRODUCE', quantity: 30, unit: 'portion', minQuantity: 4, truckId: truck.id } });
    trucks.push(truck);
  }
  await prisma.location.create({ data: { name: 'Downtown Corner', address: '100 Main St', city: 'Austin', state: 'TX', zipCode: '78701', type: 'STREET' } });
  await prisma.location.create({ data: { name: 'Riverside Market', address: '22 River Walk', city: 'Austin', state: 'TX', zipCode: '78704', type: 'MARKET' } });
  await prisma.event.create({ data: { name: 'Food Truck Friday', startDate: new Date(Date.now() + 7 * 864e5), endDate: new Date(Date.now() + 7 * 864e5 + 36e5), status: 'UPCOMING' } });
  await prisma.permit.create({ data: { permitNumber: 'DEMO-2026-001', type: 'MOBILE_VENDOR', issuingAuthority: 'City of Austin', issueDate: new Date(), expiryDate: new Date(Date.now() + 365 * 864e5), truckId: trucks[0].id } });
  console.log(`Seeded administrator ${email}, ${trucks.length} trucks with menus, locations, event, and permit.`);
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
