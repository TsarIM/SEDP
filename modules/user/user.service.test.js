const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const mockDB = {
  collection: jest.fn()
};

jest.mock('../../config/db', () => ({
  getDB: () => mockDB
}));

jest.mock('../../utils/jwt', () => ({
  generateToken: jest.fn((userId, role) => `mock-token-${userId}-${role}`)
}));

jest.mock('bcryptjs');

const userService = require('./user.service');
const { generateToken } = require('../../utils/jwt');

describe('UserService Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register()', () => {

    test('TC1: Should throw error when email already exists', async () => {
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

      await expect(userService.register(userData)).rejects.toThrow('Email already exists');
    });

    test('TC2: Should successfully register new user', async () => {
      const mockUserId = new ObjectId();
      const hashedPassword = '$2a$10$hashedpassword';

      const usersCollection = {
        findOne: jest.fn().mockResolvedValue(null),
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

      const result = await userService.register(userData);

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

  describe('login()', () => {

    test('TC3: Should throw error when user not found', async () => {
      const usersCollection = {
        findOne: jest.fn().mockResolvedValue(null)
      };

      mockDB.collection.mockReturnValue(usersCollection);

      await expect(
        userService.login('nonexistent@example.com', 'password123')
      ).rejects.toThrow('Invalid credentials');
    });

    test('TC4: Should throw error when password is incorrect', async () => {
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
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        userService.login('user@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });

    test('TC5: Should successfully login with correct credentials', async () => {
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
      bcrypt.compare.mockResolvedValue(true);

      const result = await userService.login('user@example.com', 'correctpassword');

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

  describe('addAddress()', () => {

    test('TC6: Should add address without setting as default', async () => {
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

      const result = await userService.addAddress(userId.toString(), addressData);

      expect(result.addressId).toEqual(addressId);
      expect(result.label).toBe('Home');
      expect(result.is_default).toBe(false);
      expect(addressesCollection.insertOne).toHaveBeenCalled();
    });

    test('TC7: Should add address and set as default', async () => {
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

      const result = await userService.addAddress(userId.toString(), addressData);

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

  describe('getUserById()', () => {

    test('TC8: Should throw error when user not found', async () => {
      const usersCollection = {
        findOne: jest.fn().mockResolvedValue(null)
      };

      mockDB.collection.mockReturnValue(usersCollection);

      await expect(
        userService.getUserById(new ObjectId().toString())
      ).rejects.toThrow('User not found');
    });

    test('TC9: Should successfully retrieve user without password', async () => {
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

      const result = await userService.getUserById(mockUserId.toString());

      expect(result.password_hash).toBeUndefined();
      expect(result.email).toBe('user@example.com');
      expect(result.name).toBe('Test User');
    });
  });

  describe('deleteUser()', () => {

    test('TC10: Should delete user and all associated addresses', async () => {
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

      const result = await userService.deleteUser(userId.toString());

      expect(result).toEqual({ message: 'User deleted successfully' });
      expect(addressesCollection.deleteMany).toHaveBeenCalledWith({
        user_id: new ObjectId(userId)
      });
      expect(usersCollection.deleteOne).toHaveBeenCalled();
    });

    test('TC11: Should throw error when user to delete not found', async () => {
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

      await expect(
        userService.deleteUser(userId.toString())
      ).rejects.toThrow('User not found');
    });
  });

});
