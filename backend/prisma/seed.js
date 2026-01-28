const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with comprehensive demo data...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@foodtruck.com' },
    update: {},
    create: {
      email: 'demo@foodtruck.com',
      password: hashedPassword,
      name: 'Demo Owner',
      role: 'OWNER'
    }
  });
  console.log('Created user:', user.email);

  // Create demo truck
  const truck = await prisma.truck.upsert({
    where: { id: 'demo-truck-1' },
    update: {},
    create: {
      id: 'demo-truck-1',
      name: 'Tasty Wheels',
      description: 'The best gourmet street food in town!',
      phone: '555-123-4567',
      email: 'info@tastywheels.com',
      cuisineType: 'American Fusion',
      isActive: true,
      ownerId: user.id
    }
  });
  console.log('Created truck:', truck.name);

  // Create additional demo trucks (for other owners to make customer map more interesting)
  const additionalTrucks = await Promise.all([
    prisma.truck.upsert({
      where: { id: 'demo-truck-2' },
      update: {},
      create: {
        id: 'demo-truck-2',
        name: 'Taco Tornado',
        description: 'Authentic Mexican street tacos and more!',
        phone: '555-234-5678',
        email: 'info@tacotornado.com',
        cuisineType: 'Mexican',
        isActive: true,
        ownerId: user.id
      }
    }),
    prisma.truck.upsert({
      where: { id: 'demo-truck-3' },
      update: {},
      create: {
        id: 'demo-truck-3',
        name: 'BBQ Boss',
        description: 'Texas-style smoked meats and classic sides',
        phone: '555-345-6789',
        email: 'info@bbqboss.com',
        cuisineType: 'BBQ',
        isActive: true,
        ownerId: user.id
      }
    }),
    prisma.truck.upsert({
      where: { id: 'demo-truck-4' },
      update: {},
      create: {
        id: 'demo-truck-4',
        name: 'Pho on Wheels',
        description: 'Vietnamese pho and banh mi sandwiches',
        phone: '555-456-7890',
        email: 'info@phoonwheels.com',
        cuisineType: 'Vietnamese',
        isActive: true,
        ownerId: user.id
      }
    }),
    prisma.truck.upsert({
      where: { id: 'demo-truck-5' },
      update: {},
      create: {
        id: 'demo-truck-5',
        name: 'Pizza Pirate',
        description: 'Wood-fired pizzas made fresh on the street',
        phone: '555-567-8901',
        email: 'info@pizzapirate.com',
        cuisineType: 'Italian',
        isActive: true,
        ownerId: user.id
      }
    })
  ]);
  console.log('Created additional trucks:', additionalTrucks.length);

  // Create 20 locations
  const locationData = [
    { id: 'loc-downtown', name: 'Downtown Square', address: '123 Main St', city: 'Austin', state: 'TX', zipCode: '78701', latitude: 30.2672, longitude: -97.7431, type: 'STREET' },
    { id: 'loc-tech-park', name: 'Tech Park Campus', address: '500 Innovation Way', city: 'Austin', state: 'TX', zipCode: '78758', latitude: 30.3944, longitude: -97.7252, type: 'PRIVATE_PROPERTY' },
    { id: 'loc-brewery', name: 'Craft Brewery District', address: '800 Brewery Lane', city: 'Austin', state: 'TX', zipCode: '78702', latitude: 30.2621, longitude: -97.7207, type: 'PARKING_LOT' },
    { id: 'loc-farmers-market', name: 'Saturday Farmers Market', address: '200 Market Plaza', city: 'Austin', state: 'TX', zipCode: '78704', latitude: 30.2500, longitude: -97.7500, type: 'MARKET' },
    { id: 'loc-university', name: 'University Campus', address: '2100 University Ave', city: 'Austin', state: 'TX', zipCode: '78712', latitude: 30.2849, longitude: -97.7341, type: 'PRIVATE_PROPERTY' },
    { id: 'loc-hospital', name: 'Medical Center', address: '1500 Medical Pkwy', city: 'Austin', state: 'TX', zipCode: '78756', latitude: 30.3200, longitude: -97.7300, type: 'PRIVATE_PROPERTY' },
    { id: 'loc-sports-complex', name: 'Sports Complex', address: '3000 Arena Blvd', city: 'Austin', state: 'TX', zipCode: '78703', latitude: 30.2750, longitude: -97.7550, type: 'EVENT_VENUE' },
    { id: 'loc-park-trail', name: 'Greenbelt Trail', address: '400 Barton Springs Rd', city: 'Austin', state: 'TX', zipCode: '78704', latitude: 30.2605, longitude: -97.7697, type: 'STREET' },
    { id: 'loc-office-tower', name: 'Corporate Tower Plaza', address: '1000 Congress Ave', city: 'Austin', state: 'TX', zipCode: '78701', latitude: 30.2700, longitude: -97.7420, type: 'PRIVATE_PROPERTY' },
    { id: 'loc-shopping-mall', name: 'Domain Shopping Center', address: '11410 Century Oaks', city: 'Austin', state: 'TX', zipCode: '78758', latitude: 30.4020, longitude: -97.7250, type: 'PARKING_LOT' },
    { id: 'loc-food-park', name: 'South Congress Food Park', address: '1600 S Congress Ave', city: 'Austin', state: 'TX', zipCode: '78704', latitude: 30.2450, longitude: -97.7497, type: 'FOOD_COURT' },
    { id: 'loc-waterfront', name: 'Lady Bird Lake Waterfront', address: '920 Riverside Dr', city: 'Austin', state: 'TX', zipCode: '78704', latitude: 30.2580, longitude: -97.7500, type: 'STREET' },
    { id: 'loc-airport', name: 'Airport Business Park', address: '4500 Spirit of Texas Dr', city: 'Austin', state: 'TX', zipCode: '78719', latitude: 30.1945, longitude: -97.6699, type: 'PRIVATE_PROPERTY' },
    { id: 'loc-industrial', name: 'East Austin Industrial', address: '2200 E 7th St', city: 'Austin', state: 'TX', zipCode: '78702', latitude: 30.2630, longitude: -97.7150, type: 'STREET' },
    { id: 'loc-music-hall', name: 'ACL Live Area', address: '310 W Willie Nelson Blvd', city: 'Austin', state: 'TX', zipCode: '78701', latitude: 30.2640, longitude: -97.7490, type: 'EVENT_VENUE' },
    { id: 'loc-community-center', name: 'Community Recreation Center', address: '1600 Springdale Rd', city: 'Austin', state: 'TX', zipCode: '78721', latitude: 30.2680, longitude: -97.7000, type: 'PRIVATE_PROPERTY' },
    { id: 'loc-country-club', name: 'Riverside Golf Course', address: '1020 Grove Blvd', city: 'Austin', state: 'TX', zipCode: '78741', latitude: 30.2350, longitude: -97.7200, type: 'PRIVATE_PROPERTY' },
    { id: 'loc-movie-theater', name: 'Alamo Drafthouse Plaza', address: '1120 S Lamar Blvd', city: 'Austin', state: 'TX', zipCode: '78704', latitude: 30.2550, longitude: -97.7680, type: 'PARKING_LOT' },
    { id: 'loc-convention', name: 'Convention Center', address: '500 E Cesar Chavez St', city: 'Austin', state: 'TX', zipCode: '78701', latitude: 30.2615, longitude: -97.7390, type: 'EVENT_VENUE' },
    { id: 'loc-neighborhood', name: 'Mueller Community', address: '4550 Mueller Blvd', city: 'Austin', state: 'TX', zipCode: '78723', latitude: 30.2980, longitude: -97.7050, type: 'PRIVATE_PROPERTY' }
  ];

  const locations = await Promise.all(
    locationData.map(loc => prisma.location.upsert({
      where: { id: loc.id },
      update: {},
      create: loc
    }))
  );
  console.log('Created locations:', locations.length);

  // Create menu
  const menu = await prisma.menu.upsert({
    where: { id: 'menu-main' },
    update: {},
    create: {
      id: 'menu-main',
      name: 'Main Menu',
      description: 'Our delicious everyday offerings',
      isActive: true,
      isDefault: true,
      truckId: truck.id
    }
  });

  // Create 5 categories
  const categoryData = [
    { id: 'cat-mains', name: 'Main Dishes', description: 'Our signature entrees', sortOrder: 1, menuId: menu.id },
    { id: 'cat-sides', name: 'Sides', description: 'Perfect accompaniments', sortOrder: 2, menuId: menu.id },
    { id: 'cat-drinks', name: 'Beverages', description: 'Refreshing drinks', sortOrder: 3, menuId: menu.id },
    { id: 'cat-desserts', name: 'Desserts', description: 'Sweet treats', sortOrder: 4, menuId: menu.id },
    { id: 'cat-specials', name: 'Daily Specials', description: 'Limited time offerings', sortOrder: 5, menuId: menu.id }
  ];

  const categories = await Promise.all(
    categoryData.map(cat => prisma.menuCategory.upsert({
      where: { id: cat.id },
      update: {},
      create: cat
    }))
  );

  // Create 25+ menu items
  const menuItemData = [
    // Main Dishes (10 items)
    { id: 'item-burger', name: 'Classic Smash Burger', description: 'Double patty with special sauce, lettuce, tomato, and pickles', price: 12.99, isAvailable: true, calories: 850, allergens: ['gluten', 'dairy'], tags: ['popular', 'signature'], prepTime: 8, categoryId: categories[0].id },
    { id: 'item-tacos', name: 'Street Tacos (3)', description: 'Choice of carne asada, chicken, or carnitas with cilantro and onion', price: 10.99, isAvailable: true, calories: 650, allergens: ['gluten'], tags: ['popular'], prepTime: 6, categoryId: categories[0].id },
    { id: 'item-bowl', name: 'Korean BBQ Bowl', description: 'Bulgogi beef over rice with kimchi, pickled vegetables, and gochujang', price: 14.99, isAvailable: true, calories: 720, allergens: ['soy', 'sesame'], tags: ['healthy'], prepTime: 7, categoryId: categories[0].id },
    { id: 'item-nachos', name: 'Loaded Nachos', description: 'Crispy chips loaded with cheese, beans, jalapeños, and your choice of protein', price: 13.99, isAvailable: true, isSpecial: true, specialPrice: 10.99, calories: 980, allergens: ['dairy', 'gluten'], tags: ['special', 'shareable'], prepTime: 10, categoryId: categories[0].id },
    { id: 'item-burrito', name: 'Giant Burrito', description: 'Flour tortilla stuffed with rice, beans, protein, cheese, salsa, and guacamole', price: 11.99, isAvailable: true, calories: 890, allergens: ['gluten', 'dairy'], tags: ['filling'], prepTime: 8, categoryId: categories[0].id },
    { id: 'item-philly', name: 'Philly Cheesesteak', description: 'Shaved ribeye with peppers, onions, and provolone on hoagie roll', price: 13.99, isAvailable: true, calories: 920, allergens: ['gluten', 'dairy'], tags: ['signature'], prepTime: 9, categoryId: categories[0].id },
    { id: 'item-chicken-sand', name: 'Crispy Chicken Sandwich', description: 'Fried chicken breast with pickles, coleslaw, and spicy mayo', price: 11.99, isAvailable: true, calories: 780, allergens: ['gluten', 'dairy', 'eggs'], tags: ['popular'], prepTime: 8, categoryId: categories[0].id },
    { id: 'item-fish-tacos', name: 'Baja Fish Tacos (2)', description: 'Beer-battered fish with cabbage slaw and chipotle crema', price: 12.99, isAvailable: true, calories: 580, allergens: ['gluten', 'fish', 'dairy'], tags: ['seafood'], prepTime: 8, categoryId: categories[0].id },
    { id: 'item-quesadilla', name: 'Loaded Quesadilla', description: 'Grilled tortilla with cheese, protein, peppers, and onions', price: 10.99, isAvailable: true, calories: 720, allergens: ['gluten', 'dairy'], tags: [], prepTime: 7, categoryId: categories[0].id },
    { id: 'item-veggie-wrap', name: 'Mediterranean Veggie Wrap', description: 'Hummus, falafel, cucumber, tomato, and tzatziki in a wrap', price: 10.99, isAvailable: true, calories: 520, allergens: ['gluten', 'sesame'], tags: ['vegetarian', 'healthy'], prepTime: 6, categoryId: categories[0].id },

    // Sides (6 items)
    { id: 'item-fries', name: 'Seasoned Fries', description: 'Crispy fries with our signature spice blend', price: 4.99, isAvailable: true, calories: 380, allergens: [], tags: ['vegan'], prepTime: 4, categoryId: categories[1].id },
    { id: 'item-coleslaw', name: 'Tangy Coleslaw', description: 'Fresh cabbage slaw with apple cider vinegar dressing', price: 3.99, isAvailable: true, calories: 150, allergens: [], tags: ['healthy', 'vegan'], prepTime: 2, categoryId: categories[1].id },
    { id: 'item-onion-rings', name: 'Beer-Battered Onion Rings', description: 'Thick-cut onion rings with ranch dipping sauce', price: 5.99, isAvailable: true, calories: 450, allergens: ['gluten'], tags: [], prepTime: 5, categoryId: categories[1].id },
    { id: 'item-corn', name: 'Street Corn', description: 'Grilled corn with mayo, cotija cheese, and chili powder', price: 4.99, isAvailable: true, calories: 280, allergens: ['dairy'], tags: ['popular'], prepTime: 4, categoryId: categories[1].id },
    { id: 'item-mac-cheese', name: 'Mac & Cheese Bites', description: 'Crispy fried mac and cheese balls with marinara', price: 6.99, isAvailable: true, calories: 520, allergens: ['gluten', 'dairy'], tags: ['comfort'], prepTime: 5, categoryId: categories[1].id },
    { id: 'item-rice-beans', name: 'Rice and Beans', description: 'Cilantro lime rice with black beans', price: 3.99, isAvailable: true, calories: 320, allergens: [], tags: ['vegan', 'gluten-free'], prepTime: 3, categoryId: categories[1].id },

    // Drinks (6 items)
    { id: 'item-lemonade', name: 'Fresh Lemonade', description: 'House-made lemonade with a hint of mint', price: 3.99, isAvailable: true, calories: 120, allergens: [], tags: ['refreshing'], prepTime: 1, categoryId: categories[2].id },
    { id: 'item-soda', name: 'Fountain Soda', description: 'Coke, Sprite, or Dr Pepper', price: 2.49, isAvailable: true, calories: 180, allergens: [], tags: [], prepTime: 1, categoryId: categories[2].id },
    { id: 'item-iced-tea', name: 'Sweet Iced Tea', description: 'Southern-style sweet tea', price: 2.99, isAvailable: true, calories: 140, allergens: [], tags: [], prepTime: 1, categoryId: categories[2].id },
    { id: 'item-agua-fresca', name: 'Agua Fresca', description: 'Rotating flavors: watermelon, horchata, or jamaica', price: 4.49, isAvailable: true, calories: 100, allergens: [], tags: ['refreshing'], prepTime: 1, categoryId: categories[2].id },
    { id: 'item-cold-brew', name: 'Cold Brew Coffee', description: 'Smooth, slow-steeped cold brew', price: 3.99, isAvailable: true, calories: 5, allergens: [], tags: ['caffeine'], prepTime: 1, categoryId: categories[2].id },
    { id: 'item-bottled-water', name: 'Bottled Water', description: 'Purified spring water', price: 1.99, isAvailable: true, calories: 0, allergens: [], tags: [], prepTime: 1, categoryId: categories[2].id },

    // Desserts (4 items)
    { id: 'item-churros', name: 'Cinnamon Churros', description: 'Fresh fried churros with chocolate dipping sauce', price: 5.99, isAvailable: true, calories: 420, allergens: ['gluten', 'dairy'], tags: ['sweet'], prepTime: 5, categoryId: categories[3].id },
    { id: 'item-brownie', name: 'Fudge Brownie', description: 'Rich chocolate brownie with walnuts', price: 3.99, isAvailable: true, calories: 350, allergens: ['gluten', 'dairy', 'nuts', 'eggs'], tags: [], prepTime: 1, categoryId: categories[3].id },
    { id: 'item-cookie', name: 'Giant Cookie', description: 'Fresh-baked chocolate chip cookie', price: 2.99, isAvailable: true, calories: 280, allergens: ['gluten', 'dairy', 'eggs'], tags: [], prepTime: 1, categoryId: categories[3].id },
    { id: 'item-ice-cream', name: 'Ice Cream Cup', description: 'Two scoops of vanilla or chocolate', price: 4.99, isAvailable: true, calories: 300, allergens: ['dairy'], tags: [], prepTime: 2, categoryId: categories[3].id },

    // Daily Specials (4 items)
    { id: 'item-special-1', name: 'Monday Burger Madness', description: 'Any burger with fries and drink', price: 15.99, isAvailable: true, isSpecial: true, specialPrice: 12.99, calories: 1200, allergens: ['gluten', 'dairy'], tags: ['deal'], prepTime: 10, categoryId: categories[4].id },
    { id: 'item-special-2', name: 'Taco Tuesday', description: 'All tacos 2 for 1', price: 10.99, isAvailable: true, isSpecial: true, specialPrice: 10.99, calories: 650, allergens: ['gluten'], tags: ['deal', 'popular'], prepTime: 6, categoryId: categories[4].id },
    { id: 'item-special-3', name: 'Family Feast', description: '4 entrees, 4 sides, 4 drinks', price: 54.99, isAvailable: true, isSpecial: true, specialPrice: 44.99, calories: 3500, allergens: ['gluten', 'dairy'], tags: ['shareable', 'deal'], prepTime: 20, categoryId: categories[4].id },
    { id: 'item-special-4', name: 'Kids Meal', description: 'Small entree, side, drink, and cookie', price: 8.99, isAvailable: true, calories: 600, allergens: ['gluten', 'dairy'], tags: ['kids'], prepTime: 8, categoryId: categories[4].id }
  ];

  const menuItems = await Promise.all(
    menuItemData.map(item => prisma.menuItem.upsert({
      where: { id: item.id },
      update: {},
      create: item
    }))
  );
  console.log('Created menu items:', menuItems.length);

  // Create 20 inventory items
  const inventoryData = [
    { id: 'inv-beef', name: 'Ground Beef', category: 'MEAT', quantity: 25, unit: 'lbs', minQuantity: 10, maxQuantity: 50, costPerUnit: 5.99, supplier: 'Premium Meats Co', truckId: truck.id },
    { id: 'inv-chicken', name: 'Chicken Breast', category: 'MEAT', quantity: 15, unit: 'lbs', minQuantity: 8, maxQuantity: 30, costPerUnit: 4.99, supplier: 'Premium Meats Co', truckId: truck.id },
    { id: 'inv-pork', name: 'Pork Shoulder', category: 'MEAT', quantity: 12, unit: 'lbs', minQuantity: 5, maxQuantity: 25, costPerUnit: 4.49, supplier: 'Premium Meats Co', truckId: truck.id },
    { id: 'inv-fish', name: 'Cod Fillets', category: 'MEAT', quantity: 8, unit: 'lbs', minQuantity: 4, maxQuantity: 15, costPerUnit: 8.99, supplier: 'Fresh Catch Seafood', truckId: truck.id },
    { id: 'inv-buns', name: 'Burger Buns', category: 'DRY_GOODS', quantity: 48, unit: 'count', minQuantity: 24, maxQuantity: 96, costPerUnit: 0.35, supplier: 'Local Bakery', truckId: truck.id },
    { id: 'inv-tortillas', name: 'Flour Tortillas', category: 'DRY_GOODS', quantity: 100, unit: 'count', minQuantity: 50, maxQuantity: 200, costPerUnit: 0.15, supplier: 'Local Bakery', truckId: truck.id },
    { id: 'inv-corn-tortillas', name: 'Corn Tortillas', category: 'DRY_GOODS', quantity: 80, unit: 'count', minQuantity: 40, maxQuantity: 160, costPerUnit: 0.12, supplier: 'Local Bakery', truckId: truck.id },
    { id: 'inv-lettuce', name: 'Lettuce', category: 'PRODUCE', quantity: 5, unit: 'heads', minQuantity: 3, maxQuantity: 10, costPerUnit: 2.49, supplier: 'Fresh Farms', expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), truckId: truck.id },
    { id: 'inv-tomatoes', name: 'Tomatoes', category: 'PRODUCE', quantity: 10, unit: 'lbs', minQuantity: 5, maxQuantity: 20, costPerUnit: 1.99, supplier: 'Fresh Farms', expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), truckId: truck.id },
    { id: 'inv-onions', name: 'Onions', category: 'PRODUCE', quantity: 15, unit: 'lbs', minQuantity: 8, maxQuantity: 25, costPerUnit: 0.99, supplier: 'Fresh Farms', truckId: truck.id },
    { id: 'inv-cheese', name: 'American Cheese', category: 'DAIRY', quantity: 100, unit: 'slices', minQuantity: 50, maxQuantity: 200, costPerUnit: 0.15, supplier: 'Dairy Direct', truckId: truck.id },
    { id: 'inv-sour-cream', name: 'Sour Cream', category: 'DAIRY', quantity: 8, unit: 'containers', minQuantity: 4, maxQuantity: 12, costPerUnit: 2.99, supplier: 'Dairy Direct', expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), truckId: truck.id },
    { id: 'inv-cooking-oil', name: 'Vegetable Oil', category: 'DRY_GOODS', quantity: 5, unit: 'gallons', minQuantity: 2, maxQuantity: 8, costPerUnit: 8.99, supplier: 'Restaurant Supply Co', truckId: truck.id },
    { id: 'inv-napkins', name: 'Napkins', category: 'PACKAGING', quantity: 500, unit: 'count', minQuantity: 200, maxQuantity: 1000, costPerUnit: 0.02, supplier: 'Restaurant Supply Co', truckId: truck.id },
    { id: 'inv-containers', name: 'To-Go Containers', category: 'PACKAGING', quantity: 200, unit: 'count', minQuantity: 100, maxQuantity: 400, costPerUnit: 0.25, supplier: 'Restaurant Supply Co', truckId: truck.id },
    { id: 'inv-cups', name: 'Paper Cups (16oz)', category: 'PACKAGING', quantity: 300, unit: 'count', minQuantity: 150, maxQuantity: 500, costPerUnit: 0.08, supplier: 'Restaurant Supply Co', truckId: truck.id },
    { id: 'inv-salsa', name: 'House Salsa', category: 'CONDIMENTS', quantity: 10, unit: 'quarts', minQuantity: 4, maxQuantity: 16, costPerUnit: 3.50, supplier: 'In-House', truckId: truck.id },
    { id: 'inv-bbq-sauce', name: 'BBQ Sauce', category: 'CONDIMENTS', quantity: 6, unit: 'bottles', minQuantity: 3, maxQuantity: 10, costPerUnit: 4.99, supplier: 'Restaurant Supply Co', truckId: truck.id },
    { id: 'inv-propane', name: 'Propane Tank', category: 'OTHER', quantity: 2, unit: 'tanks', minQuantity: 1, maxQuantity: 4, costPerUnit: 45.00, supplier: 'Gas Supply Co', truckId: truck.id },
    { id: 'inv-ice', name: 'Bagged Ice', category: 'OTHER', quantity: 10, unit: 'bags', minQuantity: 5, maxQuantity: 20, costPerUnit: 2.50, supplier: 'Ice Depot', truckId: truck.id }
  ];

  const inventoryItems = await Promise.all(
    inventoryData.map(item => prisma.inventoryItem.upsert({
      where: { id: item.id },
      update: {},
      create: item
    }))
  );
  console.log('Created inventory items:', inventoryItems.length);

  // Create permits (using valid PermitType: HEALTH, BUSINESS, PARKING, FIRE, MOBILE_VENDOR, SPECIAL_EVENT)
  const permitData = [
    { id: 'permit-health', permitNumber: 'HTH-2024-001234', type: 'HEALTH', issuingAuthority: 'Austin Health Department', issueDate: new Date('2024-01-15'), expiryDate: new Date('2025-01-15'), cost: 350, status: 'ACTIVE', truckId: truck.id },
    { id: 'permit-business', permitNumber: 'BUS-2024-005678', type: 'BUSINESS', issuingAuthority: 'City of Austin', issueDate: new Date('2024-01-01'), expiryDate: new Date('2024-12-31'), cost: 250, status: 'ACTIVE', truckId: truck.id },
    { id: 'permit-mobile', permitNumber: 'MV-2024-009012', type: 'MOBILE_VENDOR', issuingAuthority: 'Texas Department of Licensing', issueDate: new Date('2024-02-01'), expiryDate: new Date('2025-02-01'), cost: 500, status: 'ACTIVE', truckId: truck.id },
    { id: 'permit-fire', permitNumber: 'FIRE-2024-003456', type: 'FIRE', issuingAuthority: 'Austin Fire Department', issueDate: new Date('2024-01-20'), expiryDate: new Date('2025-01-20'), cost: 150, status: 'ACTIVE', truckId: truck.id },
    { id: 'permit-parking-downtown', permitNumber: 'PKG-2024-007890', type: 'PARKING', issuingAuthority: 'City of Austin', issueDate: new Date('2024-03-01'), expiryDate: new Date('2024-08-31'), cost: 200, status: 'ACTIVE', notes: 'Downtown Square location only', truckId: truck.id },
    { id: 'permit-parking-tech', permitNumber: 'PKG-2024-007891', type: 'PARKING', issuingAuthority: 'Tech Park Management', issueDate: new Date('2024-02-15'), expiryDate: new Date('2025-02-15'), cost: 100, status: 'ACTIVE', notes: 'Tech Park Campus - Monday & Wednesday', truckId: truck.id },
    { id: 'permit-special-event-1', permitNumber: 'SPE-2024-112244', type: 'SPECIAL_EVENT', issuingAuthority: 'Austin Parks Dept', issueDate: new Date('2024-06-01'), expiryDate: new Date('2024-06-03'), cost: 300, status: 'ACTIVE', notes: 'Music Festival 2024', truckId: truck.id },
    { id: 'permit-special-event-2', permitNumber: 'SPE-2024-556688', type: 'SPECIAL_EVENT', issuingAuthority: 'Austin Events', issueDate: new Date('2024-07-04'), expiryDate: new Date('2024-07-04'), cost: 150, status: 'ACTIVE', notes: 'July 4th Festival', truckId: truck.id },
    { id: 'permit-expired', permitNumber: 'HTH-2023-999999', type: 'HEALTH', issuingAuthority: 'Austin Health Department', issueDate: new Date('2023-01-15'), expiryDate: new Date('2024-01-15'), cost: 325, status: 'EXPIRED', truckId: truck.id },
    { id: 'permit-renewal', permitNumber: 'BUS-2025-000001', type: 'BUSINESS', issuingAuthority: 'City of Austin', issueDate: new Date('2024-11-01'), expiryDate: new Date('2025-12-31'), cost: 275, status: 'PENDING', notes: 'Renewal application submitted', truckId: truck.id }
  ];

  const permits = await Promise.all(
    permitData.map(permit => prisma.permit.upsert({
      where: { id: permit.id },
      update: {},
      create: permit
    }))
  );
  console.log('Created permits:', permits.length);

  // Create 20 events
  const eventData = [
    { id: 'event-music-fest', name: 'Austin Music Festival', description: 'Annual music festival with 50,000+ attendees', startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000), venueAddress: 'Zilker Park, Austin TX', expectedAttendance: 50000, vendorFee: 1500, applicationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), status: 'UPCOMING' },
    { id: 'event-food-truck', name: 'Food Truck Friday', description: 'Weekly food truck gathering downtown', startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), venueAddress: 'Downtown Austin', expectedAttendance: 2000, vendorFee: 100, status: 'UPCOMING', locationId: locations[0].id },
    { id: 'event-beer-fest', name: 'Austin Craft Beer Festival', description: 'Local breweries and food trucks unite', startDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 46 * 24 * 60 * 60 * 1000), venueAddress: 'Auditorium Shores', expectedAttendance: 15000, vendorFee: 800, applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), status: 'UPCOMING' },
    { id: 'event-tech-lunch', name: 'Tech Campus Lunch Series', description: 'Weekly lunch service at tech companies', startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), venueAddress: 'Tech Park Campus', expectedAttendance: 500, vendorFee: 50, status: 'UPCOMING', locationId: locations[1].id },
    { id: 'event-farmers-sat', name: 'Saturday Farmers Market', description: 'Weekly farmers market with food vendors', startDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), venueAddress: '200 Market Plaza', expectedAttendance: 3000, vendorFee: 75, status: 'UPCOMING', locationId: locations[3].id },
    { id: 'event-marathon', name: 'Austin Marathon Food Zone', description: 'Feeding runners and spectators at the finish line', startDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), venueAddress: 'Congress Avenue', expectedAttendance: 25000, vendorFee: 500, applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), status: 'UPCOMING' },
    { id: 'event-movie-night', name: 'Outdoor Movie Night', description: 'Family movie screening in the park', startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), venueAddress: 'Mueller Lake Park', expectedAttendance: 800, vendorFee: 100, status: 'UPCOMING' },
    { id: 'event-5k-run', name: 'Charity 5K Run', description: 'Annual charity run with post-race celebration', startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), venueAddress: 'Lady Bird Lake Trail', expectedAttendance: 1500, vendorFee: 150, applicationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), status: 'UPCOMING' },
    { id: 'event-art-walk', name: 'First Thursday Art Walk', description: 'Monthly art gallery walk with street vendors', startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), venueAddress: 'South Congress Ave', expectedAttendance: 5000, vendorFee: 200, status: 'UPCOMING' },
    { id: 'event-car-show', name: 'Classic Car Show', description: 'Annual vintage car exhibition', startDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), venueAddress: 'Circuit of the Americas', expectedAttendance: 10000, vendorFee: 400, status: 'UPCOMING' },
    { id: 'event-pride', name: 'Austin Pride Festival', description: 'Annual LGBTQ+ pride celebration', startDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 91 * 24 * 60 * 60 * 1000), venueAddress: 'Fiesta Gardens', expectedAttendance: 35000, vendorFee: 700, applicationDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), status: 'UPCOMING' },
    { id: 'event-graduation', name: 'UT Graduation Weekend', description: 'University graduation celebration', startDate: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 51 * 24 * 60 * 60 * 1000), venueAddress: 'UT Campus', expectedAttendance: 20000, vendorFee: 600, status: 'UPCOMING', locationId: locations[4].id },
    { id: 'event-bbq-fest', name: 'Texas BBQ Festival', description: 'Celebration of Texas barbecue culture', startDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 76 * 24 * 60 * 60 * 1000), venueAddress: 'Travis County Expo Center', expectedAttendance: 40000, vendorFee: 1000, applicationDeadline: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000), status: 'UPCOMING' },
    { id: 'event-wellness', name: 'Wellness Festival', description: 'Health and wellness expo', startDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000), venueAddress: 'Palmer Events Center', expectedAttendance: 8000, vendorFee: 350, status: 'UPCOMING' },
    { id: 'event-halloween', name: 'Halloween Block Party', description: 'Annual Halloween street party', startDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), venueAddress: '6th Street', expectedAttendance: 50000, vendorFee: 800, applicationDeadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), status: 'UPCOMING' },
    { id: 'event-past-1', name: 'Spring Fling Festival', description: 'Community spring celebration', startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), venueAddress: 'Republic Square', expectedAttendance: 5000, vendorFee: 250, status: 'COMPLETED' },
    { id: 'event-past-2', name: 'Food Truck Rally', description: 'Monthly food truck meetup', startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), venueAddress: 'The Domain', expectedAttendance: 3000, vendorFee: 150, status: 'COMPLETED', locationId: locations[9].id },
    { id: 'event-past-3', name: 'SXSW Food Court', description: 'South by Southwest food vendor area', startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() - 53 * 24 * 60 * 60 * 1000), venueAddress: 'Downtown Austin', expectedAttendance: 100000, vendorFee: 2500, status: 'COMPLETED' },
    { id: 'event-cancelled', name: 'Summer Splash', description: 'Pool party event', startDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000), venueAddress: 'Barton Springs Pool', expectedAttendance: 2000, vendorFee: 200, status: 'CANCELLED' },
    { id: 'event-pending', name: 'Winter Holiday Market', description: 'Holiday shopping and food festival', startDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 182 * 24 * 60 * 60 * 1000), venueAddress: 'Long Center', expectedAttendance: 15000, vendorFee: 500, applicationDeadline: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000), status: 'UPCOMING' }
  ];

  const events = await Promise.all(
    eventData.map(event => prisma.event.upsert({
      where: { id: event.id },
      update: {
        name: event.name,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        venueAddress: event.venueAddress,
        expectedAttendance: event.expectedAttendance,
        vendorFee: event.vendorFee,
        applicationDeadline: event.applicationDeadline,
        status: event.status,
        locationId: event.locationId
      },
      create: event
    }))
  );
  console.log('Created events:', events.length);

  // Create 20 truck location schedules
  const truckLocationData = [];
  for (let i = 1; i <= 10; i++) {
    truckLocationData.push({
      id: `tl-future-${i}`,
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
      startTime: i % 2 === 0 ? '11:00' : '17:00',
      endTime: i % 2 === 0 ? '14:00' : '21:00',
      status: 'SCHEDULED',
      truckId: truck.id,
      locationId: locations[i % locations.length].id
    });
  }
  for (let i = 1; i <= 10; i++) {
    const revenue = 400 + Math.random() * 1200;
    const customers = Math.floor(30 + Math.random() * 100);
    truckLocationData.push({
      id: `tl-past-${i}`,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      startTime: i % 2 === 0 ? '11:00' : '17:00',
      endTime: i % 2 === 0 ? '14:00' : '21:00',
      status: 'COMPLETED',
      revenue: parseFloat(revenue.toFixed(2)),
      customerCount: customers,
      notes: i === 1 ? 'Great day! Sold out of burgers' : i === 3 ? 'Weather affected turnout' : null,
      truckId: truck.id,
      locationId: locations[(i + 5) % locations.length].id
    });
  }

  const truckLocations = await Promise.all(
    truckLocationData.map(tl => prisma.truckLocation.upsert({
      where: { id: tl.id },
      update: {
        date: tl.date,
        startTime: tl.startTime,
        endTime: tl.endTime,
        status: tl.status,
        revenue: tl.revenue,
        customerCount: tl.customerCount,
        notes: tl.notes
      },
      create: tl
    }))
  );
  console.log('Created truck locations:', truckLocations.length);

  // Create 20 social posts
  const socialPostData = [
    { id: 'post-1', platform: 'INSTAGRAM', content: 'Find us at Downtown Square today from 11 AM - 2 PM! Come try our new Korean BBQ Bowl! 🍚🔥', type: 'LOCATION_ANNOUNCEMENT', status: 'POSTED', postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), likes: 45, comments: 8, shares: 12, reach: 1250, truckId: truck.id },
    { id: 'post-2', platform: 'FACEBOOK', content: "Today's special: Loaded Nachos for only $10.99! Limited time offer! 🌮🧀", type: 'SPECIAL_PROMOTION', status: 'POSTED', postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), likes: 89, comments: 23, shares: 34, reach: 2100, truckId: truck.id },
    { id: 'post-3', platform: 'TWITTER', content: "Nothing beats a Classic Smash Burger on a sunny day! Where's your favorite spot to catch us? 🍔☀️", type: 'CUSTOMER_ENGAGEMENT', status: 'POSTED', postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), likes: 32, comments: 15, shares: 8, reach: 890, truckId: truck.id },
    { id: 'post-4', platform: 'INSTAGRAM', content: "We're at Tech Park Campus today! Perfect for your lunch break. See you there! 🚚💼", type: 'LOCATION_ANNOUNCEMENT', status: 'POSTED', postedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), likes: 67, comments: 12, shares: 20, reach: 1800, truckId: truck.id },
    { id: 'post-5', platform: 'FACEBOOK', content: 'Thank you all for an amazing weekend at the Farmers Market! Your support means everything to us! ❤️🙏', type: 'CUSTOMER_ENGAGEMENT', status: 'POSTED', postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), likes: 156, comments: 42, shares: 28, reach: 3200, truckId: truck.id },
    { id: 'post-6', platform: 'INSTAGRAM', content: 'Fresh churros coming off the fryer! The perfect way to end your meal 🍩✨', type: 'DAILY_MENU', status: 'POSTED', postedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), likes: 234, comments: 56, shares: 45, reach: 4500, truckId: truck.id },
    { id: 'post-7', platform: 'TWITTER', content: 'Rainy day? We got you covered at the Craft Brewery District! Pair our food with a cold one! 🌧️🍺', type: 'LOCATION_ANNOUNCEMENT', status: 'POSTED', postedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), likes: 28, comments: 9, shares: 5, reach: 650, truckId: truck.id },
    { id: 'post-8', platform: 'FACEBOOK', content: 'GIVEAWAY! Tag a friend who loves tacos for a chance to win a free meal! Winners announced Friday 🎉🌮', type: 'SPECIAL_PROMOTION', status: 'POSTED', postedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), likes: 312, comments: 189, shares: 134, reach: 8900, truckId: truck.id },
    { id: 'post-9', platform: 'INSTAGRAM', content: "Taco Tuesday is here! All tacos 2 for 1 today only! Don't miss out! 🌮🌮", type: 'SPECIAL_PROMOTION', status: 'POSTED', postedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), likes: 189, comments: 34, shares: 67, reach: 3800, truckId: truck.id },
    { id: 'post-10', platform: 'TWITTER', content: 'Our secret? Fresh ingredients every single day. No shortcuts, just great food. 🌿👨‍🍳', type: 'CUSTOMER_ENGAGEMENT', status: 'POSTED', postedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), likes: 45, comments: 12, shares: 18, reach: 1100, truckId: truck.id },
    { id: 'post-11', platform: 'INSTAGRAM', content: 'Weekend vibes at Zilker Park! Come find us near the main entrance 🌳🚚', type: 'LOCATION_ANNOUNCEMENT', status: 'POSTED', postedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000), likes: 98, comments: 21, shares: 33, reach: 2400, truckId: truck.id },
    { id: 'post-12', platform: 'FACEBOOK', content: 'Introducing our NEW Mediterranean Veggie Wrap! Perfect for our vegetarian friends 🥙💚', type: 'DAILY_MENU', status: 'POSTED', postedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), likes: 78, comments: 25, shares: 19, reach: 1900, truckId: truck.id },
    { id: 'post-13', platform: 'INSTAGRAM', content: 'Behind the scenes: Prepping 50 lbs of our famous bulgogi beef! 🥩🔪', type: 'CUSTOMER_ENGAGEMENT', status: 'POSTED', postedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000), likes: 145, comments: 28, shares: 41, reach: 3100, truckId: truck.id },
    { id: 'post-14', platform: 'TWITTER', content: 'Pro tip: Our Korean BBQ Bowl + Street Corn = the perfect combo 🍚🌽 What\'s your go-to order?', type: 'CUSTOMER_ENGAGEMENT', status: 'POSTED', postedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), likes: 56, comments: 34, shares: 12, reach: 1400, truckId: truck.id },
    { id: 'post-15', platform: 'FACEBOOK', content: 'Family Feast deal is back! Feed the whole crew for just $44.99 🍔🌮🍟', type: 'SPECIAL_PROMOTION', status: 'POSTED', postedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), likes: 167, comments: 45, shares: 78, reach: 4200, truckId: truck.id },
    { id: 'post-scheduled-1', platform: 'INSTAGRAM', content: "This weekend we're at the Austin Music Festival! Find us at the food court area 🎵🚚", type: 'LOCATION_ANNOUNCEMENT', status: 'SCHEDULED', scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), truckId: truck.id },
    { id: 'post-scheduled-2', platform: 'FACEBOOK', content: 'Flash sale this Friday: 20% off all orders over $25! Use code FRIDAY20 💰', type: 'SPECIAL_PROMOTION', status: 'SCHEDULED', scheduledFor: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), truckId: truck.id },
    { id: 'post-scheduled-3', platform: 'TWITTER', content: "Monday motivation: Start your week right with our breakfast burrito special! ☀️🌯", type: 'DAILY_MENU', status: 'SCHEDULED', scheduledFor: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), truckId: truck.id },
    { id: 'post-draft-1', platform: 'INSTAGRAM', content: 'Draft: New menu item coming soon...', type: 'DAILY_MENU', status: 'DRAFT', truckId: truck.id },
    { id: 'post-draft-2', platform: 'FACEBOOK', content: 'Draft: Customer appreciation week announcement', type: 'SPECIAL_PROMOTION', status: 'DRAFT', truckId: truck.id }
  ];

  const socialPosts = await Promise.all(
    socialPostData.map(post => prisma.socialPost.upsert({
      where: { id: post.id },
      update: {},
      create: post
    }))
  );
  console.log('Created social posts:', socialPosts.length);

  // Create 20 orders
  const orderData = [];
  for (let i = 1; i <= 20; i++) {
    const date = new Date(Date.now() - (i - 1) * 24 * 60 * 60 * 1000 - Math.random() * 8 * 60 * 60 * 1000);
    const itemCount = 1 + Math.floor(Math.random() * 4);
    const subtotal = 10 + Math.random() * 35;
    const tax = subtotal * 0.0825;
    const status = i <= 3 ? ['PENDING', 'PREPARING', 'READY'][i - 1] : 'PICKED_UP';

    orderData.push({
      id: `order-${i.toString().padStart(3, '0')}`,
      orderNumber: String(1000 + i),
      customerName: ['John Smith', 'Sarah Johnson', 'Mike Brown', 'Emily Davis', 'Chris Wilson', 'Lisa Anderson', 'David Martinez', 'Jennifer Taylor', 'Robert Thomas', 'Amanda White', 'James Moore', 'Michelle Jackson', 'Daniel Harris', 'Laura Martin', 'Kevin Lee', 'Nicole Garcia', 'Matthew Robinson', 'Ashley Clark', 'Joshua Lewis', 'Stephanie Walker'][i - 1],
      customerPhone: `555-${100 + i}-${1000 + Math.floor(Math.random() * 9000)}`,
      customerEmail: i % 3 === 0 ? `customer${i}@email.com` : null,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat((subtotal + tax).toFixed(2)),
      status: status,
      paymentMethod: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'APPLE_PAY'][Math.floor(Math.random() * 4)],
      paymentStatus: status === 'PICKED_UP' ? 'COMPLETED' : (i <= 3 ? 'PENDING' : 'COMPLETED'),
      notes: i === 5 ? 'No onions please' : i === 12 ? 'Extra spicy' : null,
      createdAt: date,
      truckId: truck.id
    });
  }

  const orders = await Promise.all(
    orderData.map(order => prisma.order.upsert({
      where: { id: order.id },
      update: {},
      create: order
    }))
  );
  console.log('Created orders:', orders.length);

  // Create order items for each order
  const orderItemsData = [];
  for (let i = 0; i < orders.length; i++) {
    const numItems = 1 + Math.floor(Math.random() * 3);
    for (let j = 0; j < numItems; j++) {
      const menuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
      const quantity = 1 + Math.floor(Math.random() * 2);
      orderItemsData.push({
        id: `oi-${i + 1}-${j + 1}`,
        quantity: quantity,
        unitPrice: menuItem.price,
        totalPrice: menuItem.price * quantity,
        specialInstructions: j === 0 && i % 5 === 0 ? 'No sauce' : null,
        orderId: orders[i].id,
        menuItemId: menuItem.id
      });
    }
  }

  const orderItems = await Promise.all(
    orderItemsData.map(item => prisma.orderItem.upsert({
      where: { id: item.id },
      update: {},
      create: item
    }))
  );
  console.log('Created order items:', orderItems.length);

  // Create 25 sales records
  const salesData = [];
  for (let i = 1; i <= 25; i++) {
    const date = new Date(Date.now() - (i - 1) * 24 * 60 * 60 * 1000);
    const baseAmount = 400 + Math.random() * 1000;
    const cashAmount = baseAmount * (0.3 + Math.random() * 0.2);
    const cardAmount = baseAmount - cashAmount;
    const transactions = 25 + Math.floor(Math.random() * 60);

    salesData.push({
      id: `sale-${i.toString().padStart(3, '0')}`,
      date: date,
      totalSales: parseFloat(baseAmount.toFixed(2)),
      cashSales: parseFloat(cashAmount.toFixed(2)),
      cardSales: parseFloat(cardAmount.toFixed(2)),
      transactionCount: transactions,
      averageTicket: parseFloat((baseAmount / transactions).toFixed(2)),
      notes: i === 1 ? 'Great lunch rush' : i === 5 ? 'Slow morning, busy evening' : i === 10 ? 'Festival day - record sales!' : null,
      truckId: truck.id
    });
  }

  const sales = await Promise.all(
    salesData.map(sale => prisma.sale.upsert({
      where: { id: sale.id },
      update: {},
      create: sale
    }))
  );
  console.log('Created sales:', sales.length);

  // Create 25 expense records
  const expenseCategories = ['FOOD_SUPPLIES', 'FUEL', 'MAINTENANCE', 'PERMITS', 'INSURANCE', 'MARKETING', 'PACKAGING', 'UTILITIES', 'LABOR', 'EQUIPMENT'];
  const expenseData = [
    { id: 'exp-001', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), amount: 245.50, category: 'FOOD_SUPPLIES', vendor: 'Premium Meats Co', description: 'Weekly meat order - beef and chicken', truckId: truck.id },
    { id: 'exp-002', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), amount: 89.00, category: 'FUEL', vendor: 'Shell Gas Station', description: 'Truck fuel', truckId: truck.id },
    { id: 'exp-003', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), amount: 156.75, category: 'FOOD_SUPPLIES', vendor: 'Fresh Farms', description: 'Produce order - lettuce, tomatoes, onions', truckId: truck.id },
    { id: 'exp-004', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), amount: 320.00, category: 'MAINTENANCE', vendor: 'Quick Fix Auto', description: 'Oil change and brake inspection', truckId: truck.id },
    { id: 'exp-005', date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), amount: 75.00, category: 'PERMITS', vendor: 'City of Austin', description: 'Weekly parking permit - downtown', truckId: truck.id },
    { id: 'exp-006', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), amount: 112.30, category: 'OTHER', vendor: 'Restaurant Supply Co', description: 'To-go containers and napkins', truckId: truck.id },
    { id: 'exp-007', date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), amount: 200.00, category: 'MARKETING', vendor: 'Instagram Ads', description: 'Social media advertising', truckId: truck.id },
    { id: 'exp-008', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), amount: 45.00, category: 'UTILITIES', vendor: 'Ice Depot', description: 'Bagged ice for the week', truckId: truck.id },
    { id: 'exp-009', date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), amount: 189.99, category: 'FOOD_SUPPLIES', vendor: 'Dairy Direct', description: 'Cheese and sour cream', truckId: truck.id },
    { id: 'exp-010', date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), amount: 95.00, category: 'FUEL', vendor: 'Shell Gas Station', description: 'Truck fuel', truckId: truck.id },
    { id: 'exp-011', date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), amount: 450.00, category: 'EQUIPMENT', vendor: 'Kitchen Supply Pro', description: 'New griddle top', truckId: truck.id },
    { id: 'exp-012', date: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000), amount: 67.50, category: 'FOOD_SUPPLIES', vendor: 'Local Bakery', description: 'Burger buns and tortillas', truckId: truck.id },
    { id: 'exp-013', date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), amount: 125.00, category: 'UTILITIES', vendor: 'Gas Supply Co', description: 'Propane refill x2', truckId: truck.id },
    { id: 'exp-014', date: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000), amount: 800.00, category: 'LABOR', vendor: 'Part-time Staff', description: 'Weekend helper wages', truckId: truck.id },
    { id: 'exp-015', date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), amount: 275.00, category: 'FOOD_SUPPLIES', vendor: 'Premium Meats Co', description: 'Weekly meat order', truckId: truck.id },
    { id: 'exp-016', date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), amount: 200.00, category: 'INSURANCE', vendor: 'State Farm', description: 'Monthly insurance premium', truckId: truck.id },
    { id: 'exp-017', date: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000), amount: 85.00, category: 'MAINTENANCE', vendor: 'Mobile Tire Service', description: 'Tire rotation and inspection', truckId: truck.id },
    { id: 'exp-018', date: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000), amount: 134.25, category: 'FOOD_SUPPLIES', vendor: 'Fresh Farms', description: 'Produce restock', truckId: truck.id },
    { id: 'exp-019', date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), amount: 350.00, category: 'PERMITS', vendor: 'Austin Health Dept', description: 'Health inspection fee', truckId: truck.id },
    { id: 'exp-020', date: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000), amount: 92.00, category: 'FUEL', vendor: 'Exxon', description: 'Truck fuel', truckId: truck.id },
    { id: 'exp-021', date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), amount: 156.00, category: 'OTHER', vendor: 'Eco Packaging Inc', description: 'Eco-friendly containers', truckId: truck.id },
    { id: 'exp-022', date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), amount: 299.99, category: 'EQUIPMENT', vendor: 'Amazon', description: 'New food warmers', truckId: truck.id },
    { id: 'exp-023', date: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000), amount: 750.00, category: 'LABOR', vendor: 'Part-time Staff', description: 'Festival weekend staff', truckId: truck.id },
    { id: 'exp-024', date: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000), amount: 178.50, category: 'FOOD_SUPPLIES', vendor: 'Sysco', description: 'Condiments and sauces', truckId: truck.id },
    { id: 'exp-025', date: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000), amount: 500.00, category: 'MARKETING', vendor: 'Local Radio', description: 'Radio advertisement spot', truckId: truck.id }
  ];

  const expenses = await Promise.all(
    expenseData.map(exp => prisma.expense.upsert({
      where: { id: exp.id },
      update: {},
      create: exp
    }))
  );
  console.log('Created expenses:', expenses.length);

  // Create prep lists
  const prepListData = [
    { id: 'prep-today', date: new Date(), status: 'IN_PROGRESS', notes: 'Big lunch crowd expected', truckId: truck.id },
    { id: 'prep-tomorrow', date: new Date(Date.now() + 24 * 60 * 60 * 1000), status: 'PENDING', truckId: truck.id },
    { id: 'prep-yesterday', date: new Date(Date.now() - 24 * 60 * 60 * 1000), status: 'COMPLETED', truckId: truck.id }
  ];

  const prepLists = await Promise.all(
    prepListData.map(pl => prisma.prepList.upsert({
      where: { id: pl.id },
      update: {},
      create: pl
    }))
  );

  // Create prep items
  const prepItemData = [
    { id: 'pi-1', name: 'Prep ground beef patties', quantity: 50, unit: 'patties', isCompleted: true, prepListId: prepLists[0].id },
    { id: 'pi-2', name: 'Slice onions and tomatoes', quantity: 10, unit: 'lbs', isCompleted: true, prepListId: prepLists[0].id },
    { id: 'pi-3', name: 'Make fresh salsa', quantity: 4, unit: 'quarts', isCompleted: false, prepListId: prepLists[0].id },
    { id: 'pi-4', name: 'Marinate bulgogi beef', quantity: 15, unit: 'lbs', isCompleted: false, prepListId: prepLists[0].id },
    { id: 'pi-5', name: 'Prep coleslaw', quantity: 8, unit: 'quarts', isCompleted: false, prepListId: prepLists[0].id },
    { id: 'pi-6', name: 'Make lemonade concentrate', quantity: 2, unit: 'gallons', isCompleted: false, prepListId: prepLists[0].id },
    { id: 'pi-7', name: 'Prep churro dough', quantity: 30, unit: 'servings', isCompleted: false, prepListId: prepLists[0].id },
    { id: 'pi-8', name: 'Prep ground beef patties', quantity: 40, unit: 'patties', isCompleted: false, prepListId: prepLists[1].id },
    { id: 'pi-9', name: 'Prep taco meat', quantity: 20, unit: 'lbs', isCompleted: false, prepListId: prepLists[1].id },
    { id: 'pi-10', name: 'All prep items', quantity: 0, unit: '', isCompleted: true, prepListId: prepLists[2].id }
  ];

  const prepItems = await Promise.all(
    prepItemData.map(pi => prisma.prepItem.upsert({
      where: { id: pi.id },
      update: {},
      create: pi
    }))
  );
  console.log('Created prep lists with', prepItems.length, 'items');

  // Create waste records (linked to inventory items)
  const wasteData = [
    { id: 'waste-1', quantity: 2, unit: 'lbs', reason: 'EXPIRED', cost: 11.98, notes: 'Left out too long', inventoryItemId: inventoryItems[0].id },
    { id: 'waste-2', quantity: 1, unit: 'heads', reason: 'SPOILED', cost: 2.49, inventoryItemId: inventoryItems[7].id },
    { id: 'waste-3', quantity: 6, unit: 'count', reason: 'OTHER', cost: 2.10, notes: 'Crushed in delivery', inventoryItemId: inventoryItems[4].id },
    { id: 'waste-4', quantity: 3, unit: 'lbs', reason: 'SPOILED', cost: 5.97, inventoryItemId: inventoryItems[8].id },
    { id: 'waste-5', quantity: 1, unit: 'container', reason: 'EXPIRED', cost: 2.99, inventoryItemId: inventoryItems[11].id },
    { id: 'waste-6', quantity: 1.5, unit: 'lbs', reason: 'OVERCOOKED', cost: 7.49, notes: 'Training new staff', inventoryItemId: inventoryItems[1].id },
    { id: 'waste-7', quantity: 10, unit: 'count', reason: 'OTHER', cost: 1.50, inventoryItemId: inventoryItems[5].id },
    { id: 'waste-8', quantity: 2, unit: 'lbs', reason: 'SPOILED', cost: 1.98, inventoryItemId: inventoryItems[9].id },
    { id: 'waste-9', quantity: 20, unit: 'slices', reason: 'EXPIRED', cost: 3.00, inventoryItemId: inventoryItems[10].id },
    { id: 'waste-10', quantity: 1, unit: 'lbs', reason: 'DROPPED', cost: 5.99, notes: 'Accident during prep', inventoryItemId: inventoryItems[0].id }
  ];

  const wasteRecords = await Promise.all(
    wasteData.map(w => prisma.wasteRecord.upsert({
      where: { id: w.id },
      update: {},
      create: w
    }))
  );
  console.log('Created waste records:', wasteRecords.length);

  // Create supply orders
  const supplyData = [
    { id: 'supply-1', name: 'Ground Beef', category: 'MEAT', quantity: 30, unit: 'lbs', unitCost: 5.99, totalCost: 179.70, supplier: 'Premium Meats Co', status: 'DELIVERED', orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), expectedDelivery: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), actualDelivery: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), truckId: truck.id },
    { id: 'supply-2', name: 'Produce Bundle', category: 'PRODUCE', quantity: 1, unit: 'order', unitCost: 89.50, totalCost: 89.50, supplier: 'Fresh Farms', status: 'DELIVERED', orderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), expectedDelivery: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), actualDelivery: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), truckId: truck.id },
    { id: 'supply-3', name: 'To-Go Containers', category: 'PACKAGING', quantity: 500, unit: 'count', unitCost: 0.25, totalCost: 125.00, supplier: 'Restaurant Supply Co', status: 'ORDERED', orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), expectedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), truckId: truck.id },
    { id: 'supply-4', name: 'Burger Buns', category: 'DRY_GOODS', quantity: 96, unit: 'count', unitCost: 0.35, totalCost: 33.60, supplier: 'Local Bakery', status: 'ORDERED', orderDate: new Date(), expectedDelivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), truckId: truck.id },
    { id: 'supply-5', name: 'Cheese Slices', category: 'DAIRY', quantity: 200, unit: 'slices', unitCost: 0.15, totalCost: 30.00, supplier: 'Dairy Direct', status: 'ORDERED', orderDate: new Date(), truckId: truck.id },
    { id: 'supply-6', name: 'Propane', category: 'OTHER', quantity: 2, unit: 'tanks', unitCost: 45.00, totalCost: 90.00, supplier: 'Gas Supply Co', status: 'ORDERED', orderDate: new Date(), truckId: truck.id }
  ];

  const supplies = await Promise.all(
    supplyData.map(s => prisma.supply.upsert({
      where: { id: s.id },
      update: {},
      create: s
    }))
  );
  console.log('Created supply orders:', supplies.length);

  // Create AI recommendations (valid types: LOCATION, MENU, DEMAND, ROUTE, WEATHER, SOCIAL_MEDIA, CUSTOMER_ENGAGEMENT)
  const aiRecommendationData = [
    { id: 'ai-1', type: 'LOCATION', title: 'High Traffic Location Alert', description: 'Based on historical data, Tech Park Campus shows 25% higher revenue on Wednesdays. Consider scheduling more Wednesday visits.', confidence: 0.85, truckId: truck.id },
    { id: 'ai-2', type: 'MENU', title: 'Menu Optimization', description: 'Korean BBQ Bowl has the highest profit margin (68%) among main dishes. Consider promoting it more prominently.', confidence: 0.92, truckId: truck.id },
    { id: 'ai-3', type: 'DEMAND', title: 'Weekend Demand Forecast', description: 'Expected 40% increase in traffic this weekend due to local events. Recommend increasing prep quantities for burgers and tacos.', confidence: 0.78, isActioned: true, truckId: truck.id },
    { id: 'ai-4', type: 'WEATHER', title: 'Weather Impact Alert', description: 'Rain expected Thursday. Historical data shows 30% drop in foot traffic during rain. Consider indoor location or reduced hours.', confidence: 0.88, truckId: truck.id },
    { id: 'ai-5', type: 'SOCIAL_MEDIA', title: 'Engagement Opportunity', description: 'Your last Instagram post about churros got 3x average engagement. Consider more dessert-focused content.', confidence: 0.75, isActioned: true, truckId: truck.id },
    { id: 'ai-6', type: 'DEMAND', title: 'Low Stock Alert', description: 'Ground beef inventory at 50% of typical weekly usage. Recommend reordering within 2 days.', confidence: 0.95, truckId: truck.id },
    { id: 'ai-7', type: 'LOCATION', title: 'New Location Suggestion', description: 'Mueller Community shows growing food truck demand with limited competition. Consider testing this location.', confidence: 0.72, truckId: truck.id },
    { id: 'ai-8', type: 'MENU', title: 'Underperforming Item', description: 'Fountain Soda sales have dropped 15% this month. Consider bundling with meals or adjusting pricing.', confidence: 0.68, isActioned: true, truckId: truck.id },
    { id: 'ai-9', type: 'DEMAND', title: 'Event Opportunity', description: 'Austin Music Festival approaching in 30 days. Historically your best revenue week. Start planning inventory now.', confidence: 0.91, truckId: truck.id },
    { id: 'ai-10', type: 'CUSTOMER_ENGAGEMENT', title: 'Customer Feedback Trend', description: 'Multiple positive mentions of "fresh ingredients" in recent reviews. Highlight this in marketing.', confidence: 0.82, isActioned: true, truckId: truck.id },
    { id: 'ai-11', type: 'ROUTE', title: 'Route Optimization', description: 'Switching order of Tuesday locations could save 20 minutes drive time and reduce fuel costs.', confidence: 0.79, truckId: truck.id },
    { id: 'ai-12', type: 'DEMAND', title: 'Waste Reduction Opportunity', description: 'Produce waste up 15% this week. Consider adjusting produce orders or prep quantities.', confidence: 0.85, truckId: truck.id },
    { id: 'ai-13', type: 'SOCIAL_MEDIA', title: 'Optimal Posting Time', description: 'Analysis shows highest engagement on Instagram between 11 AM - 12 PM. Schedule posts accordingly.', confidence: 0.88, isActioned: true, truckId: truck.id },
    { id: 'ai-14', type: 'WEATHER', title: 'Hot Weather Menu', description: 'High temperatures forecasted next week. Cold drinks and lighter items typically see 25% increase.', confidence: 0.76, truckId: truck.id },
    { id: 'ai-15', type: 'LOCATION', title: 'Competition Alert', description: 'New food truck spotted at Downtown Square on Fridays. Consider alternative days or locations.', confidence: 0.70, truckId: truck.id }
  ];

  const aiRecommendations = await Promise.all(
    aiRecommendationData.map(ai => prisma.aIRecommendation.upsert({
      where: { id: ai.id },
      update: {},
      create: ai
    }))
  );
  console.log('Created AI recommendations:', aiRecommendations.length);

  // Create notifications
  const notificationData = [
    { id: 'notif-1', type: 'ORDER', title: 'New Order Received', message: 'Order #1001 - $25.48 - John Smith', isRead: false, userId: user.id },
    { id: 'notif-2', type: 'INVENTORY', title: 'Low Stock Alert', message: 'Ground Beef is running low (25 lbs remaining)', isRead: false, userId: user.id },
    { id: 'notif-3', type: 'PERMIT', title: 'Permit Expiring Soon', message: 'Business permit expires in 30 days', isRead: true, userId: user.id },
    { id: 'notif-4', type: 'EVENT', title: 'Event Registration Approved', message: 'Your registration for Food Truck Friday has been approved', isRead: true, userId: user.id },
    { id: 'notif-5', type: 'AI', title: 'New AI Recommendation', message: 'Check out location suggestions for better revenue', isRead: false, userId: user.id },
    { id: 'notif-6', type: 'SOCIAL', title: 'Post Performance', message: 'Your recent post reached 3,200 people!', isRead: true, userId: user.id },
    { id: 'notif-7', type: 'ORDER', title: 'Large Order Incoming', message: 'Order #1015 - $54.99 - Family Feast order', isRead: false, userId: user.id },
    { id: 'notif-8', type: 'SYSTEM', title: 'Weekly Report Ready', message: 'Your weekly performance report is available', isRead: false, userId: user.id }
  ];

  const notifications = await Promise.all(
    notificationData.map(n => prisma.notification.upsert({
      where: { id: n.id },
      update: {},
      create: n
    }))
  );
  console.log('Created notifications:', notifications.length);

  // Create event registrations
  const eventRegistrations = await Promise.all([
    prisma.eventRegistration.upsert({
      where: { id: 'er-1' },
      update: {},
      create: {
        id: 'er-1',
        status: 'APPROVED',
        boothNumber: 'A1',
        truckId: truck.id,
        eventId: events[1].id
      }
    }),
    prisma.eventRegistration.upsert({
      where: { id: 'er-2' },
      update: {},
      create: {
        id: 'er-2',
        status: 'APPROVED',
        boothNumber: 'B3',
        truckId: truck.id,
        eventId: events[3].id
      }
    }),
    prisma.eventRegistration.upsert({
      where: { id: 'er-3' },
      update: {},
      create: {
        id: 'er-3',
        status: 'PENDING',
        truckId: truck.id,
        eventId: events[0].id
      }
    }),
    prisma.eventRegistration.upsert({
      where: { id: 'er-4' },
      update: {},
      create: {
        id: 'er-4',
        status: 'APPROVED',
        boothNumber: 'C2',
        truckId: truck.id,
        eventId: events[4].id
      }
    })
  ]);
  console.log('Created event registrations:', eventRegistrations.length);

  // ==================== NEW FEATURE SEED DATA ====================

  // Create GPS Live Locations for all trucks (so customer map shows multiple trucks)
  // Reset all to Austin, TX coordinates for consistent demo data
  const liveLocations = await Promise.all([
    prisma.truckLiveLocation.upsert({
      where: { truckId: truck.id },
      update: {
        latitude: 30.2672,
        longitude: -97.7431,
        heading: 45.0,
        speed: 0,
        isActive: true,
        lastUpdated: new Date()
      },
      create: {
        id: 'live-loc-1',
        latitude: 30.2672,
        longitude: -97.7431,
        heading: 45.0,
        speed: 0,
        isActive: true,
        truckId: truck.id
      }
    }),
    prisma.truckLiveLocation.upsert({
      where: { truckId: 'demo-truck-2' },
      update: {
        latitude: 30.2849,
        longitude: -97.7341,
        heading: 90.0,
        speed: 0,
        isActive: true,
        lastUpdated: new Date()
      },
      create: {
        id: 'live-loc-2',
        latitude: 30.2849,
        longitude: -97.7341,
        heading: 90.0,
        speed: 0,
        isActive: true,
        truckId: 'demo-truck-2'
      }
    }),
    prisma.truckLiveLocation.upsert({
      where: { truckId: 'demo-truck-3' },
      update: {
        latitude: 30.2500,
        longitude: -97.7500,
        heading: 180.0,
        speed: 0,
        isActive: true,
        lastUpdated: new Date()
      },
      create: {
        id: 'live-loc-3',
        latitude: 30.2500,
        longitude: -97.7500,
        heading: 180.0,
        speed: 0,
        isActive: true,
        truckId: 'demo-truck-3'
      }
    }),
    prisma.truckLiveLocation.upsert({
      where: { truckId: 'demo-truck-4' },
      update: {
        latitude: 30.2621,
        longitude: -97.7207,
        heading: 270.0,
        speed: 0,
        isActive: true,
        lastUpdated: new Date()
      },
      create: {
        id: 'live-loc-4',
        latitude: 30.2621,
        longitude: -97.7207,
        heading: 270.0,
        speed: 0,
        isActive: true,
        truckId: 'demo-truck-4'
      }
    }),
    prisma.truckLiveLocation.upsert({
      where: { truckId: 'demo-truck-5' },
      update: {
        latitude: 30.3944,
        longitude: -97.7252,
        heading: 0.0,
        speed: 0,
        isActive: false,
        lastUpdated: new Date()
      },
      create: {
        id: 'live-loc-5',
        latitude: 30.3944,
        longitude: -97.7252,
        heading: 0.0,
        speed: 0,
        isActive: false,  // One truck not broadcasting to show variety
        truckId: 'demo-truck-5'
      }
    })
  ]);
  console.log('Created live locations for trucks:', liveLocations.length);

  // Create 15 Location Subscriptions
  const subscriptionData = [];
  for (let i = 1; i <= 15; i++) {
    subscriptionData.push({
      id: `sub-${i}`,
      email: i % 2 === 0 ? `subscriber${i}@email.com` : null,
      phone: i % 2 === 1 ? `555-SUB-${1000 + i}` : null,
      pushToken: i % 3 === 0 ? `push-token-${i}` : null,
      radius: [1, 3, 5, 10][i % 4],
      latitude: 30.2672 + (Math.random() - 0.5) * 0.1,
      longitude: -97.7431 + (Math.random() - 0.5) * 0.1,
      isActive: i <= 12
    });
  }
  const subscriptions = await Promise.all(
    subscriptionData.map(s => prisma.locationSubscription.upsert({
      where: { id: s.id },
      update: {},
      create: s
    }))
  );
  console.log('Created location subscriptions:', subscriptions.length);

  // Create 15 Weather Cache entries
  const weatherConditions = ['Clear', 'Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Overcast'];
  const weatherData = [];
  for (let i = 0; i < 15; i++) {
    weatherData.push({
      id: `weather-${i + 1}`,
      latitude: 30.27,
      longitude: -97.74,
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
      temperature: 65 + Math.random() * 30,
      conditions: weatherConditions[i % weatherConditions.length],
      humidity: 40 + Math.floor(Math.random() * 40)
    });
  }
  const weatherCache = await Promise.all(
    weatherData.map(w => prisma.weatherCache.upsert({
      where: { id: w.id },
      update: {},
      create: w
    }))
  );
  console.log('Created weather cache entries:', weatherCache.length);

  // Create 15 Demand Predictions
  const demandPredictions = [];
  for (let i = 0; i < 15; i++) {
    const dayOffset = i % 7;
    demandPredictions.push({
      id: `demand-pred-${i + 1}`,
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
      dayOfWeek: dayOffset,
      hourStart: 11 + (i % 3) * 3,
      predictedCustomers: 50 + Math.floor(Math.random() * 100),
      predictedRevenue: 400 + Math.random() * 800,
      confidence: 0.7 + Math.random() * 0.25,
      weatherFactor: 0.8 + Math.random() * 0.4,
      truckId: truck.id,
      locationId: locations[i % locations.length].id
    });
  }
  const predictions = await Promise.all(
    demandPredictions.map(p => prisma.demandPrediction.upsert({
      where: { id: p.id },
      update: {},
      create: p
    }))
  );
  console.log('Created demand predictions:', predictions.length);

  // Create 15 Social Templates
  const templateTypes = ['LOCATION_ANNOUNCEMENT', 'DAILY_MENU', 'SPECIAL_PROMOTION', 'CUSTOMER_ENGAGEMENT', 'EVENT_ANNOUNCEMENT'];
  const socialTemplates = [
    { id: 'template-1', name: 'Location Arrival', type: 'LOCATION_ANNOUNCEMENT', template: 'Find {{truckName}} at {{locationName}}!\n\n{{date}}\n{{startTime}} - {{endTime}}\n{{address}}\n\nCome hungry!', platforms: ['INSTAGRAM', 'FACEBOOK'], isDefault: true },
    { id: 'template-2', name: 'Daily Menu Post', type: 'DAILY_MENU', template: "Today's specials from {{truckName}}!\n\nFeatured: {{specialItem}}\n\nFind us at {{locationName}}", platforms: ['INSTAGRAM'], isDefault: true },
    { id: 'template-3', name: 'Weekend Special', type: 'SPECIAL_PROMOTION', template: 'WEEKEND DEAL! {{truckName}} has something special for you!\n\nVisit us at {{locationName}} to grab yours!', platforms: ['FACEBOOK', 'TWITTER'], isDefault: false },
    { id: 'template-4', name: 'Event Announcement', type: 'EVENT_ANNOUNCEMENT', template: "We'll be at {{locationName}} this {{date}}!\n\n{{truckName}} is excited to serve you at this special event!", platforms: ['INSTAGRAM', 'FACEBOOK', 'TWITTER'], isDefault: true },
    { id: 'template-5', name: 'Customer Thanks', type: 'CUSTOMER_ENGAGEMENT', template: 'Thank you for visiting {{truckName}} today!\n\nWe love serving our amazing customers. See you next time!', platforms: ['INSTAGRAM'], isDefault: false },
    { id: 'template-6', name: 'Morning Greeting', type: 'CUSTOMER_ENGAGEMENT', template: 'Good morning! {{truckName}} is ready to serve you today at {{locationName}}!', platforms: ['TWITTER'], isDefault: false },
    { id: 'template-7', name: 'Lunch Rush Alert', type: 'LOCATION_ANNOUNCEMENT', template: 'Lunch time! {{truckName}} is serving at {{locationName}} until {{endTime}}. Beat the rush!', platforms: ['TWITTER', 'INSTAGRAM'], isDefault: false },
    { id: 'template-8', name: 'New Item Launch', type: 'DAILY_MENU', template: 'NEW ITEM ALERT! {{truckName}} is proud to introduce {{specialItem}}!\n\nTry it today at {{locationName}}!', platforms: ['INSTAGRAM', 'FACEBOOK'], isDefault: false },
    { id: 'template-9', name: 'Rainy Day Special', type: 'SPECIAL_PROMOTION', template: "Don't let the rain stop you! {{truckName}} has warm, delicious food waiting for you at {{locationName}}!", platforms: ['FACEBOOK'], isDefault: false },
    { id: 'template-10', name: 'Last Call', type: 'LOCATION_ANNOUNCEMENT', template: 'Last call! {{truckName}} is wrapping up at {{locationName}} in 30 minutes. Get your orders in!', platforms: ['TWITTER'], isDefault: false },
    { id: 'template-11', name: 'Festival Ready', type: 'EVENT_ANNOUNCEMENT', template: "Festival time! Find {{truckName}} at booth {{address}}. We're serving up our best dishes all day!", platforms: ['INSTAGRAM', 'FACEBOOK', 'TWITTER'], isDefault: false },
    { id: 'template-12', name: 'Weekly Schedule', type: 'CUSTOMER_ENGAGEMENT', template: "This week's schedule for {{truckName}}:\n\nCheck our profile for daily locations and times!", platforms: ['INSTAGRAM'], isDefault: false },
    { id: 'template-13', name: 'Catering Available', type: 'SPECIAL_PROMOTION', template: '{{truckName}} now offers catering! Book us for your next event. DM for details!', platforms: ['INSTAGRAM', 'FACEBOOK'], isDefault: false },
    { id: 'template-14', name: 'Happy Hour', type: 'SPECIAL_PROMOTION', template: 'Happy Hour at {{truckName}}! Special prices from 4-6 PM at {{locationName}}!', platforms: ['TWITTER', 'FACEBOOK'], isDefault: false },
    { id: 'template-15', name: 'Family Special', type: 'SPECIAL_PROMOTION', template: 'Family dinner made easy! {{truckName}} Family Feast feeds 4 for one great price. Available at {{locationName}}!', platforms: ['FACEBOOK'], isDefault: false }
  ];
  const templates = await Promise.all(
    socialTemplates.map(t => prisma.socialTemplate.upsert({
      where: { id: t.id },
      update: {},
      create: { ...t, truckId: truck.id }
    }))
  );
  console.log('Created social templates:', templates.length);

  // Create 15 Auto Post Rules
  const autoPostRules = [
    { id: 'rule-1', triggerType: 'ARRIVAL_AT_LOCATION', platforms: ['INSTAGRAM', 'TWITTER'], templateId: templates[0].id, delayMinutes: 0, isActive: true },
    { id: 'rule-2', triggerType: 'ARRIVAL_AT_LOCATION', platforms: ['FACEBOOK'], templateId: templates[0].id, delayMinutes: 5, isActive: true },
    { id: 'rule-3', triggerType: 'BOOKING_CONFIRMED', platforms: ['INSTAGRAM'], templateId: templates[3].id, delayMinutes: 0, isActive: true },
    { id: 'rule-4', triggerType: 'DAILY_SCHEDULE', platforms: ['TWITTER'], templateId: templates[5].id, delayMinutes: 0, isActive: true },
    { id: 'rule-5', triggerType: 'ARRIVAL_AT_LOCATION', platforms: ['TWITTER'], templateId: templates[6].id, delayMinutes: 0, isActive: false },
    { id: 'rule-6', triggerType: 'BOOKING_CONFIRMED', platforms: ['FACEBOOK', 'INSTAGRAM'], templateId: templates[10].id, delayMinutes: 10, isActive: true },
    { id: 'rule-7', triggerType: 'DAILY_SCHEDULE', platforms: ['INSTAGRAM'], templateId: templates[11].id, delayMinutes: 0, isActive: true },
    { id: 'rule-8', triggerType: 'ARRIVAL_AT_LOCATION', platforms: ['FACEBOOK'], templateId: templates[9].id, delayMinutes: 150, isActive: false },
    { id: 'rule-9', triggerType: 'BOOKING_CONFIRMED', platforms: ['TWITTER'], templateId: null, delayMinutes: 0, isActive: true },
    { id: 'rule-10', triggerType: 'DAILY_SCHEDULE', platforms: ['FACEBOOK'], templateId: templates[1].id, delayMinutes: 0, isActive: false },
    { id: 'rule-11', triggerType: 'ARRIVAL_AT_LOCATION', platforms: ['INSTAGRAM', 'FACEBOOK', 'TWITTER'], templateId: templates[0].id, delayMinutes: 0, isActive: true },
    { id: 'rule-12', triggerType: 'BOOKING_CONFIRMED', platforms: ['INSTAGRAM'], templateId: templates[4].id, delayMinutes: 30, isActive: true },
    { id: 'rule-13', triggerType: 'DAILY_SCHEDULE', platforms: ['TWITTER', 'FACEBOOK'], templateId: null, delayMinutes: 0, isActive: false },
    { id: 'rule-14', triggerType: 'ARRIVAL_AT_LOCATION', platforms: ['FACEBOOK'], templateId: templates[2].id, delayMinutes: 60, isActive: true },
    { id: 'rule-15', triggerType: 'BOOKING_CONFIRMED', platforms: ['INSTAGRAM', 'TWITTER'], templateId: templates[3].id, delayMinutes: 15, isActive: true }
  ];
  const rules = await Promise.all(
    autoPostRules.map(r => prisma.autoPostRule.upsert({
      where: { id: r.id },
      update: {},
      create: { ...r, truckId: truck.id }
    }))
  );
  console.log('Created auto post rules:', rules.length);

  // Create 4 Social Accounts (one per platform)
  const socialAccounts = [
    { id: 'account-ig', platform: 'INSTAGRAM', accountId: 'ig_tastywheels', accountName: '@TastyWheelsATX', accessToken: 'mock_ig_token', refreshToken: 'mock_ig_refresh', tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), isConnected: true },
    { id: 'account-fb', platform: 'FACEBOOK', accountId: 'fb_tastywheels', accountName: 'Tasty Wheels Food Truck', accessToken: 'mock_fb_token', refreshToken: 'mock_fb_refresh', tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), isConnected: true },
    { id: 'account-tw', platform: 'TWITTER', accountId: 'tw_tastywheels', accountName: '@TastyWheelsATX', accessToken: 'mock_tw_token', refreshToken: null, tokenExpiry: null, isConnected: true },
    { id: 'account-tt', platform: 'TIKTOK', accountId: 'tt_tastywheels', accountName: '@tastywheels', accessToken: 'mock_tt_token', refreshToken: 'mock_tt_refresh', tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), isConnected: false }
  ];
  const accounts = await Promise.all(
    socialAccounts.map(a => prisma.socialAccount.upsert({
      where: { id: a.id },
      update: {},
      create: { ...a, truckId: truck.id }
    }))
  );
  console.log('Created social accounts:', accounts.length);

  // Create Pre-Order Settings for truck
  const preOrderSettings = await prisma.preOrderSettings.upsert({
    where: { truckId: truck.id },
    update: {
      advanceBookingHours: 168,  // 1 week advance booking
      isEnabled: true
    },
    create: {
      id: 'pos-1',
      defaultSlotDuration: 15,
      maxOrdersPerSlot: 5,
      advanceBookingHours: 168,  // 1 week advance booking
      cutoffMinutes: 30,
      autoGenerateSlots: true,
      isEnabled: true,
      truckId: truck.id
    }
  });
  console.log('Created pre-order settings');

  // Create 20 Pre-Order Windows for upcoming truck locations
  const preOrderWindows = [];
  const futureLocations = truckLocations.filter(tl => tl.status === 'SCHEDULED');
  for (let i = 0; i < futureLocations.length && preOrderWindows.length < 20; i++) {
    const tl = futureLocations[i];
    const slots = ['11:00', '11:15', '11:30', '11:45', '12:00', '12:15', '12:30', '12:45', '13:00', '13:15'];
    for (let j = 0; j < slots.length && preOrderWindows.length < 20; j++) {
      const slotStart = slots[j];
      const [h, m] = slotStart.split(':').map(Number);
      const slotEnd = `${h}:${(m + 15).toString().padStart(2, '0')}`.replace(':60', ':00');
      preOrderWindows.push({
        id: `pow-${i + 1}-${j + 1}`,
        date: tl.date,
        slotStart,
        slotEnd: slotEnd === `${h}:00` ? `${h + 1}:00` : slotEnd,
        maxOrders: 5,
        currentOrders: Math.floor(Math.random() * 2),
        isAvailable: true,  // Make all available for demo
        truckLocationId: tl.id
      });
    }
  }
  const windows = await Promise.all(
    preOrderWindows.slice(0, 20).map(w => prisma.preOrderWindow.upsert({
      where: { id: w.id },
      update: {
        date: w.date,
        slotStart: w.slotStart,
        slotEnd: w.slotEnd,
        isAvailable: true,
        currentOrders: w.currentOrders
      },
      create: w
    }))
  );
  console.log('Created pre-order windows:', windows.length);

  // Create 15 Event Booths for first 3 events
  const boothSizes = ['SMALL', 'STANDARD', 'LARGE', 'PREMIUM'];
  const eventBooths = [];
  for (let e = 0; e < 3; e++) {
    for (let b = 1; b <= 5; b++) {
      const boothNum = `${String.fromCharCode(65 + e)}${b}`;
      eventBooths.push({
        id: `booth-${e + 1}-${b}`,
        boothNumber: boothNum,
        location: ['Front Row', 'Center', 'Back Row'][e],
        size: boothSizes[(e + b) % 4],
        price: 100 + (e * 50) + (b * 25),
        amenities: b === 1 ? ['Electricity', 'Water'] : b === 5 ? ['Electricity', 'Water', 'Tent'] : ['Electricity'],
        isAvailable: b > 2,
        eventId: events[e].id
      });
    }
  }
  const booths = await Promise.all(
    eventBooths.map(b => prisma.eventBooth.upsert({
      where: { id: b.id },
      update: {},
      create: b
    }))
  );
  console.log('Created event booths:', booths.length);

  // Create 20 Event Timeline items
  const timelineTypes = ['APPLICATION_DEADLINE', 'PAYMENT_DUE', 'DOCUMENT_SUBMISSION', 'SETUP_TIME', 'EVENT_START', 'EVENT_END', 'CUSTOM'];
  const eventTimelines = [];
  for (let i = 0; i < 20; i++) {
    const eventIndex = i % 5;
    const daysOffset = [-7, -3, -1, 0, 0, 1, 3][i % 7];
    eventTimelines.push({
      id: `timeline-${i + 1}`,
      title: [
        'Submit Application',
        'Pay Vendor Fee',
        'Upload Insurance Certificate',
        'Booth Setup (2 hours before)',
        'Event Begins',
        'Event Ends',
        'Review Follow-up',
        'Submit Final Invoice',
        'Equipment Check',
        'Staff Briefing',
        'Menu Submission',
        'Health Certificate Due',
        'Parking Pass Pickup',
        'Load-in Time',
        'Tear Down Complete',
        'Post-Event Survey',
        'Social Media Post',
        'Inventory Prep',
        'Route Planning',
        'Final Confirmation'
      ][i],
      description: i % 3 === 0 ? 'Important deadline - don\'t miss!' : null,
      dueDate: new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000 + i * 2 * 60 * 60 * 1000),
      type: timelineTypes[i % timelineTypes.length],
      isCompleted: i < 5,
      completedAt: i < 5 ? new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000) : null,
      eventId: events[eventIndex].id,
      registrationId: i < 4 ? eventRegistrations[i % eventRegistrations.length].id : null
    });
  }
  const timelines = await Promise.all(
    eventTimelines.map(t => prisma.eventTimeline.upsert({
      where: { id: t.id },
      update: {},
      create: t
    }))
  );
  console.log('Created event timelines:', timelines.length);

  // Create 20 Location Analytics records (for past truck locations)
  const locationAnalytics = [];
  const pastLocations = truckLocations.filter(tl => tl.status === 'COMPLETED');
  for (let i = 0; i < Math.min(pastLocations.length, 20); i++) {
    const tl = pastLocations[i];
    const revenue = tl.revenue || 500 + Math.random() * 1000;
    const customers = tl.customerCount || 30 + Math.floor(Math.random() * 70);
    const orders = Math.floor(customers * 0.8);
    const hours = 4 + Math.random() * 4;

    locationAnalytics.push({
      id: `loc-analytics-${i + 1}`,
      date: tl.date,
      revenue: parseFloat(revenue.toFixed(2)),
      expenses: parseFloat((revenue * 0.35).toFixed(2)),
      customerCount: customers,
      orderCount: orders,
      averageOrderValue: parseFloat((revenue / orders).toFixed(2)),
      peakHour: 12 + Math.floor(Math.random() * 3),
      topSellingItems: JSON.stringify(['Classic Smash Burger', 'Street Tacos', 'Korean BBQ Bowl'].slice(0, 2 + Math.floor(Math.random() * 2))),
      weatherCondition: weatherConditions[i % weatherConditions.length],
      operatingHours: parseFloat(hours.toFixed(1)),
      revenuePerHour: parseFloat((revenue / hours).toFixed(2)),
      revenuePerCustomer: parseFloat((revenue / customers).toFixed(2)),
      truckId: truck.id,
      locationId: tl.locationId
    });
  }
  const analytics = await Promise.all(
    locationAnalytics.map(a => prisma.locationAnalytics.upsert({
      where: { id: a.id },
      update: {
        date: a.date,
        revenue: a.revenue,
        expenses: a.expenses,
        customerCount: a.customerCount,
        orderCount: a.orderCount,
        averageOrderValue: a.averageOrderValue,
        peakHour: a.peakHour,
        operatingHours: a.operatingHours,
        revenuePerHour: a.revenuePerHour,
        revenuePerCustomer: a.revenuePerCustomer
      },
      create: a
    }))
  );
  console.log('Created location analytics:', analytics.length);

  // Create 15 Location Goals
  const goalPeriods = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'];
  const locationGoals = [];
  for (let i = 0; i < 15; i++) {
    const period = goalPeriods[i % 4];
    const periodDays = { DAILY: 1, WEEKLY: 7, MONTHLY: 30, QUARTERLY: 90 }[period];

    locationGoals.push({
      id: `goal-${i + 1}`,
      targetRevenue: [500, 3500, 15000, 45000][i % 4],
      targetCustomers: [50, 350, 1500, 4500][i % 4],
      period,
      startDate: new Date(Date.now() - (i % 3) * periodDays * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + (periodDays - (i % 3) * periodDays) * 24 * 60 * 60 * 1000),
      truckId: truck.id,
      locationId: locations[i % locations.length].id
    });
  }
  const goals = await Promise.all(
    locationGoals.map(g => prisma.locationGoal.upsert({
      where: { id: g.id },
      update: {
        targetRevenue: g.targetRevenue,
        targetCustomers: g.targetCustomers,
        period: g.period,
        startDate: g.startDate,
        endDate: g.endDate
      },
      create: g
    }))
  );
  console.log('Created location goals:', goals.length);

  console.log('\n========================================');
  console.log('Seeding completed successfully!');
  console.log('========================================');
  console.log('\nDemo Account:');
  console.log('Email: demo@foodtruck.com');
  console.log('Password: password123');
  console.log('\nData Summary:');
  console.log(`- Locations: ${locations.length}`);
  console.log(`- Menu Items: ${menuItems.length}`);
  console.log(`- Inventory Items: ${inventoryItems.length}`);
  console.log(`- Permits: ${permits.length}`);
  console.log(`- Events: ${events.length}`);
  console.log(`- Truck Schedules: ${truckLocations.length}`);
  console.log(`- Social Posts: ${socialPosts.length}`);
  console.log(`- Orders: ${orders.length}`);
  console.log(`- Sales Records: ${sales.length}`);
  console.log(`- Expenses: ${expenses.length}`);
  console.log(`- AI Recommendations: ${aiRecommendations.length}`);
  console.log('\n--- NEW FEATURES DATA ---');
  console.log(`- Location Subscriptions: ${subscriptions.length}`);
  console.log(`- Weather Cache: ${weatherCache.length}`);
  console.log(`- Demand Predictions: ${predictions.length}`);
  console.log(`- Social Templates: ${templates.length}`);
  console.log(`- Auto Post Rules: ${rules.length}`);
  console.log(`- Social Accounts: ${accounts.length}`);
  console.log(`- Pre-Order Windows: ${windows.length}`);
  console.log(`- Event Booths: ${booths.length}`);
  console.log(`- Event Timelines: ${timelines.length}`);
  console.log(`- Location Analytics: ${analytics.length}`);
  console.log(`- Location Goals: ${goals.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
