import emailService from '../services/emailService.js';

async function checkMailjetConfiguration() {
  console.log('🔍 Checking Mailjet Configuration...');
  console.log('='.repeat(50));
  
  // Check if Mailjet is configured
  if (!emailService.mailjet) {
    console.log('❌ Mailjet is not configured!');
    console.log('🔧 Fix: Check emailService.js configuration');
    return false;
  }
  
  console.log('✅ Mailjet is configured');
  
  // Check API credentials
  const apiKey = emailService.mailjet.apiKey;
  const apiSecret = emailService.mailjet.apiSecret;
  
  console.log('🔑 API Key:', apiKey ? 'Set' : 'Missing');
  console.log('🔐 API Secret:', apiSecret ? 'Set' : 'Missing');
  
  // Check if using default/test credentials
  if (apiKey === '77f88844f6df9fce5cb22b9e26e99208') {
    console.log('⚠️  WARNING: Using default Mailjet API key!');
    console.log('🔧 This is likely a test/placeholder key that won\'t work');
    console.log('📝 You need to update this with your actual Mailjet API credentials');
    console.log('🌐 Get your credentials from: https://app.mailjet.com/account/api_keys');
    return false;
  }
  
  if (apiSecret === '8305269ebd5a9d920e7cc128a7e86b62') {
    console.log('⚠️  WARNING: Using default Mailjet API secret!');
    console.log('🔧 This is likely a test/placeholder secret that won\'t work');
    console.log('📝 You need to update this with your actual Mailjet API secret');
    return false;
  }
  
  console.log('✅ API credentials appear to be custom (not default)');
  
  // Test Mailjet connection
  try {
    console.log('\n🧪 Testing Mailjet connection...');
    
    // Try to make a simple API call to test credentials
    const testRequest = emailService.mailjet.get('user');
    const result = await testRequest.request();
    
    console.log('✅ Mailjet connection successful!');
    console.log('📧 Account info:', result.body.Data[0]);
    
    return true;
    
  } catch (error) {
    console.log('❌ Mailjet connection failed:', error.message);
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('🔍 Authentication Error:');
      console.log('1. Check your API key and secret are correct');
      console.log('2. Verify your Mailjet account is active');
      console.log('3. Check if your account has the necessary permissions');
    }
    
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      console.log('🔍 Permission Error:');
      console.log('1. Check if your Mailjet account has sending permissions');
      console.log('2. Verify your account is not in sandbox mode');
      console.log('3. Check if you have sufficient credits');
    }
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      console.log('🔍 Network Error:');
      console.log('1. Check your internet connection');
      console.log('2. Verify Mailjet API endpoints are accessible');
      console.log('3. Check for firewall restrictions');
    }
    
    return false;
  }
}

async function provideMailjetSetupInstructions() {
  console.log('\n📋 Mailjet Setup Instructions:');
  console.log('='.repeat(50));
  
  console.log('1️⃣ Create Mailjet Account:');
  console.log('   • Go to https://app.mailjet.com/');
  console.log('   • Sign up for a free account');
  console.log('   • Verify your email address');
  
  console.log('\n2️⃣ Get API Credentials:');
  console.log('   • Go to https://app.mailjet.com/account/api_keys');
  console.log('   • Copy your API Key and Secret Key');
  console.log('   • Note: These are different from the default values in your code');
  
  console.log('\n3️⃣ Update Your Code:');
  console.log('   • Edit backend/services/emailService.js');
  console.log('   • Replace the hardcoded API key and secret');
  console.log('   • Or better yet, use environment variables');
  
  console.log('\n4️⃣ Verify Sender Email:');
  console.log('   • Go to https://app.mailjet.com/account/sender');
  console.log('   • Add and verify oloogeorge633@gmail.com');
  console.log('   • Or use a different verified sender email');
  
  console.log('\n5️⃣ Test Email Sending:');
  console.log('   • Run: node scripts/testWithYourEmail.js');
  console.log('   • Check your email inbox');
  console.log('   • Check spam folder if not in inbox');
}

async function runMailjetCheck() {
  console.log('🚀 Mailjet Configuration Check');
  console.log('🔍 Diagnosing email service issues...');
  console.log('='.repeat(50));
  
  const isConfigured = await checkMailjetConfiguration();
  
  if (isConfigured) {
    console.log('\n✅ Mailjet is properly configured!');
    console.log('📧 Email sending should work correctly');
    console.log('🔍 If you\'re still not receiving emails:');
    console.log('   - Check your spam/junk folder');
    console.log('   - Verify the sender email is authorized');
    console.log('   - Check Mailjet delivery logs');
  } else {
    console.log('\n❌ Mailjet configuration has issues');
    console.log('🔧 Please fix the configuration before testing emails');
    await provideMailjetSetupInstructions();
  }
}

// Run the check
runMailjetCheck().catch(console.error);
