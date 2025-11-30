const { ObjectId } = require('mongodb');
const { getDB } = require('../../config/db');

class OrderService {
  
  // CART MANAGEMENT
  async addItemToCart(userId, menuItemId, qty) {
    const db = getDB();

    // Get menu item details from restaurant service
    const menuItem = await db.collection('menu_items').findOne({ _id: new ObjectId(menuItemId) });
    if (!menuItem) {
      throw new Error('Menu item not found');
    }

    if (!menuItem.available) {
      throw new Error('Menu item is not available');
    }

    // Get or create cart
    let cart = await db.collection('carts').findOne({ user_id: new ObjectId(userId) });
    
    if (!cart) {
      cart = {
        user_id: new ObjectId(userId),
        created_at: new Date(),
        updated_at: new Date()
      };
      const result = await db.collection('carts').insertOne(cart);
      cart._id = result.insertedId;
    }

    // Check if item already exists in cart
    const existingCartItem = await db.collection('cart_items').findOne({
      cart_id: cart._id,
      menu_item_id: new ObjectId(menuItemId)
    });

    if (existingCartItem) {
      // Increment quantity
      await db.collection('cart_items').updateOne(
        { _id: existingCartItem._id },
        { $inc: { qty: qty } }
      );
    } else {
      // Add new item to cart
      const cartItem = {
        cart_id: cart._id,
        menu_item_id: new ObjectId(menuItemId),
        restaurant_id: menuItem.restaurant_id,
        name: menuItem.name,
        price_cents: menuItem.price_cents,
        qty: qty
      };
      await db.collection('cart_items').insertOne(cartItem);
    }

    // Update cart timestamp
    await db.collection('carts').updateOne(
      { _id: cart._id },
      { $set: { updated_at: new Date() } }
    );

    return this.getCart(userId);
  }

  async getCart(userId) {
    const db = getDB();
    
    const cart = await db.collection('carts').findOne({ user_id: new ObjectId(userId) });
    if (!cart) {
      return { items: [], total_cents: 0 };
    }

    const items = await db.collection('cart_items')
      .find({ cart_id: cart._id })
      .toArray();

    const total_cents = items.reduce((sum, item) => sum + (item.price_cents * item.qty), 0);

    return {
      cartId: cart._id,
      items,
      total_cents
    };
  }

  async removeItemFromCart(userId, menuItemId) {
    const db = getDB();
    
    const cart = await db.collection('carts').findOne({ user_id: new ObjectId(userId) });
    if (!cart) {
      throw new Error('Cart not found');
    }

    const result = await db.collection('cart_items').deleteOne({
      cart_id: cart._id,
      menu_item_id: new ObjectId(menuItemId)
    });

    if (result.deletedCount === 0) {
      throw new Error('Item not found in cart');
    }

    await db.collection('carts').updateOne(
      { _id: cart._id },
      { $set: { updated_at: new Date() } }
    );

    return this.getCart(userId);
  }

  async clearCart(userId) {
    const db = getDB();
    
    const cart = await db.collection('carts').findOne({ user_id: new ObjectId(userId) });
    if (!cart) {
      return { message: 'Cart already empty' };
    }
  
    await db.collection('cart_items').deleteMany({ cart_id: cart._id });
    await db.collection('carts').deleteOne({ _id: cart._id });
  
    return { message: 'Cart cleared successfully' };
  }
  

  // ORDER MANAGEMENT
  async createOrderFromCart(userId, orderData) {
    const db = getDB();

    const { delivery_address_id, payment_type = 'COD', special_instructions } = orderData;

    // Get cart
    const cartData = await this.getCart(userId);
    if (!cartData.items || cartData.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Verify all items belong to same restaurant
    const restaurantIds = [...new Set(cartData.items.map(item => item.restaurant_id.toString()))];
    if (restaurantIds.length > 1) {
      throw new Error('Cart items must be from the same restaurant');
    }

    const restaurantId = cartData.items[0].restaurant_id;

    // Verify restaurant is open
    const restaurant = await db.collection('restaurants').findOne({ _id: restaurantId });
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }
    if (!restaurant.is_open) {
      throw new Error('Restaurant is currently closed');
    }

    // Get delivery address
    let deliveryAddress = null;
    if (delivery_address_id) {
      deliveryAddress = await db.collection('addresses').findOne({
        _id: new ObjectId(delivery_address_id),
        user_id: new ObjectId(userId)
      });
      if (!deliveryAddress) {
        throw new Error('Delivery address not found');
      }
    }

    // Calculate pricing
    const subtotal_cents = cartData.total_cents;
    const tax_cents = Math.round(subtotal_cents * 0.05); // 5% tax
    const delivery_fee_cents = payment_type === 'COD' ? 5000 : 3000; // Rs 50 or Rs 30
    const total_amount_cents = subtotal_cents + tax_cents + delivery_fee_cents;

    // Create order
    const newOrder = {
      user_id: new ObjectId(userId),
      restaurant_id: restaurantId,
      delivery_address: deliveryAddress ? {
        address_line: deliveryAddress.address_line,
        city: deliveryAddress.city,
        pincode: deliveryAddress.pincode,
        lat: deliveryAddress.lat,
        lon: deliveryAddress.lon
      } : null,
      items: cartData.items.map(item => ({
        menu_item_id: item.menu_item_id,
        name: item.name,
        qty: item.qty,
        price_cents: item.price_cents
      })),
      subtotal_cents,
      tax_cents,
      delivery_fee_cents,
      total_amount_cents,
      payment_type,
      payment_status: payment_type === 'COD' ? 'PENDING' : 'NOT_REQUESTED',
      status: 'CREATED',
      special_instructions: special_instructions || null,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await db.collection('orders').insertOne(newOrder);
    newOrder._id = result.insertedId;

    // Clear cart after order creation
    await this.clearCart(userId);

    return newOrder;
  }

  async processPayment(orderId, userId, paymentDetails) {
    const db = getDB();

    const order = await db.collection('orders').findOne({
      _id: new ObjectId(orderId),
      user_id: new ObjectId(userId)
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.payment_status === 'CAPTURED') {
      throw new Error('Payment already completed');
    }

    // Dummy payment processing
    const { payment_type, card_number, upi_id } = paymentDetails;

    let paymentResult = {
      success: true,
      transaction_id: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`,
      payment_type: payment_type || order.payment_type,
      processed_at: new Date()
    };

    // Simulate payment validation
    if (payment_type === 'CARD' && (!card_number || card_number.length < 16)) {
      paymentResult.success = false;
      paymentResult.error = 'Invalid card number';
    }

    if (payment_type === 'UPI' && (!upi_id || !upi_id.includes('@'))) {
      paymentResult.success = false;
      paymentResult.error = 'Invalid UPI ID';
    }

    // Update order based on payment result
    if (paymentResult.success) {
      await db.collection('orders').updateOne(
        { _id: new ObjectId(orderId) },
        {
          $set: {
            payment_status: 'CAPTURED',
            payment_transaction_id: paymentResult.transaction_id,
            status: 'CONFIRMED',
            updated_at: new Date()
          }
        }
      );

      return {
        success: true,
        message: 'Payment successful',
        transaction_id: paymentResult.transaction_id,
        order_status: 'CONFIRMED'
      };
    } else {
      await db.collection('orders').updateOne(
        { _id: new ObjectId(orderId) },
        {
          $set: {
            payment_status: 'FAILED',
            status: 'FAILED',
            updated_at: new Date()
          }
        }
      );

      throw new Error(paymentResult.error || 'Payment failed');
    }
  }

  async getOrderById(orderId, userId) {
    const db = getDB();

    const order = await db.collection('orders').findOne({
      _id: new ObjectId(orderId),
      user_id: new ObjectId(userId)
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  async listOrders(userId, filters = {}) {
    const db = getDB();

    const query = { user_id: new ObjectId(userId) };

    if (filters.status) {
      query.status = filters.status;
    }

    const orders = await db.collection('orders')
      .find(query)
      .sort({ created_at: -1 })
      .toArray();

    return orders;
  }

  async cancelOrder(orderId, userId) {
    const db = getDB();

    const order = await db.collection('orders').findOne({
      _id: new ObjectId(orderId),
      user_id: new ObjectId(userId)
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
      throw new Error(`Cannot cancel order with status: ${order.status}`);
    }

    if (order.status === 'OUT_FOR_DELIVERY') {
      throw new Error('Cannot cancel order that is out for delivery');
    }

    const result = await db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          status: 'CANCELLED',
          cancelled_at: new Date(),
          updated_at: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    return result.value;
  }

  async updateOrderStatus(orderId, status, role, userId) {
    const db = getDB();

    const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
    if (!order) {
      throw new Error('Order not found');
    }

    // Authorization check
    if (role === 'owner') {
      const restaurant = await db.collection('restaurants').findOne({
        _id: order.restaurant_id,
        owner_id: new ObjectId(userId)
      });
      if (!restaurant) {
        throw new Error('Unauthorized to update this order');
      }
    }

    const validTransitions = {
      'CONFIRMED': ['PREPARING'],
      'PREPARING': ['READY'],
      'READY': ['OUT_FOR_DELIVERY'],
      'OUT_FOR_DELIVERY': ['DELIVERED']
    };

    if (!validTransitions[order.status] || !validTransitions[order.status].includes(status)) {
      throw new Error(`Invalid status transition from ${order.status} to ${status}`);
    }

    const updateData = {
      status,
      updated_at: new Date()
    };

    if (status === 'DELIVERED') {
      updateData.delivered_at = new Date();
    }

    const result = await db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result.value;
  }

  async getRestaurantOrders(restaurantId, ownerId, filters = {}) {
    const db = getDB();

    // Verify ownership
    const restaurant = await db.collection('restaurants').findOne({
      _id: new ObjectId(restaurantId),
      owner_id: new ObjectId(ownerId)
    });

    if (!restaurant) {
      throw new Error('Restaurant not found or unauthorized');
    }

    const query = { restaurant_id: new ObjectId(restaurantId) };

    if (filters.status) {
      query.status = filters.status;
    }

    const orders = await db.collection('orders')
      .find(query)
      .sort({ created_at: -1 })
      .toArray();

    return orders;
  }
}

module.exports = new OrderService();
