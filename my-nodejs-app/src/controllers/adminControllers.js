const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { pool } = require('../controllers/applicantControllers'); // updated import

// Ensure folder exists
const logoDir = path.join(__dirname, '../public/logos');
if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, logoDir),
    filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
});
const upload = multer({ storage });

// ----------------------
// UPLOAD LOGO
// ----------------------
exports.uploadLogo = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    // Delete old logo if path sent
    if (req.body.oldLogo) {
        const oldPath = path.join(__dirname, '../public', req.body.oldLogo.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const logoPath = `/logos/${req.file.filename}`;

    try {
        await pool.execute(
            `INSERT INTO logo (key_name, value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE value = ?`,
            ['site_logo', logoPath, logoPath]
        );

        res.json({ message: 'Logo uploaded!', logoPath });
    } catch (err) {
        console.error('Database error while saving logo:', err);
        res.status(500).json({ message: 'Database error while saving logo.' });
    }
};

// ----------------------
// REMOVE LOGO
// ----------------------
exports.removeLogo = async (req, res) => {
    const { logoPath } = req.body;
    if (!logoPath) return res.status(400).json({ message: 'No logo path provided.' });

    const filePath = path.join(__dirname, '../public', logoPath.replace(/^\//, ''));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    try {
        await pool.execute(`DELETE FROM logo WHERE key_name = ?`, ['site_logo']);
        res.json({ message: 'Logo removed successfully.' });
    } catch (err) {
        console.error('Database error while removing logo:', err);
        res.status(500).json({ message: 'Database error while removing logo.' });
    }
};

// ----------------------
// GET LOGO PATH
// ----------------------
exports.getLogo = async (req, res) => {
    try {
        const [rows] = await pool.execute(`SELECT value FROM logo WHERE key_name = ?`, ['site_logo']);
        const logoPath = rows.length ? rows[0].value : '/logos/default.png';
        res.json({ logoPath });
    } catch (err) {
        console.error('Database error while fetching logo:', err);
        res.status(500).json({ message: 'Database error while fetching logo.' });
    }
};

// Add new admin account
exports.addAdmin = async (req, res) => {
    const { 
        username, 
        password,
        first_name,
        middle_name,
        extra_name,
        last_name,
        role,
    } = req.body;

    if (!username || !password || !first_name || !last_name || !role) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        // Check if user exists
        const [rows] = await pool.execute(
            "SELECT id FROM users WHERE username = ?",
            [username]
        );

        if (rows.length > 0) {
            return res.status(409).json({ message: "Username already exists." });
        }

        // Hash password using bcryptjs (because your file uses bcryptjs, NOT bcrypt)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert into MySQL
        await pool.execute(
            "INSERT INTO users (username, password, first_name,middle_name,extra_name,last_name,role) VALUES (?, ?, ?,?,?,?,?)",
            [username, hashedPassword,first_name, middle_name, extra_name, last_name, role ]
        );

        return res.json({ message: "Admin created successfully!" });

    } catch (error) {
        console.error("Add admin error:", error);
        return res.status(500).json({ message: "Server error." });
    }
};

// export the multer upload middleware so you can use it in routes
exports.upload = upload.single('logo');
