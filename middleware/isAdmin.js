const supabaseAdmin = require('../supabaseAdmin'); // your Supabase client

async function isAdmin(req, res, next) {
  if (!req.user || !req.user.emails) {
    return res.status(401).send('Unauthorized');
  }

  const userEmail = req.user.emails[0].value;

  try {
    const { data, error } = await supabaseAdmin
      .from('admins')
      .select('email, name')
      .eq('email', userEmail)
      .single();

    if (error) {
      console.error('Error checking admin:', error);
      return res.status(500).send('Internal Server Error');
    }

    if (!data) {
      return res.status(403).send('Forbidden: Admins only');
    }
    req.session.adminInfo = { email: data.email, name: data.name };

    next();
  } catch (err) {
    console.error('Unexpected error in isAdmin middleware:', err);
    return res.status(500).send('Internal Server Error');
  }
}

module.exports = isAdmin;
