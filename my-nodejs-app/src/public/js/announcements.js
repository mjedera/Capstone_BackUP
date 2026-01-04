window.initAnnouncements = function () {
  let allAnnouncements = [];
  let editingAnnouncementId = null;
  let currentPage = 1;
  const pageSize = 10;

  const tbody = document.getElementById('announcementBody');
  const searchInput = document.getElementById('announcementSearch');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  const pageIndicator = document.getElementById('pageIndicator');
  const paginationWrapper = document.getElementById('paginationWrapper');
  const newBtn = document.getElementById('newAnnouncement');
  const dropdown = document.getElementById('announcementStatus');
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

  async function fetchAnnouncements() {
    const status = statusLabel.textContent.toLowerCase();
    const search = searchInput.value.trim();

    const res = await apiFetch(
      `/api/announcements?page=${currentPage}&limit=${pageSize}&status=${status}&search=${encodeURIComponent(search)}`
    );

    return res.json();
  }
function formatMeetingDate(dateString) {
  if (!dateString) return '-';

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatMeetingTime(timeString) {
  if (!timeString) return '-';

  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(hours, minutes);

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
function toDateInputValue(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toISOString().split('T')[0];
}


function renderRows(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No announcements found</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(a => `
    <tr>
      <td>${a.title}</td>
      <td>${a.message}</td>
      <td>${formatMeetingDate(a.meeting_date)}</td>
      <td>${formatMeetingTime(a.meeting_time)}</td>
      <td>${a.location || '-'}</td>
      <td>
        <span class="badge ${a.status === 'ACTIVE' ? 'badge-success' : 'badge-secondary'}">
          ${a.status.charAt(0).toUpperCase() + a.status.slice(1)}
        </span>
      </td>
      <td>
       <button class="action-btn"
          onclick='editAnnouncement(${JSON.stringify(a)})'>
          ✏️
        </button>
        <button class="action-btn delete" onclick="deleteAnnouncement(${a.id})" style="font-size:15px;">
          🗑
        </button>
      </td>
    </tr>
  `).join('');
}


async function load() {
  tbody.innerHTML = `<tr><td colspan="7">Loading...</td></tr>`;
  const data = await fetchAnnouncements();

  allAnnouncements = data; 
  applyFilters();          
}
function applyFilters() {
  const status = statusLabel.textContent.toUpperCase();
  const search = searchInput.value.trim().toLowerCase();

  let filtered = allAnnouncements;

  // 🔽 STATUS FILTER
  if (status !== 'ALL') {
    filtered = filtered.filter(a => a.status === status);
  }

  // 🔍 SEARCH FILTER
  if (search) {
    filtered = filtered.filter(a =>
      a.title.toLowerCase().includes(search)
    );
  }

  filteredAnnouncements = filtered;

  renderPaginatedRows();
}
function renderPaginatedRows() {
  const totalItems = filteredAnnouncements.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Clamp page number
  if (currentPage > totalPages) currentPage = totalPages || 1;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  const pageData = filteredAnnouncements.slice(start, end);

  renderRows(pageData);

  // Pagination UI
  pageIndicator.textContent = totalPages
    ? `Page ${currentPage} of ${totalPages}`
    : '';

paginationWrapper.style.display = 'flex';
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

  // Events
searchInput.addEventListener('input', () => {
  applyFilters();
});

  document.querySelectorAll('#announcementStatus .dropdown-menu li')
    .forEach(li => {
      li.onclick = () => {
        statusLabel.textContent = li.textContent;
        currentPage = 1;
        load();
      };
    });

  newBtn.onclick = () => {
    // YOU can decide later if this opens a modal or loads a partial
    openAnnouncementModal();
  };

  load();

  // ===================== modal =================================
  const modal = document.getElementById('announcementModal');

    function openAnnouncementModal() {
    modal.style.display = 'flex';
    }

function closeAnnouncementModal() {
  modal.style.display = 'none';

  editingAnnouncementId = null;
  document.getElementById('saveAnnouncement').textContent = 'Save Announcement';

  document.getElementById('announcementTitle').value = '';
  document.getElementById('announcementMessage').value = '';
  document.getElementById('announcementDate').value = '';
  document.getElementById('announcementTime').value = '';
  document.getElementById('announcementLocation').value = '';
}


    document.getElementById('closeAnnouncementModal').onclick = closeAnnouncementModal;
    document.getElementById('cancelAnnouncement').onclick = closeAnnouncementModal;
    
  // ================== submit announcement ================================
document.getElementById('saveAnnouncement').onclick = async () => {
  const payload = {
    title: document.getElementById('announcementTitle').value.trim(),
    message: document.getElementById('announcementMessage').value.trim(),
    meeting_date: document.getElementById('announcementDate').value || null,
    meeting_time: document.getElementById('announcementTime').value || null,
    location: document.getElementById('announcementLocation').value.trim(),
    status: 'ACTIVE' // keep active unless admin changes it later
  };

  if (!payload.title || !payload.message) {
    showMessage('Title and message are required', 'error');
    return;
  }

  try {
    // 🔁 CREATE vs UPDATE
    const url = editingAnnouncementId
      ? `/api/announcements/${editingAnnouncementId}`
      : '/api/announcements';

    const method = editingAnnouncementId ? 'PUT' : 'POST';

    await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // ✅ Reset state
    editingAnnouncementId = null;
    document.getElementById('saveAnnouncement').textContent = 'Save Announcement';

    closeAnnouncementModal();
    currentPage = 1;
    load();

    showMessage(
      editingAnnouncementId
        ? 'Announcement updated successfully'
        : 'Announcement added successfully',
      'success'
    );
  } catch (err) {
    console.error(err);
    alert('Failed to save announcement');
  }
};

    
    // ==================================== cancel announcement =================================

    window.editAnnouncement = function (a) {
      showMessage('Editing announcement', 'primary'); 
      editingAnnouncementId = a.id;

      document.getElementById('announcementTitle').value = a.title;
      document.getElementById('announcementMessage').value = a.message;
     document.getElementById('announcementDate').value = toDateInputValue(a.meeting_date);
      document.getElementById('announcementTime').value = a.meeting_time || '';
      document.getElementById('announcementLocation').value = a.location || '';

      document.getElementById('saveAnnouncement').textContent = 'Update Announcement';
      document.getElementById('announcementModal').style.display = 'flex';
    };
    // ============= deleting announcement =====================
    window.deleteAnnouncement = async function (id) {
      const confirmed = await confirmAction({
        title: 'Delete Announcement',
        message: 'This announcement will be permanently deleted.',
        confirmText: 'Delete',
        confirmClass: 'btn-danger'
      });

      if (!confirmed) return;

      try {
        await apiFetch(`/api/announcements/${id}`, {
          method: 'DELETE'
        });

        load();
        showMessage('Announcement deleted successfully', 'success');
      } catch (err) {
        console.error(err);
        showMessage('Failed to delete announcement', 'error');
      }
    };

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