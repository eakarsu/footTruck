const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all menus for a truck
router.get('/truck/:truckId', authenticate, async (req, res) => {
  try {
    const menus = await prisma.menu.findMany({
      where: { truckId: req.params.truckId },
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
router.get('/:id', authenticate, async (req, res) => {
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
router.post('/', authenticate, async (req, res) => {
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
router.put('/:id', authenticate, async (req, res) => {
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
router.delete('/:id', authenticate, async (req, res) => {
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
router.post('/:menuId/categories', authenticate, async (req, res) => {
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
router.put('/categories/:id', authenticate, async (req, res) => {
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
router.delete('/categories/:id', authenticate, async (req, res) => {
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
router.get('/truck/:truckId/items', authenticate, async (req, res) => {
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
router.post('/categories/:categoryId/items', authenticate, async (req, res) => {
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
router.put('/items/:id', authenticate, async (req, res) => {
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
router.patch('/items/:id/soldout', authenticate, async (req, res) => {
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
router.delete('/items/:id', authenticate, async (req, res) => {
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
router.get('/truck/:truckId/specials', authenticate, async (req, res) => {
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

module.exports = router;
