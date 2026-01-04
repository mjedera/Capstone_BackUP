window.initCashierVesselRenewals = async function () {
  let filteredRenewals = [];
  let currentPage = 1;
  const PAGE_SIZE = 10;
  let allRenewals = [];
  const tbody = document.getElementById('cashierRenewalsBody');
  const dropdown = document.getElementById('gearVesselRenewal');
  const statusLabel = document.getElementById('statusLabel');
    dropdown.querySelector('.dropdown-toggle').onclick = (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  };
    document.addEventListener('click', () => {
    dropdown.classList.remove('open');
  });
dropdown.querySelectorAll('.dropdown-menu li').forEach(item => {
  item.onclick = (e) => {
    e.stopPropagation();

    statusLabel.textContent = item.dataset.value;
    dropdown.classList.remove('open');

    dropdown.querySelectorAll('li').forEach(li =>
      li.classList.remove('active')
    );
    item.classList.add('active');

    applyFilters(); // 👈 THIS is the magic
  };
});

  try {
    const res = await fetch('/api/registration/cashier/renewals');
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted">
            No pending renewals
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = '';

    allRenewals = data;
    filteredRenewals = data;
    currentPage = 1;
    renderRenewals();


    function renderRenewals() {
      tbody.innerHTML = '';

      const totalPages = Math.max(
        1,
        Math.ceil(filteredRenewals.length / PAGE_SIZE)
      );
      currentPage = Math.min(currentPage, totalPages);

      const start = (currentPage - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      const pageItems = filteredRenewals.slice(start, end);

      if (pageItems.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center text-muted">
              No matching renewals found
            </td>
          </tr>`;
      } else {
        pageItems.forEach(r => {
          tbody.innerHTML += `
            <tr>
              <td>${r.vessel_no || r.gear_no}</td>
              <td>${r.owner_name}</td>
              <td class="text-end">₱${Number(r.base_fee).toFixed(2)}</td>
              <td class="text-end text-danger">
                ₱${Number(r.penalty_fee).toFixed(2)}
              </td>
              <td class="text-end fw-bold text-success">
                ₱${Number(r.total_fee).toFixed(2)}
              </td>
              <td class="text-center">
                <button
                  class="btn btn-success btn-sm me-1"
                  onclick="approveRenewal(${r.id}, '${r.type}')"
                >
                  Approve
                </button>

                <button
                  class="btn btn-danger btn-sm"
                  onclick="rejectRenewal(${r.id}, '${r.type}')"
                >
                  Reject
                </button>
              </td>
            </tr>
          `;
        });
      }

      updatePaginationUI(totalPages);
    }
    function applyFilters() {
      const keyword =
        document.getElementById('cashierRenewalSearch')
          ?.value
          .toLowerCase() || '';

      const selected =
        statusLabel.textContent.toLowerCase();

      filteredRenewals = allRenewals.filter(r => {
        // 🔍 search filter
        const matchesSearch =
          (r.vessel_no && r.vessel_no.toLowerCase().includes(keyword)) ||
          (r.gear_no && r.gear_no.toLowerCase().includes(keyword)) ||
          r.owner_name.toLowerCase().includes(keyword);

        if (!matchesSearch) return false;

        // 📂 dropdown filter
        if (selected === 'all') return true;
        if (selected === 'gears') return !!r.gear_no;
        if (selected === 'vessels') return !!r.vessel_no;

        return true;
      });

      currentPage = 1;
      renderRenewals();
    }

    function updatePaginationUI(totalPages) {
      const indicator = document.getElementById('pageIndicator');
      const prevBtn = document.getElementById('prevPage');
      const nextBtn = document.getElementById('nextPage');

      indicator.textContent = `Page ${currentPage} of ${totalPages}`;
      prevBtn.disabled = currentPage === 1;
      nextBtn.disabled = currentPage === totalPages;
    }
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-danger text-center">
          Failed to load renewals
        </td>
      </tr>`;
  }
    document.getElementById('prevPage')?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderRenewals();
      }
    });

    document.getElementById('nextPage')?.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredRenewals.length / PAGE_SIZE);
      if (currentPage < totalPages) {
        currentPage++;
        renderRenewals();
      }
    });


document
  .getElementById('cashierRenewalSearch')
  ?.addEventListener('input', applyFilters);
};

window.showMessage = function (msg, type = 'success') {
    const messageBox = document.getElementById('messageBox');
    if (!messageBox) return;
    messageBox.textContent = msg;
    messageBox.className = `message-box show ${type}`;
    setTimeout(() => messageBox.classList.remove('show'), 3000);
}

//=================== approve renewal ===================
async function approveRenewal(id, type) {

  const confirmed = await confirmAction({
    title: 'Approve Renewal',
    message: `Are you sure you want to approve this ${type.toLowerCase()} renewal?`,
    confirmText: 'Approve',
    confirmClass: 'btn-success'
  });

  if (!confirmed) {
    showMessage('Approval cancelled.', 'warning');
    return;
  }

  // 🔀 Choose endpoint based on type
  let url = '';

  if (type === 'VESSEL') {
    url = `/api/registration/cashier/vessel-renewals/${id}/approve`;
  } else if (type === 'GEAR') {
    url = `/api/registration/cashier/gear-renewals/${id}/approve`;
  } else {
    showMessage('Unknown renewal type', 'error');
    return;
  }

  try {
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || 'Approval failed', 'error');
      return;
    }

    showMessage(`${type} renewal approved successfully`, 'success');

    // 🔄 Refresh table
    initCashierVesselRenewals();

  } catch (err) {
    console.error(err);
    showMessage('Server error while approving renewal', 'error');
  }
}
async function rejectRenewal(id, type) {
  const confirmed = await confirmAction({
    title: 'Reject Renewal',
    message: `Are you sure you want to reject this ${type.toLowerCase()} renewal?`,
    confirmText: 'Reject',
    confirmClass: 'btn-danger'
  });

  if (!confirmed) {
    showMessage('Rejection cancelled.', 'warning');
    return;
  }

  let url = '';

  if (type === 'VESSEL') {
    url = `/api/registration/cashier/vessel-renewals/${id}/reject`;
  } else if (type === 'GEAR') {
    url = `/api/registration/cashier/gear-renewals/${id}/reject`;
  } else {
    showMessage('Unknown renewal type', 'error');
    return;
  }

  try {
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || 'Rejection failed', 'error');
      return;
    }

    showMessage(`${type} renewal rejected successfully`, 'success');

    // 🔄 Refresh list
    initCashierVesselRenewals();

  } catch (err) {
    console.error(err);
    showMessage('Server error while rejecting renewal', 'error');
  }
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