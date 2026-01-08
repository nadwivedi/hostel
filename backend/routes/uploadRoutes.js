const express = require('express');
const router = express.Router();
const { uploadAadhar, uploadPhoto } = require('../config/multer');
const {
  uploadAadharImage,
  uploadPhotoImage,
  deleteUploadedFile
} = require('../controllers/uploadController');

// Upload Aadhar
router.post('/aadhar', uploadAadhar.single('aadhar'), uploadAadharImage);

// Upload Photo
router.post('/photo', uploadPhoto.single('photo'), uploadPhotoImage);

// Delete file
router.delete('/delete', deleteUploadedFile);

module.exports = router;
