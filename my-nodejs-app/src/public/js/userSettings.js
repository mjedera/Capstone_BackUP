async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);

  if (res.status === 401 || res.status === 403) {
    alert('Session expired. Please login again.');
    window.location.href = '/userLogin';
    throw new Error('Unauthorized');
  }

  return res;
} 
window.loadUserSettings = async function () {
    const form = document.getElementById('pw-reset-form');
    const currentInput = document.getElementById('pw-current-input');
    const newInput = document.getElementById('pw-new-input');
    const confirmInput = document.getElementById('pw-confirm-input');
    const messageArea = document.getElementById('pw-message-area');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Clear previous message
        messageArea.textContent = '';
        messageArea.classList.remove('text-green-600', 'text-red-600');

        const currentPassword = currentInput.value.trim();
        const newPassword = newInput.value.trim();
        const confirmPassword = confirmInput.value.trim();

        // Basic validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            messageArea.textContent = 'All fields are required.';
            messageArea.classList.add('text-red-600');
            return;
        }

        if (newPassword.length < 8) {
            messageArea.textContent = 'New password must be at least 8 characters.';
            messageArea.classList.add('text-red-600');
            return;
        }

        if (newPassword !== confirmPassword) {
            messageArea.textContent = 'New password and confirmation do not match.';
            messageArea.classList.add('text-red-600');
            return;
        }

        // Disable button while processing
        const submitButton = form.querySelector('.pw-submit-button');
        submitButton.disabled = true;
        submitButton.textContent = 'Updating...';

        try {
            const response = await apiFetch('/updatePassword', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await response.json();

            if (response.ok) {
                messageArea.textContent = data.message || 'Password updated successfully!';
                messageArea.classList.add('text-green-600');
                form.reset();
            } else {
                messageArea.textContent = data.message || 'Failed to update password.';
                messageArea.classList.add('text-red-600');
            }
        } catch (err) {
            console.error(err);
            messageArea.textContent = 'An error occurred. Please try again.';
            messageArea.classList.add('text-red-600');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Change Password';
        }
    });
};
