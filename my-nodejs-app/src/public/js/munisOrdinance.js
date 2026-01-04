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
    let ordinanceData = [];
    let searchQuery = '';
    const menuMap = {
        getMunisOrdinanceDashboard: { 
            title: 'Dashboard', 
            action: () => container.innerHTML = '' 
        },
        viewMunicipalOrdinances: {
        title: 'Municipal Ordinance(s)',
        action: async () => {
            await loadOrdinances();
            renderOrdinanceCards();
        }
        },
        addOrdinance: { 
        title: 'Add New Ordinance', 
        action: () => renderAddOrdinanceForm()
        },
        getTags: { 
            title: 'Dashboard', 
            action: () => { 
                container.innerHTML = ''; 
                window.location.href='/dashboard'; 
            } 
        }
    };

    /* ===============================
     LOAD ORDINANCES
    =============================== */
    async function loadOrdinances() {
        try {
        const res = await apiFetch('/api/munisOrdinance/list');
        ordinanceData = await res.json();
        } catch (err) {
        console.error('Load ordinances error:', err);
        ordinanceData = [];
        }
    }

    /* ===============================
        RENDER ORDINANCE CARDS
    =============================== */
    function renderOrdinanceCards() {

        const filtered = ordinanceData.filter(o => {
        const text = `
            ${o.section_no}
            ${o.ordinance_title}
            ${o.ordinance_description}
        `.toLowerCase();
        return text.includes(searchQuery.toLowerCase());
        });

        let html = `
        <div class="card-table">

            <div class="table-header column">
            <h3>Municipal Ordinances</h3>

            <div class="search-wrapper below-title">
                <i class="fa fa-search search-icon"></i>
                <input
                type="text"
                id="ordinanceSearch"
                class="form-control search-input"
                placeholder="Search section, title, description..."
                value="${searchQuery}"
                >
            </div>
            </div>

            <div class="row g-3 mt-2">
        `;

        if (!filtered.length) {
        html += `
            <div class="col-12 text-center text-muted">
            No ordinances found
            </div>
        `;
        }

        filtered.forEach(o => {
        html += `
            <div class="col-lg-4 col-md-6">
                <div class="card h-100 shadow-sm ordinance-card">
                    <div class="card-body">
                    <span class="badge bg-primary mb-2">
                        ${o.section_no}
                    </span>

                    <h5 class="fw-bold mt-2">
                        ${o.ordinance_title}
                    </h5>

                    <p class="text-muted small mt-2">
                        ${o.ordinance_description}
                    </p>
                    </div>

                    <div class="card-footer bg-light d-flex justify-content-between align-items-center">
                        <span class="fw-bold text-danger">
                            ₱ ${Number(o.penalty_fee).toLocaleString()}
                        </span>

                        <button 
                            class="btn btn-sm btn-outline-primary edit-ordinance-btn"
                            data-id="${o.id}"
                            title="Edit Ordinance"
                        >
                            <i class="fa fa-edit"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        });

        html += `
            </div>
        </div>
        `;

        container.innerHTML = html;

        setupSearchHandler();
        setupEditHandlers();
    }
    /*========================
            edit handlers
     =======================*/
    function setupEditHandlers() {
        document.querySelectorAll('.edit-ordinance-btn').forEach(btn => {
            btn.addEventListener('click', () => {
            const ordinanceId = btn.dataset.id;
            openEditOrdinanceForm(ordinanceId);
            });
        });
    }


    /* ===============================
        SEARCH HANDLER
    =============================== */
    function setupSearchHandler() {
    const input = document.getElementById('ordinanceSearch');
    if (!input) return;

    const handleSearch = debounce(() => {
        // 🔐 Save cursor position
        const cursorPos = input.selectionStart;

        searchQuery = input.value;
        renderOrdinanceCards();

        // 🔁 Restore cursor after re-render
        const newInput = document.getElementById('ordinanceSearch');
        if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(cursorPos, cursorPos);
        }
    }, 300);

    input.addEventListener('input', handleSearch);
    }
    function debounce(fn, delay = 300) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
    }


    // ==========================
    // add ordinance form
    // =========================
    const form = document.getElementById('ordinanceForm');
    function renderAddOrdinanceForm() {
    container.innerHTML = `
        <div class="card-table" style="max-width:700px;margin:auto;">
        <div class="table-header">
            <h3>Add Municipal Ordinance</h3>
        </div>

        <form id="ordinanceForm">
            <div class="form-group mb-3">
            <label>Section No.</label>
            <input type="text" name="section_no" class="form-control" required>
            </div>

            <div class="form-group mb-3">
            <label>Ordinance Title</label>
            <input type="text" name="ordinance_title" class="form-control" required>
            </div>

            <div class="form-group mb-3">
            <label>Ordinance Description</label>
            <textarea 
                name="ordinance_description" 
                class="form-control" 
                rows="4"
                required
            ></textarea>
            </div>

            <div class="form-group mb-4">
            <label>Penalty Fee (₱)</label>
            <input 
                type="number" 
                name="penalty_fee" 
                class="form-control"
                min="0"
                step="0.01"
                required
            >
            </div>

            <button type="submit" class="btn-add">
            <i class="fa fa-save"></i> Save Ordinance
            </button>
        </form>
        </div>
    `;

    // OPTIONAL: temporary submit handler (frontend only)
    document
    .getElementById('ordinanceForm')
    .addEventListener('submit', async e => {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);

        try {
        const res = await apiFetch('/api/munisOrdinance/add', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'
            },
            body: JSON.stringify(Object.fromEntries(formData))
        });

        const data = await res.json();

        if (data.success) {
            showMessage('✅ Ordinance saved successfully', 'success');
            form.reset();
        } else {
            showMessage(data.message || 'Failed to save ordinance', 'error');
        }
        } catch (err) {
        console.error('Save ordinance error:', err);
        showMessage('Server error while saving ordinance', 'error');
        }
    });

    }

    /*========================
        edit button
    =========================*/
    function openEditOrdinanceForm(id) {
    const ordinance = ordinanceData.find(o => o.id == id);
    if (!ordinance) return;

    container.innerHTML = `
        <div class="card-table" style="margin:auto;">
        <div class="table-header">
            <h3>Edit Municipal Ordinance</h3>
        </div>

        <form id="editOrdinanceForm">
            <input type="hidden" name="editOrdinanceId" value="${ordinance.id}">

            <div class="form-group mb-3">
            <label>Section No.</label>
            <input type="text" name="section_no" class="form-control" value="${ordinance.section_no}" required>
            </div>

            <div class="form-group mb-3">
            <label>Ordinance Title</label>
            <input type="text" name="ordinance_title" class="form-control" value="${ordinance.ordinance_title}" required>
            </div>

            <div class="form-group mb-3">
            <label>Ordinance Description</label>
            <textarea class="form-control" name="ordinance_description" rows="4" required>${ordinance.ordinance_description}</textarea>
            </div>

            <div class="form-group mb-4">
            <label>Penalty Fee (₱)</label>
            <input type="number" name="penalty_fee" class="form-control" value="${ordinance.penalty_fee}" required>
            </div>

            <button type="submit" class="btn-add">
            <i class="fa fa-save"></i> Update Ordinance
            </button>
        </form>
        </div>
    `;

        document.getElementById('editOrdinanceForm')
            .addEventListener('submit', submitEditOrdinance);
    }

    async function submitEditOrdinance(e) {
    e.preventDefault();

    const form = e.target;

    const id = form.querySelector('input[name="editOrdinanceId"]').value;

    const payload = {
        section_no: form.querySelector('input[name="section_no"]').value,
        ordinance_title: form.querySelector('input[name="ordinance_title"]').value,
        ordinance_description: form.querySelector('textarea[name="ordinance_description"]').value,
        penalty_fee: form.querySelector('input[name="penalty_fee"]').value
    };

    try {
        const res = await apiFetch(`/api/munisOrdinance/update/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
        throw new Error(data.message || 'Update failed');
        }

        showMessage('✅ Ordinance updated successfully', 'success');

        // reload list
        await loadOrdinances();
        renderOrdinanceCards();

    } catch (err) {
        console.error('Edit ordinance error:', err);
        showMessage(err.message, 'error');
    }
    }

    Object.keys(menuMap).forEach(id => {
        const menuItem = document.getElementById(id);
        if (menuItem) menuItem.addEventListener('click', () => {
            const menu = menuMap[id];
            menu.action();
            if(navbarTitle) navbarTitle.textContent = menu.title;
        });
    });
    await loadOrdinances();
    renderOrdinanceCards();
});
