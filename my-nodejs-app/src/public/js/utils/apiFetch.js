async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);

  if (res.status === 401 || res.status === 403) {
    alert('Session expired. Please login again.');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
 
  return res;
}
