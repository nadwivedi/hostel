const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadAadhar, uploadPhoto, uploadProperty } = require('../config/multer');
const {
  uploadAadharImage,
  uploadPhotoImage,
  uploadPropertyImage,
  deleteUploadedFile
} = require('../controllers/uploadController');

// Allow both users and admins to upload files
router.post('/aadhar', protect, uploadAadhar.single('aadhar'), uploadAadharImage);
router.post('/photo', protect, uploadPhoto.single('photo'), uploadPhotoImage);
router.post('/property', protect, uploadProperty.single('image'), uploadPropertyImage);
router.delete('/delete', protect, deleteUploadedFile);

module.exports = router;
