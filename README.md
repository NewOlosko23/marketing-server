# Marketing Firm Backend API

A comprehensive MERN stack backend for the Marketing Firm platform, providing email and SMS marketing capabilities with advanced analytics and admin management.

## 🚀 Features

### Core Functionality
- **User Authentication & Management** - JWT-based auth with role-based access control
- **Email Marketing** - Send emails with tracking, templates, and analytics
- **SMS Marketing** - Send SMS messages with delivery tracking
- **API Key Management** - Secure API access with usage tracking
- **Quota Management** - Plan-based usage limits and monitoring
- **Analytics & Reporting** - Comprehensive analytics for all activities
- **Admin Dashboard** - Complete admin interface for platform management

### Technical Features
- **MongoDB Integration** - Scalable NoSQL database with Mongoose ODM
- **Express.js Framework** - Robust Node.js web framework
- **JWT Authentication** - Secure token-based authentication
- **Rate Limiting** - API rate limiting and abuse prevention
- **Error Handling** - Comprehensive error handling and logging
- **Data Validation** - Input validation with express-validator
- **Security** - Helmet.js security headers and CORS protection

## 📁 Project Structure

```
backend/
├── models/                 # MongoDB models
│   ├── User.js            # User model with authentication
│   ├── ApiKey.js          # API key management
│   ├── Quota.js           # Usage quota tracking
│   ├── Email.js           # Email records and tracking
│   └── SMS.js             # SMS records and tracking
├── routes/                 # API routes
│   ├── auth.js            # Authentication routes
│   ├── users.js           # User management
│   ├── apiKeys.js         # API key management
│   ├── quotas.js          # Quota monitoring
│   ├── emails.js          # Email service
│   ├── sms.js             # SMS service
│   ├── analytics.js       # Analytics and reporting
│   └── admin.js           # Admin management
├── middleware/             # Custom middleware
│   ├── auth.js            # Authentication middleware
│   └── errorHandler.js    # Error handling middleware
├── services/               # External services
│   ├── emailService.js    # Email service (Resend/Nodemailer)
│   └── smsService.js      # SMS service (Twilio)
├── utils/                  # Utility functions
│   └── logger.js          # Winston logging
├── scripts/                # Database scripts
│   └── seed.js            # Database seeding
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

## 🛠️ Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the backend directory:
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=5000
   FRONTEND_URL=http://localhost:3000

   # Database
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_here
   JWT_EXPIRE=7d

   # Email Configuration
   RESEND_API_KEY=your_resend_api_key
   EMAIL_FROM=noreply@marketingfirm.com
   EMAIL_FROM_NAME=Marketing Firm

   # SMS Configuration (Twilio)
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=+1234567890

   # Security
   BCRYPT_ROUNDS=12
   ```

3. **Database Seeding**
   ```bash
   npm run seed
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/reset-password` - Reset password

### User Management
- `GET /api/users` - Get all users (admin)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin)
- `POST /api/users/:id/suspend` - Suspend user (admin)
- `POST /api/users/:id/activate` - Activate user (admin)

### API Key Management
- `GET /api/api-keys` - Get user's API keys
- `POST /api/api-keys` - Create new API key
- `GET /api/api-keys/:id` - Get API key by ID
- `PUT /api/api-keys/:id` - Update API key
- `DELETE /api/api-keys/:id` - Delete API key
- `POST /api/api-keys/:id/regenerate` - Regenerate API key
- `POST /api/api-keys/:id/reset-usage` - Reset usage counter

### Quota Management
- `GET /api/quotas` - Get user's quota
- `GET /api/quotas/usage` - Get detailed usage
- `GET /api/quotas/check` - Check quota availability
- `POST /api/quotas/reset` - Reset quota (admin)

### Email Service
- `POST /api/emails/send` - Send email
- `GET /api/emails` - Get user's emails
- `GET /api/emails/:id` - Get email by ID
- `GET /api/emails/stats/overview` - Get email statistics
- `POST /api/emails/:id/track/open` - Track email open
- `POST /api/emails/:id/track/click` - Track email click

### SMS Service
- `POST /api/sms/send` - Send SMS
- `GET /api/sms` - Get user's SMS messages
- `GET /api/sms/:id` - Get SMS by ID
- `GET /api/sms/stats/overview` - Get SMS statistics
- `POST /api/sms/webhook/delivery` - SMS delivery webhook

### Analytics
- `GET /api/analytics/overview` - Get analytics overview
- `GET /api/analytics/emails` - Get email analytics
- `GET /api/analytics/sms` - Get SMS analytics
- `GET /api/analytics/api-keys` - Get API key analytics
- `GET /api/analytics/export` - Export analytics data

### Admin Endpoints
- `GET /api/admin/dashboard` - Admin dashboard data
- `GET /api/admin/users` - Admin user management
- `GET /api/admin/api-keys` - Admin API key management
- `GET /api/admin/quotas` - Admin quota management
- `GET /api/admin/analytics` - Admin analytics

## 🔧 Configuration

### Database Models

#### User Model
- Authentication and profile management
- Role-based access control (user/admin)
- Plan-based features (free/starter/professional)
- Account security features

#### API Key Model
- Secure API access management
- Usage tracking and rate limiting
- Permission-based access control
- IP whitelisting support

#### Quota Model
- Plan-based usage limits
- Real-time quota tracking
- Automatic quota resets
- Usage analytics

#### Email/SMS Models
- Message tracking and delivery status
- Analytics and reporting
- Template support
- Cost tracking

### Security Features
- JWT token authentication
- Password hashing with bcrypt
- Rate limiting protection
- CORS configuration
- Security headers with Helmet
- Input validation and sanitization

### External Services
- **Email Service**: Resend API with Nodemailer fallback
- **SMS Service**: Twilio integration
- **Database**: MongoDB Atlas cloud database
- **Logging**: Winston for comprehensive logging

## 🚀 Deployment

1. **Production Environment**
   ```bash
   NODE_ENV=production npm start
   ```

2. **Environment Variables**
   - Set all required environment variables
   - Configure production database
   - Set up external service credentials

3. **Database Setup**
   - Create production database
   - Run seed script for initial data
   - Configure database indexes

4. **Monitoring**
   - Set up logging and monitoring
   - Configure error tracking
   - Set up health checks

## 📊 Monitoring & Analytics

The backend provides comprehensive monitoring and analytics:

- **User Analytics**: Registration, activity, and engagement metrics
- **Email Analytics**: Delivery rates, open rates, click rates, bounce rates
- **SMS Analytics**: Delivery rates, cost analysis, usage patterns
- **API Analytics**: Usage tracking, rate limiting, performance metrics
- **System Analytics**: Server health, database performance, error rates

## 🔒 Security

- **Authentication**: JWT-based with refresh tokens
- **Authorization**: Role-based access control
- **Rate Limiting**: API abuse prevention
- **Input Validation**: Comprehensive data validation
- **Security Headers**: Helmet.js protection
- **CORS**: Cross-origin resource sharing configuration
- **Password Security**: Bcrypt hashing with configurable rounds

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Marketing Firm Backend API** - Built with ❤️ using Node.js, Express.js, and MongoDB
