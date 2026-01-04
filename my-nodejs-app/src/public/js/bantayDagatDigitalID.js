async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);

  if (res.status === 401 || res.status === 403) {
    alert('Session expired. Please login again.');
    window.location.href = '/BantayDagat';
    throw new Error('Unauthorized');
  }

  return res;
}
window.loadBantayDagatDigitalID = async function () {
  try {
    const res = await apiFetch('/api/bantay-dagat/current');
    if (!res.ok) return;

    const user = await res.json();

    // TEXT DATA
    document.getElementById('bdFullName').textContent =
      `${user.first_name} ${user.middle_name || ''} ${user.last_name} ${user.extra_name || ''}`;

    document.getElementById('bdAge').textContent = user.age || '—';
    document.getElementById('bdSex').textContent = user.sex || '—';
    document.getElementById('bdBirthday').textContent =
      user.birthdate ? new Date(user.birthdate).toLocaleDateString() : '—';
    document.getElementById('bdAddress').textContent = user.address || '—';
    document.getElementById('bdStatus').textContent = user.marital_status || '—';

    // PHOTO
    const photoEl = document.getElementById('bdPhoto');
    photoEl.src = user.bantay_dagat_photo
      ? (user.bantay_dagat_photo.startsWith('/')
          ? user.bantay_dagat_photo
          : `/bantay_dagat_photo/${user.bantay_dagat_photo}`)
      : '/bantay_dagat_photo/default.png';

    photoEl.onerror = () => {
      photoEl.src = '/bantay_dagat_photo/default.png';
    };

    // LOGO (REAL SYSTEM LOGO)
    const logoEl = document.getElementById('bdLogo');
    try {
      const logoRes = await apiFetch('/api/admin/logo?v=' + Date.now()); 
      const logoData = await logoRes.json();

      logoEl.src = logoData.logoPath
        ? logoData.logoPath + '?v=' + Date.now()
        : '/logos/default.png';
    } catch {
      logoEl.src = '/logos/default.png';
    }

  } catch (err) {
    console.error('Bantay Dagat Digital ID error:', err);
  }
};
