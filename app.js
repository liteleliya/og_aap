require('dotenv').config();
const { connectToDatabase, getDatabase } = require('./database');
require('dotenv').config();


const express = require('express');
const session = require('express-session');
const passport = require('./passport');
const path = require('path');
const app = express();


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
  (req, res) => {
    res.redirect('/dashboard');
  }
);

app.get('/dashboard', (req, res) => {
  if (req.isAuthenticated()) {
    res.render('dashboard', { user: req.user });
  } else {
    res.redirect('/');
  }
});

app.get('/unauthorized', (req, res) => {
  res.send("Access restricted to BITS Goa users only.");
});

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: true
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database connection
const { MongoClient } = require('mongodb');
let db;

async function connectDB() {
    try {
        const client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        db = client.db('aap_database');
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
    }
}

// Connect to database
connectDB();

// SIMPLE REGISTRATION PAGE
app.get('/register-aap', (req, res) => {
    res.render('register-aap', { 
        title: 'AAP Registration',
        message: 'Select up to 3 subjects',
        maxSubjects: 3
    });
});

// HANDLE REGISTRATION
app.post('/register-aap', async (req, res) => {
    if (!db) return res.status(500).send('Database not connected');
    
    const { name, email, semester, subjects } = req.body;
    
    // Convert subjects to array if it's a string
    const selectedSubjects = Array.isArray(subjects) ? subjects : [subjects].filter(Boolean);
    
    if (!name || !email || !selectedSubjects.length || selectedSubjects.length > 3) {
        return res.status(400).send(`
            <h1>Error!</h1>
            <p>Please provide: Name, Email, and 1-3 subjects</p>
            <a href="/register-aap">Go back</a>
        `);
    }
    
    try {
        // Save registration
        const registration = {
            name: name.trim(),
            email: email.trim(),
            semester: parseInt(semester) || 1,
            subjects: selectedSubjects,
            registrationDate: new Date().toISOString(),
            whatsappGroup: 'https://chat.whatsapp.com/TO_BE_ASSIGNED'
        };
        
        await db.collection('registrations').insertOne(registration);
        
        // Success page
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Registration Successful</title>
                <style>
                    body { font-family: Arial; padding: 40px; max-width: 600px; margin: 0 auto; }
                    .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; }
                    .info { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="success">
                    <h1> Registration Successful!</h1>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Semester:</strong> ${registration.semester}</p>
                    <p><strong>Subjects:</strong> ${selectedSubjects.join(', ')}</p>
                </div>
                
                <div class="info">
                    <h3>Next Steps:</h3>
                    <p>WhatsApp group links will be sent to your email soon.</p>
                    <p>Keep an eye on your inbox!</p>
                </div>
                
                <p style="margin-top: 30px;">
                    <a href="/register-aap">← Register another</a> | 
                    <a href="/admin/export">📊 Admin Export</a>
                </p>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).send('Registration failed. Please try again.');
    }
});

// SIMPLE ADMIN EXPORT
app.get('/admin/export', async (req, res) => {
    if (!db) return res.status(500).send('Database error');
    
    try {
        const registrations = await db.collection('registrations').find({}).toArray();
        
        // Create CSV
        let csv = 'Name,Email,Semester,Subjects,Registration Date,WhatsApp Group\n';
        
        registrations.forEach(reg => {
            const subjects = Array.isArray(reg.subjects) ? reg.subjects.join('; ') : reg.subjects;
            csv += `"${reg.name}","${reg.email}","${reg.semester}","${subjects}","${reg.registrationDate}","${reg.whatsappGroup}"\n`;
        });
        
        // Send as downloadable CSV
        res.header('Content-Type', 'text/csv');
        res.attachment('aap-registrations.csv');
        res.send(csv);
        
    } catch (error) {
        console.error('Export error:', error);
        res.send('Error: ' + error.message);
    }
});

// SIMPLE ADMIN VIEW
app.get('/admin', async (req, res) => {
    if (!db) return res.send('Database not connected');
    
    try {
        const registrations = await db.collection('registrations').find({}).toArray();
        const count = registrations.length;
        
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>AAP Admin</title>
                <style>
                    body { font-family: Arial; padding: 30px; }
                    .card { background: #f8f9fa; border: 1px solid #ddd; padding: 20px; margin: 20px 0; }
                    button { background: #28a745; color: white; padding: 10px 20px; border: none; cursor: pointer; }
                </style>
            </head>
            <body>
                <h1>📊 AAP Admin Panel</h1>
                <div class="card">
                    <h2>Total Registrations: ${count}</h2>
                    <a href="/admin/export" download>
                        <button>📥 Download CSV Export</button>
                    </a>
                    <p>This will download an Excel-compatible CSV file with all registrations.</p>
                </div>
                
                <h3>Recent Registrations:</h3>
                <ul>
                    ${registrations.slice(-10).reverse().map(reg => `
                        <li>
                            <strong>${reg.name}</strong> (${reg.email}) - 
                            Semester ${reg.semester}: ${Array.isArray(reg.subjects) ? reg.subjects.join(', ') : reg.subjects}
                        </li>
                    `).join('')}
                </ul>
                
                <p><a href="/register-aap">← Back to Registration</a></p>
            </body>
            </html>
        `);
        
    } catch (error) {
        res.send('Error: ' + error.message);
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Registration page: http://localhost:${PORT}/register-aap`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
});