// user.service.test.js

const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

// Mock the database
const mockDB = {
  collection: jest.fn()
};

// Mock dependencies BEFORE requiring the service
jest.mock('../../config/db', () => ({
  getDB: () => mockDB
}));

jest.mock('../../utils/jwt', () => ({
  generateToken: jest.fn((userId, role) => `mock-token-${userId}-${role}`)
}));

// Mock bcrypt
jest.mock('bcryptjs');

// Import the userService (it's already an instance!)
const userService = require('./user.service');
const { generateToken } = require('../../utils/jwt');

describe('UserService Tests', () => {
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  // ==================== REGISTER TESTS ====================
  
  describe('register()', () => {
    
    /**
     * TEST CASE 1: Email already exists
     * Path: Start → Check email → Email exists → Throw Error
     * Coverage: Node Coverage, Edge Coverage (existingUser != null)
     */
    test('TC1: Should throw error when email already exists', async () => {
      // Arrange
      const mockExistingUser = {
        _id: new ObjectId(),
        email: 'test@example.com'
      };

      const usersCollection = {
        findOne: jest.fn().mockResolvedValue(mockExistingUser)
      };

      mockDB.collection.mockReturnValue(usersCollection);

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        phone: '1234567890'
      };

      // Act & Assert
      await expect(userService.register(userData)).rejects.toThrow('Email already exists');
    });

    /**
     * TEST CASE 2: Successful registration
     * Path: Start → Check email → Email doesn't exist → Hash password → Create user → Generate token → Success
     * Coverage: Prime Path (complete registration flow)
     */
    test('TC2: Should successfully register new user', async () => {
      // Arrange
      const mockUserId = new ObjectId();
      const hashedPassword = '$2a$10$hashedpassword';

      const usersCollection = {
        findOne: jest.fn().mockResolvedValue(null), // Email doesn't exist
        insertOne: jest.fn().mockResolvedValue({ insertedId: mockUserId })
      };

      mockDB.collection.mockReturnValue(usersCollection);
      bcrypt.hash.mockResolvedValue(hashedPassword);

      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        phone: '9876543210',
        role: 'customer'
      };

      // Act
      const result = await userService.register(userData);

      // Assert
      expect(result).toEqual({
        userId: mockUserId,
        email: 'newuser@example.com',
        name: 'New User',
        role: 'customer',
        token: expect.any(String)
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(usersCollection.insertOne).toHaveBeenCalled();
      expect(generateToken).toHaveBeenCalledWith(mockUserId.toString(), 'customer');
    });
  });

  // ==================== LOGIN TESTS ====================
  
  describe('login()', () => {
    
    /**
     * TEST CASE 3: User not found
     * Path: Start → Find user → User not found → Throw Error
     * Coverage: Node Coverage, Edge Coverage (user == null)
     */
    test('TC3: Should throw error when user not found', async () => {
      // Arrange
      const usersCollection = {
        findOne: jest.fn().mockResolvedValue(null)
      };

      mockDB.collection.mockReturnValue(usersCollection);

      // Act & Assert
      await expect(
        userService.login('nonexistent@example.com', 'password123')
      ).rejects.toThrow('Invalid credentials');
    });

    /**
     * TEST CASE 4: Incorrect password
     * Path: Start → Find user → User found → Compare password → Password incorrect → Throw Error
     * Coverage: Node Coverage, Edge Coverage (password mismatch)
     */
    test('TC4: Should throw error when password is incorrect', async () => {
      // Arrange
      const mockUser = {
        _id: new ObjectId(),
        email: 'user@example.com',
        password_hash: '$2a$10$hashedpassword',
        name: 'Test User',
        role: 'customer'
      };

      const usersCollection = {
        findOne: jest.fn().mockResolvedValue(mockUser)
      };

      mockDB.collection.mockReturnValue(usersCollection);
      bcrypt.compare.mockResolvedValue(false); // Password doesn't match

      // Act & Assert
      await expect(
        userService.login('user@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });

    /**
     * TEST CASE 5: Successful login
     * Path: Start → Find user → User found → Compare password → Password correct → Generate token → Success
     * Coverage: Prime Path (complete login flow)
     */
    test('TC5: Should successfully login with correct credentials', async () => {
      // Arrange
      const mockUserId = new ObjectId();
      const mockUser = {
        _id: mockUserId,
        email: 'user@example.com',
        password_hash: '$2a$10$hashedpassword',
        name: 'Test User',
        role: 'customer'
      };

      const usersCollection = {
        findOne: jest.fn().mockResolvedValue(mockUser)
      };

      mockDB.collection.mockReturnValue(usersCollection);
      bcrypt.compare.mockResolvedValue(true); // Password matches

      // Act
      const result = await userService.login('user@example.com', 'correctpassword');

      // Assert
      expect(result).toEqual({
        userId: mockUserId,
        email: 'user@example.com',
        name: 'Test User',
        role: 'customer',
        token: expect.any(String)
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('correctpassword', mockUser.password_hash);
      expect(generateToken).toHaveBeenCalledWith(mockUserId.toString(), 'customer');
    });
  });

  // ==================== ADD ADDRESS TESTS ====================
  
  describe('addAddress()', () => {
    
    /**
     * TEST CASE 6: Add address without setting as default
     * Path: Start → Check is_default → FALSE → Insert address → Success
     * Coverage: Node Coverage, Edge Coverage (is_default == false branch)
     */
    test('TC6: Should add address without setting as default', async () => {
      // Arrange
      const userId = new ObjectId();
      const addressId = new ObjectId();

      const addressesCollection = {
        insertOne: jest.fn().mockResolvedValue({ insertedId: addressId })
      };

      mockDB.collection.mockReturnValue(addressesCollection);

      const addressData = {
        label: 'Home',
        lat: 28.7041,
        lon: 77.1025,
        address_line: '123 Main St',
        city: 'Delhi',
        pincode: '110001',
        is_default: false
      };

      // Act
      const result = await userService.addAddress(userId.toString(), addressData);

      // Assert
      expect(result.addressId).toEqual(addressId);
      expect(result.label).toBe('Home');
      expect(result.is_default).toBe(false);
      expect(addressesCollection.insertOne).toHaveBeenCalled();
    });

    /**
     * TEST CASE 7: Add address and set as default
     * Path: Start → Check is_default → TRUE → Update existing → Insert address → Success
     * Coverage: Prime Path (with default address update)
     */
    test('TC7: Should add address and set as default', async () => {
      // Arrange
      const userId = new ObjectId();
      const addressId = new ObjectId();

      const addressesCollection = {
        updateMany: jest.fn().mockResolvedValue({}),
        insertOne: jest.fn().mockResolvedValue({ insertedId: addressId })
      };

      mockDB.collection.mockReturnValue(addressesCollection);

      const addressData = {
        label: 'Office',
        lat: 28.5355,
        lon: 77.3910,
        address_line: '456 Work St',
        city: 'Noida',
        pincode: '201301',
        is_default: true
      };

      // Act
      const result = await userService.addAddress(userId.toString(), addressData);

      // Assert
      expect(result.addressId).toEqual(addressId);
      expect(result.label).toBe('Office');
      expect(result.is_default).toBe(true);
      expect(addressesCollection.updateMany).toHaveBeenCalledWith(
        { user_id: new ObjectId(userId) },
        { $set: { is_default: false } }
      );
      expect(addressesCollection.insertOne).toHaveBeenCalled();
    });
  });

  // ==================== GET USER BY ID TEST ====================
  
  describe('getUserById()', () => {
    
    /**
     * TEST CASE 8: User not found
     * Path: Start → Find user → User not found → Throw Error
     */
    test('TC8: Should throw error when user not found', async () => {
      // Arrange
      const usersCollection = {
        findOne: jest.fn().mockResolvedValue(null)
      };

      mockDB.collection.mockReturnValue(usersCollection);

      // Act & Assert
      await expect(
        userService.getUserById(new ObjectId().toString())
      ).rejects.toThrow('User not found');
    });

    /**
     * TEST CASE 9: Successfully get user
     */
    test('TC9: Should successfully retrieve user without password', async () => {
      // Arrange
      const mockUserId = new ObjectId();
      const mockUser = {
        _id: mockUserId,
        email: 'user@example.com',
        password_hash: '$2a$10$hashedpassword',
        name: 'Test User',
        role: 'customer'
      };

      const usersCollection = {
        findOne: jest.fn().mockResolvedValue({ ...mockUser })
      };

      mockDB.collection.mockReturnValue(usersCollection);

      // Act
      const result = await userService.getUserById(mockUserId.toString());

      // Assert
      expect(result.password_hash).toBeUndefined();
      expect(result.email).toBe('user@example.com');
      expect(result.name).toBe('Test User');
    });
  });

  // ==================== DELETE USER TEST ====================
  
  describe('deleteUser()', () => {
    
    /**
     * TEST CASE 10: Successfully delete user and addresses
     */
    test('TC10: Should delete user and all associated addresses', async () => {
      // Arrange
      const userId = new ObjectId();

      const addressesCollection = {
        deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 })
      };

      const usersCollection = {
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
      };

      mockDB.collection.mockImplementation((collectionName) => {
        if (collectionName === 'addresses') return addressesCollection;
        if (collectionName === 'users') return usersCollection;
      });

      // Act
      const result = await userService.deleteUser(userId.toString());

      // Assert
      expect(result).toEqual({ message: 'User deleted successfully' });
      expect(addressesCollection.deleteMany).toHaveBeenCalledWith({
        user_id: new ObjectId(userId)
      });
      expect(usersCollection.deleteOne).toHaveBeenCalled();
    });

    /**
     * TEST CASE 11: User not found during delete
     */
    test('TC11: Should throw error when user to delete not found', async () => {
      // Arrange
      const userId = new ObjectId();

      const addressesCollection = {
        deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 })
      };

      const usersCollection = {
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 0 })
      };

      mockDB.collection.mockImplementation((collectionName) => {
        if (collectionName === 'addresses') return addressesCollection;
        if (collectionName === 'users') return usersCollection;
      });

      // Act & Assert
      await expect(
        userService.deleteUser(userId.toString())
      ).rejects.toThrow('User not found');
    });
  });

});
