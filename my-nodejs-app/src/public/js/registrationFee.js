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
    const navbarTitle = document.querySelector('.navbar .fw-bold');

    /* ===============================
     LOAD REGISTRATION FEES
    =============================== */
    async function renderRegistrationFees() {
        navbarTitle.textContent = 'Registration Fees';

        container.innerHTML = `
        <div class="card-table registration-fees-wrap">
            <div class="table-header column">
            <h3>Registration Fees</h3>

            <div class="search-wrapper below-title">
                <i class="fa fa-search search-icon"></i>
                <input
                type="text"
                id="feeSearchInput"
                class="form-control search-input"
                placeholder="Search vessel or gear..."
                >
            </div>
            </div>

            <!-- VESSEL FEES -->
            <h4 class="section-title">🚤 Vessel Registration Fees</h4>
            <div id="vesselFeeCards" class="fee-card-grid"></div>

            <!-- GEAR FEES -->
            <h4 class="section-title mt-4">🎣 Fishing Gear Registration Fees</h4>
            <div id="gearFeeCards" class="fee-card-grid"></div>
        </div>
        `;

        const [vesselRes, gearRes] = await Promise.all([
        apiFetch('/api/registration/vessel-fees'),
        apiFetch('/api/registration/gear-fees')
        ]);

        const vesselFees = await vesselRes.json();
        const gearFees   = await gearRes.json();

        renderVesselCards(vesselFees);
        renderGearCards(gearFees);

        document.getElementById('feeSearchInput').addEventListener('input', e => {
        const q = e.target.value.toLowerCase();

        renderVesselCards(
            vesselFees.filter(f =>
            `${f.min_tonnage}-${f.max_tonnage}`.includes(q)
            )
        );

        renderGearCards(
            gearFees.filter(f =>
            f.gear_name.toLowerCase().includes(q)
            )
        );
        });
    }

    /* ===========================
        VESSEL FEE CARDS
    ============================ */
    // function renderVesselCards(fees) 
    function renderVesselCards(fees) {
    const el = document.getElementById('vesselFeeCards');

    if (!fees.length) {
        el.innerHTML = `<p class="text-muted">No vessel fees found</p>`;
        return;
    }

    el.innerHTML = fees.map(f => `
        <div class="fee-card">
        <div class="fee-card-header">
            <span class="fee-title">
            ${f.min_tonnage} – ${f.max_tonnage} GT
            </span>

            <button class="icon-btn" onclick="editVesselFee(${f.id})">
            <i class="fa fa-edit"></i>
            </button>
        </div>

        <div class="fee-card-body">
            <p class="fee-desc">
            Applicable for vessels with gross tonnage between
            <b>${f.min_tonnage}</b> and <b>${f.max_tonnage}</b>
            </p>

            <span class="fee-badge">₱ ${Number(f.fee).toFixed(2)}</span>
        </div>
        </div>
    `).join('');
    }


    /* ===========================
        GEAR FEE CARDS
    ============================ */
    // function renderGearCards(fees) 
    function renderGearCards(fees) {
    const el = document.getElementById('gearFeeCards');

    if (!fees.length) {
        el.innerHTML = `<p class="text-muted">No gear fees found</p>`;
        return;
    }

    el.innerHTML = fees.map(f => `
        <div class="fee-card">
        <div class="fee-card-header">
            <span class="fee-title">${f.gear_name}</span>

            <button class="icon-btn" onclick="editGearFee(${f.id})">
            <i class="fa fa-edit"></i>
            </button>
        </div>

        <div class="fee-card-body">
            <p class="fee-desc">
            Units:
            <b>${f.min_units}</b>
            ${f.max_units ? `– <b>${f.max_units}</b>` : 'and above'}
            </p>

            <span class="fee-badge">₱ ${Number(f.fee).toFixed(2)}</span>
        </div>
        </div>
    `).join('');
    }


    /* ===========================
        MENU BINDING
    ============================ */
    document.getElementById('viewRegistrationFees')
        ?.addEventListener('click', e => {
        e.preventDefault();
        renderRegistrationFees();
        });

    const menuMap = {
        getTags: { 
            title: 'Dashboard', 
            action: () => { 
                container.innerHTML = ''; 
                window.location.href='/dashboard'; 
            } 
        }
    };
    window.editVesselFee = async function (id) {
    const res = await apiFetch(`/api/registration/vessel-fees/${id}`);
    const fee = await res.json();

    document.getElementById('editFeeId').value = id;
    document.getElementById('editFeeType').value = 'vessel';
    document.getElementById('editFeeTitle').textContent = 'Edit Vessel Fee';

    document.getElementById('editMin').value = fee.min_tonnage;
    document.getElementById('editMax').value = fee.max_tonnage;
    document.getElementById('editFeeAmount').value = fee.fee;

    document.getElementById('editFeeModal').style.display = 'flex';
    };

    window.editGearFee = async function (id) {
    const res = await apiFetch(`/api/registration/gear-fees/${id}`);
    const fee = await res.json();

    document.getElementById('editFeeId').value = id;
    document.getElementById('editFeeType').value = 'gear';
    document.getElementById('editFeeTitle').textContent = 'Edit Gear Fee';

    document.getElementById('editMin').value = fee.min_units;
    document.getElementById('editMax').value = fee.max_units;
    document.getElementById('editFeeAmount').value = fee.fee;

    document.getElementById('editFeeModal').style.display = 'flex';
    };

    window.closeEditFee = function () {
    document.getElementById('editFeeModal').style.display = 'none';
    };

    /*=======================
           submit edit
    =======================*/
    document.getElementById('editFeeForm').addEventListener('submit', async e => {
    e.preventDefault();

    const id   = document.getElementById('editFeeId').value;
    const type = document.getElementById('editFeeType').value;

    const payload = {
        min: document.getElementById('editMin').value,
        max: document.getElementById('editMax').value,
        fee: document.getElementById('editFeeAmount').value
    };

    const url =
        type === 'vessel'
        ? `/api/registration/vessel-fees/${id}`
        : `/api/registration/gear-fees/${id}`;

    const res = await apiFetch(url, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        closeEditFee();
        showMessage(
        type === 'vessel'
            ? '🚤 Vessel registration fee updated'
            : '🎣 Fishing gear fee updated',
        'success'
        );
        renderRegistrationFees(); // reload cards
    } else {
        showMessage('❌ Failed to update registration fee', 'error');
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
    renderRegistrationFees();
});
