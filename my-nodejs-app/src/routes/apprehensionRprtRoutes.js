const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const {
  createApprehensionReport,
  getApprehensionDashboard,
  getAllApprehensionReports,
  getApprehensionById,
  getDashboardData,
  getYearRange,
  getAllReports,
  searchRegisteredVessels,
  searchRegisteredGear,
  searchOrdinances
} = require('../controllers/apprehensionRprtControllers');

     
// Serve the fishing vessels HTML page
router.post('/registration', authMiddleware('admin'), createApprehensionReport);
/* API */
router.post('/ApprehensionReport', authMiddleware('admin'), createApprehensionReport);

/* DASHBOARD — MUST BE ABOVE :id */
router.get('/dashboard', authMiddleware('admin'), getDashboardData);
router.get('/years', authMiddleware('admin'), getYearRange);
router.get('/reports', authMiddleware('admin'), getAllReports);

router.get('/search/vessels', authMiddleware('admin'), searchRegisteredVessels);
router.get('/search/gears', authMiddleware('admin'),searchRegisteredGear );
router.get('/ordinances/search', authMiddleware('admin'),searchOrdinances);

/* OTHER ROUTES */
router.get('/ApprehensionReport/dashboard', authMiddleware('admin'), getApprehensionDashboard);
router.get('/list', authMiddleware('admin'), getAllApprehensionReports);
router.get('/:id', authMiddleware('admin'), getApprehensionById);

module.exports = router;

