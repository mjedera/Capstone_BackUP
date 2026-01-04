const { pool } = require('../controllers/applicantControllers'); // DB pool
const path = require('path');


/* =====================================================
   CREATE NEW ORDINANCE
===================================================== */
exports.createOrdinance = async (req, res) => {
  const {
    section_no,
    ordinance_title,
    ordinance_description,
    penalty_fee
  } = req.body;

  if (!section_no || !ordinance_title || !ordinance_description || !penalty_fee) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  try {
    await pool.query(
      `INSERT INTO municipal_ordinances
       (section_no, ordinance_title, ordinance_description, penalty_fee)
       VALUES (?, ?, ?, ?)`,
      [section_no, ordinance_title, ordinance_description, penalty_fee]
    );

    res.json({
      success: true,
      message: 'Ordinance added successfully'
    });

  } catch (err) {
    console.error('Create ordinance error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to save ordinance'
    });
  }
};

// GET all ordinances
exports.getAllOrdinances = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM municipal_ordinances ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load ordinances' });
  }
};
/* =====================================================
   UPDATE ORDINANCE
===================================================== */
exports.updateOrdinance = async (req, res) => {
  const { id } = req.params;
  const {
    section_no,
    ordinance_title,
    ordinance_description,
    penalty_fee
  } = req.body;

  if (!section_no || !ordinance_title || !ordinance_description || !penalty_fee) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  try {
    await pool.query(
      `UPDATE municipal_ordinances
       SET section_no = ?,
           ordinance_title = ?,
           ordinance_description = ?,
           penalty_fee = ?
       WHERE id = ?`,
      [section_no, ordinance_title, ordinance_description, penalty_fee, id]
    );

    res.json({
      success: true,
      message: 'Ordinance updated successfully'
    });
  } catch (err) {
    console.error('Update ordinance error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update ordinance'
    });
  }
};

