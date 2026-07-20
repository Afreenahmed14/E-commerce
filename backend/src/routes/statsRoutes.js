const express = require('express');
const router = express.Router();

const { getPlatformStats } = require('../controllers/publicController');

router.get('/', getPlatformStats);

module.exports = router;
