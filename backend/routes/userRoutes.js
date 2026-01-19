const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/adminAuth');
const { getAllUsers, getUserById, createUser, updateUser, deleteUser } = require('../controllers/adminUserController');

router.get('/', protectAdmin, getAllUsers);
router.get('/:id', protectAdmin, getUserById);
router.post('/', protectAdmin, createUser);
router.put('/:id', protectAdmin, updateUser);
router.delete('/:id', protectAdmin, deleteUser);

module.exports = router;