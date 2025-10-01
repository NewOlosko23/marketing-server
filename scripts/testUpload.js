// Test file upload functionality
import fs from 'fs';
import path from 'path';

async function testUploadDirectory() {
  console.log('🧪 Testing Upload Directory Setup');
  console.log('='.repeat(50));
  
  const uploadsDir = 'uploads';
  
  // Check if directory exists
  if (fs.existsSync(uploadsDir)) {
    console.log('✅ Uploads directory exists');
    
    // Check if it's writable
    try {
      const testFile = path.join(uploadsDir, 'test.txt');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('✅ Uploads directory is writable');
    } catch (error) {
      console.log('❌ Uploads directory is not writable:', error.message);
    }
  } else {
    console.log('❌ Uploads directory does not exist');
    console.log('🔧 Creating uploads directory...');
    
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Uploads directory created successfully');
    } catch (error) {
      console.log('❌ Failed to create uploads directory:', error.message);
    }
  }
  
  // Test file creation
  console.log('\n📁 Testing File Creation:');
  try {
    const testFilePath = path.join(uploadsDir, 'test-upload.txt');
    fs.writeFileSync(testFilePath, 'Test file content');
    console.log('✅ Test file created:', testFilePath);
    
    // Check if file exists
    if (fs.existsSync(testFilePath)) {
      console.log('✅ Test file exists and is readable');
      fs.unlinkSync(testFilePath);
      console.log('✅ Test file cleaned up');
    } else {
      console.log('❌ Test file was not created');
    }
  } catch (error) {
    console.log('❌ File creation test failed:', error.message);
  }
  
  console.log('\n🎯 Upload Directory Status:');
  console.log('• Directory exists:', fs.existsSync(uploadsDir));
  console.log('• Directory path:', path.resolve(uploadsDir));
  console.log('• Current working directory:', process.cwd());
}

testUploadDirectory().catch(console.error);
