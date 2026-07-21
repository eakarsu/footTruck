const express = require('express');
const { authenticate } = require('../middleware/auth');
const { assertTruckAccess, requireTruckAccess } = require('../middleware/truckAccess');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');
const { sendCSV, sendPDF } = require('../utils/exportHelpers');
const { exportLimiter } = require('../middleware/rateLimiter');
const prisma = require('../lib/prisma');

const router = express.Router();
function requireRelatedTruckAccess(required, resolveTruckIds) {
  return async (req, _res, next) => {
    try {
      const truckIds = [...new Set((await resolveTruckIds(req)).filter(Boolean))];
      if (!truckIds.length) {
        const error = new Error('Menu resource not found');
        error.status = 404;
        throw error;
      }
      await Promise.all(truckIds.map((truckId) => assertTruckAccess(req.user, truckId, required)));
      next();
    } catch (error) {
      next(error);
    }
  };
}

const menuTruckIds = async (req) => {
  const menu = await prisma.menu.findUnique({ where: { id: req.params.id || req.params.menuId }, select: { truckId: true } });
  return menu ? [menu.truckId] : [];
};

const categoryTruckIds = async (req) => {
  const category = await prisma.menuCategory.findUnique({
    where: { id: req.params.id || req.params.categoryId },
    select: { menu: { select: { truckId: true } } },
  });
  return category ? [category.menu.truckId] : [];
};

const itemTruckIds = async (req) => {
  const ids = req.body.ids || [req.params.id];
  const items = await prisma.menuItem.findMany({
    where: { id: { in: ids } },
    select: { category: { select: { menu: { select: { truckId: true } } } } },
  });
  if (items.length !== ids.length) return [];
  return items.map((item) => item.category.menu.truckId);
};

// Get all menus for a truck (with search)
router.get('/truck/:truckId', authenticate, requireTruckAccess('VIEWER'), async (req, res) => {
  try {
    const { search } = req.query;

    const whereClause = { truckId: req.params.truckId };
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const menus = await prisma.menu.findMany({
      where: whereClause,
      include: {
        categories: {
          include: { items: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
    res.json(menus);
  } catch (error) {
    console.error('Get menus error:', error);
    res.status(500).json({ error: 'Failed to get menus' });
  }
});

// Get single menu
router.get('/:id', authenticate, requireRelatedTruckAccess('VIEWER', menuTruckIds), async (req, res) => {
  try {
    const menu = await prisma.menu.findUnique({
      where: { id: req.params.id },
      include: {
        categories: {
          include: { items: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    res.json(menu);
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ error: 'Failed to get menu' });
  }
});

// Create menu
router.post('/', authenticate, requireTruckAccess('MANAGER'), async (req, res) => {
  try {
    const { truckId, name, description, isActive, isDefault } = req.body;

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.menu.updateMany({
        where: { truckId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const menu = await prisma.menu.create({
      data: {
        truckId,
        name,
        description,
        isActive: isActive !== false,
        isDefault: isDefault || false
      }
    });

    res.status(201).json(menu);
  } catch (error) {
    console.error('Create menu error:', error);
    res.status(500).json({ error: 'Failed to create menu' });
  }
});

// Update menu
router.put('/:id', authenticate, requireRelatedTruckAccess('MANAGER', menuTruckIds), async (req, res) => {
  try {
    const { name, description, isActive, isDefault } = req.body;

    const currentMenu = await prisma.menu.findUnique({
      where: { id: req.params.id }
    });

    if (isDefault && !currentMenu.isDefault) {
      await prisma.menu.updateMany({
        where: { truckId: currentMenu.truckId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const menu = await prisma.menu.update({
      where: { id: req.params.id },
      data: { name, description, isActive, isDefault }
    });

    res.json(menu);
  } catch (error) {
    console.error('Update menu error:', error);
    res.status(500).json({ error: 'Failed to update menu' });
  }
});

// Delete menu
router.delete('/:id', authenticate, requireRelatedTruckAccess('MANAGER', menuTruckIds), async (req, res) => {
  try {
    await prisma.menu.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Menu deleted successfully' });
  } catch (error) {
    console.error('Delete menu error:', error);
    res.status(500).json({ error: 'Failed to delete menu' });
  }
});

// ==================== CATEGORIES ====================

// Create category
router.post('/:menuId/categories', authenticate, requireRelatedTruckAccess('MANAGER', menuTruckIds), async (req, res) => {
  try {
    const { name, description, sortOrder } = req.body;

    const category = await prisma.menuCategory.create({
      data: {
        menuId: req.params.menuId,
        name,
        description,
        sortOrder: sortOrder || 0
      }
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/categories/:id', authenticate, requireRelatedTruckAccess('MANAGER', categoryTruckIds), async (req, res) => {
  try {
    const { name, description, sortOrder } = req.body;

    const category = await prisma.menuCategory.update({
      where: { id: req.params.id },
      data: { name, description, sortOrder }
    });

    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/categories/:id', authenticate, requireRelatedTruckAccess('MANAGER', categoryTruckIds), async (req, res) => {
  try {
    await prisma.menuCategory.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ==================== MENU ITEMS ====================

// Get all items for a truck (across all menus)
router.get('/truck/:truckId/items', authenticate, requireTruckAccess('VIEWER'), async (req, res) => {
  try {
    const menus = await prisma.menu.findMany({
      where: { truckId: req.params.truckId },
      include: {
        categories: {
          include: { items: true }
        }
      }
    });

    const items = menus.flatMap(m =>
      m.categories.flatMap(c =>
        c.items.map(i => ({ ...i, menuName: m.name, categoryName: c.name }))
      )
    );

    res.json(items);
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Failed to get items' });
  }
});

// Create menu item
router.post('/categories/:categoryId/items', authenticate, requireRelatedTruckAccess('MANAGER', categoryTruckIds), async (req, res) => {
  try {
    const {
      name, description, price, image, isAvailable, isSoldOut,
      isSpecial, specialPrice, calories, allergens, tags, prepTime, sortOrder
    } = req.body;

    const item = await prisma.menuItem.create({
      data: {
        categoryId: req.params.categoryId,
        name,
        description,
        price: parseFloat(price),
        image,
        isAvailable: isAvailable !== false,
        isSoldOut: isSoldOut || false,
        isSpecial: isSpecial || false,
        specialPrice: specialPrice ? parseFloat(specialPrice) : null,
        calories: calories ? parseInt(calories) : null,
        allergens: allergens || [],
        tags: tags || [],
        prepTime: prepTime ? parseInt(prepTime) : null,
        sortOrder: sortOrder || 0
      }
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update menu item
router.put('/items/:id', authenticate, requireRelatedTruckAccess('MANAGER', itemTruckIds), async (req, res) => {
  try {
    const {
      name, description, price, image, isAvailable, isSoldOut,
      isSpecial, specialPrice, calories, allergens, tags, prepTime, sortOrder
    } = req.body;

    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        price: price ? parseFloat(price) : undefined,
        image,
        isAvailable,
        isSoldOut,
        isSpecial,
        specialPrice: specialPrice ? parseFloat(specialPrice) : null,
        calories: calories ? parseInt(calories) : null,
        allergens,
        tags,
        prepTime: prepTime ? parseInt(prepTime) : null,
        sortOrder
      }
    });

    res.json(item);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Toggle item sold out status
router.patch('/items/:id/soldout', authenticate, requireRelatedTruckAccess('OPERATOR', itemTruckIds), async (req, res) => {
  try {
    const item = await prisma.menuItem.findUnique({
      where: { id: req.params.id }
    });

    const updated = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: { isSoldOut: !item.isSoldOut }
    });

    res.json(updated);
  } catch (error) {
    console.error('Toggle sold out error:', error);
    res.status(500).json({ error: 'Failed to toggle sold out' });
  }
});

// Delete menu item
router.delete('/items/:id', authenticate, requireRelatedTruckAccess('MANAGER', itemTruckIds), async (req, res) => {
  try {
    await prisma.menuItem.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Get daily specials
router.get('/truck/:truckId/specials', authenticate, requireTruckAccess('VIEWER'), async (req, res) => {
  try {
    const menus = await prisma.menu.findMany({
      where: { truckId: req.params.truckId, isActive: true },
      include: {
        categories: {
          include: {
            items: {
              where: { isSpecial: true }
            }
          }
        }
      }
    });

    const specials = menus.flatMap(m =>
      m.categories.flatMap(c => c.items)
    );

    res.json(specials);
  } catch (error) {
    console.error('Get specials error:', error);
    res.status(500).json({ error: 'Failed to get specials' });
  }
});

// Public: Get menu items for a truck (for pre-order page)
router.get('/public/truck/:truckId/items', async (req, res) => {
  try {
    const items = await prisma.menuItem.findMany({
      where: {
        category: {
          menu: {
            truckId: req.params.truckId,
            isActive: true
          }
        },
        isAvailable: true,
        isSoldOut: false
      },
      include: {
        category: {
          select: { name: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const formattedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      isSpecial: item.isSpecial,
      specialPrice: item.specialPrice,
      categoryName: item.category?.name
    }));

    res.json(formattedItems);
  } catch (error) {
    console.error('Get public menu items error:', error);
    res.status(500).json({ error: 'Failed to get menu items' });
  }
});

// ==================== BULK OPERATIONS & EXPORTS ====================

// Bulk delete menu items
router.delete('/items/bulk-delete', authenticate, requireRelatedTruckAccess('MANAGER', itemTruckIds), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await prisma.menuItem.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${ids.length} items deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk delete items' });
  }
});

// Bulk update menu items
router.patch('/items/bulk-update', authenticate, requireRelatedTruckAccess('MANAGER', itemTruckIds), async (req, res) => {
  try {
    const { ids, data } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await prisma.menuItem.updateMany({ where: { id: { in: ids } }, data });
    res.json({ message: `${ids.length} items updated successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk update items' });
  }
});

// Export menu as CSV
router.get('/truck/:truckId/export/csv', authenticate, requireTruckAccess('VIEWER'), exportLimiter, async (req, res) => {
  try {
    const menus = await prisma.menu.findMany({
      where: { truckId: req.params.truckId },
      include: { categories: { include: { items: true } } }
    });
    const data = [];
    menus.forEach(m => {
      m.categories.forEach(c => {
        c.items.forEach(i => {
          data.push({
            menu: m.name, category: c.name, name: i.name, description: i.description || '',
            price: i.price, isAvailable: i.isAvailable, calories: i.calories || '',
            allergens: i.allergens.join(', '), tags: i.tags.join(', '), prepTime: i.prepTime || ''
          });
        });
      });
    });
    sendCSV(res, data, ['menu', 'category', 'name', 'description', 'price', 'isAvailable', 'calories', 'allergens', 'tags', 'prepTime'], 'menu-export');
  } catch (error) {
    res.status(500).json({ error: 'Failed to export menu' });
  }
});

// Export menu as PDF
router.get('/truck/:truckId/export/pdf', authenticate, requireTruckAccess('VIEWER'), exportLimiter, async (req, res) => {
  try {
    const menus = await prisma.menu.findMany({
      where: { truckId: req.params.truckId },
      include: { categories: { include: { items: true } } }
    });
    const columns = ['Menu', 'Category', 'Item', 'Price', 'Available', 'Calories'];
    const rows = [];
    menus.forEach(m => {
      m.categories.forEach(c => {
        c.items.forEach(i => {
          rows.push([m.name, c.name, i.name, `$${i.price.toFixed(2)}`, i.isAvailable ? 'Yes' : 'No', i.calories || '-']);
        });
      });
    });
    sendPDF(res, 'Menu Report', columns, rows, 'menu-export');
  } catch (error) {
    res.status(500).json({ error: 'Failed to export menu' });
  }
});

module.exports = router;
