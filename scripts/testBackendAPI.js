// Using built-in fetch (Node.js 18+)

const API_BASE = 'https://marketing-server-7vx6.onrender.com/api';

async function testBackendAPI() {
  console.log('🧪 Testing Backend API Endpoints');
  console.log('='.repeat(50));
  
  // Test forgot password endpoint
  console.log('🔐 Testing forgot password endpoint...');
  
  try {
    const response = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com'
      })
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log('📡 Response body:', data);
    
    if (response.ok) {
      console.log('✅ Forgot password endpoint is working!');
    } else {
      console.log('❌ Forgot password endpoint returned error');
    }
    
  } catch (error) {
    console.error('❌ Error testing forgot password endpoint:', error.message);
  }
  
  // Test health endpoint
  console.log('\n🏥 Testing health endpoint...');
  
  try {
    const response = await fetch(`${API_BASE}/health`);
    console.log('📡 Health check status:', response.status);
    
    if (response.ok) {
      console.log('✅ Backend is healthy and accessible!');
    } else {
      console.log('❌ Backend health check failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing health endpoint:', error.message);
  }
}

testBackendAPI().catch(console.error);
