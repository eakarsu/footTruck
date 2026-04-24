const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with comprehensive demo data...');

  // ============================================================
  // STEP 1: Clean the database in reverse dependency order
  // ============================================================
  console.log('Cleaning database...');
  await prisma.eventTimeline.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.eventBooth.deleteMany();
  await prisma.locationGoal.deleteMany();
  await prisma.locationAnalytics.deleteMany();
  await prisma.demandPrediction.deleteMany();
  await prisma.weatherCache.deleteMany();
  await prisma.locationSubscription.deleteMany();
  await prisma.preOrderWindow.deleteMany();
  await prisma.preOrderSettings.deleteMany();
  await prisma.autoPostRule.deleteMany();
  await prisma.socialTemplate.deleteMany();
  await prisma.socialAccount.deleteMany();
  await prisma.orderNotification.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.wasteRecord.deleteMany();
  await prisma.prepItem.deleteMany();
  await prisma.prepList.deleteMany();
  await prisma.supply.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.aIRecommendation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.socialPost.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.permit.deleteMany();
  await prisma.truckLiveLocation.deleteMany();
  await prisma.truckLocation.deleteMany();
  await prisma.event.deleteMany();
  await prisma.location.deleteMany();
  await prisma.truck.deleteMany();
  await prisma.tokenBlacklist.deleteMany();
  await prisma.emailVerification.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.user.deleteMany();
  console.log('Database cleaned.');

  // ============================================================
  // STEP 2: Create demo user
  // ============================================================
  const hashedPassword = await bcrypt.hash('Demo@1234', 10);
  const user = await prisma.user.create({
    data: {
      email: 'demo@foodtruck.com',
      password: hashedPassword,
      name: 'Demo Owner',
      role: 'OWNER',
      emailVerified: true,
    },
  });
  console.log('Created user:', user.email);

  // ============================================================
  // STEP 3: Create 5 trucks with diverse cuisine types
  // ============================================================
  const truckData = [
    { name: 'Tasty Wheels', description: 'Gourmet American fusion street food with a twist', phone: '555-123-4567', email: 'info@tastywheels.com', cuisineType: 'American Fusion', isActive: true, ownerId: user.id },
    { name: 'Taco Tornado', description: 'Authentic Mexican street tacos, burritos, and quesadillas', phone: '555-234-5678', email: 'info@tacotornado.com', cuisineType: 'Mexican', isActive: true, ownerId: user.id },
    { name: 'BBQ Boss', description: 'Texas-style low-and-slow smoked meats with classic Southern sides', phone: '555-345-6789', email: 'info@bbqboss.com', cuisineType: 'BBQ', isActive: true, ownerId: user.id },
    { name: 'Pho on Wheels', description: 'Vietnamese pho, banh mi sandwiches, and spring rolls', phone: '555-456-7890', email: 'info@phoonwheels.com', cuisineType: 'Vietnamese', isActive: true, ownerId: user.id },
    { name: 'Pizza Pirate', description: 'Wood-fired Neapolitan pizzas made fresh on the street', phone: '555-567-8901', email: 'info@pizzapirate.com', cuisineType: 'Italian', isActive: true, ownerId: user.id },
  ];
  const trucks = [];
  for (const t of truckData) {
    trucks.push(await prisma.truck.create({ data: t }));
  }
  console.log('Created trucks:', trucks.length);

  // ============================================================
  // STEP 4: Create 20 locations across different cities
  // ============================================================
  const locationData = [
    { name: 'Downtown Square', address: '123 Main St', city: 'Austin', state: 'TX', zipCode: '78701', latitude: 30.2672, longitude: -97.7431, type: 'STREET' },
    { name: 'Tech Park Campus', address: '500 Innovation Way', city: 'Austin', state: 'TX', zipCode: '78758', latitude: 30.3944, longitude: -97.7252, type: 'PRIVATE_PROPERTY' },
    { name: 'Craft Brewery District', address: '800 Brewery Lane', city: 'Austin', state: 'TX', zipCode: '78702', latitude: 30.2621, longitude: -97.7207, type: 'PARKING_LOT' },
    { name: 'Saturday Farmers Market', address: '200 Market Plaza', city: 'Austin', state: 'TX', zipCode: '78704', latitude: 30.2500, longitude: -97.7500, type: 'MARKET' },
    { name: 'University Campus', address: '2100 University Ave', city: 'Austin', state: 'TX', zipCode: '78712', latitude: 30.2849, longitude: -97.7341, type: 'PRIVATE_PROPERTY' },
    { name: 'Medical Center', address: '1500 Medical Pkwy', city: 'Houston', state: 'TX', zipCode: '77030', latitude: 29.7104, longitude: -95.3965, type: 'PRIVATE_PROPERTY' },
    { name: 'Sports Complex', address: '3000 Arena Blvd', city: 'Dallas', state: 'TX', zipCode: '75201', latitude: 32.7767, longitude: -96.7970, type: 'EVENT_VENUE' },
    { name: 'Greenbelt Trail', address: '400 Barton Springs Rd', city: 'Austin', state: 'TX', zipCode: '78704', latitude: 30.2605, longitude: -97.7697, type: 'STREET' },
    { name: 'Corporate Tower Plaza', address: '1000 Congress Ave', city: 'Austin', state: 'TX', zipCode: '78701', latitude: 30.2700, longitude: -97.7420, type: 'PRIVATE_PROPERTY' },
    { name: 'Domain Shopping Center', address: '11410 Century Oaks', city: 'Austin', state: 'TX', zipCode: '78758', latitude: 30.4020, longitude: -97.7250, type: 'PARKING_LOT' },
    { name: 'South Congress Food Park', address: '1600 S Congress Ave', city: 'Austin', state: 'TX', zipCode: '78704', latitude: 30.2450, longitude: -97.7497, type: 'FOOD_COURT' },
    { name: 'Lady Bird Lake Waterfront', address: '920 Riverside Dr', city: 'Austin', state: 'TX', zipCode: '78704', latitude: 30.2580, longitude: -97.7500, type: 'STREET' },
    { name: 'Pearl Brewery District', address: '303 Pearl Pkwy', city: 'San Antonio', state: 'TX', zipCode: '78215', latitude: 29.4428, longitude: -98.4802, type: 'MARKET' },
    { name: 'East Austin Industrial', address: '2200 E 7th St', city: 'Austin', state: 'TX', zipCode: '78702', latitude: 30.2630, longitude: -97.7150, type: 'STREET' },
    { name: 'ACL Live Area', address: '310 W Willie Nelson Blvd', city: 'Austin', state: 'TX', zipCode: '78701', latitude: 30.2640, longitude: -97.7490, type: 'EVENT_VENUE' },
    { name: 'Community Rec Center', address: '1600 Springdale Rd', city: 'Austin', state: 'TX', zipCode: '78721', latitude: 30.2680, longitude: -97.7000, type: 'PRIVATE_PROPERTY' },
    { name: 'Magnolia Market', address: '601 Webster Ave', city: 'Waco', state: 'TX', zipCode: '76701', latitude: 31.5493, longitude: -97.1467, type: 'MARKET' },
    { name: 'Alamo Drafthouse Plaza', address: '1120 S Lamar Blvd', city: 'Austin', state: 'TX', zipCode: '78704', latitude: 30.2550, longitude: -97.7680, type: 'PARKING_LOT' },
    { name: 'Convention Center', address: '500 E Cesar Chavez St', city: 'Austin', state: 'TX', zipCode: '78701', latitude: 30.2615, longitude: -97.7390, type: 'EVENT_VENUE' },
    { name: 'Mueller Community', address: '4550 Mueller Blvd', city: 'Austin', state: 'TX', zipCode: '78723', latitude: 30.2980, longitude: -97.7050, type: 'PRIVATE_PROPERTY' },
  ];
  const locations = [];
  for (const loc of locationData) {
    locations.push(await prisma.location.create({ data: loc }));
  }
  console.log('Created locations:', locations.length);

  // ============================================================
  // STEP 5: Create 20 truck location bookings with varied statuses
  // ============================================================
  const truckLocationData = [];
  for (let i = 1; i <= 10; i++) {
    const statuses = ['SCHEDULED', 'CONFIRMED', 'SCHEDULED', 'CONFIRMED', 'SCHEDULED'];
    truckLocationData.push({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
      startTime: i % 2 === 0 ? '11:00' : '17:00',
      endTime: i % 2 === 0 ? '14:00' : '21:00',
      status: statuses[i % 5],
      truckId: trucks[i % trucks.length].id,
      locationId: locations[i % locations.length].id,
    });
  }
  for (let i = 1; i <= 8; i++) {
    const revenue = 400 + Math.random() * 1200;
    const customers = Math.floor(30 + Math.random() * 100);
    truckLocationData.push({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      startTime: i % 2 === 0 ? '11:00' : '17:00',
      endTime: i % 2 === 0 ? '14:00' : '21:00',
      status: 'COMPLETED',
      revenue: parseFloat(revenue.toFixed(2)),
      customerCount: customers,
      notes: i === 1 ? 'Great day! Sold out of burgers' : i === 3 ? 'Weather affected turnout' : null,
      truckId: trucks[i % trucks.length].id,
      locationId: locations[(i + 5) % locations.length].id,
    });
  }
  truckLocationData.push({
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    startTime: '10:00',
    endTime: '15:00',
    status: 'CANCELLED',
    notes: 'Cancelled due to severe weather warning',
    truckId: trucks[0].id,
    locationId: locations[0].id,
  });
  truckLocationData.push({
    date: new Date(),
    startTime: '11:00',
    endTime: '14:00',
    status: 'IN_PROGRESS',
    truckId: trucks[0].id,
    locationId: locations[1].id,
  });
  const truckLocations = [];
  for (const tl of truckLocationData) {
    truckLocations.push(await prisma.truckLocation.create({ data: tl }));
  }
  console.log('Created truck locations:', truckLocations.length);

  // ============================================================
  // STEP 6: Create menus, categories, and 15+ menu items per truck
  // ============================================================

  // --- Truck 1: Tasty Wheels (American Fusion) ---
  const menu1 = await prisma.menu.create({
    data: { name: 'Main Menu', description: 'Our delicious everyday offerings', isActive: true, isDefault: true, truckId: trucks[0].id },
  });
  const cats1 = [];
  for (const c of [
    { name: 'Burgers & Sandwiches', description: 'Signature handhelds', sortOrder: 1, menuId: menu1.id },
    { name: 'Sides', description: 'Perfect accompaniments', sortOrder: 2, menuId: menu1.id },
    { name: 'Beverages', description: 'Refreshing drinks', sortOrder: 3, menuId: menu1.id },
    { name: 'Desserts', description: 'Sweet treats', sortOrder: 4, menuId: menu1.id },
  ]) {
    cats1.push(await prisma.menuCategory.create({ data: c }));
  }
  const items1Data = [
    { name: 'Classic Smash Burger', description: 'Double patty with special sauce, lettuce, tomato, and pickles', price: 12.99, calories: 850, allergens: ['gluten', 'dairy'], tags: ['popular', 'signature'], prepTime: 8, categoryId: cats1[0].id },
    { name: 'Crispy Chicken Sandwich', description: 'Fried chicken breast with pickles, coleslaw, and spicy mayo', price: 11.99, calories: 780, allergens: ['gluten', 'dairy', 'eggs'], tags: ['popular'], prepTime: 8, categoryId: cats1[0].id },
    { name: 'Philly Cheesesteak', description: 'Shaved ribeye with peppers, onions, and provolone on hoagie roll', price: 13.99, calories: 920, allergens: ['gluten', 'dairy'], tags: ['signature'], prepTime: 9, categoryId: cats1[0].id },
    { name: 'Korean BBQ Bowl', description: 'Bulgogi beef over rice with kimchi, pickled veg, and gochujang', price: 14.99, calories: 720, allergens: ['soy', 'sesame'], tags: ['healthy'], prepTime: 7, categoryId: cats1[0].id },
    { name: 'Mediterranean Veggie Wrap', description: 'Hummus, falafel, cucumber, tomato, and tzatziki', price: 10.99, calories: 520, allergens: ['gluten', 'sesame'], tags: ['vegetarian', 'healthy'], prepTime: 6, categoryId: cats1[0].id },
    { name: 'Loaded Nachos', description: 'Crispy chips loaded with cheese, beans, jalapenos, and protein', price: 13.99, isSpecial: true, specialPrice: 10.99, calories: 980, allergens: ['dairy', 'gluten'], tags: ['shareable'], prepTime: 10, categoryId: cats1[0].id },
    { name: 'BBQ Pulled Pork Slider Trio', description: 'Three mini sliders with tangy slaw and pickles', price: 11.49, calories: 690, allergens: ['gluten'], tags: ['popular'], prepTime: 7, categoryId: cats1[0].id },
    { name: 'Mushroom Swiss Burger', description: 'Angus patty with sauteed mushrooms and Swiss cheese', price: 13.49, calories: 870, allergens: ['gluten', 'dairy'], tags: [], prepTime: 9, categoryId: cats1[0].id },
    { name: 'Seasoned Fries', description: 'Crispy fries with our signature spice blend', price: 4.99, calories: 380, allergens: [], tags: ['vegan'], prepTime: 4, categoryId: cats1[1].id },
    { name: 'Beer-Battered Onion Rings', description: 'Thick-cut onion rings with ranch dipping sauce', price: 5.99, calories: 450, allergens: ['gluten'], tags: [], prepTime: 5, categoryId: cats1[1].id },
    { name: 'Street Corn', description: 'Grilled corn with mayo, cotija cheese, and chili powder', price: 4.99, calories: 280, allergens: ['dairy'], tags: ['popular'], prepTime: 4, categoryId: cats1[1].id },
    { name: 'Mac & Cheese Bites', description: 'Crispy fried mac and cheese balls with marinara', price: 6.99, calories: 520, allergens: ['gluten', 'dairy'], tags: ['comfort'], prepTime: 5, categoryId: cats1[1].id },
    { name: 'Fresh Lemonade', description: 'House-made lemonade with a hint of mint', price: 3.99, calories: 120, allergens: [], tags: ['refreshing'], prepTime: 1, categoryId: cats1[2].id },
    { name: 'Cold Brew Coffee', description: 'Smooth, slow-steeped cold brew', price: 3.99, calories: 5, allergens: [], tags: ['caffeine'], prepTime: 1, categoryId: cats1[2].id },
    { name: 'Bottled Water', description: 'Purified spring water', price: 1.99, calories: 0, allergens: [], tags: [], prepTime: 1, categoryId: cats1[2].id },
    { name: 'Cinnamon Churros', description: 'Fresh fried churros with chocolate dipping sauce', price: 5.99, calories: 420, allergens: ['gluten', 'dairy'], tags: ['sweet'], prepTime: 5, categoryId: cats1[3].id },
    { name: 'Fudge Brownie', description: 'Rich chocolate brownie with walnuts', price: 3.99, calories: 350, allergens: ['gluten', 'dairy', 'nuts', 'eggs'], tags: [], prepTime: 1, categoryId: cats1[3].id },
  ];
  const menuItems1 = [];
  for (const item of items1Data) {
    menuItems1.push(await prisma.menuItem.create({ data: item }));
  }

  // --- Truck 2: Taco Tornado (Mexican) ---
  const menu2 = await prisma.menu.create({
    data: { name: 'Taco Menu', description: 'Authentic Mexican street food', isActive: true, isDefault: true, truckId: trucks[1].id },
  });
  const cats2 = [];
  for (const c of [
    { name: 'Tacos', description: 'Handmade corn tortilla tacos', sortOrder: 1, menuId: menu2.id },
    { name: 'Burritos & Bowls', description: 'Hearty wraps and bowls', sortOrder: 2, menuId: menu2.id },
    { name: 'Sides & Drinks', description: 'Sides and refreshments', sortOrder: 3, menuId: menu2.id },
  ]) {
    cats2.push(await prisma.menuCategory.create({ data: c }));
  }
  const items2Data = [
    { name: 'Carne Asada Tacos (3)', description: 'Grilled steak with cilantro, onion, and salsa verde', price: 10.99, calories: 650, allergens: ['gluten'], tags: ['popular'], prepTime: 6, categoryId: cats2[0].id },
    { name: 'Al Pastor Tacos (3)', description: 'Marinated pork with pineapple, cilantro, and onion', price: 10.99, calories: 620, allergens: ['gluten'], tags: ['signature'], prepTime: 6, categoryId: cats2[0].id },
    { name: 'Chicken Tinga Tacos (3)', description: 'Shredded chicken in chipotle-tomato sauce', price: 9.99, calories: 580, allergens: ['gluten'], tags: [], prepTime: 5, categoryId: cats2[0].id },
    { name: 'Baja Fish Tacos (2)', description: 'Beer-battered cod with cabbage slaw and chipotle crema', price: 12.99, calories: 580, allergens: ['gluten', 'fish', 'dairy'], tags: ['seafood'], prepTime: 8, categoryId: cats2[0].id },
    { name: 'Carnitas Tacos (3)', description: 'Slow-cooked pork with pickled onion and habanero salsa', price: 10.49, calories: 640, allergens: ['gluten'], tags: [], prepTime: 5, categoryId: cats2[0].id },
    { name: 'Birria Tacos (3)', description: 'Braised beef tacos with consomme for dipping', price: 13.99, calories: 750, allergens: ['gluten', 'dairy'], tags: ['popular', 'signature'], prepTime: 7, categoryId: cats2[0].id },
    { name: 'Giant Burrito', description: 'Flour tortilla stuffed with rice, beans, protein, cheese, salsa, and guac', price: 11.99, calories: 890, allergens: ['gluten', 'dairy'], tags: ['filling'], prepTime: 8, categoryId: cats2[1].id },
    { name: 'Burrito Bowl', description: 'All the burrito fillings without the tortilla', price: 11.99, calories: 680, allergens: ['dairy'], tags: ['healthy', 'gluten-free'], prepTime: 7, categoryId: cats2[1].id },
    { name: 'Loaded Quesadilla', description: 'Grilled tortilla with cheese, protein, peppers, and onions', price: 10.99, calories: 720, allergens: ['gluten', 'dairy'], tags: [], prepTime: 7, categoryId: cats2[1].id },
    { name: 'Veggie Burrito', description: 'Black beans, roasted veggies, rice, and guacamole', price: 10.49, calories: 620, allergens: ['gluten'], tags: ['vegetarian'], prepTime: 7, categoryId: cats2[1].id },
    { name: 'Chips & Guacamole', description: 'Fresh-made guac with warm tortilla chips', price: 5.99, calories: 320, allergens: [], tags: ['vegan'], prepTime: 3, categoryId: cats2[2].id },
    { name: 'Rice and Beans', description: 'Cilantro lime rice with black beans', price: 3.99, calories: 320, allergens: [], tags: ['vegan', 'gluten-free'], prepTime: 3, categoryId: cats2[2].id },
    { name: 'Agua Fresca', description: 'Rotating flavors: watermelon, horchata, or jamaica', price: 4.49, calories: 100, allergens: [], tags: ['refreshing'], prepTime: 1, categoryId: cats2[2].id },
    { name: 'Mexican Coke', description: 'Glass bottle Coca-Cola made with real sugar', price: 3.49, calories: 150, allergens: [], tags: [], prepTime: 1, categoryId: cats2[2].id },
    { name: 'Churro Bites', description: 'Cinnamon sugar churro bites with dulce de leche', price: 4.99, calories: 380, allergens: ['gluten', 'dairy'], tags: ['sweet'], prepTime: 4, categoryId: cats2[2].id },
  ];
  const menuItems2 = [];
  for (const item of items2Data) {
    menuItems2.push(await prisma.menuItem.create({ data: item }));
  }

  // --- Truck 3: BBQ Boss ---
  const menu3 = await prisma.menu.create({
    data: { name: 'BBQ Menu', description: 'Texas-style smoked meats', isActive: true, isDefault: true, truckId: trucks[2].id },
  });
  const cats3 = [];
  for (const c of [
    { name: 'Smoked Meats', description: 'Low and slow', sortOrder: 1, menuId: menu3.id },
    { name: 'Platters', description: 'Combo meals', sortOrder: 2, menuId: menu3.id },
    { name: 'Sides & Drinks', description: 'Classic accompaniments', sortOrder: 3, menuId: menu3.id },
  ]) {
    cats3.push(await prisma.menuCategory.create({ data: c }));
  }
  const items3Data = [
    { name: 'Brisket Plate', description: 'Half pound of smoked brisket with two sides', price: 17.99, calories: 1050, allergens: [], tags: ['signature', 'popular'], prepTime: 5, categoryId: cats3[0].id },
    { name: 'Pulled Pork Sandwich', description: '12-hour smoked pork shoulder on brioche bun', price: 12.99, calories: 780, allergens: ['gluten'], tags: ['popular'], prepTime: 5, categoryId: cats3[0].id },
    { name: 'Smoked Turkey Breast', description: 'Juicy turkey breast sliced to order', price: 14.99, calories: 650, allergens: [], tags: ['healthy'], prepTime: 5, categoryId: cats3[0].id },
    { name: 'Baby Back Ribs (Half Rack)', description: 'Tender ribs with house dry rub', price: 18.99, calories: 1100, allergens: [], tags: ['signature'], prepTime: 5, categoryId: cats3[0].id },
    { name: 'Smoked Sausage Link', description: 'House-made jalapeano cheddar sausage', price: 8.99, calories: 580, allergens: ['dairy'], tags: [], prepTime: 3, categoryId: cats3[0].id },
    { name: 'Chopped Beef Sandwich', description: 'Chopped brisket with BBQ sauce on Texas toast', price: 11.99, calories: 820, allergens: ['gluten'], tags: [], prepTime: 5, categoryId: cats3[0].id },
    { name: 'Two Meat Platter', description: 'Choose two meats with two sides and bread', price: 21.99, calories: 1350, allergens: ['gluten'], tags: ['popular'], prepTime: 7, categoryId: cats3[1].id },
    { name: 'Three Meat Platter', description: 'Choose three meats with two sides and bread', price: 26.99, calories: 1650, allergens: ['gluten'], tags: ['shareable'], prepTime: 8, categoryId: cats3[1].id },
    { name: 'Family Pack', description: '2 lbs of meat, 4 sides, bread, pickles, and onions', price: 59.99, calories: 4000, allergens: ['gluten'], tags: ['shareable', 'deal'], prepTime: 10, categoryId: cats3[1].id },
    { name: 'Coleslaw', description: 'Creamy Southern-style coleslaw', price: 3.49, calories: 180, allergens: ['dairy'], tags: [], prepTime: 1, categoryId: cats3[2].id },
    { name: 'Potato Salad', description: 'Classic mustard potato salad', price: 3.49, calories: 250, allergens: ['eggs'], tags: [], prepTime: 1, categoryId: cats3[2].id },
    { name: 'Baked Beans', description: 'Slow-cooked beans with brisket trimmings', price: 3.49, calories: 290, allergens: [], tags: [], prepTime: 1, categoryId: cats3[2].id },
    { name: 'Mac and Cheese', description: 'Three-cheese baked mac and cheese', price: 4.99, calories: 450, allergens: ['gluten', 'dairy'], tags: ['comfort'], prepTime: 2, categoryId: cats3[2].id },
    { name: 'Sweet Tea', description: 'Southern-style sweet iced tea', price: 2.99, calories: 140, allergens: [], tags: [], prepTime: 1, categoryId: cats3[2].id },
    { name: 'Banana Pudding', description: 'Homemade banana pudding with vanilla wafers', price: 5.99, calories: 380, allergens: ['gluten', 'dairy', 'eggs'], tags: ['sweet'], prepTime: 1, categoryId: cats3[2].id },
  ];
  const menuItems3 = [];
  for (const item of items3Data) {
    menuItems3.push(await prisma.menuItem.create({ data: item }));
  }

  // --- Truck 4: Pho on Wheels (Vietnamese) ---
  const menu4 = await prisma.menu.create({
    data: { name: 'Vietnamese Menu', description: 'Traditional Vietnamese street food', isActive: true, isDefault: true, truckId: trucks[3].id },
  });
  const cats4 = [];
  for (const c of [
    { name: 'Pho & Soups', description: 'Steaming bowls of noodle soup', sortOrder: 1, menuId: menu4.id },
    { name: 'Banh Mi & Rice', description: 'Sandwiches and rice plates', sortOrder: 2, menuId: menu4.id },
    { name: 'Appetizers & Drinks', description: 'Starters and beverages', sortOrder: 3, menuId: menu4.id },
  ]) {
    cats4.push(await prisma.menuCategory.create({ data: c }));
  }
  const items4Data = [
    { name: 'Pho Tai (Rare Beef)', description: 'Rice noodle soup with rare sliced beef and herbs', price: 13.99, calories: 520, allergens: ['soy'], tags: ['signature', 'popular'], prepTime: 6, categoryId: cats4[0].id },
    { name: 'Pho Ga (Chicken)', description: 'Rice noodle soup with poached chicken breast', price: 12.99, calories: 450, allergens: ['soy'], tags: ['healthy'], prepTime: 6, categoryId: cats4[0].id },
    { name: 'Pho Combo', description: 'Beef pho with brisket, tendon, and tripe', price: 15.99, calories: 620, allergens: ['soy'], tags: ['signature'], prepTime: 7, categoryId: cats4[0].id },
    { name: 'Bun Bo Hue', description: 'Spicy lemongrass beef noodle soup', price: 14.99, calories: 580, allergens: ['soy', 'shellfish'], tags: ['spicy'], prepTime: 7, categoryId: cats4[0].id },
    { name: 'Vegetable Pho', description: 'Mushroom broth with tofu, vegetables, and rice noodles', price: 11.99, calories: 380, allergens: ['soy'], tags: ['vegan'], prepTime: 6, categoryId: cats4[0].id },
    { name: 'Classic Banh Mi', description: 'Vietnamese baguette with pate, ham, pickled veggies, cilantro, jalapeno', price: 9.99, calories: 550, allergens: ['gluten', 'eggs'], tags: ['popular'], prepTime: 5, categoryId: cats4[1].id },
    { name: 'Lemongrass Chicken Banh Mi', description: 'Grilled lemongrass chicken on crispy baguette', price: 10.99, calories: 520, allergens: ['gluten'], tags: [], prepTime: 6, categoryId: cats4[1].id },
    { name: 'Tofu Banh Mi', description: 'Crispy tofu with pickled daikon, carrots, and sriracha mayo', price: 9.49, calories: 430, allergens: ['gluten', 'soy'], tags: ['vegetarian'], prepTime: 5, categoryId: cats4[1].id },
    { name: 'Com Tam (Broken Rice)', description: 'Broken rice with grilled pork chop, egg, and fish sauce', price: 13.99, calories: 680, allergens: ['eggs', 'fish'], tags: [], prepTime: 8, categoryId: cats4[1].id },
    { name: 'Vermicelli Bowl', description: 'Rice noodles with grilled meat, spring rolls, and nuoc cham', price: 12.99, calories: 580, allergens: ['fish', 'soy'], tags: ['healthy'], prepTime: 7, categoryId: cats4[1].id },
    { name: 'Fresh Spring Rolls (2)', description: 'Rice paper rolls with shrimp, herbs, vermicelli, and peanut sauce', price: 6.99, calories: 220, allergens: ['shellfish', 'peanuts'], tags: ['healthy'], prepTime: 4, categoryId: cats4[2].id },
    { name: 'Crispy Imperial Rolls (3)', description: 'Deep-fried pork and mushroom rolls with lettuce wraps', price: 7.99, calories: 380, allergens: ['gluten'], tags: [], prepTime: 5, categoryId: cats4[2].id },
    { name: 'Papaya Salad', description: 'Shredded green papaya with shrimp, herbs, and nuoc cham', price: 7.49, calories: 180, allergens: ['shellfish', 'fish', 'peanuts'], tags: ['healthy'], prepTime: 4, categoryId: cats4[2].id },
    { name: 'Vietnamese Iced Coffee', description: 'Strong drip coffee with sweetened condensed milk over ice', price: 4.99, calories: 200, allergens: ['dairy'], tags: ['popular', 'caffeine'], prepTime: 3, categoryId: cats4[2].id },
    { name: 'Thai Tea', description: 'Creamy Thai iced tea with condensed milk', price: 4.49, calories: 180, allergens: ['dairy'], tags: ['refreshing'], prepTime: 2, categoryId: cats4[2].id },
  ];
  const menuItems4 = [];
  for (const item of items4Data) {
    menuItems4.push(await prisma.menuItem.create({ data: item }));
  }

  // --- Truck 5: Pizza Pirate (Italian) ---
  const menu5 = await prisma.menu.create({
    data: { name: 'Pizza Menu', description: 'Wood-fired Neapolitan pizzas', isActive: true, isDefault: true, truckId: trucks[4].id },
  });
  const cats5 = [];
  for (const c of [
    { name: 'Pizzas', description: 'Wood-fired pies', sortOrder: 1, menuId: menu5.id },
    { name: 'Calzones & Sides', description: 'Folded pies and extras', sortOrder: 2, menuId: menu5.id },
    { name: 'Drinks & Dessert', description: 'Beverages and sweet finishes', sortOrder: 3, menuId: menu5.id },
  ]) {
    cats5.push(await prisma.menuCategory.create({ data: c }));
  }
  const items5Data = [
    { name: 'Margherita Pizza', description: 'San Marzano tomatoes, fresh mozzarella, basil, EVOO', price: 12.99, calories: 680, allergens: ['gluten', 'dairy'], tags: ['signature', 'vegetarian'], prepTime: 8, categoryId: cats5[0].id },
    { name: 'Pepperoni Pizza', description: 'Classic pepperoni with mozzarella and tomato sauce', price: 13.99, calories: 820, allergens: ['gluten', 'dairy'], tags: ['popular'], prepTime: 8, categoryId: cats5[0].id },
    { name: 'Meat Lovers Pizza', description: 'Pepperoni, sausage, bacon, and ham', price: 16.99, calories: 1050, allergens: ['gluten', 'dairy'], tags: ['popular'], prepTime: 10, categoryId: cats5[0].id },
    { name: 'BBQ Chicken Pizza', description: 'Grilled chicken, red onion, cilantro, BBQ sauce', price: 15.99, calories: 880, allergens: ['gluten', 'dairy'], tags: [], prepTime: 9, categoryId: cats5[0].id },
    { name: 'Veggie Supreme', description: 'Bell peppers, mushrooms, onions, olives, tomatoes', price: 14.99, calories: 650, allergens: ['gluten', 'dairy'], tags: ['vegetarian'], prepTime: 9, categoryId: cats5[0].id },
    { name: 'White Pizza', description: 'Ricotta, mozzarella, garlic, spinach, EVOO', price: 14.99, calories: 750, allergens: ['gluten', 'dairy'], tags: [], prepTime: 8, categoryId: cats5[0].id },
    { name: 'Hawaiian Pizza', description: 'Ham, pineapple, and mozzarella', price: 14.49, calories: 780, allergens: ['gluten', 'dairy'], tags: [], prepTime: 8, categoryId: cats5[0].id },
    { name: 'Truffle Mushroom Pizza', description: 'Wild mushrooms, truffle oil, fontina, fresh thyme', price: 17.99, calories: 730, allergens: ['gluten', 'dairy'], tags: ['signature'], prepTime: 9, categoryId: cats5[0].id },
    { name: 'Classic Calzone', description: 'Folded pizza with ricotta, mozzarella, and pepperoni', price: 12.99, calories: 880, allergens: ['gluten', 'dairy'], tags: [], prepTime: 10, categoryId: cats5[1].id },
    { name: 'Garlic Knots (6)', description: 'Fresh-baked knots with garlic butter and parmesan', price: 5.99, calories: 380, allergens: ['gluten', 'dairy'], tags: ['popular'], prepTime: 6, categoryId: cats5[1].id },
    { name: 'Caesar Salad', description: 'Romaine, parmesan, croutons, house Caesar dressing', price: 7.99, calories: 280, allergens: ['gluten', 'dairy', 'eggs', 'fish'], tags: ['healthy'], prepTime: 3, categoryId: cats5[1].id },
    { name: 'Meatball Sub', description: 'House meatballs with marinara and melted mozzarella', price: 10.99, calories: 750, allergens: ['gluten', 'dairy'], tags: [], prepTime: 7, categoryId: cats5[1].id },
    { name: 'Italian Soda', description: 'Sparkling water with flavored syrup and cream', price: 3.99, calories: 120, allergens: ['dairy'], tags: ['refreshing'], prepTime: 1, categoryId: cats5[2].id },
    { name: 'Cannoli', description: 'Crispy shell filled with sweet ricotta and chocolate chips', price: 5.49, calories: 340, allergens: ['gluten', 'dairy', 'eggs'], tags: ['sweet'], prepTime: 1, categoryId: cats5[2].id },
    { name: 'Tiramisu Cup', description: 'Espresso-soaked ladyfingers with mascarpone cream', price: 6.99, calories: 380, allergens: ['gluten', 'dairy', 'eggs'], tags: ['sweet', 'signature'], prepTime: 1, categoryId: cats5[2].id },
  ];
  const menuItems5 = [];
  for (const item of items5Data) {
    menuItems5.push(await prisma.menuItem.create({ data: item }));
  }
  const allMenuItems = [...menuItems1, ...menuItems2, ...menuItems3, ...menuItems4, ...menuItems5];
  console.log('Created menu items across 5 trucks:', allMenuItems.length);

  // ============================================================
  // STEP 7: Create 20 orders with varied statuses, types, payment methods
  // ============================================================
  const customerNames = ['John Smith', 'Sarah Johnson', 'Mike Brown', 'Emily Davis', 'Chris Wilson', 'Lisa Anderson', 'David Martinez', 'Jennifer Taylor', 'Robert Thomas', 'Amanda White', 'James Moore', 'Michelle Jackson', 'Daniel Harris', 'Laura Martin', 'Kevin Lee', 'Nicole Garcia', 'Matthew Robinson', 'Ashley Clark', 'Joshua Lewis', 'Stephanie Walker'];
  const orderStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'PICKED_UP', 'PICKED_UP', 'PICKED_UP', 'PICKED_UP', 'PICKED_UP', 'PICKED_UP', 'PICKED_UP', 'PICKED_UP', 'PICKED_UP', 'PICKED_UP', 'CANCELLED', 'PICKED_UP', 'PICKED_UP', 'PICKED_UP', 'PICKED_UP'];
  const orderTypes = ['WALK_IN', 'MOBILE', 'PRE_ORDER', 'WALK_IN', 'MOBILE', 'WALK_IN', 'WALK_IN', 'MOBILE', 'WALK_IN', 'PRE_ORDER', 'WALK_IN', 'WALK_IN', 'MOBILE', 'WALK_IN', 'WALK_IN', 'WALK_IN', 'PRE_ORDER', 'MOBILE', 'WALK_IN', 'WALK_IN'];
  const paymentMethods = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'APPLE_PAY', 'GOOGLE_PAY', 'CREDIT_CARD', 'CASH', 'APPLE_PAY', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'CREDIT_CARD', 'GOOGLE_PAY', 'CREDIT_CARD', 'CASH', 'CREDIT_CARD', 'APPLE_PAY', 'DEBIT_CARD', 'CASH', 'CREDIT_CARD'];

  const orders = [];
  for (let i = 0; i < 20; i++) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000 - Math.floor(Math.random() * 8 * 60 * 60 * 1000));
    const subtotal = parseFloat((10 + Math.random() * 40).toFixed(2));
    const tax = parseFloat((subtotal * 0.0825).toFixed(2));
    const tip = i % 3 === 0 ? parseFloat((subtotal * 0.15).toFixed(2)) : 0;
    const total = parseFloat((subtotal + tax + tip).toFixed(2));
    const status = orderStatuses[i];
    const paymentStatus = status === 'PICKED_UP' ? 'COMPLETED' : status === 'CANCELLED' ? 'REFUNDED' : 'PENDING';
    const truckIndex = i % trucks.length;

    orders.push(
      await prisma.order.create({
        data: {
          orderNumber: String(1001 + i),
          customerName: customerNames[i],
          customerPhone: `555-${(100 + i).toString()}-${(1000 + Math.floor(Math.random() * 9000)).toString()}`,
          customerEmail: i % 3 === 0 ? `customer${i + 1}@email.com` : null,
          subtotal,
          tax,
          tip,
          total,
          status,
          type: orderTypes[i],
          paymentMethod: paymentMethods[i],
          paymentStatus,
          notes: i === 4 ? 'No onions please' : i === 11 ? 'Extra spicy' : i === 15 ? 'Customer changed mind' : null,
          createdAt: date,
          truckId: trucks[truckIndex].id,
          userId: user.id,
        },
      })
    );
  }
  console.log('Created orders:', orders.length);

  // Create order items for each order
  let orderItemCount = 0;
  for (let i = 0; i < orders.length; i++) {
    const numItems = 1 + Math.floor(Math.random() * 3);
    const truckIndex = i % trucks.length;
    const truckMenuItems = [menuItems1, menuItems2, menuItems3, menuItems4, menuItems5][truckIndex];
    for (let j = 0; j < numItems; j++) {
      const menuItem = truckMenuItems[Math.floor(Math.random() * truckMenuItems.length)];
      const quantity = 1 + Math.floor(Math.random() * 2);
      await prisma.orderItem.create({
        data: {
          quantity,
          unitPrice: menuItem.price,
          totalPrice: parseFloat((menuItem.price * quantity).toFixed(2)),
          specialInstructions: j === 0 && i % 5 === 0 ? 'No sauce' : null,
          orderId: orders[i].id,
          menuItemId: menuItem.id,
        },
      });
      orderItemCount++;
    }
  }
  console.log('Created order items:', orderItemCount);

  // ============================================================
  // STEP 8: Create 20 inventory items across all categories
  // ============================================================
  const inventoryData = [
    { name: 'Ground Beef', category: 'MEAT', quantity: 25, unit: 'lbs', minQuantity: 10, maxQuantity: 50, costPerUnit: 5.99, supplier: 'Premium Meats Co', truckId: trucks[0].id },
    { name: 'Chicken Breast', category: 'MEAT', quantity: 15, unit: 'lbs', minQuantity: 8, maxQuantity: 30, costPerUnit: 4.99, supplier: 'Premium Meats Co', truckId: trucks[0].id },
    { name: 'Pork Shoulder', category: 'MEAT', quantity: 12, unit: 'lbs', minQuantity: 5, maxQuantity: 25, costPerUnit: 4.49, supplier: 'Premium Meats Co', truckId: trucks[2].id },
    { name: 'Cod Fillets', category: 'MEAT', quantity: 8, unit: 'lbs', minQuantity: 4, maxQuantity: 15, costPerUnit: 8.99, supplier: 'Fresh Catch Seafood', truckId: trucks[1].id },
    { name: 'Burger Buns', category: 'DRY_GOODS', quantity: 48, unit: 'count', minQuantity: 24, maxQuantity: 96, costPerUnit: 0.35, supplier: 'Local Bakery', truckId: trucks[0].id },
    { name: 'Flour Tortillas', category: 'DRY_GOODS', quantity: 100, unit: 'count', minQuantity: 50, maxQuantity: 200, costPerUnit: 0.15, supplier: 'Local Bakery', truckId: trucks[1].id },
    { name: 'Rice Noodles', category: 'DRY_GOODS', quantity: 30, unit: 'lbs', minQuantity: 15, maxQuantity: 60, costPerUnit: 2.49, supplier: 'Asian Market', truckId: trucks[3].id },
    { name: 'Lettuce', category: 'PRODUCE', quantity: 5, unit: 'heads', minQuantity: 3, maxQuantity: 10, costPerUnit: 2.49, supplier: 'Fresh Farms', expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), truckId: trucks[0].id },
    { name: 'Tomatoes', category: 'PRODUCE', quantity: 10, unit: 'lbs', minQuantity: 5, maxQuantity: 20, costPerUnit: 1.99, supplier: 'Fresh Farms', expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), truckId: trucks[0].id },
    { name: 'Onions', category: 'PRODUCE', quantity: 15, unit: 'lbs', minQuantity: 8, maxQuantity: 25, costPerUnit: 0.99, supplier: 'Fresh Farms', truckId: trucks[1].id },
    { name: 'Fresh Mozzarella', category: 'DAIRY', quantity: 20, unit: 'lbs', minQuantity: 10, maxQuantity: 40, costPerUnit: 6.99, supplier: 'Dairy Direct', expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), truckId: trucks[4].id },
    { name: 'American Cheese', category: 'DAIRY', quantity: 100, unit: 'slices', minQuantity: 50, maxQuantity: 200, costPerUnit: 0.15, supplier: 'Dairy Direct', truckId: trucks[0].id },
    { name: 'Coca-Cola (Cases)', category: 'BEVERAGES', quantity: 5, unit: 'cases', minQuantity: 2, maxQuantity: 10, costPerUnit: 18.99, supplier: 'Beverage Supply Inc', truckId: trucks[1].id },
    { name: 'House Salsa', category: 'CONDIMENTS', quantity: 10, unit: 'quarts', minQuantity: 4, maxQuantity: 16, costPerUnit: 3.50, supplier: 'In-House', truckId: trucks[1].id },
    { name: 'BBQ Sauce', category: 'CONDIMENTS', quantity: 6, unit: 'bottles', minQuantity: 3, maxQuantity: 10, costPerUnit: 4.99, supplier: 'Restaurant Supply Co', truckId: trucks[2].id },
    { name: 'Napkins', category: 'PACKAGING', quantity: 500, unit: 'count', minQuantity: 200, maxQuantity: 1000, costPerUnit: 0.02, supplier: 'Restaurant Supply Co', truckId: trucks[0].id },
    { name: 'To-Go Containers', category: 'PACKAGING', quantity: 200, unit: 'count', minQuantity: 100, maxQuantity: 400, costPerUnit: 0.25, supplier: 'Restaurant Supply Co', truckId: trucks[0].id },
    { name: 'Degreaser Spray', category: 'CLEANING', quantity: 4, unit: 'bottles', minQuantity: 2, maxQuantity: 8, costPerUnit: 7.99, supplier: 'Cleaning Supply Co', truckId: trucks[2].id },
    { name: 'Propane Tank', category: 'OTHER', quantity: 2, unit: 'tanks', minQuantity: 1, maxQuantity: 4, costPerUnit: 45.00, supplier: 'Gas Supply Co', truckId: trucks[0].id },
    { name: 'Bagged Ice', category: 'OTHER', quantity: 10, unit: 'bags', minQuantity: 5, maxQuantity: 20, costPerUnit: 2.50, supplier: 'Ice Depot', truckId: trucks[0].id },
  ];
  const inventoryItems = [];
  for (const item of inventoryData) {
    inventoryItems.push(await prisma.inventoryItem.create({ data: item }));
  }
  console.log('Created inventory items:', inventoryItems.length);

  // ============================================================
  // STEP 9: Create 20 social media posts across platforms and types
  // ============================================================
  const socialPostData = [
    { platform: 'INSTAGRAM', content: 'Find us at Downtown Square today from 11 AM - 2 PM! Come try our new Korean BBQ Bowl!', type: 'LOCATION_ANNOUNCEMENT', status: 'POSTED', postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), likes: 45, comments: 8, shares: 12, reach: 1250, truckId: trucks[0].id },
    { platform: 'FACEBOOK', content: 'Today\'s special: Loaded Nachos for only $10.99! Limited time offer!', type: 'SPECIAL_PROMOTION', status: 'POSTED', postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), likes: 89, comments: 23, shares: 34, reach: 2100, truckId: trucks[0].id },
    { platform: 'TWITTER', content: 'Nothing beats a Classic Smash Burger on a sunny day! Where is your favorite spot to catch us?', type: 'CUSTOMER_ENGAGEMENT', status: 'POSTED', postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), likes: 32, comments: 15, shares: 8, reach: 890, truckId: trucks[0].id },
    { platform: 'INSTAGRAM', content: 'We are at Tech Park Campus today! Perfect for your lunch break. See you there!', type: 'LOCATION_ANNOUNCEMENT', status: 'POSTED', postedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), likes: 67, comments: 12, shares: 20, reach: 1800, truckId: trucks[1].id },
    { platform: 'FACEBOOK', content: 'Thank you all for an amazing weekend at the Farmers Market! Your support means everything to us!', type: 'CUSTOMER_ENGAGEMENT', status: 'POSTED', postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), likes: 156, comments: 42, shares: 28, reach: 3200, truckId: trucks[0].id },
    { platform: 'TIKTOK', content: 'Watch us make 50 tacos in 5 minutes! #foodtruck #tacos #streetfood', type: 'PHOTO_SHARE', status: 'POSTED', postedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), likes: 1234, comments: 156, shares: 245, reach: 15000, truckId: trucks[1].id },
    { platform: 'INSTAGRAM', content: 'Fresh churros coming off the fryer! The perfect way to end your meal', type: 'DAILY_MENU', status: 'POSTED', postedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), likes: 234, comments: 56, shares: 45, reach: 4500, truckId: trucks[0].id },
    { platform: 'TWITTER', content: 'Rainy day? We got you covered at the Craft Brewery District! Pair our food with a cold one!', type: 'LOCATION_ANNOUNCEMENT', status: 'POSTED', postedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), likes: 28, comments: 9, shares: 5, reach: 650, truckId: trucks[2].id },
    { platform: 'FACEBOOK', content: 'GIVEAWAY! Tag a friend who loves tacos for a chance to win a free meal! Winners announced Friday', type: 'SPECIAL_PROMOTION', status: 'POSTED', postedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), likes: 312, comments: 189, shares: 134, reach: 8900, truckId: trucks[1].id },
    { platform: 'INSTAGRAM', content: 'Taco Tuesday is here! All tacos 2 for 1 today only!', type: 'SPECIAL_PROMOTION', status: 'POSTED', postedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), likes: 189, comments: 34, shares: 67, reach: 3800, truckId: trucks[1].id },
    { platform: 'TIKTOK', content: 'The smoke ring on this brisket is unreal! 14 hours of low and slow #bbq #brisket', type: 'PHOTO_SHARE', status: 'POSTED', postedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000), likes: 890, comments: 78, shares: 156, reach: 12000, truckId: trucks[2].id },
    { platform: 'FACEBOOK', content: 'Introducing our NEW Truffle Mushroom Pizza! Earthy, rich, and absolutely delicious.', type: 'DAILY_MENU', status: 'POSTED', postedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), likes: 78, comments: 25, shares: 19, reach: 1900, truckId: trucks[4].id },
    { platform: 'INSTAGRAM', content: 'Behind the scenes: Prepping 50 lbs of our famous bulgogi beef!', type: 'CUSTOMER_ENGAGEMENT', status: 'POSTED', postedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000), likes: 145, comments: 28, shares: 41, reach: 3100, truckId: trucks[0].id },
    { platform: 'TWITTER', content: 'Vietnamese Iced Coffee is the BEST way to beat this Texas heat. Who agrees?', type: 'CUSTOMER_ENGAGEMENT', status: 'POSTED', postedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), likes: 56, comments: 34, shares: 12, reach: 1400, truckId: trucks[3].id },
    { platform: 'FACEBOOK', content: 'Family Feast deal is back! Feed the whole crew for just $44.99', type: 'SPECIAL_PROMOTION', status: 'POSTED', postedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), likes: 167, comments: 45, shares: 78, reach: 4200, truckId: trucks[0].id },
    { platform: 'INSTAGRAM', content: 'This weekend we are at the Austin Music Festival! Find us at the food court area', type: 'EVENT_ANNOUNCEMENT', status: 'SCHEDULED', scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), truckId: trucks[0].id },
    { platform: 'FACEBOOK', content: 'Flash sale this Friday: 20% off all orders over $25! Use code FRIDAY20', type: 'SPECIAL_PROMOTION', status: 'SCHEDULED', scheduledFor: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), truckId: trucks[0].id },
    { platform: 'TWITTER', content: 'Monday motivation: Start your week right with our breakfast burrito special!', type: 'DAILY_MENU', status: 'SCHEDULED', scheduledFor: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), truckId: trucks[1].id },
    { platform: 'INSTAGRAM', content: 'Draft: New pho recipe testing coming soon...', type: 'DAILY_MENU', status: 'DRAFT', truckId: trucks[3].id },
    { platform: 'TIKTOK', content: 'Draft: Pizza dough tossing video compilation', type: 'PHOTO_SHARE', status: 'DRAFT', truckId: trucks[4].id },
  ];
  const socialPosts = [];
  for (const post of socialPostData) {
    socialPosts.push(await prisma.socialPost.create({ data: post }));
  }
  console.log('Created social posts:', socialPosts.length);

  // ============================================================
  // STEP 10: Create 25 sales records
  // ============================================================
  const salesData = [];
  for (let i = 1; i <= 25; i++) {
    const date = new Date(Date.now() - (i - 1) * 24 * 60 * 60 * 1000);
    const baseAmount = 400 + Math.random() * 1000;
    const cashAmount = parseFloat((baseAmount * (0.3 + Math.random() * 0.2)).toFixed(2));
    const cardAmount = parseFloat((baseAmount * (0.3 + Math.random() * 0.2)).toFixed(2));
    const mobileAmount = parseFloat((baseAmount - cashAmount - cardAmount).toFixed(2));
    const transactions = 25 + Math.floor(Math.random() * 60);

    salesData.push({
      date,
      totalSales: parseFloat(baseAmount.toFixed(2)),
      cashSales: cashAmount,
      cardSales: cardAmount,
      mobileSales: mobileAmount > 0 ? mobileAmount : 0,
      transactionCount: transactions,
      averageTicket: parseFloat((baseAmount / transactions).toFixed(2)),
      notes: i === 1 ? 'Great lunch rush' : i === 5 ? 'Slow morning, busy evening' : i === 10 ? 'Festival day - record sales!' : null,
      truckId: trucks[i % trucks.length].id,
    });
  }
  const sales = [];
  for (const sale of salesData) {
    sales.push(await prisma.sale.create({ data: sale }));
  }
  console.log('Created sales:', sales.length);

  // ============================================================
  // STEP 11: Create 25 expense records across categories
  // ============================================================
  const expenseData = [
    { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), amount: 245.50, category: 'FOOD_SUPPLIES', vendor: 'Premium Meats Co', description: 'Weekly meat order - beef and chicken', paymentMethod: 'CREDIT_CARD', truckId: trucks[0].id },
    { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), amount: 89.00, category: 'FUEL', vendor: 'Shell Gas Station', description: 'Truck fuel', paymentMethod: 'DEBIT_CARD', truckId: trucks[0].id },
    { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), amount: 156.75, category: 'FOOD_SUPPLIES', vendor: 'Fresh Farms', description: 'Produce order - lettuce, tomatoes, onions', paymentMethod: 'CREDIT_CARD', truckId: trucks[0].id },
    { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), amount: 320.00, category: 'MAINTENANCE', vendor: 'Quick Fix Auto', description: 'Oil change and brake inspection', paymentMethod: 'CREDIT_CARD', truckId: trucks[0].id },
    { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), amount: 75.00, category: 'PERMITS', vendor: 'City of Austin', description: 'Weekly parking permit - downtown', paymentMethod: 'CREDIT_CARD', truckId: trucks[0].id },
    { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), amount: 112.30, category: 'OTHER', vendor: 'Restaurant Supply Co', description: 'To-go containers and napkins', paymentMethod: 'CREDIT_CARD', truckId: trucks[1].id },
    { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), amount: 200.00, category: 'MARKETING', vendor: 'Instagram Ads', description: 'Social media advertising', paymentMethod: 'CREDIT_CARD', truckId: trucks[0].id },
    { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), amount: 45.00, category: 'UTILITIES', vendor: 'Ice Depot', description: 'Bagged ice for the week', paymentMethod: 'CASH', truckId: trucks[0].id },
    { date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), amount: 189.99, category: 'FOOD_SUPPLIES', vendor: 'Dairy Direct', description: 'Cheese and sour cream', paymentMethod: 'CREDIT_CARD', truckId: trucks[4].id },
    { date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), amount: 95.00, category: 'FUEL', vendor: 'Shell Gas Station', description: 'Truck fuel', paymentMethod: 'DEBIT_CARD', truckId: trucks[1].id },
    { date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), amount: 450.00, category: 'EQUIPMENT', vendor: 'Kitchen Supply Pro', description: 'New griddle top', paymentMethod: 'CREDIT_CARD', truckId: trucks[0].id },
    { date: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000), amount: 67.50, category: 'FOOD_SUPPLIES', vendor: 'Local Bakery', description: 'Burger buns and tortillas', paymentMethod: 'CASH', truckId: trucks[0].id },
    { date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), amount: 125.00, category: 'UTILITIES', vendor: 'Gas Supply Co', description: 'Propane refill x2', paymentMethod: 'CREDIT_CARD', truckId: trucks[2].id },
    { date: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000), amount: 800.00, category: 'LABOR', vendor: 'Part-time Staff', description: 'Weekend helper wages', paymentMethod: 'OTHER', truckId: trucks[0].id },
    { date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), amount: 275.00, category: 'FOOD_SUPPLIES', vendor: 'Premium Meats Co', description: 'Weekly meat order', paymentMethod: 'CREDIT_CARD', truckId: trucks[2].id },
    { date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), amount: 200.00, category: 'INSURANCE', vendor: 'State Farm', description: 'Monthly insurance premium', paymentMethod: 'CREDIT_CARD', isRecurring: true, truckId: trucks[0].id },
    { date: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000), amount: 85.00, category: 'MAINTENANCE', vendor: 'Mobile Tire Service', description: 'Tire rotation and inspection', paymentMethod: 'CREDIT_CARD', truckId: trucks[3].id },
    { date: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000), amount: 134.25, category: 'FOOD_SUPPLIES', vendor: 'Fresh Farms', description: 'Produce restock', paymentMethod: 'CREDIT_CARD', truckId: trucks[0].id },
    { date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), amount: 350.00, category: 'PERMITS', vendor: 'Austin Health Dept', description: 'Health inspection fee', paymentMethod: 'CREDIT_CARD', truckId: trucks[0].id },
    { date: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000), amount: 92.00, category: 'FUEL', vendor: 'Exxon', description: 'Truck fuel', paymentMethod: 'DEBIT_CARD', truckId: trucks[2].id },
    { date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), amount: 156.00, category: 'OTHER', vendor: 'Eco Packaging Inc', description: 'Eco-friendly containers', paymentMethod: 'CREDIT_CARD', truckId: trucks[3].id },
    { date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), amount: 299.99, category: 'EQUIPMENT', vendor: 'Amazon', description: 'New food warmers', paymentMethod: 'CREDIT_CARD', truckId: trucks[4].id },
    { date: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000), amount: 750.00, category: 'LABOR', vendor: 'Part-time Staff', description: 'Festival weekend staff', paymentMethod: 'OTHER', truckId: trucks[0].id },
    { date: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000), amount: 178.50, category: 'FOOD_SUPPLIES', vendor: 'Sysco', description: 'Condiments and sauces', paymentMethod: 'CREDIT_CARD', truckId: trucks[1].id },
    { date: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000), amount: 500.00, category: 'MARKETING', vendor: 'Local Radio', description: 'Radio advertisement spot', paymentMethod: 'CREDIT_CARD', truckId: trucks[0].id },
  ];
  const expenses = [];
  for (const exp of expenseData) {
    expenses.push(await prisma.expense.create({ data: exp }));
  }
  console.log('Created expenses:', expenses.length);

  // ============================================================
  // STEP 12: Create 18 permits of various types
  // ============================================================
  const permitData = [
    { permitNumber: 'HTH-2025-001234', type: 'HEALTH', issuingAuthority: 'Austin Health Department', issueDate: new Date('2025-01-15'), expiryDate: new Date('2026-01-15'), cost: 350, status: 'ACTIVE', truckId: trucks[0].id },
    { permitNumber: 'BUS-2025-005678', type: 'BUSINESS', issuingAuthority: 'City of Austin', issueDate: new Date('2025-01-01'), expiryDate: new Date('2025-12-31'), cost: 250, status: 'ACTIVE', truckId: trucks[0].id },
    { permitNumber: 'MV-2025-009012', type: 'MOBILE_VENDOR', issuingAuthority: 'Texas Department of Licensing', issueDate: new Date('2025-02-01'), expiryDate: new Date('2026-02-01'), cost: 500, status: 'ACTIVE', truckId: trucks[0].id },
    { permitNumber: 'FIRE-2025-003456', type: 'FIRE', issuingAuthority: 'Austin Fire Department', issueDate: new Date('2025-01-20'), expiryDate: new Date('2026-01-20'), cost: 150, status: 'ACTIVE', truckId: trucks[0].id },
    { permitNumber: 'PKG-2025-007890', type: 'PARKING', issuingAuthority: 'City of Austin', issueDate: new Date('2025-03-01'), expiryDate: new Date('2025-08-31'), cost: 200, status: 'ACTIVE', notes: 'Downtown Square location only', truckId: trucks[0].id },
    { permitNumber: 'HTH-2025-111111', type: 'HEALTH', issuingAuthority: 'Austin Health Department', issueDate: new Date('2025-02-01'), expiryDate: new Date('2026-02-01'), cost: 350, status: 'ACTIVE', truckId: trucks[1].id },
    { permitNumber: 'BUS-2025-222222', type: 'BUSINESS', issuingAuthority: 'City of Austin', issueDate: new Date('2025-01-01'), expiryDate: new Date('2025-12-31'), cost: 250, status: 'ACTIVE', truckId: trucks[1].id },
    { permitNumber: 'MV-2025-333333', type: 'MOBILE_VENDOR', issuingAuthority: 'Texas Department of Licensing', issueDate: new Date('2025-03-01'), expiryDate: new Date('2026-03-01'), cost: 500, status: 'ACTIVE', truckId: trucks[2].id },
    { permitNumber: 'FIRE-2025-444444', type: 'FIRE', issuingAuthority: 'Austin Fire Department', issueDate: new Date('2025-01-15'), expiryDate: new Date('2026-01-15'), cost: 150, status: 'ACTIVE', truckId: trucks[2].id },
    { permitNumber: 'HTH-2025-555555', type: 'HEALTH', issuingAuthority: 'Austin Health Department', issueDate: new Date('2025-03-01'), expiryDate: new Date('2026-03-01'), cost: 350, status: 'ACTIVE', truckId: trucks[3].id },
    { permitNumber: 'BUS-2025-666666', type: 'BUSINESS', issuingAuthority: 'City of Austin', issueDate: new Date('2025-01-01'), expiryDate: new Date('2025-12-31'), cost: 250, status: 'ACTIVE', truckId: trucks[4].id },
    { permitNumber: 'SPE-2025-112244', type: 'SPECIAL_EVENT', issuingAuthority: 'Austin Parks Dept', issueDate: new Date('2025-06-01'), expiryDate: new Date('2025-06-03'), cost: 300, status: 'ACTIVE', notes: 'Music Festival 2025', truckId: trucks[0].id },
    { permitNumber: 'SPE-2025-556688', type: 'SPECIAL_EVENT', issuingAuthority: 'Austin Events', issueDate: new Date('2025-07-04'), expiryDate: new Date('2025-07-04'), cost: 150, status: 'ACTIVE', notes: 'July 4th Festival', truckId: trucks[1].id },
    { permitNumber: 'HTH-2024-999999', type: 'HEALTH', issuingAuthority: 'Austin Health Department', issueDate: new Date('2024-01-15'), expiryDate: new Date('2025-01-15'), cost: 325, status: 'EXPIRED', truckId: trucks[0].id },
    { permitNumber: 'BUS-2026-000001', type: 'BUSINESS', issuingAuthority: 'City of Austin', issueDate: new Date('2025-11-01'), expiryDate: new Date('2026-12-31'), cost: 275, status: 'PENDING', notes: 'Renewal application submitted', truckId: trucks[0].id },
    { permitNumber: 'PKG-2025-887766', type: 'PARKING', issuingAuthority: 'Tech Park Management', issueDate: new Date('2025-02-15'), expiryDate: new Date('2026-02-15'), cost: 100, status: 'ACTIVE', notes: 'Tech Park Campus - Monday & Wednesday', truckId: trucks[3].id },
    { permitNumber: 'FIRE-2024-OLD01', type: 'FIRE', issuingAuthority: 'Austin Fire Department', issueDate: new Date('2023-06-01'), expiryDate: new Date('2024-06-01'), cost: 140, status: 'EXPIRED', truckId: trucks[4].id },
    { permitNumber: 'MV-2025-PEND01', type: 'MOBILE_VENDOR', issuingAuthority: 'Houston Licensing', issueDate: new Date('2025-12-01'), expiryDate: new Date('2026-12-01'), cost: 550, status: 'PENDING', notes: 'Expansion to Houston area', truckId: trucks[0].id },
  ];
  const permits = [];
  for (const permit of permitData) {
    permits.push(await prisma.permit.create({ data: permit }));
  }
  console.log('Created permits:', permits.length);

  // ============================================================
  // STEP 13: Create 20 events
  // ============================================================
  const eventData = [
    { name: 'Austin Music Festival', description: 'Annual music festival with 50,000+ attendees', startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000), venueAddress: 'Zilker Park, Austin TX', expectedAttendance: 50000, vendorFee: 1500, applicationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), status: 'UPCOMING' },
    { name: 'Food Truck Friday', description: 'Weekly food truck gathering downtown', startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), venueAddress: 'Downtown Austin', expectedAttendance: 2000, vendorFee: 100, status: 'UPCOMING', locationId: locations[0].id },
    { name: 'Austin Craft Beer Festival', description: 'Local breweries and food trucks unite', startDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 46 * 24 * 60 * 60 * 1000), venueAddress: 'Auditorium Shores', expectedAttendance: 15000, vendorFee: 800, applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), status: 'UPCOMING' },
    { name: 'Tech Campus Lunch Series', description: 'Weekly lunch service at tech companies', startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), venueAddress: 'Tech Park Campus', expectedAttendance: 500, vendorFee: 50, status: 'UPCOMING', locationId: locations[1].id },
    { name: 'Saturday Farmers Market', description: 'Weekly farmers market with food vendors', startDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), venueAddress: '200 Market Plaza', expectedAttendance: 3000, vendorFee: 75, status: 'UPCOMING', locationId: locations[3].id },
    { name: 'Austin Marathon Food Zone', description: 'Feeding runners and spectators at the finish line', startDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), venueAddress: 'Congress Avenue', expectedAttendance: 25000, vendorFee: 500, applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), status: 'UPCOMING' },
    { name: 'Outdoor Movie Night', description: 'Family movie screening in the park with food vendors', startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), venueAddress: 'Mueller Lake Park', expectedAttendance: 800, vendorFee: 100, status: 'UPCOMING' },
    { name: 'Charity 5K Run', description: 'Annual charity run with post-race food celebration', startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), venueAddress: 'Lady Bird Lake Trail', expectedAttendance: 1500, vendorFee: 150, applicationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), status: 'UPCOMING' },
    { name: 'First Thursday Art Walk', description: 'Monthly art gallery walk with street food vendors', startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), venueAddress: 'South Congress Ave', expectedAttendance: 5000, vendorFee: 200, status: 'UPCOMING' },
    { name: 'Classic Car Show', description: 'Annual vintage car exhibition with food vendors', startDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), venueAddress: 'Circuit of the Americas', expectedAttendance: 10000, vendorFee: 400, status: 'UPCOMING' },
    { name: 'Austin Pride Festival', description: 'Annual LGBTQ+ pride celebration with food court', startDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 91 * 24 * 60 * 60 * 1000), venueAddress: 'Fiesta Gardens', expectedAttendance: 35000, vendorFee: 700, applicationDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), status: 'UPCOMING' },
    { name: 'UT Graduation Weekend', description: 'University graduation celebration', startDate: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 51 * 24 * 60 * 60 * 1000), venueAddress: 'UT Campus', expectedAttendance: 20000, vendorFee: 600, status: 'UPCOMING', locationId: locations[4].id },
    { name: 'Texas BBQ Festival', description: 'Celebration of Texas barbecue culture', startDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 76 * 24 * 60 * 60 * 1000), venueAddress: 'Travis County Expo Center', expectedAttendance: 40000, vendorFee: 1000, applicationDeadline: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000), status: 'UPCOMING' },
    { name: 'Wellness Festival', description: 'Health and wellness expo with healthy food vendors', startDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000), venueAddress: 'Palmer Events Center', expectedAttendance: 8000, vendorFee: 350, status: 'UPCOMING' },
    { name: 'Halloween Block Party', description: 'Annual Halloween street party', startDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), venueAddress: '6th Street', expectedAttendance: 50000, vendorFee: 800, applicationDeadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), status: 'UPCOMING' },
    { name: 'Spring Fling Festival', description: 'Community spring celebration', startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), venueAddress: 'Republic Square', expectedAttendance: 5000, vendorFee: 250, status: 'COMPLETED' },
    { name: 'Food Truck Rally', description: 'Monthly food truck meetup', startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), venueAddress: 'The Domain', expectedAttendance: 3000, vendorFee: 150, status: 'COMPLETED', locationId: locations[9].id },
    { name: 'SXSW Food Court', description: 'South by Southwest food vendor area', startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() - 53 * 24 * 60 * 60 * 1000), venueAddress: 'Downtown Austin', expectedAttendance: 100000, vendorFee: 2500, status: 'COMPLETED' },
    { name: 'Summer Splash', description: 'Pool party event - cancelled due to weather', startDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000), venueAddress: 'Barton Springs Pool', expectedAttendance: 2000, vendorFee: 200, status: 'CANCELLED' },
    { name: 'Winter Holiday Market', description: 'Holiday shopping and food festival', startDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 182 * 24 * 60 * 60 * 1000), venueAddress: 'Long Center', expectedAttendance: 15000, vendorFee: 500, applicationDeadline: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000), status: 'UPCOMING' },
  ];
  const events = [];
  for (const event of eventData) {
    events.push(await prisma.event.create({ data: event }));
  }
  console.log('Created events:', events.length);

  // ============================================================
  // STEP 14: Create 18 event registrations
  // ============================================================
  const eventRegData = [
    { status: 'APPROVED', boothNumber: 'A1', notes: 'Premium spot near entrance', paymentStatus: 'COMPLETED', paymentAmount: 100, truckId: trucks[0].id, eventId: events[1].id },
    { status: 'APPROVED', boothNumber: 'B3', paymentStatus: 'COMPLETED', paymentAmount: 50, truckId: trucks[0].id, eventId: events[3].id },
    { status: 'PENDING', notes: 'Awaiting committee review', paymentStatus: 'PENDING', paymentAmount: 1500, truckId: trucks[0].id, eventId: events[0].id },
    { status: 'APPROVED', boothNumber: 'C2', paymentStatus: 'COMPLETED', paymentAmount: 75, truckId: trucks[0].id, eventId: events[4].id },
    { status: 'APPROVED', boothNumber: 'A4', paymentStatus: 'COMPLETED', paymentAmount: 100, truckId: trucks[1].id, eventId: events[1].id },
    { status: 'APPROVED', boothNumber: 'D1', paymentStatus: 'COMPLETED', paymentAmount: 200, truckId: trucks[1].id, eventId: events[8].id },
    { status: 'PENDING', paymentStatus: 'PENDING', paymentAmount: 800, truckId: trucks[1].id, eventId: events[2].id },
    { status: 'APPROVED', boothNumber: 'B1', paymentStatus: 'COMPLETED', paymentAmount: 400, truckId: trucks[2].id, eventId: events[9].id },
    { status: 'REJECTED', notes: 'Similar cuisine already registered', paymentStatus: 'PENDING', truckId: trucks[2].id, eventId: events[0].id },
    { status: 'WAITLISTED', notes: 'On waitlist position 3', paymentStatus: 'PENDING', paymentAmount: 700, truckId: trucks[2].id, eventId: events[10].id },
    { status: 'APPROVED', boothNumber: 'E2', paymentStatus: 'COMPLETED', paymentAmount: 150, truckId: trucks[3].id, eventId: events[7].id },
    { status: 'PENDING', paymentStatus: 'PENDING', paymentAmount: 500, truckId: trucks[3].id, eventId: events[5].id },
    { status: 'APPROVED', boothNumber: 'C5', paymentStatus: 'COMPLETED', paymentAmount: 250, truckId: trucks[3].id, eventId: events[15].id },
    { status: 'APPROVED', boothNumber: 'A2', paymentStatus: 'COMPLETED', paymentAmount: 150, truckId: trucks[4].id, eventId: events[16].id },
    { status: 'WAITLISTED', notes: 'On waitlist position 1', paymentStatus: 'PENDING', paymentAmount: 1000, truckId: trucks[4].id, eventId: events[12].id },
    { status: 'APPROVED', boothNumber: 'F3', paymentStatus: 'COMPLETED', paymentAmount: 350, truckId: trucks[4].id, eventId: events[13].id },
    { status: 'APPROVED', boothNumber: 'B5', paymentStatus: 'COMPLETED', paymentAmount: 2500, truckId: trucks[0].id, eventId: events[17].id },
    { status: 'PENDING', paymentStatus: 'PENDING', paymentAmount: 500, truckId: trucks[0].id, eventId: events[19].id },
  ];
  const eventRegistrations = [];
  for (const reg of eventRegData) {
    eventRegistrations.push(await prisma.eventRegistration.create({ data: reg }));
  }
  console.log('Created event registrations:', eventRegistrations.length);

  // ============================================================
  // STEP 15: Create 18 AI recommendations of varied types
  // ============================================================
  const aiRecommendationData = [
    { type: 'LOCATION', title: 'High Traffic Location Alert', description: 'Based on historical data, Tech Park Campus shows 25% higher revenue on Wednesdays. Consider scheduling more Wednesday visits.', confidence: 0.85, truckId: trucks[0].id },
    { type: 'MENU', title: 'Menu Optimization', description: 'Korean BBQ Bowl has the highest profit margin (68%) among main dishes. Consider promoting it more prominently.', confidence: 0.92, truckId: trucks[0].id },
    { type: 'DEMAND', title: 'Weekend Demand Forecast', description: 'Expected 40% increase in traffic this weekend due to local events. Recommend increasing prep quantities for burgers and tacos.', confidence: 0.78, isActioned: true, truckId: trucks[0].id },
    { type: 'WEATHER', title: 'Weather Impact Alert', description: 'Rain expected Thursday. Historical data shows 30% drop in foot traffic during rain. Consider indoor location or reduced hours.', confidence: 0.88, truckId: trucks[0].id },
    { type: 'SOCIAL_MEDIA', title: 'Engagement Opportunity', description: 'Your last Instagram post about churros got 3x average engagement. Consider more dessert-focused content.', confidence: 0.75, isActioned: true, truckId: trucks[0].id },
    { type: 'DEMAND', title: 'Low Stock Alert', description: 'Ground beef inventory at 50% of typical weekly usage. Recommend reordering within 2 days.', confidence: 0.95, truckId: trucks[0].id },
    { type: 'LOCATION', title: 'New Location Suggestion', description: 'Mueller Community shows growing food truck demand with limited competition. Consider testing this location.', confidence: 0.72, truckId: trucks[0].id },
    { type: 'MENU', title: 'Underperforming Item', description: 'Bottled Water sales have dropped 15% this month. Consider bundling with meals or adjusting pricing.', confidence: 0.68, isActioned: true, truckId: trucks[0].id },
    { type: 'DEMAND', title: 'Event Opportunity', description: 'Austin Music Festival approaching in 30 days. Historically your best revenue week. Start planning inventory now.', confidence: 0.91, truckId: trucks[0].id },
    { type: 'CUSTOMER_ENGAGEMENT', title: 'Customer Feedback Trend', description: 'Multiple positive mentions of "fresh ingredients" in recent reviews. Highlight this in marketing materials.', confidence: 0.82, isActioned: true, truckId: trucks[0].id },
    { type: 'ROUTE', title: 'Route Optimization', description: 'Switching order of Tuesday locations could save 20 minutes drive time and reduce fuel costs by $8/day.', confidence: 0.79, truckId: trucks[1].id },
    { type: 'DEMAND', title: 'Waste Reduction Opportunity', description: 'Produce waste up 15% this week. Consider adjusting produce orders or prep quantities.', confidence: 0.85, truckId: trucks[0].id },
    { type: 'SOCIAL_MEDIA', title: 'Optimal Posting Time', description: 'Analysis shows highest engagement on Instagram between 11 AM - 12 PM. Schedule posts accordingly.', confidence: 0.88, isActioned: true, truckId: trucks[0].id },
    { type: 'WEATHER', title: 'Hot Weather Menu Adjustment', description: 'High temperatures forecasted next week. Cold drinks and lighter items typically see 25% sales increase.', confidence: 0.76, truckId: trucks[3].id },
    { type: 'LOCATION', title: 'Competition Alert', description: 'New food truck spotted at Downtown Square on Fridays. Consider alternative days or locations to avoid competition.', confidence: 0.70, truckId: trucks[0].id },
    { type: 'MENU', title: 'Birria Taco Trend', description: 'Birria tacos searches up 40% in Austin. Your Birria Tacos are perfectly positioned - promote heavily on social media.', confidence: 0.87, truckId: trucks[1].id },
    { type: 'CUSTOMER_ENGAGEMENT', title: 'Loyalty Program Suggestion', description: 'Repeat customer rate is 35%. Implementing a simple punch card could increase retention by 20%.', confidence: 0.73, truckId: trucks[0].id },
    { type: 'ROUTE', title: 'Fuel Savings Route', description: 'Rerouting from BBQ Boss usual path to Medical Center saves 4.2 miles and approximately $3.50 in fuel.', confidence: 0.81, truckId: trucks[2].id },
  ];
  const aiRecommendations = [];
  for (const ai of aiRecommendationData) {
    aiRecommendations.push(await prisma.aIRecommendation.create({ data: ai }));
  }
  console.log('Created AI recommendations:', aiRecommendations.length);

  // ============================================================
  // STEP 16: Create 20 notifications
  // ============================================================
  const notificationData = [
    { type: 'ORDER', title: 'New Order Received', message: 'Order #1001 - $25.48 - John Smith', isRead: false, userId: user.id },
    { type: 'INVENTORY', title: 'Low Stock Alert', message: 'Ground Beef is running low (25 lbs remaining)', isRead: false, userId: user.id },
    { type: 'PERMIT', title: 'Permit Expiring Soon', message: 'Business permit BUS-2025-005678 expires in 30 days', isRead: true, userId: user.id },
    { type: 'EVENT', title: 'Event Registration Approved', message: 'Your registration for Food Truck Friday has been approved', isRead: true, userId: user.id },
    { type: 'AI', title: 'New AI Recommendation', message: 'Check out location suggestions for better revenue this week', isRead: false, userId: user.id },
    { type: 'SOCIAL', title: 'Post Performance', message: 'Your recent Instagram post reached 3,200 people!', isRead: true, userId: user.id },
    { type: 'ORDER', title: 'Large Order Incoming', message: 'Order #1015 - $54.99 - Family Feast order from Nicole Garcia', isRead: false, userId: user.id },
    { type: 'SYSTEM', title: 'Weekly Report Ready', message: 'Your weekly performance report is available for review', isRead: false, userId: user.id },
    { type: 'INVENTORY', title: 'Expiring Item Alert', message: 'Lettuce expires in 5 days - consider using in specials', isRead: false, userId: user.id },
    { type: 'EVENT', title: 'Event Registration Pending', message: 'Austin Music Festival registration is still pending review', isRead: false, userId: user.id },
    { type: 'ORDER', title: 'Order Cancelled', message: 'Order #1016 was cancelled by customer Stephanie Walker', isRead: true, userId: user.id },
    { type: 'PERMIT', title: 'New Permit Available', message: 'Special event permit for July 4th Festival is now available', isRead: false, userId: user.id },
    { type: 'AI', title: 'Weather Impact Warning', message: 'Rain expected Thursday - consider adjusting your schedule', isRead: false, userId: user.id },
    { type: 'SOCIAL', title: 'Scheduled Post Published', message: 'Your scheduled Instagram post was published successfully', isRead: true, userId: user.id },
    { type: 'SYSTEM', title: 'Backup Completed', message: 'Daily data backup completed successfully at 3:00 AM', isRead: true, userId: user.id },
    { type: 'ORDER', title: 'Pre-Order Received', message: 'New pre-order for tomorrow at Tech Park Campus - 3 items', isRead: false, userId: user.id },
    { type: 'INVENTORY', title: 'Restock Reminder', message: 'Weekly restock day - check inventory levels before ordering', isRead: false, userId: user.id },
    { type: 'EVENT', title: 'Event Registration Rejected', message: 'BBQ Boss registration for Austin Music Festival was rejected - similar cuisine conflict', isRead: true, userId: user.id },
    { type: 'AI', title: 'Menu Price Suggestion', message: 'AI suggests increasing Korean BBQ Bowl price by $1 based on demand analysis', isRead: false, userId: user.id },
    { type: 'SYSTEM', title: 'App Update Available', message: 'A new version of the food truck management app is available', isRead: false, userId: user.id },
  ];
  const notifications = [];
  for (const n of notificationData) {
    notifications.push(await prisma.notification.create({ data: n }));
  }
  console.log('Created notifications:', notifications.length);

  // ============================================================
  // STEP 17: Create GPS Live Locations for all trucks
  // ============================================================
  const liveLocData = [
    { latitude: 30.2672, longitude: -97.7431, heading: 45.0, speed: 0, isActive: true, truckId: trucks[0].id },
    { latitude: 30.2849, longitude: -97.7341, heading: 90.0, speed: 0, isActive: true, truckId: trucks[1].id },
    { latitude: 30.2500, longitude: -97.7500, heading: 180.0, speed: 0, isActive: true, truckId: trucks[2].id },
    { latitude: 30.2621, longitude: -97.7207, heading: 270.0, speed: 0, isActive: true, truckId: trucks[3].id },
    { latitude: 30.3944, longitude: -97.7252, heading: 0.0, speed: 0, isActive: false, truckId: trucks[4].id },
  ];
  for (const loc of liveLocData) {
    await prisma.truckLiveLocation.create({ data: loc });
  }
  console.log('Created live locations for trucks:', liveLocData.length);

  // ============================================================
  // STEP 18: Create Event Booths
  // ============================================================
  const boothSizes = ['SMALL', 'STANDARD', 'LARGE', 'PREMIUM'];
  const eventBooths = [];
  for (let e = 0; e < 3; e++) {
    for (let b = 1; b <= 5; b++) {
      const boothNum = `${String.fromCharCode(65 + e)}${b}`;
      eventBooths.push({
        boothNumber: boothNum,
        location: ['Front Row', 'Center', 'Back Row'][e],
        size: boothSizes[(e + b) % 4],
        price: 100 + (e * 50) + (b * 25),
        amenities: b === 1 ? ['Electricity', 'Water'] : b === 5 ? ['Electricity', 'Water', 'Tent'] : ['Electricity'],
        isAvailable: b > 2,
        eventId: events[e].id,
      });
    }
  }
  for (const booth of eventBooths) {
    await prisma.eventBooth.create({ data: booth });
  }
  console.log('Created event booths:', eventBooths.length);

  // ============================================================
  // STEP 19: Create Event Timelines
  // ============================================================
  const timelineTypes = ['APPLICATION_DEADLINE', 'PAYMENT_DUE', 'DOCUMENT_SUBMISSION', 'SETUP_TIME', 'EVENT_START', 'EVENT_END', 'CUSTOM'];
  const timelineTitles = [
    'Submit Application', 'Pay Vendor Fee', 'Upload Insurance Certificate', 'Booth Setup (2 hours before)',
    'Event Begins', 'Event Ends', 'Review Follow-up', 'Submit Final Invoice', 'Equipment Check',
    'Staff Briefing', 'Menu Submission', 'Health Certificate Due', 'Parking Pass Pickup',
    'Load-in Time', 'Tear Down Complete', 'Post-Event Survey', 'Social Media Post',
    'Inventory Prep', 'Route Planning', 'Final Confirmation',
  ];
  for (let i = 0; i < 20; i++) {
    const eventIndex = i % 5;
    const daysOffset = [-7, -3, -1, 0, 0, 1, 3][i % 7];
    await prisma.eventTimeline.create({
      data: {
        title: timelineTitles[i],
        description: i % 3 === 0 ? 'Important deadline - do not miss!' : null,
        dueDate: new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000 + i * 2 * 60 * 60 * 1000),
        type: timelineTypes[i % timelineTypes.length],
        isCompleted: i < 5,
        completedAt: i < 5 ? new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000) : null,
        eventId: events[eventIndex].id,
        registrationId: i < 4 ? eventRegistrations[i % eventRegistrations.length].id : null,
      },
    });
  }
  console.log('Created event timelines: 20');

  // ============================================================
  // STEP 20: Create Location Analytics
  // ============================================================
  const weatherConditions = ['Clear', 'Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Overcast'];
  const pastTruckLocations = truckLocations.filter(tl => tl.status === 'COMPLETED');
  let analyticsCount = 0;
  for (let i = 0; i < pastTruckLocations.length; i++) {
    const tl = pastTruckLocations[i];
    const revenue = tl.revenue || 500 + Math.random() * 1000;
    const customers = tl.customerCount || 30 + Math.floor(Math.random() * 70);
    const orderCount = Math.floor(customers * 0.8);
    const hours = 4 + Math.random() * 4;
    await prisma.locationAnalytics.create({
      data: {
        date: tl.date,
        revenue: parseFloat(revenue.toFixed(2)),
        expenses: parseFloat((revenue * 0.35).toFixed(2)),
        customerCount: customers,
        orderCount,
        averageOrderValue: parseFloat((revenue / orderCount).toFixed(2)),
        peakHour: 12 + Math.floor(Math.random() * 3),
        topSellingItems: JSON.stringify(['Classic Smash Burger', 'Street Tacos', 'Korean BBQ Bowl'].slice(0, 2 + Math.floor(Math.random() * 2))),
        weatherCondition: weatherConditions[i % weatherConditions.length],
        operatingHours: parseFloat(hours.toFixed(1)),
        revenuePerHour: parseFloat((revenue / hours).toFixed(2)),
        revenuePerCustomer: parseFloat((revenue / customers).toFixed(2)),
        truckId: tl.truckId,
        locationId: tl.locationId,
      },
    });
    analyticsCount++;
  }
  console.log('Created location analytics:', analyticsCount);

  // ============================================================
  // STEP 21: Create Location Goals
  // ============================================================
  const goalPeriods = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'];
  for (let i = 0; i < 15; i++) {
    const period = goalPeriods[i % 4];
    const periodDays = { DAILY: 1, WEEKLY: 7, MONTHLY: 30, QUARTERLY: 90 }[period];
    await prisma.locationGoal.create({
      data: {
        targetRevenue: [500, 3500, 15000, 45000][i % 4],
        targetCustomers: [50, 350, 1500, 4500][i % 4],
        period,
        startDate: new Date(Date.now() - (i % 3) * periodDays * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + (periodDays - (i % 3) * periodDays) * 24 * 60 * 60 * 1000),
        truckId: trucks[i % trucks.length].id,
        locationId: locations[i % locations.length].id,
      },
    });
  }
  console.log('Created location goals: 15');

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n========================================');
  console.log('Seeding completed successfully!');
  console.log('========================================');
  console.log('\nDemo Account:');
  console.log('Email: demo@foodtruck.com');
  console.log('Password: Demo@1234');
  console.log('\nData Summary:');
  console.log(`- User: 1`);
  console.log(`- Trucks: ${trucks.length}`);
  console.log(`- Locations: ${locations.length}`);
  console.log(`- Truck Location Bookings: ${truckLocations.length}`);
  console.log(`- Menu Items: ${allMenuItems.length}`);
  console.log(`- Orders: ${orders.length}`);
  console.log(`- Order Items: ${orderItemCount}`);
  console.log(`- Inventory Items: ${inventoryItems.length}`);
  console.log(`- Social Posts: ${socialPosts.length}`);
  console.log(`- Sales Records: ${sales.length}`);
  console.log(`- Expenses: ${expenses.length}`);
  console.log(`- Permits: ${permits.length}`);
  console.log(`- Events: ${events.length}`);
  console.log(`- Event Registrations: ${eventRegistrations.length}`);
  console.log(`- AI Recommendations: ${aiRecommendations.length}`);
  console.log(`- Notifications: ${notifications.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
