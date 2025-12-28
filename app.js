require('dotenv').config();
const express = require('express');
const app = express();
const session = require('express-session');
const passport = require('./passport');
const path = require('path');
const supabaseAdmin = require('./supabaseAdmin');
const dashboardRoutes = require('./routes/dashboard');
const adminRouter = require('./routes/admin');

app.use(express.static(path.join(process.cwd(), 'public')));

app.set('views', path.join(process.cwd(), 'views'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('index');
});

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/unauthorized' }),
  async (req, res) => {
    const { id, displayName, emails } = req.user;
    const email = emails?.[0]?.value || null;

    const { error } = await supabaseAdmin
      .from('users')
      .upsert({
        google_id: id,
        email,
        display_name: displayName,
      });

    if (error) {
      console.error('Supabase user upsert failed:', error);
      return res.redirect('/unauthorized');
    }

    res.redirect('/dashboard');
  }
);

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/');
}

app.use('/dashboard', ensureAuthenticated, dashboardRoutes);
const isAdmin = require('./middleware/isAdmin');

app.use('/admin', isAdmin, adminRouter);


app.get('/unauthorized', (req, res) => {
  res.send("Access restricted to BITS Goa users only.");
});

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

module.exports = app;