const mongoose = require('mongoose');
const User = require('../../models/User');
const LandingPage = require('../../models/LandingPage');
const logger = require('../../utils/logger');
const config = require('../../config/credencial_config');

const seedData = async () => {
  try {
    // Connect to database
    const mongoURI = config.nodeEnv === 'production' 
      ? config.database.mongodbUriProd 
      : config.database.mongodbUri;

    if (!mongoURI) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }

    await mongoose.connect(mongoURI);
    logger.info('Connected to MongoDB for seeding');

    // Clear existing data
    await User.deleteMany({});
    await LandingPage.deleteMany({});
    logger.info('Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin'
    });
    logger.info('Admin user created:', adminUser.email);

    // Create regular user
    const regularUser = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'user'
    });
    logger.info('Regular user created:', regularUser.email);

    // Create sample landing pages
    const sampleLandingPages = [
      {
        user: regularUser._id,
        title: 'Tech Startup Landing Page',
        businessName: 'TechFlow Solutions',
        businessOverview: 'Innovative software solutions for modern businesses, specializing in cloud infrastructure and digital transformation.',
        targetAudience: 'Small to medium enterprises looking to modernize their technology stack',
        brandTone: 'professional',
        websiteUrl: 'https://techflow-solutions.com',
        designSource: {
          type: 'manual',
          processedAt: new Date()
        },
        sections: [
          {
            type: 'hero',
            title: 'Transform Your Business',
            content: 'Transform your business with our innovative solutions. We help companies like yours achieve remarkable growth through cutting-edge technology and strategic insights.',
            order: 1
          },
          {
            type: 'features',
            title: 'Why Choose Us',
            content: 'Our platform offers advanced analytics, seamless integration, and 24/7 support to ensure your success. Experience the difference that professional expertise makes.',
            order: 2
          },
          {
            type: 'testimonials',
            title: 'What Our Clients Say',
            content: 'Working with this team has been transformative for our business. The results exceeded our expectations and we\'ve seen a 300% increase in efficiency.',
            order: 3
          },
          {
            type: 'cta',
            title: 'Ready to Get Started?',
            content: 'Join thousands of satisfied customers who have transformed their businesses. Start your journey today with a free consultation.',
            order: 4
          }
        ],
        status: 'published',
        publishedAt: new Date(),
        tags: ['technology', 'startup', 'software'],
        isPublic: true
      },
      {
        user: regularUser._id,
        title: 'E-commerce Platform',
        businessName: 'ShopSmart',
        businessOverview: 'Next-generation online shopping experience with AI-powered recommendations and seamless checkout.',
        targetAudience: 'Online shoppers and retailers looking for a modern e-commerce solution',
        brandTone: 'friendly',
        websiteUrl: 'https://shopsmart.com',
        designSource: {
          type: 'figma',
          url: 'https://www.figma.com/file/example',
          processedAt: new Date()
        },
        sections: [
          {
            type: 'hero',
            title: 'Shop Smarter, Not Harder',
            content: 'Discover a new way to shop online with AI-powered recommendations, lightning-fast checkout, and personalized experiences.',
            order: 1
          },
          {
            type: 'features',
            title: 'Smart Shopping Features',
            content: 'Our platform learns your preferences, suggests relevant products, and makes shopping faster and more enjoyable than ever before.',
            order: 2
          },
          {
            type: 'cta',
            title: 'Start Shopping Today',
            content: 'Experience the future of e-commerce. Sign up now and get 20% off your first purchase.',
            order: 3
          }
        ],
        status: 'draft',
        tags: ['e-commerce', 'retail', 'shopping'],
        isPublic: false
      }
    ];

    const createdLandingPages = await LandingPage.insertMany(sampleLandingPages);
    logger.info(`Created ${createdLandingPages.length} sample landing pages`);

    logger.info('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedData();
}

module.exports = seedData;
