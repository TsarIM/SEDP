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

  async addMenuItem(restaurantId, ownerId, itemData) {
    const db = getDB();
    const { name, description, price_cents, currency = 'INR', available = true, tags = [] } = itemData;

    const restaurant = await db.collection('restaurants').findOne({
      _id: new ObjectId(restaurantId),
      owner_id: new ObjectId(ownerId)
    });

    if (!restaurant) {
      throw new Error('Restaurant not found or unauthorized');
    }

    const newItem = {
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

  async getMenu(restaurantId) {
    const db = getDB();
    const items = await db.collection('menu_items')
      .find({ restaurant_id: new ObjectId(restaurantId) })
      .toArray();

    return items;
  }

  async updateItemAvailability(restaurantId, ownerId, itemId, available) {
    const db = getDB();

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
}

module.exports = new RestaurantService();
