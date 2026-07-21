const prisma = require('../lib/prisma');

// Generate time slots for a truck location
async function generateTimeSlots(truckLocationId, settings = {}) {
  const truckLocation = await prisma.truckLocation.findUnique({
    where: { id: truckLocationId },
    include: { truck: { include: { preOrderSettings: true } } }
  });

  if (!truckLocation) {
    throw new Error('Truck location not found');
  }

  const config = truckLocation.truck.preOrderSettings || settings;
  const slotDuration = config.defaultSlotDuration || 15;
  const maxOrders = config.maxOrdersPerSlot || 5;

  // Parse start and end times
  const [startHour, startMin] = truckLocation.startTime.split(':').map(Number);
  const [endHour, endMin] = truckLocation.endTime.split(':').map(Number);

  const slots = [];
  let currentHour = startHour;
  let currentMin = startMin;

  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    const slotStart = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

    // Calculate end time
    let endSlotMin = currentMin + slotDuration;
    let endSlotHour = currentHour;
    if (endSlotMin >= 60) {
      endSlotHour += Math.floor(endSlotMin / 60);
      endSlotMin = endSlotMin % 60;
    }

    // Don't create slot if it goes past end time
    if (endSlotHour > endHour || (endSlotHour === endHour && endSlotMin > endMin)) {
      break;
    }

    const slotEnd = `${String(endSlotHour).padStart(2, '0')}:${String(endSlotMin).padStart(2, '0')}`;

    slots.push({
      date: truckLocation.date,
      slotStart,
      slotEnd,
      maxOrders,
      currentOrders: 0,
      isAvailable: true,
      truckLocationId
    });

    // Move to next slot
    currentMin += slotDuration;
    if (currentMin >= 60) {
      currentHour += Math.floor(currentMin / 60);
      currentMin = currentMin % 60;
    }
  }

  // Create slots in database (upsert to avoid duplicates)
  const createdSlots = [];
  for (const slot of slots) {
    const created = await prisma.preOrderWindow.upsert({
      where: {
        truckLocationId_date_slotStart: {
          truckLocationId: slot.truckLocationId,
          date: slot.date,
          slotStart: slot.slotStart
        }
      },
      update: {},
      create: slot
    });
    createdSlots.push(created);
  }

  return createdSlots;
}

// Get available slots for a truck location
async function getAvailableSlots(truckLocationId, includeAll = false) {
  const where = { truckLocationId };
  if (!includeAll) {
    where.isAvailable = true;
    where.date = { gte: new Date() };
  }

  const slots = await prisma.preOrderWindow.findMany({
    where,
    orderBy: [{ date: 'asc' }, { slotStart: 'asc' }],
    include: {
      truckLocation: {
        include: {
          location: true,
          truck: true
        }
      }
    }
  });

  return slots.map(slot => ({
    ...slot,
    availableSpots: slot.maxOrders - slot.currentOrders,
    isFull: slot.currentOrders >= slot.maxOrders
  }));
}

// Get slots by truck for a date range
async function getSlotsByTruck(truckId, params = {}) {
  const { startDate, endDate, truckLocationId } = params;

  const where = {
    truckLocation: { truckId }
  };

  if (truckLocationId) {
    where.truckLocationId = truckLocationId;
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  return prisma.preOrderWindow.findMany({
    where,
    orderBy: [{ date: 'asc' }, { slotStart: 'asc' }],
    include: {
      truckLocation: {
        include: { location: true }
      },
      orders: {
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          status: true
        }
      }
    }
  });
}

// Reserve a slot for an order
async function reserveSlot(slotId) {
  const slot = await prisma.preOrderWindow.findUnique({
    where: { id: slotId }
  });

  if (!slot) {
    throw new Error('Slot not found');
  }

  if (slot.currentOrders >= slot.maxOrders) {
    throw new Error('Slot is full');
  }

  if (!slot.isAvailable) {
    throw new Error('Slot is not available');
  }

  return prisma.preOrderWindow.update({
    where: { id: slotId },
    data: {
      currentOrders: slot.currentOrders + 1,
      isAvailable: slot.currentOrders + 1 < slot.maxOrders
    }
  });
}

// Release a slot reservation
async function releaseSlot(slotId) {
  const slot = await prisma.preOrderWindow.findUnique({
    where: { id: slotId }
  });

  if (!slot) return null;

  return prisma.preOrderWindow.update({
    where: { id: slotId },
    data: {
      currentOrders: Math.max(0, slot.currentOrders - 1),
      isAvailable: true
    }
  });
}

// Get or create pre-order settings for a truck
async function getSettings(truckId) {
  let settings = await prisma.preOrderSettings.findUnique({
    where: { truckId }
  });

  if (!settings) {
    settings = await prisma.preOrderSettings.create({
      data: {
        truckId,
        defaultSlotDuration: 15,
        maxOrdersPerSlot: 5,
        advanceBookingHours: 24,
        cutoffMinutes: 30,
        autoGenerateSlots: true,
        isEnabled: true
      }
    });
  }

  return settings;
}

// Update pre-order settings
async function updateSettings(truckId, data) {
  return prisma.preOrderSettings.upsert({
    where: { truckId },
    update: data,
    create: {
      truckId,
      ...data
    }
  });
}

// Check if pre-order is allowed based on settings
async function canPlacePreOrder(truckId, slotId) {
  const settings = await getSettings(truckId);

  if (!settings.isEnabled) {
    return { allowed: false, reason: 'Pre-orders are disabled for this truck' };
  }

  const slot = await prisma.preOrderWindow.findUnique({
    where: { id: slotId },
    include: { truckLocation: true }
  });

  if (!slot) {
    return { allowed: false, reason: 'Time slot not found' };
  }

  if (!slot.isAvailable) {
    return { allowed: false, reason: 'Time slot is not available' };
  }

  if (slot.currentOrders >= slot.maxOrders) {
    return { allowed: false, reason: 'Time slot is full' };
  }

  // Check advance booking hours
  const slotDateTime = new Date(slot.date);
  const [hours, minutes] = slot.slotStart.split(':').map(Number);
  slotDateTime.setHours(hours, minutes, 0, 0);

  const now = new Date();
  const hoursUntilSlot = (slotDateTime - now) / (1000 * 60 * 60);

  if (hoursUntilSlot < settings.cutoffMinutes / 60) {
    return { allowed: false, reason: 'Too close to pickup time' };
  }

  if (hoursUntilSlot > settings.advanceBookingHours) {
    return { allowed: false, reason: 'Too far in advance' };
  }

  return { allowed: true };
}

// Get public slots for customer ordering
async function getPublicSlots(truckId, params = {}) {
  const { date, locationId } = params;
  const settings = await getSettings(truckId);

  if (!settings.isEnabled) {
    return [];
  }

  const now = new Date();
  const cutoffTime = new Date(now.getTime() + settings.cutoffMinutes * 60 * 1000);

  const where = {
    truckLocation: { truckId },
    isAvailable: true,
    date: { gte: new Date(now.setHours(0, 0, 0, 0)) }
  };

  if (date) {
    const targetDate = new Date(date);
    where.date = {
      gte: new Date(targetDate.setHours(0, 0, 0, 0)),
      lte: new Date(targetDate.setHours(23, 59, 59, 999))
    };
  }

  if (locationId) {
    where.truckLocation = { ...where.truckLocation, locationId };
  }

  const slots = await prisma.preOrderWindow.findMany({
    where,
    orderBy: [{ date: 'asc' }, { slotStart: 'asc' }],
    include: {
      truckLocation: {
        include: {
          location: {
            select: { id: true, name: true, address: true, city: true }
          },
          truck: {
            select: { id: true, name: true, cuisineType: true, logo: true }
          }
        }
      }
    }
  });

  // Filter out slots past cutoff time
  return slots.filter(slot => {
    const slotDateTime = new Date(slot.date);
    const [hours, minutes] = slot.slotStart.split(':').map(Number);
    slotDateTime.setHours(hours, minutes, 0, 0);
    return slotDateTime > cutoffTime && slot.currentOrders < slot.maxOrders;
  }).map(slot => ({
    id: slot.id,
    date: slot.date,
    slotStart: slot.slotStart,
    slotEnd: slot.slotEnd,
    availableSpots: slot.maxOrders - slot.currentOrders,
    location: slot.truckLocation.location,
    truck: slot.truckLocation.truck
  }));
}

module.exports = {
  generateTimeSlots,
  getAvailableSlots,
  getSlotsByTruck,
  reserveSlot,
  releaseSlot,
  getSettings,
  updateSettings,
  canPlacePreOrder,
  getPublicSlots
};
