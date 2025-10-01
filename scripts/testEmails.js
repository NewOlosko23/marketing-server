import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

// Test email addresses - replace with your actual test emails
const TEST_EMAILS = {
  registration: 'test@example.com', // Replace with your email
  passwordReset: 'test@example.com', // Replace with your email
  campaign: 'test@example.com' // Replace with your email
};

async function testRegistrationEmail() {
  console.log('\n🧪 Testing Registration Email...');
  
  try {
    const emailData = {
      to: TEST_EMAILS.registration,
      subject: 'Welcome to Marketing Firm - Verify Your Email',
      content: {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">Welcome to Marketing Firm!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your marketing journey starts here</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0;">Hi Test User!</h2>
              <p style="color: #666; line-height: 1.6;">
                Thank you for registering with Marketing Firm! We're excited to have you on board.
                To get started, please verify your email address by clicking the button below.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3001/verify-email?token=test_verification_token_12345" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 25px; 
                          display: inline-block;
                          font-weight: bold;
                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="http://localhost:3001/verify-email?token=test_verification_token_12345" 
                   style="color: #667eea; word-break: break-all;">
                  http://localhost:3001/verify-email?token=test_verification_token_12345
                </a>
              </p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">What's Next?</h3>
                <ul style="color: #666; padding-left: 20px;">
                  <li>Verify your email address</li>
                  <li>Complete your profile setup</li>
                  <li>Start creating your first campaign</li>
                  <li>Import your contact list</li>
                </ul>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-bottom: 0;">
                This link will expire in 24 hours. If you didn't create an account, please ignore this email.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© 2024 Marketing Firm. All rights reserved.</p>
              <p>This email was sent to test@example.com</p>
            </div>
          </div>
        `,
        text: `Welcome to Marketing Firm!\n\nHi Test User!\n\nThank you for registering with Marketing Firm! Please verify your email by visiting: http://localhost:3001/verify-email?token=test_verification_token_12345\n\nThis link will expire in 24 hours.\n\nBest regards,\nThe Marketing Firm Team`
      },
      from: {
        email: 'oloogeorge633@gmail.com',
        name: 'Marketing Firm'
      },
      userId: 'test_user_id'
    };

    const result = await emailService.sendEmail(emailData);
    console.log('✅ Registration email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('🔧 Provider:', result.provider);
    return result;
  } catch (error) {
    console.error('❌ Registration email failed:', error.message);
    throw error;
  }
}

async function testPasswordResetEmail() {
  console.log('\n🔐 Testing Password Reset Email...');
  
  try {
    const emailData = {
      to: TEST_EMAILS.passwordReset,
      subject: 'Reset Your Password - Marketing Firm',
      content: {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">Password Reset Request</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Secure your account</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0;">Hi Test User!</h2>
              <p style="color: #666; line-height: 1.6;">
                We received a request to reset your password for your Marketing Firm account.
                If you made this request, click the button below to reset your password.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3001/reset-password?token=test_reset_token_67890" 
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
                <a href="http://localhost:3001/reset-password?token=test_reset_token_67890" 
                   style="color: #ff6b6b; word-break: break-all;">
                  http://localhost:3001/reset-password?token=test_reset_token_67890
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
              <p>This email was sent to test@example.com</p>
            </div>
          </div>
        `,
        text: `Password Reset Request\n\nHi Test User!\n\nWe received a request to reset your password. Please visit: http://localhost:3001/reset-password?token=test_reset_token_67890\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nThe Marketing Firm Team`
      },
      from: {
        email: 'oloogeorge633@gmail.com',
        name: 'Marketing Firm'
      },
      userId: 'test_user_id'
    };

    const result = await emailService.sendEmail(emailData);
    console.log('✅ Password reset email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('🔧 Provider:', result.provider);
    return result;
  } catch (error) {
    console.error('❌ Password reset email failed:', error.message);
    throw error;
  }
}

async function testCampaignEmail() {
  console.log('\n📢 Testing Campaign Email...');
  
  try {
    const emailData = {
      to: TEST_EMAILS.campaign,
      subject: '🎉 Special Offer: 50% Off Your First Campaign!',
      content: {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">🎉 Special Offer!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Limited time promotion</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0;">Hi Test User!</h2>
              <p style="color: #666; line-height: 1.6;">
                We're excited to offer you an exclusive deal! Get <strong>50% off</strong> your first marketing campaign 
                when you upgrade to our Professional plan.
              </p>
              
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 10px; text-align: center; margin: 25px 0;">
                <h3 style="margin: 0 0 10px 0; font-size: 24px;">50% OFF</h3>
                <p style="margin: 0; font-size: 18px; opacity: 0.9;">Your First Campaign</p>
                <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.8;">Valid for 7 days only</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3001/upgrade?promo=50OFF" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 25px; 
                          display: inline-block;
                          font-weight: bold;
                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                  Claim Your Discount
                </a>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">What's Included:</h3>
                <ul style="color: #666; padding-left: 20px;">
                  <li>Unlimited email campaigns</li>
                  <li>Advanced analytics and reporting</li>
                  <li>Email template library</li>
                  <li>Priority customer support</li>
                  <li>API access for integrations</li>
                </ul>
              </div>
              
              <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
                <p style="color: #666; font-size: 14px; margin-bottom: 0;">
                  <strong>Terms:</strong> This offer is valid for new Professional plan subscribers only. 
                  Discount applies to the first month of service. Cannot be combined with other offers.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© 2024 Marketing Firm. All rights reserved.</p>
              <p>This email was sent to test@example.com</p>
              <p><a href="http://localhost:3001/unsubscribe?token=unsubscribe_token" style="color: #999;">Unsubscribe</a> | <a href="http://localhost:3001/preferences" style="color: #999;">Email Preferences</a></p>
            </div>
          </div>
        `,
        text: `Special Offer: 50% Off Your First Campaign!\n\nHi Test User!\n\nGet 50% off your first marketing campaign when you upgrade to our Professional plan!\n\nClaim your discount: http://localhost:3001/upgrade?promo=50OFF\n\nWhat's Included:\n- Unlimited email campaigns\n- Advanced analytics and reporting\n- Email template library\n- Priority customer support\n- API access for integrations\n\nThis offer is valid for 7 days only!\n\nBest regards,\nThe Marketing Firm Team`
      },
      from: {
        email: 'oloogeorge633@gmail.com',
        name: 'Marketing Firm'
      },
      userId: 'test_user_id'
    };

    const result = await emailService.sendEmail(emailData);
    console.log('✅ Campaign email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('🔧 Provider:', result.provider);
    return result;
  } catch (error) {
    console.error('❌ Campaign email failed:', error.message);
    throw error;
  }
}

async function testBulkEmails() {
  console.log('\n📬 Testing Bulk Email Sending...');
  
  try {
    const emails = [
      {
        _id: 'bulk_email_1',
        to: TEST_EMAILS.campaign,
        subject: 'Newsletter #1 - Marketing Tips',
        content: {
          html: '<h1>Marketing Tip #1</h1><p>Here are some great marketing tips...</p>',
          text: 'Marketing Tip #1: Here are some great marketing tips...'
        },
        from: {
          email: 'oloogeorge633@gmail.com',
          name: 'Marketing Firm'
        },
        userId: 'test_user_id'
      },
      {
        _id: 'bulk_email_2',
        to: TEST_EMAILS.campaign,
        subject: 'Newsletter #2 - Best Practices',
        content: {
          html: '<h1>Best Practices</h1><p>Learn the best practices for email marketing...</p>',
          text: 'Best Practices: Learn the best practices for email marketing...'
        },
        from: {
          email: 'oloogeorge633@gmail.com',
          name: 'Marketing Firm'
        },
        userId: 'test_user_id'
      }
    ];

    const results = await emailService.sendBulkEmails(emails);
    console.log('✅ Bulk emails sent successfully!');
    console.log('📊 Results:', results);
    return results;
  } catch (error) {
    console.error('❌ Bulk email failed:', error.message);
    throw error;
  }
}

async function testTemplateEmail() {
  console.log('\n📝 Testing Template Email...');
  
  try {
    const result = await emailService.sendTemplate('welcome', TEST_EMAILS.registration, {
      name: 'Test User',
      company: 'Test Company'
    });
    console.log('✅ Template email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('🔧 Provider:', result.provider);
    return result;
  } catch (error) {
    console.error('❌ Template email failed:', error.message);
    throw error;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Email Service Tests...');
  console.log('📧 Testing with Mailjet API...');
  console.log('⚠️  Make sure to update TEST_EMAILS with your actual email addresses!');
  
  const results = {
    registration: null,
    passwordReset: null,
    campaign: null,
    bulk: null,
    template: null
  };

  try {
    // Test individual emails
    results.registration = await testRegistrationEmail();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between emails
    
    results.passwordReset = await testPasswordResetEmail();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    results.campaign = await testCampaignEmail();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test bulk emails
    results.bulk = await testBulkEmails();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test template email
    results.template = await testTemplateEmail();
    
    console.log('\n🎉 All email tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('✅ Registration Email:', results.registration ? 'Sent' : 'Failed');
    console.log('✅ Password Reset Email:', results.passwordReset ? 'Sent' : 'Failed');
    console.log('✅ Campaign Email:', results.campaign ? 'Sent' : 'Failed');
    console.log('✅ Bulk Emails:', results.bulk ? 'Sent' : 'Failed');
    console.log('✅ Template Email:', results.template ? 'Sent' : 'Failed');
    
    console.log('\n📧 Check your email inbox for the test emails!');
    console.log('🔍 Look for emails from: oloogeorge633@gmail.com');
    
  } catch (error) {
    console.error('\n❌ Email tests failed:', error.message);
    console.error('🔧 Check your Mailjet API credentials and configuration');
  }
}

// Run the tests
runAllTests().catch(console.error);
