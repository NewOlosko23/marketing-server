// Test the upload endpoint directly
const API_BASE = 'https://marketing-server-7vx6.onrender.com/api';

async function testUploadEndpoint() {
  console.log('🧪 Testing Upload Endpoint');
  console.log('='.repeat(50));
  
  // Create a simple test CSV
  const testCSVContent = `Name,Email,Phone,Company
John Doe,john@example.com,+1234567890,Acme Corp
Jane Smith,jane@example.com,+1234567891,Tech Inc`;
  
  try {
    // Create FormData
    const formData = new FormData();
    const blob = new Blob([testCSVContent], { type: 'text/csv' });
    formData.append('file', blob, 'test-contacts.csv');
    formData.append('type', 'contacts');
    
    console.log('📤 Uploading test file...');
    console.log('📄 File content preview:');
    console.log(testCSVContent);
    
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    
    console.log('\n📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('\n📄 Response Body:');
    console.log(responseText);
    
    if (response.ok) {
      console.log('\n✅ Upload test successful!');
      try {
        const json = JSON.parse(responseText);
        console.log('📋 Parsed response:', JSON.stringify(json, null, 2));
      } catch {
        console.log('📄 Raw response:', responseText);
      }
    } else {
      console.log('\n❌ Upload test failed');
      console.log('📄 Error details:', responseText);
      
      // Check if it's an authentication error
      if (response.status === 401) {
        console.log('\n🔐 Authentication required - this is expected without a token');
        console.log('✅ The endpoint is working, just needs authentication');
      } else if (response.status === 400) {
        console.log('\n📝 Bad request - check the file format or server logs');
      } else {
        console.log('\n🔍 Unexpected error - check server configuration');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Network error:', error.message);
    console.log('\n🔧 Possible issues:');
    console.log('1. Server is not running');
    console.log('2. CORS configuration issue');
    console.log('3. Network connectivity problem');
  }
  
  console.log('\n🎯 Upload Endpoint Test Complete');
}

testUploadEndpoint().catch(console.error);
