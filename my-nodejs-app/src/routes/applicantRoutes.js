const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
// IMPORT THE CONTROLLER
const { 
    createApplicant, 
    getAllApplicants, 
    deleteApplicant,
    getApplicantById, 
    updateApplicant,
    updateApplicantPhoto,
    searchApplicants,
    getApplicantsDashboard
} = require('../controllers/applicantControllers');

// -------------------------------
// Multer setup for file uploads
// -------------------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/applicant_photos')); // folder to store photos
    },
    filename: (req, file, cb) => {
        // Sanitize filename and limit length to ~200 chars
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

// ================================
// Fisherfolk Self-Update Photo
// ================================
router.post(
    "/updateApplicantPhoto",
    upload.single("applicant_photo"),
    updateApplicantPhoto
);


// -------------------------------
// Routes
// -------------------------------

// -------------------------------
// Routes with Admin Protection
// -------------------------------

router.get('/dashboard/data', authMiddleware('admin'), getApplicantsDashboard);

// Search applicants
router.get('/search', authMiddleware('admin'), searchApplicants);

// Fetch single applicant by ID
router.get('/:id', authMiddleware('admin'), getApplicantById); 

// Fetch all applicants
router.get('/', authMiddleware('admin'), getAllApplicants);

// Create applicant (with photo upload) - **If this is for admin-only creation**
router.post('/create', authMiddleware('admin'), upload.single('applicant_photo'), createApplicant);

// Update applicant (with optional photo upload)
router.put('/:id', authMiddleware('admin'), upload.single('applicant_photo'), updateApplicant);

// Delete applicant
router.delete('/:id', authMiddleware('admin'), deleteApplicant);



module.exports = router;
