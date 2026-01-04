document.addEventListener('DOMContentLoaded', async function () {
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
    const menuMap = {
        getDashboard: {
            title: 'Dashboard',
            action: () => {
            container.innerHTML = `
                <div class="alert alert-info">
                Welcome, Cashier. Please select a transaction from the menu.
                </div>
            `;
            }
        },
        getVesselRenew: {
        title: 'Vessel Renewals',
            action: async () => {
                const ok = await loadPartial(
                    '/cashier/partials/vessel-renewals',
                    container
                );

                if (!ok) return;
                window.initCashierVesselRenewals?.();
            }
        },
        getAllPending: {
            title: 'Pending BoatR',
            action: async () => {
                const ok = await loadPartial(
                    '/cashier/partials/pendingVessels',
                    container
                );
                if (!ok) return;   
                window.initPendingVessels?.();
            }
        },
        getApprehended: {
            title: 'Apprehended Fisherfolks',
            action: async () => {
                const ok = await loadPartial(
                    '/cashier/partials/apprehensionReport',
                    container
                );
                if (!ok) return;   
                window.initApprehendedFisherfolks?.();
            }
        },
        getAllPendingGears: {
            title: 'Pending GearR',
            action: async () => {
                const ok = await loadPartial(
                    '/cashier/partials/pendingGears',
                    container
                );
                if (!ok) return;   
                window.initPendingGears?.();
            }
        },
        getVesselMod: {
            title: 'Vessel Modifications',
            action: async () => {
                const ok = await loadPartial(
                    '/cashier/partials/vessel-modifications',
                    container
                );

                if (!ok) return;   
                window.initCashierVesselModifications?.();
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
});
