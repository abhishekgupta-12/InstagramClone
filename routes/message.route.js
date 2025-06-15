import express from 'express';
import upload from '../middlewares/multer.js';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import { getMessages,senMessage } from '../controllers/message.conroller.js';

const router = express.Router();
 router.route('/send/:id').post(isAuthenticated, senMessage);
router.route('/all/:id').get(isAuthenticated, getMessages);
export default router;
