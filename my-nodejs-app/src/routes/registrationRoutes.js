const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
// Import controller
const {
  approveVesselRenewal,
  getMyTransactions,
  getPendingVesselModifications,
  approveVesselModification,
  submitGearRenewal,
  approveGearRenewal,
  rejectVesselRenewal,
  rejectGearRenewal,
  rejectVesselModification,
  getApprehendedFisherfolks,
  approveApprehension,
  rejectApprehension
} = require('../controllers/registrationControllers');

const { 
    registerVessel,
    getRegistrationFeeByTonnage,
    getAllVessels,
    getGearsRegistration,
    registerFishingGear,
    getRegistrationDashboard,
    getRegistrationYearRange,
    getGearDashboard,
    getPendingRenewals,
    getVesselFees,
    getGearFees,
    getVesselFeeById,
    updateVesselFee,
    getGearFeeById,
    updateGearFee,
    getNextVesselSequence,
    countVesselsByApplicant,
    countGearsByApplicant,
    getPendingVessels,
    updateVesselStatus,
    getPendingGears,
    updateGearStatus,
    getRegisteredVessels,
    getRegisteredGears,
    getRegisteredVesselById,
    getRegisteredGearById,
    submitVesselModification,
    submitVesselRenewal
} = require('../controllers/registrationControllers'); 

// -------------------------------
// Multer setup for file uploads
// -------------------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'engine_photo') {
            cb(null, path.join(__dirname, '../public/engine_photo'));
        } else if (file.fieldname === 'vessel_photo') {
            cb(null, path.join(__dirname, '../public/vessel_photo'));
        } else {
            cb(new Error('Unknown field name'), null);
        }
    },
    filename: (req, file, cb) => {
        const name = path.parse(file.originalname).name.replace(/\s+/g, '_').substring(0, 200);
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}_${name}${ext}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// -------------------------------
// Routes
// -------------------------------

// Vessel registration (with file uploads)
router.post(
    '/register-vessel',authMiddleware('admin'),
    upload.fields([
        { name: 'vessel_photo', maxCount: 1 },
        { name: 'engine_photo', maxCount: 1 }
    ]),
    registerVessel
);

// Fishing vessel fees
router.get('/registration-fee', authMiddleware('admin'), getRegistrationFeeByTonnage);


// Get all vessels
router.get('/all-vessels', authMiddleware('admin'), getAllVessels);
router.get('/fishing-vessels',authMiddleware('admin'), getAllVessels);


// Pages
router.get('/gearRegistration',authMiddleware('admin'), getGearsRegistration);
// Registered pages
router.get('/registered-vessels', authMiddleware('admin'), getRegisteredVessels);
router.get('/registered-gears', authMiddleware('admin'), getRegisteredGears);
// modify vessel
router.post(
  '/vessels/:id/modifications',
  authMiddleware('admin'), upload.fields([ { name: 'vessel_photo', maxCount: 1 }, { name: 'engine_photo', maxCount: 1 } ]), submitVesselModification);
// ==========================================
// Vessel renewal
// ==========================================
router.post(
  '/vessels/:id/renew',
  authMiddleware('admin'),
  submitVesselRenewal
);


// registered vessels/gears row
router.get('/registered-vessels/:id',authMiddleware('admin'), getRegisteredVesselById);
router.get('/registered-gears/:id', authMiddleware('admin'), getRegisteredGearById);

 
// registrationRoutes.js
router.get('/vessel-fees',authMiddleware('admin'), getVesselFees);
// registration
router.get('/next-vessel-sequence/:applicantId',authMiddleware('admin'), getNextVesselSequence);
router.get('/vessels/count/:applicantId',authMiddleware('admin'), countVesselsByApplicant);
router.get('/gears/count/:applicantId',authMiddleware('admin'), countGearsByApplicant);


router.get('/gear-fees',authMiddleware('admin'), getGearFees);
// ===== GET SINGLE VESSEL FEE =====
router.get('/vessel-fees/:id',authMiddleware('admin'), getVesselFeeById);
// ===== UPDATE VESSEL FEE =====
router.put('/vessel-fees/:id',authMiddleware('admin'), updateVesselFee);
// ===== GET SINGLE GEAR FEE =====
router.get('/gear-fees/:id',authMiddleware('admin'), getGearFeeById);
// ===== UPDATE GEAR FEE =====
router.put('/gear-fees/:id',authMiddleware('admin'), updateGearFee);


// Fishing gear registration (no file uploads)
router.post('/register-gear',authMiddleware('admin'), upload.none(), registerFishingGear);
// dashboard render
router.get('/dashboard',authMiddleware('admin'), getRegistrationDashboard);
router.get('/years', authMiddleware('admin') , getRegistrationYearRange);
router.get('/dashboard/gears', authMiddleware('admin') ,getGearDashboard);

router.post('/gear-renewals',authMiddleware('admin') , submitGearRenewal);

// ==========================================
// CASHIER – VESSEL RENEWALS
// ==========================================
router.get('/cashier/renewals', authMiddleware('cashier'), getPendingRenewals);
router.post('/cashier/vessel-renewals/:id/approve', authMiddleware('cashier'), approveVesselRenewal);
router.post( '/cashier/gear-renewals/:id/approve', authMiddleware('cashier'),approveGearRenewal);
router.post('/cashier/vessel-renewals/:id/reject', authMiddleware('cashier'),rejectVesselRenewal);
router.post('/cashier/gear-renewals/:id/reject', authMiddleware('cashier'),rejectGearRenewal);

// ==========================================
// CASHIER – VESSEL MODIFICATIONS
// ==========================================
router.get(
  '/cashier/vessel-modifications',
  authMiddleware('cashier'),
  getPendingVesselModifications
);
// ==========================================
// CASHIER – APPROVE VESSEL MODIFICATION
// ==========================================
router.post('/cashier/vessel-modifications/:id/approve', authMiddleware('cashier'), approveVesselModification);
router.post('/cashier/vessel-modifications/:id/reject', authMiddleware('cashier'),rejectVesselModification);

// pending vessels (cashier)
router.get('/pending-vessels', authMiddleware('cashier'), getPendingVessels);
router.put('/vessels/:id/status', authMiddleware('cashier'), updateVesselStatus);
// ===============================
// PENDING GEARS (cashier)
// ===============================
router.get('/pending-gears',authMiddleware('cashier'),getPendingGears);
router.put('/gears/:id/status',authMiddleware('cashier'),updateGearStatus);
// ===============================
// apprehended fisherfolk (cashier)
// ===============================
router.get('/apprehended-fisherfolks',authMiddleware('cashier'), getApprehendedFisherfolks);
router.post('/apprehensions/:id/approve', authMiddleware('cashier'),approveApprehension);
router.post('/apprehensions/:id/reject', authMiddleware('cashier'),rejectApprehension);

// ========================================
//  user - receipt 
// ========================================
router.get(
  '/receipts/my-transactions',
  authMiddleware('user'),
  getMyTransactions
);

module.exports = router;
