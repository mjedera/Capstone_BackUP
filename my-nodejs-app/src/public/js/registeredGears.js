window.initRegisteredGears = async function () {
  let currentGearTotalFee = 0;
  let currentGearExpiry = null;
  let nextYearExpiry = null;
  let selectedStatus = 'all';
  let currentModalGearId = null;
  let allGears = [];
  let filteredGears = [];
  let currentPage = 1;
  const PAGE_SIZE = 10;

  await loadGearFees();
  function extractQty(text, label) {
    if (!text) return 0;
    const match = text.match(new RegExp(`${label}\\s*\\((\\d+)\\)`));
    return match ? Number(match[1]) : 0;
  }
  const dropdown = document.getElementById('gearStatusDropdown');
  const label = document.getElementById('statusLabel');
  // ✅ Toggle dropdown open/close
  dropdown.querySelector('.dropdown-toggle').onclick = (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  };
    window.showMessage = function (msg, type = 'success') {
        const messageBox = document.getElementById('messageBox');
        if (!messageBox) return;
        messageBox.textContent = msg;
        messageBox.className = `message-box show ${type}`;
        setTimeout(() => messageBox.classList.remove('show'), 3000);
    }

  const tbody = document.getElementById('registeredGearsBody');
  // ✅ Close dropdown when clicking outside
  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
  });
  dropdown.querySelectorAll('.dropdown-menu li').forEach(item => {
    item.onclick = (e) => {
      e.stopPropagation();
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

  function renderGears(list) {
    tbody.innerHTML = '';

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted">
            No matching gears found
          </td>
        </tr>`;
      return;
    }

    list.forEach(g => {
      const isExpired = new Date(g.expires_at) < new Date();

      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';

      tr.innerHTML = `
        <td class="text-center">
          <input type="checkbox" class="gear-checkbox" value="${g.id}">
        </td>
        <td>${g.gear_no}</td>
        <td>${g.owner_name}</td>
        <td>${new Date(g.application_date).toLocaleDateString()}</td>
        <td>₱${Number(g.total_fee).toFixed(2)}</td>
        <td>
          <span class="badge ${isExpired ? 'bg-danger' : 'bg-success'}">
            ${isExpired ? 'EXPIRED' : 'ACTIVE'}
          </span>
        </td>
        <td>${new Date(g.registered_at).toLocaleDateString()}</td>
        <td>${new Date(g.expires_at).toLocaleDateString()}</td>
      `;

      // ✅ row click → open modal (ignore checkbox clicks)
      tr.addEventListener('click', (e) => {
        if (e.target.type === 'checkbox') return;
        openGearDetails(g);
      });

      tbody.appendChild(tr);

    });
  }

  function renderPaginated() {
      const start = (currentPage - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;

      const pageItems = filteredGears.slice(start, end);
      renderGears(pageItems);

      const totalPages = Math.max(1, Math.ceil(filteredGears.length / PAGE_SIZE));

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
      document.getElementById('gearSearchInput')?.value.toLowerCase() || '';
    const today = new Date();
    filteredGears = allGears.filter(g => {
      const matchesSearch =
        g.gear_no.toLowerCase().includes(keyword) ||
        g.owner_name.toLowerCase().includes(keyword);
      if (!matchesSearch) return false;
      const isExpired = new Date(g.expires_at) < today;
      if (selectedStatus === 'expired') return isExpired;
      if (selectedStatus === 'active') return !isExpired;
      return true;
    });
    currentPage = 1;
    renderPaginated();

  }

async function openGearDetails(g) {
  const renewBtn = document.getElementById('renewGearBtn');

const isApprehended = g.apprehension_status === 'Apprehended';

const today = new Date();
const expiryDate = new Date(g.expires_at);
const daysBeforeExpiry = Math.ceil(
  (expiryDate - today) / (1000 * 60 * 60 * 24)
);

const canRenewByDate = daysBeforeExpiry <= 90;

// 🔒 APPREHENDED → show disabled button
if (isApprehended) {
  renewBtn.style.display = 'inline-block';
  renewBtn.disabled = true;
    renewBtn.innerHTML =
    `<i class="fas fa-ban"></i> Gear Apprehended `;
}
// ⏰ TOO EARLY → hide button
else if (!canRenewByDate) {
  renewBtn.style.display = 'none';
}
// 🔁 NORMAL CASE
else {
  renewBtn.style.display = 'inline-block';

  if (g.has_pending_renewal) {
    renewBtn.disabled = true;
    renewBtn.textContent = 'Renewal Pending';
  } else {
    renewBtn.disabled = false;
    renewBtn.textContent = 'Renew Gear';
    renewBtn.className = 'btn btn-success';
  }
}



  // ==========================================
  currentModalGearId = g.id;
  const modal = new bootstrap.Modal(
    document.getElementById('gearDetailsModal')
  );

  const tbody = document.getElementById('modalGearItems');
  tbody.innerHTML = `
    <tr>
      <td colspan="3" class="text-center text-muted">
        Loading gear details...
      </td>
    </tr>
  `;

  modal.show();

  try {
    const res = await apiFetch(
      `/api/registration/registered-gears/${g.id}`
    );
    const gear = await res.json();
    console.log(gear);
    const rows = [];
    // ✅ Populate modal header details
    document.getElementById('modalGearNo').textContent = gear.gear_no;
    document.getElementById('modalOwner').textContent = gear.owner_name;
    document.getElementById('modalApplicationDate').textContent =
      new Date(gear.application_date).toLocaleDateString();

    const isExpired = new Date(gear.expires_at) < new Date();

    document.getElementById('modalStatus').innerHTML = `
      <span class="badge ${isExpired ? 'bg-danger' : 'bg-success'}">
        ${isExpired ? 'EXPIRED' : 'ACTIVE'}
      </span>
    `;
    document.getElementById('modalRegistered').textContent =
      new Date(gear.registered_at).toLocaleDateString();

    document.getElementById('modalExpiry').textContent =
      new Date(gear.expires_at).toLocaleDateString();
    


    document.getElementById('modalTotalFee').textContent =
  `₱${Number(gear.total_fee).toFixed(2)}`;


      if (gear.hand_instruments) {
        rows.push(['Hand Instruments', gear.hand_instruments, '']);
      }

      if (gear.line_type) {
        rows.push(['Line Type', gear.line_type, '']);
      }

      if (gear.nets) {
        rows.push(['Nets', gear.nets, '']);
      }

      if (gear.palubog_nets) {
        rows.push(['Palubog Nets', gear.palubog_nets, '']);
      }

      if (gear.accessories) {
        rows.push(['Accessories', gear.accessories, '']);
      }

      if (gear.bobo_small_qty > 0) {
        rows.push(['Bobo (Small)', gear.bobo_small_qty, '']);
      }

      if (gear.bobo_large_qty > 0) {
        rows.push(['Bobo (Large)', gear.bobo_large_qty, '']);
      }

      if (gear.tambuan_qty > 0) {
        rows.push(['Tambuan', gear.tambuan_qty, '']);
      }

    tbody.innerHTML = '';

    if (rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="text-center text-muted">
            No gear items recorded
          </td>
        </tr>`;
      return;
    }

    rows.forEach(r => {
      tbody.innerHTML += `
        <tr>
          <td>${r[0]}</td>
          <td class="text-center">${r[1]}</td>
          <td class="text-end">${r[2]}</td>
        </tr>
      `;
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="text-danger text-center">
          Failed to load gear details
        </td>
      </tr>
    `;
  }
}



  document
    .getElementById('gearSearchInput')
    .addEventListener('input', applySearchAndFilter);

    document.getElementById('prevPage').onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderPaginated();
      }
    }; 

    document.getElementById('nextPage').onclick = () => {
      const totalPages = Math.max(1, Math.ceil(filteredGears.length / PAGE_SIZE));
      if (currentPage < totalPages) {
        currentPage++;
        renderPaginated();
      }
    };
  try {
    const res = await apiFetch('/api/registration/registered-gears'); 
    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid registered gears response');
    }

    allGears = data;
    applySearchAndFilter();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-danger text-center">
          Failed to load registered gears
        </td>
      </tr>`;
  }
  // ====================================
  // ===== print selected row ===========
  // ====================================
  document.getElementById('printGearFromModal').onclick = async () => {
    if (!currentModalGearId) {
      showMessage('No gear selected to print.' , 'error');
      return;
    }

    // reuse SAME logic as bulk print, but for ONE ID
    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
      <html>
      <head>
        <title>Fishing Gear Registration</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { margin: 0; font-family: Arial, sans-serif; }

          .print-form {
            width: 98%;
            box-sizing: border-box;
            page-break-before: always;
            page-break-after: always;
            break-after: page;
            transform: scale(1.06);
            transform-origin: top left;
          }

          table.print-table {
            width: 96%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          .print-table td {
            border: 1px solid #000;
            padding: 6px;
            vertical-align: middle;
            word-break: break-word;
            font-size: 12px;
          }

          .center { text-align: center; }
          .bold { font-weight: bold; }
          .label { font-weight: bold; width: 25%; }
          .section-title {
            font-weight: bold;
            text-align: center;
            background: #f2f2f2;
          }
          .remarks-box { height: 120px; }
          .signature-box { height: 90px; }
        </style>
      </head>
      <body>
    `);

    const res = await apiFetch(`/api/registration/registered-gears/${currentModalGearId}`);
    const g = await res.json();

    const template = document
      .getElementById('printGearTemplate')
      .cloneNode(true);

    // populate fields (SAME AS BULK PRINT)
    template.querySelector('#pgGearNo').innerText = g.gear_no;
    template.querySelector('#pgAppDate').innerText =
      new Date(g.application_date).toLocaleDateString();
    template.querySelector('#pgOwner').innerText = g.owner_name;
    template.querySelector('#pgAddress').innerText = g.owner_address || '';

    template.querySelector('#pgHandInstruments').innerText = g.hand_instruments || '';
    template.querySelector('#pgLineType').innerText = g.line_type || '';
    template.querySelector('#pgNets').innerText = g.nets || '';
    template.querySelector('#pgPalubog').innerText = g.palubog_nets || '';
    template.querySelector('#pgAccessories').innerText = g.accessories || '';
    template.querySelector('#pgBoboSmall').innerText =
      g.bobo_small_qty > 0 ? g.bobo_small_qty : '';
    template.querySelector('#pgBoboLarge').innerText =
      g.bobo_large_qty > 0 ? g.bobo_large_qty : '';
    template.querySelector('#pgTambuan').innerText =
      g.tambuan_qty > 0 ? g.tambuan_qty : '';

    template.querySelector('#pgRegistered').innerText =
      new Date(g.registered_at).toLocaleDateString();
    template.querySelector('#pgExpiry').innerText =
      new Date(g.expires_at).toLocaleDateString();
    template.querySelector('#pgFee').innerText =
      `₱${Number(g.total_fee).toFixed(2)}`;

    printWindow.document.write(`
      <div class="print-form">
        ${template.innerHTML}
      </div>
    `);
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.close();
      }
    }, 80);

    printWindow.document.write(`</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();

    printWindow.onafterprint = () => {
      printWindow.close();
    };
  };
  // =================================
  // ==== renew modal =============
  // ================================= 
  document.getElementById('renewGearBtn').onclick = async () => {  
  if (!currentModalGearId) return;

  const modal = new bootstrap.Modal(
    document.getElementById('renewGearModal')
  );

  const res = await apiFetch(
    `/api/registration/registered-gears/${currentModalGearId}`
  );
  const g = await res.json();
    // ✅ STORE ORIGINAL VALUES FOR RENEWAL
  currentGearTotalFee = Number(g.total_fee);
  currentGearExpiry = g.expires_at;

  // next expiry = +1 year from OLD expiry
  const oldExp = new Date(g.expires_at);
  const newExp = new Date(oldExp);
  newExp.setFullYear(newExp.getFullYear() + 1);
  nextYearExpiry = newExp.toISOString().split('T')[0];


  // ✅ BASIC INFO
  document.getElementById('gearNo').value = g.gear_no;
  document.getElementById('ownerName').value = g.owner_name;

  // ✅ AUTO-POPULATE GEAR FIELDS
// HAND INSTRUMENTS
document.getElementById('spear_gun').value =
  extractQty(g.hand_instruments, 'Speargun');

document.getElementById('scoop_dip_net').value =
  extractQty(g.hand_instruments, 'Scoop/Dip Net');

document.getElementById('gaff_hook').value =
  extractQty(g.hand_instruments, 'Gaff Hook');

document.getElementById('spears').value =
  extractQty(g.hand_instruments, 'Spears');

document.getElementById('longLine500').value =
  extractQty(g.line_type, 'Long line 500 hooks');

document.getElementById('longLine500plus').value =
  extractQty(g.line_type, '500\\+ hooks');

document.getElementById('pang_ilak').value =
  extractQty(g.palubog_nets, 'Pang-ilak');

document.getElementById('panglonggot').value =
  extractQty(g.palubog_nets, 'Panglonggot');

document.getElementById('pang_mangodlong').value =
  extractQty(g.palubog_nets, 'Pang-mangodolong');

document.getElementById('panghawol_hawol').value =
  extractQty(g.palubog_nets, 'Panghawol-hawol');

document.getElementById('pangmangsi').value =
  extractQty(g.palubog_nets, 'Pangmangsi');

// NETS
document.getElementById('bungsod').value =
  extractQty(g.nets, 'Bungsod');

document.getElementById('palutawNets').value =
  extractQty(g.nets, 'Palutaw Nets');

document.getElementById('palaran').value =
  extractQty(g.nets, 'Palaran');

document.getElementById('pamawo').value =
  extractQty(g.nets, 'Pamawo');

  document.getElementById('boboSmallQty').value = g.bobo_small_qty || 0;
  document.getElementById('boboLargeQty').value = g.bobo_large_qty || 0;
  document.getElementById('tambuanQty').value = g.tambuan_qty || 0;

  document.getElementById('accessories').value = g.accessories || '';
  document.getElementById('renewal_fee').value =
    `₱${Number(g.total_fee).toFixed(2)}`;

  modal.show();
  // =====================================
  // 🔁 Recalculate fee on input change
  // =====================================
  const recalculationFields = [
    'spear_gun',
    'scoop_dip_net',
    'gaff_hook',
    'spears',

    'longLine500',
    'longLine500plus',

    'pang_ilak',
    'panglonggot',
    'pang_mangodlong',
    'panghawol_hawol',
    'pangmangsi',

    'bungsod',
    'palutawNets',
    'palaran',
    'pamawo',

    'boboSmallQty',
    'boboLargeQty',
    'tambuanQty',
    'accessories'
  ];

  recalculationFields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.oninput = () => {
      calculateGearFee();
    };

    el.onchange = () => {
      calculateGearFee();
    };
  });

  // 🔁 Initial recalculation (after auto-fill)
  calculateGearFee();

};
// =========================================================================
// ========================== submit gear renew ============================
// =========================================================================
document.getElementById('submitRenewGear').onclick = async () => {
  if (!currentModalGearId) {
    showMessage('No gear selected', 'error');
    return;
  }

  // ===============================
  // Build summarized fields
  // ===============================
  const handInstruments = [];
  if (+spear_gun.value > 0) handInstruments.push(`Speargun (${spear_gun.value})`);
  if (+scoop_dip_net.value > 0) handInstruments.push(`Scoop/Dip Net (${scoop_dip_net.value})`);
  if (+gaff_hook.value > 0) handInstruments.push(`Gaff Hook (${gaff_hook.value})`);
  if (+spears.value > 0) handInstruments.push(`Spears (${spears.value})`);

  const lineType = [];
  if (+longLine500.value > 0) lineType.push(`Long line 500 hooks (${longLine500.value})`);
  if (+longLine500plus.value > 0) lineType.push(`Long line 500+ hooks (${longLine500plus.value})`);

  const palubogNets = [];
  if (+pang_ilak.value > 0) palubogNets.push(`Pang-ilak (${pang_ilak.value})`);
  if (+panglonggot.value > 0) palubogNets.push(`Panglonggot (${panglonggot.value})`);
  if (+pang_mangodlong.value > 0) palubogNets.push(`Pang-mangodolong (${pang_mangodlong.value})`);
  if (+panghawol_hawol.value > 0) palubogNets.push(`Panghawol-hawol (${panghawol_hawol.value})`);
  if (+pangmangsi.value > 0) palubogNets.push(`Pangmangsi (${pangmangsi.value})`);

  const nets = [];
  if (+bungsod.value > 0) nets.push(`Bungsod (${bungsod.value})`);
  if (+palutawNets.value > 0) nets.push(`Palutaw Nets (${palutawNets.value})`);
  if (+palaran.value > 0) nets.push(`Palaran (${palaran.value})`);
  if (+pamawo.value > 0) nets.push(`Pamawo (${pamawo.value})`);

  // ===============================
  // Payload matches gear_renewals
  // ===============================
  const payload = {
    gear_id: currentModalGearId,

    gear_no: gearNo.value,
    owner_name: ownerName.value,

    hand_instruments: handInstruments.join(', '),
    line_type: lineType.join(', '),
    palubog_nets: palubogNets.join(', '),
    nets: nets.join(', '),

    bobo_small_qty: +boboSmallQty.value || 0,
    bobo_large_qty: +boboLargeQty.value || 0,
    tambuan_qty: +tambuanQty.value || 0,

    accessories: accessories.value || null,

    old_total_fee: currentGearTotalFee,
    new_total_fee: Number(renewal_fee.value.replace('₱', '').trim()),

    old_expires_at: currentGearExpiry,
    new_expires_at: nextYearExpiry
  };
  try {
    const res = await apiFetch('/api/registration/gear-renewals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('RENEW PAYLOAD:', payload); 

    if (!res.ok) {
      showMessage(data.message || 'Failed to submit gear renewal', 'error');
      return;
    }

    showMessage('Gear renewal submitted for approval', 'success');
    // ===============================
    // ✅ Close ALL open modals
    // ===============================
    ['renewGearModal', 'gearDetailsModal'].forEach(id => {
      const modalEl = document.getElementById(id);
      if (!modalEl) return;

      const instance = bootstrap.Modal.getInstance(modalEl);
      if (instance) {
        instance.hide();
      }
    });


    bootstrap.Modal
      .getInstance(document.getElementById('renewGearModal'))
      .hide();

    // 🔄 mark gear as having pending renewal in memory
    const idx = allGears.findIndex(g => g.id === currentModalGearId);
    if (idx !== -1) {
      allGears[idx].has_pending_renewal = 1;
    }

  // 🔄 refresh UI (filters + pagination + render)
  applySearchAndFilter();

  } catch (err) {
    console.error(err);
    showMessage('Server error while submitting renewal', 'error');
  }
};


};
// =================================
// ==== print selected =============
// ================================= 
document.getElementById('selectAllGears')?.addEventListener('change', (e) => {
  document
    .querySelectorAll('.gear-checkbox')
    .forEach(cb => cb.checked = e.target.checked);
});

function getSelectedGearIds() {
  return Array.from(
    document.querySelectorAll('.gear-checkbox:checked')
  ).map(cb => cb.value);
}

document.getElementById('printSelectedGears').onclick = async () => {
  const selectedIds = Array.from(
    document.querySelectorAll('.gear-checkbox:checked')
  ).map(cb => cb.value);

  if (selectedIds.length === 0) {
    showMessage('Please select at least one gear to print.' , 'error');
    return;
  }

  const printWindow = window.open('', '_blank');

  printWindow.document.write(`
    <html>
    <head>
      <title>Fishing Gear Registration</title>
    </head>
    <body>
    <style>
    @media print {
      @page { size: A4 portrait; margin: 10mm; }
      body { margin: 0; font-family: Arial, sans-serif; }
    }

    /* EXACT SAME STYLES AS VESSEL PRINT */
    .print-form {
      width: 99.9%;
      box-sizing: border-box;
      page-break-before: always;
      page-break-after: always;
      break-after: page;
      transform: scale(1.06);
      transform-origin: top left;
    }

    table.print-table {
      width: 99.5%;
      break-after: page;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .print-table td {
      border: 1px solid #000;
      padding: 6px;
      vertical-align: middle;
      word-break: break-word;
      font-size: 12px;
    }

    .center {
      text-align: center;
    }

    .bold {
      font-weight: bold;
    }

    .label {
      font-weight: bold;
      width: 25%;
    }

    .section-title {
      font-weight: bold;
      text-align: center;
      background: #f2f2f2;
    }

    .remarks-box {
      height: 120px;
      vertical-align: top;
    }

    .signature-box {
      height: 90px;
    }
  </style>
  `);

  for (const id of selectedIds) {
    const res = await apiFetch(`/api/registration/registered-gears/${id}`);
    const g = await res.json();

    const template = document
      .getElementById('printGearTemplate')
      .cloneNode(true);

      template.querySelector('#pgGearNo').innerText = g.gear_no;
      template.querySelector('#pgAppDate').innerText =
        new Date(g.application_date).toLocaleDateString();

      template.querySelector('#pgOwner').innerText = g.owner_name;
      template.querySelector('#pgAddress').innerText = g.owner_address || '';

      template.querySelector('#pgHandInstruments').innerText =
        g.hand_instruments || '';

      template.querySelector('#pgLineType').innerText =
        g.line_type || '';

      template.querySelector('#pgNets').innerText =
        g.nets || '';

      template.querySelector('#pgPalubog').innerText =
        g.palubog_nets || '';

      template.querySelector('#pgAccessories').innerText =
        g.accessories || '';

      template.querySelector('#pgBoboSmall').innerText =
        g.bobo_small_qty > 0 ? g.bobo_small_qty : '';

      template.querySelector('#pgBoboLarge').innerText =
        g.bobo_large_qty > 0 ? g.bobo_large_qty : '';

      template.querySelector('#pgTambuan').innerText =
        g.tambuan_qty > 0 ? g.tambuan_qty : '';


      template.querySelector('#pgRegistered').innerText =
        new Date(g.registered_at).toLocaleDateString();

      template.querySelector('#pgExpiry').innerText =
        new Date(g.expires_at).toLocaleDateString();

      template.querySelector('#pgFee').innerText =
        `₱${Number(g.total_fee).toFixed(2)}`;


    printWindow.document.write(`
      <div class="page">
        ${template.innerHTML}
      </div>
    `);
  }
      setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.close();
      }
    }, 80);

  printWindow.document.write(`</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();

  printWindow.onafterprint = () => {
    printWindow.close();
  };
};
// =============================================
// =========== load gear fees ==================
// =============================================
let gearFees = [];

async function loadGearFees() {
  try {
    const res = await apiFetch('/api/registration/gear-fees');

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
  const saveBtn = document.getElementById('submitRenewGear');

  feeInput.value = total > 0 ? total.toFixed(2) : '';
  saveBtn.disabled = total <= 0;
}