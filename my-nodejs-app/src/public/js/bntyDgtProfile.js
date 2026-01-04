async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);

  if (res.status === 401 || res.status === 403) {
    alert('Session expired. Please login again.');
    window.location.href = '/BantayDagat';
    throw new Error('Unauthorized');
  }

  return res;
}
window.bntydgtProfile = async function () {
    try {
        const res = await apiFetch('/api/bantay-dagat/current'); 
        if (!res.ok) throw new Error('Failed to fetch user data');

        const user = await res.json();

        document.getElementById('profile-name').textContent = `${user.first_name} ${user.middle_name || ''} ${user.last_name}`;
        document.getElementById('profile-username').textContent = user.username;
        document.getElementById('full-name').textContent = `${user.first_name} ${user.middle_name || ''} ${user.last_name}`;
        document.getElementById('age').textContent = user.age;
        document.getElementById('sex').textContent = user.sex;

        const birthDate = new Date(user.birthdate);
        document.getElementById('birthday').textContent = birthDate.toLocaleDateString();

        document.getElementById('address').textContent = user.address;
        document.getElementById('marital-status').textContent = user.marital_status;
        document.getElementById('applicant-type').textContent = user.extra_name || '-';

        if (user.bantay_dagat_photo) {
            document.getElementById('bantayDagatPhoto').src = user.bantay_dagat_photo;
        } else {
            document.getElementById('bantayDagatPhoto').src = '/bantay_dagat_photo/default.png';
        }

    } catch (err) {
        console.error('Failed to load profile:', err);
    }

    const uploadBtn = document.getElementById('uploadBtn');
    const photoInput = document.getElementById('photoInput');
    const bantayDagatPhoto = document.getElementById('bantayDagatPhoto');

    uploadBtn.addEventListener('click', () => {
        photoInput.click(); // open file dialog
    });

    photoInput.addEventListener('change', async () => {
        const file = photoInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('bantay_dagat_photo', file);

        try {
            const res = await apiFetch('/api/bantay-dagat/upload-photo', { // we’ll create this endpoint
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (res.ok) {
                // Update photo on the page immediately
                bantayDagatPhoto.src = data.photoPath;
                alert('Photo uploaded successfully!');
            } else {
                alert(data.message || 'Upload failed.');
            }

        } catch (err) {
            console.error('Upload error:', err);
            alert('Something went wrong.');
        }
    });

};
