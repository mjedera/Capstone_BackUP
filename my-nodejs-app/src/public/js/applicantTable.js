window.initApplicantTable = function() {
  function closeViewApplicantModal() {
    document.getElementById('viewApplicantModal').style.display = 'none';
}

// expose for onclick
window.closeViewApplicantModal = closeViewApplicantModal;

  const passwordHint = document.getElementById('passwordHint');
    const applicantModalEl = document.getElementById('applicantModal');
    if (!applicantModalEl) return;

    const applicantModal = new bootstrap.Modal(applicantModalEl);
    const applicantForm = document.getElementById('applicantForm');
    const tableBody = document.querySelector('.table tbody');
    const modalTitle = document.getElementById('applicantModalLabel');
    const submitBtn = applicantModalEl.querySelector('button[type="submit"]');
    const photoInput = document.getElementById('photo');
    const photoPreview = document.getElementById('photoPreview');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const addressInput = document.getElementById('address');
    const suggestions = document.getElementById('suggestions');
    const dropdownBtn = document.getElementById('dropdownBtn');

    let currentApplicantId = null;
    let currentFocus = -1;
 
    // -------------------------------
    // PAGINATION VARIABLES
    // -------------------------------
    let allApplicants = [];
    let currentPage = 1;
    const rowsPerPage = 10;

    const barangays = [
        "Amagusan","Calintaan","Canlabian","Cogon","Capacuhan",
        "Kagingkingan","Lewing","Look","Mainit","Mahalo",
        "Manigawng","Poblacion","San Vicente","Tagup on"
    ];
    function confirmAction(message) {
    return new Promise(resolve => {
        const modal = document.getElementById('confirmDeleteModal');
        const msgEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');

        msgEl.textContent = message;
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
    }

    // -------------------------------
    // VALIDATION FUNCTIONS
    // -------------------------------
    function validateNameFields() {
        const first = document.getElementById("firstname");
        const middle = document.getElementById("middlename");
        const last = document.getElementById("lastname");
        const nameRegex = /^[A-Za-z\s'-]+$/;
        [first, middle, last].forEach(el => el.classList.remove("is-invalid"));
        let valid = true;
        if (!nameRegex.test(first.value.trim())) { first.classList.add("is-invalid"); valid = false; }
        if (middle.value.trim() && !nameRegex.test(middle.value.trim())) { middle.classList.add("is-invalid"); valid = false; }
        if (!nameRegex.test(last.value.trim())) { last.classList.add("is-invalid"); valid = false; }
        return valid;
    }

    function validateAgeField() {
        const ageInput = document.getElementById('age');
        ageInput.classList.remove('is-invalid');
        if (!ageInput.value || isNaN(ageInput.value) || Number(ageInput.value) <= 0) {
            ageInput.classList.add('is-invalid');
            return false;
        }
        return true;
    }

    function validateSelectFields() {
        const fields = ['sex', 'status', 'applicantType'];
        let valid = true;
        fields.forEach(id => {
            const el = document.getElementById(id);
            el.classList.remove('is-invalid');
            if (!el.value) { el.classList.add('is-invalid'); valid = false; }
        });
        return valid;
    }

    // -------------------------------
    // USERNAME & PASSWORD
    // -------------------------------
    function generateUsername(first,last){
        if(!first||!last) return '';
        return `${first.trim().toLowerCase()}.${last.trim().toLowerCase()}`;
    }

    function generatePasswordFromBirthdate(date) {
        if (!date) return "";
        const d = new Date(date);
        if (isNaN(d)) return "";
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    function updateCredentials(){
        const first = document.getElementById('firstname').value;
        const last = document.getElementById('lastname').value;
        if(usernameInput) usernameInput.value = generateUsername(first,last);
        if (passwordInput && !currentApplicantId) {
            const bday = document.getElementById('birthdate').value;
            passwordInput.value = generatePasswordFromBirthdate(bday);
        }
    }

    // -------------------------------
    // MODAL HANDLERS
    // -------------------------------
    document.getElementById('addNewBtn')?.addEventListener('click', ()=>{
        applicantForm.reset();
        photoPreview.style.display='none';
        currentApplicantId = null;
        modalTitle.textContent = 'Applicant Information';
        submitBtn.textContent = 'Submit';
        passwordInput.value = '';
        updateCredentials();
        passwordHint.style.display = 'none';
        applicantModal.show();
    });
        
    document.getElementById('birthdate')?.addEventListener('change', () => {
        const bday = document.getElementById('birthdate').value;
        passwordInput.value = generatePasswordFromBirthdate(bday);
    });

    document.getElementById('modalCloseBtn')?.addEventListener('click', ()=>applicantModal.hide());
    document.getElementById('modalFooterClose')?.addEventListener('click', ()=>applicantModal.hide());
    document.getElementById('firstname')?.addEventListener('input', updateCredentials);
    document.getElementById('lastname')?.addEventListener('input', updateCredentials);

    // -------------------------------
    // PHOTO PREVIEW
    // -------------------------------
    photoInput?.addEventListener('change', function(){
        const file = this.files[0];
        if(file){
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

    // -------------------------------
    // ADDRESS AUTOCOMPLETE
    // -------------------------------
    function showSuggestions(filter='') {
        suggestions.innerHTML = '';
        const filtered = filter ? barangays.filter(b => b.toLowerCase().includes(filter.toLowerCase())) : [...barangays];
        filtered.forEach(b=>{
            const div = document.createElement('div');
            div.textContent = `${b}, Anahawan, Southern Leyte, 6610`;
            div.addEventListener('click', ()=>{ 
                addressInput.value = div.textContent; 
                hideSuggestions(); 
            });
            suggestions.appendChild(div);
        });
        suggestions.style.display = filtered.length ? 'block' : 'none';
        currentFocus = -1;
    }

    function hideSuggestions(){
        suggestions.style.display='none';
        suggestions.innerHTML='';
        currentFocus=-1;
    }

    function addActive(items){
        if(!items) return false;
        removeActive(items);
        if(currentFocus>=items.length) currentFocus=0;
        if(currentFocus<0) currentFocus=items.length-1;
        items[currentFocus].classList.add('active');
    }

    function removeActive(items){
        for(let i=0;i<items.length;i++) items[i].classList.remove('active');
    }

    addressInput?.addEventListener('input', ()=>showSuggestions(addressInput.value));
    addressInput?.addEventListener('keydown', (e)=>{
        const items = suggestions.getElementsByTagName('div');
        if(!items || items.length===0) return;
        if(e.key==='ArrowDown'){ currentFocus++; addActive(items); e.preventDefault(); }
        else if(e.key==='ArrowUp'){ currentFocus--; addActive(items); e.preventDefault(); }
        else if(e.key==='Enter'){ e.preventDefault(); if(currentFocus>-1 && items[currentFocus]) items[currentFocus].click(); }
        else if(e.key==='Escape'){ hideSuggestions(); }
    });

    dropdownBtn?.addEventListener('click', ()=>{ 
        if(suggestions.style.display==='block') hideSuggestions(); 
        else{ showSuggestions(); addressInput.focus(); }
    });

    applicantModalEl.addEventListener('hidden.bs.modal', hideSuggestions);

    // -------------------------------
    // FORM SUBMISSION
    // -------------------------------
    applicantForm?.addEventListener('submit', async (e)=>{
        e.preventDefault();

    if (!validateNameFields()) {
        showMessage("Please fix the fields highlighted in red.", "error");
        return;
    }

    if (!validateAgeField()) {
        showMessage("Please enter a valid age.", "error");
        return;
    }

    if (!validateSelectFields()) {
        showMessage("Please select Sex, Status, and Applicant Type.", "error");
        return;
    }


        const formData = new FormData(applicantForm);

        const firstName = document.getElementById('firstname').value;
        const lastName = document.getElementById('lastname').value;
        const fullName = `${firstName} ${lastName}`;

        // Map frontend input IDs to backend keys
        formData.set('first_name', firstName);
        formData.set('middle_name', document.getElementById('middlename').value);
        formData.set('last_name', lastName);
        formData.set('extra_name', document.getElementById('extraname').value);
        formData.set('marital_status', document.getElementById('status').value);
        formData.set('applicant_type', document.getElementById('applicantType').value);
        formData.set('age', document.getElementById('age').value);
        formData.set('sex', document.getElementById('sex').value);
        formData.set('birthdate', document.getElementById('birthdate').value);
        formData.set('address', document.getElementById('address').value);

        if(!currentApplicantId){
            formData.set('username', usernameInput.value);
            formData.set('password', passwordInput.value);
        } else {
            // Editing: only update password if filled
            if(passwordInput.value.trim()) formData.set('password', passwordInput.value.trim());
        }

        if(photoInput.files[0]) formData.set('applicant_photo', photoInput.files[0]);

        const method = currentApplicantId ? 'PUT' : 'POST';
        const url = currentApplicantId ? `/api/applicants/${currentApplicantId}` : `/api/applicants/create`;

        if(method==='PUT'){ formData.delete('username'); }

        try{
            const res = await fetch(url, { method, body: formData });
            if(!res.ok) throw new Error(`Server error ${res.status}`);
            applicantModal.hide();
            fetchApplicants();
            showMessage(currentApplicantId ? `Applicant "${fullName}" updated successfully!` : `Applicant "${fullName}" added successfully!`);
        }catch(err){
            console.error(err);
            showMessage('Failed to submit applicant. Applicant may already exist or photo upload failed.',"error");
        }
    });

    // -------------------------------
    // FETCH, RENDER, EDIT, DELETE WITH PAGINATION
    // -------------------------------
    document.addEventListener('shown.bs.dropdown', function (e) {
    const menu = e.target.querySelector('.dropdown-menu');
    if (!menu) return; // ✅ prevent crash

    const rect = menu.getBoundingClientRect();

    if (rect.bottom > window.innerHeight) {
        menu.style.top = 'auto';
        menu.style.bottom = '100%';
    } else {
        menu.style.top = '';
        menu.style.bottom = '';
    }
    });


    async function fetchApplicants(){
        tableBody.innerHTML = '<tr><td colspan="9">Loading...</td></tr>';
        try{
            const res = await apiFetch('/api/applicants');     
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }

            allApplicants = await res.json();
            currentPage = 1;
            renderTablePage();
        }catch(err){
            console.error(err);
            tableBody.innerHTML='<tr><td colspan="9">Failed to load applicants.</td></tr>';
        }
    }

    function renderTablePage(){
        tableBody.innerHTML = '';
        if(allApplicants.length === 0){
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No applicants found.</td></tr>';
            renderPaginationControls();
            return;
        }

        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageApplicants = allApplicants.slice(start, end);

        pageApplicants.forEach((a,i)=>{
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="text-center">${start + i + 1}</td>
                <td>
                    ${a.firstname} ${a.middlename||''} ${a.lastname} ${a.extraname||''}
                </td>
                <td>${a.age}</td>
                <td>${a.sex}</td>
                <td>${a.birthdate ? new Date(a.birthdate).toLocaleDateString() : ''}</td>
                <td>${a.address}</td>
                <td>${a.status}</td>
                <td>${a.applicantType}</td>
                <td class="text-end ">
                    <div class="action-dropdown" >
                        <button class="btn btn-sm btn-light dropdown-toggle"
                        data-bs-toggle="dropdown"
                        data-bs-auto-close="outside"
                        aria-expanded="false"
                        title="Actions">
                        <i class="fa fa-ellipsis-v"></i>
                        </button>

                        <ul class="dropdown-menu dropdown-menu-end shadow-sm">

                        <li>
                            <button class="dropdown-item" data-action="view" data-id="${a.id}">
                            <i class="fa fa-user me-2 text-info"></i> View Profile
                            </button>
                        </li>

                        <li>
                            <button class="dropdown-item" data-action="register-vessel" data-id="${a.id}">
                            <i class="fa fa-ship me-2 text-primary"></i> Register Vessel
                            </button>
                        </li>

                        <li>
                            <button class="dropdown-item" data-action="register-gear" data-id="${a.id}">
                            <i class="fa fa-fish me-2 text-warning"></i> Register Fishing Gear
                            </button>
                        </li>

                        <li><hr class="dropdown-divider"></li>

                        <li>
                            <button class="dropdown-item" data-action="edit" data-id="${a.id}">
                            <i class="fa fa-edit me-2 text-success"></i> Edit
                            </button>
                        </li>

                        <li>
                            <button class="dropdown-item delete text-danger" data-action="delete" data-id="${a.id}">
                            <i class="fa fa-trash me-2"></i> Delete
                            </button>
                        </li>

                        </ul>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // attach action listeners
        tableBody.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const id = btn.dataset.id;

                if (action === 'edit') {
                    closeAllActionDropdowns();
                    editApplicant(id);

                } else if (action === 'delete') {
                    closeAllActionDropdowns();
                    deleteApplicant(id);

                } else if (action === 'register-vessel') {
                    closeAllActionDropdowns();
                    openRegisterVessel(id);

                } else if (action === 'register-gear') {
                    closeAllActionDropdowns();
                    openRegisterGear(id);
                }
                else if (action === 'view') {
                    closeAllActionDropdowns();
                    openViewApplicantById(id);
                }
            });
        });


        renderPaginationControls();
    }

    function renderPaginationControls(){
        let paginationRow = document.getElementById('paginationRow');
        if(!paginationRow){
            paginationRow = document.createElement('div');
            paginationRow.id = 'paginationRow';
            paginationRow.className = 'mt-2 d-flex justify-content-center align-items-center';
            tableBody.parentNode.after(paginationRow);
        }

        const totalPages = Math.ceil(allApplicants.length / rowsPerPage);

        paginationRow.innerHTML = `
            <button id="prevPageBtn" class="btn btn-secondary btn-sm" ${currentPage===1?'disabled':''}>Prev</button>
            <span class="mx-2">Page ${currentPage} of ${totalPages}</span>
            <button id="nextPageBtn" class="btn btn-secondary btn-sm" ${currentPage===totalPages?'disabled':''}>Next</button>
        `;

        document.getElementById('prevPageBtn')?.addEventListener('click', ()=>{
            if(currentPage>1){ currentPage--; renderTablePage(); }
        });

        document.getElementById('nextPageBtn')?.addEventListener('click', ()=>{
            if(currentPage<totalPages){ currentPage++; renderTablePage(); }
        });
    }

    function setInputValue(id,value){ const el=document.getElementById(id); if(el) el.value=value||''; }

    // -------------------------------
    // EDIT APPLICANT
    // -------------------------------
    // Make hint disappear when user starts typing
    passwordInput?.addEventListener('input', () => {
        const hint = document.getElementById('passwordHint');
        if(passwordInput.value.trim()){
            hint.style.display = 'none';
        } else {
            hint.style.display = 'block';
        }
    });

    // When editing an applicant
    async function editApplicant(id){
        try{
            const res = await fetch(`/api/applicants/${id}`);
            if(!res.ok) throw new Error(`HTTP ${res.status}`);
            const a = await res.json();
            currentApplicantId = id;
            modalTitle.textContent = `Edit Applicant #${id}`;
            submitBtn.textContent = 'Save Changes';

            // Populate input fields
            setInputValue('firstname', a.first_name);
            setInputValue('middlename', a.middle_name);
            setInputValue('lastname', a.last_name);
            setInputValue('extraname', a.extra_name);
            setInputValue('age', a.age);
            setInputValue('sex', a.sex);
            setInputValue('birthdate', a.birthdate ? new Date(a.birthdate).toISOString().substring(0,10) : '');
            setInputValue('address', a.address);
            setInputValue('status', a.marital_status);
            setInputValue('applicantType', a.applicant_type);

            // Show username (read-only)
            if(usernameInput){
                usernameInput.value = a.username;
                usernameInput.readOnly = true;
            }

            // Photo preview
            if(a.applicant_photo){
                photoPreview.src = a.applicant_photo;
                photoPreview.style.display = 'block';
            } else {
                photoPreview.src = '';
                photoPreview.style.display = 'none';
            }

            // Password empty by default and show hint
            passwordInput.value = '';
            const hint = document.getElementById('passwordHint');
            hint.style.display = 'block';
            
            applicantModal.show();
        } catch(err){ 
            console.error(err); 
            showMessage('Failed to load applicant for editing.'); 
        }
    }
    // -------------------------------
    // VIEW APPLICANT
    // -------------------------------
    async function openViewApplicantById(id) {
      try {
          const res = await fetch(`/api/applicants/${id}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const applicant = await res.json();
          openViewApplicantModal(applicant);

      } catch (err) {
          console.error(err);
          showMessage('Failed to load applicant details.', 'error');
      }
    }

    // -------------------------------
    // DELETE APPLICANT
    // -------------------------------
    async function deleteApplicant(id) {
    try {
        const resGet = await fetch(`/api/applicants/${id}`);
        if (!resGet.ok) throw new Error(`HTTP ${resGet.status}`);

        const applicant = await resGet.json();
        const fullName = `${applicant.first_name} ${applicant.last_name}`;

        const confirmed = await confirmAction(
        `Are you sure you want to delete "${fullName}"?`
        );

        if (!confirmed) {
        showMessage('Deletion cancelled.', 'warning');
        return;
        }

        const resDelete = await fetch(`/api/applicants/${id}`, {
        method: 'DELETE'
        });

        if (!resDelete.ok) throw new Error(`HTTP ${resDelete.status}`);

        fetchApplicants();
        showMessage(`Applicant "${fullName}" deleted successfully!`, 'danger');

    } catch (err) {
        console.error(err);
        showMessage('Failed to delete applicant.', 'error');
    }
    }

    // INITIAL FETCH
    fetchApplicants();

    // -------------------------------
    // SEARCH FUNCTIONALITY
    // -------------------------------
    const searchInput = document.getElementById('applicantSearch');
    searchInput?.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        if(!query) {
            fetchApplicants();
            return;
        }

        const filtered = allApplicants.filter(a => {
            const fullName = `${a.firstname} ${a.middlename || ''} ${a.lastname} ${a.extraname || ''}`.toLowerCase();
            const sex = (a.sex || '').toLowerCase();
            const status = (a.status || '').toLowerCase();
            const type = (a.applicantType || '').toLowerCase();
            const address = (a.address || '').toLowerCase();
            return fullName.includes(query) || sex.includes(query) || status.includes(query) || type.includes(query) || address.includes(query);
        });

        currentPage = 1;
        allApplicants = filtered;
        renderTablePage();
    });

    //==================================================================
    // ============== open register vessel form ========================
    // ================================================================ 
    async function generateVesselNo(applicantId) {
  const year = new Date().getFullYear();

  try {
    // Ask backend how many vessels this applicant already has
    const res = await fetch(`/api/registration/vessels/count/${applicantId}`);
    const data = await res.json();

    const nextCount = (data.count || 0) + 1;

    // Format: SOL-AA-2025-8-01
    return `SOL-AA-${year}-${applicantId}-${String(nextCount).padStart(2, '0')}`;
  } catch (err) {
    console.error(err);
    return `SOL-AA-${year}-${applicantId}-01`; // fallback
  }
}
function updateSaveButtonState() {
  const feeInput = document.getElementById('registrationFee');
  const saveBtn = document.getElementById('saveVesselBtn');

  if (!feeInput || !saveBtn) return;

  const fee = parseFloat(feeInput.value);

  // Enable only if fee is valid and > 0
  if (!isNaN(fee) && fee > 0) {
    saveBtn.disabled = false;
  } else {
    saveBtn.disabled = true;
  }
}

// =============================================
// =========== auto calculate fee ===============
// ==============================================
async function fetchRegistrationFeeByTonnage(tonnage) {
  const feeInput = document.getElementById('registrationFee');
  if (!feeInput) return;

  if (!tonnage || tonnage <= 0) {
    feeInput.value = '';
    return;
  }

  try {
    const res = await fetch(
      `/api/registration/registration-fee?tonnage=${tonnage}`
    );

    const data = await res.json();

    if (data.success) {
      feeInput.value = Number(data.fee).toFixed(2);
      updateSaveButtonState()
    } else {
      feeInput.value = 'N/A';
    }
  } catch (err) {
    console.error('Fee fetch error:', err);
    feeInput.value = 'N/A';
  }
}

// ==================================================
// AUTO-CALCULATE GROSS & NET TONNAGE
// ==================================================
function setupTonnageAutoCompute() {
  const lengthInput = document.getElementById('length');
  const breadthInput = document.getElementById('breadth');
  const depthInput = document.getElementById('depth');
  const grossInput = document.getElementById('grossTonnage');
  const netInput = document.getElementById('netTonnage');

  if (!lengthInput || !breadthInput || !depthInput) return;

  function computeTonnage() {
    const L = parseFloat(lengthInput.value) || 0;
    const B = parseFloat(breadthInput.value) || 0;
    const D = parseFloat(depthInput.value) || 0;

    if (L > 0 && B > 0 && D > 0) {
      const gross = L * B * D * 0.20;
      const net = gross * 0.90;

      grossInput.value = gross.toFixed(2);
      netInput.value = net.toFixed(2);
      fetchRegistrationFeeByTonnage(gross);
    } else {
      grossInput.value = '';
      netInput.value = '';
      document.getElementById('registrationFee').value = '';
    }
  }

  lengthInput.addEventListener('input', computeTonnage);
  breadthInput.addEventListener('input', computeTonnage);
  depthInput.addEventListener('input', computeTonnage);
}

async function openRegisterVessel(applicantId) {
  showMessage('Register Fishing Vessel for Applicant ID: ' + applicantId);
  const container = document.getElementById('vesselFormContainer');

  // Load vessel form
  const res = await fetch('/partials/vesselRegistrationForm.html');
  const html = await res.text();
  container.innerHTML = html;

  // ✅ CLOSE vessel form
const closeVesselBtn = document.getElementById('cancelVesselRegistrationForm');
  closeVesselBtn?.addEventListener('click', async () => {
  const confirmClose = await confirmAction(
    'Are you sure you want to close this form? Any unsaved changes will be lost.'
  );
  if (!confirmClose) return;

  container.style.display = 'none';
  container.innerHTML = '';
  document.getElementById('applicantTableContainer')
    ?.scrollIntoView({ behavior: 'smooth' });
});
  // ===============================
  // Vessel Type Toggle Logic
  // ===============================
  const motorizedRadio = document.querySelector('input[value="Motorized"]');
  const nonMotorizedRadio = document.querySelector('input[value="Non-Motorized"]');
  const dimensionsSection = document.getElementById('dimensionsSection');
  const engineSection = document.getElementById('engineSection');

  dimensionsSection.style.display = 'none';
  engineSection.style.display = 'none';

  motorizedRadio.addEventListener('change', () => {
    if (motorizedRadio.checked) {
      dimensionsSection.style.display = 'grid';
      engineSection.style.display = 'grid';
    }
  });

  nonMotorizedRadio.addEventListener('change', () => {
    if (nonMotorizedRadio.checked) {
      dimensionsSection.style.display = 'grid';
      engineSection.style.display = 'none';
    }
  });

  container.style.display = 'block';

  // 🔍 FIND applicant
  const applicant = allApplicants.find(a => a.id == applicantId);

  if (!applicant) {
    showMessage('Applicant data not found.', 'error');
    return;
  }

  // ✅ AUTO-FILL APPLICANT INFO
  document.getElementById('applicantNo').value = applicant.id;

  document.getElementById('ownerName').value =
    `${applicant.firstname} ${applicant.middlename || ''} ${applicant.lastname} ${applicant.extraname || ''}`.trim();

  document.getElementById('ownerAddress').value = applicant.address || '';

  // ✅ AUTO-GENERATE VESSEL NO
  const vesselNoInput = document.getElementById('vesselNo');
  if (vesselNoInput) {
    vesselNoInput.value = await generateVesselNo(applicantId);
  }
  setupTonnageAutoCompute();
//   ================================
//  ======= submit form =============
// ==================================
  const vesselForm = document.getElementById('vesselForm');
vesselForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(vesselForm);

  try {
    const res = await fetch('/api/registration/register-vessel', {
      method: 'POST',
      body: formData
    });

    const data = await res.json(); // ✅ read ONCE

    if (!res.ok) {
      showMessage(data.message || 'Failed to register vessel', 'error');
      return;
    }
    showMessage('Vessel registered successfully. Status: Pending', 'success');

    // ✅ HIDE REGISTRATION FORM AFTER SAVE
    container.style.display = 'none';
    container.innerHTML = '';

    // Optional UX: scroll back to table
    document.getElementById('applicantTableContainer')
      ?.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error(err);
    showMessage('Server error while saving vessel', 'error');
  }
});
  // Smooth scroll
  container.scrollIntoView({ behavior: 'smooth' });

}
//========================================================
// ========= generate gear no ============================
// ======================================================
async function generateGearNo(applicantId) {
  const year = new Date().getFullYear();

  try {
    const res = await fetch(`/api/registration/gears/count/${applicantId}`);
    const data = await res.json();

    const nextCount = (data.count || 0) + 1;

    return `GEAR-AA-${year}-${applicantId}-${String(nextCount).padStart(2, '0')}`;
  } catch (err) {
    console.error(err);
    return `GEAR-AA-${year}-${applicantId}-01`; // fallback
  }
}
// ===================================================
// ========== load gear registration =================
// =================================================
async function openRegisterGear(applicantId) {
  showMessage('Register Fishing Gear for Applicant ID: ' + applicantId);

  const container = document.getElementById('gearFormContainer');
    // Load vessel form
  const res = await fetch('/partials/gearsRegistrationForm.html');
  const html = await res.text();
  container.innerHTML = html;


  // ✅ CLOSE gear form
  const closeGearBtn = document.getElementById('cancelGearsRegistrationForm');
  closeGearBtn?.addEventListener('click', async () => {
  const confirmClose = await confirmAction(
    'Are you sure you want to close this form? Any unsaved changes will be lost.'
  );
  if (!confirmClose) return;

  container.style.display = 'none';
  container.innerHTML = '';
  document.getElementById('applicantTableContainer')
    ?.scrollIntoView({ behavior: 'smooth' });
});


  // 🔍 FIND applicant from cached list
  const applicant = allApplicants.find(a => a.id == applicantId);
  if (!applicant) {
    showMessage('Applicant not found', 'error');
    return;
  }
  container.style.display = 'block';
  // ✅ AUTO-FILL BASIC INFO
  document.getElementById('gearApplicantId').value = applicant.id;

  document.getElementById('ownerName').value =
    `${applicant.firstname} ${applicant.middlename || ''} ${applicant.lastname} ${applicant.extraname || ''}`.trim();

  document.getElementById('ownerAddress').value = applicant.address || '';

  // ✅ AUTO-GENERATE GEAR NO
  document.getElementById('gearNo').value =
    await generateGearNo(applicantId);
      // ✅ LOAD GEAR FEES FROM DB
      await loadGearFees();   // MUST be first
      calculateGearFee();    // optional initial compute

    // ================================
    // AUTO-CALCULATE GEAR FEE
    // ================================

    // attach listeners
    container.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', calculateGearFee);
      el.addEventListener('change', calculateGearFee);
    });


    const saveBtn = document.getElementById('saveGearBtn');
    if (saveBtn) saveBtn.disabled = true;

    // ==================================================
    // ========= submit gear registration form =========
    // =================================================
const gearForm = document.getElementById('gearForm');

gearForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // ✅ CREATE FormData FIRST
  const formData = new FormData(gearForm);

  // =====================================
  // ✅ Build Hand Instruments (single DB field)
  // =====================================
  const handInstruments = [];

  const speargun = document.getElementById('spear_gun').value;
  if (speargun > 0) handInstruments.push(`Speargun (${speargun})`);

  const scoopNet = document.getElementById('scoop_dip_net').value;
  if (scoopNet > 0) handInstruments.push(`Scoop/Dip Net (${scoopNet})`);

  const gaffHook = document.getElementById('gaff_hook').value;
  if (gaffHook > 0) handInstruments.push(`Gaff Hook (${gaffHook})`);

  const spears = document.getElementById('spears').value;
  if (spears > 0) handInstruments.push(`Spears (${spears})`);

  // overwrite field expected by backend
  formData.set('handInstruments', handInstruments.join(', '));

  const line_type = [];

  const long_line_small = document.getElementById('longLine500').value;
  if (long_line_small > 0) line_type.push(`Long line 500 hooks (${long_line_small})`);

  const lone_line_plus = document.getElementById('longLine500plus').value;
  if (lone_line_plus > 0) line_type.push(`Lone line 500+ hooks (${lone_line_plus})`);

  // overwrite field expected by backend
  formData.set('line_type', line_type.join(', '));

  const palubog_nets = [];

  const pang_ilak = document.getElementById('pang_ilak').value;
  if (pang_ilak > 0) palubog_nets.push(`Pang-ilak (${pang_ilak})`);

  const pang_longgot = document.getElementById('panglonggot').value;
  if (pang_longgot > 0) palubog_nets.push(`Panglonggot (${pang_longgot})`);

  const pang_mangodlong = document.getElementById('pang_mangodlong').value;
  if (pang_mangodlong > 0) palubog_nets.push(`Pang-mangodolong (${pang_mangodlong})`);

  const panghawol_hawol = document.getElementById('panghawol_hawol').value;
  if (panghawol_hawol > 0) palubog_nets.push(`Panghawol-hawol (${panghawol_hawol})`);

  const pangmangsi = document.getElementById('pangmangsi').value;
  if (pangmangsi > 0) palubog_nets.push(`Pangmangsi (${pangmangsi})`);

  // overwrite field expected by backend
  formData.set('palubog_nets', palubog_nets.join(', '));

  const nets = [];

  const bungsod = document.getElementById('bungsod').value;
  if (bungsod > 0) nets.push(`Bungsod (${bungsod})`);

  const palutawNets = document.getElementById('palutawNets').value;
  if (palutawNets > 0) nets.push(`Palutaw Nets (${palutawNets})`);

  const palaran = document.getElementById('palaran').value;
  if (palaran > 0) nets.push(`Palaran (${palaran})`);

  const pamawo = document.getElementById('pamawo').value;
  if (pamawo > 0) nets.push(`Pamawo (${pamawo})`);

  formData.set('nets', nets.join(', '));

  // =====================================
  // ✅ Ensure quantity fields are numbers
  // =====================================
  ['boboSmallQty', 'boboLargeQty', 'tambuanQty'].forEach(f => {
    if (!formData.get(f)) {
      formData.set(f, 0);
    }
  });

  // =====================================
  // ✅ Ensure application_date is NOT empty
  // =====================================
  if (!formData.get('application_date')) {
    const today = new Date().toISOString().split('T')[0];
    formData.set('application_date', today);
  }

  console.log([...formData.entries()]);

  try {
    const res = await fetch('/api/registration/register-gear', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || 'Failed to register gear', 'error');
      return;
    }

    showMessage(
      'Fishing gear registered successfully. Status: Pending',
      'success'
    );

    container.style.display = 'none';
    container.innerHTML = '';

  } catch (err) {
    console.error(err);
    showMessage('Server error while saving gear', 'error');
  }
});

  container.scrollIntoView({ behavior: 'smooth' });
}


    function closeAllActionDropdowns() {
    document
        .querySelectorAll('.dropdown-toggle')
        .forEach(btn => {
        const instance = bootstrap.Dropdown.getInstance(btn);
        if (instance) {
            instance.hide();
        }
        });
    }

    function openViewApplicantModal(a) {
    const modal = document.getElementById('viewApplicantModal');
    const body = document.getElementById('viewApplicantBody');
    console.log('Applicant photo:', a.applicant_photo);
    body.innerHTML = `
      <div class="bantay-about-card">

        <div class="bantay-about-title">
          Applicant Profile
        </div>

        <div class="bantay-about-grid">

          <div class="bantay-about-item">
            <span>Full Name</span>
            <strong>
              ${[
                a.first_name,
                a.middle_name,
                a.last_name,
                a.extra_name
              ].filter(Boolean).join(' ')}
            </strong>
          </div>

          <div class="bantay-about-item">
            <span>Age</span>
            <strong>${a.age}</strong>
          </div>

          <div class="bantay-about-item">
            <span>Sex</span>
            <strong>${a.sex}</strong>
          </div>

          <div class="bantay-about-item">
            <span>Birthdate</span>
            <strong>
              ${a.birthdate ? new Date(a.birthdate).toLocaleDateString() : ''}
            </strong>
          </div>

          <div class="bantay-about-item">
            <span>Status</span>
            <strong>${a.marital_status}</strong>
          </div>

          <div class="bantay-about-item">
            <span>Applicant Type</span>
            <strong>${a.applicant_type}</strong>
          </div>

          <div class="bantay-about-item full">
            <span>Address</span>
            <strong>${a.address}</strong>
          </div>

        </div>

        ${
          a.applicant_photo
            ? `
            <div style="margin-top:24px;text-align:center">
            <img
              src="${a.applicant_photo.startsWith('/') 
                ? a.applicant_photo 
                : `/applicant_photos/${a.applicant_photo}`}"
              alt="Applicant Photo"
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
// =============================================
// =========== load gear fees ==================
// =============================================
let gearFees = [];

async function loadGearFees() {
  try {
    const res = await fetch('/api/registration/gear-fees');

    if (!res.ok) {
      console.error('Gear fees request failed:', res.status);
      gearFees = [];
      return;
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error('Gear fees is not an array:', data);
      gearFees = [];
      return;
    }

    gearFees = data;
    console.log('✅ Loaded gear fees:', gearFees);
  } catch (err) {
    console.error('Failed to load gear fees:', err);
    gearFees = [];
  }
}
// =============================================
// ========== CALCULATE GEAR REGISTRATION FEE ===
// =============================================
function calculateGearFee() {
  let total = 0;
  function compute(gearCode, qty) {
    if (!qty || qty <= 0) return 0;
    let total = 0;
    // get ALL rules for this gear
    const rules = gearFees.filter(f =>
      f.gear_code === gearCode
    );
    rules.forEach(rule => {
      const min = Number(rule.min_units);
      const max = rule.max_units !== null ? Number(rule.max_units) : null;
      const fee = Number(rule.fee);
      // FLAT fee (ex: first 10 units)
      if (rule.fee_type === 'flat') {
        if (qty >= min) {
          total += fee;
        }
      }
      // PER UNIT fee (excess)
      if (rule.fee_type === 'per_unit') {
        let excessQty = 0;

        if (max === null && qty >= min) {
          excessQty = qty - (min - 1);
        }
        if (excessQty > 0) {
          total += excessQty * fee;
        }
      }
    });
    return total;
  }
    total += compute('spear_gun', Number(document.getElementById('spear_gun')?.value));
  // ===============================
  // TRAPS / BOBO
  // ===============================
  total += compute('bobo_small', Number(document.getElementById('boboSmallQty')?.value));
  total += compute('bobo_large', Number(document.getElementById('boboLargeQty')?.value));
  total += compute('tambuan', Number(document.getElementById('tambuanQty')?.value));

  // ===============================
  // LINES
  // ===============================
  total += compute('longline_small',
    Number(document.getElementById('longLine500')?.value));

  total += compute('longline_plus',
    Number(document.getElementById('longLine500plus')?.value));

  // ===============================
  // NETS
  // ===============================
  total += compute('bungsod', Number(document.getElementById('bungsod')?.value));
  total += compute('palutaw', Number(document.getElementById('palutawNets')?.value));
  total += compute('palaran', Number(document.getElementById('palaran')?.value));
  total += compute('pamawo', Number(document.getElementById('pamawo')?.value));

  // ===============================
  // PALUBOG NETS
  // ===============================
  total += compute('pang_ilak', Number(document.getElementById('pang_ilak')?.value));
  total += compute('pang_longgot', Number(document.getElementById('panglonggot')?.value));
  total += compute('pang_mangodolong', Number(document.getElementById('pang_mangodlong')?.value));
  total += compute('pang_hawol', Number(document.getElementById('panghawol_hawol')?.value));
  total += compute('pang_mangsi', Number(document.getElementById('pangmangsi')?.value));

  // ===============================
  // ACCESSORIES
  // ===============================
  const accessory = document.getElementById('accessories')?.value;
  if (accessory) {
    total += compute(accessory, 1);
  }

  // ===============================
  // FINAL
  // ===============================
  const feeInput =
  document.getElementById('renewal_fee') ||
  document.getElementById('registrationFee');
  const saveBtn = document.getElementById('saveGearBtn');

  feeInput.value = total > 0 ? total.toFixed(2) : '';
  saveBtn.disabled = total <= 0;
}
// -------------------------------
// MESSAGE HELPER
// -------------------------------
window.showMessage = function (msg, type = 'success') {
  const messageBox = document.getElementById('messageBox');
  if (!messageBox) return;
  messageBox.textContent = msg;
  messageBox.className = `message-box show ${type}`;
  setTimeout(() => messageBox.classList.remove('show'), 3000);
}
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

