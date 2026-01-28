// Notification Service
// This service handles SMS and email notifications for pre-orders
// In production, integrate with Twilio (SMS) and SendGrid (email)

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Notification types
const NOTIFICATION_TYPES = {
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_PREPARING: 'ORDER_PREPARING',
  ORDER_READY: 'ORDER_READY',
  PICKUP_REMINDER: 'PICKUP_REMINDER',
  ORDER_CANCELLED: 'ORDER_CANCELLED'
};

// Message templates
const MESSAGE_TEMPLATES = {
  ORDER_CONFIRMED: (order) =>
    `Your order ${order.orderNumber} has been confirmed! Pickup time: ${formatTime(order.scheduledPickup)}`,
  ORDER_PREPARING: (order) =>
    `Your order ${order.orderNumber} is now being prepared. Please arrive at ${formatTime(order.scheduledPickup)}`,
  ORDER_READY: (order) =>
    `Your order ${order.orderNumber} is ready for pickup!`,
  PICKUP_REMINDER: (order) =>
    `Reminder: Your order ${order.orderNumber} is scheduled for pickup in 15 minutes`,
  ORDER_CANCELLED: (order) =>
    `Your order ${order.orderNumber} has been cancelled. If you have questions, please contact us.`
};

function formatTime(date) {
  if (!date) return 'scheduled time';
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Send SMS notification (mock implementation)
async function sendSMS(phoneNumber, message) {
  // In production, use Twilio:
  // const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  // await twilio.messages.create({
  //   body: message,
  //   from: process.env.TWILIO_PHONE,
  //   to: phoneNumber
  // });

  console.log(`[SMS] To: ${phoneNumber}`);
  console.log(`[SMS] Message: ${message}`);

  // Return mock success
  return {
    success: true,
    sid: `mock_${Date.now()}`,
    to: phoneNumber
  };
}

// Send email notification (mock implementation)
async function sendEmail(email, subject, message) {
  // In production, use SendGrid:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send({
  //   to: email,
  //   from: 'noreply@foodtruck.app',
  //   subject: subject,
  //   text: message
  // });

  console.log(`[EMAIL] To: ${email}`);
  console.log(`[EMAIL] Subject: ${subject}`);
  console.log(`[EMAIL] Message: ${message}`);

  // Return mock success
  return {
    success: true,
    messageId: `mock_${Date.now()}`,
    to: email
  };
}

// Send notification for an order
async function sendOrderNotification(orderId, type) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      truck: true,
      pickupWindow: {
        include: { truckLocation: { include: { location: true } } }
      }
    }
  });

  if (!order) {
    console.error(`Order not found: ${orderId}`);
    return null;
  }

  const template = MESSAGE_TEMPLATES[type];
  if (!template) {
    console.error(`Unknown notification type: ${type}`);
    return null;
  }

  const message = template(order);
  const results = [];

  // Send SMS if phone number available
  if (order.customerPhone) {
    try {
      const smsResult = await sendSMS(order.customerPhone, message);
      results.push({ type: 'sms', ...smsResult });
    } catch (error) {
      console.error('SMS send error:', error);
      results.push({ type: 'sms', success: false, error: error.message });
    }
  }

  // Send email if email available
  if (order.customerEmail) {
    try {
      const subject = `${order.truck.name} - Order ${order.orderNumber} ${type.replace(/_/g, ' ').toLowerCase()}`;
      const emailResult = await sendEmail(order.customerEmail, subject, message);
      results.push({ type: 'email', ...emailResult });
    } catch (error) {
      console.error('Email send error:', error);
      results.push({ type: 'email', success: false, error: error.message });
    }
  }

  // Create notification record
  await prisma.orderNotification.create({
    data: {
      orderId,
      type,
      message
    }
  });

  return results;
}

// Send pickup reminders for upcoming orders
async function sendPickupReminders() {
  const now = new Date();
  const reminderWindow = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

  // Find orders that need reminders
  const orders = await prisma.order.findMany({
    where: {
      type: 'PRE_ORDER',
      status: { in: ['CONFIRMED', 'PREPARING', 'READY'] },
      reminderSent: false,
      scheduledPickup: {
        gte: now,
        lte: reminderWindow
      }
    }
  });

  const results = [];
  for (const order of orders) {
    const result = await sendOrderNotification(order.id, NOTIFICATION_TYPES.PICKUP_REMINDER);

    // Mark reminder as sent
    await prisma.order.update({
      where: { id: order.id },
      data: { reminderSent: true }
    });

    results.push({ orderId: order.id, results: result });
  }

  return results;
}

// Subscribe customer to location notifications
async function subscribeToLocation(data) {
  const { email, phone, pushToken, latitude, longitude, radius } = data;

  return prisma.locationSubscription.create({
    data: {
      email,
      phone,
      pushToken,
      latitude,
      longitude,
      radius: radius || 5,
      isActive: true
    }
  });
}

// Unsubscribe from notifications
async function unsubscribe(subscriptionId) {
  return prisma.locationSubscription.update({
    where: { id: subscriptionId },
    data: { isActive: false }
  });
}

// Notify subscribers when truck arrives at location
async function notifyNearbySubscribers(truckId, latitude, longitude) {
  const truck = await prisma.truck.findUnique({
    where: { id: truckId }
  });

  if (!truck) return [];

  // Find active subscriptions within range
  const subscriptions = await prisma.locationSubscription.findMany({
    where: { isActive: true }
  });

  // Calculate distance and filter
  const nearbySubscribers = subscriptions.filter(sub => {
    const distance = calculateDistance(
      sub.latitude,
      sub.longitude,
      latitude,
      longitude
    );
    return distance <= sub.radius;
  });

  const message = `${truck.name} is now nearby! Come grab some delicious food.`;
  const results = [];

  for (const sub of nearbySubscribers) {
    if (sub.phone) {
      await sendSMS(sub.phone, message);
    }
    if (sub.email) {
      await sendEmail(sub.email, `${truck.name} is nearby!`, message);
    }
    results.push({ subscriptionId: sub.id });
  }

  return results;
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

module.exports = {
  NOTIFICATION_TYPES,
  sendSMS,
  sendEmail,
  sendOrderNotification,
  sendPickupReminders,
  subscribeToLocation,
  unsubscribe,
  notifyNearbySubscribers
};
