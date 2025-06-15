import express from 'express';
import {
  addComment,
  addNewPost,
  bookmarkPost,
  deletePost,
  disLikePost,
  getAllPosts,
  getCommentPost,
  getUserPosts,
  likePost
} from '../controllers/post.controller.js';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import upload from '../middlewares/multer.js';

const router = express.Router();

router.post('/addpost', isAuthenticated, upload.single('image'), addNewPost);
router.get('/all', isAuthenticated, getAllPosts);
router.get('/userpost/all', isAuthenticated, getUserPosts);
router.post('/:id/like', isAuthenticated, likePost);
router.post('/:id/dislike', isAuthenticated, disLikePost);
router.post('/:id/comment', isAuthenticated, addComment);
router.get('/:id/comment/all', isAuthenticated, getCommentPost);
router.delete('/delete/:id', isAuthenticated, deletePost);
router.get('/:id/bookmark', isAuthenticated, bookmarkPost);

export default router;
