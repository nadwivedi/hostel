const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeUnlink = async (filePath, retries = 5, delayMs = 120) => {
  if (!filePath) return;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await fs.promises.unlink(filePath);
      return;
    } catch (error) {
      if (error.code === 'ENOENT') return;

      const shouldRetry = error.code === 'EBUSY' || error.code === 'EPERM';
      if (!shouldRetry || attempt === retries) {
        throw error;
      }
      await wait(delayMs * (attempt + 1));
    }
  }
};

const uploadAadharImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/aadhar/${req.file.filename}`;

    res.status(200).json({
      message: 'Aadhar image uploaded successfully',
      fileUrl,
      filename: req.file.filename,
    });
  } catch (error) {
    console.error('Error uploading aadhar:', error);
    res.status(500).json({ message: 'Server error while uploading aadhar' });
  }
};

const uploadTenantDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const originalPath = req.file.path;
    const tenantName = req.body.tenantName || 'unknown';
    const cleanName = tenantName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const date = new Date().toISOString().split('T')[0];
    const uniqueSuffix = Date.now();
    const isPdf = req.file.mimetype === 'application/pdf';

    if (isPdf) {
      const pdfFilename = `document-${cleanName}-${date}-${uniqueSuffix}${path.extname(req.file.originalname).toLowerCase() || '.pdf'}`;
      const pdfPath = path.join(path.dirname(originalPath), pdfFilename);

      if (originalPath !== pdfPath) {
        await fs.promises.rename(originalPath, pdfPath);
      }

      return res.status(200).json({
        message: 'Document uploaded successfully',
        fileUrl: `/uploads/documents/${pdfFilename}`,
        filename: pdfFilename,
        type: 'pdf',
      });
    }

    const webpFilename = `document-${cleanName}-${date}-${uniqueSuffix}.webp`;
    const webpPath = path.join(path.dirname(originalPath), webpFilename);

    await sharp(originalPath)
      .resize(1600, 1600, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality: 82,
        effort: 6,
      })
      .toFile(webpPath);

    let stats = fs.statSync(webpPath);
    let quality = 82;

    while (stats.size > 250 * 1024 && quality > 45) {
      quality -= 10;
      await sharp(originalPath)
        .resize(1600, 1600, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({
          quality,
          effort: 6,
        })
        .toFile(webpPath);
      stats = fs.statSync(webpPath);
    }

    try {
      await safeUnlink(originalPath);
    } catch (cleanupError) {
      console.warn('Document temp cleanup skipped:', cleanupError.message);
    }

    return res.status(200).json({
      message: 'Document uploaded successfully',
      fileUrl: `/uploads/documents/${webpFilename}`,
      filename: webpFilename,
      type: 'image',
      size: `${Math.round(stats.size / 1024)} KB`,
    });
  } catch (error) {
    console.error('Error uploading tenant document:', error);
    if (req.file && req.file.path) {
      try {
        await safeUnlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Document cleanup failed:', cleanupError.message);
      }
    }
    res.status(500).json({ message: 'Server error while uploading tenant document' });
  }
};

const uploadPhotoImage = uploadTenantDocument;

const uploadPropertyImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const originalPath = req.file.path;
    const propertyName = req.body.propertyName || 'property';
    const cleanName = propertyName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const date = new Date().toISOString().split('T')[0];
    const uniqueSuffix = Date.now();
    const webpFilename = `property-${cleanName}-${date}-${uniqueSuffix}.webp`;
    const webpPath = path.join(path.dirname(originalPath), webpFilename);

    await sharp(originalPath)
      .resize(1200, 800, {
        fit: 'cover',
        withoutEnlargement: true,
      })
      .webp({
        quality: 85,
        effort: 6,
      })
      .toFile(webpPath);

    let stats = fs.statSync(webpPath);
    let quality = 85;

    while (stats.size > 300 * 1024 && quality > 50) {
      quality -= 10;
      await sharp(originalPath)
        .resize(1200, 800, {
          fit: 'cover',
          withoutEnlargement: true,
        })
        .webp({
          quality,
          effort: 6,
        })
        .toFile(webpPath);
      stats = fs.statSync(webpPath);
    }

    try {
      await safeUnlink(originalPath);
    } catch (cleanupError) {
      console.warn('Property temp cleanup skipped:', cleanupError.message);
    }

    const fileUrl = `/uploads/properties/${webpFilename}`;

    res.status(200).json({
      message: 'Property image uploaded successfully',
      fileUrl,
      filename: webpFilename,
      size: `${Math.round(stats.size / 1024)} KB`,
    });
  } catch (error) {
    console.error('Error uploading property image:', error);
    if (req.file && req.file.path) {
      try {
        await safeUnlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Property image cleanup failed:', cleanupError.message);
      }
    }
    res.status(500).json({ message: 'Server error while uploading property image' });
  }
};

const deleteUploadedFile = async (req, res) => {
  try {
    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ message: 'File URL is required' });
    }

    const filePath = path.join(__dirname, '..', fileUrl);

    if (fs.existsSync(filePath)) {
      await safeUnlink(filePath);
      res.status(200).json({ message: 'File deleted successfully' });
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Server error while deleting file' });
  }
};

module.exports = {
  uploadAadharImage,
  uploadTenantDocument,
  uploadPhotoImage,
  uploadPropertyImage,
  deleteUploadedFile,
};
