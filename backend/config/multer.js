const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');
const aadharDir = path.join(uploadsDir, 'aadhar');
const documentsDir = path.join(uploadsDir, 'documents');
const propertiesDir = path.join(uploadsDir, 'properties');

[uploadsDir, aadharDir, documentsDir, propertiesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const buildCleanName = (value, fallback) => {
  return (value || fallback).replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
};

const aadharStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, aadharDir);
  },
  filename: (req, file, cb) => {
    const cleanName = buildCleanName(req.body.tenantName, 'unknown');
    const date = new Date().toISOString().split('T')[0];
    const uniqueSuffix = Date.now();
    cb(null, `aadhar-${cleanName}-${date}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentsDir);
  },
  filename: (req, file, cb) => {
    const cleanName = buildCleanName(req.body.tenantName, 'unknown');
    const date = new Date().toISOString().split('T')[0];
    const uniqueSuffix = Date.now();
    cb(null, `document-${cleanName}-${date}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const propertyStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, propertiesDir);
  },
  filename: (req, file, cb) => {
    const cleanName = buildCleanName(req.body.propertyName, 'property');
    const date = new Date().toISOString().split('T')[0];
    const uniqueSuffix = Date.now();
    cb(null, `property-${cleanName}-${date}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const imageAndPdfFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.pdf', '.webp'];
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ];

  const extname = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(extname) && allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WebP) and PDF are allowed!'));
};

const uploadAadhar = multer({
  storage: aadharStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageAndPdfFilter
});

const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: imageAndPdfFilter
});

const uploadProperty = multer({
  storage: propertyStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageAndPdfFilter
});

module.exports = {
  uploadAadhar,
  uploadDocument,
  uploadPhoto: uploadDocument,
  uploadProperty
};
