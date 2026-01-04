const express = require('express');
const router = express.Router();
const announcementsController = require('../controllers/announcementsControllers');
const authMiddleware = require('../middleware/authMiddleware');
// GET announcements
router.get('/', authMiddleware('admin'),announcementsController.getAnnouncements);

// CREATE announcement
router.post('/', authMiddleware('admin'),announcementsController.createAnnouncement);
// UPDATE
router.put('/:id', authMiddleware('admin'),announcementsController.updateAnnouncement);
 
// DELETE
router.delete('/:id', authMiddleware('admin'),announcementsController.deleteAnnouncement);

module.exports = router;
