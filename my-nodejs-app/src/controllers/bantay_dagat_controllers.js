const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const { pool } = require('../controllers/applicantControllers'); // Make sure pool is properly exported

// ======================================================
// CREATE NEW BANTAY DAGAT ACCOUNT
// ======================================================
exports.createBantayDagat = async (req, res) => {
    try {
        let {
            first_name,
            middle_name,
            last_name,
            extra_name,
            age,
            sex,
            marital_status,
            birthday,
            address,
            username,
            password
        } = req.body;

        // Ensure optional fields have defaults
        middle_name = middle_name || '';
        extra_name = extra_name || '';

        // Basic validation
        if (!first_name || !last_name || !age || !sex || !marital_status || !birthday || !address || !username || !password) {
            return res.status(400).json({ message: "All required fields must be filled out." });
        }

        // Check for existing account (by username or full name)
        const [existing] = await pool.execute(
            `SELECT id FROM bantay_dagat WHERE username = ? OR (first_name = ? AND middle_name = ? AND last_name = ?)`,
            [username, first_name, middle_name, last_name]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: "Account with the same username or full name already exists." });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Handle uploaded photo
        let bantayPhoto = null;
        if (req.file) {
            bantayPhoto = `/bantay_dagat_photo/${req.file.filename}`;
        }

        // Insert new account
        const sql = `
            INSERT INTO bantay_dagat
            (first_name, middle_name, last_name, extra_name, age, sex, marital_status, birthdate, address, username, password, bantay_dagat_photo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await pool.execute(sql, [
            first_name,
            middle_name,
            last_name,
            extra_name,
            age,
            sex,
            marital_status,
            birthday,
            address,
            username,
            hashedPassword,
            bantayPhoto
        ]);

        return res.json({ message: "Bantay Dagat account successfully created!" });

    } catch (err) {
        console.error("Error creating Bantay Dagat:", err);
        return res.status(500).json({ message: "Server error while creating account." });
    }
};

// ======================================================
// UPDATE BANTAY DAGAT ACCOUNT
// ======================================================
exports.updateBantayDagat = async (req, res) => {
    try {
        const { id } = req.params;

        let {
            first_name,
            middle_name,
            last_name,
            extra_name,
            age,
            sex,
            marital_status,
            birthday,
            address,
            username,
            password
        } = req.body;

        middle_name = middle_name || '';
        extra_name = extra_name || '';

        if (!first_name || !last_name || !age || !sex || !marital_status || !birthday || !address || !username) {
            return res.status(400).json({ message: "Required fields are missing." });
        }

        // Optional photo
        let photoSql = '';
        let params = [
            first_name,
            middle_name,
            last_name,
            extra_name,
            age,
            sex,
            marital_status,
            birthday,
            address,
            username
        ];

        if (req.file) {
            photoSql = ', bantay_dagat_photo = ?';
            params.push(`/bantay_dagat_photo/${req.file.filename}`);
        }

        // Optional password update
        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            photoSql += ', password = ?';
            params.push(hashed);
        }
        const [exists] = await pool.execute(
          `SELECT id FROM bantay_dagat WHERE username = ? AND id != ?`,
          [username, id]
        );

        if (exists.length > 0) {
          return res.status(409).json({ message: "Username already in use." });
        }


        params.push(id);

        const sql = `
            UPDATE bantay_dagat
            SET first_name = ?, middle_name = ?, last_name = ?, extra_name = ?,
                age = ?, sex = ?, marital_status = ?, birthdate = ?, address = ?, username = ?
                ${photoSql}
            WHERE id = ?
        `;

        await pool.execute(sql, params);

        res.json({ message: "Bantay Dagat account updated successfully!" });

    } catch (err) {
        console.error("Update Bantay Dagat error:", err);
        res.status(500).json({ message: "Server error while updating account." });
    }
};
// ======================================================
// delete BANTAY DAGAT ACCOUNT
// ======================================================
exports.deleteBantayDagat = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.execute(
            `DELETE FROM bantay_dagat WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Bantay Dagat not found.' });
        }

        res.json({ message: 'Bantay Dagat account deleted successfully.' });

    } catch (err) {
        console.error('Delete Bantay Dagat error:', err);
        res.status(500).json({ message: 'Failed to delete Bantay Dagat account.' });
    }
};

// ======================================================
// GET ALL BANTAY DAGAT ACCOUNTS
// ======================================================
exports.getAllBantayDagat = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        id,
        username,
        first_name,
        middle_name,
        last_name,
        extra_name,
        age,
        sex,
        birthdate,
        address,
        marital_status,
        bantay_dagat_photo
      FROM bantay_dagat
      ORDER BY last_name ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load Bantay Dagat' });
  }
};


exports.loginBantayDagat = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).send('Username and password are required.');
        }

        // Check if account exists
        const [rows] = await pool.execute(
            'SELECT * FROM bantay_dagat WHERE username = ?',
            [username]
        );
        if (rows.length === 0) {
            // return res.status(401).send('Invalid username or password.');
            return res.send("<script>alert('Invalid username or password'); window.location.href='/BantayDagat';</script>");
        }
        const user = rows[0];
        // Compare password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.send("<script>alert('Invalid username or password'); window.location.href='/BantayDagat';</script>");
            
        }

        // Set session
        req.session.bantayDagatLoggedIn = true;
        req.session.bantayDagatId = user.id;
        req.session.bantayDagatName = `${user.first_name} ${user.last_name}`;

        // Redirect to dashboard
        res.redirect('/api/bantay-dagat/BantayDagatDashboard');

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).send('Server error during login.');
    }
};

// ======================================================
// GET CURRENT LOGGED-IN BANTAY DAGAT
// ======================================================
exports.getCurrentBantayDagat = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT id, first_name, middle_name, last_name, extra_name, age, sex, marital_status, birthdate, address, username, bantay_dagat_photo
             FROM bantay_dagat WHERE id = ?`,
            [req.session.bantayDagatId]
        );

        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

        res.json(rows[0]);
    } catch (err) {
        console.error('Error fetching current Bantay Dagat:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.uploadPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const photoPath = `/bantay_dagat_photo/${req.file.filename}`;

        // Update database
        const sql = 'UPDATE bantay_dagat SET bantay_dagat_photo = ? WHERE id = ?';
        await pool.execute(sql, [photoPath, req.session.bantayDagatId]);

        res.json({ message: 'Photo uploaded', photoPath });

    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ======================================================
// SUBMIT BANTAY DAGAT REPORT
// ======================================================
exports.submitReport = async (req, res) => {
  try {

    const { report_title, report_description } = req.body;

    if (!report_title || !report_description) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    let photoPath = null;
    if (req.file) {
      photoPath = `/bantay_dagat_reports/${req.file.filename}`;
    }

    const sql = `
      INSERT INTO bantay_dagat_reports
      (bantay_dagat_id, report_title, report_description, report_photo)
      VALUES (?, ?, ?, ?)
    `;

    await pool.execute(sql, [
      req.session.bantayDagatId,
      report_title,
      report_description,
      photoPath
    ]);

    res.json({ success: true, message: 'Report submitted successfully' });

  } catch (err) {
    console.error('Submit report error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
// fisherFolkControllers.js (or announcements controller)
exports.getActiveAnnouncements = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, title, message, meeting_date, meeting_time, location
      FROM announcements
      WHERE status = 'ACTIVE'
      ORDER BY meeting_date ASC, meeting_time ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load announcements' });
  }
};

// ======================================================
// Render Bantay Dagat login page
// ======================================================
exports.getBantayDagatLoginPage = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'bantay_dagat','bantayDagatLogin.html'));
};
