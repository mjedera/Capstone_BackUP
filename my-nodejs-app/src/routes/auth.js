// src/routes/auth.js
const express = require('express');
const authController = require('../controllers/authControllers');
const adminController = require('../controllers/adminControllers')
const authMiddleware = require('../middleware/authMiddleware');
const userAuth = require('../middleware/userAuth');
const path = require('path');
const router = express.Router();
const fs = require('fs');
const multer = require('multer');

// Multer storage for site logo
const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'public', 'logos');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir); // create folder if missing
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, 'site_logo' + path.extname(file.originalname)); // always overwrite
    }
});
const uploadLogo = multer({ storage: logoStorage });
// admin routes
router.get('/', (req, res) => res.redirect('/userLogin'));
// login page
router.get('/login', authController.getLoginPage);  
router.get('/registration', authMiddleware('admin'), authController.getRegistrationPage);
router.get('/ApprehensionReport', authMiddleware('admin'), authController.getApprehensionReportPage);
router.get(
  '/munisOrdinance',
  authMiddleware('admin'),
  authController.getMunisOrdinancePage
);
// login controller
router.post('/login', authController.loginAdmin);
// Serve login page (GET)
router.get('/userLogin', authController.getUserLoginPage);
router.get('/userIndex',authController.getUserIndexPage)
//user route
router.post("/userLogin", authController.getUserLogin);

// Admin-only routes
router.get('/user', authMiddleware('admin'), authController.getUser);
router.get('/dashboard', authMiddleware('admin'), (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'dashboard.html'));
});
router.get('/accounts', authMiddleware('admin'), (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});
router.get('/registrationFees', authMiddleware('admin'), (req, res) => { 
    res.sendFile(path.join(__dirname, '..', 'views', 'registrationFee.html'));
});
router.get('/test-session', authMiddleware('admin'), (req, res) => {
    res.json({ message: 'Session is active!', session: req.session });
});
// Admin logo upload route
router.post('/upload-logo', authMiddleware('admin'), uploadLogo.single('logo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    res.json({ success: true, message: 'Logo uploaded successfully', filename: req.file.filename });
});
// Get current logo info
router.get('/current-logo', authMiddleware('admin'), (req, res) => {
    const logoDir = path.join(__dirname, '..', 'public', 'logo');
    const files = fs.readdirSync(logoDir);
    const logoFile = files.find(f => f.startsWith('site_logo'));
    
    if (logoFile) {
        res.json({ exists: true, filename: logoFile });
    } else {
        res.json({ exists: false });
    }
});
// Logout route
router.get('/logout', authMiddleware(), (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Could not log out.');
        }
        res.redirect('/login');
    });
});
router.get('/userLogout', (req, res) => { 
    req.session.destroy(err => {
        if (err) return res.send("Error logging out");
        res.redirect('/userLogin');
    });
});
// Get logged-in user (for greeting)
router.get('/currentUser', (req, res) => {
    if (!req.session.applicantLoggedIn) {
        return res.json({ loggedIn: false });
    } 
    res.json({
        loggedIn: true,
        username: req.session.applicantName,
        id: req.session.applicantId
    });
});
router.post('/add-admin', adminController.addAdmin);
// POST route for updating password (for both admin and applicant)
router.post('/updatePassword', authController.updatePassword);
module.exports = router;
