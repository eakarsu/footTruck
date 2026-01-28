const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all posts for a truck
router.get('/truck/:truckId', authenticate, async (req, res) => {
  try {
    const { platform, status, type } = req.query;

    const whereClause = { truckId: req.params.truckId };

    if (platform) {
      whereClause.platform = platform;
    }

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
    }

    const posts = await prisma.socialPost.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    res.json(posts);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to get posts' });
  }
});

// Get single post
router.get('/:id', authenticate, async (req, res) => {
  try {
    const post = await prisma.socialPost.findUnique({
      where: { id: req.params.id }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Failed to get post' });
  }
});

// Create post
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      truckId, platform, content, imageUrl, scheduledFor, type, isAIGenerated
    } = req.body;

    const post = await prisma.socialPost.create({
      data: {
        truckId,
        platform,
        content,
        imageUrl,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status: scheduledFor ? 'SCHEDULED' : 'DRAFT',
        type,
        isAIGenerated: isAIGenerated || false
      }
    });

    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Update post
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { platform, content, imageUrl, scheduledFor, type, status } = req.body;

    const post = await prisma.socialPost.update({
      where: { id: req.params.id },
      data: {
        platform,
        content,
        imageUrl,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        type,
        status
      }
    });

    res.json(post);
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Publish post now
router.patch('/:id/publish', authenticate, async (req, res) => {
  try {
    // In real implementation, this would connect to social media APIs
    const post = await prisma.socialPost.update({
      where: { id: req.params.id },
      data: {
        status: 'POSTED',
        postedAt: new Date()
      }
    });

    res.json(post);
  } catch (error) {
    console.error('Publish post error:', error);
    res.status(500).json({ error: 'Failed to publish post' });
  }
});

// Delete post
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.socialPost.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Get scheduled posts
router.get('/truck/:truckId/scheduled', authenticate, async (req, res) => {
  try {
    const posts = await prisma.socialPost.findMany({
      where: {
        truckId: req.params.truckId,
        status: 'SCHEDULED',
        scheduledFor: {
          gte: new Date()
        }
      },
      orderBy: { scheduledFor: 'asc' }
    });

    res.json(posts);
  } catch (error) {
    console.error('Get scheduled posts error:', error);
    res.status(500).json({ error: 'Failed to get scheduled posts' });
  }
});

// Get analytics
router.get('/truck/:truckId/analytics', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause = {
      truckId: req.params.truckId,
      status: 'POSTED'
    };

    if (startDate && endDate) {
      whereClause.postedAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const posts = await prisma.socialPost.findMany({
      where: whereClause
    });

    const analytics = {
      totalPosts: posts.length,
      totalLikes: posts.reduce((sum, p) => sum + p.likes, 0),
      totalComments: posts.reduce((sum, p) => sum + p.comments, 0),
      totalShares: posts.reduce((sum, p) => sum + p.shares, 0),
      totalReach: posts.reduce((sum, p) => sum + p.reach, 0),
      byPlatform: {},
      byType: {}
    };

    // Group by platform
    posts.forEach(p => {
      if (!analytics.byPlatform[p.platform]) {
        analytics.byPlatform[p.platform] = {
          posts: 0, likes: 0, comments: 0, shares: 0, reach: 0
        };
      }
      analytics.byPlatform[p.platform].posts++;
      analytics.byPlatform[p.platform].likes += p.likes;
      analytics.byPlatform[p.platform].comments += p.comments;
      analytics.byPlatform[p.platform].shares += p.shares;
      analytics.byPlatform[p.platform].reach += p.reach;
    });

    // Group by type
    posts.forEach(p => {
      if (!analytics.byType[p.type]) {
        analytics.byType[p.type] = {
          posts: 0, likes: 0, comments: 0, shares: 0, reach: 0
        };
      }
      analytics.byType[p.type].posts++;
      analytics.byType[p.type].likes += p.likes;
      analytics.byType[p.type].comments += p.comments;
      analytics.byType[p.type].shares += p.shares;
      analytics.byType[p.type].reach += p.reach;
    });

    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Create location announcement post
router.post('/truck/:truckId/location-announcement', authenticate, async (req, res) => {
  try {
    const { platforms, locationName, address, date, startTime, endTime } = req.body;

    const content = `📍 Find us today at ${locationName}!\n\n` +
      `📅 ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n` +
      `⏰ ${startTime} - ${endTime}\n` +
      `📍 ${address}\n\n` +
      `Come hungry! 🌮🍔`;

    const posts = await Promise.all(
      platforms.map(platform =>
        prisma.socialPost.create({
          data: {
            truckId: req.params.truckId,
            platform,
            content,
            type: 'LOCATION_ANNOUNCEMENT',
            status: 'DRAFT'
          }
        })
      )
    );

    res.status(201).json(posts);
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// Create daily menu post
router.post('/truck/:truckId/menu-post', authenticate, async (req, res) => {
  try {
    const { platforms, menuItems, specials } = req.body;

    let content = `🍽️ Today's Menu!\n\n`;

    if (specials && specials.length > 0) {
      content += `⭐ SPECIALS ⭐\n`;
      specials.forEach(s => {
        content += `• ${s.name} - $${s.price.toFixed(2)}\n`;
      });
      content += `\n`;
    }

    if (menuItems && menuItems.length > 0) {
      content += `📋 Featured Items:\n`;
      menuItems.forEach(item => {
        content += `• ${item.name} - $${item.price.toFixed(2)}\n`;
      });
    }

    content += `\nSee you soon! 🙌`;

    const posts = await Promise.all(
      platforms.map(platform =>
        prisma.socialPost.create({
          data: {
            truckId: req.params.truckId,
            platform,
            content,
            type: 'DAILY_MENU',
            status: 'DRAFT'
          }
        })
      )
    );

    res.status(201).json(posts);
  } catch (error) {
    console.error('Create menu post error:', error);
    res.status(500).json({ error: 'Failed to create menu post' });
  }
});

// ==================== SOCIAL TEMPLATES ====================

// Get all templates for a truck
router.get('/truck/:truckId/templates', authenticate, async (req, res) => {
  try {
    const templates = await prisma.socialTemplate.findMany({
      where: { truckId: req.params.truckId },
      orderBy: { name: 'asc' }
    });
    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Get single template
router.get('/templates/:id', authenticate, async (req, res) => {
  try {
    const template = await prisma.socialTemplate.findUnique({
      where: { id: req.params.id }
    });
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// Create template
router.post('/truck/:truckId/templates', authenticate, async (req, res) => {
  try {
    const { name, type, template, platforms, isDefault } = req.body;

    // If setting as default, unset other defaults of same type
    if (isDefault) {
      await prisma.socialTemplate.updateMany({
        where: { truckId: req.params.truckId, type, isDefault: true },
        data: { isDefault: false }
      });
    }

    const newTemplate = await prisma.socialTemplate.create({
      data: {
        truckId: req.params.truckId,
        name,
        type,
        template,
        platforms: platforms || [],
        isDefault: isDefault || false
      }
    });

    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/templates/:id', authenticate, async (req, res) => {
  try {
    const { name, type, template, platforms, isDefault, isActive } = req.body;

    const existingTemplate = await prisma.socialTemplate.findUnique({
      where: { id: req.params.id }
    });

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // If setting as default, unset other defaults of same type
    if (isDefault) {
      await prisma.socialTemplate.updateMany({
        where: {
          truckId: existingTemplate.truckId,
          type: type || existingTemplate.type,
          isDefault: true,
          id: { not: req.params.id }
        },
        data: { isDefault: false }
      });
    }

    const updated = await prisma.socialTemplate.update({
      where: { id: req.params.id },
      data: { name, type, template, platforms, isDefault, isActive }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template
router.delete('/templates/:id', authenticate, async (req, res) => {
  try {
    await prisma.socialTemplate.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ==================== AUTO-POST RULES ====================

// Get all auto-post rules for a truck
router.get('/truck/:truckId/auto-rules', authenticate, async (req, res) => {
  try {
    const rules = await prisma.autoPostRule.findMany({
      where: { truckId: req.params.truckId },
      include: { template: true },
      orderBy: { triggerType: 'asc' }
    });
    res.json(rules);
  } catch (error) {
    console.error('Get auto rules error:', error);
    res.status(500).json({ error: 'Failed to get auto-post rules' });
  }
});

// Create auto-post rule
router.post('/truck/:truckId/auto-rules', authenticate, async (req, res) => {
  try {
    const { triggerType, platforms, templateId, delayMinutes } = req.body;

    const rule = await prisma.autoPostRule.create({
      data: {
        truckId: req.params.truckId,
        triggerType,
        platforms: platforms || [],
        templateId: templateId || null,
        delayMinutes: delayMinutes || 0
      },
      include: { template: true }
    });

    res.status(201).json(rule);
  } catch (error) {
    console.error('Create auto rule error:', error);
    res.status(500).json({ error: 'Failed to create auto-post rule' });
  }
});

// Update auto-post rule
router.put('/auto-rules/:id', authenticate, async (req, res) => {
  try {
    const { triggerType, platforms, templateId, delayMinutes, isActive } = req.body;

    const rule = await prisma.autoPostRule.update({
      where: { id: req.params.id },
      data: { triggerType, platforms, templateId, delayMinutes, isActive },
      include: { template: true }
    });

    res.json(rule);
  } catch (error) {
    console.error('Update auto rule error:', error);
    res.status(500).json({ error: 'Failed to update auto-post rule' });
  }
});

// Delete auto-post rule
router.delete('/auto-rules/:id', authenticate, async (req, res) => {
  try {
    await prisma.autoPostRule.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Auto-post rule deleted successfully' });
  } catch (error) {
    console.error('Delete auto rule error:', error);
    res.status(500).json({ error: 'Failed to delete auto-post rule' });
  }
});

// Toggle auto-post rule active status
router.patch('/auto-rules/:id/toggle', authenticate, async (req, res) => {
  try {
    const existing = await prisma.autoPostRule.findUnique({
      where: { id: req.params.id }
    });

    const rule = await prisma.autoPostRule.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
      include: { template: true }
    });

    res.json(rule);
  } catch (error) {
    console.error('Toggle auto rule error:', error);
    res.status(500).json({ error: 'Failed to toggle auto-post rule' });
  }
});

// Trigger arrival auto-post manually
router.post('/truck/:truckId/trigger-arrival', authenticate, async (req, res) => {
  try {
    const { locationName, address, startTime, endTime } = req.body;
    const { triggerArrivalPost } = require('../services/autoPostScheduler');

    const results = await triggerArrivalPost(req.params.truckId, {
      locationName,
      address,
      startTime,
      endTime
    });

    res.json({
      message: 'Arrival posts triggered',
      results
    });
  } catch (error) {
    console.error('Trigger arrival error:', error);
    res.status(500).json({ error: 'Failed to trigger arrival posts' });
  }
});

// ==================== SOCIAL ACCOUNTS ====================

// Get all connected social accounts for a truck
router.get('/truck/:truckId/accounts', authenticate, async (req, res) => {
  try {
    const accounts = await prisma.socialAccount.findMany({
      where: { truckId: req.params.truckId },
      select: {
        id: true,
        platform: true,
        accountId: true,
        accountName: true,
        isConnected: true,
        tokenExpiry: true
      }
    });
    res.json(accounts);
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to get social accounts' });
  }
});

// Connect social account (OAuth callback simulation)
router.post('/accounts/connect/:platform', authenticate, async (req, res) => {
  try {
    const { truckId, accountId, accountName, accessToken, refreshToken, tokenExpiry } = req.body;
    const { platform } = req.params;

    const account = await prisma.socialAccount.upsert({
      where: {
        truckId_platform: { truckId, platform }
      },
      update: {
        accountId,
        accountName,
        accessToken,
        refreshToken,
        tokenExpiry: tokenExpiry ? new Date(tokenExpiry) : null,
        isConnected: true
      },
      create: {
        truckId,
        platform,
        accountId,
        accountName,
        accessToken,
        refreshToken: refreshToken || null,
        tokenExpiry: tokenExpiry ? new Date(tokenExpiry) : null
      }
    });

    res.json({
      id: account.id,
      platform: account.platform,
      accountName: account.accountName,
      isConnected: account.isConnected
    });
  } catch (error) {
    console.error('Connect account error:', error);
    res.status(500).json({ error: 'Failed to connect social account' });
  }
});

// Disconnect social account
router.delete('/accounts/:id', authenticate, async (req, res) => {
  try {
    await prisma.socialAccount.update({
      where: { id: req.params.id },
      data: { isConnected: false, accessToken: '', refreshToken: null }
    });
    res.json({ message: 'Account disconnected successfully' });
  } catch (error) {
    console.error('Disconnect account error:', error);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

// Refresh account token
router.post('/accounts/:id/refresh', authenticate, async (req, res) => {
  try {
    // In production, this would call the platform's token refresh endpoint
    const account = await prisma.socialAccount.findUnique({
      where: { id: req.params.id }
    });

    if (!account || !account.refreshToken) {
      return res.status(400).json({ error: 'Cannot refresh token' });
    }

    // Simulate token refresh
    const newExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

    await prisma.socialAccount.update({
      where: { id: req.params.id },
      data: { tokenExpiry: newExpiry }
    });

    res.json({ message: 'Token refreshed successfully', newExpiry });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

module.exports = router;
