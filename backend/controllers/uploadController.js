const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Upload Aadhar image
const uploadAadharImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/aadhar/${req.file.filename}`;

    res.status(200).json({
      message: 'Aadhar image uploaded successfully',
      fileUrl: fileUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading aadhar:', error);
    res.status(500).json({ message: 'Server error while uploading aadhar' });
  }
};

// Upload Photo
const uploadPhotoImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const originalPath = req.file.path;
    const tenantName = req.body.tenantName || 'unknown';
    const cleanName = tenantName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const date = new Date().toISOString().split('T')[0];
    const uniqueSuffix = Date.now();
    const webpFilename = `photo-${cleanName}-${date}-${uniqueSuffix}.webp`;
    const webpPath = path.join(path.dirname(originalPath), webpFilename);

    // Process image: resize, convert to WebP, and compress
    await sharp(originalPath)
      .resize(800, 800, {
        fit: 'inside', // Maintain aspect ratio, max 800x800
        withoutEnlargement: true // Don't upscale smaller images
      })
      .webp({
        quality: 80, // Start with quality 80
        effort: 6 // Compression effort (0-6, higher = better compression)
      })
      .toFile(webpPath);

    // Check file size and adjust quality if needed
    let stats = fs.statSync(webpPath);
    let quality = 80;

    // If file is larger than 150KB, reduce quality
    while (stats.size > 150 * 1024 && quality > 40) {
      quality -= 10;
      await sharp(originalPath)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({
          quality: quality,
          effort: 6
        })
        .toFile(webpPath);
      stats = fs.statSync(webpPath);
    }

    // Delete original file
    fs.unlinkSync(originalPath);

    const fileUrl = `/uploads/photos/${webpFilename}`;

    res.status(200).json({
      message: 'Photo uploaded and optimized successfully',
      fileUrl: fileUrl,
      filename: webpFilename,
      size: Math.round(stats.size / 1024) + ' KB'
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    // Clean up files on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Server error while uploading photo' });
  }
};

// Upload Property Image
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

    // Process image: resize, convert to WebP, and compress
    await sharp(originalPath)
      .resize(1200, 800, {
        fit: 'cover', // Cover the area for property images
        withoutEnlargement: true
      })
      .webp({
        quality: 85,
        effort: 6
      })
      .toFile(webpPath);

    // Check file size and adjust quality if needed
    let stats = fs.statSync(webpPath);
    let quality = 85;

    // If file is larger than 300KB, reduce quality
    while (stats.size > 300 * 1024 && quality > 50) {
      quality -= 10;
      await sharp(originalPath)
        .resize(1200, 800, {
          fit: 'cover',
          withoutEnlargement: true
        })
        .webp({
          quality: quality,
          effort: 6
        })
        .toFile(webpPath);
      stats = fs.statSync(webpPath);
    }

    // Delete original file
    fs.unlinkSync(originalPath);

    const fileUrl = `/uploads/properties/${webpFilename}`;

    res.status(200).json({
      message: 'Property image uploaded successfully',
      fileUrl: fileUrl,
      filename: webpFilename,
      size: Math.round(stats.size / 1024) + ' KB'
    });
  } catch (error) {
    console.error('Error uploading property image:', error);
    // Clean up files on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Server error while uploading property image' });
  }
};

// Delete uploaded file
const deleteUploadedFile = async (req, res) => {
  try {
    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ message: 'File URL is required' });
    }

    const filePath = path.join(__dirname, '..', fileUrl);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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
  uploadPhotoImage,
  uploadPropertyImage,
  deleteUploadedFile
};
