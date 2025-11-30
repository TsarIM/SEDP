const express = require('express');
const router = express.Router();
const restaurantController = require('./restaurant.controller');
const { authenticate, authorize } = require('../../middleware/auth');

router.post('/', authenticate, authorize('owner', 'admin'), restaurantController.createRestaurant);
router.get('/search', restaurantController.searchRestaurants);
router.get('/:id', restaurantController.getRestaurant);
router.patch('/:id/status', authenticate, authorize('owner'), restaurantController.setOpenStatus);
router.post('/:id/menu', authenticate, authorize('owner'), restaurantController.addMenuItem);
router.get('/:id/menu', restaurantController.getMenu);
router.patch('/:id/menu/:itemId', authenticate, authorize('owner'), restaurantController.updateItemAvailability);

module.exports = router;
