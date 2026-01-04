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
    const vesselFormContainer = document.getElementById('vesselFormContainer');
    const gearFormContainer = document.getElementById('gearFormContainer');
    async function loadPartial(url, container) {
    const res = await fetch(url);

    if (res.status === 401 || res.status === 403) {
        alert('Session expired. Please login again.');
        window.location.href = '/login';
        return false;
    }

    container.innerHTML = await res.text();
    return true;
    }
    const menuMap = {
        getApplicants: {
        title: 'Applicants',
            action: async () => {
                const ok = await loadPartial('/partials/applicantTable.html', container);
                if (!ok) return;

                if (window.initApplicantTable) window.initApplicantTable();
            }
        },
        getDashboard: { 
        title: 'Dashboard',
            action: async () => {
                const ok = await loadPartial('/partials/accDashboard.html', container);
                if (!ok) return;

                if (window.initAccDashboard) window.initAccDashboard();
                vesselFormContainer.innerHTML = '';
                gearFormContainer.innerHTML = '';
            }  
        },
        getMfletAcc: { 
        title: 'MFLET Accounts',
            action: async () => {
                const ok = await loadPartial('/partials/mflet.html', container);
                if (!ok) return;

                if (window.initAdminSettings) window.initAdminSettings(loadLogo);
                vesselFormContainer.innerHTML = '';
                gearFormContainer.innerHTML = '';
            }  
        },
        getChangeLogo: {
        title: 'Change Logo',
            action: async () => {
                const ok = await loadPartial('/partials/changeLogo.html', container);
                if (!ok) return;

                vesselFormContainer.innerHTML = '';
                gearFormContainer.innerHTML = '';

                const script = document.createElement('script');
                script.src = '/js/adminSettings.js';
                script.onload = () => {
                if (window.initAdminSettings) window.initAdminSettings(loadLogo);
                };
                container.appendChild(script);
            }
        },
        getNewAdminAccount: {
        title: 'New Admin Account',
            action: async () => {
                const ok = await loadPartial('/partials/addNewAdminAcc.html', container);
                if (!ok) return;

                vesselFormContainer.innerHTML = '';
                gearFormContainer.innerHTML = '';

                const script = document.createElement('script');
                script.src = '/js/adminSettings.js';
                script.onload = () => {
                if (window.initAdminSettings) window.initAdminSettings(loadLogo);
                };
                container.appendChild(script);
            }
        },
        getChangePassword: {
            title: 'Change Password',
            action: async () => {
                const ok = await loadPartial('/partials/changePassword.html', container);
                if (!ok) return;

                vesselFormContainer.innerHTML = '';
                gearFormContainer.innerHTML = '';

                const script = document.createElement('script');
                script.src = '/js/adminSettings.js';
                script.onload = () => {
                if (window.initAdminSettings) window.initAdminSettings(loadLogo);
                };
                container.appendChild(script);
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

  if (!menuItem) return;

  menuItem.addEventListener('click', async (event) => {
    event.preventDefault(); // always prevent default SPA navigation

    const hasOpenForm =
      gearFormContainer.innerHTML.trim() !== '' ||
      vesselFormContainer.innerHTML.trim() !== '';

    if (hasOpenForm) {
      const confirmed = await confirmAction({
        title: 'Cancel Registration',
        message: 'A registration form is currently open. Do you want to cancel it?',
        confirmText: 'Yes, Cancel',
        confirmClass: 'btn-danger'
      });

      if (!confirmed) return;

      // clear forms
      gearFormContainer.innerHTML = '';
      vesselFormContainer.innerHTML = '';
      gearFormContainer.style.display = 'none';
      vesselFormContainer.style.display = 'none';
    }

    // proceed with navigation
    const menu = menuMap[id];
    await menu.action();
    if (navbarTitle) navbarTitle.textContent = menu.title;
  });
});


    if (menuMap.getDashboard) {
    await menuMap.getDashboard.action();
    if (navbarTitle) navbarTitle.textContent = menuMap.getDashboard.title;
}

});
// -------------------------------
// MESSAGE HELPER
// -------------------------------
window.confirmAction = function ({
  title = 'Confirm Action',
  message = 'Are you sure?',
  confirmText = 'Confirm',
  confirmClass = 'btn-primary'
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