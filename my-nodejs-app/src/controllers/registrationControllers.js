const { pool } = require('../controllers/applicantControllers'); // your DB pool
const path = require('path');

// Function to get registration fee based on tonnage
exports.getRegistrationFeeByTonnage = async (req, res) => {
  const tonnage = parseFloat(req.query.tonnage);

  if (isNaN(tonnage)) {
    return res.status(400).json({ success: false });
  }

  const [rows] = await pool.query(
    'SELECT fee FROM registration_fees WHERE ? BETWEEN min_tonnage AND max_tonnage LIMIT 1',
    [tonnage]
  );

  if (!rows.length) {
    return res.json({ success: false });
  }

  res.json({ success: true, fee: rows[0].fee });
};

// Controller for saving vessel registration
exports.registerVessel = async (req, res) => {
  try {
    const {
      applicantNo,
      vesselNo,
      registration_date,
      ownerName,
      ownerAddress,
      homePort,
      vesselName,
      vesselColor,
      vessel_type,
      length,
      breadth,
      depth,
      grossTonnage,
      netTonnage,
      engineMake,
      serialNumber,
      horsePower,
      cylinders,
      inspectionPlace,
      inspectionDate,
      admeasuremenOfficer,
      registrationFee
    } = req.body;

    // REQUIRED VALIDATION
    if (!applicantNo || !vesselNo || !vessel_type) {
      return res.status(400).json({
        message: 'Missing required vessel information'
      });
    }

    // HANDLE NON-MOTORIZED VESSELS (NO CONST REASSIGNMENT)
    const engineMakeVal =
      vessel_type === 'Non-Motorized' ? null : engineMake;
    const serialNumberVal =
      vessel_type === 'Non-Motorized' ? null : serialNumber;
    const horsePowerVal =
      vessel_type === 'Non-Motorized' ? null : horsePower;
    const cylindersVal =
      vessel_type === 'Non-Motorized' ? null : cylinders;

    // FILE PATHS
    const vesselPhotoPath = req.files?.vessel_photo
      ? `/vessel_photo/${req.files.vessel_photo[0].filename}`
      : null;

    const enginePhotoPath = req.files?.engine_photo
      ? `/engine_photo/${req.files.engine_photo[0].filename}`
      : null;

    // NUMBER CONVERSION
    const lengthVal = length ? parseFloat(length) : null;
    const breadthVal = breadth ? parseFloat(breadth) : null;
    const depthVal = depth ? parseFloat(depth) : null;
    const grossVal = grossTonnage ? parseFloat(grossTonnage) : null;
    const netVal = netTonnage ? parseFloat(netTonnage) : null;

    // REGISTRATION DATES
    const registeredAt = new Date();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // CHECK FOR EXISTING ACTIVE / PENDING VESSEL NAME
    const [existing] = await pool.query(
      `
      SELECT id 
      FROM fishing_vessels 
      WHERE vessel_name = ?
        AND status != 'REJECTED'
      LIMIT 1
      `,
      [vesselName]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: 'Vessel Name already exists and is active or pending'
      });
    }

    await pool.query(`
      INSERT INTO fishing_vessels (
        applicant_id,
        vessel_no,
        registration_date,
        owner_name,
        owner_address,
        home_port,
        vessel_name,
        vessel_color,
        vessel_photo,
        vessel_type,
        length,
        breadth,
        depth,
        gross_tonnage,
        net_tonnage,
        engine_make,
        engine_serial_number,
        engine_horse_power,
        engine_cylinders,
        inspection_place,
        inspection_date,
        admeasurement_officer,
        engine_photo,
        registration_fee,
        status,
        registered_at,
        expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
    `, [
      applicantNo,
      vesselNo,
      registration_date,
      ownerName,
      ownerAddress,
      homePort,
      vesselName,
      vesselColor,
      vesselPhotoPath,
      vessel_type,
      lengthVal,
      breadthVal,
      depthVal,
      grossVal,
      netVal,
      engineMakeVal,
      serialNumberVal,
      horsePowerVal,
      cylindersVal,
      inspectionPlace,
      inspectionDate,
      admeasuremenOfficer,
      enginePhotoPath,
      registrationFee,
      registeredAt,
      expiresAt
    ]);

    res.json({
      success: true,
      message: 'Vessel registered successfully. Status: Pending'
    });

  } catch (err) {
    console.error(err);

   if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'Duplicate vessel entry detected'
      });
    }

    res.status(500).json({
      message: 'Failed to register vessel'
    });
  }
};
// ==============================================
// ============== pending vessels ===============
// ==============================================
exports.getPendingVessels = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        vessel_no,
        vessel_name,
        owner_name,
        vessel_type,
        gross_tonnage,
        registration_fee
      FROM fishing_vessels
      WHERE status = 'PENDING'
      ORDER BY registered_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load pending vessels' });
  }
};
// =========================================
// ======== update vessel status ===========
// =========================================
exports.updateVesselStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    if (status === 'APPROVED') {

      // 1️⃣ Load vessel + applicant
      const [[vessel]] = await pool.query(`
        SELECT
          registration_fee,
          applicant_id
        FROM fishing_vessels
        WHERE id = ?
          AND status = 'PENDING'
      `, [id]);

      if (!vessel) {
        return res.status(409).json({
          message: 'This vessel has already been processed'
        });
      }

      // 2️⃣ Approve vessel
      await pool.query(`
        UPDATE fishing_vessels
        SET status = 'APPROVED',
            registered_at = CURDATE(),
            expires_at = DATE_ADD(CURDATE(), INTERVAL 1 YEAR)
        WHERE id = ?
      `, [id]);

      // 3️⃣ Create receipt ✅
      await pool.query(`
        INSERT INTO receipts (
          reference_no,
          transaction_type,
          related_id,
          amount,
          cashier_id,
          applicant_id
        )
        VALUES (?, 'VESSEL_REGISTRATION', ?, ?, ?, ?)
      `, [
        `VR-${Date.now()}`,
        id,
        vessel.registration_fee,
        req.session.userId,
        vessel.applicant_id
      ]);

      return res.json({
        success: true,
        message: 'Vessel approved and receipt created'
      });
    }

    // ❌ REJECTED → no receipt
    await pool.query(`
      UPDATE fishing_vessels
      SET status = ?
      WHERE id = ?
    `, [status, id]);

    res.json({ success: true, message: `Vessel ${status.toLowerCase()}` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
// ==============================================
// ============== pending gears =================
// ==============================================
exports.getPendingGears = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        gear_no,
        owner_name,
        owner_address,
        total_fee,
        application_date,
        registered_at
      FROM fishing_gears
      WHERE status = 'PENDING'
      ORDER BY registered_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error('Failed to load pending gears:', err);
    res.status(500).json({ message: 'Failed to load pending gears' });
  }
};
// ==============================================
// ========== update gear status =================
// ==============================================
exports.updateGearStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    let query;
    let params;
    if (status === 'APPROVED') {

      // 1️⃣ Get gear + applicant info
      const [[gear]] = await pool.query(`
        SELECT
          g.total_fee,
          g.applicant_id
        FROM fishing_gears g
        WHERE g.id = ?
          AND g.status = 'PENDING'
      `, [id]);

      if (!gear) {
        return res.status(409).json({
          message: 'This gear has already been processed'
        });
      }

      // 2️⃣ Approve gear
      await pool.query(`
        UPDATE fishing_gears
        SET status = 'APPROVED',
            registered_at = CURDATE(),
            expires_at = DATE_ADD(CURDATE(), INTERVAL 1 YEAR)
        WHERE id = ?
      `, [id]);

      // 3️⃣ Create receipt ✅ (THIS IS THE MISSING PART)
      await pool.query(`
        INSERT INTO receipts (
          reference_no,
          transaction_type,
          related_id,
          amount,
          cashier_id,
          applicant_id
        )
        VALUES (?, 'GEAR_REGISTRATION', ?, ?, ?, ?)
      `, [
        `GR-${Date.now()}`,
        id,
        gear.total_fee,
        req.session.userId,
        gear.applicant_id
      ]);

      return res.json({
        success: true,
        message: 'Gear approved and receipt created'
      });
    } else {
      query = `
        UPDATE fishing_gears
        SET status = ?
        WHERE id = ?
      `;
      params = [status, id];
    }

    await pool.query(query, params);

    res.json({ success: true, message: `Gear ${status.toLowerCase()}` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
// ==============================================
// ========== get apprehended fisherfolk ========
// ==============================================
exports.getApprehendedFisherfolks = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        ar.id,
        ar.violator_no,
        ar.full_name,
        ar.apprehension_date,
        ar.vessel_type,
        ar.violation_type,
        ar.penalty_details,
        (
          (COALESCE(arg.hand_instruments, '') != '') +
          (COALESCE(arg.fishing_lines, '') != '') +
          (COALESCE(arg.palubog_nets, '') != '') +
          (COALESCE(arg.fishing_nets, '') != '') +
          (COALESCE(arg.traps, '') != '') +
          (COALESCE(arg.accessories, '') != '')
        ) AS gear_count
      FROM apprehension_reports ar
      LEFT JOIN apprehension_reports_gears arg
        ON ar.id = arg.apprehension_id
      WHERE ar.status = 'APPREHENDED'
      ORDER BY ar.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Failed to load apprehended fisherfolks'
    });
  }
};
// ===================================================
// APPROVE / RELEASE APPREHENSION
// ===================================================
exports.approveApprehension = async (req, res) => {
  const apprehensionId = req.params.id;
  const cashierId = req.session.userId;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1️⃣ Load apprehension + applicant_id
    const [[app]] = await conn.query(`
      SELECT
        ar.id,
        ar.status,
        fv.applicant_id
      FROM apprehension_reports ar
      LEFT JOIN apprehension_reports_vessels arv
        ON ar.id = arv.apprehension_id
      LEFT JOIN fishing_vessels fv
        ON arv.vessel_id = fv.id
      WHERE ar.id = ?
      FOR UPDATE
    `, [apprehensionId]);

    if (!app || app.status !== 'APPREHENDED') {
      await conn.rollback();
      return res.status(409).json({
        message: 'Apprehension already processed'
      });
    }

    // 2️⃣ Update apprehension status
    await conn.query(`
      UPDATE apprehension_reports
      SET status = 'RELEASED'
      WHERE id = ?
    `, [apprehensionId]);

    // 3️⃣ Release vessels
    await conn.query(`
      UPDATE fishing_vessels fv
      JOIN apprehension_reports_vessels arv
        ON fv.id = arv.vessel_id
      SET fv.apprehension_status = 'Released'
      WHERE arv.apprehension_id = ?
    `, [apprehensionId]);

    // 4️⃣ Release gears
    await conn.query(`
      UPDATE fishing_gears fg
      JOIN apprehension_reports_gears arg
        ON fg.id = arg.gear_id
      SET fg.apprehension_status = 'Released'
      WHERE arg.apprehension_id = ?
    `, [apprehensionId]);

    // 5️⃣ Create receipt ✅ (FIXED)
    await conn.query(`
      INSERT INTO receipts (
        reference_no,
        transaction_type,
        related_id,
        amount,
        cashier_id,
        applicant_id
      )
      VALUES (?, 'APPREHENSION_RELEASE', ?, 0, ?, ?)
    `, [
      `AR-${Date.now()}`,
      apprehensionId,
      cashierId,
      app.applicant_id
    ]);

    await conn.commit();

    res.json({
      success: true,
      message: 'Apprehension released successfully'
    });

  } catch (err) {
    await conn.rollback();
    console.error('Approve apprehension error:', err);
    res.status(500).json({
      message: 'Failed to approve apprehension'
    });
  } finally {
    conn.release();
  }
};

// ===================================================
// REJECT APPREHENSION
// ===================================================
exports.rejectApprehension = async (req, res) => {
  const apprehensionId = req.params.id;

  try {
    const [result] = await pool.query(`
      UPDATE apprehension_reports
      SET status = 'REJECTED'
      WHERE id = ?
        AND status = 'APPREHENDED'
    `, [apprehensionId]);

    if (result.affectedRows === 0) {
      return res.status(409).json({
        message: 'Apprehension already processed'
      });
    }

    res.json({
      success: true,
      message: 'Apprehension rejected'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Failed to reject apprehension'
    });
  }
};

// =====================================
// ===    auto generate vessel no. ==== 
// =====================================
exports.getNextVesselSequence = async (req, res) => {
  try {
    const applicantId = req.params.applicantId;
    const year = new Date().getFullYear();

    const [rows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM fishing_vessels
      WHERE applicant_id = ?
        AND YEAR(registered_at) = ?
      `,
      [applicantId, year]
    );

    const nextSeq = rows[0].total + 1;

    res.json({ nextSeq });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to get vessel sequence' });
  }
};

exports.countVesselsByApplicant = async (req, res) => {
  const { applicantId } = req.params;

  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM fishing_vessels WHERE applicant_id = ?',
    [applicantId]
  );

  res.json({ count: rows[0].count });
};

exports.getRegistrationFee = async function(tonnage) {
    try {
        const [rows] = await pool.query(
            'SELECT fee FROM registration_fees WHERE ? BETWEEN min_tonnage AND max_tonnage LIMIT 1',
            [tonnage]
        );
        if (rows.length > 0) return rows[0].fee;
        return null;
    } catch (err) {
        console.error('Error fetching registration fee:', err);
        return null;
    }
};

// Register fishing gear
exports.registerFishingGear = async (req, res) => {
  try {
    const {
      applicant_id,
      gear_no,
      ownerName,
      ownerAddress,
      handInstruments,
      line_type,
      nets,
      palubog_nets,
      accessories,
      boboSmallQty,
      boboLargeQty,
      tambuanQty,
      registrationFee,
      application_date
    } = req.body;
    // ✅ REQUIRED VALIDATION
    if (!applicant_id || !gear_no) {
      return res.status(400).json({
        success: false,
        message: 'Missing applicant or gear number'
      });
    }

    if (!registrationFee || parseFloat(registrationFee) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing gear registration fee'
      });
    }


    // ✅ REGISTRATION & EXPIRY
    const registeredAt = new Date();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // ✅ INSERT INTO DB
    await pool.query(
      `INSERT INTO fishing_gears (
        applicant_id,
        gear_no,
        owner_name,
        owner_address,
        hand_instruments,
        line_type,
        nets,
        palubog_nets,
        accessories,
        bobo_small_qty,
        bobo_large_qty,
        tambuan_qty,
        total_fee,
        application_date,
        status,
        registered_at,
        expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      [
        applicant_id,
        gear_no,
        ownerName,
        ownerAddress,
        handInstruments || null,
        line_type || null,
        nets || null,
        palubog_nets || null,
        accessories || null,
        Number(boboSmallQty) || 0,
        Number(boboLargeQty) || 0,
        Number(tambuanQty) || 0,
        parseFloat(registrationFee),
        application_date || new Date(),
        registeredAt,
        expiresAt
      ]
    );

    res.json({
      success: true,
      message: 'Fishing gear registered successfully. Status: Pending'
    });

  } catch (err) {
    console.error('Error registering fishing gear:', err);

    // ✅ DUPLICATE GEAR NUMBER HANDLING
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Gear number already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while registering fishing gear'
    });
  }
};
// ============================================
// Count fishing gears by applicant
// ============================================
exports.countGearsByApplicant = async (req, res) => {
  try {
    const { applicantId } = req.params;

    const [rows] = await pool.query(
      `SELECT COUNT(*) AS count FROM fishing_gears WHERE applicant_id = ?`,
      [applicantId]
    );

    res.json({ count: rows[0].count });
  } catch (err) {
    console.error('Error counting gears:', err);
    res.status(500).json({ message: 'Failed to count gears' });
  }
};

// ===============================
// REGISTRATION DASHBOARD DATA
// ===============================
exports.getRegistrationDashboard = async (req, res) => {
  try {
    let { fromYear, toYear } = req.query;

    fromYear = parseInt(fromYear, 10);
    toYear   = parseInt(toYear, 10);

    // Fallback to DB years if not provided
    if (isNaN(fromYear) || isNaN(toYear)) {
      const [[range]] = await pool.query(`
        SELECT
          MIN(YEAR(registration_date)) AS minYear,
          MAX(YEAR(registration_date)) AS maxYear
        FROM fishing_vessels
      `);

      fromYear = range.minYear;
      toYear   = range.maxYear;
    }

    if (fromYear > toYear) [fromYear, toYear] = [toYear, fromYear];

    // ---- Counts ----
    const [[counts]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM fishing_vessels WHERE status = 'APPROVED') AS vessels,
      (SELECT COUNT(*) FROM fishing_gears   WHERE status = 'APPROVED') AS gears
    `);
    // ---- pending --------
    const [[pending]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM fishing_vessels WHERE status = 'PENDING') AS pending_vessels,
        (SELECT COUNT(*) FROM fishing_gears   WHERE status = 'PENDING') AS pending_gears
    `);


    // ---- Monthly registrations (stacked per year) ----
    const [rows] = await pool.query(`
      SELECT
        YEAR(registered_at) AS year,
        MONTH(registered_at) AS month,
        COUNT(*) AS total
      FROM fishing_vessels
      WHERE YEAR(registered_at) BETWEEN ? AND ?
      GROUP BY YEAR(registered_at), MONTH(registered_at)
      ORDER BY year, month
    `, [fromYear, toYear]);

    res.json({
      vessels: counts.vessels,
      gears: counts.gears,
      pendingVessels: pending.pending_vessels,
      pendingGears: pending.pending_gears,
      rows
    });

  } catch (err) {
    console.error('Registration dashboard error:', err);
    res.status(500).json({ message: 'Registration dashboard fetch failed' });
  }
};
exports.getRegistrationYearRange = async (req, res) => {
  const [[row]] = await pool.query(`
    SELECT
      MIN(YEAR(registered_at)) AS minYear,
      MAX(YEAR(registered_at)) AS maxYear
    FROM fishing_vessels
  `);

  res.json(row);
};

exports.getAllVessels = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        applicant_no,

        MAX(owner_name)        AS owner_name,
        MAX(owner_address)     AS owner_address,

        MAX(vessel_name)       AS vessel_name,
        MAX(vessel_color)      AS vessel_color,
        MAX(vessel_type)       AS vessel_type,
        MAX(length)            AS length,
        MAX(breadth)           AS breadth,
        MAX(depth)             AS depth,
        MAX(gross_tonnage)     AS gross_tonnage,
        MAX(net_tonnage)       AS net_tonnage,

        MAX(engine_make)       AS engine_make,
        MAX(engine_serial_number) AS engine_serial_number,
        MAX(engine_horse_power)   AS engine_horse_power,
        MAX(engine_cylinders)     AS engine_cylinders,
        MAX(inspection_place) AS inspection_place,
        MAX(inspection_date)  AS inspection_date,

        MAX(vessel_photo)     AS vessel_photo,
        MAX(engine_photo)     AS engine_photo,
        MAX(registration_fee) AS registration_fee,

        MAX(hand_instruments) AS hand_instruments,
        MAX(line_type)        AS line_type,
        MAX(nets)             AS nets,
        MAX(palubog_nets)     AS palubog_nets,
        MAX(accessories)      AS accessories,

        SUM(IFNULL(bobo_small_qty, 0)) AS bobo_small_qty,
        SUM(IFNULL(bobo_large_qty, 0)) AS bobo_large_qty,
        SUM(IFNULL(tambuan_qty, 0))    AS tambuan_qty,

        MAX(registration_date) AS registration_date

      FROM (
        /* ================= VESSELS ================= */
        SELECT
          applicant_no,
          owner_name,
          owner_address,

          vessel_name,
          vessel_color,
          vessel_type,
          length,
          breadth,
          depth,
          gross_tonnage,
          net_tonnage,

          engine_make,
          engine_serial_number,
          engine_horse_power,
          engine_cylinders,
          inspection_place,
          inspection_date,

          vessel_photo,
          engine_photo,
          registration_fee,

          NULL AS hand_instruments,
          NULL AS line_type,
          NULL AS nets,
          NULL AS palubog_nets,
          NULL AS accessories,

          0 AS bobo_small_qty,
          0 AS bobo_large_qty,
          0 AS tambuan_qty,

          registration_date
        FROM fishing_vessels

        UNION ALL

        /* ================= GEARS ================= */
        SELECT
          applicant_no,
          owner_name,
          owner_address,

          NULL AS vessel_name,
          NULL AS vessel_color,
          NULL AS vessel_type,
          NULL AS length,
          NULL AS breadth,
          NULL AS depth,
          NULL AS gross_tonnage,
          NULL AS net_tonnage,

          NULL AS engine_make,
          NULL AS engine_serial_number,
          NULL AS engine_horse_power,
          NULL AS engine_cylinders,
          NULL AS inspection_place,
          NULL AS inspection_date,

          NULL AS vessel_photo,
          NULL AS engine_photo,
          total_fee AS registration_fee,

          hand_instruments,
          line_type,
          nets,
          palubog_nets,
          accessories,

          bobo_small_qty,
          bobo_large_qty,
          tambuan_qty,

          registration_date
        FROM fishing_gears
      ) x

      GROUP BY applicant_no
      ORDER BY registration_date DESC
    `);

    res.json(rows);

  } catch (err) {
    console.error('Error fetching merged registrations:', err);
    res.status(500).json({
      message: 'Failed to fetch merged registrations',
      error: err.message
    });
  }
};

exports.getGearDashboard = async (req, res) => {
  try {
    let { fromYear, toYear } = req.query;

    fromYear = parseInt(fromYear, 10);
    toYear   = parseInt(toYear, 10);

    // 📅 fallback to DB year range
    if (isNaN(fromYear) || isNaN(toYear)) {
      const [[range]] = await pool.query(`
        SELECT
          MIN(YEAR(registration_date)) AS minYear,
          MAX(YEAR(registration_date)) AS maxYear
        FROM fishing_gears
      `);

      fromYear = range.minYear;
      toYear   = range.maxYear;
    }

    if (fromYear > toYear) [fromYear, toYear] = [toYear, fromYear];

    const [[counts]] = await pool.query(`
      SELECT
        SUM(CASE WHEN hand_instruments IS NOT NULL THEN 1 ELSE 0 END) AS hand_instruments,
        SUM(CASE WHEN line_type IS NOT NULL THEN 1 ELSE 0 END)        AS line_type,
        SUM(CASE WHEN nets IS NOT NULL THEN 1 ELSE 0 END)             AS nets,
        SUM(CASE WHEN palubog_nets IS NOT NULL THEN 1 ELSE 0 END)     AS palubog_nets,
        SUM(CASE WHEN accessories IS NOT NULL THEN 1 ELSE 0 END)     AS accessories,

        SUM(IFNULL(bobo_small_qty, 0))   AS bobo_small,
        SUM(IFNULL(bobo_large_qty, 0))   AS bobo_large,
        SUM(IFNULL(tambuan_qty, 0))      AS tambuan
        FROM fishing_gears
        WHERE status = 'APPROVED'
        AND YEAR(registered_at) BETWEEN ? AND ?
    `, [fromYear, toYear]);


    const rows = [
      { gear_name: 'Line Type',        total: counts.line_type },
      { gear_name: 'Nets',             total: counts.nets },
      { gear_name: 'Palubog Nets',     total: counts.palubog_nets },
      { gear_name: 'Accessories',      total: counts.accessories },
      { gear_name: 'Bobo (Small)',     total: counts.bobo_small },
      { gear_name: 'Bobo (Large)',     total: counts.bobo_large },
      { gear_name: 'Tambuan',          total: counts.tambuan },
      { gear_name: 'Hand Instruments', total: counts.hand_instruments }
    ];

    res.json(rows);

  } catch (err) {
    console.error('Gear dashboard error:', err);
    res.status(500).json({ message: 'Failed to load gear dashboard' });
  }
};

// ===============================
// GET USER REGISTRATIONS (PROFILE)
// ===============================
exports.getUserRegistrations = async (req, res) => {
  if (!req.session.applicantLoggedIn) {
    return res.status(401).json({ success: false });
  }

  const applicantNo = req.session.applicantId;

  try {
    // Registered vessels
    const [vessels] = await pool.query(
      `SELECT vessel_name, vessel_type, registration_date
       FROM fishing_vessels
       WHERE applicant_id = ?
       AND status = 'APPROVED'
       AND apprehension_status != 'Apprehended'
       `,
      [applicantNo]
    );

    // Registered fishing gears
    const [gears] = await pool.query(
      `SELECT
        hand_instruments,
        line_type,
        nets,
        palubog_nets,
        accessories,
        bobo_small_qty,
        bobo_large_qty,
        tambuan_qty
       FROM fishing_gears
       WHERE applicant_id = ?
       AND status = 'APPROVED'
       `,
      [applicantNo]
    );

    res.json({
      success: true,
      vessels,
      gears
    });

  } catch (err) {
    console.error('User registration fetch error:', err);
    res.status(500).json({ success: false });
  }
};
// =========================================
// COUNT REGISTERED & RENEWABLE VESSELS (USER PROFILE)
// =========================================
exports.getVesselStatusCounts = async (req, res) => {
  try {
    const applicantId = req.session.applicantId;

    if (!applicantId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [[row]] = await pool.query(`
      SELECT
        COUNT(*) AS total_registered,
        SUM(
          CASE
            WHEN DATEDIFF(expires_at, CURDATE()) BETWEEN 0 AND 90
            THEN 1 ELSE 0
          END
        ) AS open_for_renewal
      FROM fishing_vessels
      WHERE applicant_id = ?
        AND status = 'APPROVED'
        AND apprehension_status != 'Apprehended'
    `, [applicantId]);

    const [[released]] = await pool.query(`
      SELECT COUNT(*) AS released_count
        FROM apprehension_reports ar
        LEFT JOIN apprehension_reports_vessels arv
          ON ar.id = arv.apprehension_id
        LEFT JOIN fishing_vessels fv
          ON arv.vessel_id = fv.id
        WHERE fv.applicant_id = ?
          AND ar.status = 'RELEASED'
    `, [applicantId]);

    res.json({
      totalRegistered: row.total_registered,
      openForRenewal: row.open_for_renewal,
      releasedApprehensions: released.released_count
    });


  } catch (err) {
    console.error('Vessel status count error:', err);
    res.status(500).json({ message: 'Failed to load vessel counts' });
  }
};

exports.getVesselFees = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, min_tonnage, max_tonnage, fee
      FROM registration_fees
      ORDER BY min_tonnage ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Vessel fees error:', err);
    res.status(500).json({ message: 'Failed to load vessel fees' });
  }
};
exports.getGearFees = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id,
        category,
        gear_name,
        gear_code,
        min_units,
        max_units,
        fee,
        fee_type
      FROM fishing_gear_fees
      ORDER BY id ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error('Error loading gear fees:', err);
    res.status(500).json({ message: 'Failed to load gear fees' });
  }
};
exports.getVesselFeeById = async (req, res) => {
  try {
    console.log('Fetching vessel fee ID:', req.params.id);

    const { id } = req.params;

    const [rows] = await pool.query(
      'SELECT * FROM registration_fees WHERE id = ?',
      [id]
    );

    console.log('Query result:', rows);

    if (!rows.length) {
      return res.status(404).json({ message: 'Vessel fee not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('getVesselFeeById ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateVesselFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { min, max, fee } = req.body;

    await pool.query(
      `UPDATE registration_fees
       SET min_tonnage = ?, max_tonnage = ?, fee = ?
       WHERE id = ?`,
      [min, max, fee, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.getGearFeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM fishing_gear_fees WHERE id = ?',
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Gear fee not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.updateGearFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { min, max, fee } = req.body;

    await pool.query(
      `UPDATE fishing_gear_fees
       SET min_units = ?, max_units = ?, fee = ?
       WHERE id = ?`,
      [min, max, fee, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================================================
// ======= get appoved registered vessel ============
// ==================================================
exports.getRegisteredVessels = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        v.id,
        v.vessel_no,
        v.vessel_name,
        v.vessel_type,
        v.gross_tonnage,
        v.registration_fee,
        v.registered_at,
        v.expires_at,


        DATEDIFF(v.expires_at, CURDATE()) AS days_to_expiry,

        CASE
          WHEN DATEDIFF(v.expires_at, CURDATE()) BETWEEN 0 AND 90
          THEN 1 ELSE 0
        END AS can_renew,

        CASE
          WHEN EXISTS (
            SELECT 1
            FROM vessel_renewals vr
            WHERE vr.vessel_id = v.id
              AND vr.status = 'PENDING'
          )
          THEN 1 ELSE 0
        END AS has_pending_renewal,

        a.first_name,
        a.last_name,
        a.middle_name,
        a.extra_name

      FROM fishing_vessels v
      JOIN applicants a ON a.id = v.applicant_id
      WHERE v.status = 'APPROVED'
      ORDER BY v.registered_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error('Error fetching registered vessels:', err);
    res.status(500).json([]);
  }
};


// ==================================================
// ======= get appoved registered gears ============
// ==================================================
exports.getRegisteredGears = async (req, res) => {
  try {
    const [rows] = await pool.query(`
    SELECT
      g.id,
      g.gear_no,
      g.owner_name,
      g.application_date,
      g.total_fee,
      g.registered_at,
      g.expires_at,
      g.apprehension_status,

      DATEDIFF(g.expires_at, CURDATE()) AS days_to_expiry,

      CASE
        WHEN g.apprehension_status = 'Apprehended'
        THEN 0
        WHEN DATEDIFF(g.expires_at, CURDATE()) <= 90
        THEN 1
        ELSE 0
      END AS can_renew,

      CASE
        WHEN EXISTS (
          SELECT 1 FROM gear_renewals gr
          WHERE gr.gear_id = g.id
            AND gr.status = 'PENDING'
        )
        THEN 1 ELSE 0
      END AS has_pending_renewal

    FROM fishing_gears g
    WHERE g.status = 'APPROVED'
    ORDER BY g.registered_at DESC
    `);

    res.json(rows);

  } catch (err) {
    console.error('Registered gears error:', err);
    res.status(500).json([]);
  }
};

// =========================================
// Get single registered vessel (FULL INFO)
// =========================================
exports.getRegisteredVesselById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(`
      SELECT
        v.*,
        a.first_name,
        a.last_name,
        a.middle_name,
        a.extra_name,
        DATEDIFF(v.expires_at, CURDATE()) AS days_to_expiry,

        CASE
          WHEN DATEDIFF(v.expires_at, CURDATE()) <= 90
          THEN 1 ELSE 0
        END AS can_renew,

        CASE
          WHEN EXISTS (
            SELECT 1
            FROM vessel_renewals vr
            WHERE vr.vessel_id = v.id
              AND vr.status = 'PENDING'
          )
          THEN 1 ELSE 0
        END AS has_pending_renewal,

        EXISTS (
          SELECT 1
          FROM vessel_modifications vm
          WHERE vm.vessel_id = v.id
            AND vm.status = 'PENDING'
        ) AS has_pending_modification

      FROM fishing_vessels v
      JOIN applicants a ON a.id = v.applicant_id
      WHERE v.id = ? AND v.status = 'APPROVED'
      LIMIT 1

    `, [id]);

    if (!rows.length) {
      return res.status(404).json({ message: 'Vessel not found' });
    }

    res.json(rows[0]);

  } catch (err) {
    console.error('Get vessel by ID error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
// =========================================
// Get single registered gear (WITH ITEMS)
// =========================================
exports.getRegisteredGearById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(`
      SELECT
        id,
        gear_no,
        owner_name,
        owner_address,
        application_date,
        registered_at,
        expires_at,
        total_fee,

        apprehension_status,   -- ✅ ADD THIS

        hand_instruments,
        line_type,
        nets,
        palubog_nets,
        accessories,

        bobo_small_qty,
        bobo_large_qty,
        tambuan_qty

      FROM fishing_gears
      WHERE id = ? AND status = 'APPROVED'
      LIMIT 1
    `, [id]);

    if (!rows.length) {
      return res.status(404).json({ message: 'Gear not found' });
    }

    res.json(rows[0]);

  } catch (err) {
    console.error('Get registered gear by ID error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// =========================================
// vessel modifications
// =========================================
exports.submitVesselModification = async (req, res) => {
  try {
    const vesselId = req.params.id; // ✅ MUST COME FIRST

    // 🔒 BLOCK DUPLICATE PENDING REQUESTS
    const [existing] = await pool.query(
      `
      SELECT id
      FROM vessel_modifications
      WHERE vessel_id = ?
        AND status = 'PENDING'
      LIMIT 1
      `,
      [vesselId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: 'This vessel already has a pending modification request.'
      });
    }

    const {
      new_length,
      new_breadth,
      new_depth,
      new_gross_tonnage,
      new_net_tonnage,
      new_vessel_type,
      new_engine_make,
      new_engine_serial_number,
      new_engine_horse_power,
      new_engine_cylinders,
      reason,
      modification_fee
    } = req.body;

    const vesselPhoto = req.files?.vessel_photo
      ? `/vessel_photo/${req.files.vessel_photo[0].filename}`
      : null;

    const enginePhoto = req.files?.engine_photo
      ? `/engine_photo/${req.files.engine_photo[0].filename}`
      : null;

    // ✅ VALIDATE CHANGES
    const hasChanges =
      [
        new_length, new_breadth, new_depth,
        new_gross_tonnage, new_net_tonnage,
        new_vessel_type,
        new_engine_make, new_engine_serial_number,
        new_engine_horse_power, new_engine_cylinders
      ].some(v => v !== undefined && v !== null && v !== '') ||
      vesselPhoto || enginePhoto;

    if (!hasChanges) {
      return res.status(400).json({
        message: 'No changes detected'
      });
      
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        message: 'Please provide a detailed reason for modification'
      });
    }

    await pool.query(`
      INSERT INTO vessel_modifications (
        vessel_id,
        new_length,
        new_breadth,
        new_depth,
        new_gross_tonnage,
        new_net_tonnage,
        new_vessel_type,
        new_engine_make,
        new_engine_serial_number,
        new_engine_horse_power,
        new_engine_cylinders,
        new_vessel_photo,
        new_engine_photo,
        reason,
        modification_fee,
        status,
        requested_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW())
    `, [
      vesselId,
      new_length || null,
      new_breadth || null,
      new_depth || null,
      new_gross_tonnage || null,
      new_net_tonnage || null,
      new_vessel_type || null,
      new_engine_make || null,
      new_engine_serial_number || null,
      new_engine_horse_power || null,
      new_engine_cylinders || null,
      vesselPhoto || null,
      enginePhoto || null,
      reason,
      modification_fee
    ]);

    res.json({ success: true });

  } catch (err) {
    console.error('Submit vessel modification error:', err);
    res.status(500).json({ message: 'Failed to submit modification' });
  }
};
// ==========================================
//  vessel renewal
// ==========================================
exports.submitVesselRenewal = async (req, res) => {
  try {
    const vesselId = req.params.id;

    const [[vessel]] = await pool.query(
      `SELECT expires_at, registration_fee FROM fishing_vessels WHERE id = ?`,
      [vesselId]
    );

    if (!vessel) {
      return res.status(404).json({ message: 'Vessel not found' });
    }

    const today = new Date();
    const expiryDate = new Date(vessel.expires_at);

    // 🔹 Calculate days difference
    const diffMs = today - expiryDate;
    const daysExpired = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // 🔹 Convert to months (minimum 1 month if expired)
    const monthsExpired = daysExpired > 0
      ? Math.ceil(daysExpired / 30)
      : 0;

    const penaltyPerMonth = 30;
    const penaltyFee = monthsExpired * penaltyPerMonth;

    const baseFee = Number(vessel.registration_fee);
    const totalFee = baseFee + penaltyFee;

    // 🔒 Prevent duplicate pending renewals
    const [pending] = await pool.query(
      `SELECT id FROM vessel_renewals 
       WHERE vessel_id = ? AND status = 'PENDING'`,
      [vesselId]
    );

    if (pending.length > 0) {
      return res.status(409).json({
        message: 'This vessel already has a pending renewal request'
      });
    }

    // 🔹 New expiry = +1 year from OLD expiry
    const newExpiry = new Date(expiryDate);
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);

    await pool.query(`
      INSERT INTO vessel_renewals (
        vessel_id,
        old_expiry,
        new_expiry,
        base_fee,
        penalty_fee,
        total_fee,
        status,
        requested_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING', NOW())
    `, [
      vesselId,
      expiryDate,
      newExpiry,
      baseFee,
      penaltyFee,
      totalFee
    ]);

    res.json({
      success: true,
      baseFee,
      monthsExpired,
      penaltyFee,
      totalFee
    });

  } catch (err) {
    console.error('Renewal error:', err);
    res.status(500).json({ message: 'Failed to submit renewal' });
  }
};
// ==========================================
//  gear renewal
// ==========================================
exports.submitGearRenewal = async (req, res) => {
  const {
    gear_id,
    gear_no,
    hand_instruments,
    line_type,
    nets,
    palubog_nets,
    bobo_small_qty,
    bobo_large_qty,
    tambuan_qty,
    accessories,
    old_total_fee,
    new_total_fee,
    old_expires_at,
    new_expires_at
  } = req.body;

  try {
    // prevent duplicate pending renewals
    const [pending] = await pool.query(
      `SELECT id FROM gear_renewals
       WHERE gear_id = ? AND status = 'PENDING'`,
      [gear_id]
    );

    if (pending.length > 0) {
      return res.status(400).json({
        message: 'This gear already has a pending renewal'
      });
    }

    const today = new Date();
  const expiry = new Date(g.expires_at);

  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  // ❌ Block early renewal
  if (diffDays > 90) {
    return res.status(400).json({
      message: 'Renewal is only allowed within 90 days before expiry'
    });
  }

  // ❌ BLOCK renewal if gear is apprehended
const [[gear]] = await pool.query(`
  SELECT apprehension_status
  FROM fishing_gears
  WHERE id = ?
`, [gear_id]);

if (!gear) {
  return res.status(404).json({ message: 'Gear not found' });
}

if (gear.apprehension_status === 'Apprehended') {
  return res.status(403).json({
    message: 'Renewal not allowed while gear is under apprehension'
  });
}


    await pool.query(`
      INSERT INTO gear_renewals (
        gear_id,
        gear_no,
        hand_instruments,
        line_type,
        nets,
        palubog_nets,
        bobo_small_qty,
        bobo_large_qty,
        tambuan_qty,
        accessories,
        old_total_fee,
        new_total_fee,
        old_expires_at,
        new_expires_at,
        status,
        requested_at
      ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW())
    `, [
      gear_id,
      gear_no,
      hand_instruments,
      line_type,
      nets,
      palubog_nets,
      bobo_small_qty,
      bobo_large_qty,
      tambuan_qty,
      accessories,
      old_total_fee,
      new_total_fee,
      old_expires_at,
      new_expires_at
    ]);

    res.json({ success: true });

  } catch (err) {
    console.error('submitGearRenewal error:', err);
    res.status(500).json({
      message: 'Failed to submit gear renewal'
    });
  }
};
// =======================================
//  (cashier) pending vessel approval
// =======================================
exports.getPendingRenewals = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      /* ========== VESSEL RENEWALS ========== */
      SELECT
        vr.id,
        'VESSEL' AS type,
        fv.vessel_no,
        NULL AS gear_no,
        CONCAT(a.first_name, ' ', a.last_name) AS owner_name,
        vr.base_fee,
        vr.penalty_fee,
        vr.total_fee,
        vr.requested_at
      FROM vessel_renewals vr
      JOIN fishing_vessels fv ON vr.vessel_id = fv.id
      JOIN applicants a ON fv.applicant_id = a.id
      WHERE vr.status = 'PENDING'

      UNION ALL

      /* ========== GEAR RENEWALS ========== */
      SELECT
        gr.id,
        'GEAR' AS type,
        NULL AS vessel_no,
        gr.gear_no,
        fg.owner_name,
        gr.old_total_fee AS base_fee,
        0 AS penalty_fee,
        gr.new_total_fee AS total_fee,
        gr.requested_at
      FROM gear_renewals gr
      JOIN fishing_gears fg ON gr.gear_id = fg.id
      WHERE gr.status = 'PENDING'

      ORDER BY requested_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load renewals' });
  }
};
// ==================================
// (cashier) approve vessel renewal
// =================================
exports.approveVesselRenewal = async (req, res) => {
  const renewalId = req.params.id;
  const cashierId = req.session.userId;

  try {
    const [[renewal]] = await pool.query(`
      SELECT
        vr.total_fee,
        fv.applicant_id
      FROM vessel_renewals vr
      JOIN fishing_vessels fv ON vr.vessel_id = fv.id
      WHERE vr.id = ?
        AND vr.status = 'PENDING'
    `, [renewalId]);

    if (!renewal) {
      return res.status(409).json({
        message: 'This renewal has already been processed or does not exist'
      });
    }

    // 1️⃣ Approve renewal
    await pool.query(`
      UPDATE vessel_renewals
      SET status = 'APPROVED',
          approved_by = ?,
          approved_at = NOW()
      WHERE id = ?
    `, [cashierId, renewalId]);
  // 2️⃣ Update vessel expiry & status
  await pool.query(`
    UPDATE fishing_vessels fv
    JOIN vessel_renewals vr ON fv.id = vr.vessel_id
    SET
      fv.expires_at = vr.new_expiry,
      fv.status = 'APPROVED'
    WHERE vr.id = ?
  `, [renewalId]);

    // 2️⃣ Create receipt
    await pool.query(`
      INSERT INTO receipts (
        reference_no,
        transaction_type,
        related_id,
        amount,
        cashier_id,
        applicant_id
      )
      VALUES (?, 'VESSEL_RENEWAL', ?, ?, ?, ?)
    `, [
      `VR-${Date.now()}`,
      renewalId,
      renewal.total_fee,
      cashierId,
      renewal.applicant_id
    ]);

    res.json({ success: true });

  } catch (err) {
    console.error('Approve renewal error:', err);
    res.status(500).json({ message: 'Approval failed' });
  }
};
exports.rejectVesselRenewal = async (req, res) => {
  const renewalId = req.params.id;
  const cashierId = req.session.userId;

  try {
    const [result] = await pool.query(`
      UPDATE vessel_renewals
      SET status = 'REJECTED',
          approved_by = ?,
          approved_at = NOW()
      WHERE id = ?
        AND status = 'PENDING'
    `, [cashierId, renewalId]);

    if (result.affectedRows === 0) {
      return res.status(409).json({
        message: 'This renewal was already processed'
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Reject vessel renewal error:', err);
    res.status(500).json({ message: 'Failed to reject renewal' });
  }
};
exports.approveGearRenewal = async (req, res) => {
  const renewalId = req.params.id;
  const cashierId = req.session.userId;

  try {
    const [[renewal]] = await pool.query(`
      SELECT
        gr.gear_id,
        gr.new_total_fee,
        gr.new_expires_at,
        fg.applicant_id
      FROM gear_renewals gr
      JOIN fishing_gears fg ON gr.gear_id = fg.id
      WHERE gr.id = ?
        AND gr.status = 'PENDING'
    `, [renewalId]);

    if (!renewal) {
      return res.status(409).json({
        message: 'This renewal has already been processed or does not exist'
      });
    }

    // 1️⃣ Approve renewal
    await pool.query(`
      UPDATE gear_renewals
      SET status = 'APPROVED',
          approved_by = ?,
          approved_at = NOW()
      WHERE id = ?
    `, [cashierId, renewalId]);

    // 2️⃣ Apply changes to fishing_gears
    await pool.query(`
      UPDATE fishing_gears fg
      JOIN gear_renewals gr ON fg.id = gr.gear_id
      SET
        fg.hand_instruments = gr.hand_instruments,
        fg.line_type = gr.line_type,
        fg.nets = gr.nets,
        fg.palubog_nets = gr.palubog_nets,
        fg.bobo_small_qty = gr.bobo_small_qty,
        fg.bobo_large_qty = gr.bobo_large_qty,
        fg.tambuan_qty = gr.tambuan_qty,
        fg.accessories = gr.accessories,
        fg.total_fee = gr.new_total_fee,
        fg.expires_at = gr.new_expires_at,
        fg.status = 'APPROVED'
      WHERE gr.id = ?
    `, [renewalId]);


    // 3️⃣ Create receipt
    await pool.query(`
      INSERT INTO receipts (
        reference_no,
        transaction_type,
        related_id,
        amount,
        cashier_id,
        applicant_id
      )
      VALUES (?, 'GEAR_RENEWAL', ?, ?, ?, ?)
    `, [
      `GR-${Date.now()}`,
      renewalId,
      renewal.new_total_fee,
      cashierId,
      renewal.applicant_id
    ]);

    res.json({ success: true });

  } catch (err) {
    console.error('Approve gear renewal error:', err);
    res.status(500).json({ message: 'Approval failed' });
  }
};
exports.rejectGearRenewal = async (req, res) => {
  const renewalId = req.params.id;
  const cashierId = req.session.userId;

  try {
    const [result] = await pool.query(`
      UPDATE gear_renewals
      SET status = 'REJECTED',
          approved_by = ?,
          approved_at = NOW()
      WHERE id = ?
        AND status = 'PENDING'
    `, [cashierId, renewalId]);

    if (result.affectedRows === 0) {
      return res.status(409).json({
        message: 'This renewal was already processed'
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Reject gear renewal error:', err);
    res.status(500).json({ message: 'Failed to reject renewal' });
  }
};

// ==================================
// (cashier) approve vessel modification
// ==================================
exports.approveVesselModification = async (req, res) => {
  const modificationId = req.params.id;
  const cashierId = req.session.userId;

  try {
    // 1️⃣ Load modification request
    const [[mod]] = await pool.query(`
      SELECT
        vm.*,
        fv.id AS vessel_id,
        fv.applicant_id
      FROM vessel_modifications vm
      JOIN fishing_vessels fv ON vm.vessel_id = fv.id
      WHERE vm.id = ?
        AND vm.status = 'PENDING'
    `, [modificationId]);

    if (!mod) {
      return res.status(404).json({
        message: 'Modification request not found'
      });
    }

    // 2️⃣ Approve modification
    await pool.query(`
      UPDATE vessel_modifications
      SET status = 'APPROVED',
          approved_by = ?,
          approved_at = NOW()
      WHERE id = ?
    `, [cashierId, modificationId]);

    // 3️⃣ Apply changes to fishing_vessels
    await pool.query(`
      UPDATE fishing_vessels
      SET
        length = COALESCE(?, length),
        breadth = COALESCE(?, breadth),
        depth = COALESCE(?, depth),
        gross_tonnage = COALESCE(?, gross_tonnage),
        net_tonnage = COALESCE(?, net_tonnage),
        vessel_type = COALESCE(?, vessel_type),
        engine_make = COALESCE(?, engine_make),
        engine_serial_number = COALESCE(?, engine_serial_number),
        engine_horse_power = COALESCE(?, engine_horse_power),
        engine_cylinders = COALESCE(?, engine_cylinders),
        vessel_photo = COALESCE(?, vessel_photo),
        engine_photo = COALESCE(?, engine_photo)
      WHERE id = ?
    `, [
      mod.new_length,
      mod.new_breadth,
      mod.new_depth,
      mod.new_gross_tonnage,
      mod.new_net_tonnage,
      mod.new_vessel_type,
      mod.new_engine_make,
      mod.new_engine_serial_number,
      mod.new_engine_horse_power,
      mod.new_engine_cylinders,
      mod.new_vessel_photo,
      mod.new_engine_photo,
      mod.vessel_id
    ]);

    // 4️⃣ Create receipt / transaction
    await pool.query(`
      INSERT INTO receipts (
        reference_no,
        transaction_type,
        related_id,
        amount,
        cashier_id,
        applicant_id
      )
      VALUES (?, 'VESSEL_MODIFICATION', ?, ?, ?, ?)
    `, [
      `VM-${Date.now()}`,
      modificationId,
      mod.modification_fee,
      cashierId,
      mod.applicant_id
    ]);

    res.json({ success: true });

  } catch (err) {
    console.error('Approve vessel modification error:', err);
    res.status(500).json({
      message: 'Failed to approve vessel modification'
    });
  }
};
exports.rejectVesselModification = async (req, res) => {
  const modificationId = req.params.id;
  const cashierId = req.session.userId;

  try {
    const [result] = await pool.query(`
      UPDATE vessel_modifications
      SET status = 'REJECTED',
          approved_by = ?,
          approved_at = NOW()
      WHERE id = ?
        AND status = 'PENDING'
    `, [cashierId, modificationId]);

    if (result.affectedRows === 0) {
      return res.status(409).json({
        message: 'This modification was already processed'
      });
    }

    res.json({ success: true });

  } catch (err) {
    console.error('Reject vessel modification error:', err);
    res.status(500).json({
      message: 'Failed to reject vessel modification'
    });
  }
};

// =========================== user receipt (transaction) ================================
exports.getMyTransactions = async (req, res) => {
  try {
    const applicantId = req.session.applicantId;

    const [rows] = await pool.query(`
      SELECT
        reference_no,
        transaction_type,
        amount,
        created_at
      FROM receipts
      WHERE applicant_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [applicantId]);

    res.json(rows);
  } catch (err) {
    console.error('Fetch transactions error:', err);
    res.status(500).json({ message: 'Failed to load transactions' });
  }
};
// ==================================
// (cashier) pending vessel modifications
// ==================================
exports.getPendingVesselModifications = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        vm.id,
        vm.vessel_id,
        vm.modification_fee,
        vm.requested_at,

        fv.vessel_no,

        CONCAT(
          a.first_name, ' ',
          IFNULL(a.middle_name, ''), ' ',
          a.last_name,
          IFNULL(CONCAT(' ', a.extra_name), '')
        ) AS owner_name,

        -- Build a readable summary of requested changes
        CONCAT_WS(', ',
          IF(vm.new_length IS NOT NULL,
             CONCAT('Length: ', vm.new_length), NULL),
          IF(vm.new_breadth IS NOT NULL,
             CONCAT('Breadth: ', vm.new_breadth), NULL),
          IF(vm.new_depth IS NOT NULL,
             CONCAT('Depth: ', vm.new_depth), NULL),
          IF(vm.new_gross_tonnage IS NOT NULL,
             CONCAT('GT: ', vm.new_gross_tonnage), NULL),
          IF(vm.new_net_tonnage IS NOT NULL,
             CONCAT('NT: ', vm.new_net_tonnage), NULL),
          IF(vm.new_vessel_type IS NOT NULL,
             CONCAT('Type: ', vm.new_vessel_type), NULL)
        ) AS summary

      FROM vessel_modifications vm
      JOIN fishing_vessels fv ON vm.vessel_id = fv.id
      JOIN applicants a ON fv.applicant_id = a.id
      WHERE vm.status = 'PENDING'
      ORDER BY vm.requested_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error('Get pending vessel modifications error:', err);
    res.status(500).json({
      message: 'Failed to load vessel modifications'
    });
  }
};


async function hasPendingVesselModification(vesselId) {
  const [rows] = await pool.query(
    `
    SELECT id
    FROM vessel_modifications
    WHERE vessel_id = ?
      AND status = 'PENDING'
    LIMIT 1
    `,
    [vesselId]
  );

  return rows.length > 0;
}




exports.getGearsRegistration = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'gearsRegistration.html'));
};

exports.getRegistrationFeePage = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'registrationFee.html'));
};
