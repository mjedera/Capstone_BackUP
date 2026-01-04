window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});
async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);

  if (res.status === 401 || res.status === 403) {
    alert('Session expired. Please login again.');
    window.location.href = '/BantayDagat';
    throw new Error('Unauthorized');
  }

  return res;
}
document.addEventListener('DOMContentLoaded', async function () {
    const sidebar = document.getElementById('sidebar');
    const sidebarCollapseBtn = document.getElementById('sidebarCollapse');
    const content = document.getElementById('content');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const navbar = document.querySelector('.navbar');
    const messageBox = document.getElementById('messageBox');
    const navLogo = document.getElementById('navlogo');
    

    const showMessage = (message, type = '') => {
        if (!messageBox) return;
        messageBox.textContent = message;
        messageBox.className = `message-box show ${type}`;
        setTimeout(() => messageBox.classList.remove('show'), 3000);
    };

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
    const dashboardAnnouncements = document.getElementById('dashboardAnnouncements');
    const navbarTitle = document.querySelector('.navbar .fw-bold');

    const menuMap = {
        getDashboard: {
        title: 'Dashboard',
        action: () => {
            container.innerHTML = `
            <div class="card p-3 mb-4 shadow-sm">
                <div class="dashboard-carousel-card">
                <div id="sanctuaryCarousel" class="carousel slide" data-bs-ride="carousel" data-bs-interval="5000">
                <!-- Indicators -->
                <div class="carousel-indicators">
                    <button type="button" data-bs-target="#sanctuaryCarousel" data-bs-slide-to="0" class="active"></button>
                    <button type="button" data-bs-target="#sanctuaryCarousel" data-bs-slide-to="1"></button>
                    <button type="button" data-bs-target="#sanctuaryCarousel" data-bs-slide-to="2"></button>
                </div>

                <!-- Slides -->
                <div class="carousel-inner rounded">
                    <div class="carousel-item active">
                    <img src="/images/cogon_sanctuary.jpg" class="d-block w-100 carousel-img" alt="Cogon Sanctuary">
                    <div class="carousel-caption d-none d-md-block">
                        <h5>Cogon Sanctuary</h5>
                    </div>
                    </div>

                    <div class="carousel-item">
                    <img src="/images/lewing_sanctuary.jpg" class="d-block w-100 carousel-img" alt="Lewing Sanctuary">
                    <div class="carousel-caption d-none d-md-block">
                        <h5>Lewing Sanctuary</h5>
                    </div>
                    </div>

                    <div class="carousel-item">
                    <img src="/images/zoomed_out.jpg" class="d-block w-100 carousel-img" alt="Marine Sanctuary">
                    <div class="carousel-caption d-none d-md-block">
                        <h5>Registered Fisherfolks</h5>
                    </div>
                    </div>
                </div>

                <!-- Controls -->
                <button class="carousel-control-prev" type="button" data-bs-target="#sanctuaryCarousel" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon"></span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#sanctuaryCarousel" data-bs-slide="next">
                    <span class="carousel-control-next-icon"></span>
                </button>
                </div>

            </div>
            </div>
            `;
            loadDashboardAnnouncements();
        }
        },
        getProfile: {
            
            title: 'Profile',
            action: async () => {
                const response = await fetch('/api/bantay-dagat/bantayDagatProfile.html');
                const applicantHtml = await response.text();

                // Inject HTML
                dashboardAnnouncements.innerHTML = '';
                container.innerHTML = applicantHtml;

                if (!document.getElementById('bdProfileScript')) {
                const script = document.createElement('script');
                script.id = 'bdProfileScript';
                script.src = '/js/bntyDgtProfile.js';
                script.onload = () => window.bntydgtProfile?.();
                document.body.appendChild(script);
                } else {
                window.bntydgtProfile?.();
                }

            }
        },
        getDigitalID: {
            title: 'Digital ID',
            action: async () => {
                const res = await fetch('/api/bantay-dagat/bantayDagatDigitalID.html');
                const html = await res.text();
                dashboardAnnouncements.innerHTML = '';
                container.innerHTML = html;

                if (!document.getElementById('bdDigitalScript')) {
                const script = document.createElement('script');
                script.id = 'bdDigitalScript';
                script.src = '/js/bantayDagatDigitalID.js';
                script.onload = () => {
                    window.loadBantayDagatDigitalID?.();
                };
                document.body.appendChild(script);
                } else {
                window.loadBantayDagatDigitalID?.();
                }
            }
        },
        getSettings: { 
            title: 'Settings', 
            action: async () => { 
                const response = await fetch('/partials/userSettings.html');
                const applicantHtml = await response.text();
                dashboardAnnouncements.innerHTML = '';
                container.innerHTML = applicantHtml;

                // Load the user data AFTER content is injected
                if (window.loadUserSettings) window.loadUserSettings();
            } 
        },
        getSubmitReport: {
        title: 'Submit Report',
        action: () => {
            dashboardAnnouncements.innerHTML = '';   
            renderSubmitReportForm();
        }
        }
    };

    const logoutBtn = document.getElementById('logoutBtn');

    logoutBtn?.addEventListener('click', async (e) => {
    e.preventDefault();

    if (!confirm('Are you sure you want to logout?')) return;

    try {
        const res = await fetch('/api/bantay-dagat/logout', {
        method: 'POST'
        });

        const data = await res.json();

        if (data.success) {
        window.location.replace('/BantayDagat');
        } else {
        alert('Logout failed. Please try again.');
        }
    } catch (err) {
        console.error('Logout error:', err);
        alert('Server error during logout.');
    }
    });


    Object.keys(menuMap).forEach(id => {
        const menuItem = document.getElementById(id);
        if (menuItem) menuItem.addEventListener('click', () => {
            const menu = menuMap[id];
            menu.action();
            if(navbarTitle) navbarTitle.textContent = menu.title;
        });
    });

    function renderSubmitReportForm() {
    const container = document.getElementById('applicantTableContainer');
    container.innerHTML = `
        <div class="card-table" style="max-width:600px;margin:auto;">
        <div class="table-header">
            <h3>Submit Incident Report</h3>
        </div>

        <form id="reportForm" enctype="multipart/form-data">
            <div class="form-group">
            <label>Report Title</label>
            <input type="text" name="report_title" class="form-control" required>
            </div>

            <div class="form-group">
            <label>Description</label>
            <textarea name="report_description" class="form-control" rows="4" required></textarea>
            </div>

            <div class="form-group">
            <label>Upload Photo (optional)</label>
            <input type="file" name="report_photo" class="form-control" accept="image/*">
            </div>

            <button type="submit" class="btn-add">Submit Report</button>
        </form>
        </div>
    `;
    
    setTimeout(() => {
    document.querySelector('input[name="report_title"]')?.focus();
    }, 50);

    document.getElementById('reportForm')
        .addEventListener('submit', submitReport);
    }

    async function submitReport(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const formData = new FormData(form);

    try {
        const res = await apiFetch('/api/bantay-dagat/submit-report', {
        method: 'POST',
        body: formData
        });

        if (!res.ok) {
        showMessage('Server error', 'error');
        return;
        }
        const data = await res.json();


        if (data.success) {
        showMessage('✅ Report submitted successfully', 'success');
        form.reset();
        form.querySelector('input[name="report_title"]').focus();
        } else {
        showMessage(data.message || 'Submission failed', 'error');
        }
    } catch (err) {
        console.error('Submit error:', err);
        showMessage('Server error while submitting report', 'error');
    } finally {
        submitBtn.disabled = false; // 👈 re-enable
    }
    }


    menuMap.getDashboard.action();
    navbarTitle.textContent = menuMap.getDashboard.title;

});
function formatTo12Hour(time24) {
  if (!time24) return '';

  const [hours, minutes] = time24.split(':');
  const date = new Date();
  date.setHours(hours, minutes);

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
async function loadDashboardAnnouncements() {
  try {
    const res = await apiFetch('/api/bantay-dagat/announcements/active');
    const announcements = await res.json();

    const container = document.getElementById('dashboardAnnouncements');
    if (!container) return;

    // Empty state
    if (!Array.isArray(announcements) || announcements.length === 0) {
      container.innerHTML = `
        <div class="alert-card info">
          <h4>📢 Announcements</h4>
          <p class="text-muted">No announcements available.</p>
        </div>
      `;
      return;
    }

    const items = announcements.map(a => `
      <li>
        <div class="announcement-item">
          <div><strong>Title:</strong> ${a.title}</div>
          <div><strong>Date:</strong> ${new Date(a.meeting_date).toLocaleDateString()}</div>
          <div><strong>Time:</strong> ${formatTo12Hour(a.meeting_time)}</div>
          <div><strong>Location:</strong> ${a.location || '—'}</div>
          <div class="announcement-message">
            <strong>Message:</strong> ${a.message}
          </div>
        </div>
      </li>
    `).join('');

    container.innerHTML = `
      <div class="alert-card info">
        <h4>📢 Announcements</h4>
        <ul class="announcement-list">
          ${items}
        </ul>
      </div>
    `;
  } catch (err) {
    console.error('Failed to load announcements:', err);
  }
}

