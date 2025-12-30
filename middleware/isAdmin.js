function isAdmin(req, res, next) {
  if (!req.user || !req.user.emails) {
    return res.status(401).send('Unauthorized');
  }

  const userEmail = req.user.emails[0].value;
  const adminEmails = process.env.ADMIN_EMAILS.split(',').map(e => e.trim());

  if (!adminEmails.includes(userEmail)) {
    return res.status(403).send('Forbidden: Admins only');
  }

  if (!req.session.adminVerified) {
    // Save intended admin path
    req.session.intendedAdminPath = req.originalUrl;
    return res.redirect('/admin/verify-password');
  }

  next();
}

module.exports = isAdmin;
