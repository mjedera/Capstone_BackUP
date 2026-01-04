async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);

  if (res.status === 401 || res.status === 403) {
    alert('Session expired. Please login again.');
    window.location.href = '/userLogin';
    throw new Error('Unauthorized');
  }

  return res;
}
async function loadDashboardGreeting() {
  try {
    const res = await apiFetch('/api/fisherFolkRoutes/currentApplicant');
    const result = await res.json();

    if (!result.loggedIn) return;

    const user = result.data;

    const greetingEl = document.getElementById('greeting');
    const photoEl = document.getElementById('userPhoto');

    if (greetingEl) {
      greetingEl.textContent = `Welcome back, ${user.first_name}!`;
    }

    if (photoEl) {
      if (user.applicant_photo) {
        photoEl.src = user.applicant_photo.startsWith('/')
          ? user.applicant_photo
          : `/applicant_photos/${user.applicant_photo}`;
      } else {
        photoEl.src = '/applicant_photos/default.png';
      }
      photoEl.style.display = 'block';
    }
  } catch (err) {
    console.error('Greeting error:', err);
  }
  loadUnsettledVesselsCard();
  loadDashboardAnnouncements();
}
async function loadUnsettledVesselsCard() {
  try {
    const res = await apiFetch('/api/fisherFolkRoutes/unsettled-vessels');
    const data = await res.json();

    const container = document.getElementById('dashboardAlerts');
    if (!container) return;

    // Clear previous
    container.innerHTML = '';

    if (!data.vessels || data.vessels.length === 0) return;

    const listItems = data.vessels.map(v => `
      <li>
        <strong>${v.vessel_name || v.vessel_no}</strong>
        <span class="badge badge-danger">Apprehended</span>
      </li>
    `).join('');

    container.innerHTML = `
      <div class="alert-card danger">
        <h4>⚠ Unsettled Apprehension</h4>
        <p>You have ${data.vessels.length} apprehended vessel(s):</p>
        <ul>${listItems}</ul>
      </div>
    `;
  } catch (err) {
    console.error('Dashboard apprehension alert error:', err);
  }
}
document.addEventListener('DOMContentLoaded', async function () {
    const sidebar = document.getElementById('sidebar');
    const sidebarCollapseBtn = document.getElementById('sidebarCollapse');
    const content = document.getElementById('content');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const navbar = document.querySelector('.navbar');
    const navLogo = document.getElementById('navlogo');
    // 🔄 Listen for profile photo updates
    window.addEventListener('applicantPhotoUpdated', (e) => {
    const photoEl = document.getElementById('userPhoto');
    if (!photoEl || !e.detail?.photo) return;

    photoEl.src = e.detail.photo + '?v=' + Date.now();
    });
    // -----------------------
    // Load Logo
    // -----------------------
    const loadLogo = async () => {
        try {
            const res = await fetch('/api/admin/logo?v=' + new Date().getTime());
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

    function showGreeting() {
        const el = document.getElementById('greeting-container');
        if (el) el.style.display = 'flex';
    }

    function hideGreeting() {
        const el = document.getElementById('greeting-container');
        if (el) el.style.display = 'none';
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

    // -------------------------------
    // Dynamic menu navigation
    // -------------------------------
    const container = document.getElementById('applicantTableContainer');
    const navbarTitle = document.querySelector('.navbar .fw-bold');
    const unsettled = document.getElementById('dashboardAlerts');
    const dashboardAnnouncements = document.getElementById('dashboardAnnouncements');

    const menuMap = {
        getDashboard: {
        title: 'Dashboard',
            action: async () => {
                container.innerHTML = '';
                showGreeting();
                await loadDashboardGreeting();
            }
        },
        getProfile: {
            title: 'Profile',
            action: async () => {
                hideGreeting();
                
                const response = await fetch('/partials/userProfile.html');
                const applicantHtml = await response.text();
                unsettled.innerHTML = '';
                dashboardAnnouncements.innerHTML = '';
                container.innerHTML = applicantHtml;


                // Load the user data AFTER content is injected
                if (window.loadUserProfile) window.loadUserProfile();
            }
        },
        getDigitalID: {
        title: 'Digital ID',
            action: async () => {
                hideGreeting();
                const response = await fetch('/partials/userDigitalID.html');
                const html = await response.text();
                unsettled.innerHTML = '';
                dashboardAnnouncements.innerHTML = '';
                container.innerHTML = html;
                // Load JS once
                if (!window.loadUserDigitalID) {
                const script = document.createElement('script');
                script.src = '/js/userDigitalID.js';
                document.body.appendChild(script);

                script.onload = () => {
                    window.loadUserDigitalID();
                };
                } else {
                window.loadUserDigitalID();
                }
            }
        },
        getSettings: { 
            title: 'Settings', 
            action: async () => { 
                hideGreeting();
                const response = await apiFetch('/partials/userSettings.html'); 
                const applicantHtml = await response.text();
                unsettled.innerHTML = '';
                dashboardAnnouncements.innerHTML = '';
                container.innerHTML = applicantHtml;

                // Load the user data AFTER content is injected
                if (window.loadUserSettings) window.loadUserSettings();
            } 
        }
    };

    Object.keys(menuMap).forEach(id => {
    const menuItem = document.getElementById(id);
    if (menuItem) {
        menuItem.addEventListener('click', () => {
        const menu = menuMap[id];
        menu.action();

        if (navbarTitle) navbarTitle.textContent = menu.title;
        });
    }
    });
    loadDashboardGreeting();
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
    const res = await apiFetch('/api/fisherFolkRoutes/dashboard-announcements');
    const data = await res.json();

    const container = document.getElementById('dashboardAnnouncements');
    if (!container) return;

    container.innerHTML = '';

    if (!data.announcements || data.announcements.length === 0) return;

const items = data.announcements.map(a => `
  <li>
    <div class="announcement-item">
      <div><strong>Title:</strong> ${a.title}</div>
      <div><strong>Date:</strong> ${new Date(a.meeting_date).toLocaleDateString()}</div>
      <div><strong>Time:</strong> ${formatTo12Hour(a.meeting_time)}</div>
      <div><strong>Location:</strong> ${a.location}</div>
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
    console.error('Dashboard announcements error:', err);
  }
}
