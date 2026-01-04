const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Folder to store applicant photos
const uploadDir = path.join(__dirname, '..', 'public', 'applicant_photos');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const timestamp = Date.now();
        cb(null, `applicant_${timestamp}${ext}`);
    }
});

// Filter only image files
const fileFilter = (req, file, cb) => {
    if(file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed!'), false);
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
