const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const bantayDagatAuth = require('../middleware/bantayDagatAuth');
const authMiddleware = require('../middleware/authMiddleware');

// Import controller functions
const {
    createBantayDagat,
    getAllBantayDagat,
    getBantayDagatLoginPage,
    loginBantayDagat,
    getCurrentBantayDagat,
    uploadPhoto,
    submitReport,
    getActiveAnnouncements,
    updateBantayDagat ,
    deleteBantayDagat
} = require('../controllers/bantay_dagat_controllers');

// ---------------------------------
// Multer Setup (SAME STYLE AS APPLICANT)
// ---------------------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/bantay_dagat_photo'));
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
// ---------------------------------
// Multer for REPORT PHOTOS
// ---------------------------------
const reportStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/bantay_dagat_reports'));
  },
  filename: (req, file, cb) => {
    const name = path.parse(file.originalname).name
      .replace(/\s+/g, '_')
      .substring(0, 200);
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${name}${ext}`);
  }
});

const uploadReport = multer({
  storage: reportStorage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files allowed'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post(
  '/submit-report',bantayDagatAuth,
  uploadReport.single('report_photo'),
  submitReport
);


// ---------------------------------
// ROUTES
// ---------------------------------

// Create new Bantay Dagat user
router.post('/add',authMiddleware('admin'), upload.single("bantay_dagat_photo"), createBantayDagat);

// Get all Bantay Dagat accounts
router.get('/all',authMiddleware('admin'), getAllBantayDagat); 

// Bantay Dagat login page
router.get('/BantayDagat', getBantayDagatLoginPage);

// Login endpoint
router.post('/BantayDagatLogin', loginBantayDagat);

// Dashboard route (protected)
router.get(
  '/BantayDagatDashboard',
  bantayDagatAuth,
  (req, res) => {
    res.sendFile(
      path.join(__dirname, '..', 'views', 'bantay_dagat', 'bantayDagatDashboard.html')
    );
  }
);


// Route to serve the profile HTML
router.get('/bantayDagatProfile.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..','views', 'bantay_dagat', 'bantayDagatProfile.html'));
});

router.get('/bantayDagatDigitalID.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..','views', 'bantay_dagat', 'bantayDagatDigitalID.html'));
});

// Route to get current logged-in Bantay Dagat info
router.get('/current',bantayDagatAuth, getCurrentBantayDagat);
router.put('/:id', authMiddleware('admin'),upload.single('bantay_dagat_photo'), updateBantayDagat);
router.delete('/:id', authMiddleware('admin'),deleteBantayDagat);
// Upload new profile photo
router.post('/upload-photo',bantayDagatAuth, upload.single('bantay_dagat_photo'), uploadPhoto); 
router.get('/announcements/active',bantayDagatAuth ,getActiveAnnouncements);
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ success: false });
    }

    res.clearCookie('connect.sid'); // important
    res.json({ success: true });
  });
});

module.exports = router;
