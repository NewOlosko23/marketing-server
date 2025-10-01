# 🔧 Environment Configuration Setup

This guide explains how to set up and use environment variables for your Marketing Firm backend.

## 📁 Files Created

- **`.env`** - Your actual environment variables (DO NOT COMMIT TO GIT)
- **`.env.example`** - Template for other developers (SAFE TO COMMIT)
- **`env.current`** - Current configuration extracted from your codebase
- **`env.example`** - Comprehensive example with all possible variables

## 🚀 Quick Start

1. **Environment files are already created** with your current configuration
2. **Review the `.env` file** and update any values as needed
3. **Update your code** to use `process.env` variables instead of hardcoded values

## 📋 Current Configuration Extracted

### 🔧 Server Configuration
```env
NODE_ENV=development
PORT=5000
HOST=localhost
```

### 🗄️ Database Configuration
```env
MONGO_URI=mongodb+srv://oloogeorge633_db_user:oloogeorge633_db_user@cluster0.rgrun31.mongodb.net/marketing_firm?retryWrites=true&w=majority&appName=Cluster0
```

### 🔐 JWT Configuration
```env
JWT_SECRET=dsfb66YUGyugYi
JWT_EXPIRE=7d
```

### 🌐 Frontend Configuration
```env
FRONTEND_URL=http://localhost:3001
FRONTEND_DOMAIN=localhost:3001
```

### 📧 Email Service Configuration
```env
MAILJET_API_KEY=77f88844f6df9fce5cb22b9e26e99208
MAILJET_API_SECRET=8305269ebd5a9d920e7cc128a7e86b62
FROM_EMAIL=oloogeorge633@gmail.com
FROM_NAME=Marketing Firm
```

### 📱 SMS Service Configuration
```env
TWILIO_ACCOUNT_SID=AC1234567890abcdef1234567890abcdef
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

## 🔄 Code Updates Needed

### 1. Update server.js
```javascript
// Before (hardcoded)
const PORT = 5000;
app.use(cors({
  origin: "http://localhost:3001",
}));

// After (environment variables)
const PORT = process.env.PORT || 5000;
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3001",
}));
```

### 2. Update auth.js
```javascript
// Before (hardcoded)
return jwt.sign({ id }, 'dsfb66YUGyugYi', {
  expiresIn: '7d'
});

// After (environment variables)
return jwt.sign({ id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRE || '7d'
});
```

### 3. Update emailService.js
```javascript
// Before (hardcoded)
this.mailjet = new Mailjet({
  apiKey: '77f88844f6df9fce5cb22b9e26e99208',
  apiSecret: '8305269ebd5a9d920e7cc128a7e86b62'
});

// After (environment variables)
this.mailjet = new Mailjet({
  apiKey: process.env.MAILJET_API_KEY,
  apiSecret: process.env.MAILJET_API_SECRET
});
```

### 4. Update smsService.js
```javascript
// Before (hardcoded)
this.client = twilio(
  'AC1234567890abcdef1234567890abcdef',
  'your_twilio_auth_token_here'
);

// After (environment variables)
this.client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
```

## 🛡️ Security Best Practices

### 1. Never Commit .env Files
```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

### 2. Use Different Values for Production
```env
# Development
NODE_ENV=development
JWT_SECRET=dev_secret_key

# Production
NODE_ENV=production
JWT_SECRET=super_secure_production_key_here
```

### 3. Validate Required Variables
```javascript
// Add to server.js
const requiredEnvVars = [
  'JWT_SECRET',
  'MONGO_URI',
  'MAILJET_API_KEY',
  'MAILJET_API_SECRET'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});
```

## 🔄 Environment-Specific Configurations

### Development
```env
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
```

### Production
```env
NODE_ENV=production
DEBUG=false
LOG_LEVEL=error
```

### Testing
```env
NODE_ENV=test
TEST_DATABASE_URL=mongodb://localhost:27017/marketing_firm_test
```

## 📝 Environment Variable Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | ✅ |
| `PORT` | Server port | `5000` | ✅ |
| `MONGO_URI` | MongoDB connection string | - | ✅ |
| `JWT_SECRET` | JWT signing secret | - | ✅ |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3001` | ✅ |
| `MAILJET_API_KEY` | Mailjet API key | - | ✅ |
| `MAILJET_API_SECRET` | Mailjet API secret | - | ✅ |
| `FROM_EMAIL` | Default sender email | - | ✅ |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | - | ❌ |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | - | ❌ |

## 🚀 Deployment

### 1. Copy Environment File
```bash
cp .env.example .env
```

### 2. Update Values
Edit `.env` with your production values.

### 3. Load Environment Variables
```javascript
// Add to the top of server.js
import dotenv from 'dotenv';
dotenv.config();
```

## 🔍 Troubleshooting

### Common Issues

1. **Environment variables not loading**
   ```javascript
   // Make sure dotenv is configured
   import dotenv from 'dotenv';
   dotenv.config();
   ```

2. **Missing variables**
   ```javascript
   // Check if variable exists
   if (!process.env.JWT_SECRET) {
     console.error('JWT_SECRET is not defined');
   }
   ```

3. **Type conversion**
   ```javascript
   // Convert string to number
   const port = parseInt(process.env.PORT) || 5000;
   ```

## 📚 Additional Resources

- [Node.js Environment Variables](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [Environment Variables Best Practices](https://12factor.net/config)

## ✅ Checklist

- [ ] Environment files created
- [ ] Code updated to use environment variables
- [ ] Security review completed
- [ ] Production values configured
- [ ] .env added to .gitignore
- [ ] Team members have .env.example
- [ ] Documentation updated
