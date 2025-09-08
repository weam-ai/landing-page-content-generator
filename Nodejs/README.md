# Landing Page Generator - Node.js Backend

A robust, scalable backend API for the Landing Page Generator application, built with Node.js, Express, and MongoDB. This backend provides comprehensive functionality for user management, landing page creation, AI-powered content generation, and file processing.

## 🚀 Features

### **Authentication & User Management**
- JWT-based authentication system
- User registration and login
- Password hashing with bcrypt
- Role-based access control (User/Admin)
- Profile management and preferences

### **Landing Page Management**
- CRUD operations for landing pages
- Section-based content management
- Status management (draft, published, archived)
- User ownership and access control
- Pagination and filtering

### **File Upload & Processing**
- PDF file upload with validation
- Figma URL processing and validation
- File size and type restrictions
- Secure file storage and management
- File status tracking

### **AI Content Generation**
- Gemini AI API integration
- Intelligent content generation based on business context
- Section-specific content regeneration
- Brand tone and audience targeting
- PDF content extraction using OCR

### **Security & Performance**
- Rate limiting and request validation
- Input sanitization and validation
- CORS configuration
- Helmet security headers
- Request compression
- Comprehensive error handling

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt
- **File Upload**: Multer with validation
- **AI Integration**: Google Gemini API
- **PDF Processing**: pdf-parse
- **Validation**: express-validator
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

## 📁 Project Structure

```
src/
├── config/                 # Configuration files
│   └── database.js        # MongoDB connection
├── middleware/            # Express middleware
│   ├── auth.js           # Authentication middleware
│   ├── errorHandler.js   # Global error handler
│   └── notFound.js       # 404 handler
├── models/                # Database models
│   ├── User.js           # User model
│   └── LandingPage.js    # Landing page model
├── routes/                # API routes
│   ├── auth.js           # Authentication routes
│   ├── landingPages.js   # Landing page CRUD
│   ├── upload.js         # File upload routes
│   └── ai.js             # AI content generation
├── utils/                 # Utility functions
│   └── logger.js         # Winston logger
├── database/              # Database utilities
│   └── seeders/          # Data seeders
└── server.js              # Main server file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB (local or cloud)
- npm, yarn, or pnpm

### Installation

1. **Clone and navigate to the backend directory:**
   ```bash
   cd Solution/Nodejs
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   ```bash
   cp env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/landing-page-generator
   JWT_SECRET=your-super-secret-jwt-key-here
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

4. **Start MongoDB:**
   ```bash
   # Local MongoDB
   mongod
   
   # Or use MongoDB Atlas (cloud)
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Seed the database (optional):**
   ```bash
   npm run seed
   ```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Landing Pages
- `GET /api/landing-pages` - Get user's landing pages
- `GET /api/landing-pages/:id` - Get specific landing page
- `POST /api/landing-pages` - Create new landing page
- `PUT /api/landing-pages/:id` - Update landing page
- `PUT /api/landing-pages/:id/sections` - Update sections
- `DELETE /api/landing-pages/:id` - Delete landing page
- `PUT /api/landing-pages/:id/publish` - Publish landing page

### File Upload
- `POST /api/upload/pdf` - Upload PDF file
- `POST /api/upload/figma` - Process Figma URL
- `GET /api/upload/status/:fileId` - Get upload status
- `DELETE /api/upload/:fileId` - Delete uploaded file

### AI Content Generation
- `POST /api/ai/extract-pdf` - Extract PDF content
- `POST /api/ai/extract-figma` - Extract Figma design
- `POST /api/ai/generate-content` - Generate landing page content
- `POST /api/ai/regenerate-section` - Regenerate section content

## 🔐 Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

### Sample API Calls

**Register a new user:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Create a landing page:**
```bash
curl -X POST http://localhost:5000/api/landing-pages \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Landing Page",
    "businessName": "My Business",
    "businessOverview": "We provide amazing services",
    "targetAudience": "Small businesses",
    "brandTone": "professional"
  }'
```

## 🗄 Database Models

### User Model
- Basic info (name, email, password)
- Role-based access control
- User preferences and settings
- Account status and last login

### Landing Page Model
- Business information
- Content sections with ordering
- Design source tracking
- Status and analytics
- Custom settings and tags

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Prevents abuse and DDoS attacks
- **CORS Protection**: Configurable cross-origin requests
- **Security Headers**: Helmet for security headers
- **File Validation**: Secure file upload handling

## 📊 Logging

The application uses Winston for structured logging:

- **Console Logging**: Development environment
- **File Logging**: Production environment
- **Error Tracking**: Comprehensive error logging
- **Request Logging**: HTTP request/response logging

## 🧪 Testing

Run tests with Jest:

```bash
npm test
```

## 🚀 Production Deployment

1. **Set production environment:**
   ```bash
   NODE_ENV=production
   ```

2. **Build and start:**
   ```bash
   npm start
   ```

3. **Environment variables for production:**
   - Use MongoDB Atlas or production MongoDB
   - Set strong JWT secret
   - Configure CORS origins
   - Set up proper logging

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `GEMINI_API_KEY` | Gemini AI API key | Required |
| `MAX_FILE_SIZE` | Maximum file upload size | `10485760` (10MB) |

### Rate Limiting

- **Window**: 15 minutes
- **Max Requests**: 100 per IP
- **Configurable**: Via environment variables

## 🤝 API Integration

### Frontend Integration

The backend is designed to work seamlessly with the Next.js frontend:

```javascript
// Example API call from frontend
const response = await fetch('/api/landing-pages', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Third-party Services

- **Gemini AI**: Content generation
- **Figma API**: Design extraction (future implementation)
- **AWS S3**: File storage (future implementation)

## 📈 Performance Optimization

- **Database Indexing**: Optimized MongoDB queries
- **Request Compression**: gzip compression
- **Connection Pooling**: MongoDB connection management
- **File Size Limits**: Configurable upload limits
- **Caching**: Ready for Redis integration

## 🔮 Future Enhancements

- **Redis Caching**: Session and data caching
- **WebSocket Support**: Real-time updates
- **File Storage**: AWS S3 integration
- **Analytics**: Landing page performance tracking
- **Webhooks**: Third-party integrations
- **Multi-tenancy**: Organization support

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check MongoDB service status
   - Verify connection string
   - Check network connectivity

2. **JWT Token Invalid**
   - Ensure JWT_SECRET is set
   - Check token expiration
   - Verify token format

3. **File Upload Fails**
   - Check file size limits
   - Verify file type
   - Ensure upload directory exists

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm run dev
```

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Follow the existing code style
2. Add proper error handling
3. Include input validation
4. Write comprehensive tests
5. Update documentation

## 📞 Support

For questions or issues:
- Check the logs for error details
- Review the API documentation
- Check environment configuration
- Verify database connectivity
