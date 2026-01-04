window.initApprehensionForm = function () {
    const formContainer = document.getElementById('newApprehensionForm');
  const apprehensionDateInput = document.getElementById('apprehensionDate');
  const violatorNoInput = document.getElementById('violatorNo');
  const vesselSection = document.getElementById('vesselSection');
const propulsionSection = document.getElementById('propulsionSectionWrapper');
const gearSection = document.getElementById('gearSection');


  apprehensionDateInput?.addEventListener('change', () => {
    if (!apprehensionDateInput.value) return;

    const year = new Date(apprehensionDateInput.value).getFullYear();

    if (!isNaN(year)) {
      // PREVIEW ONLY — final value comes from backend
      violatorNoInput.value = `AA-${year}-AUTO`;
    }
  });


  /* =====================================================
     CHECKBOX REFERENCES
  ===================================================== */
  const motorized    = document.getElementById('motorized');
  const nonMotorized = document.getElementById('nonMotorized');
  const noneVessel   = document.getElementById('none');

  const yesGear  = document.getElementById('yesGear');
  const noneGear = document.getElementById('noneGear');

  const mfletCountInput = document.getElementById('mfletCount');

  /* =====================================================
     HELPER FUNCTIONS
  ===================================================== */
function disableAndClear(container) {
  container.querySelectorAll('input, select, textarea').forEach(el => {
    el.disabled = true;

    // ❌ DO NOT clear checkboxes/radios
    if (el.type === 'checkbox' || el.type === 'radio') return;

    el.value = '';
  });
}
  function enableInputs(container) {
    container.querySelectorAll('input, select, textarea').forEach(el => {
      el.disabled = false;
    });
  }

  /* =====================================================
     COLLECT FISHING VESSEL + ENGINE SECTION
  ===================================================== */
  const vesselHeader = [...document.querySelectorAll('.table-header h3')]
    .find(h => h.textContent.trim() === 'Fishing Vessel');

  let vesselElements = [];

  if (vesselHeader) {
    let el = vesselHeader.parentElement;
    while (el && !el.querySelector('h3')?.textContent.includes('Fishing Gears')) {
      vesselElements.push(el);
      el = el.nextElementSibling;
    }
  }

  /* =====================================================
     COLLECT PROPULSION (ENGINE) SECTION
  ===================================================== */
  const propulsionTitle = document.getElementById('propulsionSection');
  let propulsionElements = [];

  if (propulsionTitle) {
    propulsionElements.push(propulsionTitle);
    let el = propulsionTitle.nextElementSibling;
    while (el && el.tagName !== 'H4') {
      propulsionElements.push(el);
      el = el.nextElementSibling;
    }
  }

  /* =====================================================
     TOGGLE FUNCTIONS
  ===================================================== */
function toggleVesselSection() {
  const show =
    motorized.checked ||
    nonMotorized.checked;

  vesselSection.style.display = show ? 'block' : 'none';

  show ? enableInputs(vesselSection) : disableAndClear(vesselSection);
}


[motorized, nonMotorized, noneVessel].forEach(cb => {
  cb.addEventListener('change', () => {

    if (cb === motorized && motorized.checked) {
      nonMotorized.checked = false;
      noneVessel.checked = false;
    }

    if (cb === nonMotorized && nonMotorized.checked) {
      motorized.checked = false;
      noneVessel.checked = false;
    }

    if (cb === noneVessel && noneVessel.checked) {
      motorized.checked = false;
      nonMotorized.checked = false;
    }

    toggleVesselSection();
    togglePropulsionSection();
    // ❌ DO NOT TOUCH GEAR HERE
  });
});



function togglePropulsionSection() {
  const show = motorized.checked;

  propulsionSection.style.display = show ? 'block' : 'none';

  show
    ? enableInputs(propulsionSection)
    : disableAndClear(propulsionSection);
}

  /* =====================================================
     COLLECT FISHING GEAR SECTION
  ===================================================== */
  const gearHeader = [...document.querySelectorAll('.table-header h3')]
    .find(h => h.textContent.trim() === 'Fishing Gears');

  let gearElements = [];

  if (gearHeader) {
    gearElements.push(gearHeader.closest('.table-header').parentElement);
    let el = gearHeader.closest('.table-header').parentElement.nextElementSibling;
    while (el && el.tagName === 'LABEL') {
      gearElements.push(el);
      el = el.nextElementSibling;
    }
  }
// =====================================================
//  ======================= gear section ===============
// =====================================================
function toggleGearSection() {
  if (!gearSection) return;

  const show = yesGear.checked === true;

  gearSection.style.display = show ? 'block' : 'none';

  if (!show) {
    // ONLY clear gear inputs — nothing else
gearSection.querySelectorAll('input, select, textarea').forEach(el => {
  if (el.type === 'hidden') return; // ✅ KEEP hidden inputs enabled
  el.disabled = true;
  el.value = '';
});

  } else {
gearSection.querySelectorAll('input, select, textarea').forEach(el => {
  el.disabled = false;
});

  }
}
yesGear.addEventListener('change', () => {
  if (yesGear.checked) {
    noneGear.checked = false;
  }
  toggleGearSection();
});

noneGear.addEventListener('change', () => {
  if (noneGear.checked) {
    yesGear.checked = false;
  }
  toggleGearSection();
});


  /* =====================================================
     MFLET DYNAMIC INPUT GENERATION  ✅ FIXED
  ===================================================== */
  mfletCountInput?.addEventListener('input', () => {
    const count = parseInt(mfletCountInput.value) || 0;

    // Remove old MFLET inputs
    document.querySelectorAll('.mflet-generated').forEach(el => el.remove());

    let anchor = mfletCountInput.parentElement;

    for (let i = 1; i <= count; i++) {
      const label = document.createElement('label');
      label.className = 'mflet-generated';
      label.textContent = 'MFLET Name:';

      const input = document.createElement('input');
      input.type = 'text';
      input.name = `mfletFullName_${i}`; // ✅ backend-compatible
      input.className = 'form-control';

      label.appendChild(input);
      anchor.after(label);
      anchor = label;
    }
  });

  /* =====================================================
     INITIAL STATE
  ===================================================== */
  toggleVesselSection();
  togglePropulsionSection();
  toggleGearSection();

  /* =====================================================
   FORM SUBMIT (DELEGATED – FIXED)
  ===================================================== */
  const form = document.getElementById('apprehensionForm');
  if (!form) return;
  // 🔒 Prevent double-binding
  if (form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // 🔑 STOP GET REQUEST
    // BASIC REQUIRED FIELD VALIDATION
  if (!apprehensionDateInput.value) {
    showMessage('Please select apprehension date & time', 'error');
    return;
  }

  if (!fullName.value.trim()) {
    showMessage('Full name is required', 'error');
    fullName.focus();
    return;
  }
  if (!placeOfApprehension.value.trim()) {
    showMessage('place of apprehension is required', 'error');
    fullName.focus();
    return;
  }

  if (!address.value.trim()) {
    showMessage('Address is required', 'error');
    address.focus();
    return;
  }

  const ageVal = parseInt(age.value, 10);
  if (isNaN(ageVal) || ageVal <= 0) {
    showMessage('Please enter a valid age', 'error');
    age.focus();
    return;
  }

  if (!sex.value) {
    showMessage('Please select sex', 'error');
    sex.focus();
    return;
  }

  if (!birthdate.value) {
    showMessage('Birthdate is required', 'error');
    birthdate.focus();
    return;
  }

  // AGE vs BIRTHDATE CONSISTENCY CHECK
  const birthYear = new Date(birthdate.value).getFullYear();
  const currentYear = new Date().getFullYear();
  const calculatedAge = currentYear - birthYear;

  if (Math.abs(calculatedAge - ageVal) > 1) {
    showMessage('Age does not match birthdate', 'error');
    return;
  }
  // ===============================
  // CLIENT-SIDE VALIDATION
  // ===============================
  const vesselType =
    document.getElementById('motorized')?.checked
      ? 'Motorized'
      : document.getElementById('nonMotorized')?.checked
      ? 'Non-Motorized'
      : 'None';

  if (vesselType === 'Motorized') {
    const engineMake = document.getElementById('engineMake')?.value.trim();
    const engineSerial = document.getElementById('engineSerialNumber')?.value.trim();
    const horsePower = document.getElementById('horsePower')?.value.trim();
    const cylinders = document.getElementById('cylinders')?.value.trim();

    if (!engineMake || !engineSerial || !horsePower || !cylinders) {
      showMessage(
        'Motorized vessel selected. Please complete all engine details.',
        'error'
      );
      return; // ⛔ STOP SUBMIT
    }
  }
document.getElementById('selectedGearId').disabled = false;
document.getElementById('registeredGearNo').disabled = false;

  const form = e.target;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
// =====================================================================================================
// ✅ CREATE FormData FIRST
  // =====================================
  // ✅ Build Hand Instruments (single DB field)
  // =====================================
  const handInstruments = [];

  const speargun = Number(document.getElementById('spear_gun').value);
  if (speargun > 0) {
    handInstruments.push(`Speargun (${speargun})`);
  }

  const scoopNet = document.getElementById('scoop_dip_net').value;
  if (scoopNet > 0) {
  handInstruments.push(`Scoop/Dip Net (${scoopNet})`);
  }


  const gaffHook = document.getElementById('gaff_hook').value;
  if (gaffHook > 0) {
    handInstruments.push(`Gaff Hook (${gaffHook})`);
  }

  const spears = document.getElementById('spears').value;
  if (spears > 0) {
    handInstruments.push(`Spears (${spears})`);
  }
  // overwrite field expected by backend
  payload.handInstruments = handInstruments.join(', ');

  const line_type = [];

  const long_line_small = document.getElementById('longLine500').value;
  if (long_line_small > 0) {
    line_type.push(`Long line 500 hooks (${long_line_small})`);
  }

  const lone_line_plus = document.getElementById('longLine500plus').value;
  if (lone_line_plus > 0) {
    line_type.push(`Lone line 500+ hooks (${lone_line_plus})`);
  }
  // overwrite field expected by backend
  payload.line_type = line_type.join(', ');

  const palubog_nets = [];

  const pang_ilak = document.getElementById('pang_ilak').value;
  if (pang_ilak > 0) {
    palubog_nets.push(`Pang-ilak (${pang_ilak})`);
  }


  const pang_longgot = document.getElementById('panglonggot').value;
  if (pang_longgot > 0) {
    palubog_nets.push(`Panglonggot (${pang_longgot})`);
  }
  
  const pang_mangodlong = document.getElementById('pang_mangodlong').value;
  if (pang_mangodlong > 0) {
    palubog_nets.push(`Pang-mangodolong (${pang_mangodlong})`);
  }

  const panghawol_hawol = document.getElementById('panghawol_hawol').value;
  if (panghawol_hawol > 0) {
    palubog_nets.push(`Panghawol-hawol (${panghawol_hawol})`);
  }
  
  const pangmangsi = document.getElementById('pangmangsi').value;
  if (pangmangsi > 0) {
    palubog_nets.push(`Pangmangsi (${pangmangsi})`);
  }
  
  // overwrite field expected by backend
  payload.palubog_nets = palubog_nets.join(', ');
  const nets = [];

  const bungsod = document.getElementById('bungsod').value;
  if (bungsod > 0) {
    nets.push(`Bungsod (${bungsod})`);
  }
  

  const palutawNets = document.getElementById('palutawNets').value;
  if (palutawNets > 0) {
    nets.push(`Palutaw Nets (${palutawNets})`);
  }


  const palaran = document.getElementById('palaran').value;
  if (palaran > 0) {
    nets.push(`Palaran (${palaran})`);
  }

  const pamawo = document.getElementById('pamawo').value;
  if (pamawo > 0) {
    nets.push(`Pamawo (${pamawo})`);
  }
  payload.nets = nets.join(', ');

  const traps = [];
  const boboSmallQty = document.getElementById('boboSmallQty').value;
  if (boboSmallQty > 0) {
    traps.push(`Bobo Small (${boboSmallQty})`);
  }
  
  const boboLargeQty = document.getElementById('boboLargeQty').value;
  if (boboLargeQty > 0) {
    traps.push(`Bobo Large (${boboLargeQty})`);
  }
  
  const tambuanQty = document.getElementById('tambuanQty').value;
  if (tambuanQty > 0) {
    traps.push(`Tambuan (${tambuanQty})`);
  }
  
  payload.traps = traps.join(', ');

  // ===========================================================================================
  // Collect MFLET names
  payload.mfletNames = [];
  document.querySelectorAll('input[name^="mfletFullName_"]').forEach(input => {
    if (input.value.trim()) {
      payload.mfletNames.push(input.value.trim());
    }
  });

  console.log('SUBMIT PAYLOAD:', payload); // 🔍 DEBUG
console.log('GEAR ID:', payload.selectedGearId);
console.log('GEAR NO:', payload.registeredGearNo);

  const res = await apiFetch('/api/apprehensionRprtRoutes/ApprehensionReport', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (res.ok) {  
    showSuccessToast(data.message);
    clearApprehensionForm(form);
    formContainer.innerHTML = '';
    // 🔔 Notify parent page that form was closed
    window.dispatchEvent(new CustomEvent('apprehensionFormClosed'));
  } else {
    alert(data.message || 'Failed to save apprehension report');
  }

});

function clearApprehensionForm(form) {
  form.reset();

  // Remove MFLET dynamic inputs
  document.querySelectorAll('.mflet-generated').forEach(el => el.remove());

  // Clear violator number
  const violatorNoInput = document.getElementById('violatorNo');
  if (violatorNoInput) violatorNoInput.value = '';

  // Re-apply visibility logic
  toggleVesselSection();
  togglePropulsionSection();
  toggleGearSection();

  // ✅ Auto-focus first field
  setTimeout(focusFirstField, 100);
}


function showSuccessToast(message) {
  const toastEl = document.getElementById('successToast');
  if (!toastEl) return;

  toastEl.querySelector('.toast-body').textContent = message;

  const toast = new bootstrap.Toast(toastEl, {
    delay: 3000
  });
  toast.show();
}

function focusFirstField() {
  const firstInput = document.querySelector(
    '#vesselForm input:not([readonly]):not([type="hidden"])'
  );
  firstInput?.focus();
}

// ===================================================================================
// ========================== vessel aauto complete ==================================
// ===================================================================================
const vesselInput = document.getElementById('vesselSearchInput');
const vesselIdInput = document.getElementById('selectedVesselId');

let vesselDropdown;

vesselInput.addEventListener('input', async () => {
  const q = vesselInput.value.trim();
  vesselIdInput.value = ''; // reset link

  if (q.length < 2) {
    removeVesselDropdown();
    return;
  }

  const res = await fetch(`/api/apprehensionRprtRoutes/search/vessels?q=${encodeURIComponent(q)}`);
  const vessels = await res.json();

  renderVesselDropdown(vessels);
});

function renderVesselDropdown(vessels) {
  removeVesselDropdown();
  vesselDropdown = document.createElement('div');
  vesselDropdown.className = 'autocomplete-dropdown';

  vessels.forEach(v => {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    item.textContent = `${v.vessel_no} — ${v.vessel_name || ''}`;

    item.onclick = () => selectVessel(v);
    vesselDropdown.appendChild(item);
  });

  vesselInput.parentElement.appendChild(vesselDropdown);
}

function selectVessel(v) {
  vesselInput.value = v.vessel_no;
  vesselIdInput.value = v.id;

  // 🔥 AUTO-SWITCH VESSEL TYPE
  if (v.engine_make || v.engine_serial_number) {
    document.getElementById('motorized').checked = true;
    document.getElementById('nonMotorized').checked = false;
  } else {
    document.getElementById('nonMotorized').checked = true;
    document.getElementById('motorized').checked = false;
  }

  document.getElementById('none').checked = false;

  // Re-apply visibility
  toggleVesselSection();
  togglePropulsionSection();

  // Auto-populate fields
  document.getElementById('length').value = v.length ?? '';
  document.getElementById('breadth').value = v.breadth ?? '';
  document.getElementById('depth').value = v.depth ?? '';
  document.getElementById('grossTonnage').value = v.gross_tonnage ?? '';
  document.getElementById('netTonnage').value = v.net_tonnage ?? '';
  document.getElementById('vesselColor').value = v.vessel_color ?? '';

  document.getElementById('engineMake').value = v.engine_make ?? '';
  document.getElementById('engineSerialNumber').value = v.engine_serial_number ?? '';
  document.getElementById('horsePower').value = v.engine_horse_power ?? '';
  document.getElementById('cylinders').value = v.engine_cylinders ?? '';

  removeVesselDropdown();
}


function removeVesselDropdown() {
  if (vesselDropdown) {
    vesselDropdown.remove();
    vesselDropdown = null;
  }
}
// Ensure clean initial state
yesGear.checked = false;
noneGear.checked = false;
toggleGearSection();
// ======================================================================
// ======================== gear auto complete ==========================
// ======================================================================
const gearInput = document.getElementById('gearSearchInput');
const gearIdInput = document.getElementById('selectedGearId');
let gearDropdown;

gearInput?.addEventListener('input', async () => {
  const q = gearInput.value.trim();
  gearIdInput.value = '';

  if (q.length < 2) {
    removeGearDropdown();
    return;
  }

  const res = await fetch(`/api/apprehensionRprtRoutes/search/gears?q=${encodeURIComponent(q)}`);
  const data = await res.json();
  console.log(data);
  if (!Array.isArray(data)) {
    console.error('Invalid gear search response:', data);
    removeGearDropdown();
    return;
  }

  renderGearDropdown(data);
});

function renderGearDropdown(gears) {
  removeGearDropdown();
  gearDropdown = document.createElement('div');
  gearDropdown.className = 'autocomplete-dropdown';

  gears.forEach(g => {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    item.textContent = g.gear_no;
    item.onclick = () => selectGear(g);
    gearDropdown.appendChild(item);
  });

  gearInput.parentElement.appendChild(gearDropdown);
}

function selectGear(g) {
  document.getElementById('gearSearchInput').value = g.gear_no;
  document.getElementById('selectedGearId').value = g.id;
  document.getElementById('registeredGearNo').value = g.gear_no;

  document.getElementById('yesGear').checked = true;
  document.getElementById('noneGear').checked = false;
  toggleGearSection();

  /* =========================
     HELPER: extract qty "(x)"
  ========================= */
  const extractQty = (text, label) => {
    if (!text) return '';
    const regex = new RegExp(`${label} \\((\\d+)\\)`, 'i');
    const match = text.match(regex);
    return match ? match[1] : '';
  };

  /* =========================
     HAND INSTRUMENTS
  ========================= */
  document.querySelector('[name="speargun"]').value =
    extractQty(g.hand_instruments, 'Speargun');

  document.querySelector('[name="scoopNet"]').value =
    extractQty(g.hand_instruments, 'Scoop/Dip Net');

  document.querySelector('[name="gaffHook"]').value =
    extractQty(g.hand_instruments, 'Gaff Hook');

  document.querySelector('[name="spears"]').value =
    extractQty(g.hand_instruments, 'Spears');

  /* =========================
     LINES
  ========================= */
  document.querySelector('[name="longLine500"]').value =
    extractQty(g.line_type, 'Long line 500 hooks');

  document.querySelector('[name="longLine500plus"]').value =
    extractQty(g.line_type, 'Long line 500+ hooks');

  /* =========================
     PALUBOG NETS
  ========================= */
  document.querySelector('[name="pang_ilak"]').value =
    extractQty(g.palubog_nets, 'Pang-ilak');

  document.querySelector('[name="panglonggot"]').value =
    extractQty(g.palubog_nets, 'Panglonggot');

  document.querySelector('[name="pang_mangodlong"]').value =
    extractQty(g.palubog_nets, 'Pang-mangodolong');

  document.querySelector('[name="panghawol_hawol"]').value =
    extractQty(g.palubog_nets, 'Panghawol-hawol');

  document.querySelector('[name="pangmangsi"]').value =
    extractQty(g.palubog_nets, 'Pangmangsi');

  /* =========================
     NETS
  ========================= */
  document.querySelector('[name="bungsod"]').value =
    extractQty(g.nets, 'Bungsod');

  document.querySelector('[name="palutawNets"]').value =
    extractQty(g.nets, 'Palutaw Nets');

  document.querySelector('[name="palaran"]').value =
    extractQty(g.nets, 'Palaran');

  document.querySelector('[name="pamawo"]').value =
    extractQty(g.nets, 'Pamawo');

  /* =========================
     TRAPS
  ========================= */
  document.querySelector('[name="boboSmallQty"]').value =
    g.bobo_small_qty ?? '';

  document.querySelector('[name="boboLargeQty"]').value =
    g.bobo_large_qty ?? '';

  document.querySelector('[name="tambuanQty"]').value =
    g.tambuan_qty ?? '';

  /* =========================
     ACCESSORIES
  ========================= */
  document.querySelector('[name="accessories"]').value =
    g.accessories ?? '';

  removeGearDropdown();
}

function removeGearDropdown() {
  if (gearDropdown) {
    gearDropdown.remove();
    gearDropdown = null;
  }
}

// =========================================================
// ============ open modal & fetch ordinances ==============
// =========================================================
const modal = new bootstrap.Modal(
  document.getElementById('violationModal')
);

document
  .getElementById('openViolationModal')
  .addEventListener('click', async () => {
    modal.show();
    loadOrdinances('');
  });

document
  .getElementById('ordinanceSearch')
  .addEventListener('input', e => {
    loadOrdinances(e.target.value);
  });
// ============================================================================
async function loadOrdinances(query) {
  const res = await fetch(
    `/api/apprehensionRprtRoutes/ordinances/search?q=${encodeURIComponent(query)}`
  );
  const ordinances = await res.json();

  const container = document.getElementById('ordinanceList');
  container.innerHTML = '';

  ordinances.forEach(o => {
    const card = document.createElement('div');
    card.className = 'col-md-6';

    card.innerHTML = `
      <div class="ordinance-card">
        <label>
          <input
            type="checkbox"
            class="ordinance-checkbox"
            data-id="${o.id}"
            data-title="${o.section_no} — ${o.ordinance_title}"
            data-fee="${o.penalty_fee}"
          >
          <strong>${o.section_no}</strong><br>
          <small>${o.ordinance_title}</small><br>
          <small>Penalty: ₱${o.penalty_fee}</small>
        </label>
      </div>
    `;

    container.appendChild(card);
  });
}
// ===============================================================================
document
  .getElementById('applyViolations')
  .addEventListener('click', () => {

    const checked = document.querySelectorAll('.ordinance-checkbox:checked');

    if (checked.length === 0) {
      showMessage('Please select at least one violation', 'error');
      return;
    }

    let titles = [];
    let ids = [];
    let totalPenalty = 0;

    checked.forEach(cb => {
      titles.push(cb.dataset.title);
      ids.push(cb.dataset.id);
      totalPenalty += Number(cb.dataset.fee);
    });

    // Store values
    document.getElementById('selectedViolations').value =
      titles.join(' | ');

    document.getElementById('selectedOrdinanceIds').value =
      ids.join(',');

    document.getElementById('penaltyDetails').value =
      totalPenalty.toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP'
      });

    modal.hide();
  });

initCancelHandlers();
  function initCancelHandlers() {
  const cancelBtn = document.getElementById('cancelApprehensionForm');
  const formContainer = document.getElementById('newApprehensionForm');

async function confirmClose() {
  const confirmed = await confirmAction({
    title: 'Cancel Apprehension Report',
    message: 'Are you sure you want to cancel this apprehension report?',
    confirmText: 'Yes, Cancel',
    confirmClass: 'btn-danger'
  });

  if (confirmed) {
    formContainer.innerHTML = '';

    // 🔔 Notify parent page that form was closed
    window.dispatchEvent(new CustomEvent('apprehensionFormClosed'));
  }
}
  cancelBtn?.addEventListener('click', confirmClose);
}

};
window.onbeforeunload = () => {
  if (document.getElementById('newApprehensionForm')?.innerHTML.trim()) {
    return 'You have an unsaved apprehension report.';
  }
};

window.showMessage = function (msg, type = 'success') {
    const messageBox = document.getElementById('messageBox');
    if (!messageBox) return;
    messageBox.textContent = msg;
    messageBox.className = `message-box show ${type}`;
    setTimeout(() => messageBox.classList.remove('show'), 3000);
}
