const { pool } = require('../controllers/applicantControllers'); // updated import

exports.getAnnouncements = async (req, res) => {
  try {
    // 1️⃣ Auto-expire announcements whose meeting date has passed
    await pool.query(`
      UPDATE announcements
      SET status = 'inactive'
      WHERE meeting_date < CURDATE()
        AND status = 'active'
    `);

    // 2️⃣ Fetch announcements (you can remove the WHERE if you want all)
    const [rows] = await pool.query(`
      SELECT *
      FROM announcements
      ORDER BY meeting_date ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error('Get announcements error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.createAnnouncement = async (req, res) => {
  try {
    const { title, message, meeting_date, meeting_time, location } = req.body;

    await pool.query(`
      INSERT INTO announcements
      (title, message, meeting_date, meeting_time, location, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `, [title, message, meeting_date, meeting_time, location]);

    res.json({ message: 'Announcement created' });
  } catch (err) {
    console.error('Create announcement error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message, meeting_date, meeting_time, location, status } = req.body;

    await pool.query(`
      UPDATE announcements
      SET title = ?, message = ?, meeting_date = ?, meeting_time = ?, location = ?, status = ?
      WHERE id = ?
    `, [title, message, meeting_date, meeting_time, location, status, id]);

    res.json({ message: 'Announcement updated' });
  } catch (err) {
    console.error('Update announcement error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(`
      DELETE FROM announcements WHERE id = ?
    `, [id]);

    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    console.error('Delete announcement error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

