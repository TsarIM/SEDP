const restaurantService = require('./restaurant.service');

class RestaurantController {
  async createRestaurant(req, res) {
    try {
      const restaurant = await restaurantService.createRestaurant(req.user.userId, req.body);
      res.status(201).json(restaurant);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getRestaurant(req, res) {
    try {
      const restaurant = await restaurantService.getRestaurantById(req.params.id);
      res.status(200).json(restaurant);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async searchRestaurants(req, res) {
    try {
      const restaurants = await restaurantService.searchRestaurants(req.query);
      res.status(200).json(restaurants);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async setOpenStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_open } = req.body;
      const restaurant = await restaurantService.setOpenStatus(id, req.user.userId, is_open);
      res.status(200).json(restaurant);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async addMenuItem(req, res) {
    try {
      const { id } = req.params;
      const item = await restaurantService.addMenuItem(id, req.user.userId, req.body);
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getMenu(req, res) {
    try {
      const menu = await restaurantService.getMenu(req.params.id);
      res.status(200).json(menu);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateItemAvailability(req, res) {
    try {
      const { id, itemId } = req.params;
      const { available } = req.body;
      const item = await restaurantService.updateItemAvailability(id, req.user.userId, itemId, available);
      res.status(200).json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new RestaurantController();
