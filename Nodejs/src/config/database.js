const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    let mongoURI;

    // First try to get MONGODB_URI
    if (process.env.NODE_ENV === 'production') {
      mongoURI = process.env.MONGODB_URI_PROD || process.env.MONGODB_URI;
      if (mongoURI) {
        logger.info('🔗 Using MONGODB_URI_PROD for production connection');
      }
    } else {
      mongoURI = process.env.MONGODB_URI;
      if (mongoURI) {
        logger.info('🔗 Using MONGODB_URI for development connection');
      }
    }

    // If MONGODB_URI is not available, construct it from individual DB variables
    if (!mongoURI) {
      logger.info('📝 MONGODB_URI not found, constructing URI from individual database variables...');
      
      const dbConnection = process.env.DB_CONNECTION || 'mongodb';
      const dbHost = process.env.DB_HOST;
      const dbDatabase = process.env.DB_DATABASE;
      const dbUsername = process.env.DB_USERNAME;
      const dbPassword = process.env.DB_PASSWORD;
      const dbPort = process.env.DB_PORT;

      logger.info(`📊 Database Configuration:`, {
        connection: dbConnection,
        host: dbHost,
        database: dbDatabase,
        username: dbUsername ? `${dbUsername.substring(0, 3)}***` : 'not provided',
        port: dbPort || 'default',
        hasPassword: !!dbPassword
      });

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
        logger.info('☁️  Generated MongoDB Atlas URI (mongodb+srv)');
      } else {
        // For local MongoDB
        const port = dbPort ? `:${dbPort}` : '';
        const auth = dbUsername && dbPassword ? `${dbUsername}:${dbPassword}@` : '';
        mongoURI = `${dbConnection}://${auth}${dbHost}${port}/${dbDatabase}`;
        logger.info('🏠 Generated local MongoDB URI (mongodb)');
      }

      logger.info('✅ Successfully constructed MongoDB URI from individual database variables');
    } else {
      logger.info('✅ Using provided MONGODB_URI directly');
    }

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
    logger.info(`📋 Database Name: ${conn.connection.name}`);
    logger.info(`🔌 Connection State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);

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
        logger.info('MongoDB connection closed through app termination');
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
