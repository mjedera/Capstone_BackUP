// src/controllers/authControllers.js
const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Handle login
exports.loginAdmin = async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await pool.execute(
      'SELECT id, username, password, role FROM users WHERE username = ?',
      [username]
    );

    const user = rows[0];

    if (!user) {
      return res.status(401).send(
        "<script>alert('Invalid username or password'); window.location.href='/login';</script>"
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send(
        "<script>alert('Invalid username or password'); window.location.href='/login';</script>"
      );
    }

    if (!user.role) {
      return res.status(403).send(
        "<script>alert('User role not assigned'); window.location.href='/login';</script>"
      );
    }

    req.session.username = user.username;
    req.session.role = user.role;
    req.session.userId = user.id;

    let redirectTo = '/dashboard';
    if (user.role === 'cashier') {
      redirectTo = '/cashier/dashboard';
    }

    req.session.save(err => {
      if (err) console.error('Session save error:', err);
      return res.redirect(redirectTo);
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('<h1>Server Error</h1>');
  }
};

exports.getUserLogin = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.send("<script>alert('All fields are required'); window.location.href='/userLogin';</script>");
    }

    try {
        const [rows] = await pool.query(
            "SELECT * FROM applicants WHERE username = ?",
            [username]
        );

        if (rows.length === 0) {
            return res.send("<script>alert('Invalid username or password'); window.location.href='/userLogin';</script>");
        }

        const user = rows[0];

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.send("<script>alert('Invalid password or password'); window.location.href='/userLogin';</script>");
        }

        // Success
        req.session.applicantId = user.id;
        req.session.applicantName = user.username;
        req.session.applicantLoggedIn = true;

        req.session.save(err => {
            if (err) console.error(err);  
            return res.redirect('/api/fisherFolkRoutes/userDashboard');
        });

    } catch (err) {
        console.error(err);
        return res.send("<script>alert('Server error'); window.location.href='/userLogin';</script>");
    }
};

exports.getCurrentApplicant = async (req, res) => {
    if (!req.session.applicantLoggedIn) {
        return res.json({ loggedIn: false });
    }

    try {
        const [rows] = await pool.execute(
            `SELECT id, username, first_name, middle_name, last_name, extra_name,
                    age, sex, birthdate, address, marital_status, applicant_type, applicant_photo
             FROM applicants
             WHERE id = ?`,
            [req.session.applicantId]
        );

        if (rows.length === 0) return res.json({ loggedIn: false });

        const user = rows[0];

        // Don't prepend anything; the DB already has the correct path
        // Fallback to default on frontend
        // if (!user.applicant_photo) user.applicant_photo = '/applicant_photos/default.png';

        res.json({
            loggedIn: true,
            data: user
        });
    } catch (err) {
        console.error('Error fetching current applicant:', err);
        res.status(500).json({ loggedIn: false });
    }
};

// Update password for logged-in applicant
exports.updatePassword = async (req, res) => {
    try {
        const applicantId = req.session.applicantId; // Only for applicants
        const { currentPassword, newPassword } = req.body;

        if (!applicantId) {
            return res.status(401).json({ message: 'Not logged in.' });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Fetch current password hash from DB
        const [rows] = await pool.execute(
            'SELECT password FROM applicants WHERE id = ?',
            [applicantId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const user = rows[0];

        // Compare current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password in DB
        await pool.execute(
            'UPDATE applicants SET password = ? WHERE id = ?',
            [hashedPassword, applicantId]
        );

        return res.json({ message: 'Password updated successfully!' });

    } catch (err) {
        console.error('Error updating password:', err);
        return res.status(500).json({ message: 'Server error. Please try again.' });
    }
};



// Dashboard page
exports.getDashboardPage = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'dashboard.html'));
};

// userLogin page
exports.getUserLoginPage = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views','user', 'userLogin.html'));
};
// userIndex page
exports.getUserIndexPage = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views','user', 'userIndex.html'));
};
// Render login page
exports.getLoginPage = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
};
exports.getRegistrationPage = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'registration.html'));
};
exports.getApprehensionReportPage = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'apprehensionRprt.html'));
};
exports.getMunisOrdinancePage = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'munisOrdinance.html'));
};
exports.getUserDashboard = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'user', 'userDashboard.html'));
};

// Return logged-in admin info (username + role)
exports.getUser = (req, res) => {
    if (req.session.username) {
        res.json({
            username: req.session.username,
            role: req.session.role || 'user'
        });
    } else {
        res.json({});
    }
};

