const router = require('express').Router();
const multer = require('multer');
const ctrl = require('../controllers/submissions.controller');
const { requireAuth } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 }, // 100KB
});

router.post('/', requireAuth, upload.single('file'), ctrl.create);
router.post('/:id/reviews', requireAuth, ctrl.createReview);

module.exports = router;
