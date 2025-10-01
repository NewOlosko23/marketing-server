// Test Excel file upload with proper data
import fs from 'fs';
import path from 'path';

async function createTestExcelFile() {
  console.log('🧪 Creating Test Excel File');
  console.log('='.repeat(50));
  
  // Create a simple CSV file that mimics Excel data
  const testData = `Name,Email,Phone,Company,Position,Tags
John Doe,john@example.com,+1234567890,Acme Corp,Manager,"lead,prospect"
Jane Smith,jane@example.com,+1234567891,Tech Inc,Director,"customer,vip"
Bob Johnson,bob@example.com,+1234567892,Startup Co,CEO,"founder,investor"`;

  const testFilePath = path.join('uploads', 'test-contacts.csv');
  
  try {
    // Ensure uploads directory exists
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads', { recursive: true });
    }
    
    fs.writeFileSync(testFilePath, testData);
    console.log('✅ Test CSV file created:', testFilePath);
    
    // Read and display the file content
    const content = fs.readFileSync(testFilePath, 'utf8');
    console.log('📄 File content:');
    console.log(content);
    
    return testFilePath;
  } catch (error) {
    console.error('❌ Error creating test file:', error.message);
    return null;
  }
}

async function testFileParsing() {
  console.log('\n🧪 Testing File Parsing Logic');
  console.log('='.repeat(50));
  
  const testFilePath = await createTestExcelFile();
  if (!testFilePath) return;
  
  try {
    // Test CSV parsing
    const csv = await import('csv-parser');
    const results = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(testFilePath)
        .pipe(csv.default())
        .on('data', (data) => {
          console.log('📊 Parsed row:', data);
          results.push(data);
        })
        .on('end', () => {
          console.log(`✅ CSV parsing completed. ${results.length} rows parsed`);
          resolve();
        })
        .on('error', (error) => {
          console.error('❌ CSV parsing error:', error);
          reject(error);
        });
    });
    
    // Test data validation
    console.log('\n🔍 Testing Data Validation:');
    const validatedData = [];
    const errors = [];
    const seenEmails = new Set();
    
    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      const rowNumber = i + 2;
      
      // Normalize field names
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        normalizedRow[key.toLowerCase()] = row[key];
      });
      
      const name = normalizedRow.name;
      const email = normalizedRow.email;
      
      if (!name) {
        errors.push(`Row ${rowNumber}: Name is required`);
        continue;
      }
      
      if (!email) {
        errors.push(`Row ${rowNumber}: Email is required`);
        continue;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push(`Row ${rowNumber}: Invalid email format: ${email}`);
        continue;
      }
      
      // Check for duplicates
      if (seenEmails.has(email.toLowerCase())) {
        console.log(`⚠️  Duplicate email found: ${email}`);
        continue;
      }
      seenEmails.add(email.toLowerCase());
      
      const contact = {
        name: name.toString().trim(),
        email: email.toString().trim().toLowerCase(),
        phone: normalizedRow.phone || '',
        company: normalizedRow.company || '',
        position: normalizedRow.position || '',
        tags: (normalizedRow.tags || '').split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      
      validatedData.push(contact);
    }
    
    console.log(`\n📊 Validation Results:`);
    console.log(`✅ Valid contacts: ${validatedData.length}`);
    console.log(`❌ Errors: ${errors.length}`);
    console.log(`📋 Sample contact:`, validatedData[0]);
    
    if (errors.length > 0) {
      console.log(`\n❌ Validation errors:`);
      errors.forEach(error => console.log(`  - ${error}`));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Clean up test file
    try {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
        console.log('🧹 Test file cleaned up');
      }
    } catch (cleanupError) {
      console.error('Error cleaning up test file:', cleanupError);
    }
  }
}

testFileParsing().catch(console.error);
