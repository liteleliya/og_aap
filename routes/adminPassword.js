const express = require('express');
const router = express.Router();

router.get('/verify-password', (req, res) => {
  res.render('admin_password'); 
});

router.post('/verify-password', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.adminVerified = true;
    const redirectPath = req.session.intendedAdminPath || '/admin/dashboard';
    delete req.session.intendedAdminPath;
    return res.redirect(redirectPath);
  }

  res.status(403).send('Invalid admin password');
});

module.exports = router;