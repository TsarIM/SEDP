// order.service.test.js

const { ObjectId } = require('mongodb');

// Mock the database
const mockDB = {
  collection: jest.fn()
};

// Mock getDB function BEFORE requiring the service
jest.mock('../../config/db', () => ({
  getDB: () => mockDB
}));

// Import the orderService (it's already an instance!)
const orderService = require('./order.service');

describe('OrderService - addItemToCart Tests', () => {
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  /**
   * TEST CASE 1: Menu item not found
   * Tests Path: Start → Query menu_items → Menu item NULL → Throw Error
   * Coverage: Node Coverage (Nodes 1-4), Edge Coverage (menuItem == null)
   */
  test('TC1: Should throw error when menu item not found', async () => {
    // Arrange - Setup mock to return null (item not found)
    mockDB.collection.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null)
    });

    const userId = new ObjectId().toString();
    const menuItemId = new ObjectId().toString();

    // Act & Assert - Call function and expect error
    await expect(
      orderService.addItemToCart(userId, menuItemId, 1)
    ).rejects.toThrow('Menu item not found');
  });

  /**
   * TEST CASE 2: Menu item not available
   * Tests Path: Start → Query menu_items → Menu item found → Check available → FALSE → Throw Error
   * Coverage: Node Coverage (Nodes 1-6), Edge Coverage (available == false)
   */
  test('TC2: Should throw error when menu item not available', async () => {
    // Arrange - Setup mock to return unavailable item
    const mockMenuItem = {
      _id: new ObjectId(),
      name: 'Pizza',
      price_cents: 1000,
      available: false,  // Item is not available
      restaurant_id: new ObjectId()
    };

    mockDB.collection.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(mockMenuItem)
    });

    const userId = new ObjectId().toString();
    const menuItemId = mockMenuItem._id.toString();

    // Act & Assert
    await expect(
      orderService.addItemToCart(userId, menuItemId, 2)
    ).rejects.toThrow('Menu item is not available');
  });

  /**
   * TEST CASE 3: Successfully add item to new cart
   * Tests Path: Start → Menu item found → Available → Cart NULL → Create cart → Add item → Success
   * Coverage: Prime Path (cart doesn't exist, create new cart and add item)
   */
  test('TC3: Should create new cart and add item successfully', async () => {
    // Arrange
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
    
    // Create separate mock collections
    const menuItemsCollection = {
      findOne: jest.fn().mockResolvedValue(mockMenuItem)
    };

    const cartsCollection = {
      findOne: jest.fn()
        .mockResolvedValueOnce(null)  // First call: cart doesn't exist
        .mockResolvedValueOnce({      // Second call: return created cart
          _id: mockCartId,
          user_id: userId
        }),
      insertOne: jest.fn().mockResolvedValue({ insertedId: mockCartId }),
      updateOne: jest.fn().mockResolvedValue({})
    };

    const cartItemsCollection = {
      findOne: jest.fn().mockResolvedValue(null), // No existing cart item
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

    // Setup collection mock to return appropriate collection based on name
    mockDB.collection.mockImplementation((collectionName) => {
      if (collectionName === 'menu_items') {
        return menuItemsCollection;
      }
      if (collectionName === 'carts') {
        return cartsCollection;
      }
      if (collectionName === 'cart_items') {
        return cartItemsCollection;
      }
      return {};
    });

    // Act
    const result = await orderService.addItemToCart(
      userId.toString(),
      menuItemId.toString(),
      3
    );

    // Assert
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Burger');
    expect(result.items[0].qty).toBe(3);
    expect(result.total_cents).toBe(1500); // 500 * 3
    
    // Verify the mocks were called correctly
    expect(menuItemsCollection.findOne).toHaveBeenCalled();
    expect(cartsCollection.findOne).toHaveBeenCalledTimes(2);
    expect(cartsCollection.insertOne).toHaveBeenCalled();
    expect(cartItemsCollection.insertOne).toHaveBeenCalled();
  });

});

