const { pool } = require('../controllers/applicantControllers'); // DB pool
const path = require('path');

/* =====================================================
   CREATE APPREHENSION REPORT
===================================================== */
exports.createApprehensionReport = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const {
      apprehensionDate,
      fullName,
      address,
      age,
      sex,
      birthdate,
      placeOfApprehension,
      violationType,
      penaltyDetails,
      noOfDays,
      vesselType,
      gearType,
      mfletNames = [],

      // manual vessel fields
      length,
      breadth,
      depth,
      grossTonnage,
      netTonnage,
      vesselColor,

      // engine
      engineMake,
      engineSerialNumber,
      horsePower,
      cylinders,

      // gear fields
      handInstruments,
      line_type,
      palubog_nets,
      nets,
      traps,
      accessories
    } = req.body;

    const formattedDate = apprehensionDate
      ? apprehensionDate.replace('T', ' ') + ':00'
      : null;

    /* =======================
       LINK REGISTERED VESSEL
    ======================= */
    let vesselId = null;
    let vesselNo = null;
    if (req.body.selectedVesselId) {
      const [[v]] = await conn.query(
        `SELECT id, vessel_no FROM fishing_vessels WHERE id = ?`,
        [req.body.selectedVesselId]
      );
      if (!v) {
        return res.status(400).json({
          message: 'Selected vessel does not exist'
        });
      }
      vesselId = v.id;
      vesselNo = v.vessel_no;
    }
    if (req.body.registeredVesselNo && !vesselId) {
      return res.status(400).json({
        message: 'Registered vessel number not found'
      });
    }
    if (vesselId) {
      const [[vessel]] = await conn.query(
        `SELECT apprehension_status FROM fishing_vessels WHERE id = ?`,
        [vesselId]
      );

      if (vessel?.apprehension_status === 'Apprehended') {
        return res.status(400).json({
          message: 'This vessel is already apprehended'
        });
      }
    }
    if (vesselType === 'Motorized') {
      if (!engineMake || !engineSerialNumber || !horsePower || !cylinders) {
        return res.status(400).json({
          message: 'Motorized vessel requires complete engine details'
        });
      }
    }
    /* =======================
       LINK REGISTERED GEAR
    ======================= */
    let gearId = null;
    let gearNo = null;
    if (req.body.selectedGearId) {
      const [[g]] = await conn.query(
        `SELECT id, gear_no, apprehension_status
        FROM fishing_gears
        WHERE id = ?`,
        [req.body.selectedGearId]
      );

      if (!g) {
        return res.status(400).json({ message: 'Selected gear does not exist' });
      }

      if (g.apprehension_status === 'Apprehended') {
        return res.status(400).json({ message: 'This gear is already apprehended' });
      }

      gearId = g.id;
      gearNo = g.gear_no;
    }

    /* =======================
      penalty munis_ordinance
    ======================= */
    let finalPenalty = null;
    if (req.body.ordinanceId) {
      const [[ord]] = await conn.query(
        `SELECT penalty_fee FROM municipal_ordinances WHERE id = ?`,
        [req.body.ordinanceId]
      );

      finalPenalty = ord?.penalty_fee ?? null;
    }
    /* =======================
       INSERT MAIN REPORT
    ======================= */
    const [result] = await conn.query(
      `INSERT INTO apprehension_reports (
        apprehension_date,
        full_name,
        address,
        age,
        sex,
        birthdate,
        place_of_apprehension,
        vessel_type,
        gear_used,
        mflet_count,
        violation_type,
        penalty_details,
        no_of_days
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        formattedDate,
        fullName,
        address,
        age,
        sex,
        birthdate,
        placeOfApprehension,
        vesselType || 'None',
        gearType === 'Yes' ? 'Yes' : 'None',
        Array.isArray(mfletNames) ? mfletNames.length : 0,
        violationType,
        penaltyDetails,
        noOfDays
      ]
    );

    const apprehensionId = result.insertId;

    /* =======================
       GENERATE VIOLATOR NO
    ======================= */
    const year = new Date().getFullYear();
    const violatorNo = `AA-${year}-${apprehensionId}`;

    await conn.query(
      `UPDATE apprehension_reports SET violator_no = ? WHERE id = ?`,
      [violatorNo, apprehensionId]
    );
    /* =======================
      INSERT VESSEL DETAILS
    ======================= */
    if (vesselType !== 'None') {
      await conn.query(
        `INSERT INTO apprehension_reports_vessels (
          apprehension_id,
          vessel_id,
          vessel_no,
          length_m,
          breadth_m,
          depth_m,
          gross_tonnage,
          net_tonnage,
          vessel_color,
          engine_make,
          engine_serial_number,
          horse_power,
          cylinders
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          apprehensionId,
          vesselId,
          vesselNo || null,
          length || null,
          breadth || null,
          depth || null,
          grossTonnage || null,
          netTonnage || null,
          vesselColor || null,
          vesselType === 'Motorized' ? engineMake : null,
          vesselType === 'Motorized' ? engineSerialNumber : null,
          vesselType === 'Motorized' ? horsePower : null,
          vesselType === 'Motorized' ? cylinders : null
        ]
      );
      // ✅ UPDATE VESSEL APPREHENSION STATUS
      if (vesselId) {
        await conn.query(
          `UPDATE fishing_vessels
          SET apprehension_status = 'Apprehended'
          WHERE id = ?`,
          [vesselId]
        );
      }
    }

    /* =======================
       INSERT GEAR DETAILS
    ======================= */
    if (gearType === 'Yes') {
      await conn.query(
        `INSERT INTO apprehension_reports_gears (
          apprehension_id,
          gear_id,
          gear_no,
          hand_instruments,
          fishing_lines,
          palubog_nets,
          fishing_nets,
          traps,
          accessories
        ) VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          apprehensionId,
          gearId,
          gearNo,
          handInstruments || null,
          line_type || null,
          palubog_nets || null,
          nets || null,
          traps || null,
          accessories || null
        ]
      );
    }
    if (gearId) {
      await conn.query(
        `UPDATE fishing_gears
        SET apprehension_status = 'Apprehended'
        WHERE id = ?`,
        [gearId]
      );
    }
    /* =======================
       INSERT MFLET
    ======================= */
    const uniqueMflet = [...new Set(mfletNames)];
    for (const name of uniqueMflet) {
      await conn.query(
        `INSERT INTO apprehension_reports_mflet (apprehension_id, full_name)
         VALUES (?,?)`,
        [apprehensionId, name]
      );
    }

    await conn.commit();

    res.status(201).json({
      message: 'Apprehension report saved successfully',
      violatorNo
    });
  } catch (err) {
    await conn.rollback();
    console.error('Apprehension error:', err);
    res.status(500).json({ message: 'Failed to save apprehension report' });
  } finally {
    conn.release();
  }
};
/* =====================================================
   search registered vessels
===================================================== */
exports.searchRegisteredVessels = async (req, res) => {
  const q = `%${req.query.q}%`;

  const [rows] = await pool.query(`
    SELECT
      id,
      vessel_no,
      vessel_name,
      length,
      breadth,
      depth,
      gross_tonnage,
      net_tonnage,
      vessel_color,
      engine_make,
      engine_serial_number,
      engine_horse_power,
      engine_cylinders
    FROM fishing_vessels
    WHERE (vessel_no LIKE ? OR vessel_name LIKE ?)
      AND apprehension_status != 'Apprehended'
      AND status NOT IN ('PENDING', 'REJECTED')
    LIMIT 10
  `, [q, q]);

  res.json(rows);
};

/* =====================================================
   search registered gears
===================================================== */
exports.searchRegisteredGear = async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`;

    const [rows] = await pool.query(`
      SELECT
        id,
        gear_no,
        hand_instruments,
        bobo_small_qty,
        bobo_large_qty,
        tambuan_qty,
        line_type,
        nets,
        palubog_nets,
        accessories
      FROM fishing_gears
      WHERE gear_no LIKE ?
        AND apprehension_status != 'Apprehended'
        AND status NOT IN ('PENDING', 'REJECTED')
      LIMIT 10
    `, [q]);

    res.json(rows); // ✅ ALWAYS array

  } catch (err) {
    console.error('Gear search error:', err);
    res.status(500).json([]); // ✅ return empty array, NOT HTML
  }
};
/* =====================================================
   search registered gears
===================================================== */
exports.searchOrdinances = async (req, res) => {
  try {
    const q = req.query.q || '';

    const [rows] = await pool.query(`
      SELECT id, section_no, ordinance_title, penalty_fee
      FROM municipal_ordinances
      WHERE section_no LIKE ? OR ordinance_title LIKE ?
      ORDER BY section_no ASC
      LIMIT 10
    `, [`%${q}%`, `%${q}%`]);

    res.json(rows);
  } catch (err) {
    console.error('Search ordinances error:', err);
    res.status(500).json({ message: 'Failed to fetch ordinances' });
  }
};

/* =====================================================
   DASHBOARD COUNTS
===================================================== */
exports.getApprehensionDashboard = async (req, res) => {
  const [vessel] = await pool.query(
    `SELECT vessel_type, COUNT(*) AS total
     FROM apprehension_reports
     GROUP BY vessel_type`
  );

  const [gear] = await pool.query(
    `SELECT gear_used, COUNT(*) AS total
     FROM apprehension_reports
     GROUP BY gear_used`
  );

  res.json({ vessel, gear });
};

/* =====================================================
   LIST ALL APPREHENSION REPORTS
===================================================== */
exports.getAllApprehensionReports = async (req, res) => {
  const [rows] = await pool.query(`
    SELECT
      ar.id,
      ar.violator_no,
      ar.full_name,
      ar.apprehension_date,
      ar.vessel_type,
      ar.violation_type,
      ar.penalty_details,
      ar.status,
      (
        (hand_instruments IS NOT NULL) +
        (fishing_lines IS NOT NULL) +
        (palubog_nets IS NOT NULL) +
        (fishing_nets IS NOT NULL) +
        (traps IS NOT NULL) +
        (accessories IS NOT NULL)
      ) AS gear_count
    FROM apprehension_reports ar
    LEFT JOIN apprehension_reports_gears g
      ON ar.id = g.apprehension_id
    ORDER BY ar.created_at DESC;
  `);

  res.json(rows);
};

/* =====================================================
   VIEW SINGLE APPREHENSION REPORT
===================================================== */
exports.getApprehensionById = async (req, res) => {
  const { id } = req.params;

  try {
    // MAIN REPORT + VESSEL + OWNER
    const [[report]] = await pool.query(`
      SELECT
        ar.*,
        arv.*,
        fv.vessel_name,
        fv.owner_name,
        fv.owner_address,
        fv.home_port
      FROM apprehension_reports ar
      LEFT JOIN apprehension_reports_vessels arv
        ON arv.apprehension_id = ar.id
      LEFT JOIN fishing_vessels fv
        ON fv.vessel_no = arv.vessel_no
      WHERE ar.id = ?
    `, [id]);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // GEARS
    const [[gears]] = await pool.query(`
      SELECT *
      FROM apprehension_reports_gears
      WHERE apprehension_id = ?
    `, [id]);

    // MFLET
    const [mflet] = await pool.query(`
      SELECT full_name
      FROM apprehension_reports_mflet
      WHERE apprehension_id = ?
    `, [id]);

    res.json({
      report,
      gears,
      mflet
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.getDashboardData = async (req, res) => {
  try {
    let { fromYear, toYear } = req.query;

    fromYear = parseInt(fromYear, 10);
    toYear   = parseInt(toYear, 10);

    // ✅ SAFE DEFAULTS
    if (isNaN(fromYear) || isNaN(toYear)) {
      const currentYear = new Date().getFullYear();
      fromYear = currentYear;
      toYear = currentYear;
    }

    const [rows] = await pool.query(
      `
      SELECT
        YEAR(apprehension_date) AS year,
        MONTH(apprehension_date) AS month,
        COUNT(*) AS total
      FROM apprehension_reports
      WHERE YEAR(apprehension_date) BETWEEN ? AND ?
      GROUP BY YEAR(apprehension_date), MONTH(apprehension_date)
      ORDER BY year, month
      `,
      [fromYear, toYear]
    );

    // summary counts
    const [[summary]] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(vessel_type = 'Motorized') AS motorized,
        SUM(vessel_type = 'Non-Motorized') AS nonMotorized
      FROM apprehension_reports
    `);

    res.json({
      total: summary.total,
      motorized: summary.motorized,
      nonMotorized: summary.nonMotorized,
      rows
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ message: 'Chart fetch failed' });
  }
};

exports.getYearRange = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        MIN(YEAR(apprehension_date)) AS minYear,
        MAX(YEAR(apprehension_date)) AS maxYear
      FROM apprehension_reports
      WHERE apprehension_date IS NOT NULL
    `);

    res.json({
      minYear: rows[0].minYear,
      maxYear: rows[0].maxYear
    });

  } catch (err) {
    console.error('Year range error:', err);
    res.status(500).json({ message: 'Failed to fetch year range' });
  }
};


exports.getAllReports = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.id,
        r.report_title,
        r.report_description,
        r.report_photo,
        r.created_at,
        CONCAT(b.first_name, ' ', b.last_name) AS reported_by
      FROM bantay_dagat_reports r
      JOIN bantay_dagat b ON b.id = r.bantay_dagat_id
      ORDER BY r.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load reports' });
  }
};

