import express from 'express';
import multer from 'multer';
import fs from 'fs';
import XLSX from 'xlsx';
import { protect } from '../middleware/auth.js';
import Contact from '../models/Contact.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info('Created uploads directory');
}

// Configure multer for file uploads - simple approach
const upload = multer({ 
  dest: uploadsDir + '/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/pdf' // .pdf
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls), CSV, and PDF files are allowed.'), false);
    }
  }
});

// Helper: extract contacts from raw text (for PDF support)
const extractContactsFromText = (text) => {
  // Extract emails with better regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailRegex) || [];
  
  // Extract phone numbers with better regex
  const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
  const phones = text.match(phoneRegex) || [];
  
  // Extract names (basic pattern - first word, space, last word)
  const nameRegex = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
  const names = text.match(nameRegex) || [];
  
  // Extract websites
  const websiteRegex = /(https?:\/\/)?(www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const websites = text.match(websiteRegex) || [];
  
  // Extract locations (common patterns)
  const locationRegex = /\b[A-Z][a-z]+(?: [A-Z][a-z]+)*(?:,\s*[A-Z]{2})?\b/g;
  const locations = text.match(locationRegex) || [];
  
  // Remove duplicates
  const uniqueEmails = [...new Set(emails)];
  const uniquePhones = [...new Set(phones)];
  const uniqueNames = [...new Set(names)];
  const uniqueWebsites = [...new Set(websites)];
  const uniqueLocations = [...new Set(locations)];
  
  return { 
    emails: uniqueEmails, 
    phones: uniquePhones, 
    names: uniqueNames,
    websites: uniqueWebsites,
    locations: uniqueLocations,
    totalContacts: Math.max(uniqueEmails.length, uniqueNames.length)
  };
};

// @route   POST /api/upload
// @desc    Upload and parse Excel or PDF files
// @access  Private
router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const ext = fileName.split('.').pop().toLowerCase();

    logger.info(`File upload: ${fileName} by user ${req.user.id}`);

    let data = [];

    try {
      if (ext === 'xlsx' || ext === 'xls') {
        // Parse Excel
        logger.info('Parsing Excel file');
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(sheet);
        logger.info(`Excel parsing completed. ${data.length} rows parsed`);
        
      } else if (ext === 'csv') {
        // Parse CSV
        logger.info('Parsing CSV file');
        const csv = await import('csv-parser');
        const results = [];
        
        await new Promise((resolve, reject) => {
          fs.createReadStream(filePath)
            .pipe(csv.default())
            .on('data', (row) => results.push(row))
            .on('end', () => resolve())
            .on('error', reject);
        });
        
        data = results;
        logger.info(`CSV parsing completed. ${data.length} rows parsed`);
        
      } else if (ext === 'pdf') {
        // Parse PDF
        logger.info('Parsing PDF file');
        try {
          const pdfParse = await import('pdf-parse');
          const buffer = fs.readFileSync(filePath);
          const parsed = await pdfParse.default(buffer);
          
          // Extract contacts from PDF text
          const extractedData = extractContactsFromText(parsed.text);
          
          // Create contact objects from extracted data
          const contacts = [];
          const maxLength = Math.max(
            extractedData.emails.length,
            extractedData.names.length,
            extractedData.phones.length
          );
          
          for (let i = 0; i < maxLength; i++) {
            const contact = {
              name: extractedData.names[i] || `Contact ${i + 1}`,
              email: extractedData.emails[i] || '',
              phone: extractedData.phones[i] || '',
              website: extractedData.websites[i] || '',
              location: extractedData.locations[i] || '',
              source: 'pdf_import'
            };
            
            // Only add contacts that have at least name or email
            if (contact.name && contact.email) {
              contacts.push(contact);
            }
          }
          
          data = contacts;
          logger.info(`PDF parsing completed. Created ${contacts.length} contact objects from extracted data`);
        } catch (pdfError) {
          logger.error('PDF parsing error:', pdfError.message);
          throw new Error(`Failed to parse PDF file: ${pdfError.message}`);
        }
        
      } else {
        // Clean up unsupported file
        fs.unlinkSync(filePath);
        return res.status(400).json({ 
          success: false, 
          message: 'Unsupported file type. Please use Excel (.xlsx, .xls), CSV, or PDF files.' 
        });
      }

      // Clean up file after processing
      fs.unlinkSync(filePath);

      // Validate and clean the data for Excel/CSV
      let validatedData = [];
      let errors = [];
      let duplicates = 0;

      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        const seenEmails = new Set();
        
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const rowNumber = i + 2; // +2 because of header row and 0-based index

          // Normalize field names (case-insensitive)
          const normalizedRow = {};
          Object.keys(row).forEach(key => {
            normalizedRow[key.toLowerCase()] = row[key];
          });

          // Check for required fields
          const name = normalizedRow.name || row.Name || row.name;
          const email = normalizedRow.email || row.Email || row.email;

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
            duplicates++;
            continue;
          }
          seenEmails.add(email.toLowerCase());

          // Create clean contact object
          const contact = {
            name: name.toString().trim(),
            email: email.toString().trim().toLowerCase(),
            phone: (normalizedRow.phone || row.Phone || row.phone || '').toString().trim(),
            company: (normalizedRow.company || row.Company || row.company || '').toString().trim(),
            position: (normalizedRow.position || row.Position || row.position || '').toString().trim(),
            website: (normalizedRow.website || row.Website || row.website || '').toString().trim(),
            location: (normalizedRow.location || row.Location || row.location || '').toString().trim(),
            tags: (normalizedRow.tags || row.Tags || row.tags || '').toString().trim().split(',').map(tag => tag.trim()).filter(tag => tag),
            userId: req.user.id,
            source: 'import',
            importedAt: new Date()
          };

          validatedData.push(contact);
        }
      }

      // Save contacts to database for Excel/CSV files
      let savedContacts = [];
      let saveErrors = 0;
      
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        logger.info(`Saving ${validatedData.length} contacts to database...`);
        
        for (const contactData of validatedData) {
          try {
            // Check if contact already exists
            const existingContact = await Contact.findOne({
              email: contactData.email,
              userId: req.user.id
            });

            if (existingContact) {
              logger.info(`Contact already exists: ${contactData.email}`);
              duplicates++;
              continue;
            }

            // Create new contact
            const contact = new Contact(contactData);
            await contact.save();
            savedContacts.push(contact);
            
            logger.debug(`Contact saved: ${contactData.name} (${contactData.email})`);
            logger.debug(`Contact data saved:`, {
              name: contact.name,
              email: contact.email,
              phone: contact.phone,
              company: contact.company,
              position: contact.position,
              tags: contact.tags
            });
          } catch (saveError) {
            logger.error(`Failed to save contact ${contactData.email}:`, saveError);
            logger.error(`Save error details:`, {
              email: contactData.email,
              name: contactData.name,
              error: saveError.message,
              code: saveError.code
            });
            errors.push(`Failed to save contact ${contactData.email}: ${saveError.message}`);
            saveErrors++;
          }
        }
        
        logger.info(`Database save results: ${savedContacts.length} saved, ${duplicates} duplicates, ${saveErrors} errors`);
      }

      // Clean up file after processing (with error handling)
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info('Uploaded file cleaned up successfully');
        }
      } catch (cleanupError) {
        logger.warn('File cleanup warning (non-critical):', cleanupError.message);
      }

      res.json({
        success: true,
        message: `${ext.toUpperCase()} file processed successfully`,
        data: {
          total: data.length,
          imported: validatedData.length,
          saved: savedContacts.length,
          errors: errors.length + saveErrors,
          duplicates: duplicates,
          errorDetails: errors.slice(0, 10),
          contacts: ext === 'pdf' ? data : savedContacts.slice(0, 5)
        }
      });

    } catch (parseError) {
      logger.error('File parsing error:', parseError);
      
      // Clean up file if it exists
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        logger.error('Error cleaning up file:', cleanupError);
      }

      res.status(500).json({
        success: false,
        message: 'Failed to parse file',
        error: parseError.message,
        details: {
          fileName: fileName,
          filePath: filePath,
          fileExists: fs.existsSync(filePath),
          fileSize: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0
        }
      });
    }

  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
});

// @route   GET /api/upload/template
// @desc    Download import template
// @access  Private
router.get('/template', protect, async (req, res) => {
  try {
    const templateData = [
      ['Name', 'Email', 'Phone', 'Company', 'Position', 'Tags'],
      ['John Doe', 'john@example.com', '+1234567890', 'Acme Corp', 'Manager', 'lead,prospect'],
      ['Jane Smith', 'jane@example.com', '+1234567891', 'Tech Inc', 'Director', 'customer'],
    ];

    // Convert to CSV
    const csvContent = templateData.map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="contact_template.csv"');
    res.send(csvContent);

  } catch (error) {
    logger.error('Template download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template'
    });
  }
});

export default router;
