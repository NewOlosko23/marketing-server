import emailService from '../services/emailService.js';

// 🔧 IMPORTANT: Replace this with your actual email address
const YOUR_EMAIL = 'your-email@example.com'; // ⚠️ CHANGE THIS!

async function quickTest() {
  console.log('🚀 Quick Email Test with Mailjet');
  console.log('📧 Sending test email to:', YOUR_EMAIL);
  
  try {
    const emailData = {
      to: YOUR_EMAIL,
      subject: '🧪 Test Email from Marketing Firm',
      content: {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">🧪 Test Email</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Mailjet Integration Working!</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0;">Hello! 👋</h2>
              <p style="color: #666; line-height: 1.6;">
                This is a test email to verify that your Mailjet integration is working correctly.
                If you're receiving this email, congratulations! 🎉
              </p>
              
              <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #155724; margin: 0; font-size: 14px;">
                  <strong>✅ Success!</strong> Your email service is configured and working properly.
                </p>
              </div>
              
              <h3 style="color: #333;">What this means:</h3>
              <ul style="color: #666; padding-left: 20px;">
                <li>✅ Registration emails will be sent</li>
                <li>✅ Password reset emails will work</li>
                <li>✅ Campaign emails can be delivered</li>
                <li>✅ Bulk email sending is functional</li>
              </ul>
              
              <p style="color: #666; font-size: 14px; margin-bottom: 0;">
                <strong>Timestamp:</strong> ${new Date().toLocaleString()}<br>
                <strong>Provider:</strong> Mailjet<br>
                <strong>Status:</strong> Delivered Successfully
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© 2024 Marketing Firm. All rights reserved.</p>
            </div>
          </div>
        `,
        text: `Test Email from Marketing Firm\n\nHello!\n\nThis is a test email to verify that your Mailjet integration is working correctly.\n\n✅ Success! Your email service is configured and working properly.\n\nWhat this means:\n- Registration emails will be sent\n- Password reset emails will work\n- Campaign emails can be delivered\n- Bulk email sending is functional\n\nTimestamp: ${new Date().toLocaleString()}\nProvider: Mailjet\nStatus: Delivered Successfully\n\n© 2024 Marketing Firm. All rights reserved.`
      },
      from: {
        email: 'oloogeorge633@gmail.com',
        name: 'Marketing Firm'
      },
      userId: 'test_user_id'
    };

    const result = await emailService.sendEmail(emailData);
    
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('🔧 Provider:', result.provider);
    console.log('📬 Check your email inbox!');
    
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    console.error('🔧 Check your Mailjet API credentials');
    console.error('📝 Full error:', error);
  }
}

// Check if email is configured
if (YOUR_EMAIL === 'your-email@example.com') {
  console.log('⚠️  IMPORTANT: Please update YOUR_EMAIL in this file with your actual email address!');
  console.log('📝 Edit backend/scripts/quickEmailTest.js and change YOUR_EMAIL variable');
} else {
  quickTest().catch(console.error);
}
