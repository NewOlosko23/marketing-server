import emailService from '../services/emailService.js';

// 🔧 IMPORTANT: Replace this with your actual email address
const YOUR_EMAIL = 'your-email@example.com'; // ⚠️ CHANGE THIS TO YOUR EMAIL!

async function testRegistrationEmail() {
  console.log('\n🧪 Testing Registration Email...');
  
  const emailData = {
    to: YOUR_EMAIL,
    subject: '✅ Registration Test - Verify Your Email',
    content: {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to Marketing Firm!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Registration Email Test</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Hi Test User!</h2>
            <p style="color: #666; line-height: 1.6;">
              This is a test of the registration email functionality. In a real scenario, 
              users would receive this email after signing up to verify their email address.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="http://localhost:3001/verify-email?token=test_token_12345" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        display: inline-block;
                        font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            
            <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #155724; margin: 0; font-size: 14px;">
                <strong>✅ Test Status:</strong> Registration email functionality is working correctly!
              </p>
            </div>
          </div>
        </div>
      `,
      text: `Welcome to Marketing Firm!\n\nHi Test User!\n\nThis is a test of the registration email functionality.\n\nVerify your email: http://localhost:3001/verify-email?token=test_token_12345\n\n✅ Test Status: Registration email functionality is working correctly!`
    },
    from: {
      email: 'oloogeorge633@gmail.com',
      name: 'Marketing Firm'
    },
    userId: 'test_user_id'
  };

  return await emailService.sendEmail(emailData);
}

async function testPasswordResetEmail() {
  console.log('\n🔐 Testing Password Reset Email...');
  
  const emailData = {
    to: YOUR_EMAIL,
    subject: '🔐 Password Reset Test - Marketing Firm',
    content: {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Password Reset Request</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Password Reset Email Test</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Hi Test User!</h2>
            <p style="color: #666; line-height: 1.6;">
              This is a test of the password reset email functionality. In a real scenario, 
              users would receive this email when they request a password reset.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="http://localhost:3001/reset-password?token=test_reset_token_67890" 
                 style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        display: inline-block;
                        font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #155724; margin: 0; font-size: 14px;">
                <strong>✅ Test Status:</strong> Password reset email functionality is working correctly!
              </p>
            </div>
          </div>
        </div>
      `,
      text: `Password Reset Request\n\nHi Test User!\n\nThis is a test of the password reset email functionality.\n\nReset your password: http://localhost:3001/reset-password?token=test_reset_token_67890\n\n✅ Test Status: Password reset email functionality is working correctly!`
    },
    from: {
      email: 'oloogeorge633@gmail.com',
      name: 'Marketing Firm'
    },
    userId: 'test_user_id'
  };

  return await emailService.sendEmail(emailData);
}

async function testCampaignEmail() {
  console.log('\n📢 Testing Campaign Email...');
  
  const emailData = {
    to: YOUR_EMAIL,
    subject: '📢 Campaign Test - Special Marketing Offer!',
    content: {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Special Offer!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Campaign Email Test</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Hi Test User!</h2>
            <p style="color: #666; line-height: 1.6;">
              This is a test of the campaign email functionality. In a real scenario, 
              this would be sent to your contact list as part of a marketing campaign.
            </p>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 10px; text-align: center; margin: 25px 0;">
              <h3 style="margin: 0 0 10px 0; font-size: 24px;">50% OFF</h3>
              <p style="margin: 0; font-size: 18px; opacity: 0.9;">Your First Campaign</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="http://localhost:3001/upgrade?promo=50OFF" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        display: inline-block;
                        font-weight: bold;">
                Claim Your Discount
              </a>
            </div>
            
            <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #155724; margin: 0; font-size: 14px;">
                <strong>✅ Test Status:</strong> Campaign email functionality is working correctly!
              </p>
            </div>
          </div>
        </div>
      `,
      text: `Special Offer: 50% Off Your First Campaign!\n\nHi Test User!\n\nThis is a test of the campaign email functionality.\n\nClaim your discount: http://localhost:3001/upgrade?promo=50OFF\n\n✅ Test Status: Campaign email functionality is working correctly!`
    },
    from: {
      email: 'oloogeorge633@gmail.com',
      name: 'Marketing Firm'
    },
    userId: 'test_user_id'
  };

  return await emailService.sendEmail(emailData);
}

async function testBulkEmails() {
  console.log('\n📬 Testing Bulk Email Sending...');
  
  const emails = [
    {
      _id: 'bulk_test_1',
      to: YOUR_EMAIL,
      subject: '📬 Bulk Email Test #1',
      content: {
        html: '<h1>Bulk Email Test #1</h1><p>This is the first email in a bulk send test.</p>',
        text: 'Bulk Email Test #1: This is the first email in a bulk send test.'
      },
      from: {
        email: 'oloogeorge633@gmail.com',
        name: 'Marketing Firm'
      },
      userId: 'test_user_id'
    },
    {
      _id: 'bulk_test_2',
      to: YOUR_EMAIL,
      subject: '📬 Bulk Email Test #2',
      content: {
        html: '<h1>Bulk Email Test #2</h1><p>This is the second email in a bulk send test.</p>',
        text: 'Bulk Email Test #2: This is the second email in a bulk send test.'
      },
      from: {
        email: 'oloogeorge633@gmail.com',
        name: 'Marketing Firm'
      },
      userId: 'test_user_id'
    }
  ];

  return await emailService.sendBulkEmails(emails);
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Email Tests...');
  console.log('📧 Testing with Mailjet API...');
  console.log('📬 Target Email:', YOUR_EMAIL);
  
  if (YOUR_EMAIL === 'your-email@example.com') {
    console.log('\n⚠️  IMPORTANT: Please update YOUR_EMAIL in this file with your actual email address!');
    console.log('📝 Edit backend/scripts/testAllEmails.js and change YOUR_EMAIL variable');
    return;
  }
  
  const results = {
    registration: null,
    passwordReset: null,
    campaign: null,
    bulk: null
  };

  try {
    // Test registration email
    console.log('\n' + '='.repeat(50));
    results.registration = await testRegistrationEmail();
    console.log('✅ Registration email sent successfully!');
    console.log('📧 Message ID:', results.registration.messageId);
    
    // Wait 2 seconds between emails
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test password reset email
    console.log('\n' + '='.repeat(50));
    results.passwordReset = await testPasswordResetEmail();
    console.log('✅ Password reset email sent successfully!');
    console.log('📧 Message ID:', results.passwordReset.messageId);
    
    // Wait 2 seconds between emails
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test campaign email
    console.log('\n' + '='.repeat(50));
    results.campaign = await testCampaignEmail();
    console.log('✅ Campaign email sent successfully!');
    console.log('📧 Message ID:', results.campaign.messageId);
    
    // Wait 2 seconds between emails
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test bulk emails
    console.log('\n' + '='.repeat(50));
    results.bulk = await testBulkEmails();
    console.log('✅ Bulk emails sent successfully!');
    console.log('📊 Bulk Results:', results.bulk);
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 ALL EMAIL TESTS COMPLETED SUCCESSFULLY!');
    console.log('\n📊 Test Summary:');
    console.log('✅ Registration Email:', results.registration ? 'Sent' : 'Failed');
    console.log('✅ Password Reset Email:', results.passwordReset ? 'Sent' : 'Failed');
    console.log('✅ Campaign Email:', results.campaign ? 'Sent' : 'Failed');
    console.log('✅ Bulk Emails:', results.bulk ? 'Sent' : 'Failed');
    
    console.log('\n📧 Check your email inbox for all test emails!');
    console.log('🔍 Look for emails from: oloogeorge633@gmail.com');
    console.log('📬 You should receive 5 emails total (1 registration + 1 password reset + 1 campaign + 2 bulk)');
    
  } catch (error) {
    console.error('\n❌ Email tests failed:', error.message);
    console.error('🔧 Check your Mailjet API credentials and configuration');
    console.error('📝 Full error:', error);
  }
}

// Run the tests
runAllTests().catch(console.error);
