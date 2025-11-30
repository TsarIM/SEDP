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

  async findNearby(req, res) {
    try {
      const { lat, lon, radius } = req.query;
      
      if (!lat || !lon) {
        return res.status(400).json({ error: 'Latitude and longitude required' });
      }

      const restaurants = await restaurantService.findNearbyRestaurants(
        parseFloat(lat),
        parseFloat(lon),
        radius ? parseFloat(radius) : 5
      );
      
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

  // MENU MANAGEMENT
  async createMenu(req, res) {
    try {
      const { id } = req.params;
      const menu = await restaurantService.createMenu(id, req.user.userId, req.body);
      res.status(201).json(menu);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getMenus(req, res) {
    try {
      const { id } = req.params;
      const menus = await restaurantService.getRestaurantMenus(id);
      res.status(200).json(menus);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateMenuStatus(req, res) {
    try {
      const { id, menuId } = req.params;
      const { is_active } = req.body;
      const menu = await restaurantService.updateMenuStatus(id, req.user.userId, menuId, is_active);
      res.status(200).json(menu);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // MENU ITEM MANAGEMENT
  async addMenuItem(req, res) {
    try {
      const { id, menuId } = req.params;
      const item = await restaurantService.addMenuItem(id, req.user.userId, menuId, req.body);
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getMenuItems(req, res) {
    try {
      const { id } = req.params;
      const { menuId } = req.query;
      const items = await restaurantService.getMenuItems(id, menuId);
      res.status(200).json(items);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getFullMenu(req, res) {
    try {
      const { id } = req.params;
      const menu = await restaurantService.getFullMenu(id);
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

  async updateMenuItem(req, res) {
    try {
      const { id, itemId } = req.params;
      const item = await restaurantService.updateMenuItem(id, req.user.userId, itemId, req.body);
      res.status(200).json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteMenuItem(req, res) {
    try {
      const { id, itemId } = req.params;
      const result = await restaurantService.deleteMenuItem(id, req.user.userId, itemId);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new RestaurantController();
