const userService = require('./user.service');

class UserController {
  async register(req, res) {
    try {
      const result = await userService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await userService.login(email, password);
      res.status(200).json(result);
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }

  async getProfile(req, res) {
    try {
      const user = await userService.getUserById(req.user.userId);
      res.status(200).json(user);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async updateProfile(req, res) {
    try {
      const user = await userService.updateUser(req.user.userId, req.body);
      res.status(200).json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteProfile(req, res) {
    try {
      const result = await userService.deleteUser(req.user.userId);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async addAddress(req, res) {
    try {
      const address = await userService.addAddress(req.user.userId, req.body);
      res.status(201).json(address);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async listAddresses(req, res) {
    try {
      const addresses = await userService.listAddresses(req.user.userId);
      res.status(200).json(addresses);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async setDefaultAddress(req, res) {
    try {
      const { addressId } = req.params;
      const address = await userService.setDefaultAddress(req.user.userId, addressId);
      res.status(200).json(address);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async removeAddress(req, res) {
    try {
      const { addressId } = req.params;
      const result = await userService.removeAddress(req.user.userId, addressId);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new UserController();
