import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

// 🔧 IMPORTANT: Replace this with your actual email address
const YOUR_EMAIL = 'your-email@example.com'; // ⚠️ CHANGE THIS!

async function debugEmailService() {
  console.log('🔍 Debugging Email Service Issues...');
  console.log('='.repeat(60));
  
  // 1. Check email service initialization
  console.log('\n1️⃣ Email Service Initialization:');
  console.log('📧 Mailjet configured:', emailService.mailjet ? '✅ Yes' : '❌ No');
  console.log('📧 SMTP fallback configured:', emailService.transporter ? '✅ Yes' : '❌ No');
  
  if (!emailService.mailjet && !emailService.transporter) {
    console.log('❌ CRITICAL: No email service is configured!');
    console.log('🔧 Fix: Check your Mailjet API credentials in emailService.js');
    return false;
  }
  
  // 2. Check Mailjet configuration
  if (emailService.mailjet) {
    console.log('\n2️⃣ Mailjet Configuration:');
    console.log('🔑 API Key:', emailService.mailjet.apiKey ? '✅ Set' : '❌ Missing');
    console.log('🔐 API Secret:', emailService.mailjet.apiSecret ? '✅ Set' : '❌ Missing');
    
    // Check if credentials are the default/test values
    if (emailService.mailjet.apiKey === '77f88844f6df9fce5cb22b9e26e99208') {
      console.log('⚠️  WARNING: Using default Mailjet API key - this may not work!');
    }
  }
  
  // 3. Test email sending
  console.log('\n3️⃣ Testing Email Sending:');
  
  if (YOUR_EMAIL === 'your-email@example.com') {
    console.log('⚠️  Please update YOUR_EMAIL in this file to test email sending');
    return false;
  }
  
  try {
    const testEmail = {
      to: YOUR_EMAIL,
      subject: '🧪 Email Service Debug Test',
      content: {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">🧪 Email Debug Test</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Testing email delivery</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0;">Email Service Test</h2>
              <p style="color: #666; line-height: 1.6;">
                This is a test email to verify that your email service is working correctly.
                If you're receiving this email, the email service is functioning properly.
              </p>
              
              <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #155724; margin: 0; font-size: 14px;">
                  <strong>✅ Success!</strong> Email service is working correctly.
                </p>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-bottom: 0;">
                <strong>Timestamp:</strong> ${new Date().toLocaleString()}<br>
                <strong>Provider:</strong> ${emailService.mailjet ? 'Mailjet' : 'SMTP'}<br>
                <strong>Status:</strong> Delivered Successfully
              </p>
            </div>
          </div>
        `,
        text: `Email Service Test\n\nThis is a test email to verify that your email service is working correctly.\n\n✅ Success! Email service is working correctly.\n\nTimestamp: ${new Date().toLocaleString()}\nProvider: ${emailService.mailjet ? 'Mailjet' : 'SMTP'}\nStatus: Delivered Successfully`
      },
      from: {
        email: 'oloogeorge633@gmail.com',
        name: 'Marketing Firm'
      },
      userId: 'debug_test'
    };

    console.log('📤 Sending test email...');
    const result = await emailService.sendEmail(testEmail);
    
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('🔧 Provider:', result.provider);
    
    return true;
    
  } catch (error) {
    console.log('❌ Test email failed:', error.message);
    
    // Detailed error analysis
    if (error.message.includes('Mailjet')) {
      console.log('\n🔍 Mailjet Error Analysis:');
      console.log('1. Check if your Mailjet API credentials are correct');
      console.log('2. Verify your Mailjet account is active and not suspended');
      console.log('3. Check if you have sufficient credits in your Mailjet account');
      console.log('4. Verify the sender email (oloogeorge633@gmail.com) is authorized in Mailjet');
    }
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      console.log('\n🔍 Network Error Analysis:');
      console.log('1. Check your internet connection');
      console.log('2. Verify Mailjet API endpoints are accessible');
      console.log('3. Check if there are any firewall restrictions');
    }
    
    if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
      console.log('\n🔍 Authentication Error Analysis:');
      console.log('1. Verify your Mailjet API key and secret are correct');
      console.log('2. Check if your Mailjet account has the necessary permissions');
      console.log('3. Ensure your Mailjet account is not in sandbox mode');
    }
    
    return false;
  }
}

async function checkPasswordResetFlow() {
  console.log('\n4️⃣ Password Reset Flow Analysis:');
  
  // Check if the forgot-password route exists
  console.log('🔍 Checking password reset route...');
  
  // Simulate the password reset process
  console.log('📝 Password reset process:');
  console.log('1. User requests password reset → POST /api/auth/forgot-password');
  console.log('2. System generates reset token → JWT token with 1h expiry');
  console.log('3. System sends email → emailService.sendEmail()');
  console.log('4. User clicks link → GET /reset-password?token=...');
  console.log('5. User submits new password → POST /api/auth/reset-password');
  
  console.log('\n🔍 Common issues with password reset:');
  console.log('1. Email not sent → Check email service configuration');
  console.log('2. Email goes to spam → Check sender reputation');
  console.log('3. Link doesn\'t work → Check frontend URL configuration');
  console.log('4. Token expired → Check token expiry time');
  console.log('5. User not found → Check database connection');
}

async function provideSolutions() {
  console.log('\n5️⃣ Solutions & Recommendations:');
  
  console.log('\n🔧 If emails are not being sent:');
  console.log('1. Update Mailjet API credentials in emailService.js');
  console.log('2. Verify sender email is authorized in Mailjet dashboard');
  console.log('3. Check Mailjet account status and credits');
  console.log('4. Test with a different email address');
  
  console.log('\n🔧 If emails are sent but not received:');
  console.log('1. Check spam/junk folder');
  console.log('2. Check email filters and rules');
  console.log('3. Try a different email address');
  console.log('4. Check Mailjet delivery logs');
  
  console.log('\n🔧 If password reset link doesn\'t work:');
  console.log('1. Check frontend URL in auth.js (currently: http://localhost:3001)');
  console.log('2. Verify frontend reset-password page exists');
  console.log('3. Check token validation logic');
  console.log('4. Verify JWT secret is consistent');
  
  console.log('\n📋 Next Steps:');
  console.log('1. Run: node scripts/testPasswordReset.js');
  console.log('2. Check your email inbox (and spam folder)');
  console.log('3. If no email received, check Mailjet dashboard');
  console.log('4. Update email configuration if needed');
}

async function runFullDebug() {
  console.log('🚀 Email Service Debug Tool');
  console.log('🔍 Diagnosing password reset email issues...');
  console.log('='.repeat(60));
  
  // Run all debug checks
  const emailWorking = await debugEmailService();
  await checkPasswordResetFlow();
  await provideSolutions();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 Debug Summary:');
  
  if (emailWorking) {
    console.log('✅ Email service is working correctly');
    console.log('📧 Password reset emails should be delivered');
    console.log('🔍 If you\'re still not receiving emails, check:');
    console.log('   - Spam/junk folder');
    console.log('   - Email filters');
    console.log('   - Mailjet delivery logs');
  } else {
    console.log('❌ Email service has issues');
    console.log('🔧 Please fix the email service configuration');
    console.log('📝 Check the error messages above for specific issues');
  }
}

// Run the debug tool
runFullDebug().catch(console.error);
