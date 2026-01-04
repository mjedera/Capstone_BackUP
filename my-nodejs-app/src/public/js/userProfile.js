async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);

  if (res.status === 401 || res.status === 403) {
    alert('Session expired. Please login again.');
    window.location.href = '/userLogin';
    throw new Error('Unauthorized');
  }

  return res;
} 
window.loadUserProfile = async function () {
  try {
    /* ===============================
       1. BASIC USER INFO (ABOUT)
    =============================== */
    const res = await apiFetch("/api/fisherFolkRoutes/currentApplicant");
    const result = await res.json();

    if (!result.loggedIn) return;

    const user = result.data;

    // Header
    document.getElementById("profile-name").textContent =
      `${user.first_name || ""} ${user.last_name || ""}`;
    document.getElementById("profile-username").textContent =
      user.username || "—";

    // Photo
    const photoEl = document.getElementById("applicantPhoto");
    photoEl.src = user.applicant_photo
      ? user.applicant_photo.startsWith("/")
        ? user.applicant_photo
        : `/applicant_photos/${user.applicant_photo}`
      : "/applicant_photos/default.png";

    photoEl.onerror = () => {
      photoEl.src = "/applicant_photos/default.png";
    };
        /* ===============================
       PROFILE PHOTO UPLOAD
    =============================== */
    const uploadBtn  = document.getElementById("uploadBtn");
    const fileInput  = document.getElementById("photoInput");

    if (uploadBtn && fileInput) {

      // Open file picker
      uploadBtn.onclick = () => fileInput.click();

      // Handle file selection
      fileInput.onchange = async function () {
        const file = this.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("applicant_photo", file);
 
        try {
          const uploadRes = await apiFetch(
            "/api/applicants/updateApplicantPhoto",
            {
              method: "POST",
              body: formData
            }
          );

          const uploadResult = await uploadRes.json();

          if (uploadResult.success) {

        const newPhoto =
            uploadResult.newPhoto.startsWith('/')
            ? uploadResult.newPhoto
            : `/applicant_photos/${uploadResult.newPhoto}`;

        // Update profile photo
        photoEl.src = newPhoto + '?v=' + Date.now();

        // 🔔 Notify dashboard greeting
        window.dispatchEvent(
            new CustomEvent('applicantPhotoUpdated', {
            detail: { photo: newPhoto }
            })
        );
        }
        else {
            alert(uploadResult.message || "Upload failed");
          }

        } catch (err) {
          console.error("Photo upload failed:", err);
          alert("Error uploading photo");
        }
      };
    }


    // About section
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value || "—";
    };

    setText("full-name",
      `${user.first_name || ""} ${user.middle_name || ""} ${user.last_name || ""} ${user.extra_name || ""}`);
    setText("age", user.age);
    setText("sex", user.sex);
    setText("birthday",
      user.birthdate ? new Date(user.birthdate).toLocaleDateString() : "—");
    setText("address", user.address);
    setText("marital-status", user.marital_status);
    setText("applicant-type", user.applicant_type);

        // ===============================
        // LOAD REGISTERED VESSELS & GEARS
        // ===============================
        const regRes = await apiFetch('/api/fisherFolkRoutes/user/registrations'); 
        const regData = await regRes.json();

        const vesselEl = document.getElementById('registered-vessels');
        const gearEl   = document.getElementById('registered-gears');

        if (regData.success) {

        // VESSELS
        if (regData.vessels.length) {
            vesselEl.innerHTML = regData.vessels.map(v =>
            `<div>🚤 ${v.vessel_name} (${v.vessel_type})</div>`
            ).join('');
        } else {
            vesselEl.textContent = 'No registered vessels';
        }

        // GEARS
        if (regData.gears.length) {
            const g = regData.gears[0]; // usually one row per applicant

            const gearList = [];

            if (g.hand_instruments) gearList.push(`🎯 ${g.hand_instruments}`);
            if (g.line_type) gearList.push(`🎣 ${g.line_type}`);
            if (g.nets) gearList.push(`🕸 ${g.nets}`);
            if (g.palubog_nets) gearList.push(`🌊 ${g.palubog_nets}`);
            if (g.accessories) gearList.push(`💡 ${g.accessories}`);
            if (g.bobo_small_qty) gearList.push(`🪤 Bobo (Small): ${g.bobo_small_qty}`);
            if (g.bobo_large_qty) gearList.push(`🪤 Bobo (Large): ${g.bobo_large_qty}`);
            if (g.tambuan_qty) gearList.push(`🪤 Tambuan: ${g.tambuan_qty}`);

            gearEl.innerHTML = gearList.join('<br>');
        } else {
            gearEl.textContent = 'No registered fishing gears';
        }
        }
        loadVesselStatusCounts();
  
  } catch (err) {
    console.error("User profile load failed:", err);
  }



};
  async function loadVesselStatusCounts() {
  try {
    const res = await apiFetch('/api/fisherFolkRoutes/vessels/status-count');
    const data = await res.json();

    document.getElementById('total-vessels').textContent =
      data.totalRegistered ?? 0;

    document.getElementById('renewable-vessels').textContent =
      data.openForRenewal ?? 0;
      
    document.getElementById('releasedVessels').textContent =
    data.releasedApprehensions ?? 0;

  } catch (err) {
    console.error('Failed to load vessel counts:', err);
  }
}