import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Current configuration values extracted from your codebase
const currentConfig = {
  // Server Configuration
  NODE_ENV: 'development',
  PORT: '5000',
  HOST: 'localhost',

  // Database Configuration
  MONGO_URI: 'mongodb+srv://oloogeorge633_db_user:oloogeorge633_db_user@cluster0.rgrun31.mongodb.net/marketing_firm?retryWrites=true&w=majority&appName=Cluster0',

  // JWT Configuration
  JWT_SECRET: 'dsfb66YUGyugYi',
  JWT_EXPIRE: '7d',

  // Frontend Configuration
  FRONTEND_URL: 'http://localhost:3001',
  FRONTEND_DOMAIN: 'localhost:3001',

  // Email Service Configuration
  MAILJET_API_KEY: '77f88844f6df9fce5cb22b9e26e99208',
  MAILJET_API_SECRET: '8305269ebd5a9d920e7cc128a7e86b62',
  FROM_EMAIL: 'oloogeorge633@gmail.com',
  FROM_NAME: 'Marketing Firm',
  REPLY_TO_EMAIL: 'oloogeorge633@gmail.com',

  // SMTP Configuration (Fallback)
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: 'oloogeorge633@gmail.com',
  SMTP_PASS: 'your_smtp_app_password_here',

  // SMS Service Configuration
  TWILIO_ACCOUNT_SID: 'AC1234567890abcdef1234567890abcdef',
  TWILIO_AUTH_TOKEN: 'your_twilio_auth_token_here',
  TWILIO_PHONE_NUMBER: '+1234567890',
  SMS_FROM_NUMBER: '+1234567890',
  SMS_WEBHOOK_URL: 'http://localhost:5000/api/sms/webhook/delivery',

  // Security Configuration
  RATE_LIMIT_WINDOW_MS: '900000',
  RATE_LIMIT_MAX_REQUESTS: '100',
  BCRYPT_ROUNDS: '12',
  PASSWORD_MIN_LENGTH: '6',
  PASSWORD_MAX_LENGTH: '128',

  // File Upload Configuration
  MAX_FILE_SIZE: '10485760',
  ALLOWED_FILE_TYPES: 'xlsx,xls,csv',
  UPLOAD_PATH: 'uploads',

  // Quota Configuration
  FREE_PLAN_EMAIL_LIMIT: '2000',
  FREE_PLAN_SMS_LIMIT: '0',
  FREE_PLAN_API_LIMIT: '10000',
  STARTER_PLAN_EMAIL_LIMIT: '5000',
  STARTER_PLAN_SMS_LIMIT: '1000',
  STARTER_PLAN_API_LIMIT: '50000',
  PROFESSIONAL_PLAN_EMAIL_LIMIT: '25000',
  PROFESSIONAL_PLAN_SMS_LIMIT: '5000',
  PROFESSIONAL_PLAN_API_LIMIT: '200000',

  // Logging Configuration
  LOG_LEVEL: 'info',
  LOG_FILE: 'logs/combined.log',
  ERROR_LOG_FILE: 'logs/error.log',

  // Development Configuration
  DEBUG: 'true',
  VERBOSE_LOGGING: 'true',
  TEST_EMAIL: 'test@example.com'
};

function createEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = Object.entries(currentConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!');
    console.log('📁 Location:', envPath);
    return true;
  } catch (error) {
    console.error('❌ Failed to create .env file:', error.message);
    return false;
  }
}

function createEnvExample() {
  const examplePath = path.join(__dirname, '..', '.env.example');
  const exampleContent = Object.entries(currentConfig)
    .map(([key, value]) => {
      // Mask sensitive values in example
      if (key.includes('SECRET') || key.includes('PASSWORD') || key.includes('TOKEN') || key.includes('KEY')) {
        return `${key}=your_${key.toLowerCase()}_here`;
      }
      if (key.includes('EMAIL') && value.includes('@')) {
        return `${key}=your-email@example.com`;
      }
      if (key.includes('URI') && value.includes('mongodb')) {
        return `${key}=mongodb+srv://username:password@cluster.mongodb.net/database_name`;
      }
      return `${key}=${value}`;
    })
    .join('\n');

  try {
    fs.writeFileSync(examplePath, exampleContent);
    console.log('✅ .env.example file created successfully!');
    console.log('📁 Location:', examplePath);
    return true;
  } catch (error) {
    console.error('❌ Failed to create .env.example file:', error.message);
    return false;
  }
}

function showConfigSummary() {
  console.log('\n📊 Configuration Summary:');
  console.log('='.repeat(50));
  
  const categories = {
    'Server': ['NODE_ENV', 'PORT', 'HOST'],
    'Database': ['MONGO_URI'],
    'JWT': ['JWT_SECRET', 'JWT_EXPIRE'],
    'Frontend': ['FRONTEND_URL', 'FRONTEND_DOMAIN'],
    'Email': ['MAILJET_API_KEY', 'MAILJET_API_SECRET', 'FROM_EMAIL', 'FROM_NAME'],
    'SMS': ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
    'Security': ['RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_MAX_REQUESTS', 'BCRYPT_ROUNDS'],
    'Upload': ['MAX_FILE_SIZE', 'ALLOWED_FILE_TYPES', 'UPLOAD_PATH'],
    'Quotas': ['FREE_PLAN_EMAIL_LIMIT', 'STARTER_PLAN_EMAIL_LIMIT', 'PROFESSIONAL_PLAN_EMAIL_LIMIT']
  };

  Object.entries(categories).forEach(([category, keys]) => {
    console.log(`\n🔧 ${category}:`);
    keys.forEach(key => {
      if (currentConfig[key]) {
        const value = currentConfig[key];
        const displayValue = value.length > 50 ? value.substring(0, 47) + '...' : value;
        console.log(`   ${key}=${displayValue}`);
      }
    });
  });
}

function main() {
  console.log('🚀 Setting up Environment Configuration...');
  console.log('📝 Extracting configuration from your codebase...\n');

  // Show what we found
  showConfigSummary();

  console.log('\n' + '='.repeat(50));
  console.log('📁 Creating environment files...');

  // Create .env file
  const envCreated = createEnvFile();
  
  // Create .env.example file
  const exampleCreated = createEnvExample();

  if (envCreated && exampleCreated) {
    console.log('\n🎉 Environment setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Review the .env file and update any values as needed');
    console.log('2. Never commit the .env file to version control');
    console.log('3. Use .env.example as a template for other environments');
    console.log('4. Update your code to use process.env variables instead of hardcoded values');
    
    console.log('\n⚠️  Important Security Notes:');
    console.log('- Change the JWT_SECRET to a strong random string');
    console.log('- Update database credentials if needed');
    console.log('- Verify all API keys and tokens');
    console.log('- Consider using different values for production');
  } else {
    console.log('\n❌ Environment setup failed. Please check the errors above.');
  }
}

// Run the setup
main();
