// Test file upload endpoint
const API_BASE = 'https://marketing-server-7vx6.onrender.com/api';

async function testFileUpload() {
  console.log('🧪 Testing File Upload Endpoint');
  console.log('='.repeat(50));
  
  // Create a test CSV file
  const testCSVContent = `Name,Email,Phone,Company
John Doe,john@example.com,+1234567890,Acme Corp
Jane Smith,jane@example.com,+1234567891,Tech Inc`;
  
  // Create FormData
  const formData = new FormData();
  const blob = new Blob([testCSVContent], { type: 'text/csv' });
  formData.append('file', blob, 'test-contacts.csv');
  formData.append('type', 'contacts');
  
  try {
    console.log('📤 Uploading test file...');
    
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header, let browser set it with boundary
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log('📄 Response body:', data);
    
    if (response.ok) {
      console.log('✅ File upload test successful!');
      try {
        const json = JSON.parse(data);
        console.log('📋 Upload results:', JSON.stringify(json, null, 2));
      } catch {
        console.log('📄 Raw response:', data);
      }
    } else {
      console.log('❌ File upload test failed');
      console.log('📄 Error response:', data);
    }
    
  } catch (error) {
    console.error('❌ Upload test error:', error.message);
  }
  
  console.log('\n🔧 If upload still fails:');
  console.log('1. The server needs to be restarted to create the uploads directory');
  console.log('2. Check that the uploads directory exists on the server');
  console.log('3. Verify file permissions are correct');
}

testFileUpload().catch(console.error);
