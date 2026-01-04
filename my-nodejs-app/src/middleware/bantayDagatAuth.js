// Protect Bantay Dagat routes
module.exports = (req, res, next) => {
  const isApiRequest = req.originalUrl.startsWith('/api');

  if (!req.session.bantayDagatLoggedIn) {
    // API request → JSON error
    if (isApiRequest) {
      return res.status(401).json({ message: 'Session expired' });
    }

    // Page request → redirect to login
    return res.redirect('/api/bantay-dagat/BantayDagat');
  }

  next();
};
