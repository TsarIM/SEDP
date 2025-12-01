
const { ObjectId } = require('mongodb');


const mockDB = {
  collection: jest.fn()
};


jest.mock('../../config/db', () => ({
  getDB: () => mockDB
}));


const orderService = require('./order.service');

describe('OrderService Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('addItemToCart()', () => {

    test('TC1: Should throw error when menu item not found', async () => {
      mockDB.collection.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null)
      });

      const userId = new ObjectId().toString();
      const menuItemId = new ObjectId().toString();

      await expect(
        orderService.addItemToCart(userId, menuItemId, 1)
      ).rejects.toThrow('Menu item not found');
    });

    test('TC2: Should throw error when menu item not available', async () => {
      const mockMenuItem = {
        _id: new ObjectId(),
        name: 'Pizza',
        price_cents: 1000,
        available: false,
        restaurant_id: new ObjectId()
      };

      mockDB.collection.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockMenuItem)
      });

      const userId = new ObjectId().toString();
      const menuItemId = mockMenuItem._id.toString();

      await expect(
        orderService.addItemToCart(userId, menuItemId, 2)
      ).rejects.toThrow('Menu item is not available');
    });

    test('TC3: Should create new cart and add item successfully', async () => {
      const userId = new ObjectId();
      const menuItemId = new ObjectId();
      const mockMenuItem = {
        _id: menuItemId,
        name: 'Burger',
        price_cents: 500,
        available: true,
        restaurant_id: new ObjectId()
      };

      const mockCartId = new ObjectId();
      
      const menuItemsCollection = {
        findOne: jest.fn().mockResolvedValue(mockMenuItem)
      };

      const cartsCollection = {
        findOne: jest.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            _id: mockCartId,
            user_id: userId
          }),
        insertOne: jest.fn().mockResolvedValue({ insertedId: mockCartId }),
        updateOne: jest.fn().mockResolvedValue({})
      };

      const cartItemsCollection = {
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({}),
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([
            {
              menu_item_id: menuItemId,
              name: 'Burger',
              price_cents: 500,
              qty: 3
            }
          ])
        })
      };

      mockDB.collection.mockImplementation((collectionName) => {
        if (collectionName === 'menu_items') return menuItemsCollection;
        if (collectionName === 'carts') return cartsCollection;
        if (collectionName === 'cart_items') return cartItemsCollection;
        return {};
      });

      const result = await orderService.addItemToCart(
        userId.toString(),
        menuItemId.toString(),
        3
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Burger');
      expect(result.items[0].qty).toBe(3);
      expect(result.total_cents).toBe(1500);
    });
  });
  
  describe('removeItemFromCart()', () => {

    test('TC4: Should throw error when cart not found', async () => {
      const cartsCollection = {
        findOne: jest.fn().mockResolvedValue(null)
      };

      mockDB.collection.mockReturnValue(cartsCollection);

      const userId = new ObjectId().toString();
      const menuItemId = new ObjectId().toString();

      await expect(
        orderService.removeItemFromCart(userId, menuItemId)
      ).rejects.toThrow('Cart not found');
    });

    test('TC5: Should throw error when item not found in cart', async () => {
      const mockCartId = new ObjectId();
      const cartsCollection = {
        findOne: jest.fn().mockResolvedValue({ _id: mockCartId })
      };

      const cartItemsCollection = {
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 0 })
      };

      mockDB.collection.mockImplementation((collectionName) => {
        if (collectionName === 'carts') return cartsCollection;
        if (collectionName === 'cart_items') return cartItemsCollection;
        return {};
      });

      const userId = new ObjectId().toString();
      const menuItemId = new ObjectId().toString();

      await expect(
        orderService.removeItemFromCart(userId, menuItemId)
      ).rejects.toThrow('Item not found in cart');
    });

    test('TC6: Should successfully remove item from cart', async () => {
      const mockCartId = new ObjectId();
      const userId = new ObjectId();
      
      const cartsCollection = {
        findOne: jest.fn()
          .mockResolvedValueOnce({ _id: mockCartId, user_id: userId })
          .mockResolvedValueOnce({ _id: mockCartId, user_id: userId }),
        updateOne: jest.fn().mockResolvedValue({})
      };

      const cartItemsCollection = {
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      };

      mockDB.collection.mockImplementation((collectionName) => {
        if (collectionName === 'carts') return cartsCollection;
        if (collectionName === 'cart_items') return cartItemsCollection;
        return {};
      });

      const result = await orderService.removeItemFromCart(
        userId.toString(),
        new ObjectId().toString()
      );

      expect(result.items).toHaveLength(0);
      expect(result.total_cents).toBe(0);
    });
  });
  
  describe('cancelOrder()', () => {
    
    test('TC7: Should throw error when order not found', async () => {
      const ordersCollection = {
        findOne: jest.fn().mockResolvedValue(null)
      };

      mockDB.collection.mockReturnValue(ordersCollection);

      const orderId = new ObjectId().toString();
      const userId = new ObjectId().toString();

      await expect(
        orderService.cancelOrder(orderId, userId)
      ).rejects.toThrow('Order not found');
    });


    test('TC8: Should throw error when trying to cancel delivered order', async () => {
      const mockOrder = {
        _id: new ObjectId(),
        user_id: new ObjectId(),
        status: 'DELIVERED'
      };

      const ordersCollection = {
        findOne: jest.fn().mockResolvedValue(mockOrder)
      };

      mockDB.collection.mockReturnValue(ordersCollection);

      await expect(
        orderService.cancelOrder(mockOrder._id.toString(), mockOrder.user_id.toString())
      ).rejects.toThrow('Cannot cancel order with status: DELIVERED');
    });

    test('TC9: Should throw error when order is out for delivery', async () => {
      const mockOrder = {
        _id: new ObjectId(),
        user_id: new ObjectId(),
        status: 'OUT_FOR_DELIVERY'
      };

      const ordersCollection = {
        findOne: jest.fn().mockResolvedValue(mockOrder)
      };

      mockDB.collection.mockReturnValue(ordersCollection);

      await expect(
        orderService.cancelOrder(mockOrder._id.toString(), mockOrder.user_id.toString())
      ).rejects.toThrow('Cannot cancel order that is out for delivery');
    });

    test('TC10: Should successfully cancel order', async () => {
      const mockOrderId = new ObjectId();
      const mockUserId = new ObjectId();
      const mockOrder = {
        _id: mockOrderId,
        user_id: mockUserId,
        status: 'CONFIRMED'
      };

      const cancelledOrder = {
        ...mockOrder,
        status: 'CANCELLED',
        cancelled_at: new Date(),
        updated_at: new Date()
      };

      const ordersCollection = {
        findOne: jest.fn().mockResolvedValue(mockOrder),
        findOneAndUpdate: jest.fn().mockResolvedValue({ value: cancelledOrder })
      };

      mockDB.collection.mockReturnValue(ordersCollection);

      const result = await orderService.cancelOrder(
        mockOrderId.toString(),
        mockUserId.toString()
      );

      expect(result.status).toBe('CANCELLED');
      expect(result.cancelled_at).toBeDefined();
    });
  });

  
  describe('processPayment()', () => {

    test('TC11: Should throw error when order not found', async () => {
      const ordersCollection = {
        findOne: jest.fn().mockResolvedValue(null)
      };

      mockDB.collection.mockReturnValue(ordersCollection);

      await expect(
        orderService.processPayment(
          new ObjectId().toString(),
          new ObjectId().toString(),
          { payment_type: 'UPI', upi_id: 'user@upi' }
        )
      ).rejects.toThrow('Order not found');
    });

    test('TC12: Should throw error when payment already completed', async () => {
      const mockOrder = {
        _id: new ObjectId(),
        user_id: new ObjectId(),
        payment_status: 'CAPTURED'
      };

      const ordersCollection = {
        findOne: jest.fn().mockResolvedValue(mockOrder)
      };

      mockDB.collection.mockReturnValue(ordersCollection);

      await expect(
        orderService.processPayment(
          mockOrder._id.toString(),
          mockOrder.user_id.toString(),
          { payment_type: 'UPI', upi_id: 'user@upi' }
        )
      ).rejects.toThrow('Payment already completed');
    });


    test('TC13: Should throw error for invalid card number', async () => {
      const mockOrder = {
        _id: new ObjectId(),
        user_id: new ObjectId(),
        payment_status: 'NOT_REQUESTED',
        payment_type: 'CARD'
      };

      const ordersCollection = {
        findOne: jest.fn().mockResolvedValue(mockOrder),
        updateOne: jest.fn().mockResolvedValue({})
      };

      mockDB.collection.mockReturnValue(ordersCollection);

      await expect(
        orderService.processPayment(
          mockOrder._id.toString(),
          mockOrder.user_id.toString(),
          { payment_type: 'CARD', card_number: '1234' } // Invalid: too short
        )
      ).rejects.toThrow('Invalid card number');
    });


    test('TC14: Should throw error for invalid UPI ID', async () => {
      const mockOrder = {
        _id: new ObjectId(),
        user_id: new ObjectId(),
        payment_status: 'NOT_REQUESTED',
        payment_type: 'UPI'
      };

      const ordersCollection = {
        findOne: jest.fn().mockResolvedValue(mockOrder),
        updateOne: jest.fn().mockResolvedValue({})
      };

      mockDB.collection.mockReturnValue(ordersCollection);

      await expect(
        orderService.processPayment(
          mockOrder._id.toString(),
          mockOrder.user_id.toString(),
          { payment_type: 'UPI', upi_id: 'invalidupi' } // Missing '@'
        )
      ).rejects.toThrow('Invalid UPI ID');
    });


    test('TC15: Should successfully process UPI payment', async () => {
      const mockOrderId = new ObjectId();
      const mockUserId = new ObjectId();
      const mockOrder = {
        _id: mockOrderId,
        user_id: mockUserId,
        payment_status: 'NOT_REQUESTED',
        payment_type: 'UPI'
      };

      const ordersCollection = {
        findOne: jest.fn().mockResolvedValue(mockOrder),
        updateOne: jest.fn().mockResolvedValue({})
      };

      mockDB.collection.mockReturnValue(ordersCollection);

      const result = await orderService.processPayment(
        mockOrderId.toString(),
        mockUserId.toString(),
        { payment_type: 'UPI', upi_id: 'user@okaxis' }
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Payment successful');
      expect(result.transaction_id).toMatch(/^TXN/);
      expect(result.order_status).toBe('CONFIRMED');
    });
  });

  
  describe('getOrderById()', () => {

    test('TC16: Should throw error when order not found', async () => {
      const ordersCollection = {
        findOne: jest.fn().mockResolvedValue(null)
      };

      mockDB.collection.mockReturnValue(ordersCollection);

      await expect(
        orderService.getOrderById(
          new ObjectId().toString(),
          new ObjectId().toString()
        )
      ).rejects.toThrow('Order not found');
    });


    test('TC17: Should successfully retrieve order', async () => {
      const mockOrder = {
        _id: new ObjectId(),
        user_id: new ObjectId(),
        status: 'CONFIRMED',
        total_amount_cents: 5000
      };

      const ordersCollection = {
        findOne: jest.fn().mockResolvedValue(mockOrder)
      };

      mockDB.collection.mockReturnValue(ordersCollection);

      const result = await orderService.getOrderById(
        mockOrder._id.toString(),
        mockOrder.user_id.toString()
      );

      expect(result._id).toEqual(mockOrder._id);
      expect(result.status).toBe('CONFIRMED');
      expect(result.total_amount_cents).toBe(5000);
    });
  });

});
