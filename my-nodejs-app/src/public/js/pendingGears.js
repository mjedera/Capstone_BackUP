// pendingGears.js
window.initPendingGears = async function () {
  let allPendingGears = [];
  let filteredPendingGears = [];
  let currentPage = 1;
  const PAGE_SIZE = 10;
  const tbody = document.getElementById('pendingGearsBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center">Loading...</td></tr>`;

  try {
    const res = await fetch('/api/registration/pending-gears');
    if (!res.ok) throw new Error('Failed to fetch pending gears');

    const gears = await res.json();
    tbody.innerHTML = '';

    if (!gears.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted">
            No pending fishing gear registrations
          </td>
        </tr>`;
      return;
    }
    allPendingGears = gears;
    filteredPendingGears = gears;
    renderPendingGears();

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-danger">
          Failed to load pending fishing gears
        </td>
      </tr>`;
  }
  function renderPendingGears() {
    const tbody = document.getElementById('pendingGearsBody');
    tbody.innerHTML = '';

    const totalPages = Math.max(1, Math.ceil(filteredPendingGears.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageItems = filteredPendingGears.slice(start, end);

    if (pageItems.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted">
            No matching pending fishing gears
          </td>
        </tr>`;
    } else {
      pageItems.forEach((g, index) => {
        tbody.innerHTML += `
          <tr>
            <td>${start + index + 1}</td>
            <td>${g.gear_no}</td>
            <td>${g.owner_name}</td>
            <td>${g.owner_address}</td>
            <td>₱${Number(g.total_fee).toFixed(2)}</td>
            <td>
              <span class="badge bg-warning text-dark">Pending</span>
            </td>
            <td class="text-center">
              <button class="btn btn-success btn-sm me-1"
                onclick="approveGear(${g.id})">
                Approve
              </button>
              <button class="btn btn-danger btn-sm"
                onclick="rejectGear(${g.id})">
                Reject
              </button>
            </td>
          </tr>
        `;
      });
    }

    updatePaginationUI(totalPages);
  }
  function updatePaginationUI(totalPages) {
    const indicator = document.getElementById('pageIndicator');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    indicator.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
  }

  document.getElementById('prevPage')?.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderPendingGears();
      }
    });

    document.getElementById('nextPage')?.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredPendingGears.length / PAGE_SIZE);
      if (currentPage < totalPages) {
        currentPage++;
        renderPendingGears();
      }
    });

};
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
// -------------------------------
// ACTION HANDLERS
// -------------------------------

window.approveGear = async function (id) {
  const confirmed = await confirmAction({
    title: 'Approve Gear',
    message: 'Approve this gear registration?',
    confirmText: 'Approve',
    confirmClass: 'btn-success'
  });
  if (!confirmed) {
    showMessage('Approval cancelled.', 'warning');
    return;
  }
  try {
    const res = await fetch(`/api/registration/gears/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED' })
    });

    if (!res.ok) throw new Error('Approval failed');

    showMessage('Fishing gear approved successfully', 'success');
    initPendingGears();

  } catch (err) {
    console.error(err);
    showMessage('Failed to approve fishing gear', 'error');
  }
};

window.rejectGear = async function (id) {
  const confirmed = await confirmAction({
    title: 'Reject Gear',
    message: 'Reject this gear registration?',
    confirmText: 'Reject',
    confirmClass: 'btn-danger'
  });
  if (!confirmed) {
    showMessage('Rejection cancelled.', 'warning');
    return;
  }
  try {
    const res = await fetch(`/api/registration/gears/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REJECTED' })
    });

    if (!res.ok) throw new Error('Rejection failed');

    showMessage('Fishing gear rejected', 'danger');
    initPendingGears();

  } catch (err) {
    console.error(err);
    showMessage('Failed to reject fishing gear', 'error');
  }
};
