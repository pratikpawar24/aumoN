const mongoose = require('mongoose');

const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      // useNewUrlParser / useUnifiedTopology were removed — they've been no-ops
      // (and warned) since driver v4. Connection pooling + fast failover tuning
      // is what actually matters for snappy queries on Render ↔ Atlas.
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        family: 4,
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
      });

      console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`);

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Attempting reconnect...');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected.');
      });

      return conn;
    } catch (err) {
      retries++;
      console.error(`MongoDB connection attempt ${retries}/${maxRetries} failed:`, err.message);
      if (retries === maxRetries) {
        console.error('All MongoDB connection attempts failed. Exiting.');
        process.exit(1);
      }
      // Exponential backoff
      await new Promise((res) => setTimeout(res, 2000 * retries));
    }
  }
};

module.exports = connectDB;