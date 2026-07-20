const router = require('express').Router();
const ctrl = require('../controllers/reviews.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.list);
router.get('/:id', requireAuth, ctrl.getOne);
router.post('/:id/docs', requireAuth, ctrl.generateDocumentation);
router.delete('/:id', requireAuth, ctrl.remove);

module.exports = router;
