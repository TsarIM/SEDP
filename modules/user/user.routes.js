const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { authenticate } = require('../../middleware/auth');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.get('/profile', authenticate, userController.getProfile);
router.patch('/profile', authenticate, userController.updateProfile);
router.post('/addresses', authenticate, userController.addAddress);
router.get('/addresses', authenticate, userController.listAddresses);

module.exports = router;
