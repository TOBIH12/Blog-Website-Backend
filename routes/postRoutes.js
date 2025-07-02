const express = require('express');
const { createPost, getPosts, getSinglePost, getCatPosts, getUserPosts, editPost, deletePost } = require('../controllers/postControllers');
const { authMiddleware } = require('../middleware/authMiddleware');


const router = express();

router.post('/create', authMiddleware, createPost)
router.get('/', getPosts);
router.get('/:id', getSinglePost);
router.get('/categories/:category', getCatPosts);
router.get('/users/:id', getUserPosts);
router.put('/edit/:id', authMiddleware, editPost);
router.delete('/:id', authMiddleware, deletePost);


module.exports = router;