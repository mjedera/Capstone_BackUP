const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminControllers');
// Use multer middleware for file upload
router.post('/logo', adminController.upload, adminController.uploadLogo);
router.delete('/logo', adminController.removeLogo);
router.get('/logo', adminController.getLogo);  

module.exports = router;
