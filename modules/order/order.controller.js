const orderService = require('./order.service');

class OrderController {
  
  // CART ENDPOINTS
  async addToCart(req, res) {
    try {
      const { menuItemId, qty } = req.body;
      
      if (!menuItemId || !qty || qty < 1) {
        return res.status(400).json({ error: 'Invalid menu item or quantity' });
      }

      const cart = await orderService.addItemToCart(req.user.userId, menuItemId, qty);
      res.status(200).json(cart);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getCart(req, res) {
    try {
      const cart = await orderService.getCart(req.user.userId);
      res.status(200).json(cart);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async removeFromCart(req, res) {
    try {
      const { menuItemId } = req.params;
      const cart = await orderService.removeItemFromCart(req.user.userId, menuItemId);
      res.status(200).json(cart);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async clearCart(req, res) {
    try {
      const result = await orderService.clearCart(req.user.userId);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // ORDER ENDPOINTS
  async createOrder(req, res) {
    try {
      const order = await orderService.createOrderFromCart(req.user.userId, req.body);
      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async processPayment(req, res) {
    try {
      const { orderId } = req.params;
      const result = await orderService.processPayment(orderId, req.user.userId, req.body);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getOrder(req, res) {
    try {
      const { orderId } = req.params;
      const order = await orderService.getOrderById(orderId, req.user.userId);
      res.status(200).json(order);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async listOrders(req, res) {
    try {
      const orders = await orderService.listOrders(req.user.userId, req.query);
      res.status(200).json(orders);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;
      const order = await orderService.cancelOrder(orderId, req.user.userId);
      res.status(200).json(order);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      
      const order = await orderService.updateOrderStatus(
        orderId,
        status,
        req.user.role,
        req.user.userId
      );
      
      res.status(200).json(order);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getRestaurantOrders(req, res) {
    try {
      const { restaurantId } = req.params;
      const orders = await orderService.getRestaurantOrders(
        restaurantId,
        req.user.userId,
        req.query
      );
      res.status(200).json(orders);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new OrderController();
