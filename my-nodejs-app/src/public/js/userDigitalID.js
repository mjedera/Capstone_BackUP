async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);

  if (res.status === 401 || res.status === 403) {
    alert('Session expired. Please login again.');
    window.location.href = '/userLogin';
    throw new Error('Unauthorized');
  }

  return res;
}
window.loadUserDigitalID = async function () {
  try {
    // ===============================
    // FETCH APPLICANT DATA
    // ===============================
    const res = await apiFetch('/api/fisherFolkRoutes/currentApplicant');
    const result = await res.json();
    if (!result.loggedIn) return;

    const user = result.data;

    // ===============================
    // TEXT DATA
    // ===============================
    const fullName = [
      user.first_name,
      user.middle_name,
      user.last_name,
      user.extra_name
    ].filter(Boolean).join(' ');

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value || '—';
    };

    setText('digitalFullName', fullName);
    setText('digitalAge', user.age);
    setText('digitalSex', user.sex);
    setText(
      'digitalBirthday',
      user.birthdate ? new Date(user.birthdate).toLocaleDateString() : '—'
    );
    setText('digitalAddress', user.address);
    setText('digitalStatus', user.marital_status);
    setText('digitalType', user.applicant_type);

    // ===============================
    // PHOTO
    // ===============================
    const photo = document.getElementById('digitalPhoto');
    if (photo) {
      photo.src = user.applicant_photo
        ? (user.applicant_photo.startsWith('/')
            ? user.applicant_photo
            : `/applicant_photos/${user.applicant_photo}`)
        : '/applicant_photos/default.png';

      photo.onerror = () => {
        photo.src = '/applicant_photos/default.png';
      };
    }

    // ===============================
    // ADMIN LOGO (DYNAMIC)
    // ===============================
    try {
      const logoRes = await fetch('/api/admin/logo?v=' + Date.now());
      const logoData = await logoRes.json();

      const logoEl = document.getElementById('digitalLogo');
      if (logoEl && logoData.logoPath) {
        logoEl.src = logoData.logoPath + '?v=' + Date.now();
      }
    } catch {
      console.warn('Admin logo not loaded, using default.');
    }
 
  } catch (err) {
    console.error('Digital ID load failed:', err);
  }
};
