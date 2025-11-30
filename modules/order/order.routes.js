const express = require('express');
const router = express.Router();
const orderController = require('./order.controller');
const { authenticate, authorize } = require('../../middleware/auth');

// CART ROUTES
router.post('/cart', authenticate, orderController.addToCart);
router.get('/cart', authenticate, orderController.getCart);
router.delete('/cart/:menuItemId', authenticate, orderController.removeFromCart);
router.delete('/cart', authenticate, orderController.clearCart);

// ORDER ROUTES (Customer)
router.post('/', authenticate, orderController.createOrder);
router.post('/:orderId/payment', authenticate, orderController.processPayment);
router.get('/:orderId', authenticate, orderController.getOrder);
router.get('/', authenticate, orderController.listOrders);
router.patch('/:orderId/cancel', authenticate, orderController.cancelOrder);

// ORDER ROUTES (Owner/Admin)
router.patch('/:orderId/status', authenticate, authorize('owner', 'admin'), orderController.updateOrderStatus);
router.get('/restaurant/:restaurantId', authenticate, authorize('owner', 'admin'), orderController.getRestaurantOrders);

module.exports = router;
