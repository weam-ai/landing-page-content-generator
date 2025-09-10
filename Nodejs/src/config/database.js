const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('./backend-config');

const connectDB = async () => {
  try {
    let mongoURI;

    // First try to get MONGODB_URI (check for both null and empty string)
    if (config.isProduction) {
      mongoURI = config.mongodbUri;
      if (mongoURI && mongoURI.trim() !== '') {
        logger.info('Using MONGODB_URI for production connection');
      } else {
        logger.warn('MONGODB_URI not found in production mode, will construct from individual variables');
      }
    } else {
      mongoURI = config.mongodbUri;
      if (mongoURI && mongoURI.trim() !== '') {
        logger.info('Using MONGODB_URI for development connection');
      } else {
        logger.info('MONGODB_URI not provided, constructing from individual variables');
      }
    }

    // If MONGODB_URI is not available or empty, construct it from individual DB variables
    if (!mongoURI || mongoURI.trim() === '') {
      logger.info('Constructing MongoDB URI from individual environment variables');
      
      const dbConnection = process.env.DB_CONNECTION || 'mongodb';
      const dbHost = process.env.DB_HOST || 'localhost:27017';
      const dbDatabase = process.env.DB_DATABASE || 'landing-page-generator';
      const dbUsername = process.env.DB_USERNAME;
      const dbPassword = process.env.DB_PASSWORD;
      const dbPort = process.env.DB_PORT;

      if (!dbHost || !dbDatabase) {
        throw new Error('Either MONGODB_URI or DB_HOST and DB_DATABASE must be defined in environment variables');
      }

      // Construct MongoDB URI based on connection type
      if (dbConnection === 'mongodb+srv') {
        // For MongoDB Atlas (cloud)
        if (!dbUsername || !dbPassword) {
          throw new Error('DB_USERNAME and DB_PASSWORD are required for mongodb+srv connection');
        }
        mongoURI = `${dbConnection}://${dbUsername}:${dbPassword}@${dbHost}/${dbDatabase}?retryWrites=true&w=majority`;
        logger.info('Generated MongoDB Atlas URI');
      } else {
        // For local MongoDB
        const port = dbPort ? `:${dbPort}` : '';
        const auth = dbUsername && dbPassword ? `${dbUsername}:${dbPassword}@` : '';
        mongoURI = `${dbConnection}://${auth}${dbHost}${port}/${dbDatabase}`;
        logger.info('Generated local MongoDB URI');
      }
    }

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    logger.info(`Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
        process.exit(0);
      } catch (err) {
        logger.error('Error during MongoDB connection closure:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
