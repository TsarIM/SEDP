require('dotenv').config();
const express = require('express');
const { connectDB } = require('./config/db');
const userRoutes = require('./modules/user/user.routes');
const restaurantRoutes = require('./modules/restaurant/restaurant.routes');
const orderRoutes = require('./modules/order/order.routes');  // ADD THIS LINE

const app = express();

app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/orders', orderRoutes);  // ADD THIS LINE

app.get('/', (req, res) => {
  res.send('Food Delivery API');
});

// Export app for testing
module.exports = app;

// Only start server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
}
