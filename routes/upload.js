import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info('Created uploads directory');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure directory exists before saving file
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir + '/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'), false);
    }
  }
});

// @route   POST /api/upload
// @desc    Upload and process Excel/CSV files
// @access  Private
router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { type = 'contacts' } = req.body;
    const filePath = req.file.path;
    const fileName = req.file.originalname;

    logger.info(`File upload: ${fileName} by user ${req.user.id}`);

    // Parse the uploaded file based on type
    let parsedData = [];
    let errors = [];
    let duplicates = 0;

    try {
      // Check if file exists before processing
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      if (fileName.endsWith('.csv')) {
        // Parse CSV file
        const csv = await import('csv-parser');
        
        const results = [];
        await new Promise((resolve, reject) => {
          fs.createReadStream(filePath)
            .pipe(csv.default())
            .on('data', (data) => results.push(data))
            .on('end', resolve)
            .on('error', reject);
        });
        
        parsedData = results;
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Parse Excel file
        const XLSX = await import('xlsx');
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        parsedData = jsonData;
      }

      // Validate and clean the data
      const validatedData = [];
      const seenEmails = new Set();

      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        const rowNumber = i + 2; // +2 because of header row and 0-based index

        // Check for required fields
        if (!row.Name && !row.name) {
          errors.push(`Row ${rowNumber}: Name is required`);
          continue;
        }

        if (!row.Email && !row.email) {
          errors.push(`Row ${rowNumber}: Email is required`);
          continue;
        }

        // Clean and validate email
        const email = (row.Email || row.email || '').toString().trim().toLowerCase();
        if (!email || !email.includes('@')) {
          errors.push(`Row ${rowNumber}: Invalid email format`);
          continue;
        }

        // Check for duplicates
        if (seenEmails.has(email)) {
          duplicates++;
          continue;
        }
        seenEmails.add(email);

        // Create clean contact object
        const contact = {
          name: (row.Name || row.name || '').toString().trim(),
          email: email,
          phone: (row.Phone || row.phone || '').toString().trim(),
          company: (row.Company || row.company || '').toString().trim(),
          position: (row.Position || row.position || '').toString().trim(),
          tags: (row.Tags || row.tags || '').toString().trim().split(',').map(tag => tag.trim()).filter(tag => tag),
          userId: req.user.id,
          source: 'import',
          importedAt: new Date()
        };

        validatedData.push(contact);
      }

      // TODO: Save to database
      // For now, we'll just return the parsed data
      // In a real implementation, you would save to your contacts/contacts collection

      // Clean up uploaded file
      const fs = await import('fs');
      fs.unlinkSync(filePath);

      res.json({
        success: true,
        message: 'File processed successfully',
        data: {
          total: parsedData.length,
          imported: validatedData.length,
          errors: errors.length,
          duplicates: duplicates,
          errorDetails: errors.slice(0, 10), // Return first 10 errors
          contacts: validatedData.slice(0, 5) // Return first 5 contacts as sample
        }
      });

    } catch (parseError) {
      logger.error('File parsing error:', parseError);
      
      // Clean up uploaded file
      const fs = await import('fs');
      fs.unlinkSync(filePath);

      res.status(400).json({
        success: false,
        message: 'Failed to parse file',
        error: parseError.message
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
