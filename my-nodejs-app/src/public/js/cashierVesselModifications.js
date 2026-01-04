window.initCashierVesselModifications = async function () {
  let allModifications = [];
  let filteredModifications = [];
  let currentPage = 1;
  const PAGE_SIZE = 10;


  const tbody = document.getElementById('cashierModificationsBody');

  try {
    const res = await fetch('/api/registration/cashier/vessel-modifications');
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted">
            No pending vessel modifications
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = '';

    allModifications = data;
    filteredModifications = data;
    currentPage = 1;
    renderModifications();


    function renderModifications() {
      const tbody = document.getElementById('cashierModificationsBody');
      tbody.innerHTML = '';

      const totalPages = Math.max(
        1,
        Math.ceil(filteredModifications.length / PAGE_SIZE)
      );
      currentPage = Math.min(currentPage, totalPages);

      const start = (currentPage - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      const pageItems = filteredModifications.slice(start, end);

      if (pageItems.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center text-muted">
              No matching vessel modifications
            </td>
          </tr>`;
      } else {
        pageItems.forEach(m => {
          tbody.innerHTML += `
            <tr>
              <td>${m.vessel_no}</td>
              <td>${m.owner_name}</td>
              <td>${m.summary}</td>
              <td class="text-end">
                ₱${Number(m.modification_fee).toFixed(2)}
              </td>
              <td class="text-center">
                <button
                  class="btn btn-success btn-sm me-1"
                  onclick="approveVesselModification(${m.id})">
                  Approve
                </button>
                <button
                  class="btn btn-danger btn-sm"
                  onclick="rejectVesselModification(${m.id})">
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




  } catch (err) {
    console.error(err);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-danger text-center">
          Failed to load modifications
        </td>
      </tr>`;
  }
  document
  .getElementById('cashierModSearch')
  ?.addEventListener('input', e => {
    const keyword = e.target.value.toLowerCase();

    const filtered = allModifications.filter(m =>
      m.vessel_no.toLowerCase().includes(keyword) ||
      m.owner_name.toLowerCase().includes(keyword)
    );

    filteredModifications = filtered;
    currentPage = 1;
    renderModifications();
  });


  document.getElementById('prevPage')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderModifications();
    }
  });

  document.getElementById('nextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(
      filteredModifications.length / PAGE_SIZE
    );
    if (currentPage < totalPages) {
      currentPage++;
      renderModifications();
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
//=================== approve modification ===================
async function approveVesselModification(id) {
   const confirmed = await confirmAction({
    title: 'Approve Modification',
    message: 'Are you sure you want to approve this vessel modification?',
    confirmText: 'Approve',
    confirmClass: 'btn-success'
  });

  if (!confirmed) {
    showMessage('Approval cancelled.', 'warning');
    return;
  }

  const res = await fetch(
    `/api/registration/cashier/vessel-modifications/${id}/approve`,
    { method: 'POST' }
  );

  const data = await res.json();

  if (!res.ok) {
    showMessage(data.message || 'Approval failed');
    return;
  }

  showMessage('Vessel modification approved');
  initCashierVesselModifications();
}

async function rejectVesselModification(id) {
  const confirmed = await confirmAction({
    title: 'Reject Modification',
    message: 'Are you sure you want to reject this vessel modification?',
    confirmText: 'Reject',
    confirmClass: 'btn-danger'
  });

  if (!confirmed) {
    showMessage('Rejection cancelled.', 'warning');
    return;
  }

  try {
    const res = await fetch(
      `/api/registration/cashier/vessel-modifications/${id}/reject`,
      { method: 'POST' }
    );

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || 'Rejection failed', 'error');
      return;
    }

    showMessage('Vessel modification rejected', 'success');

    // 🔄 Refresh table
    initCashierVesselModifications();

  } catch (err) {
    console.error(err);
    showMessage('Server error while rejecting modification', 'error');
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
