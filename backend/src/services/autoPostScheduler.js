// Auto Post Scheduler Service
// Handles scheduled and triggered social media posts using node-cron

const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const socialPublisher = require('./socialPublisher');

const prisma = new PrismaClient();

class AutoPostScheduler {
  constructor() {
    this.scheduledJobs = new Map();
    this.isInitialized = false;
  }

  // Initialize the scheduler
  async initialize() {
    if (this.isInitialized) return;

    // Run every minute to check for scheduled posts
    cron.schedule('* * * * *', async () => {
      await this.processScheduledPosts();
    });

    // Run daily schedule posts at configured times
    cron.schedule('0 8 * * *', async () => {
      await this.processDailyScheduleTriggers();
    });

    this.isInitialized = true;
    console.log('Auto Post Scheduler initialized');
  }

  // Process posts that are scheduled for now
  async processScheduledPosts() {
    try {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);

      // Find posts scheduled for the current minute
      const scheduledPosts = await prisma.socialPost.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledFor: {
            gte: oneMinuteAgo,
            lte: now
          }
        },
        include: {
          truck: true
        }
      });

      for (const post of scheduledPosts) {
        await this.publishPost(post);
      }
    } catch (error) {
      console.error('Error processing scheduled posts:', error);
    }
  }

  // Publish a single post
  async publishPost(post) {
    try {
      // Get social account for the platform
      const account = await prisma.socialAccount.findFirst({
        where: {
          truckId: post.truckId,
          platform: post.platform,
          isConnected: true
        }
      });

      const result = await socialPublisher.publish(
        post.platform,
        post.content,
        {
          imageUrl: post.imageUrl,
          accessToken: account?.accessToken
        }
      );

      // Update post status
      await prisma.socialPost.update({
        where: { id: post.id },
        data: {
          status: result.success ? 'POSTED' : 'FAILED',
          postedAt: result.success ? new Date() : null,
          externalId: result.postId || null
        }
      });

      console.log(`Post ${post.id} ${result.success ? 'published' : 'failed'} to ${post.platform}`);
      return result;
    } catch (error) {
      console.error(`Error publishing post ${post.id}:`, error);

      await prisma.socialPost.update({
        where: { id: post.id },
        data: { status: 'FAILED' }
      });

      return { success: false, error: error.message };
    }
  }

  // Process daily schedule triggers
  async processDailyScheduleTriggers() {
    try {
      const rules = await prisma.autoPostRule.findMany({
        where: {
          triggerType: 'DAILY_SCHEDULE',
          isActive: true
        },
        include: {
          truck: true,
          template: true
        }
      });

      for (const rule of rules) {
        await this.executeAutoPostRule(rule, {});
      }
    } catch (error) {
      console.error('Error processing daily schedule triggers:', error);
    }
  }

  // Trigger arrival at location auto-post
  async triggerArrivalPost(truckId, locationData) {
    try {
      const rules = await prisma.autoPostRule.findMany({
        where: {
          truckId,
          triggerType: 'ARRIVAL_AT_LOCATION',
          isActive: true
        },
        include: {
          truck: true,
          template: true
        }
      });

      const results = [];
      for (const rule of rules) {
        const result = await this.executeAutoPostRule(rule, locationData);
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('Error triggering arrival post:', error);
      return [];
    }
  }

  // Trigger booking confirmed auto-post
  async triggerBookingConfirmedPost(truckId, bookingData) {
    try {
      const rules = await prisma.autoPostRule.findMany({
        where: {
          truckId,
          triggerType: 'BOOKING_CONFIRMED',
          isActive: true
        },
        include: {
          truck: true,
          template: true
        }
      });

      const results = [];
      for (const rule of rules) {
        const result = await this.executeAutoPostRule(rule, bookingData);
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('Error triggering booking confirmed post:', error);
      return [];
    }
  }

  // Execute an auto-post rule
  async executeAutoPostRule(rule, variables) {
    try {
      const { truck, template, platforms, delayMinutes } = rule;

      // Get content from template or generate default
      let content;
      if (template) {
        content = socialPublisher.renderTemplate(template.template, {
          truckName: truck.name,
          cuisineType: truck.cuisineType,
          ...variables
        });
      } else {
        // Generate default content based on trigger type
        content = this.generateDefaultContent(rule.triggerType, {
          truckName: truck.name,
          ...variables
        });
      }

      // Schedule or post immediately based on delay
      const scheduledFor = delayMinutes > 0
        ? new Date(Date.now() + delayMinutes * 60000)
        : null;

      // Create posts for each platform
      const posts = [];
      for (const platform of platforms) {
        const post = await prisma.socialPost.create({
          data: {
            truckId: truck.id,
            platform,
            content,
            type: this.getTriggerPostType(rule.triggerType),
            status: scheduledFor ? 'SCHEDULED' : 'DRAFT',
            scheduledFor,
            isAIGenerated: false
          }
        });

        // If no delay, publish immediately
        if (!scheduledFor) {
          await this.publishPost(post);
        }

        posts.push(post);
      }

      return {
        success: true,
        ruleId: rule.id,
        postsCreated: posts.length,
        posts
      };
    } catch (error) {
      console.error('Error executing auto-post rule:', error);
      return {
        success: false,
        ruleId: rule.id,
        error: error.message
      };
    }
  }

  // Generate default content based on trigger type
  generateDefaultContent(triggerType, variables) {
    switch (triggerType) {
      case 'ARRIVAL_AT_LOCATION':
        return socialPublisher.generateArrivalNotification(variables);
      case 'BOOKING_CONFIRMED':
        return socialPublisher.generateLocationAnnouncement(variables);
      case 'DAILY_SCHEDULE':
        return `Good morning! ${variables.truckName} is ready to serve you today! Check our schedule to find us near you. 🚚🌮`;
      default:
        return `${variables.truckName} has an update for you!`;
    }
  }

  // Map trigger type to post type
  getTriggerPostType(triggerType) {
    const mapping = {
      'ARRIVAL_AT_LOCATION': 'LOCATION_ANNOUNCEMENT',
      'BOOKING_CONFIRMED': 'LOCATION_ANNOUNCEMENT',
      'DAILY_SCHEDULE': 'CUSTOMER_ENGAGEMENT'
    };
    return mapping[triggerType] || 'CUSTOMER_ENGAGEMENT';
  }

  // Get all active rules for a truck
  async getActiveRules(truckId) {
    return prisma.autoPostRule.findMany({
      where: {
        truckId,
        isActive: true
      },
      include: {
        template: true
      }
    });
  }

  // Pause all auto-posting for a truck
  async pauseAllRules(truckId) {
    await prisma.autoPostRule.updateMany({
      where: { truckId },
      data: { isActive: false }
    });
  }

  // Resume all auto-posting for a truck
  async resumeAllRules(truckId) {
    await prisma.autoPostRule.updateMany({
      where: { truckId },
      data: { isActive: true }
    });
  }
}

const scheduler = new AutoPostScheduler();

module.exports = {
  autoPostScheduler: scheduler,
  initialize: () => scheduler.initialize(),
  triggerArrivalPost: (truckId, data) => scheduler.triggerArrivalPost(truckId, data),
  triggerBookingConfirmedPost: (truckId, data) => scheduler.triggerBookingConfirmedPost(truckId, data)
};
