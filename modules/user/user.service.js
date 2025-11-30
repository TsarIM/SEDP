const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const { getDB } = require('../../config/db');
const { generateToken } = require('../../utils/jwt');

class UserService {
  async register(userData) {
    const db = getDB();
    const { email, password, name, phone, role = 'customer' } = userData;

    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      throw new Error('Email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = {
      email,
      password_hash: passwordHash,
      name,
      phone,
      role,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await db.collection('users').insertOne(newUser);
    const token = generateToken(result.insertedId.toString(), role);

    return {
      userId: result.insertedId,
      email,
      name,
      role,
      token
    };
  }

  async login(email, password) {
    const db = getDB();
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const token = generateToken(user._id.toString(), user.role);

    return {
      userId: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      token
    };
  }

  async getUserById(userId) {
    const db = getDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (!user) {
      throw new Error('User not found');
    }

    delete user.password_hash;
    return user;
  }

  async updateUser(userId, updates) {
    const db = getDB();
    const { email, phone, name } = updates;

    const updateData = {
      ...(email && { email }),
      ...(phone && { phone }),
      ...(name && { name }),
      updated_at: new Date()
    };

    const result = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('User not found');
    }

    delete result.value.password_hash;
    return result.value;
  }

  async deleteUser(userId) {
    const db = getDB();
    
    // Delete user's addresses first
    await db.collection('addresses').deleteMany({ user_id: new ObjectId(userId) });
    
    // Delete user
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(userId) });

    if (result.deletedCount === 0) {
      throw new Error('User not found');
    }

    return { message: 'User deleted successfully' };
  }

  async addAddress(userId, addressData) {
    const db = getDB();
    const { label, lat, lon, address_line, city, pincode, is_default = false } = addressData;

    if (is_default) {
      await db.collection('addresses').updateMany(
        { user_id: new ObjectId(userId) },
        { $set: { is_default: false } }
      );
    }

    const newAddress = {
      user_id: new ObjectId(userId),
      label,
      lat,
      lon,
      address_line,
      city,
      pincode,
      is_default
    };

    const result = await db.collection('addresses').insertOne(newAddress);
    return { addressId: result.insertedId, ...newAddress };
  }

  async listAddresses(userId) {
    const db = getDB();
    const addresses = await db.collection('addresses')
      .find({ user_id: new ObjectId(userId) })
      .toArray();

    return addresses;
  }

  async setDefaultAddress(userId, addressId) {
    const db = getDB();

    // First, unset all defaults
    await db.collection('addresses').updateMany(
      { user_id: new ObjectId(userId) },
      { $set: { is_default: false } }
    );

    // Set the specified address as default
    const result = await db.collection('addresses').findOneAndUpdate(
      { _id: new ObjectId(addressId), user_id: new ObjectId(userId) },
      { $set: { is_default: true } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Address not found');
    }

    return result.value;
  }

  async removeAddress(userId, addressId) {
    const db = getDB();
    
    const result = await db.collection('addresses').deleteOne({
      _id: new ObjectId(addressId),
      user_id: new ObjectId(userId)
    });

    if (result.deletedCount === 0) {
      throw new Error('Address not found');
    }

    return { message: 'Address removed successfully' };
  }
}

module.exports = new UserService();
