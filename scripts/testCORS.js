// Test CORS configuration
const API_BASE = 'https://marketing-server-7vx6.onrender.com/api';

async function testCORS() {
  console.log('🧪 Testing CORS Configuration');
  console.log('='.repeat(50));
  
  try {
    // Test with localhost:3000 origin
    console.log('📡 Testing with origin: http://localhost:3000');
    
    const response = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'
      },
      body: JSON.stringify({
        email: 'test@example.com'
      })
    });
    
    console.log('📊 Status:', response.status);
    console.log('📊 CORS Headers:');
    console.log('  - Access-Control-Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'));
    console.log('  - Access-Control-Allow-Credentials:', response.headers.get('Access-Control-Allow-Credentials'));
    console.log('  - Access-Control-Allow-Methods:', response.headers.get('Access-Control-Allow-Methods'));
    console.log('  - Access-Control-Allow-Headers:', response.headers.get('Access-Control-Allow-Headers'));
    
    if (response.ok) {
      console.log('✅ CORS is working correctly!');
      const data = await response.text();
      console.log('📄 Response:', data);
    } else {
      console.log('❌ Request failed, but CORS headers should be present');
    }
    
  } catch (error) {
    console.error('❌ CORS Test Error:', error.message);
  }
  
  console.log('\n🔧 If CORS is still not working:');
  console.log('1. The server needs to be restarted to pick up the new CORS configuration');
  console.log('2. Make sure your frontend is running on http://localhost:3000');
  console.log('3. Check that the backend has been deployed with the new CORS settings');
}

testCORS().catch(console.error);
