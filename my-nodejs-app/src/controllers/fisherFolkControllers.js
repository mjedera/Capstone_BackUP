const { pool } = require('../controllers/applicantControllers'); // DB pool

exports.getUnsettledVessels = async (req, res) => {
  try {
    if (!req.session.applicantLoggedIn) {
      return res.status(401).json({ loggedIn: false });
    }

    const applicantId = req.session.applicantId;

    const [rows] = await pool.query(`
      SELECT
        id,
        vessel_no,
        vessel_name,
        vessel_type,
        apprehension_status
      FROM fishing_vessels
      WHERE applicant_id = ?
        AND apprehension_status = 'Apprehended'
    `, [applicantId]);

    res.json({
      success: true,
      vessels: rows
    });

  } catch (err) {
    console.error('Unsettled vessels error:', err);
    res.status(500).json({ message: 'Failed to load unsettled vessels' });
  }
};

exports.getActiveAnnouncements = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        title,
        message,
        meeting_date,
        meeting_time,
        location,
        created_at
      FROM announcements
      WHERE status = 'ACTIVE'
      ORDER BY meeting_date ASC, meeting_time ASC
      LIMIT 5
    `);

    res.json({
      success: true,
      announcements: rows
    });
  } catch (err) {
    console.error('Announcements error:', err);
    res.status(500).json({ message: 'Failed to load announcements' });
  }
};
