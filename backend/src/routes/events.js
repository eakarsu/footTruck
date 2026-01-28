const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all events
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, upcoming } = req.query;

    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (upcoming === 'true') {
      whereClause.startDate = {
        gte: new Date()
      };
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        location: true,
        registrations: {
          include: { truck: true }
        }
      },
      orderBy: { startDate: 'asc' }
    });

    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Get calendar view data (MUST be before /:id route)
router.get('/calendar', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, truckId } = req.query;

    const whereClause = {};

    if (startDate && endDate) {
      whereClause.OR = [
        {
          startDate: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        {
          endDate: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      ];
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        location: true,
        registrations: truckId ? {
          where: { truckId }
        } : true
      },
      orderBy: { startDate: 'asc' }
    });

    // Transform for calendar view
    const calendarEvents = events.map(event => ({
      id: event.id,
      title: event.name,
      start: event.startDate,
      end: event.endDate,
      allDay: true,
      status: event.status,
      location: event.location?.name || event.venueAddress,
      vendorFee: event.vendorFee,
      expectedAttendance: event.expectedAttendance,
      isRegistered: truckId ? event.registrations.length > 0 : false,
      registrationStatus: truckId && event.registrations.length > 0
        ? event.registrations[0].status
        : null,
      color: event.status === 'UPCOMING' ? '#3b82f6' :
             event.status === 'ONGOING' ? '#22c55e' : '#9ca3af'
    }));

    res.json(calendarEvents);
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({ error: 'Failed to get calendar data' });
  }
});

// Get single event
router.get('/:id', authenticate, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        location: true,
        registrations: {
          include: { truck: true }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to get event' });
  }
});

// Create event
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      name, description, startDate, endDate, locationId,
      venueAddress, expectedAttendance, vendorFee, applicationDeadline
    } = req.body;

    const event = await prisma.event.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        locationId,
        venueAddress,
        expectedAttendance: expectedAttendance ? parseInt(expectedAttendance) : null,
        vendorFee: vendorFee ? parseFloat(vendorFee) : null,
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
        status: 'UPCOMING'
      },
      include: { location: true }
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      name, description, startDate, endDate, locationId,
      venueAddress, expectedAttendance, vendorFee, applicationDeadline, status
    } = req.body;

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        locationId,
        venueAddress,
        expectedAttendance: expectedAttendance ? parseInt(expectedAttendance) : null,
        vendorFee: vendorFee ? parseFloat(vendorFee) : null,
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
        status
      },
      include: { location: true }
    });

    res.json(event);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.event.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// ==================== EVENT REGISTRATIONS ====================

// Get truck's event registrations
router.get('/truck/:truckId/registrations', authenticate, async (req, res) => {
  try {
    const { status } = req.query;

    const whereClause = { truckId: req.params.truckId };

    if (status) {
      whereClause.status = status;
    }

    const registrations = await prisma.eventRegistration.findMany({
      where: whereClause,
      include: {
        event: {
          include: { location: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(registrations);
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({ error: 'Failed to get registrations' });
  }
});

// Register truck for event
router.post('/:eventId/register', authenticate, async (req, res) => {
  try {
    const { truckId, notes } = req.body;

    // Check if already registered
    const existing = await prisma.eventRegistration.findFirst({
      where: {
        eventId: req.params.eventId,
        truckId
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Already registered for this event' });
    }

    const registration = await prisma.eventRegistration.create({
      data: {
        eventId: req.params.eventId,
        truckId,
        notes,
        status: 'PENDING'
      },
      include: {
        event: true,
        truck: true
      }
    });

    res.status(201).json(registration);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register for event' });
  }
});

// Update registration status
router.patch('/registration/:id/status', authenticate, async (req, res) => {
  try {
    const { status, boothNumber, notes } = req.body;

    const registration = await prisma.eventRegistration.update({
      where: { id: req.params.id },
      data: {
        status,
        boothNumber,
        notes
      },
      include: {
        event: true,
        truck: true
      }
    });

    res.json(registration);
  } catch (error) {
    console.error('Update registration error:', error);
    res.status(500).json({ error: 'Failed to update registration' });
  }
});

// Cancel registration
router.delete('/registration/:id', authenticate, async (req, res) => {
  try {
    await prisma.eventRegistration.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Registration cancelled successfully' });
  } catch (error) {
    console.error('Cancel registration error:', error);
    res.status(500).json({ error: 'Failed to cancel registration' });
  }
});

// Get upcoming events for truck
router.get('/truck/:truckId/upcoming', authenticate, async (req, res) => {
  try {
    const registrations = await prisma.eventRegistration.findMany({
      where: {
        truckId: req.params.truckId,
        status: 'APPROVED',
        event: {
          startDate: { gte: new Date() }
        }
      },
      include: {
        event: {
          include: { location: true }
        }
      },
      orderBy: {
        event: { startDate: 'asc' }
      }
    });

    res.json(registrations);
  } catch (error) {
    console.error('Get upcoming error:', error);
    res.status(500).json({ error: 'Failed to get upcoming events' });
  }
});

// ==================== EVENT BOOTHS ====================

// Get all booths for an event
router.get('/:eventId/booths', authenticate, async (req, res) => {
  try {
    const booths = await prisma.eventBooth.findMany({
      where: { eventId: req.params.eventId },
      include: {
        registration: {
          include: { truck: true }
        }
      },
      orderBy: { boothNumber: 'asc' }
    });
    res.json(booths);
  } catch (error) {
    console.error('Get booths error:', error);
    res.status(500).json({ error: 'Failed to get booths' });
  }
});

// Create booth
router.post('/:eventId/booths', authenticate, async (req, res) => {
  try {
    const { boothNumber, location, size, price, amenities } = req.body;

    const booth = await prisma.eventBooth.create({
      data: {
        eventId: req.params.eventId,
        boothNumber,
        location: location || null,
        size: size || 'STANDARD',
        price: price ? parseFloat(price) : null,
        amenities: amenities || []
      }
    });

    res.status(201).json(booth);
  } catch (error) {
    console.error('Create booth error:', error);
    res.status(500).json({ error: 'Failed to create booth' });
  }
});

// Bulk create booths
router.post('/:eventId/booths/bulk', authenticate, async (req, res) => {
  try {
    const { booths } = req.body;

    const createdBooths = await prisma.eventBooth.createMany({
      data: booths.map(b => ({
        eventId: req.params.eventId,
        boothNumber: b.boothNumber,
        location: b.location || null,
        size: b.size || 'STANDARD',
        price: b.price ? parseFloat(b.price) : null,
        amenities: b.amenities || []
      }))
    });

    res.status(201).json({ count: createdBooths.count });
  } catch (error) {
    console.error('Bulk create booths error:', error);
    res.status(500).json({ error: 'Failed to create booths' });
  }
});

// Update booth
router.put('/booths/:id', authenticate, async (req, res) => {
  try {
    const { boothNumber, location, size, price, amenities, isAvailable } = req.body;

    const booth = await prisma.eventBooth.update({
      where: { id: req.params.id },
      data: { boothNumber, location, size, price, amenities, isAvailable }
    });

    res.json(booth);
  } catch (error) {
    console.error('Update booth error:', error);
    res.status(500).json({ error: 'Failed to update booth' });
  }
});

// Delete booth
router.delete('/booths/:id', authenticate, async (req, res) => {
  try {
    await prisma.eventBooth.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Booth deleted successfully' });
  } catch (error) {
    console.error('Delete booth error:', error);
    res.status(500).json({ error: 'Failed to delete booth' });
  }
});

// Assign booth to registration
router.patch('/registration/:regId/assign-booth', authenticate, async (req, res) => {
  try {
    const { boothId } = req.body;

    // Check if booth is available
    const booth = await prisma.eventBooth.findUnique({
      where: { id: boothId }
    });

    if (!booth || !booth.isAvailable) {
      return res.status(400).json({ error: 'Booth is not available' });
    }

    // Assign booth to registration
    const [registration] = await prisma.$transaction([
      prisma.eventRegistration.update({
        where: { id: req.params.regId },
        data: { boothId },
        include: { booth: true, event: true, truck: true }
      }),
      prisma.eventBooth.update({
        where: { id: boothId },
        data: { isAvailable: false }
      })
    ]);

    res.json(registration);
  } catch (error) {
    console.error('Assign booth error:', error);
    res.status(500).json({ error: 'Failed to assign booth' });
  }
});

// ==================== EVENT TIMELINE ====================

// Get timeline for an event
router.get('/:eventId/timeline', authenticate, async (req, res) => {
  try {
    const timeline = await prisma.eventTimeline.findMany({
      where: { eventId: req.params.eventId },
      orderBy: { dueDate: 'asc' }
    });
    res.json(timeline);
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({ error: 'Failed to get timeline' });
  }
});

// Get timeline for a registration
router.get('/registration/:regId/timeline', authenticate, async (req, res) => {
  try {
    const timeline = await prisma.eventTimeline.findMany({
      where: { registrationId: req.params.regId },
      orderBy: { dueDate: 'asc' }
    });
    res.json(timeline);
  } catch (error) {
    console.error('Get registration timeline error:', error);
    res.status(500).json({ error: 'Failed to get timeline' });
  }
});

// Get truck's event timeline (all events)
router.get('/truck/:truckId/timeline', authenticate, async (req, res) => {
  try {
    const registrations = await prisma.eventRegistration.findMany({
      where: { truckId: req.params.truckId },
      include: {
        event: true,
        timeline: true
      }
    });

    // Combine event and registration timelines
    const timeline = [];
    for (const reg of registrations) {
      // Add event milestones
      if (reg.event) {
        timeline.push({
          id: `event-start-${reg.id}`,
          title: `${reg.event.name} - Event Start`,
          dueDate: reg.event.startDate,
          type: 'EVENT_START',
          isCompleted: new Date() > new Date(reg.event.startDate),
          event: reg.event
        });

        timeline.push({
          id: `event-end-${reg.id}`,
          title: `${reg.event.name} - Event End`,
          dueDate: reg.event.endDate,
          type: 'EVENT_END',
          isCompleted: new Date() > new Date(reg.event.endDate),
          event: reg.event
        });
      }

      // Add registration-specific timeline items
      for (const item of reg.timeline) {
        timeline.push({
          ...item,
          event: reg.event
        });
      }
    }

    // Sort by due date
    timeline.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    res.json(timeline);
  } catch (error) {
    console.error('Get truck timeline error:', error);
    res.status(500).json({ error: 'Failed to get timeline' });
  }
});

// Create timeline item
router.post('/timeline', authenticate, async (req, res) => {
  try {
    const { title, description, dueDate, type, eventId, registrationId } = req.body;

    const timelineItem = await prisma.eventTimeline.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        type,
        eventId: eventId || null,
        registrationId: registrationId || null
      }
    });

    res.status(201).json(timelineItem);
  } catch (error) {
    console.error('Create timeline error:', error);
    res.status(500).json({ error: 'Failed to create timeline item' });
  }
});

// Update timeline item
router.patch('/timeline/:id', authenticate, async (req, res) => {
  try {
    const { title, description, dueDate, type, isCompleted } = req.body;

    const timelineItem = await prisma.eventTimeline.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        type,
        isCompleted,
        completedAt: isCompleted ? new Date() : null
      }
    });

    res.json(timelineItem);
  } catch (error) {
    console.error('Update timeline error:', error);
    res.status(500).json({ error: 'Failed to update timeline item' });
  }
});

// Delete timeline item
router.delete('/timeline/:id', authenticate, async (req, res) => {
  try {
    await prisma.eventTimeline.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Timeline item deleted successfully' });
  } catch (error) {
    console.error('Delete timeline error:', error);
    res.status(500).json({ error: 'Failed to delete timeline item' });
  }
});

// ==================== PAYMENT ====================

// Update registration payment status
router.patch('/registration/:regId/payment', authenticate, async (req, res) => {
  try {
    const { paymentStatus, paymentAmount } = req.body;

    const registration = await prisma.eventRegistration.update({
      where: { id: req.params.regId },
      data: {
        paymentStatus,
        paymentAmount: paymentAmount ? parseFloat(paymentAmount) : null
      },
      include: {
        event: true,
        truck: true,
        booth: true
      }
    });

    res.json(registration);
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

module.exports = router;
