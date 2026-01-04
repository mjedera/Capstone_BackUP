document.addEventListener('DOMContentLoaded', async function () {
    const sidebar = document.getElementById('sidebar');
    const sidebarCollapseBtn = document.getElementById('sidebarCollapse');
    const content = document.getElementById('content');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const navbar = document.querySelector('.navbar');
    const navLogo = document.getElementById('navlogo');
    

    // -----------------------
    // Load Logo
    // -----------------------
    const loadLogo = async () => {
        try {
            const res = await apiFetch('/api/admin/logo?v=' + new Date().getTime());
            const data = await res.json();
            if (data.logoPath) {
                navLogo.src = data.logoPath + '?v=' + new Date().getTime();
            } else {
                navLogo.src = '/logos/default.png';
            }
        } catch (err) {
            console.error('Failed to fetch logo:', err);
            navLogo.src = '/logos/default.png';
        }
    };

    await loadLogo();

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

    // -------------------------------
    // Dynamic menu navigation
    // -------------------------------
    const container = document.getElementById('applicantTableContainer');
    const navbarTitle = document.querySelector('.navbar .fw-bold');

    // -----------------------
    // dashboard render
    // ---------------------------
    async function renderRegistrationDashboard() {

    const res = await apiFetch('/api/registration/dashboard');   
    const data = await res.json();

    const { vessels = 0, gears = 0,  pendingVessels = 0, pendingGears = 0, rows = [] } = data;

    container.innerHTML = `

        <!-- DASHBOARD CARDS -->
        <div class="dashboard-cards">
            <div class="card-table dashboard-card">
                <h2>${vessels}</h2>
                <p>Registered Vessels</p>
            </div>

            <div class="card-table dashboard-card">
                <h2>${gears}</h2>
                <p>Registered Fishing Gears</p>
            </div>

            <div class="card-table dashboard-card">
                <h2>${pendingVessels + pendingGears}</h2>
                <p>Pending Registrations</p>
            </div>
        </div>

        <!-- CHART CARD -->
        <div class="card-table">
        <div class="table-header">
            <h3>Monthly Vessel Registrations</h3>
        </div>

        <!-- YEAR FILTER (same as apprehension) -->
        <div class="year-filter">
            <div class="yearInputsWrapper">
                <label>
                From Year:
                <input type="number" id="fromYear" min="2000">
                </label>

                <label>
                To Year:
                <input type="number" id="toYear" min="2000">
                </label>

                <button class="btn-add" id="loadChartBtn">Load Chart</button>
                <button class="btn-secondary" id="printChartBtn">
                    Export PDF
                </button>

            </div>
        </div>
            <div style="height:360px">
                <canvas id="registrationChart"></canvas>
            </div>
        </div>

        <div class="card-table">
            <div class="table-header">
                <h3>Fishing Gear Usage</h3>
            </div>
            <div style="height:320px">
                <canvas id="gearUsageChart"></canvas>
            </div>
        </div>
    `;
    // 📅 Load year range from DB
    const yearRes = await apiFetch('/api/registration/years');
    const yearData = await yearRes.json();

    const fromYearInput = document.getElementById('fromYear');
    const toYearInput   = document.getElementById('toYear');

    if (yearData.minYear && yearData.maxYear) {
    fromYearInput.value = yearData.minYear;
    toYearInput.value   = yearData.maxYear;
    }
    document.getElementById('loadChartBtn')
    .addEventListener('click', loadRegistrationChartByYear);

    document.getElementById('printChartBtn')
    .addEventListener('click', exportRegistrationDashboardPDF);

    document.getElementById('fromYear')
    ?.addEventListener('input', () => {
        loadRegistrationChartByYear();
        renderGearUsageChart();
    });

    document.getElementById('toYear')
    ?.addEventListener('input', () => {
        loadRegistrationChartByYear();
        renderGearUsageChart();
    });



    // Auto-load chart initially
    loadRegistrationChartByYear();// Auto-load charts
    renderGearUsageChart();
    }
    
    let registrationChartInstance = null;

    async function loadRegistrationChartByYear() {
        const fromYearEl = document.getElementById('fromYear');
        const toYearEl   = document.getElementById('toYear');

        if (!fromYearEl) return;

        let fromYear = parseInt(fromYearEl.value, 10);
        let toYear   = parseInt(toYearEl.value, 10);

        if (isNaN(fromYear)) return;
        if (isNaN(toYear)) toYear = fromYear;
        if (fromYear > toYear) [fromYear, toYear] = [toYear, fromYear];

    const res = await apiFetch(
        `/api/registration/dashboard?fromYear=${fromYear}&toYear=${toYear}`
    );

        if (!res.ok) return;

        const { rows = [] } = await res.json();

    renderRegistrationChart(rows);
    renderGearUsageChart();
    }
    // =====================
    // dashboard generate color
    // ==============
    function generateColor(index, alpha = 0.6) {
        const palette = [
            [54,162,235],
            [75,192,192],
            [255,159,64],
            [153,102,255],
            [255,99,132]
        ];
        const [r,g,b] = palette[index % palette.length];
        return `rgba(${r},${g},${b},${alpha})`;
    }
    // ==================
    // registration chart
    // =====================
    function renderRegistrationChart(rows = []) {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded');
            return;
        }

        const ctx = document.getElementById('registrationChart');
        if (!ctx) return;

        const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

        const yearMap = {};
        rows.forEach(r => {
            if (!yearMap[r.year]) yearMap[r.year] = Array(12).fill(0);
            yearMap[r.year][r.month - 1] = r.total;
        });

        const datasets = Object.keys(yearMap).map((year, i) => ({
            label: year,
            data: yearMap[year],
            backgroundColor: generateColor(i),
            borderRadius: 6
        }));

        if (registrationChartInstance) {
            registrationChartInstance.destroy();
        }

        registrationChartInstance = new Chart(ctx, {
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
    // =======================
    // gear usage render
    // =======================
let gearChartInstance = null;

async function renderGearUsageChart() {
  const fromYear = parseInt(document.getElementById('fromYear')?.value, 10);
  const toYear   = parseInt(document.getElementById('toYear')?.value, 10);

  if (isNaN(fromYear)) return;

  const finalToYear = isNaN(toYear) ? fromYear : toYear;

  const res = await apiFetch( 
    `/api/registration/dashboard/gears?fromYear=${fromYear}&toYear=${finalToYear}`
  );

  if (!res.ok) {
    console.error('Failed to load gear usage chart');
    return;
  }   

  const data = await res.json();

  const ctx = document.getElementById('gearUsageChart');
  if (!ctx || typeof Chart === 'undefined') return;

  if (gearChartInstance) {
    gearChartInstance.destroy();
  }

  gearChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.gear_name),
      datasets: [{
        label: 'Registered Gears',
        data: data.map(d => d.total),
        backgroundColor: data.map((_, i) => generateColor(i)),
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}


    const menuMap = {
        getRegistrationDashboard: {
        title: 'Dashboard',
            action: async () => {
                await renderRegistrationDashboard();
            }
        },
        getAnnouncement: {
        title: 'Announcements',
            action: async () => {
                const container = document.getElementById('applicantTableContainer');
                container.innerHTML = '';

                const res = await apiFetch('/partials/announcements.html'); 
                container.innerHTML = await res.text();

                if (!document.getElementById('announcements')) {
                const script = document.createElement('script');
                script.src = '/js/announcements.js';
                script.id = 'announcements';
                document.body.appendChild(script);

                script.onload = () => window.initAnnouncements();
                } else {
                window.initAnnouncements();
                }
            }
        },
        getRegisteredVessels: {
            title: 'Registered Vessels',
            action: async () => {
                const container = document.getElementById('applicantTableContainer');
                if (!container) {
                    console.error('Container not found');
                    return;
                }

                container.innerHTML = '';

                try {
                    const res = await fetch('/partials/registeredVessels.html');
                    if (!res.ok) throw new Error('Failed to load registeredVessels.html');

                    container.innerHTML = await res.text();

                    if (!document.getElementById('registeredVesselsScript')) {
                        const script = document.createElement('script');
                        script.src = '/js/registeredVessels.js';
                        script.id = 'registeredVesselsScript';
                        document.body.appendChild(script);

                        script.onload = () => {
                            if (typeof window.initRegisteredVessels === 'function') {
                                window.initRegisteredVessels();
                            }
                        };
                    } else {
                        if (typeof window.initRegisteredVessels === 'function') {
                            window.initRegisteredVessels();
                        }
                    }

                    container.scrollIntoView({ behavior: 'smooth' });

                } catch (err) {
                    console.error(err);
                    container.innerHTML = `
                        <div class="text-center text-danger">
                            Failed to load Registered Vessels.
                        </div>
                    `;
                }
            }
        },
        getRegisteredGears: {
            title: 'Registered Gears',
            action: async () => {
                const container = document.getElementById('applicantTableContainer');
                if (!container) {
                    console.error('Container not found');
                    return;
                }

                container.innerHTML = '';

                try {
                    const res = await fetch('/partials/registeredGears.html');
                    if (!res.ok) throw new Error('Failed to load registeredGears.html');

                    container.innerHTML = await res.text();

                    if (!document.getElementById('registeredGearsScript')) {
                        const script = document.createElement('script');
                        script.src = '/js/registeredGears.js';
                        script.id = 'registeredGearsScript';
                        document.body.appendChild(script);

                        script.onload = () => {
                            if (typeof window.initRegisteredGears === 'function') {
                                window.initRegisteredGears();
                            }
                        };
                    } else {
                        if (typeof window.initRegisteredGears === 'function') {
                            window.initRegisteredGears();
                        }
                    }

                    container.scrollIntoView({ behavior: 'smooth' });

                } catch (err) {
                    console.error(err);
                    container.innerHTML = `
                        <div class="text-center text-danger">
                            Failed to load Registered Vessels.
                        </div>
                    `;
                }
            }
        },
        getTags: { 
            title: 'Dashboard', 
            action: () => { 
                container.innerHTML = ''; 
                window.location.href='/dashboard'; 
            } 
        }
    };
    Object.keys(menuMap).forEach(id => {
        const menuItem = document.getElementById(id);
        if (menuItem) menuItem.addEventListener('click', () => {
            const menu = menuMap[id];
            menu.action();
            if(navbarTitle) navbarTitle.textContent = menu.title;
        });
    });

    // ===============================
    // INITIAL LOAD → DASHBOARD
    // ===============================
    renderRegistrationDashboard();
    navbarTitle.textContent = 'Dashboard';

    async function exportRegistrationDashboardPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');

  let y = 15;

  // Title
  doc.setFontSize(16);
  doc.text('Registration Dashboard Report', 14, y);
  y += 10;

  // Cards
  doc.setFontSize(12);
  doc.text(`Registered Vessels: ${document.querySelector('.dashboard-card h2')?.innerText || 0}`, 14, y);
  y += 6;
  doc.text(`Registered Fishing Gears: ${document.querySelectorAll('.dashboard-card h2')[1]?.innerText || 0}`, 14, y);
  y += 10;

  // Monthly Chart Image
  const vesselChart = document.getElementById('registrationChart');
  if (vesselChart) {
    const img = vesselChart.toDataURL('image/png', 1.0);
    doc.text('Monthly Vessel Registrations', 14, y);
    y += 4;
    doc.addImage(img, 'PNG', 14, y, 180, 70);
    y += 75;
  }

  // Gear Usage Chart Image
  const gearChart = document.getElementById('gearUsageChart');
  if (gearChart) {
    const img = gearChart.toDataURL('image/png', 1.0);
    doc.text('Fishing Gear Usage', 14, y);
    y += 4;
    doc.addImage(img, 'PNG', 14, y, 180, 70);
  }

  doc.save('registration-dashboard.pdf');
}


});
