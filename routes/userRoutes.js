const express = require('express');
const { registerUser, loginUser, getUser, getAuthors, changeAvatar, editUser } = require('../controllers/userControllers');
const {authMiddleware }= require('../middleware/authMiddleware')

const router = express();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/:id', getUser);
router.get('/', getAuthors);
router.post('/change-avatar', authMiddleware, changeAvatar);
router.put('/edit-user', authMiddleware, editUser);

module.exports = router