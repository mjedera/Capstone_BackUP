document.addEventListener('DOMContentLoaded', async function () {
  let selectedStatus = 'APPREHENDED';


  const sidebar = document.getElementById('sidebar');
  const sidebarCollapseBtn = document.getElementById('sidebarCollapse');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const navbar = document.querySelector('.navbar');
  const navLogo = document.getElementById('navlogo');
  const container = document.getElementById('applicantTableContainer');
  const newApprehensionForm = document.getElementById('newApprehensionForm');
  const navbarTitle = document.querySelector('.navbar .fw-bold');


  async function renderApprehensionDashboard() {
    const res = await apiFetch('/api/apprehensionRprtRoutes/dashboard');
    const data = await res.json();
    
    console.log('Dashboard API response:', data);
    const { total, motorized, nonMotorized, monthly } = data;
 
    container.innerHTML = `
      <!-- DASHBOARD CARDS -->
      <div class="dashboard-cards">
        <div class="card-table dashboard-card">
          <h2 id="totalCount">0</h2>
          <p>Total Apprehensions</p>
        </div>

        <div class="card-table dashboard-card">
          <h2 id="motorizedCount">0</h2>
          <p>Motorized</p>
        </div>

        <div class="card-table dashboard-card">
          <h2 id="nonMotorizedCount">0</h2>
          <p>Non-Motorized</p>
        </div>
      </div>

        <!-- CHART CARD -->
        <div class="card-table">
            <div class="table-header">
              <h3>Monthly Apprehensions</h3>
            </div>

            <div class="year-filter">
              <div class="yearInputsWrapper">
                <label>
                  From Year:
                  <input type="number" id="fromYear" value="2023" min="2000">
                </label>

                <label>
                  To Year:
                  <input type="number" id="toYear" value="2025" min="2000">
                </label>

                <button class="btn-add" id="loadChartBtn">Load Chart</button>
                <button class="btn-secondary" id="printChartBtn">Print</button>
              </div>
            </div>

          <div style="height:360px">
            <canvas id="apprehensionChart"></canvas>
          </div>
    `;
    document.getElementById('fromYear')?.addEventListener('input', loadChartByYear);
    document.getElementById('toYear')?.addEventListener('input', loadChartByYear);
    document.getElementById('loadChartBtn')
      .addEventListener('click', loadChartByYear);
    document.getElementById('printChartBtn')
      .addEventListener('click', () => window.print());
    document.getElementById('totalCount').textContent = total ?? 0;
    document.getElementById('motorizedCount').textContent = motorized ?? 0;
    document.getElementById('nonMotorizedCount').textContent = nonMotorized ?? 0;
    // 📅 Load year range from DB
    const yearRes = await apiFetch('/api/apprehensionRprtRoutes/years');
    const yearData = await yearRes.json();
    const fromYearInput = document.getElementById('fromYear');
    const toYearInput   = document.getElementById('toYear');
    if (yearData.minYear && yearData.maxYear) {
      fromYearInput.value = yearData.minYear;
      toYearInput.value   = yearData.maxYear;
    } else {
      // fallback if table is empty
      const y = new Date().getFullYear();
      fromYearInput.value = y;
      toYearInput.value   = y;
    }
    loadChartByYear();
  }

  let apprehensionChartInstance = null;
  function colorForYear(year) {
      const colors = [
        'rgba(144, 238, 57, 0.6)',
        'rgba(161, 11, 44, 0.6)',
        'rgba(31, 143, 143, 0.6)',
        'rgba(209, 36, 5, 0.6)',
        'rgba(48, 11, 124, 0.6)'
      ];
    return colors[year % colors.length];
  }

  async function loadChartByYear() {
    const fromYearEl = document.getElementById('fromYear');
    const toYearEl   = document.getElementById('toYear');

    if (!fromYearEl) return;

    let fromYear = parseInt(fromYearEl.value, 10);
    let toYear   = parseInt(toYearEl.value, 10);

    // 🚨 fromYear is required
    if (isNaN(fromYear)) {
      console.warn('From year is required');
      return;
    }

    // ✅ If To Year is empty → single year
    if (isNaN(toYear)) {
      toYear = fromYear;
    }

    // 🔁 Swap if reversed
    if (fromYear > toYear) {
      [fromYear, toYear] = [toYear, fromYear];
    }
    const res = await apiFetch(
      `/api/apprehensionRprtRoutes/dashboard?fromYear=${fromYear}&toYear=${toYear}`
    );
     
    if (!res.ok) {
      console.error('Chart fetch failed');
      return;
    }

    const { rows } = await res.json();

    const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const yearMap = {};
    rows.forEach(r => {
      if (!yearMap[r.year]) {
        yearMap[r.year] = Array(12).fill(0);
      }
      yearMap[r.year][r.month - 1] = r.total;
    });

    const datasets = Object.keys(yearMap).map(year => ({
      label: year,
      data: yearMap[year],
      backgroundColor: colorForYear(year),
      borderRadius: 6
    }));


    const ctx = document.getElementById('apprehensionChart');

    if (apprehensionChartInstance) {
      apprehensionChartInstance.destroy();
    }

    apprehensionChartInstance = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true }
        }
      }
    });
  }
      // -----------------------
    // Sidebar toggle
    // -----------------------
    sidebarCollapseBtn?.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('mobile-open');
            sidebarOverlay?.classList.toggle('show');
            document.body.classList.toggle('no-scroll');    
        } else {
            sidebar.classList.toggle('collapsed');
            const collapsedWidth = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-collapsed-width') || '80px';
            const expandedWidth = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-expanded-width') || '250px';
            content.style.marginLeft = sidebar.classList.contains('collapsed') ? collapsedWidth.trim() : expandedWidth.trim();
            navbar?.classList.toggle('navbar-collapsed', sidebar.classList.contains('collapsed'));
        }
    });

    sidebarOverlay?.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        sidebarOverlay.classList.remove('show');
        document.body.classList.remove('no-scroll');
    });

    const handleResize = () => {
        if (!navbar) return;
        if (window.innerWidth <= 768) navbar.classList.remove('navbar-shifted', 'navbar-collapsed');
        else navbar.classList.add('navbar-shifted');
    };
    window.addEventListener('resize', handleResize);
    handleResize();
  /* ===============================
     STATE
  =============================== */
  let apprehensionReports = [];
  let currentPage = 1;
  const rowsPerPage = 10;
  let searchQuery = '';

  /* ===============================
     LOAD LOGO
  =============================== */
  const loadLogo = async () => {
    try {
      const res = await apiFetch('/api/admin/logo?v=' + Date.now());
      const data = await res.json();
      navLogo.src = data.logoPath
        ? data.logoPath + '?v=' + Date.now()
        : '/logos/default.png';
    } catch {
      navLogo.src = '/logos/default.png';
    }
  };
  await loadLogo();

  /* ===============================
     MENU MAP
  =============================== */
  const menuMap = {
            getTags: { 
            title: 'Dashboard', 
            action: () => { 
                container.innerHTML = ''; 
                window.location.href='/dashboard'; 
            } 
        },
    getApprehensionDashboard: {
      title: 'Dashboard',
      action: async () => {
        await renderApprehensionDashboard();
      }
    },
    apprehensionReport: {
      title: 'Apprehension Reports',
      action: async () => {
        const res = await apiFetch('/api/apprehensionRprtRoutes/list');
        apprehensionReports = await res.json();
        currentPage = 1;
        renderApprehensionTable();
      }
    },
    bantayDagatapprehensionReport: {
      title: 'Bantay Dagat Reports',
      action: async () => {
        await renderBantayDagatReports();
      }
    }
  };
    function debounce(fn, delay = 500) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
    }

  /* ===============================
     RENDER TABLE
  =============================== */
  function renderApprehensionTable() {
    const filteredReports = apprehensionReports.filter(r => {
      // status filter
      if (selectedStatus && r.status !== selectedStatus) {
        return false;
      }

      // text search
      const text = `
        ${r.full_name}
        ${r.violation_type}
        ${r.vessel_type}
        ${r.penalty_details}
      `.toLowerCase();

      return text.includes(searchQuery.toLowerCase());
    });

    const totalPages = Math.ceil(filteredReports.length / rowsPerPage) || 1;
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredReports.slice(start, end);

    let html = `
      <div class="card-table">
        <div class="table-header column">
            <div class="header-row">
                <h3>Apprehension Reports</h3>
                <button class="btn btn-primary" id="getNewReportForm">
                <i class="fa fa-plus-circle"></i> Add New Report
                </button>
            </div>
            <div class="search-action-row">
              <div class="search-container">
                <i class="fa fa-search search-icon"></i>
                <input
                  type="text"
                  id="searchInput"
                  class="form-control search-input"
                  placeholder="Search name, violation, vessel..."
                  value="${searchQuery}"
                >
              </div>
              <div class="status-dropdown" id="apprehensionStatus">
                <button type="button" class="dropdown-toggle">
                  <span id="statusLabel">${selectedStatus}</span>
                </button>
                <ul class="dropdown-menu">
                  <li data-value="APPREHENDED">APPREHENDED</li>
                  <li data-value="RELEASED">RELEASED</li>
                </ul>
              </div>

              <button class="btn btn-primary" id="printSelectedBtn">
                <i class="fa fa-print"></i> Print Selected
              </button>
            </div>
        </div>


        <div class="table-responsive">
          <table class="table table-hover mb0">
            <thead >
              <tr>
                <th><input type="checkbox" id="selectAllReports"></th>
                <th>Violator No</th>
                <th>Name</th>
                <th>Date</th>
                <th>Vessel Type</th>
                <th>Fishing Gear</th>
                <th>Violation</th>
                <th>Penalty</th>
              </tr>
            </thead>
            <tbody>
    `;

    pageData.forEach(r => {
      html += `
        <tr >
          <td><input type="checkbox" class="reportCheckbox" value="${r.id}"></td>
          <td>${r.violator_no || ''}</td>
          <td>${r.full_name}</td>
          <td>${new Date(r.apprehension_date).toLocaleString()}</td>
          <td>${r.vessel_type}</td>
          <td>${r.gear_count || 0}</td>
          <td>
            <button 
              class="btn btn-sm btn-primary"
              onclick="viewViolations(${r.id})"
            >
              View
            </button>
          </td>
          <td>${r.penalty_details}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>

        <div class="pagination-wrapper">
          <button class="btn btn-sm btn-secondary" id="prevPageBtn" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>
          <span class="page-indicator">Page ${currentPage} of ${totalPages}</span>
          <button class="btn btn-sm btn-secondary" id="nextPageBtn" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    `;

    container.innerHTML = html;
    // ADD NEW REPORT BUTTON HANDLER
    const addBtn = document.getElementById('getNewReportForm');
    if (addBtn) {
      addBtn.addEventListener('click', async () => {
        container.innerHTML = '';
        const res = await apiFetch('/partials/newApprehensionForm.html');
        newApprehensionForm.innerHTML = await res.text();
        window.initApprehensionForm?.();
      });
    }
    
      const dropdown = document.getElementById('apprehensionStatus');
      const statusLabel = document.getElementById('statusLabel');
      dropdown.querySelector('.dropdown-toggle').onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
      };
        document.addEventListener('click', () => {
        dropdown.classList.remove('open');
      });
      dropdown.querySelectorAll('.dropdown-menu li').forEach(item => {
        item.onclick = (e) => {
          e.stopPropagation();
          console.log('Filtering by:', selectedStatus);
          // ✅ UPDATE FILTER STATE
          selectedStatus = item.dataset.value;

          // ✅ UPDATE LABEL
          statusLabel.textContent = selectedStatus;

          // ✅ RESET PAGINATION
          currentPage = 1;

          // ✅ RE-RENDER TABLE (THIS WAS MISSING)
          renderApprehensionTable();

          dropdown.classList.remove('open');
        };
      });


    setupSearchHandler();
    setupPaginationHandlers(totalPages);
    setupCheckboxHandlers();
  }
  window.addEventListener('apprehensionFormClosed', async () => {
  try {
    const res = await apiFetch('/api/apprehensionRprtRoutes/list');
    apprehensionReports = await res.json();
    currentPage = 1;
    renderApprehensionTable();
  } catch (err) {
    console.error('Failed to reload apprehension table:', err);
  }
});

 
  // =============================
  // render bantay dagat reports
  // =============================
  async function renderBantayDagatReports() {
  const res = await apiFetch('/api/apprehensionRprtRoutes/reports');
  if (!res.ok) {
    container.innerHTML = `<p class="text-danger">Failed to load reports</p>`;
    return;
  }

  const reports = await res.json();

  let html = `
    <div class="card-table">
      <div class="table-header">
        <h3>Bantay Dagat Reports</h3>
      </div>

      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Description</th>
              <th>Reported By</th>
              <th>Date</th>
              <th>Photo</th>
            </tr>
          </thead>
          <tbody>
  `;

  if (!reports.length) {
    html += `
      <tr>
        <td colspan="5" class="text-center text-muted">
          No reports found
        </td>
      </tr>
    `;
  }

reports.forEach(r => {
  html += `
    <tr>
      <td>${r.report_title}</td>
      <td>${r.report_description}</td>
      <td><strong>${r.reported_by}</strong></td>
      <td>${new Date(r.created_at).toLocaleString()}</td>
      <td>
        ${
          r.report_photo
            ? `<img 
                src="${r.report_photo.startsWith('/') 
                  ? r.report_photo 
                  : '/' + r.report_photo}"
                onerror="this.onerror=null;this.src='/images/no-image.png';"
                style="width:60px;height:60px;object-fit:cover;border-radius:6px;"
              >`
            : `<span class="text-muted">None</span>`
        }
      </td>
    </tr>
  `;
});


  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

    /* ===============================
        SEARCH HANDLER
    =============================== */
        function setupSearchHandler() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const handleSearch = debounce(() => {
        // 🔐 Save cursor position
        const cursorPos = searchInput.selectionStart;

        searchQuery = searchInput.value;
        currentPage = 1;

        renderApprehensionTable();

        // 🔁 Restore cursor AFTER re-render
        const newSearchInput = document.getElementById('searchInput');
        if (newSearchInput) {
        newSearchInput.focus();
        newSearchInput.setSelectionRange(cursorPos, cursorPos);
        }
    }, 300);

  searchInput.addEventListener('input', handleSearch);
}

  /* ===============================
     PAGINATION
  =============================== */
  function setupPaginationHandlers(totalPages) {
    document.getElementById('prevPageBtn')?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderApprehensionTable();
      }
    });

    document.getElementById('nextPageBtn')?.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderApprehensionTable();
      }
    });
  }

  /* ===============================
     CHECKBOX + PRINT
  =============================== */
  function setupCheckboxHandlers() {
    const selectAll = document.getElementById('selectAllReports');
    const printBtn = document.getElementById('printSelectedBtn');

    selectAll?.addEventListener('change', () => {
      document.querySelectorAll('.reportCheckbox')
        .forEach(cb => cb.checked = selectAll.checked);
    });

    printBtn?.addEventListener('click', async () => {
      const ids = Array.from(
        document.querySelectorAll('.reportCheckbox:checked')
      ).map(cb => cb.value);

      if (!ids.length) {
        alert('Please select at least one report.');
        return;
      }
      await printSelectedReports(ids);
    });
  }

  /* ===============================
     PRINT SELECTED
  =============================== */
async function printSelectedReports(ids) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Popup blocked. Please allow popups.');
    return;
  }

  win.document.open();
  win.document.write(`
    <html>
    <head>
      <title>Apprehension Report</title>
      <style>
        body {
          font-family: "Times New Roman", serif;
          padding: 30px;
          color: #000;
        }

        .gov-header {
          text-align: center;
          line-height: 1.4;
          margin-bottom: 20px;
        }

        .gov-header strong {
          font-size: 15px;
        }

        .form-title {
          text-align: center;
          font-weight: bold;
          border: 2px solid #000;
          padding: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        th, td {
          border: 1px solid #000;
          padding: 6px 8px;
          vertical-align: top;
        }

        th {
          background: #f2f2f2;
          font-weight: bold;
          width: 22%;
        }

        .section {
          background: #e9e9e9;
          font-weight: bold;
          text-align: left;
        }

        .no-border {
          border: none !important;
        }

        .signature {
          margin-top: 40px;
          width: 100%;
        }

        .signature td {
          border: none;
          padding-top: 40px;
          text-align: center;
        }

        .page-break {
          page-break-after: always;
        }

        ul {
          margin: 0;
          padding-left: 18px;
        }
      </style>
    </head>
    <body>
  `);

  for (const id of ids) {
    const res = await apiFetch(`/api/apprehensionRprtRoutes/${id}`);
    const { report, gears, mflet } = await res.json();

    const gearList = [];
    if (gears) {
      if (gears.hand_instruments) gearList.push(`Hand Instruments: ${gears.hand_instruments}`);
      if (gears.fishing_lines) gearList.push(`Fishing Lines: ${gears.fishing_lines}`);
      if (gears.pahubog_nets) gearList.push(`Pahubog Nets: ${gears.pahubog_nets}`);
      if (gears.fishing_nets) gearList.push(`Fishing Nets: ${gears.fishing_nets}`);
      if (gears.traps) gearList.push(`Traps: ${gears.traps}`);
      if (gears.accessories) gearList.push(`Accessories: ${gears.accessories}`);
    }

    win.document.write(`
      <div class="gov-header">
        Republic of the Philippines<br>
        Province of Southern Leyte<br>
        Municipality of Anahawan<br>
        <strong>OFFICE OF THE MUNICIPAL MAYOR</strong>
      </div>

      <div class="form-title">
        CERTIFIED APPREHENSION REPORT
      </div>

      <table>
        <tr class="section">
          <td colspan="4">APREHENSION DETAILS</td>
        </tr>
        <tr>
          <th>Violator No.</th>
          <td>${report.violator_no}</td>
          <th>Date & Time</th>
          <td>${new Date(report.apprehension_date).toLocaleString()}</td>
        </tr>
        <tr>
          <th>Name of Violator</th>
          <td colspan="3">${report.full_name}</td>
        </tr>

        <tr class="section">
          <td colspan="4">VESSEL INFORMATION</td>
        </tr>
        <tr>
          <th>Vessel Type</th>
          <td>${report.vessel_type}</td>
          <th>Vessel No.</th>
          <td>${report.vessel_no || '—'}</td>
        </tr>
        <tr>
          <th>Vessel Name</th>
          <td>${report.vessel_name || '—'}</td>
          <th>Owner</th>
          <td>${report.owner_name || '—'}</td>
        </tr>
        <tr class="section">
          <td colspan="4">VESSEL ADMEASUREMENT</td>
        </tr>
        <tr>
          <th>Home Port</th>
          <td colspan="3">${report.home_port || '—'}</td>
        </tr>
        <tr>
          <th>Length (m)</th>
          <td>${report.length_m ?? '—'}</td>
          <th>Breadth (m)</th>
          <td>${report.breadth_m ?? '—'}</td>
        </tr>
        <tr>
          <th>Depth (m)</th>
          <td>${report.depth_m ?? '—'}</td>
          <th>Gross Tonnage</th>
          <td>${report.gross_tonnage ?? '—'}</td>
        </tr>
        <tr>
          <th>Net Tonnage</th>
          <td>${report.net_tonnage ?? '—'}</td>
          <th>Vessel Color</th>
          <td>${report.vessel_color ?? '—'}</td>
        </tr>
        ${report.engine_make ? `
        <tr class="section">
          <td colspan="4">ENGINE DETAILS</td>
        </tr>
        <tr>
          <th>Engine Make</th>
          <td>${report.engine_make}</td>
          <th>Serial No.</th>
          <td>${report.engine_serial_number}</td>
        </tr>
        <tr>
          <th>Horse Power</th>
          <td>${report.horse_power}</td>
          <th>Cylinders</th>
          <td>${report.cylinders}</td>
        </tr>
        ` : ''}
        <tr class="section">
          <td colspan="4">FISHING GEARS USED</td>
        </tr>
        <tr>
          <td colspan="4">
            ${
              gearList.length
                ? `<ul>${gearList.map(g => `<li>${g}</li>`).join('')}</ul>`
                : `<i>No fishing gear recorded</i>`
            }
          </td>
        </tr>

        <tr class="section">
          <td colspan="4">VIOLATION & PENALTY</td>
        </tr>
        <tr>
          <th>Violation</th>
          <td colspan="3">${report.violation_type}</td>
        </tr>
        <tr>
          <th>Penalty</th>
          <td colspan="3">${report.penalty_details}</td>
        </tr>

        <tr class="section">
          <td colspan="4">MFLET PRESENT</td>
        </tr>
        <tr>
          <td colspan="4">
            <ul>
              ${mflet.map(m => `<li>${m.full_name}</li>`).join('')}
            </ul>
          </td>
        </tr>
      </table>

      <table class="signature">
        <tr>
          <td>
            ___________________________<br>
            Apprehending Officer
          </td>
          <td>
            ___________________________<br>
            Noted By
          </td>
        </tr>
      </table>

      <div class="page-break"></div>
    `);
  }

  win.document.write(`
      <script>
        window.onload = () => window.print();
      </script>
    </body>
    </html>
  `);

  win.document.close();
}




  Object.keys(menuMap).forEach(id => {
  const menuItem = document.getElementById(id);

  if (!menuItem) return;

  menuItem.addEventListener('click', async (event) => {
    event.preventDefault(); // always prevent default SPA navigation

    const hasOpenForm =
      newApprehensionForm.innerHTML.trim() !== '';

    if (hasOpenForm) {
      const confirmed = await confirmAction({
        title: 'Cancel New Apprehension Report',
        message: 'A new Apprehension Report form is currently open. Do you want to cancel it?',
        confirmText: 'Yes, Cancel',
        confirmClass: 'btn-danger'
      });

      if (!confirmed) return;
      newApprehensionForm.innerHTML ='';
    }

    // proceed with navigation
    const menu = menuMap[id];
    await menu.action();
    if (navbarTitle) navbarTitle.textContent = menu.title;
  });
});

  // ===============================
  // INITIAL LOAD → DASHBOARD
  // ===============================
  renderApprehensionDashboard();
  navbarTitle.textContent = 'Dashboard';


window.viewViolations = function (reportId) {
  const report = apprehensionReports.find(r => r.id === reportId);
  if (!report) return;

  confirmAction({
    title: 'Violation Details',
    message: report.violation_type,
    confirmText: 'Close',
    confirmClass: 'btn-secondary',
    showCancel: false   // 👈 HIDE cancel button
  });
};
});



// -------------------------------
// MESSAGE HELPER
// -------------------------------
window.confirmAction = function ({
  title = 'Confirm Action',
  message = 'Are you sure?',
  confirmText = 'Confirm',
  confirmClass = 'btn-primary',
  showCancel = true   // 👈 NEW (default = true)
}) {
  return new Promise(resolve => {
    const modal = document.getElementById('confirmDeleteModal');
    const titleEl = document.getElementById('confirmTitle');
    const msgEl = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');

    titleEl.textContent = title;
    msgEl.textContent = message;

    okBtn.textContent = confirmText;
    okBtn.className = `btn ${confirmClass}`;

    // 👇 SHOW / HIDE CANCEL BUTTON
    cancelBtn.style.display = showCancel ? 'inline-block' : 'none';

    modal.style.display = 'flex';

    okBtn.onclick = () => {
      modal.style.display = 'none';
      resolve(true);
    };

    cancelBtn.onclick = () => {
      modal.style.display = 'none';
      resolve(false);
    };
  });
};

