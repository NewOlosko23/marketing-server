import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

// 🔧 IMPORTANT: Replace this with your actual email address
const YOUR_EMAIL = 'your-email@example.com'; // ⚠️ CHANGE THIS!

async function testPasswordResetEmail() {
  console.log('🔐 Testing Password Reset Email...');
  console.log('📧 Sending to:', YOUR_EMAIL);
  
  if (YOUR_EMAIL === 'your-email@example.com') {
    console.log('⚠️  IMPORTANT: Please update YOUR_EMAIL in this file with your actual email address!');
    console.log('📝 Edit backend/scripts/testPasswordReset.js and change YOUR_EMAIL variable');
    return;
  }

  try {
    // Simulate the exact same email that would be sent during password reset
    const resetToken = 'test_reset_token_' + Date.now();
    
    const emailData = {
      to: YOUR_EMAIL,
      subject: 'Password Reset - Marketing Firm',
      content: {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">🔐 Password Reset Request</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Marketing Firm</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0;">Hi Test User!</h2>
              <p style="color: #666; line-height: 1.6;">
                You requested to reset your password for your Marketing Firm account.
                If you made this request, click the button below to reset your password.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3001/reset-password?token=${resetToken}" 
                   style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 25px; 
                          display: inline-block;
                          font-weight: bold;
                          box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="http://localhost:3001/reset-password?token=${resetToken}" 
                   style="color: #ff6b6b; word-break: break-all;">
                  http://localhost:3001/reset-password?token=${resetToken}
                </a>
              </p>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #856404; margin: 0; font-size: 14px;">
                  <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour for your security.
                  If you didn't request this password reset, please ignore this email and your password will remain unchanged.
                </p>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-bottom: 0;">
                For security reasons, this link can only be used once. If you need to reset your password again, 
                please request a new reset link.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© 2024 Marketing Firm. All rights reserved.</p>
              <p>This email was sent to ${YOUR_EMAIL}</p>
            </div>
          </div>
        `,
        text: `Password Reset Request\n\nHi Test User!\n\nYou requested to reset your password for your Marketing Firm account.\n\nReset your password: http://localhost:3001/reset-password?token=${resetToken}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nThe Marketing Firm Team`
      },
      from: {
        email: 'oloogeorge633@gmail.com',
        name: 'Marketing Firm'
      },
      userId: 'test_user_id'
    };

    console.log('📤 Sending password reset email...');
    const result = await emailService.sendEmail(emailData);
    
    console.log('✅ Password reset email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('🔧 Provider:', result.provider);
    console.log('📬 Check your email inbox!');
    console.log('🔍 Look for email from: oloogeorge633@gmail.com');
    
    return result;
    
  } catch (error) {
    console.error('❌ Password reset email failed:', error.message);
    console.error('🔧 Full error details:', error);
    
    // Check specific error types
    if (error.message.includes('Mailjet')) {
      console.log('\n🔍 Mailjet Error - Possible issues:');
      console.log('1. Check your Mailjet API credentials');
      console.log('2. Verify your Mailjet account is active');
      console.log('3. Check if your sender email is verified in Mailjet');
    }
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      console.log('\n🔍 Network Error - Possible issues:');
      console.log('1. Check your internet connection');
      console.log('2. Verify Mailjet API endpoints are accessible');
    }
    
    throw error;
  }
}

async function testEmailServiceConnection() {
  console.log('\n🔍 Testing Email Service Connection...');
  
  try {
    // Test if email service is properly initialized
    console.log('📧 Email service status:', emailService.mailjet ? 'Mailjet configured' : 'Mailjet not configured');
    console.log('📧 SMTP fallback status:', emailService.transporter ? 'SMTP configured' : 'SMTP not configured');
    
    if (!emailService.mailjet && !emailService.transporter) {
      console.log('❌ No email service configured!');
      return false;
    }
    
    console.log('✅ Email service is configured');
    return true;
    
  } catch (error) {
    console.error('❌ Email service connection test failed:', error.message);
    return false;
  }
}

async function runPasswordResetTest() {
  console.log('🚀 Password Reset Email Test');
  console.log('='.repeat(50));
  
  // Test email service connection first
  const connectionOk = await testEmailServiceConnection();
  
  if (!connectionOk) {
    console.log('\n❌ Email service not properly configured. Please check your configuration.');
    return;
  }
  
  // Test password reset email
  try {
    await testPasswordResetEmail();
    
    console.log('\n🎉 Password reset email test completed!');
    console.log('\n📋 If you received the email:');
    console.log('✅ Password reset functionality is working correctly');
    console.log('✅ Email service is properly configured');
    
    console.log('\n📋 If you did NOT receive the email:');
    console.log('1. Check your spam/junk folder');
    console.log('2. Verify your email address is correct');
    console.log('3. Check Mailjet dashboard for delivery status');
    console.log('4. Verify sender email is authorized in Mailjet');
    
  } catch (error) {
    console.log('\n❌ Password reset test failed');
    console.log('🔧 Please check the error messages above for troubleshooting steps');
  }
}

// Run the test
runPasswordResetTest().catch(console.error);
