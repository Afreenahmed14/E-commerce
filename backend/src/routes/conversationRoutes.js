const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  listConversations,
  getMessages,
  startConversation,
  sendMessage,
  markConversationRead,
  toggleMute,
  deleteConversation,
  uploadAttachment,
} = require('../controllers/conversationController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { CANDIDATE, COMPANY } = require('../constants/roles');
const { uploadDocument } = require('../middleware/uploadMiddleware');

// Both candidates and companies use messaging.
router.use(protect);

router.get('/', listConversations);
router.get('/:id/messages', getMessages);

router.post(
  '/',
  body('candidateId').isMongoId(),
  body('jobId').optional({ nullable: true }).isMongoId(),
  validateRequest,
  startConversation
);

router.post(
  '/:id/messages',
  body('text').optional().trim().isLength({ max: 5000 }),
  validateRequest,
  sendMessage
);

router.patch('/:id/read', markConversationRead);
router.patch('/:id/mute', body('muted').isBoolean(), validateRequest, toggleMute);
router.delete('/:id', deleteConversation);
router.post('/:id/upload', uploadDocument.single('file'), uploadAttachment);

module.exports = router;
