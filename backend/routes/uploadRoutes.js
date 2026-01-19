const express = require('express');
const router = express.Router();
const { protectAll } = require('../middleware/authAll');
const { uploadAadhar, uploadPhoto } = require('../config/multer');
const {
  uploadAadharImage,
  uploadPhotoImage,
  deleteUploadedFile
} = require('../controllers/uploadController');

// Allow both users and admins to upload files
router.post('/aadhar', protectAll, uploadAadhar.single('aadhar'), uploadAadharImage);
router.post('/photo', protectAll, uploadPhoto.single('photo'), uploadPhotoImage);
router.delete('/delete', protectAll, deleteUploadedFile);

module.exports = router;
