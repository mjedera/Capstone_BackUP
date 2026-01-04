window.initRegisteredVessels = async function () {
  function closeAllModals() {
    document.querySelectorAll('.modal.show').forEach(modalEl => {
      const instance = bootstrap.Modal.getInstance(modalEl);
      if (instance) instance.hide();
    });
  }
    window.showMessage = function (msg, type = 'success') {
        const messageBox = document.getElementById('messageBox');
        if (!messageBox) return;
        messageBox.textContent = msg;
        messageBox.className = `message-box show ${type}`;
        setTimeout(() => messageBox.classList.remove('show'), 3000);
    }

  const dropdown = document.getElementById('vesselStatusDropdown');
  const label = document.getElementById('statusLabel');
  let selectedStatus = 'all';
  let currentPage = 1;
  const PAGE_SIZE = 10;
  let filteredVessels = [];
  dropdown.querySelector('.dropdown-toggle').onclick = () => {
    dropdown.classList.toggle('open');
  };
  dropdown.querySelectorAll('.dropdown-menu li').forEach(item => {
    item.onclick = () => {
      selectedStatus = item.dataset.value;
      label.textContent = item.textContent;
      dropdown.classList.remove('open');
      dropdown.querySelectorAll('li').forEach(li =>
        li.classList.remove('active')
      );
      item.classList.add('active');
      applySearchAndFilter();
    };
  });
  // close when clicking outside
  document.addEventListener('click', e => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });
  let allVessels = [];
  // 🔥 MOVE PRINT FORM TO BODY (IMPORTANT FOR PRINT)
  const printForm = document.getElementById('printVesselForm');
  if (printForm && printForm.parentElement !== document.body) {
      document.body.appendChild(printForm);
    }
    const tbody = document.getElementById('registeredVesselsBody');
    try {
      const res = await apiFetch('/api/registration/registered-vessels');
      if (!res.ok) throw new Error('Server error');
      allVessels = await res.json();
      if (!Array.isArray(allVessels)) throw new Error('Invalid data');

      function renderVessels(list) {
        tbody.innerHTML = '';
        if (list.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="10" class="text-center text-muted">
                No matching vessels found
              </td>
            </tr>
          `;
          return;
        }
        list.forEach(v => {
          const tr = document.createElement('tr');
          tr.style.cursor = 'pointer';
          const isExpired = new Date(v.expires_at) < new Date();
          tr.innerHTML = `
            <td class="text-center">
              <input type="checkbox" class="vessel-checkbox" value="${v.id}">
            </td>
            <td>${v.vessel_no}</td>
            <td>${v.vessel_name}</td>
            <td>${v.first_name} ${v.middle_name} ${v.last_name} ${v.extra_name}</td>
            <td>${v.vessel_type}</td>
            <td class="text-center">${v.gross_tonnage}</td>
            <td>₱${v.registration_fee}</td>
            <td>
              <span class="badge ${isExpired ? 'bg-danger' : 'bg-success'}">
                ${isExpired ? 'EXPIRED' : 'ACTIVE'}
              </span>
            </td>
            <td>${new Date(v.registered_at).toLocaleDateString()}</td>
            <td>${new Date(v.expires_at).toLocaleDateString()}</td>
          `;
          tr.addEventListener('click', (e) => {
            if (e.target.type === 'checkbox') return;
            openVesselModal(v.id);
          });
          tbody.appendChild(tr);
        });
      }

      function renderPaginated() {
        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;

        const pageItems = filteredVessels.slice(start, end);
        renderVessels(pageItems);

        const totalPages = Math.max(1, Math.ceil(filteredVessels.length / PAGE_SIZE));

        const pagination = document.getElementById('paginationWrapper');
        const indicator = document.getElementById('pageIndicator');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        // ✅ ALWAYS SHOW PAGINATION
        pagination.style.display = 'flex';

        indicator.textContent = `Page ${currentPage} of ${totalPages}`;

        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
      }

      function applySearchAndFilter() {
        const keyword =
            document.getElementById('vesselSearchInput')?.value.toLowerCase() || '';
            const status = selectedStatus;
            const today = new Date();
            const filtered = allVessels.filter(v => {
            // 🔍 SEARCH
            const matchesSearch =
              v.vessel_no.toLowerCase().includes(keyword) ||
              v.vessel_name.toLowerCase().includes(keyword) ||
              `${v.first_name} ${v.last_name}`.toLowerCase().includes(keyword);

            if (!matchesSearch) return false;
            // 🟡 STATUS FILTER
            const isExpired = new Date(v.expires_at) < today;
            if (status === 'expired') return isExpired;
            if (status === 'active') return !isExpired;
            return true; // all
        });

        filteredVessels = filtered;
        currentPage = 1;
        renderPaginated();
      }

      const searchInput = document.getElementById('vesselSearchInput');
      if (searchInput) {
        const searchInput = document.getElementById('vesselSearchInput');
        const statusFilter = document.getElementById('vesselStatusFilter');
        if (searchInput) {
          searchInput.addEventListener('input', applySearchAndFilter);
        }
        if (statusFilter) {
          statusFilter.addEventListener('change', applySearchAndFilter);
        }
      }
      applySearchAndFilter();

      const selectAll = document.getElementById('selectAllVessels');
      if (selectAll) {
        selectAll.onchange = () => {
          document.querySelectorAll('.vessel-checkbox').forEach(cb => {
            cb.checked = selectAll.checked;
          });
        };
      }
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-danger text-center">
          Failed to load registered vessels
        </td>
      </tr>`;
  }

  document.getElementById('printSelectedBtn').onclick = async () => {
    const selectedIds = Array.from(
      document.querySelectorAll('.vessel-checkbox:checked')
    ).map(cb => cb.value);

    if (selectedIds.length === 0) {
      showMessage('Please select at least one vessel to print.','error');
      return;
    }

    // 🖨 OPEN CLEAN PRINT WINDOW
    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
      <html>
      <head>
        <title>Certified Standard Admeasurement Form</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            margin: 0;
          }
          .print-form {
            box-sizing: border-box;
            page-break-before: always;
            transform: scale(1.07);
            transform-origin: top left;

          }
          .print-header {
            text-align: center;
            font-weight: bold;
            line-height: 1.4;
            margin-bottom: 10px;
          }
          .page {
            page-break-after: always;
          }
          .page:last-child {
            page-break-after: auto;
          }
          table {
            width: 99.5%;
            border-collapse: collapse;
          }
          td {
            border: 1px solid #000;
            padding: 6px;
          }
          .center { text-align: center; }
          .header {
            text-align: center;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .title {
            background: #ff4fa3;
            font-weight: bold;
            text-align: center;
          }
        </style>
      </head>
      <body>
    `);

  for (const id of selectedIds) {
    const res = await apiFetch(`/api/registration/registered-vessels/${id}`);
    const v = await res.json();

    const template = document
      .getElementById('printTemplate')
      .cloneNode(true);

    template.querySelector('#pAppNo').innerText = v.vessel_no;
    template.querySelector('#pDate').innerText = new Date().toLocaleDateString();
    template.querySelector('#pOwner').innerText = `${v.first_name} ${v.middle_name} ${v.last_name} ${v.extra_name}`;
    template.querySelector('#pAddress').innerText = v.owner_address || '';
    template.querySelector('#pVesselName').innerText = v.vessel_name;
    template.querySelector('#pColor').innerText = v.vessel_color || '';
    template.querySelector('#pVesselType').innerText = v.vessel_type;
    template.querySelector('#homePort').innerText = v.home_port;
    template.querySelector('#pLength').innerText = v.length || '';
    template.querySelector('#pBreadth').innerText = v.breadth || '';
    template.querySelector('#pDepth').innerText = v.depth || '';
    template.querySelector('#pGross').innerText = v.gross_tonnage || '';
    template.querySelector('#pNet').innerText = v.net_tonnage || '';
    template.querySelector('#pEngine').innerText = v.engine_make || '';
    template.querySelector('#pHP').innerText = v.engine_horse_power || '';
    template.querySelector('#pSerial').innerText = v.engine_serial_number || '';
    template.querySelector('#pCylinders').innerText = v.engine_cylinders || '';
    template.querySelector('#pInspectionPlace').innerText = v.inspection_place || '';
    template.querySelector('#pInspectionDate').innerText =
      v.inspection_date
        ? new Date(v.inspection_date).toLocaleDateString()
        : '';

    printWindow.document.write(`
      <div class="page">
        ${template.innerHTML}
      </div>
    `);
  }

  printWindow.document.write(`</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();

  printWindow.onafterprint = () => {
    printWindow.close();
  };
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.close();
      }
    }, 100);
  };
  document.getElementById('prevPage').onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderPaginated();
    }
  };

  document.getElementById('nextPage').onclick = () => {
    const totalPages = Math.max(1, Math.ceil(filteredVessels.length / PAGE_SIZE));
    if (currentPage < totalPages) {
      currentPage++;
      renderPaginated();
    }
  };
  // ============= vessel modifications =========================
  document
  .getElementById('vesselModificationForm')
  .addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    try {
      const res = await apiFetch(
        `/api/registration/vessels/${window.currentVesselId}/modifications`,
        {
          method: 'POST',
          body: formData
        }
      );
      const data = await res.json();

      if (!res.ok) {
        showMessage(data.message || 'Failed to submit modification', 'error');
        return;
      }

      showMessage('Vessel modification request submitted', 'success');
      closeAllModals();

      bootstrap.Modal
        .getInstance(document.getElementById('vesselModificationModal'))
        .hide();

    } catch (err) {
      console.error(err);
      showMessage('Server error while submitting modification', 'error');
    }
  });
  // ============ submit renewal form =========================
  document
  .getElementById('vesselRenewForm')
  .addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      const res = await apiFetch(
        `/api/registration/vessels/${window.currentVesselId}/renew`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            renewal_fee: document
              .getElementById('renewalFee')
              .value.replace('₱', '')
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showMessage(data.message || 'Renewal failed', 'error');
        return;
      }

      showMessage('Vessel renewal submitted successfully', 'success');
      closeAllModals();

      bootstrap.Modal
        .getInstance(document.getElementById('vesselRenewModal'))
        .hide();

    } catch (err) {
      console.error(err);
      showMessage('Server error during renewal', 'error');
    }
  });

  // reset modal mod
  const vesselModModalEl = document.getElementById('vesselModificationModal');
  if (vesselModModalEl) {
    vesselModModalEl.addEventListener('hidden.bs.modal', () => {

      const form = document.getElementById('vesselModificationForm');
      if (form) form.reset();  

      // Clear computed preview fields
      document.getElementById('previewGross').value = '';
      document.getElementById('previewNet').value   = '';
      document.getElementById('previewFee').value   = '';

      // Clear current values (optional but safe)
      document.getElementById('curLength').value  = '';
      document.getElementById('curBreadth').value = '';
      document.getElementById('curDepth').value   = '';

      // Clear engine fields
      document.getElementById('newEngineMake').value = '';
      document.getElementById('newEngineSerial').value = '';
      document.getElementById('newEngineHP').value = '';
      document.getElementById('newEngineCylinders').value = '';

      // Hide engine section by default
      const engineFields = document.getElementById('engineFields');
      if (engineFields) engineFields.style.display = 'none';

      // Reset vessel reference
      window.currentVesselId = null;
      window.currentVesselData = null;
    });
  }

  // ================ modification modal dropdown behavior ===========
  const vesselTypeSelect = document.getElementById('newVesselType');
  const engineFields = document.getElementById('engineFields');
  const engineFieldTitle = document.getElementById('engineFieldTitle');

  if (engineFields) engineFields.style.display = 'none';
  if (engineFieldTitle) engineFieldTitle.style.display = 'none';

  if (vesselTypeSelect) {
    vesselTypeSelect.addEventListener('change', () => {
      if (vesselTypeSelect.value === 'Motorized') {
        // ✅ SHOW engine inputs
        engineFields.style.display = 'flex';
        engineFieldTitle.style.display = 'block';
      } else {
        // ❌ HIDE + CLEAR engine inputs
        engineFields.style.display = 'none';
        engineFieldTitle.style.display = 'none';

        document.getElementById('newEngineMake').value = '';
        document.getElementById('newEngineSerial').value = '';
        document.getElementById('newEngineHP').value = '';
        document.getElementById('newEngineCylinders').value = '';
      }
    });
  }

};

  // ========= auto compute net and gross tonage ===============
  function computeTonnage(length, breadth, depth) {
  if (!length || !breadth || !depth) return null;

  const gross = length * breadth * depth * 0.20;
  const net   = gross * 0.90;

  return {
    gross: gross.toFixed(2),
    net: net.toFixed(2)
  };
}


async function openVesselModal(vesselId) {
  const modalBody = document.getElementById('vesselDetailsBody');
  modalBody.innerHTML = `<p class="text-muted text-center">Loading...</p>`;

  const modal = new bootstrap.Modal(
    document.getElementById('vesselDetailsModal')
  );
  modal.show();

  try {
    const res = await apiFetch(`/api/registration/registered-vessels/${vesselId}`);
    const v = await res.json();
    
    const modifyBtn = document.getElementById('requestVesselModification');
const renewBtn  = document.getElementById('renewVesselBtn');

// 🔒 RESET FIRST
modifyBtn.disabled = false;
renewBtn.disabled = false;
modifyBtn.classList.remove('disabled');
renewBtn.classList.remove('disabled');

// 🚔 BLOCK IF APPREHENDED
if (v.apprehension_status === 'Apprehended') {

  // ❌ MODIFY
  modifyBtn.disabled = true;
  modifyBtn.classList.add('disabled');
  modifyBtn.innerHTML =
    `<i class="fas fa-ban"></i> Vessel Apprehended`;
  modifyBtn.onclick = () => {
    showMessage(
      'This vessel is apprehended and cannot be modified.',
      'error'
    );
  };

  // ❌ RENEW
  renewBtn.style.display = 'inline-block';
  renewBtn.disabled = true;
  renewBtn.classList.add('disabled');
  renewBtn.innerHTML =
    `<i class="fas fa-ban"></i> Cannot Renew`;
  renewBtn.onclick = () => {
    showMessage(
      'This vessel is apprehended and cannot be renewed.',
      'error'
    );
  };

  // ⛔ STOP HERE — do NOT apply other rules
  return;
}


// RESET button state first (VERY IMPORTANT)
modifyBtn.disabled = false;
modifyBtn.classList.remove('disabled');
modifyBtn.innerHTML = `<i class="fas fa-edit"></i> Modify Vessel`;
modifyBtn.onclick = null;

if (v.has_pending_modification) {
  // 🚫 Disable if THIS vessel has pending modification
  modifyBtn.disabled = true;
  modifyBtn.classList.add('disabled');
  modifyBtn.innerHTML =
    `<i class="fas fa-clock"></i> Modification Pending`;

  modifyBtn.onclick = () => {
    showMessage(
      'This vessel already has a pending modification request.',
      'error'
    );
  };
} else {
  // ✅ Enable for THIS vessel only
  modifyBtn.onclick = () => {
    openVesselModificationModal(v);
  };
}

    const isExpired = new Date(v.expires_at) < new Date();

    const statusBadge = isExpired
      ? `<span class="badge bg-danger">EXPIRED</span>`
      : `<span class="badge bg-success">ACTIVE</span>`;

    modalBody.innerHTML = `
      <!-- STATUS -->
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="m-0">Vessel Information</h6>
        ${statusBadge}
      </div>

      <!-- PHOTOS -->
      <div class="row g-3 mb-4">
        <div class="col-md-6 text-center">
          <img src="${v.vessel_photo || '/images/fisherfolk_no_background.png'}"
               class="img-fluid rounded shadow-sm"
               style="max-height:220px; object-fit:cover;">
          <small class="text-muted d-block mt-1">Vessel Photo</small>
        </div>

        <div class="col-md-6 text-center">
          <img src="${v.engine_photo || '/images/fisherfolk_no_background.png'}"
               class="img-fluid rounded shadow-sm"
               style="max-height:220px; object-fit:cover;">
          <small class="text-muted d-block mt-1">Engine Photo</small>
        </div>
      </div>

      <!-- BASIC INFO -->
      <div class="row g-3 mb-3">
        <div class="col-md-6">
          <strong>Owner</strong><br>
          ${v.first_name} ${v.middle_name} ${v.last_name} ${v.extra_name}
        </div>
        <div class="col-md-6">
          <strong>Vessel Name</strong><br>
          ${v.vessel_name}
        </div>

        <div class="col-md-4">
          <strong>Type</strong><br>
          ${v.vessel_type}
        </div>
        <div class="col-md-4">
          <strong>Gross Tonnage</strong><br>
          ${v.gross_tonnage ?? '-'}
        </div>
        <div class="col-md-4">
          <strong>Registration Fee</strong><br>
          ₱${v.registration_fee}
        </div>
      </div>

      <hr>

      <!-- DIMENSIONS -->
      <div class="row g-3 mb-3">
        <div class="col-md-4">
          <strong>Length</strong><br>
          ${v.length ?? '-'} m
        </div>
        <div class="col-md-4">
          <strong>Breadth</strong><br>
          ${v.breadth ?? '-'} m
        </div>
        <div class="col-md-4">
          <strong>Depth</strong><br>
          ${v.depth ?? '-'} m
        </div>
      </div>

      <hr>

      <!-- ENGINE -->
      <div class="row g-3 mb-3">
        <div class="col-md-6">
          <strong>Engine Make</strong><br>
          ${v.engine_make ?? 'N/A'}
        </div>
        <div class="col-md-6">
          <strong>Serial Number</strong><br>
          ${v.engine_serial_number ?? 'N/A'}
        </div>

        <div class="col-md-6">
          <strong>Horse Power</strong><br>
          ${v.engine_horse_power ?? 'N/A'}
        </div>
        <div class="col-md-6">
          <strong>Cylinders</strong><br>
          ${v.engine_cylinders ?? 'N/A'}
        </div>
      </div>

      <hr>

      <!-- DATES -->
      <div class="row g-3">
        <div class="col-md-6">
          <strong>Registered Date</strong><br>
          ${new Date(v.registered_at).toLocaleDateString()}
        </div>
        <div class="col-md-6">
          <strong>Expiry Date</strong><br>
          ${new Date(v.expires_at).toLocaleDateString()}
        </div>
      </div>
    `;
    window.currentVesselData = v;
    // =========================================
    // ========== handle vessel modification ===
    // ========================================= 
      if (v.has_pending_modification) {
        modifyBtn.disabled = true;
        modifyBtn.innerHTML =
          `<i class="fas fa-clock"></i> Modification Pending`;
        modifyBtn.onclick = () => {
          showMessage(
            'This vessel already has a pending modification request.',
            'error'
          );
        };
      } else {
        modifyBtn.disabled = false;
        modifyBtn.innerHTML =
          `<i class="fas fa-edit"></i> Modify Vessel`;

        modifyBtn.onclick = () => {
          openVesselModificationModal(v); // ✅ SINGLE SOURCE
        };
      }
    // =========================================
    // ========== handle vessel renewal ===
    // ========================================= 

    // RESET state every time (IMPORTANT)
    renewBtn.style.display = 'none';
    renewBtn.disabled = false;
    renewBtn.innerHTML = `<i class="fas fa-sync-alt"></i> Renew Vessel`;
    renewBtn.onclick = null;

    if (
      v.can_renew &&
      !v.has_pending_modification &&
      !v.has_pending_renewal
    ) {
      renewBtn.style.display = 'inline-block';

      renewBtn.onclick = () => {
        openVesselRenewModal(v);
      };
    }
    else if (v.has_pending_renewal) {
      renewBtn.style.display = 'inline-block';
      renewBtn.disabled = true;
      renewBtn.innerHTML =
        `<i class="fas fa-clock"></i> Renewal Pending`;
    }

    // Attach print handler AFTER modal is rendered
    const printBtn = document.getElementById('printVesselBtn');
    if (printBtn) {
      printBtn.onclick = () => {
        const v = window.currentVesselData;
        if (!v) return;

        // Fill print fields
        document.getElementById('pAppNo').innerText = v.vessel_no;
        document.getElementById('pOwner').innerText = `${v.first_name} ${v.middle_name} ${v.last_name} ${v.extra_name}`;
        document.getElementById('pAddress').innerText = v.owner_address || '';
        document.getElementById('pVesselName').innerText = v.vessel_name;
        document.getElementById('pColor').innerText = v.vessel_color || '';
        document.getElementById('pVesselType').innerText = v.vessel_type;
        document.getElementById('homePort').innerText = v.home_port;

        document.getElementById('pLength').innerText = v.length || '';
        document.getElementById('pBreadth').innerText = v.breadth || '';
        document.getElementById('pDepth').innerText = v.depth || '';
        document.getElementById('pGross').innerText = v.gross_tonnage || '';
        document.getElementById('pNet').innerText = v.net_tonnage || '';

        document.getElementById('pEngine').innerText = v.engine_make || '';
        document.getElementById('pHP').innerText = v.engine_horse_power || '';
        document.getElementById('pSerial').innerText = v.engine_serial_number || '';
        document.getElementById('pCylinders').innerText = v.engine_cylinders || '';

        document.getElementById('pInspectionPlace').innerText = v.inspection_place || '';
        document.getElementById('pInspectionDate').innerText =
          v.inspection_date ? new Date(v.inspection_date).toLocaleDateString() : '';

        document.getElementById('pDate').innerText =
          new Date().toLocaleDateString();

        // ✅ CLOSE MODAL FIRST
        const modalEl = document.getElementById('vesselDetailsModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        // ✅ SMALL DELAY TO ALLOW DOM REPAINT
        setTimeout(() => {
          window.print();
        }, 80);
      };
    }
  } catch (err) {
    console.error(err);
    modalBody.innerHTML = `
      <p class="text-danger text-center">
        Failed to load vessel details
      </p>`;
  }
}

function openVesselModificationModal(v) {
  // Fill current values
  document.getElementById('curLength').value  = v.length ?? '';
  document.getElementById('curBreadth').value = v.breadth ?? '';
  document.getElementById('curDepth').value   = v.depth ?? '';

  // Engine auto-fill
  const engineFields = document.getElementById('engineFields');
  const engineFieldTitle = document.getElementById('engineFieldTitle');

  if (v.vessel_type === 'Motorized') {
    engineFields.style.display = 'flex';
    engineFieldTitle.style.display = 'block';

    document.getElementById('newEngineMake').value = v.engine_make || '';
    document.getElementById('newEngineSerial').value = v.engine_serial_number || '';
    document.getElementById('newEngineHP').value = v.engine_horse_power || '';
    document.getElementById('newEngineCylinders').value = v.engine_cylinders || '';
  } else {
    engineFields.style.display = 'none';
    engineFieldTitle.style.display = 'none';
  }

  window.currentVesselId = v.id;
          ['new_length','new_breadth','new_depth'].forEach(name => {
          document
            .querySelector(`[name="${name}"]`)
            .addEventListener('input', async () => {

              const length  = parseFloat(document.querySelector('[name="new_length"]').value);
              const breadth = parseFloat(document.querySelector('[name="new_breadth"]').value);
              const depth   = parseFloat(document.querySelector('[name="new_depth"]').value);

              const result = computeTonnage(length, breadth, depth);
              if (!result) return;

              document.getElementById('previewGross').value = result.gross;
              document.getElementById('previewNet').value   = result.net;

              // Fetch fee
              const res = await apiFetch(`/api/registration/registration-fee?tonnage=${result.gross}`);
              const data = await res.json();
              if (data.success) {
                document.getElementById('previewFee').value = `₱${data.fee}`;
                document.getElementById('modificationFeeValue').value = data.fee;
              } else {
                document.getElementById('previewFee').value = 'N/A';
                document.getElementById('modificationFeeValue').value = '';
              }
            });
        });

  const modModal = new bootstrap.Modal(
    document.getElementById('vesselModificationModal')
  );
  modModal.show();
}

function openVesselRenewModal(v) {
  document.getElementById('renewVesselNo').value = v.vessel_no;

  const expiry = new Date(v.expires_at);
  document.getElementById('oldExpiry').value = expiry.toLocaleDateString();

  const newExpiry = new Date(expiry);
  newExpiry.setFullYear(newExpiry.getFullYear() + 1);
  document.getElementById('newExpiry').value = newExpiry.toLocaleDateString();

  const today = new Date();
  const diffMs = today - expiry;
  const daysExpired = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const monthsExpired = daysExpired > 0 ? Math.ceil(daysExpired / 30) : 0;

  const penaltyPerMonth = 30;
  const penaltyFee = monthsExpired * penaltyPerMonth;

  const baseFee = Number(v.registration_fee);
  const totalFee = baseFee + penaltyFee;

  document.getElementById('renewBaseFee').value = `₱${baseFee.toFixed(2)}`;
  document.getElementById('renewPenalty').value =
    monthsExpired > 0
      ? `${monthsExpired} month(s) × ₱30 = ₱${penaltyFee}`
      : 'No penalty';

  document.getElementById('renewalFee').value = `₱${totalFee.toFixed(2)}`;

  window.currentVesselId = v.id;

  new bootstrap.Modal(
    document.getElementById('vesselRenewModal')
  ).show();
}




  
