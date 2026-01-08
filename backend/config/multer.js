const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const aadharDir = path.join(uploadsDir, 'aadhar');
const photosDir = path.join(uploadsDir, 'photos');

[uploadsDir, aadharDir, photosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration for Aadhar
const aadharStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, aadharDir);
  },
  filename: (req, file, cb) => {
    const tenantName = req.body.tenantName || 'unknown';
    // Clean tenant name: remove spaces, special chars, and limit length
    const cleanName = tenantName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const uniqueSuffix = Date.now();
    cb(null, `aadhar-${cleanName}-${date}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Storage configuration for Photos
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, photosDir);
  },
  filename: (req, file, cb) => {
    const tenantName = req.body.tenantName || 'unknown';
    // Clean tenant name: remove spaces, special chars, and limit length
    const cleanName = tenantName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const uniqueSuffix = Date.now();
    cb(null, `photo-${cleanName}-${date}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WebP) and PDF are allowed!'));
  }
};

// Multer upload configurations
const uploadAadhar = multer({
  storage: aadharStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFilter
});

const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFilter
});

module.exports = {
  uploadAadhar,
  uploadPhoto
};
