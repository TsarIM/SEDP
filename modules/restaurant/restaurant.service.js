const { ObjectId } = require('mongodb');
const { getDB } = require('../../config/db');

class RestaurantService {
  async createRestaurant(ownerId, restaurantData) {
    const db = getDB();
    const { name, address, lat, lon, is_open = true } = restaurantData;

    const newRestaurant = {
      owner_id: new ObjectId(ownerId),
      name,
      address,
      lat,
      lon,
      is_open,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await db.collection('restaurants').insertOne(newRestaurant);
    return { restaurantId: result.insertedId, ...newRestaurant };
  }

  async getRestaurantById(restaurantId) {
    const db = getDB();
    const restaurant = await db.collection('restaurants').findOne({ _id: new ObjectId(restaurantId) });

    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    return restaurant;
  }

  async searchRestaurants(query = {}) {
    const db = getDB();
    const filter = {};

    if (query.name) {
      filter.name = { $regex: query.name, $options: 'i' };
    }

    const restaurants = await db.collection('restaurants').find(filter).toArray();
    return restaurants;
  }

  async findNearbyRestaurants(lat, lon, radiusKm = 5) {
    const db = getDB();
    
    // Simple distance calculation (for more accuracy, use MongoDB geospatial queries)
    const restaurants = await db.collection('restaurants').find({ is_open: true }).toArray();
    
    const nearby = restaurants.filter(restaurant => {
      const distance = this.calculateDistance(lat, lon, restaurant.lat, restaurant.lon);
      return distance <= radiusKm;
    });

    return nearby;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula to calculate distance in km
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  async setOpenStatus(restaurantId, ownerId, isOpen) {
    const db = getDB();

    const result = await db.collection('restaurants').findOneAndUpdate(
      { _id: new ObjectId(restaurantId), owner_id: new ObjectId(ownerId) },
      { $set: { is_open: isOpen, updated_at: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Restaurant not found or unauthorized');
    }

    return result.value;
  }

  // MENU MANAGEMENT
  async createMenu(restaurantId, ownerId, menuData) {
    const db = getDB();
    const { name, is_active = true } = menuData;

    // Verify ownership
    const restaurant = await db.collection('restaurants').findOne({
      _id: new ObjectId(restaurantId),
      owner_id: new ObjectId(ownerId)
    });

    if (!restaurant) {
      throw new Error('Restaurant not found or unauthorized');
    }

    const newMenu = {
      restaurant_id: new ObjectId(restaurantId),
      name,
      is_active,
      created_at: new Date()
    };

    const result = await db.collection('menus').insertOne(newMenu);
    return { menuId: result.insertedId, ...newMenu };
  }

  async getRestaurantMenus(restaurantId) {
    const db = getDB();
    const menus = await db.collection('menus')
      .find({ restaurant_id: new ObjectId(restaurantId) })
      .toArray();

    return menus;
  }

  async updateMenuStatus(restaurantId, ownerId, menuId, isActive) {
    const db = getDB();

    // Verify ownership
    const restaurant = await db.collection('restaurants').findOne({
      _id: new ObjectId(restaurantId),
      owner_id: new ObjectId(ownerId)
    });

    if (!restaurant) {
      throw new Error('Unauthorized');
    }

    const result = await db.collection('menus').findOneAndUpdate(
      { _id: new ObjectId(menuId), restaurant_id: new ObjectId(restaurantId) },
      { $set: { is_active: isActive } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Menu not found');
    }

    return result.value;
  }

  // MENU ITEM MANAGEMENT
  async addMenuItem(restaurantId, ownerId, menuId, itemData) {
    const db = getDB();
    const { name, description, price_cents, currency = 'INR', available = true, tags = [] } = itemData;

    // Verify ownership
    const restaurant = await db.collection('restaurants').findOne({
      _id: new ObjectId(restaurantId),
      owner_id: new ObjectId(ownerId)
    });

    if (!restaurant) {
      throw new Error('Restaurant not found or unauthorized');
    }

    // Verify menu belongs to restaurant
    const menu = await db.collection('menus').findOne({
      _id: new ObjectId(menuId),
      restaurant_id: new ObjectId(restaurantId)
    });

    if (!menu) {
      throw new Error('Menu not found for this restaurant');
    }

    const newItem = {
      menu_id: new ObjectId(menuId),
      restaurant_id: new ObjectId(restaurantId),
      name,
      description,
      price_cents,
      currency,
      available,
      tags
    };

    const result = await db.collection('menu_items').insertOne(newItem);
    return { itemId: result.insertedId, ...newItem };
  }

  async getMenuItems(restaurantId, menuId = null) {
    const db = getDB();
    
    const filter = { restaurant_id: new ObjectId(restaurantId) };
    if (menuId) {
      filter.menu_id = new ObjectId(menuId);
    }

    const items = await db.collection('menu_items')
      .find(filter)
      .toArray();

    return items;
  }

  async getFullMenu(restaurantId) {
    const db = getDB();
    
    // Get all active menus
    const menus = await db.collection('menus')
      .find({ restaurant_id: new ObjectId(restaurantId), is_active: true })
      .toArray();

    // Get all items for each menu
    const menusWithItems = await Promise.all(
      menus.map(async (menu) => {
        const items = await db.collection('menu_items')
          .find({ menu_id: menu._id })
          .toArray();
        
        return {
          ...menu,
          items
        };
      })
    );

    return menusWithItems;
  }

  async updateItemAvailability(restaurantId, ownerId, itemId, available) {
    const db = getDB();

    // Verify ownership
    const restaurant = await db.collection('restaurants').findOne({
      _id: new ObjectId(restaurantId),
      owner_id: new ObjectId(ownerId)
    });

    if (!restaurant) {
      throw new Error('Unauthorized');
    }

    const result = await db.collection('menu_items').findOneAndUpdate(
      { _id: new ObjectId(itemId), restaurant_id: new ObjectId(restaurantId) },
      { $set: { available } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Menu item not found');
    }

    return result.value;
  }

  async updateMenuItem(restaurantId, ownerId, itemId, updates) {
    const db = getDB();

    // Verify ownership
    const restaurant = await db.collection('restaurants').findOne({
      _id: new ObjectId(restaurantId),
      owner_id: new ObjectId(ownerId)
    });

    if (!restaurant) {
      throw new Error('Unauthorized');
    }

    const { name, description, price_cents, available, tags } = updates;
    const updateData = {
      ...(name && { name }),
      ...(description && { description }),
      ...(price_cents && { price_cents }),
      ...(available !== undefined && { available }),
      ...(tags && { tags })
    };

    const result = await db.collection('menu_items').findOneAndUpdate(
      { _id: new ObjectId(itemId), restaurant_id: new ObjectId(restaurantId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Menu item not found');
    }

    return result.value;
  }

  async deleteMenuItem(restaurantId, ownerId, itemId) {
    const db = getDB();

    // Verify ownership
    const restaurant = await db.collection('restaurants').findOne({
      _id: new ObjectId(restaurantId),
      owner_id: new ObjectId(ownerId)
    });

    if (!restaurant) {
      throw new Error('Unauthorized');
    }

    const result = await db.collection('menu_items').deleteOne({
      _id: new ObjectId(itemId),
      restaurant_id: new ObjectId(restaurantId)
    });

    if (result.deletedCount === 0) {
      throw new Error('Menu item not found');
    }

    return { message: 'Menu item deleted successfully' };
  }
}

module.exports = new RestaurantService();
