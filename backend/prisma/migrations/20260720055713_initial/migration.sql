-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OWNER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "TruckMemberRole" AS ENUM ('MANAGER', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('STREET', 'PARKING_LOT', 'PRIVATE_PROPERTY', 'EVENT_VENUE', 'FOOD_COURT', 'MARKET');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PermitType" AS ENUM ('HEALTH', 'BUSINESS', 'PARKING', 'FIRE', 'MOBILE_VENDOR', 'SPECIAL_EVENT');

-- CreateEnum
CREATE TYPE "PermitStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'PENDING', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'RESERVED', 'PAYMENT_PENDING', 'CONFIRMED', 'PREPARING', 'PARTIALLY_FULFILLED', 'READY', 'PICKED_UP', 'CANCELLED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('WALK_IN', 'MOBILE', 'PRE_ORDER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'APPLE_PAY', 'GOOGLE_PAY', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'REQUIRES_ACTION', 'AUTHORIZED', 'COMPLETED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'RESERVED', 'RELEASED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('UNFULFILLED', 'PARTIAL', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryReservationStatus" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProviderEventDirection" AS ENUM ('OUTBOUND_RESULT', 'INBOUND_WEBHOOK', 'RECONCILIATION');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER_CONFIRMED', 'ORDER_PREPARING', 'ORDER_READY', 'ORDER_PICKED_UP', 'PICKUP_REMINDER', 'ORDER_CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('MEAT', 'PRODUCE', 'DAIRY', 'DRY_GOODS', 'BEVERAGES', 'CONDIMENTS', 'PACKAGING', 'CLEANING', 'OTHER');

-- CreateEnum
CREATE TYPE "PrepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SupplyStatus" AS ENUM ('ORDERED', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WasteReason" AS ENUM ('EXPIRED', 'SPOILED', 'OVERCOOKED', 'DROPPED', 'QUALITY_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'TWITTER', 'TIKTOK');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'POSTED', 'FAILED');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('LOCATION_ANNOUNCEMENT', 'DAILY_MENU', 'SPECIAL_PROMOTION', 'PHOTO_SHARE', 'CUSTOMER_ENGAGEMENT', 'EVENT_ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('FOOD_SUPPLIES', 'FUEL', 'MAINTENANCE', 'PERMITS', 'INSURANCE', 'MARKETING', 'EQUIPMENT', 'LABOR', 'UTILITIES', 'RENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AIRecommendationType" AS ENUM ('LOCATION', 'MENU', 'DEMAND', 'ROUTE', 'WEATHER', 'SOCIAL_MEDIA', 'CUSTOMER_ENGAGEMENT');

-- CreateEnum
CREATE TYPE "AutoPostTrigger" AS ENUM ('ARRIVAL_AT_LOCATION', 'BOOKING_CONFIRMED', 'DAILY_SCHEDULE');

-- CreateEnum
CREATE TYPE "BoothSize" AS ENUM ('SMALL', 'STANDARD', 'LARGE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "TimelineType" AS ENUM ('APPLICATION_DEADLINE', 'PAYMENT_DUE', 'DOCUMENT_SUBMISSION', 'SETUP_TIME', 'EVENT_START', 'EVENT_END', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GoalPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenBlacklist" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Truck" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logo" TEXT,
    "coverImage" TEXT,
    "cuisineType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Truck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TruckMembership" (
    "id" TEXT NOT NULL,
    "role" "TruckMemberRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "truckId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TruckMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "type" "LocationType" NOT NULL DEFAULT 'STREET',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TruckLocation" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "revenue" DOUBLE PRECISION,
    "customerCount" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "truckId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "TruckLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permit" (
    "id" TEXT NOT NULL,
    "permitNumber" TEXT NOT NULL,
    "type" "PermitType" NOT NULL,
    "issuingAuthority" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "cost" DOUBLE PRECISION,
    "status" "PermitStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "truckId" TEXT NOT NULL,

    CONSTRAINT "Permit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "venueAddress" TEXT,
    "expectedAttendance" INTEGER,
    "vendorFee" DOUBLE PRECISION,
    "applicationDeadline" TIMESTAMP(3),
    "status" "EventStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "locationId" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "boothNumber" TEXT,
    "notes" TEXT,
    "paymentStatus" TEXT DEFAULT 'PENDING',
    "paymentAmount" DOUBLE PRECISION,
    "documents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "truckId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "boothId" TEXT,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Menu" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "truckId" TEXT NOT NULL,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "menuId" TEXT NOT NULL,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "image" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isSoldOut" BOOLEAN NOT NULL DEFAULT false,
    "isSpecial" BOOLEAN NOT NULL DEFAULT false,
    "specialPrice" DOUBLE PRECISION,
    "calories" INTEGER,
    "allergens" TEXT[],
    "tags" TEXT[],
    "prepTime" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemIngredient" (
    "id" TEXT NOT NULL,
    "quantityPerItem" DOUBLE PRECISION NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,

    CONSTRAINT "MenuItemIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "type" "OrderType" NOT NULL DEFAULT 'WALK_IN',
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL,
    "tip" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod",
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reservationStatus" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'UNFULFILLED',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotalCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "tipCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "refundedCents" INTEGER NOT NULL DEFAULT 0,
    "requestDigest" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "customerAccessTokenHash" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "reservationExpiresAt" TIMESTAMP(3),
    "paymentProvider" TEXT,
    "paymentIntentId" TEXT,
    "deliveryProvider" TEXT,
    "deliveryId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "exceptionCode" TEXT,
    "exceptionMessage" TEXT,
    "exceptionFromStatus" "OrderStatus",
    "notes" TEXT,
    "estimatedReadyTime" TIMESTAMP(3),
    "actualReadyTime" TIMESTAMP(3),
    "scheduledPickup" TIMESTAMP(3),
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "truckId" TEXT NOT NULL,
    "userId" TEXT,
    "pickupWindowId" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "specialInstructions" TEXT,
    "fulfilledQuantity" INTEGER NOT NULL DEFAULT 0,
    "cancelledQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "status" "InventoryReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "idempotencyKey" TEXT NOT NULL,
    "provider" TEXT,
    "providerRefundId" TEXT,
    "providerEventId" TEXT,
    "providerPayloadDigest" TEXT,
    "failureCode" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "orderId" TEXT NOT NULL,
    "requestedById" TEXT,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "sequence" BIGINT NOT NULL,
    "eventType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "actorRole" TEXT,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus",
    "fromPaymentStatus" "PaymentStatus",
    "toPaymentStatus" "PaymentStatus",
    "fromFulfillmentStatus" "FulfillmentStatus",
    "toFulfillmentStatus" "FulfillmentStatus",
    "idempotencyKey" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "previousHash" TEXT,
    "eventHash" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,
    "actorId" TEXT,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderProviderEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "direction" "ProviderEventDirection" NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sourceTimestamp" TIMESTAMP(3) NOT NULL,
    "sourceOrderRef" TEXT NOT NULL,
    "payloadDigest" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "truckId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "OrderProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderNotification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "OrderNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InventoryCategory" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "minQuantity" DOUBLE PRECISION NOT NULL,
    "maxQuantity" DOUBLE PRECISION,
    "costPerUnit" DOUBLE PRECISION,
    "supplier" TEXT,
    "lastRestocked" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "truckId" TEXT NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "quantityDelta" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inventoryItemId" TEXT NOT NULL,
    "actorId" TEXT,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepList" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "PrepStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "truckId" TEXT NOT NULL,

    CONSTRAINT "PrepList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "prepListId" TEXT NOT NULL,

    CONSTRAINT "PrepItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supply" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InventoryCategory" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "supplier" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "expectedDelivery" TIMESTAMP(3),
    "actualDelivery" TIMESTAMP(3),
    "status" "SupplyStatus" NOT NULL DEFAULT 'ORDERED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "truckId" TEXT NOT NULL,

    CONSTRAINT "Supply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteRecord" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "reason" "WasteReason" NOT NULL,
    "cost" DOUBLE PRECISION,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inventoryItemId" TEXT NOT NULL,

    CONSTRAINT "WasteRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "PostType" NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "isAIGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "truckId" TEXT NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "cashSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cardSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mobileSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSales" DOUBLE PRECISION NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "averageTicket" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "truckId" TEXT NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod",
    "vendor" TEXT,
    "receiptUrl" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "truckId" TEXT NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRecommendation" (
    "id" TEXT NOT NULL,
    "type" "AIRecommendationType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "data" JSONB,
    "confidence" DOUBLE PRECISION,
    "isActioned" BOOLEAN NOT NULL DEFAULT false,
    "actionedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "truckId" TEXT NOT NULL,

    CONSTRAINT "AIRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TruckLiveLocation" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "truckId" TEXT NOT NULL,

    CONSTRAINT "TruckLiveLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "pushToken" TEXT,
    "radius" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherCache" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "conditions" TEXT NOT NULL,
    "humidity" INTEGER NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandPrediction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "hourStart" INTEGER NOT NULL,
    "predictedCustomers" INTEGER NOT NULL,
    "predictedRevenue" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "weatherFactor" DOUBLE PRECISION,
    "truckId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "DemandPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PostType" NOT NULL,
    "template" TEXT NOT NULL,
    "platforms" "SocialPlatform"[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "truckId" TEXT NOT NULL,

    CONSTRAINT "SocialTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoPostRule" (
    "id" TEXT NOT NULL,
    "triggerType" "AutoPostTrigger" NOT NULL,
    "platforms" "SocialPlatform"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "truckId" TEXT NOT NULL,
    "templateId" TEXT,

    CONSTRAINT "AutoPostRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "truckId" TEXT NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreOrderWindow" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "slotStart" TEXT NOT NULL,
    "slotEnd" TEXT NOT NULL,
    "maxOrders" INTEGER NOT NULL DEFAULT 5,
    "currentOrders" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "truckLocationId" TEXT NOT NULL,

    CONSTRAINT "PreOrderWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreOrderSettings" (
    "id" TEXT NOT NULL,
    "defaultSlotDuration" INTEGER NOT NULL DEFAULT 15,
    "maxOrdersPerSlot" INTEGER NOT NULL DEFAULT 5,
    "advanceBookingHours" INTEGER NOT NULL DEFAULT 24,
    "cutoffMinutes" INTEGER NOT NULL DEFAULT 30,
    "autoGenerateSlots" BOOLEAN NOT NULL DEFAULT true,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "truckId" TEXT NOT NULL,

    CONSTRAINT "PreOrderSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventBooth" (
    "id" TEXT NOT NULL,
    "boothNumber" TEXT NOT NULL,
    "location" TEXT,
    "size" "BoothSize" NOT NULL DEFAULT 'STANDARD',
    "price" DOUBLE PRECISION,
    "amenities" TEXT[],
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "EventBooth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTimeline" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "type" "TimelineType" NOT NULL,
    "eventId" TEXT,
    "registrationId" TEXT,

    CONSTRAINT "EventTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationAnalytics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "expenses" DOUBLE PRECISION,
    "customerCount" INTEGER NOT NULL,
    "orderCount" INTEGER NOT NULL,
    "averageOrderValue" DOUBLE PRECISION NOT NULL,
    "peakHour" INTEGER,
    "topSellingItems" JSONB,
    "weatherCondition" TEXT,
    "operatingHours" DOUBLE PRECISION NOT NULL,
    "revenuePerHour" DOUBLE PRECISION NOT NULL,
    "revenuePerCustomer" DOUBLE PRECISION NOT NULL,
    "truckId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "LocationAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationGoal" (
    "id" TEXT NOT NULL,
    "targetRevenue" DOUBLE PRECISION NOT NULL,
    "targetCustomers" INTEGER,
    "period" "GoalPeriod" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "truckId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "LocationGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerification_token_key" ON "EmailVerification"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TokenBlacklist_token_key" ON "TokenBlacklist"("token");

-- CreateIndex
CREATE INDEX "TruckMembership_userId_isActive_idx" ON "TruckMembership"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TruckMembership_truckId_userId_key" ON "TruckMembership"("truckId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_boothId_key" ON "EventRegistration"("boothId");

-- CreateIndex
CREATE INDEX "MenuItemIngredient_inventoryItemId_idx" ON "MenuItemIngredient"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemIngredient_menuItemId_inventoryItemId_key" ON "MenuItemIngredient"("menuItemId", "inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Order_customerAccessTokenHash_key" ON "Order"("customerAccessTokenHash");

-- CreateIndex
CREATE INDEX "Order_truckId_status_createdAt_idx" ON "Order"("truckId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_paymentProvider_paymentIntentId_idx" ON "Order"("paymentProvider", "paymentIntentId");

-- CreateIndex
CREATE INDEX "InventoryReservation_orderId_status_idx" ON "InventoryReservation"("orderId", "status");

-- CreateIndex
CREATE INDEX "InventoryReservation_inventoryItemId_status_idx" ON "InventoryReservation"("inventoryItemId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryReservation_orderItemId_inventoryItemId_key" ON "InventoryReservation"("orderItemId", "inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Refund_orderId_status_idx" ON "Refund"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_provider_providerRefundId_key" ON "Refund"("provider", "providerRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderEvent_eventHash_key" ON "OrderEvent"("eventHash");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderEvent_orderId_sequence_key" ON "OrderEvent"("orderId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "OrderEvent_orderId_idempotencyKey_key" ON "OrderEvent"("orderId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "OrderProviderEvent_orderId_operation_createdAt_idx" ON "OrderProviderEvent"("orderId", "operation", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderProviderEvent_provider_providerEventId_key" ON "OrderProviderEvent"("provider", "providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderProviderEvent_provider_idempotencyKey_key" ON "OrderProviderEvent"("provider", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_idempotencyKey_key" ON "InventoryMovement"("idempotencyKey");

-- CreateIndex
CREATE INDEX "InventoryMovement_inventoryItemId_createdAt_idx" ON "InventoryMovement"("inventoryItemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TruckLiveLocation_truckId_key" ON "TruckLiveLocation"("truckId");

-- CreateIndex
CREATE UNIQUE INDEX "WeatherCache_latitude_longitude_date_key" ON "WeatherCache"("latitude", "longitude", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_truckId_platform_key" ON "SocialAccount"("truckId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "PreOrderWindow_truckLocationId_date_slotStart_key" ON "PreOrderWindow"("truckLocationId", "date", "slotStart");

-- CreateIndex
CREATE UNIQUE INDEX "PreOrderSettings_truckId_key" ON "PreOrderSettings"("truckId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationAnalytics_truckId_locationId_date_key" ON "LocationAnalytics"("truckId", "locationId", "date");

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerification" ADD CONSTRAINT "EmailVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckMembership" ADD CONSTRAINT "TruckMembership_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckMembership" ADD CONSTRAINT "TruckMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckLocation" ADD CONSTRAINT "TruckLocation_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckLocation" ADD CONSTRAINT "TruckLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_boothId_fkey" FOREIGN KEY ("boothId") REFERENCES "EventBooth"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Menu" ADD CONSTRAINT "Menu_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_pickupWindowId_fkey" FOREIGN KEY ("pickupWindowId") REFERENCES "PreOrderWindow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderProviderEvent" ADD CONSTRAINT "OrderProviderEvent_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderProviderEvent" ADD CONSTRAINT "OrderProviderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderNotification" ADD CONSTRAINT "OrderNotification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepList" ADD CONSTRAINT "PrepList_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepItem" ADD CONSTRAINT "PrepItem_prepListId_fkey" FOREIGN KEY ("prepListId") REFERENCES "PrepList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supply" ADD CONSTRAINT "Supply_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRecommendation" ADD CONSTRAINT "AIRecommendation_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckLiveLocation" ADD CONSTRAINT "TruckLiveLocation_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandPrediction" ADD CONSTRAINT "DemandPrediction_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandPrediction" ADD CONSTRAINT "DemandPrediction_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialTemplate" ADD CONSTRAINT "SocialTemplate_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoPostRule" ADD CONSTRAINT "AutoPostRule_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoPostRule" ADD CONSTRAINT "AutoPostRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SocialTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreOrderWindow" ADD CONSTRAINT "PreOrderWindow_truckLocationId_fkey" FOREIGN KEY ("truckLocationId") REFERENCES "TruckLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreOrderSettings" ADD CONSTRAINT "PreOrderSettings_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventBooth" ADD CONSTRAINT "EventBooth_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTimeline" ADD CONSTRAINT "EventTimeline_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTimeline" ADD CONSTRAINT "EventTimeline_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationAnalytics" ADD CONSTRAINT "LocationAnalytics_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationAnalytics" ADD CONSTRAINT "LocationAnalytics_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationGoal" ADD CONSTRAINT "LocationGoal_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationGoal" ADD CONSTRAINT "LocationGoal_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Commerce evidence is append-only. These constraints live in PostgreSQL so
-- application bugs and ad-hoc ORM calls cannot rewrite operational history.
CREATE OR REPLACE FUNCTION reject_evidence_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is immutable', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER order_event_immutable
BEFORE UPDATE OR DELETE ON "OrderEvent"
FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();

CREATE TRIGGER order_provider_event_immutable
BEFORE UPDATE OR DELETE ON "OrderProviderEvent"
FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();

CREATE TRIGGER inventory_movement_immutable
BEFORE UPDATE OR DELETE ON "InventoryMovement"
FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();

CREATE TRIGGER refund_evidence_immutable
BEFORE UPDATE OR DELETE ON "Refund"
FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();

CREATE OR REPLACE FUNCTION enforce_order_state_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."truckId" <> OLD."truckId"
     OR NEW."idempotencyKey" <> OLD."idempotencyKey"
     OR NEW."requestDigest" <> OLD."requestDigest"
     OR NEW."subtotalCents" <> OLD."subtotalCents"
     OR NEW."taxCents" <> OLD."taxCents"
     OR NEW."totalCents" <> OLD."totalCents"
     OR NEW."currency" <> OLD."currency" THEN
    RAISE EXCEPTION 'Order provenance and quoted totals are immutable';
  END IF;

  IF NEW."status" <> OLD."status" AND NOT (
    (OLD."status" = 'PENDING' AND NEW."status" IN ('RESERVED', 'CANCELLED', 'EXCEPTION')) OR
    (OLD."status" = 'RESERVED' AND NEW."status" IN ('PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED', 'EXCEPTION')) OR
    (OLD."status" = 'PAYMENT_PENDING' AND NEW."status" IN ('CONFIRMED', 'CANCELLED', 'EXCEPTION')) OR
    (OLD."status" = 'CONFIRMED' AND NEW."status" IN ('PREPARING', 'CANCELLED', 'EXCEPTION')) OR
    (OLD."status" = 'PREPARING' AND NEW."status" IN ('PARTIALLY_FULFILLED', 'READY', 'CANCELLED', 'EXCEPTION')) OR
    (OLD."status" = 'PARTIALLY_FULFILLED' AND NEW."status" IN ('READY', 'CANCELLED', 'EXCEPTION')) OR
    (OLD."status" = 'READY' AND NEW."status" IN ('PICKED_UP', 'CANCELLED', 'EXCEPTION')) OR
    (OLD."status" = 'PICKED_UP' AND NEW."status" = 'EXCEPTION') OR
    (OLD."status" = 'EXCEPTION' AND NEW."status" IN ('RESERVED', 'PAYMENT_PENDING', 'CONFIRMED', 'PREPARING', 'PARTIALLY_FULFILLED', 'READY', 'PICKED_UP', 'CANCELLED'))
  ) THEN
    RAISE EXCEPTION 'Invalid order state transition % -> %', OLD."status", NEW."status";
  END IF;

  IF NEW."paymentStatus" <> OLD."paymentStatus" AND NOT (
    (OLD."paymentStatus" = 'PENDING' AND NEW."paymentStatus" IN ('REQUIRES_ACTION', 'AUTHORIZED', 'COMPLETED', 'FAILED')) OR
    (OLD."paymentStatus" = 'REQUIRES_ACTION' AND NEW."paymentStatus" IN ('AUTHORIZED', 'COMPLETED', 'FAILED')) OR
    (OLD."paymentStatus" = 'AUTHORIZED' AND NEW."paymentStatus" IN ('COMPLETED', 'FAILED')) OR
    (OLD."paymentStatus" = 'FAILED' AND NEW."paymentStatus" IN ('PENDING', 'REQUIRES_ACTION', 'AUTHORIZED', 'COMPLETED')) OR
    (OLD."paymentStatus" = 'COMPLETED' AND NEW."paymentStatus" IN ('PARTIALLY_REFUNDED', 'REFUNDED')) OR
    (OLD."paymentStatus" = 'PARTIALLY_REFUNDED' AND NEW."paymentStatus" IN ('PARTIALLY_REFUNDED', 'REFUNDED'))
  ) THEN
    RAISE EXCEPTION 'Invalid payment state transition % -> %', OLD."paymentStatus", NEW."paymentStatus";
  END IF;

  IF NEW."fulfillmentStatus" <> OLD."fulfillmentStatus" AND NOT (
    (OLD."fulfillmentStatus" = 'UNFULFILLED' AND NEW."fulfillmentStatus" IN ('PARTIAL', 'FULFILLED', 'CANCELLED')) OR
    (OLD."fulfillmentStatus" = 'PARTIAL' AND NEW."fulfillmentStatus" IN ('PARTIAL', 'FULFILLED', 'CANCELLED'))
  ) THEN
    RAISE EXCEPTION 'Invalid fulfillment transition % -> %', OLD."fulfillmentStatus", NEW."fulfillmentStatus";
  END IF;

  IF NEW."version" <> OLD."version" + 1 THEN
    RAISE EXCEPTION 'Order updates require an exact optimistic version increment';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER order_state_machine
BEFORE UPDATE ON "Order"
FOR EACH ROW EXECUTE FUNCTION enforce_order_state_transition();

CREATE TRIGGER order_delete_prohibited
BEFORE DELETE ON "Order"
FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();

CREATE OR REPLACE FUNCTION enforce_order_item_fulfillment()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."orderId" <> OLD."orderId"
     OR NEW."menuItemId" <> OLD."menuItemId"
     OR NEW."quantity" <> OLD."quantity"
     OR NEW."unitPrice" <> OLD."unitPrice"
     OR NEW."totalPrice" <> OLD."totalPrice" THEN
    RAISE EXCEPTION 'Order item identity and quoted price are immutable';
  END IF;
  IF NEW."fulfilledQuantity" < OLD."fulfilledQuantity"
     OR NEW."fulfilledQuantity" + NEW."cancelledQuantity" > NEW."quantity" THEN
    RAISE EXCEPTION 'Invalid order item fulfillment quantities';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER order_item_fulfillment_guard
BEFORE UPDATE ON "OrderItem"
FOR EACH ROW EXECUTE FUNCTION enforce_order_item_fulfillment();

CREATE TRIGGER order_item_delete_prohibited
BEFORE DELETE ON "OrderItem"
FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
