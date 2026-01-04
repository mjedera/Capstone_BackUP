const express = require('express');
const path = require('path');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// DASHBOARD
router.get('/dashboard', authMiddleware('cashier'), (req, res) => {
  res.sendFile(
    path.join(__dirname, '../views/mto/cashierDashboard.html')
  );
});

// 🔽 ADD THESE PARTIAL ROUTES 🔽
// pending vessel partial
router.get('/partials/pendingVessels', authMiddleware('cashier'), (req, res) => {
  res.sendFile(
    path.join(__dirname, '../views/mto/pendingVessels.html')
  );
});
// pending gears partial
router.get('/partials/pendingGears', authMiddleware('cashier'), (req, res) => {
  res.sendFile(
    path.join(__dirname, '../views/mto/pendingGears.html')
  );
});
// Vessel renewals partial
router.get('/partials/vessel-renewals', authMiddleware('cashier'), (req, res) => {
  res.sendFile(
    path.join(__dirname, '../views/mto/cashierVesselRenewals.html')
  );
});

// Vessel modifications partial
router.get('/partials/vessel-modifications', authMiddleware('cashier'), (req, res) => {
  res.sendFile(
    path.join(__dirname, '../views/mto/cashierVesselModifications.html')
  );  
});
// apprehension report partial
router.get('/partials/apprehensionReport', authMiddleware('cashier'), (req, res) => {
  res.sendFile(
    path.join(__dirname, '../views/mto/apprehendedFisherFolk.html')
  );  
});
// VESSEL RENEWALS
router.get('/vessel-renewals', authMiddleware('cashier'), (req, res) => {
  res.sendFile(
    path.join(__dirname, '../views/mto/cashierVesselRenewals.html')
  );
});

// VESSEL MODIFICATIONS
router.get('/vessel-modifications', authMiddleware('cashier'), (req, res) => {
  res.sendFile(
    path.join(__dirname, '../views/mto/cashierVesselModifications.html')
  );
});

module.exports = router;
