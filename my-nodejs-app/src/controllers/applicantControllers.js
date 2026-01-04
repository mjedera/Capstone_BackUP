// src/controllers/applicantControllers.js
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
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

// --------------------
// Validation Helper
// --------------------
function isValidName(input) {
    return /^[A-Za-z\s-]+$/.test(input);
}

// --------------------
// Password Helper
// --------------------
async function hashPasswordIfProvided(password) {
    if (!password || password.trim() === '') return null;
    return await bcrypt.hash(password, 10);
}

// --------------------
// CREATE APPLICANT
// --------------------
exports.createApplicant = async (req, res) => {
    try {
        const {
            username,
            password,
            first_name,
            middle_name,
            last_name,
            extra_name,
            age,
            sex,
            birthdate,
            address,
            marital_status,
            applicant_type
        } = req.body;

        // Handle file upload (store path in DB)
        const applicant_photo = req.file ? `/applicant_photos/${req.file.filename}` : null;

        // Required fields
        if (!username || !password || !first_name || !last_name) {
            return res.status(400).json({ message: "Required fields are missing." });
        }

        // Name validation
        if (!isValidName(first_name)) return res.status(400).json({ message: "First name must contain letters only." });
        if (middle_name && !isValidName(middle_name)) return res.status(400).json({ message: "Middle name must contain letters only." });
        if (!isValidName(last_name)) return res.status(400).json({ message: "Last name must contain letters only." });

        // Check duplicates
        const [userExists] = await pool.execute('SELECT username FROM applicants WHERE username = ?', [username]);
        if (userExists.length) return res.status(409).json({ message: 'Username already exists.' });

        const [nameExists] = await pool.execute(
            'SELECT id FROM applicants WHERE first_name = ? AND middle_name = ? AND last_name = ?',
            [first_name, middle_name, last_name]
        );
        if (nameExists.length) return res.status(409).json({ message: 'Applicant with the same name already exists.' });

        // Hash password
        const hashedPassword = await hashPasswordIfProvided(password);
        if (!hashedPassword) return res.status(400).json({ message: "Password is required." });

        // Insert into DB
        const [result] = await pool.execute(
            `INSERT INTO applicants 
            (username, password, first_name, middle_name, last_name, extra_name, age, sex, birthdate, address, marital_status, applicant_type, applicant_photo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                username,
                hashedPassword,
                first_name,
                middle_name || null,
                last_name,
                extra_name || null,
                age || null,
                sex || null,
                birthdate || null,
                address || null,
                marital_status || null,
                applicant_type || null,
                applicant_photo
            ]
        );

        res.status(201).json({
            message: 'Applicant created successfully.',
            id: result.insertId,
            applicant_photo
        });

    } catch (error) {
        console.error('Error creating applicant:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// --------------------
// FETCH ALL APPLICANTS
// --------------------
exports.getAllApplicants = async (req, res) => {
    try {
        const [applicants] = await pool.execute(
            `SELECT id, first_name, middle_name, last_name, extra_name, age, sex, birthdate, address, marital_status, applicant_type, applicant_photo 
             FROM applicants`
        );

        const formatted = applicants.map(a => ({
            id: a.id,
            firstname: a.first_name,
            middlename: a.middle_name,
            lastname: a.last_name,
            extraname: a.extra_name,
            age: a.age,
            sex: a.sex,
            birthdate: a.birthdate,
            address: a.address,
            status: a.marital_status,
            applicantType: a.applicant_type,
            photo: a.applicant_photo
        }));

        res.status(200).json(formatted);
    } catch (error) {
        console.error('Error fetching applicants:', error);
        res.status(500).json({ message: 'Server error while fetching applicants' });
    }
};

// --------------------
// FETCH SINGLE APPLICANT
// --------------------
exports.getApplicantById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.execute(
            `SELECT id, username, first_name, middle_name, last_name, extra_name, age, sex, birthdate, address, marital_status, applicant_type, applicant_photo 
             FROM applicants WHERE id = ?`,
            [id]
        );
        if (!rows.length) return res.status(404).json({ message: 'Applicant not found.' });
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching applicant:', error);
        res.status(500).json({ message: 'Server error while fetching applicant.' });
    }
};
// --------------------
// UPDATE APPLICANT
// --------------------
exports.updateApplicant = async (req, res) => {
    const { id } = req.params;
    const {
        password,
        first_name, middle_name, last_name, extra_name,
        age, sex, birthdate, address, marital_status, applicant_type
    } = req.body;

    const applicant_photo = req.file ? `/applicant_photos/${req.file.filename}` : undefined;

    const fields = [];
    const values = [];

    if (first_name !== undefined) { fields.push('first_name = ?'); values.push(first_name); }
    if (middle_name !== undefined) { fields.push('middle_name = ?'); values.push(middle_name); }
    if (last_name !== undefined) { fields.push('last_name = ?'); values.push(last_name); }
    if (extra_name !== undefined) { fields.push('extra_name = ?'); values.push(extra_name); }
    if (age !== undefined) { fields.push('age = ?'); values.push(age); }
    if (sex !== undefined) { fields.push('sex = ?'); values.push(sex); }
    if (birthdate !== undefined) { fields.push('birthdate = ?'); values.push(birthdate); }
    if (address !== undefined) { fields.push('address = ?'); values.push(address); }
    if (marital_status !== undefined) { fields.push('marital_status = ?'); values.push(marital_status); }
    if (applicant_type !== undefined) { fields.push('applicant_type = ?'); values.push(applicant_type); }
    if (applicant_photo !== undefined) { fields.push('applicant_photo = ?'); values.push(applicant_photo); }

    // Hash password if provided
    const hashedPassword = await hashPasswordIfProvided(password);
    if (hashedPassword) { fields.push('password = ?'); values.push(hashedPassword); }

    if (!fields.length) {
        return res.status(400).json({ message: "No fields provided for update." });
    }

    values.push(id);

    try {
        // ---------------------------------------
        // UPDATE applicants table
        // ---------------------------------------
        const sql = `UPDATE applicants SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await pool.execute(sql, values);

        if (!result.affectedRows) {
            return res.status(404).json({ message: "Applicant not found or no changes made." });
        }

        // ---------------------------------------
        // BUILD owner_name based on all name fields
        // ---------------------------------------
        const owner_name = [first_name, middle_name, last_name, extra_name]
            .filter(Boolean)        // remove empty values
            .join(" ")              // combine into one string
            .replace(/\s+/g, " ")   // remove extra spaces
            .trim();

        // ---------------------------------------
        // UPDATE fishing_gears & fishing_vessels
        // ONLY IF name or address was changed
        // ---------------------------------------
        const updateFields = [];
        const updateValues = [];

        if (first_name || middle_name || last_name || extra_name) {
            updateFields.push("owner_name = ?");
            updateValues.push(owner_name);
        }

        if (address) {
            updateFields.push("owner_address = ?");
            updateValues.push(address);
        }

        if (updateFields.length > 0) {
            updateValues.push(id); // applicant_no reference

            const updateSQL = `UPDATE fishing_gears SET ${updateFields.join(', ')} WHERE applicant_id = ?`;
            await pool.execute(updateSQL, updateValues);

            await pool.execute(
                `UPDATE fishing_vessels SET ${updateFields.join(', ')} WHERE applicant_id = ?`,
                updateValues
            );
        }

        res.status(200).json({ message: "Applicant updated and dependent tables synced.", id });

    } catch (error) {
        console.error("Error updating applicant:", error);
        res.status(500).json({ message: "Server error while updating applicant." });
    }
};
// --------------------
// DELETE APPLICANT
// --------------------
exports.deleteApplicant = async (req, res) => {
    const { id } = req.params;
    let connection;

    try {
        const deleter_user_id = req.session?.userId;
        connection = await pool.getConnection();
        await connection.beginTransaction();

        if (!deleter_user_id) {
            await connection.rollback();
            return res.status(403).json({ message: 'Authorization error: Admin ID missing from session.' });
        }

        const [applicantRows] = await connection.execute(`SELECT * FROM applicants WHERE id = ?`, [id]);
        if (!applicantRows.length) {
            await connection.rollback();
            return res.status(404).json({ message: 'Applicant not found.' });
        }

        const applicant = applicantRows[0];
        const deleted_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

        await connection.execute(
            `INSERT INTO deleted_applicants_history 
            (applicant_id, username, password, first_name, middle_name, last_name, extra_name, age, sex, birthdate, address, marital_status, applicant_type, photo_url, created_at, deleted_by_user_id, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                applicant.id,
                applicant.username,
                applicant.password,
                applicant.first_name,
                applicant.middle_name,
                applicant.last_name,
                applicant.extra_name,
                applicant.age,
                applicant.sex,
                applicant.birthdate,
                applicant.address,
                applicant.marital_status,
                applicant.applicant_type,
                applicant.applicant_photo,
                applicant.created_at,
                deleter_user_id,
                deleted_at
            ]
        );

        await connection.execute('DELETE FROM applicants WHERE id = ?', [id]);
        await connection.commit();

        res.status(200).json({ message: `Applicant ID ${id} deleted and archived successfully.` });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Transaction Error:', error);
        res.status(500).json({ message: 'Failed to delete and archive applicant.', error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// --------------------------------------
// UPDATE APPLICANT'S OWN PROFILE PHOTO
// --------------------------------------
exports.updateApplicantPhoto = async (req, res) => {
    try {
        if (!req.session.applicantLoggedIn || !req.session.applicantId) {
            return res.status(401).json({ success: false, message: "Not logged in" });
        }

        const applicantId = req.session.applicantId;

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No photo uploaded" });
        }

        const applicant_photo = `/applicant_photos/${req.file.filename}`;

        const sql = "UPDATE applicants SET applicant_photo = ? WHERE id = ?";
        const [result] = await pool.execute(sql, [applicant_photo, applicantId]);

        if (!result.affectedRows) {
            return res.status(404).json({ success: false, message: "Applicant not found" });
        }

        return res.json({
            success: true,
            message: "Photo updated successfully",
            newPhoto: applicant_photo
        });

    } catch (error) {
        console.error("Error updating profile photo:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while updating photo"
        });
    }
};
// --------------------------------------
// searchApplicants
// --------------------------------------
exports.searchApplicants = async (req, res) => {
    try {
        const query = req.query.query || "";

        const [rows] = await pool.execute(
            `SELECT id, first_name, middle_name, last_name, address, applicant_photo 
             FROM applicants
             WHERE first_name LIKE ? 
             OR middle_name LIKE ?
             OR last_name LIKE ?
             OR address LIKE ?`,
            [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
        );

        const formatted = rows.map(a => ({
            id: a.id,
            firstname: a.first_name,
            middlename: a.middle_name,
            lastname: a.last_name,
            address: a.address,
            photo: a.applicant_photo
        }));

        res.json(formatted);
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ message: "Server error while searching" });
    }
};
// --------------------
// APPLICANTS DASHBOARD DATA
// --------------------
exports.getApplicantsDashboard = async (req, res) => {
    try {
        const { fromYear, toYear } = req.query;

        if (!fromYear) {
            return res.status(400).json({ message: "fromYear is required" });
        }

        const endYear = toYear || fromYear;

        // --------------------
        // Total applicants
        // --------------------
        const [totalRows] = await pool.execute(
            `SELECT COUNT(*) AS total FROM applicants`
        );

        // --------------------
        // Monthly applicants per year
        // --------------------
        const [monthlyRows] = await pool.execute(
            `
            SELECT 
                YEAR(created_at) AS year,
                MONTH(created_at) AS month,
                COUNT(*) AS total
            FROM applicants
            WHERE YEAR(created_at) BETWEEN ? AND ?
            GROUP BY YEAR(created_at), MONTH(created_at)
            ORDER BY year, month
            `,
            [fromYear, endYear]
        );

        // --------------------
        // Applicants by sex
        // --------------------
        const [sexRows] = await pool.execute(
            `
            SELECT 
                COALESCE(sex, 'Unspecified') AS sex,
                COUNT(*) AS total
            FROM applicants
            GROUP BY sex
            `
        );

        // --------------------
        // Response
        // --------------------
        res.json({
            totalApplicants: totalRows[0].total,
            monthlyData: monthlyRows,
            sexStats: sexRows
        });

    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ message: "Dashboard fetch failed" });
    }
};



module.exports.pool = pool;
