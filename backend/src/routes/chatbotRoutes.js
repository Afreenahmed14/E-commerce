const express = require('express');
const router = express.Router();

const {
  createConversation,
  listConversations,
  deleteConversation,
  getMessages,
  sendMessage,
  uploadAttachment,
} = require('../controllers/chatbotController');
const { protect } = require('../middleware/authMiddleware');
const aiRateLimit = require('../middleware/aiRateLimit');
const { uploadResume } = require('../middleware/uploadMiddleware');

// Any authenticated role (candidate, company, or admin) can use the
// career assistant — it isn't restricted to a single role.
router.use(protect);

router.post('/conversations', createConversation);
router.get('/conversations', listConversations);
router.delete('/conversations/:id', deleteConversation);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', aiRateLimit, sendMessage);
router.post('/conversations/:id/upload', aiRateLimit, uploadResume.single('file'), uploadAttachment);

module.exports = router;
