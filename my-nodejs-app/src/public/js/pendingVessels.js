window.initPendingVessels = async function () {
  let allPendingVessels = [];
  let filteredPendingVessels = [];
  let currentPage = 1;  
  const PAGE_SIZE = 10;
  const tbody = document.getElementById('pendingVesselsBody');
  tbody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';

  try {
    const res = await fetch('/api/registration/pending-vessels');
    if (!res.ok) throw new Error('Failed to fetch');

    const vessels = await res.json();
    tbody.innerHTML = '';

    if (vessels.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted">
            No pending vessel registrations
          </td>
        </tr>
      `;
      return;
    }

    allPendingVessels = vessels;
    loadPendingVesselsRows(allPendingVessels);
    function loadPendingVesselsRows(list) {
      const tbody = document.getElementById('pendingVesselsBody');
      tbody.innerHTML = '';

      filteredPendingVessels = list;

      const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
      currentPage = Math.min(currentPage, totalPages);

      const start = (currentPage - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      const pageItems = list.slice(start, end);

      if (pageItems.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center text-muted">
              No matching pending vessels
            </td>
          </tr>
        `;
      } else {
        pageItems.forEach(v => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${v.vessel_no}</td>
            <td>${v.vessel_name}</td>
            <td>${v.owner_name}</td>
            <td>${v.vessel_type}</td>
            <td class="text-center">${v.gross_tonnage}</td>
            <td>₱${Number(v.registration_fee).toFixed(2)}</td>
            <td class="text-center">
              <span class="badge bg-warning text-dark px-3 py-1">Pending</span>
            </td>
            <td class="text-end">
              <button class="btn btn-success btn-sm me-1"
                onclick="approveVessel(${v.id})">
                Approve
              </button>
              <button class="btn btn-danger btn-sm"
                onclick="rejectVessel(${v.id})">
                Reject
              </button>
            </td>
          `;
          tbody.appendChild(tr);
        });
      }

      updatePaginationUI(totalPages);
      function updatePaginationUI(totalPages) {
        const indicator = document.getElementById('pageIndicator');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        indicator.textContent = `Page ${currentPage} of ${totalPages}`;

        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
      }

    }

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-danger">
          Failed to load pending vessels
        </td>
      </tr>
    `;
  }
  document
    .getElementById('pendingVesselSearch')
    ?.addEventListener('input', e => {
      const keyword = e.target.value.toLowerCase();

      const filtered = allPendingVessels.filter(v =>
        v.vessel_no.toLowerCase().includes(keyword) ||
        v.vessel_name.toLowerCase().includes(keyword) ||
        v.owner_name.toLowerCase().includes(keyword) ||
        v.vessel_type.toLowerCase().includes(keyword)
      );

      currentPage = 1; // ✅ RESET TO PAGE 1
      loadPendingVesselsRows(filtered);
    });


    document.getElementById('prevPage')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadPendingVesselsRows(filteredPendingVessels);
    }
  });

  document.getElementById('nextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredPendingVessels.length / PAGE_SIZE);
    if (currentPage < totalPages) {
      currentPage++;
      loadPendingVesselsRows(filteredPendingVessels);
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
// ------------------------
// ACTION HANDLERS
// ------------------------
window.approveVessel = async function (id) {
  const confirmed = await confirmAction({
    title: 'Approve Vessel',
    message: 'Approve this vessel registration?',
    confirmText: 'Approve',
    confirmClass: 'btn-success'
  });


  if (!confirmed) {
    showMessage('Approval cancelled.', 'warning');
    return;
  }

  await fetch(`/api/registration/vessels/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'APPROVED' })
  });

  showMessage('Vessel approved successfully', 'success');
  initPendingVessels();
};

window.rejectVessel = async function (id) {
  const confirmed = await confirmAction({
    title: 'Reject Vessel',
    message: 'Reject this vessel registration?',
    confirmText: 'Reject',
    confirmClass: 'btn-danger'
  });


  if (!confirmed) {
    showMessage('Rejection cancelled.', 'warning');
    return;
  }

  await fetch(`/api/registration/vessels/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'REJECTED' })
  });

  showMessage('Vessel rejected', 'danger');
  initPendingVessels();
};


