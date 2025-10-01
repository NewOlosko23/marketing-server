import emailService from '../services/emailService.js';

// 🔧 UPDATE THIS WITH YOUR ACTUAL EMAIL ADDRESS
const YOUR_EMAIL = 'your-email@example.com'; // ⚠️ CHANGE THIS TO YOUR EMAIL!

async function testPasswordResetWithYourEmail() {
  console.log('🔐 Testing Password Reset with Your Email');
  console.log('='.repeat(50));
  
  if (YOUR_EMAIL === 'your-email@example.com') {
    console.log('⚠️  IMPORTANT: Please update YOUR_EMAIL in this file!');
    console.log('📝 Edit backend/scripts/testWithYourEmail.js');
    console.log('📝 Change: const YOUR_EMAIL = "your-email@example.com";');
    console.log('📝 To: const YOUR_EMAIL = "your-actual-email@gmail.com";');
    return;
  }
  
  console.log('📧 Testing with email:', YOUR_EMAIL);
  console.log('📤 Sending password reset email...');
  
  try {
    const resetToken = 'test_reset_token_' + Date.now();
    
    const emailData = {
      to: YOUR_EMAIL,
      subject: '🔐 Password Reset Test - Marketing Firm',
      content: {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">🔐 Password Reset Test</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Marketing Firm</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0;">Hi there!</h2>
              <p style="color: #666; line-height: 1.6;">
                This is a test of the password reset email functionality.
                If you receive this email, the password reset system is working correctly.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3001/reset-password?token=${resetToken}" 
                   style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 25px; 
                          display: inline-block;
                          font-weight: bold;">
                  Test Reset Password Link
                </a>
              </div>
              
              <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #155724; margin: 0; font-size: 14px;">
                  <strong>✅ Email Test Successful!</strong> If you're reading this, the email service is working correctly.
                </p>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-bottom: 0;">
                <strong>Test Details:</strong><br>
                • Timestamp: ${new Date().toLocaleString()}<br>
                • Provider: Mailjet<br>
                • Status: Delivered Successfully<br>
                • Reset Token: ${resetToken}
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© 2024 Marketing Firm. All rights reserved.</p>
              <p>This is a test email sent to ${YOUR_EMAIL}</p>
            </div>
          </div>
        `,
        text: `Password Reset Test\n\nHi there!\n\nThis is a test of the password reset email functionality.\n\nTest Reset Link: http://localhost:3001/reset-password?token=${resetToken}\n\n✅ Email Test Successful! If you're reading this, the email service is working correctly.\n\nTest Details:\n• Timestamp: ${new Date().toLocaleString()}\n• Provider: Mailjet\n• Status: Delivered Successfully\n• Reset Token: ${resetToken}\n\n© 2024 Marketing Firm. All rights reserved.`
      },
      from: {
        email: 'oloogeorge633@gmail.com',
        name: 'Marketing Firm'
      },
      userId: 'test_user_id'
    };

    const result = await emailService.sendEmail(emailData);
    
    console.log('✅ Password reset test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('🔧 Provider:', result.provider);
    console.log('📬 Check your email inbox now!');
    console.log('🔍 Look for email from: oloogeorge633@gmail.com');
    console.log('📧 Subject: "🔐 Password Reset Test - Marketing Firm"');
    
    console.log('\n📋 What to check:');
    console.log('1. Check your inbox for the test email');
    console.log('2. Check your spam/junk folder if not in inbox');
    console.log('3. If you receive the email, password reset is working!');
    console.log('4. If you don\'t receive it, there may be an issue with Mailjet configuration');
    
    return result;
    
  } catch (error) {
    console.error('❌ Password reset test failed:', error.message);
    console.error('🔧 Full error:', error);
    
    console.log('\n🔍 Troubleshooting steps:');
    console.log('1. Check if your Mailjet API credentials are valid');
    console.log('2. Verify your Mailjet account is active');
    console.log('3. Check if the sender email (oloogeorge633@gmail.com) is authorized');
    console.log('4. Try updating the Mailjet credentials in emailService.js');
    
    throw error;
  }
}

// Run the test
testPasswordResetWithYourEmail().catch(console.error);
