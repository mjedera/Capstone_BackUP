window.initAdminSettings = function() {

    let bantayDagatCache = [];
    // -------------------------------
    // LOGO SETTINGS ELEMENTS
    // -------------------------------
    const logoFileInput = document.getElementById('logoFile');
    const logoPreview = document.getElementById('logoPreview');
    const uploadBtn = document.getElementById('uploadLogoBtn');
    const removeBtn = document.getElementById('removeLogoBtn');
    const logoMsg = document.getElementById('logoMsg');
    // -------------------------------
    // ADMIN ACCOUNT ELEMENTS
    // -------------------------------
    const newAdminForm = document.getElementById('newAdminForm');
    const adminMsg = document.getElementById('adminMsg');
    const clearAdminBtn = document.getElementById('clearAdminBtn');

    // -------------------------------
    // BANTAY DAGAT ELEMENTS
    // -------------------------------
    loadBantayDagatTable();

    // -----------------------
    // Load Logo
    // -----------------------
    const navLogo = document.getElementById('navlogo'); 
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

    // -------------------------------
    // MESSAGE FUNCTION
    // -------------------------------
    function showAdminMessage(msg, type='success', duration=3000) {
        const messageBox = document.getElementById('messageBox');
        if(!messageBox) return;
        messageBox.textContent = msg;
        messageBox.className = `message-box show ${type}`;
        setTimeout(()=>{ messageBox.classList.remove('show'); }, duration);
    }
    // -------------------------------
    // LOGO PREVIEW CHANGE
    // -------------------------------
    logoFileInput?.addEventListener('change', () => {
        const file = logoFileInput.files[0];
        if(file){
            const reader = new FileReader();
            reader.onload = e => {
                logoPreview.src = e.target.result;
                logoPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            loadLogo();
        }
    });

    // -------------------------------
    // UPLOAD LOGO
    // -------------------------------
    uploadBtn?.addEventListener('click', async () => {
        if(!logoFileInput.files[0]){
            showAdminMessage('Select a file first.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('logo', logoFileInput.files[0]);
        formData.append('oldLogo', logoPreview.src.replace(window.location.origin, ''));

        try {
            showAdminMessage("Uploading logo...", "info");
            const res = await apiFetch('/api/admin/logo', { method:'POST', body: formData });
            const data = await res.json();
            if(res.ok){
                showAdminMessage(data.message || "Logo uploaded successfully!", "success");
                loadLogo();
            } else {
                showAdminMessage(data.message || "Logo upload failed.", "error");
            }
        } catch(err){
            console.error(err);
            showAdminMessage('Upload failed.', 'error');
        }
    });

    // -------------------------------
    // REMOVE LOGO
    // -------------------------------
    removeBtn?.addEventListener('click', async () => {
        try {
            const res = await apiFetch('/api/admin/logo', { 
                method:'DELETE', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logoPath: logoPreview.src.replace(window.location.origin, '') })
            });
            const data = await res.json();
            if(res.ok){
                showAdminMessage(data.message || "Logo removed successfully!", "success");
                loadLogo();
            } else {
                showAdminMessage(data.message || "Remove failed.", "error");
            }
        } catch(err){
            console.error(err);
            showAdminMessage('Remove failed.', 'error');
        }
    });

    // -------------------------------
    // CREATE NEW BANTAY DAGAT ACCOUNT
    // -------------------------------
    function bindBantayDagatSubmit(form) {
    if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn.disabled) return; // prevent double submit
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';
            // -------------------------------
        // GET ALL INPUT VALUES
        // -------------------------------
        
        const firstName = document.getElementById('first_name').value.trim();
        const middleName = document.getElementById('middle_name').value.trim() || ''; // optional
        const lastName = document.getElementById('last_name').value.trim();
        const extraName = document.getElementById('extra_name').value.trim() || '';
        const age = document.getElementById('age').value.trim();
        const sex = document.getElementById('sex').value;
        const maritalStatus = document.getElementById('marital_status').value;
        const birthday = document.getElementById('birthday').value;
        const address = document.getElementById('addressInput').value.trim();
        const username = document.getElementById('bantayUsername').value.trim();
        const password = document.getElementById('bantayPassword').value.trim();
        const confirm = document.getElementById('bantayPasswordConfirm').value.trim();
        const photoInput = form.querySelector('#bantay_photo');
        const photoFile = photoInput?.files?.[0] || null;


        // -------------------------------
        // VALIDATION
        // -------------------------------
        if (!firstName || !lastName || !age || !sex || !maritalStatus || !birthday || !address || !username || !password || !confirm ) {
            showAdminMessage("All fields must be filled out.", "error");
            submitBtn.disabled = false;
            submitBtn.textContent = form.dataset.editId ? 'Update Account' : 'Create Account';
            return;
        }


        if (password !== confirm) {
            showAdminMessage("Passwords do not match.", "error");
            submitBtn.disabled = false;
            submitBtn.textContent = form.dataset.editId ? 'Update Account' : 'Create Account';
            return;
        }


        
        // -------------------------------
        // CREATE FORM DATA
        // -------------------------------
        const formData = new FormData();
        formData.append('first_name', firstName);
        formData.append('middle_name', middleName);
        formData.append('last_name', lastName);
        formData.append('extra_name', extraName);
        formData.append('age', age);
        formData.append('sex', sex);
        formData.append('marital_status', maritalStatus);
        formData.append('birthday', birthday);
        formData.append('address', address);
        formData.append('username', username);
        formData.append('password', password);
        if (photoFile) {
            formData.append('bantay_dagat_photo', photoFile);
        }


        // -------------------------------
        // SEND TO BACKEND
        // -------------------------------
        try {
            const isEdit = form.dataset.editId;
            const url = isEdit
            ? `/api/bantay-dagat/${isEdit}`
            : '/api/bantay-dagat/add';

            const method = isEdit ? 'PUT' : 'POST';

            const res = await apiFetch(url, { method, body: formData });

            const data = await res.json();
            if (res.ok) {
                showAdminMessage(data.message || "Bantay Dagat Account created successfully!", "success");

                delete form.dataset.editId;
                form.reset();

                // ✅ RESET SUBMIT BUTTON STATE
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';

                loadBantayDagatTable();
                closeModal();

                const photoPreview = form.querySelector('#bantay_photo_preview');
                if (photoPreview) {
                    photoPreview.src = '';
                    photoPreview.style.display = 'none';
                }
            } else {
                showAdminMessage(data.message || "Failed to create Bantay Dagat Account.", "error");
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
            }
        } catch(err){
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
            console.error(err);
            showAdminMessage("Error creating Bantay Dagat Account.", "error");
        }
        });
    }

    // -------------------------------
    // CREATE NEW ADMIN
    // -------------------------------
    newAdminForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const first_name = document.getElementById('first_name').value.trim();
        const middle_name = document.getElementById('middle_name').value.trim();
        const extra_name = document.getElementById('extra_name').value.trim();
        const last_name = document.getElementById('last_name').value.trim();
        const role = document.getElementById('role').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('adminPassword').value.trim();
        const confirm = document.getElementById('adminPasswordConfirm').value.trim();

        adminMsg.textContent = "";
        adminMsg.style.color = "red";

        if (!username || !password || !confirm || !first_name || !last_name || !role) {
            showAdminMessage("All fields are required.", "error");
            console.log(first_name,middle_name,extra_name,last_name,role,username,password);
            return;
        }

        if (password !== confirm) {
            showAdminMessage("Passwords do not match.", "error");
            return;
        }

        try {
            const res = await apiFetch('/add-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password,first_name,middle_name,extra_name,last_name,role })
            });
            const data = await res.json();
            if(res.ok){
                showAdminMessage(data.message || "Admin created successfully!", "success");
                newAdminForm.reset();
            } else {
                showAdminMessage(data.message || "Failed to create admin.", "error");
            }
        } catch (err) {
            console.error(err);
            showAdminMessage("Error creating admin.", "error");
        }
    });

    // -------------------------------
    // CLEAR FORM
    // -------------------------------
    clearAdminBtn?.addEventListener('click', () => {
        const form = document.getElementById('newBantayDagatForm');
        if (!form) return;

        form.reset();

        const photoPreview = form.querySelector('#bantay_photo_preview');
        if (photoPreview) {
            photoPreview.src = '';
            photoPreview.style.display = 'none';
        }

        adminMsg.textContent = "";
    });


    // -------------------------------
// LOAD ALL BANTAY DAGAT (MFLET TABLE)
// -------------------------------
async function loadBantayDagatTable() {
    try {
        const res = await apiFetch('/api/bantay-dagat/all');
        const data = await res.json();

        const tbody = document.getElementById('applicantTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!data.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">
                        No Bantay Dagat records found
                    </td>
                </tr>
            `;
            return;
        }

       bantayDagatCache = data;
        renderBantayDagatTable(data);

    } catch (err) {
        console.error('Failed to load Bantay Dagat:', err);
    }
}
// =============================================================
// ================ search render table ========================
const mfletSearch = document.getElementById('mfletSearch');
mfletSearch?.addEventListener('input', () => {
    const keyword = mfletSearch.value.toLowerCase().trim();

    const filtered = bantayDagatCache.filter(b => {
        const fullName = [
            b.first_name,
            b.middle_name,
            b.last_name,
            b.extra_name
        ].join(' ').toLowerCase();

        return (
            fullName.includes(keyword) ||
            b.address.toLowerCase().includes(keyword) ||
            b.sex.toLowerCase().includes(keyword) ||
            b.marital_status.toLowerCase().includes(keyword)
        );
    });

    renderBantayDagatTable(filtered);
});

function renderBantayDagatTable(data) {
    const tbody = document.getElementById('applicantTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">
                    No matching records found
                </td>
            </tr>
        `;
        return;
    }

    data.forEach((b, index) => {
        const fullName = [
            b.first_name,
            b.middle_name,
            b.last_name,
            b.extra_name
        ].filter(Boolean).join(' ');

        const birthdate = b.birthdate
            ? new Date(b.birthdate).toLocaleDateString()
            : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-center">${index + 1}</td>
            <td>${fullName}</td>
            <td>${b.age}</td>
            <td>${b.sex}</td>
            <td>${birthdate}</td>
            <td>${b.address}</td>
            <td>${b.marital_status}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary view-btn" data-id="${b.id}">
                    View
                </button>
                <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${b.id}">
                    Edit
                </button>
                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${b.id}">
                    Delete
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const bantay = bantayDagatCache.find(b => b.id == id);
             openEditBantayModal(bantay);
        });
    });
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const id = btn.dataset.id;

        if (!confirm('Are you sure you want to delete this Bantay Dagat account?')) {
            return;
        }

            try {
                const res = await apiFetch(`/api/bantay-dagat/${id}`, {
                    method: 'DELETE'
                });

                const data = await res.json();

                if (res.ok) {
                    showAdminMessage(data.message || 'Account deleted successfully.', 'success');
                    loadBantayDagatTable();
                } else {
                    showAdminMessage(data.message || 'Failed to delete account.', 'error');
                }
            } catch (err) {
                console.error(err);
                showAdminMessage('Delete failed.', 'error');
            }
        });
    });
    tbody.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const bantay = bantayDagatCache.find(b => b.id == id);
            openViewBantayModal(bantay);
        });
    });


}

    // =======================================================
    // =============== add new bantay dagat modal ============
    const addNewBtn = document.getElementById('addNewBtn');
    const modalContainer = document.getElementById('addBantayModalContainer');

    addNewBtn?.addEventListener('click', async () => {
    if (!modalContainer.innerHTML.trim()) {
        const res = await fetch('/partials/addNewBantayDagatAcc.html');
        modalContainer.innerHTML = await res.text();
    }

    document.getElementById('addBantayDagatModal').style.display = 'flex';

    // ✅ PHOTO PREVIEW CODE GOES HERE
    const photoInput = document.getElementById('bantay_photo');
    const photoPreview = document.getElementById('bantay_photo_preview');

    photoInput?.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            photoPreview.src = e.target.result;
            photoPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
        } else {
        photoPreview.src = '';
        photoPreview.style.display = 'none';
        }
    });

    // ✅ bind submit AFTER modal exists
    const newBantayDagatForm = document.getElementById('newBantayDagatForm');
    bindBantayDagatSubmit(newBantayDagatForm);

    document.getElementById('closeAddBantayModal').onclick = closeModal;
    document.getElementById('cancelAddBantay').onclick = closeModal;
    });


function closeModal() {
    const modal = document.getElementById('addBantayDagatModal');
    modal.style.display = 'none';

    const form = document.getElementById('newBantayDagatForm');
    if (form) {
        form.reset(); // ✅ RESET FORM FIELDS

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';

        delete form.dataset.editId;

        // reset photo preview
        const photoPreview = form.querySelector('#bantay_photo_preview');
        if (photoPreview) {
            photoPreview.src = '';
            photoPreview.style.display = 'none';
        }
    }
}
function closeViewModal() {
    document.getElementById('viewBantayModal').style.display = 'none';
}

// ✅ EXPOSE TO GLOBAL SCOPE
window.closeViewModal = closeViewModal;



    // ================================================================
    // ======================== edit modal ============================
async function openEditBantayModal(bantay) {
    // 🔒 Ensure modal HTML exists
    if (!document.getElementById('addBantayDagatModal')) {
        const res = await fetch('/partials/addNewBantayDagatAcc.html');
        modalContainer.innerHTML = await res.text();

        // bind submit AFTER modal loads
        const form = document.getElementById('newBantayDagatForm');
        bindBantayDagatSubmit(form);

        // photo preview
        const photoInput = document.getElementById('bantay_photo');
        const photoPreview = document.getElementById('bantay_photo_preview');

        photoInput?.addEventListener('change', () => {
            const file = photoInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = e => {
                    photoPreview.src = e.target.result;
                    photoPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                photoPreview.src = '';
                photoPreview.style.display = 'none';
            }
        });

        document.getElementById('closeAddBantayModal').onclick = closeModal;
        document.getElementById('cancelAddBantay').onclick = closeModal;
    }

    // ✅ Now modal DEFINITELY exists
    const modal = document.getElementById('addBantayDagatModal');
    modal.style.display = 'flex';

    const form = document.getElementById('newBantayDagatForm');
    form.dataset.editId = bantay.id;

    // Prefill fields
    form.querySelector('#first_name').value = bantay.first_name;
    form.querySelector('#middle_name').value = bantay.middle_name || '';
    form.querySelector('#last_name').value = bantay.last_name;
    form.querySelector('#extra_name').value = bantay.extra_name || '';
    form.querySelector('#age').value = bantay.age;
    form.querySelector('#sex').value = bantay.sex;
    form.querySelector('#marital_status').value = bantay.marital_status;
    form.querySelector('#birthday').value = bantay.birthdate?.split('T')[0];
    form.querySelector('#addressInput').value = bantay.address;
    form.querySelector('#bantayUsername').value = bantay.username; 

    // UI text
    form.querySelector('button[type="submit"]').textContent = 'Update Account';
}


    // =========================== view bantay dagat ==================================
function openViewBantayModal(bantay) {
    const modal = document.getElementById('viewBantayModal');
    const body = document.getElementById('viewBantayBody');

    body.innerHTML = `
      <div class="bantay-about-card">

        <div class="bantay-about-title">
          Bantay Dagat Profile
        </div>

        <div class="bantay-about-grid">

          <div class="bantay-about-item">
            <span>Full Name</span>
            <strong>
              ${[
                bantay.first_name,
                bantay.middle_name,
                bantay.last_name,
                bantay.extra_name
              ].filter(Boolean).join(' ')}
            </strong>
          </div>

          <div class="bantay-about-item">
            <span>Username</span>
            <strong>${bantay.username}</strong>
          </div>

          <div class="bantay-about-item">
            <span>Age</span>
            <strong>${bantay.age}</strong>
          </div>

          <div class="bantay-about-item">
            <span>Sex</span>
            <strong>${bantay.sex}</strong>
          </div>

          <div class="bantay-about-item">
            <span>Marital Status</span>
            <strong>${bantay.marital_status}</strong>
          </div>

          <div class="bantay-about-item">
            <span>Birthdate</span>
            <strong>
              ${bantay.birthdate
                ? new Date(bantay.birthdate).toLocaleDateString()
                : ''}
            </strong>
          </div>

          <div class="bantay-about-item full">
            <span>Address</span>
            <strong>${bantay.address}</strong>
          </div>

        </div>

        ${
          bantay.bantay_dagat_photo
            ? `
            <div style="margin-top:24px;text-align:center">
              <img
                src="${bantay.bantay_dagat_photo}"
                alt="Bantay Dagat Photo"
                style="
                  width:160px;
                  height:160px;
                  object-fit:cover;
                  border-radius:12px;
                  border:4px solid rgba(43,108,176,0.2);
                  box-shadow:0 8px 20px rgba(43,108,176,0.2);
                "
              />
            </div>
          `
            : ''
        }

      </div>
    `;

    modal.style.display = 'flex';
}

};
