// Protect user routes — allow some routes publicly
module.exports = (req, res, next) => {
  const isApiRequest = req.originalUrl.startsWith('/api');

  if (!req.session.applicantLoggedIn) {
    if (isApiRequest) {
      return res.status(401).json({ message: 'Session expired' });
    }
    return res.redirect('/userLogin');
  }

  next();
};

