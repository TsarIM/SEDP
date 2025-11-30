const express = require('express');
const router = express.Router();
const restaurantController = require('./restaurant.controller');
const { authenticate, authorize } = require('../../middleware/auth');

// Restaurant CRUD
router.post('/', authenticate, authorize('owner', 'admin'), restaurantController.createRestaurant);
router.get('/search', restaurantController.searchRestaurants);
router.get('/nearby', restaurantController.findNearby);
router.get('/:id', restaurantController.getRestaurant);
router.patch('/:id/status', authenticate, authorize('owner'), restaurantController.setOpenStatus);

// Menu Management
router.post('/:id/menus', authenticate, authorize('owner'), restaurantController.createMenu);
router.get('/:id/menus', restaurantController.getMenus);
router.patch('/:id/menus/:menuId/status', authenticate, authorize('owner'), restaurantController.updateMenuStatus);

// Menu Items
router.post('/:id/menus/:menuId/items', authenticate, authorize('owner'), restaurantController.addMenuItem);
router.get('/:id/items', restaurantController.getMenuItems);
router.get('/:id/menu', restaurantController.getFullMenu);
router.patch('/:id/items/:itemId/availability', authenticate, authorize('owner'), restaurantController.updateItemAvailability);
router.patch('/:id/items/:itemId', authenticate, authorize('owner'), restaurantController.updateMenuItem);
router.delete('/:id/items/:itemId', authenticate, authorize('owner'), restaurantController.deleteMenuItem);

module.exports = router;
