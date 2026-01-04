window.initApprehendedFisherfolks = async function () {
  let allReports = [];
  let filteredReports = [];
  let currentPage = 1;
  const PAGE_SIZE = 10;

  const tbody = document.getElementById('apprehendedFisherfolksBody');

  try {
    const res = await fetch('/api/registration/apprehended-fisherfolks');
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted">
            No apprehended fisherfolks found
          </td>
        </tr>`;
      return;
    }

    allReports = data;
    filteredReports = data;
    currentPage = 1;
    render();

    function render() {
      tbody.innerHTML = '';

      const totalPages = Math.max(
        1,
        Math.ceil(filteredReports.length / PAGE_SIZE)
      );
      currentPage = Math.min(currentPage, totalPages);

      const start = (currentPage - 1) * PAGE_SIZE;
      const pageItems = filteredReports.slice(start, start + PAGE_SIZE);

      pageItems.forEach(r => {
        const gearText = r.gear_count
          ? `${r.gear_count} gear type${r.gear_count > 1 ? 's' : ''}`
          : '—';

        tbody.innerHTML += `
          <tr>
            <td>${r.violator_no || '—'}</td>
            <td>${r.full_name}</td>
            <td>${new Date(r.apprehension_date).toLocaleDateString()}</td>
            <td>${r.vessel_type || '—'}</td>
            <td>${gearText}</td>
            <td>${r.penalty_details || '—'}</td>
            <td class="text-end">
            <button
                class="btn btn-sm btn-success me-1"
                onclick="approveApprehension(${r.id})">
                Approve
            </button>

            <button
                class="btn btn-sm btn-danger"
                onclick="rejectApprehension(${r.id})">
                Reject
            </button>
            </td>
          </tr>`;
      });

      updatePagination(totalPages);
    }

    function updatePagination(totalPages) {
      document.getElementById('pageIndicator').textContent =
        `Page ${currentPage} of ${totalPages}`;

      document.getElementById('prevPage').disabled = currentPage === 1;
      document.getElementById('nextPage').disabled = currentPage === totalPages;
    }

    // 🔍 SEARCH (same as cashier)
    document
      .getElementById('cashierModSearch')
      ?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();

        filteredReports = allReports.filter(r =>
          (r.violator_no || '').toLowerCase().includes(q) ||
          (r.full_name || '').toLowerCase().includes(q)
        );

        currentPage = 1;
        render();
      });

    // ⏮ Pagination
    document.getElementById('prevPage')?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        render();
      }
    });

    document.getElementById('nextPage')?.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredReports.length / PAGE_SIZE);
      if (currentPage < totalPages) {
        currentPage++;
        render();
      }
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-danger text-center">
          Failed to load apprehended fisherfolks
        </td>
      </tr>`;
  }
  
};
async function approveApprehension(id) {
  const confirmed = await confirmAction({
    title: 'Approve Apprehension',
    message: 'Are you sure you want to approve this apprehension?',
    confirmText: 'Approve',
    confirmClass: 'btn-success'
  });

  if (!confirmed) return;

  try {
    const res = await fetch(
      `/api/registration/apprehensions/${id}/approve`,
      { method: 'POST' }
    );

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || 'Failed to approve apprehension', 'error');
      return;
    }

    showMessage('Apprehension approved successfully', 'success');
    initApprehendedFisherfolks(); // 🔄 refresh list
  } catch (err) {
    console.error(err);
    showMessage('Server error while approving', 'error');
  }
}

async function rejectApprehension(id) {
  const confirmed = await confirmAction({
    title: 'Reject Apprehension',
    message: 'Are you sure you want to reject this apprehension?',
    confirmText: 'Reject',
    confirmClass: 'btn-danger'
  });

  if (!confirmed) return;

  try {
    const res = await fetch(
      `/api/registration/apprehensions/${id}/reject`,
      { method: 'POST' }
    );

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || 'Failed to reject apprehension', 'error');
      return;
    }

    showMessage('Apprehension rejected', 'success');
    initApprehendedFisherfolks(); // 🔄 refresh list
  } catch (err) {
    console.error(err);
    showMessage('Server error while rejecting', 'error');
  }
}
