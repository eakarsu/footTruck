import { useState, useEffect } from 'react';
import { useTruck } from '../context/TruckContext';
import { menusAPI } from '../services/api';
import {
  UtensilsCrossed, Plus, Edit2, Trash2, X, Star, DollarSign,
  AlertCircle, Clock, Tag, ChevronDown, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Menu() {
  const { selectedTruck } = useTruck();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});

  const [menuForm, setMenuForm] = useState({ name: '', description: '', isActive: true, isDefault: false });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', sortOrder: 0 });
  const [itemForm, setItemForm] = useState({
    name: '', description: '', price: '', isAvailable: true, isSoldOut: false,
    isSpecial: false, specialPrice: '', calories: '', prepTime: '', allergens: '', tags: ''
  });

  useEffect(() => {
    if (selectedTruck) {
      loadMenus();
    }
  }, [selectedTruck]);

  const loadMenus = async () => {
    try {
      const res = await menusAPI.getByTruck(selectedTruck.id);
      setMenus(res.data);
      if (res.data.length > 0 && !selectedMenu) {
        setSelectedMenu(res.data[0]);
      }
    } catch (error) {
      console.error('Failed to load menus:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMenu = async (e) => {
    e.preventDefault();
    try {
      if (editingMenu) {
        await menusAPI.update(editingMenu.id, menuForm);
        toast.success('Menu updated');
      } else {
        await menusAPI.create({ ...menuForm, truckId: selectedTruck.id });
        toast.success('Menu created');
      }
      setShowMenuModal(false);
      setEditingMenu(null);
      setMenuForm({ name: '', description: '', isActive: true, isDefault: false });
      loadMenus();
    } catch (error) {
      toast.error('Failed to save menu');
    }
  };

  const handleDeleteMenu = async (id) => {
    if (!confirm('Delete this menu and all its items?')) return;
    try {
      await menusAPI.delete(id);
      toast.success('Menu deleted');
      if (selectedMenu?.id === id) setSelectedMenu(null);
      loadMenus();
    } catch (error) {
      toast.error('Failed to delete menu');
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await menusAPI.updateCategory(editingCategory.id, categoryForm);
        toast.success('Category updated');
      } else {
        await menusAPI.createCategory(selectedMenu.id, categoryForm);
        toast.success('Category created');
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', sortOrder: 0 });
      loadMenus();
    } catch (error) {
      toast.error('Failed to save category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Delete this category and all its items?')) return;
    try {
      await menusAPI.deleteCategory(id);
      toast.success('Category deleted');
      loadMenus();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    const data = {
      ...itemForm,
      allergens: itemForm.allergens ? itemForm.allergens.split(',').map(a => a.trim()) : [],
      tags: itemForm.tags ? itemForm.tags.split(',').map(t => t.trim()) : []
    };
    try {
      if (editingItem) {
        await menusAPI.updateItem(editingItem.id, data);
        toast.success('Item updated');
      } else {
        await menusAPI.createItem(selectedCategory.id, data);
        toast.success('Item created');
      }
      setShowItemModal(false);
      setEditingItem(null);
      setItemForm({
        name: '', description: '', price: '', isAvailable: true, isSoldOut: false,
        isSpecial: false, specialPrice: '', calories: '', prepTime: '', allergens: '', tags: ''
      });
      loadMenus();
    } catch (error) {
      toast.error('Failed to save item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Delete this menu item?')) return;
    try {
      await menusAPI.deleteItem(id);
      toast.success('Item deleted');
      loadMenus();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleToggleSoldOut = async (item) => {
    try {
      await menusAPI.toggleSoldOut(item.id);
      toast.success(item.isSoldOut ? 'Item available' : 'Marked as sold out');
      loadMenus();
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const openEditMenu = (menu) => {
    setEditingMenu(menu);
    setMenuForm({
      name: menu.name,
      description: menu.description || '',
      isActive: menu.isActive,
      isDefault: menu.isDefault
    });
    setShowMenuModal(true);
  };

  const openEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description || '',
      sortOrder: cat.sortOrder
    });
    setShowCategoryModal(true);
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      isAvailable: item.isAvailable,
      isSoldOut: item.isSoldOut,
      isSpecial: item.isSpecial,
      specialPrice: item.specialPrice?.toString() || '',
      calories: item.calories?.toString() || '',
      prepTime: item.prepTime?.toString() || '',
      allergens: (item.allergens || []).join(', '),
      tags: (item.tags || []).join(', ')
    });
    setShowItemModal(true);
  };

  const openAddItem = (category) => {
    setSelectedCategory(category);
    setEditingItem(null);
    setItemForm({
      name: '', description: '', price: '', isAvailable: true, isSoldOut: false,
      isSpecial: false, specialPrice: '', calories: '', prepTime: '', allergens: '', tags: ''
    });
    setShowItemModal(true);
  };

  const toggleCategory = (catId) => {
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const currentMenu = menus.find(m => m.id === selectedMenu?.id) || selectedMenu;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
        <button
          onClick={() => {
            setEditingMenu(null);
            setMenuForm({ name: '', description: '', isActive: true, isDefault: false });
            setShowMenuModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Menu
        </button>
      </div>

      {/* Menu Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {menus.map(menu => (
          <button
            key={menu.id}
            onClick={() => setSelectedMenu(menu)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap flex items-center gap-2 ${
              selectedMenu?.id === menu.id
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {menu.name}
            {menu.isDefault && <Star className="h-4 w-4" />}
            {!menu.isActive && <span className="text-xs opacity-75">(Inactive)</span>}
          </button>
        ))}
      </div>

      {currentMenu ? (
        <div className="space-y-4">
          {/* Menu Header */}
          <div className="card p-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{currentMenu.name}</h2>
              {currentMenu.description && (
                <p className="text-gray-500 text-sm">{currentMenu.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setEditingCategory(null);
                  setCategoryForm({ name: '', description: '', sortOrder: 0 });
                  setShowCategoryModal(true);
                }}
                className="btn btn-secondary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </button>
              <button onClick={() => openEditMenu(currentMenu)} className="btn btn-secondary">
                <Edit2 className="h-4 w-4" />
              </button>
              <button onClick={() => handleDeleteMenu(currentMenu.id)} className="btn btn-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Categories and Items */}
          {currentMenu.categories?.map(category => (
            <div key={category.id} className="card overflow-hidden">
              <div
                className="p-4 bg-gray-50 flex items-center justify-between cursor-pointer"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedCategories[category.id] ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.items?.length || 0} items</p>
                  </div>
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openAddItem(category)} className="btn btn-primary text-sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </button>
                  <button onClick={() => openEditCategory(category)} className="p-2 hover:bg-gray-200 rounded">
                    <Edit2 className="h-4 w-4 text-gray-500" />
                  </button>
                  <button onClick={() => handleDeleteCategory(category.id)} className="p-2 hover:bg-gray-200 rounded">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </div>

              {expandedCategories[category.id] && (
                <div className="divide-y divide-gray-200">
                  {category.items?.map(item => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${item.isSoldOut ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            {item.name}
                          </span>
                          {item.isSpecial && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">Special</span>
                          )}
                          {item.isSoldOut && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Sold Out</span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          {item.calories && (
                            <span>{item.calories} cal</span>
                          )}
                          {item.prepTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.prepTime} min
                            </span>
                          )}
                          {item.allergens?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {item.allergens.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {item.isSpecial && item.specialPrice ? (
                            <>
                              <span className="line-through text-gray-400 text-sm">${item.price.toFixed(2)}</span>
                              <span className="font-bold text-green-600 ml-2">${item.specialPrice.toFixed(2)}</span>
                            </>
                          ) : (
                            <span className="font-bold text-gray-900">${item.price.toFixed(2)}</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleToggleSoldOut(item)}
                            className={`px-3 py-1.5 rounded text-sm font-medium ${
                              item.isSoldOut
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            {item.isSoldOut ? 'Mark Available' : 'Sold Out'}
                          </button>
                          <button onClick={() => openEditItem(item)} className="p-1.5 hover:bg-gray-100 rounded">
                            <Edit2 className="h-4 w-4 text-gray-500" />
                          </button>
                          <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 hover:bg-gray-100 rounded">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!category.items || category.items.length === 0) && (
                    <div className="p-8 text-center text-gray-500">
                      No items in this category
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {(!currentMenu.categories || currentMenu.categories.length === 0) && (
            <div className="card p-8 text-center">
              <UtensilsCrossed className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No categories yet. Add your first category to get started.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <UtensilsCrossed className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No menus created yet</p>
        </div>
      )}

      {/* Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editingMenu ? 'Edit Menu' : 'Create Menu'}</h2>
              <button onClick={() => setShowMenuModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMenu} className="p-4 space-y-4">
              <div>
                <label className="label">Menu Name</label>
                <input
                  type="text"
                  value={menuForm.name}
                  onChange={e => setMenuForm({ ...menuForm, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={menuForm.description}
                  onChange={e => setMenuForm({ ...menuForm, description: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={menuForm.isActive}
                    onChange={e => setMenuForm({ ...menuForm, isActive: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Active
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={menuForm.isDefault}
                    onChange={e => setMenuForm({ ...menuForm, isDefault: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Default Menu
                </label>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowMenuModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingMenu ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-4 space-y-4">
              <div>
                <label className="label">Category Name</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editingItem ? 'Edit Item' : 'Add Item'}</h2>
              <button onClick={() => setShowItemModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="p-4 space-y-4">
              <div>
                <label className="label">Item Name</label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.price}
                    onChange={e => setItemForm({ ...itemForm, price: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Special Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.specialPrice}
                    onChange={e => setItemForm({ ...itemForm, specialPrice: e.target.value })}
                    className="input"
                    disabled={!itemForm.isSpecial}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Calories</label>
                  <input
                    type="number"
                    value={itemForm.calories}
                    onChange={e => setItemForm({ ...itemForm, calories: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Prep Time (min)</label>
                  <input
                    type="number"
                    value={itemForm.prepTime}
                    onChange={e => setItemForm({ ...itemForm, prepTime: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="label">Allergens (comma-separated)</label>
                <input
                  type="text"
                  value={itemForm.allergens}
                  onChange={e => setItemForm({ ...itemForm, allergens: e.target.value })}
                  className="input"
                  placeholder="gluten, dairy, nuts"
                />
              </div>
              <div>
                <label className="label">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={itemForm.tags}
                  onChange={e => setItemForm({ ...itemForm, tags: e.target.value })}
                  className="input"
                  placeholder="popular, vegan, spicy"
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={itemForm.isAvailable}
                    onChange={e => setItemForm({ ...itemForm, isAvailable: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Available
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={itemForm.isSpecial}
                    onChange={e => setItemForm({ ...itemForm, isSpecial: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Daily Special
                </label>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowItemModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
