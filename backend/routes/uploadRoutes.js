const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/adminAuth');
const { uploadAadhar, uploadPhoto } = require('../config/multer');
const {
  uploadAadharImage,
  uploadPhotoImage,
  deleteUploadedFile
} = require('../controllers/uploadController');

router.post('/aadhar', protectAdmin, uploadAadhar.single('aadhar'), uploadAadharImage);

router.post('/photo', protectAdmin, uploadPhoto.single('photo'), uploadPhotoImage);

router.delete('/delete', protectAdmin, deleteUploadedFile);

module.exports = router;
