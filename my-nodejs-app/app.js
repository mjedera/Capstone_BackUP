const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');


const authRoutes = require('./src/routes/auth');
const applicantRoutes = require('./src/routes/applicantRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const errorHandler = require('./src/middleware/errorHandler');
const bantayDagatRoutes = require('./src/routes/bantayDagatRoutes');
const registration = require('./src/routes/registrationRoutes');
const apprehensionRprtRoutes = require('./src/routes/apprehensionRprtRoutes');
const munisOrdinance = require('./src/routes/ordinanceRoutes');
const cashierRoutes = require('./src/routes/cashierRoutes');
const fisherFolkRoutes = require('./src/routes/fisherFolkRoutes');
const announcements = require('./src/routes/announcementsRoutes');



const app = express();

// Ensure folders exist
if (!fs.existsSync(path.join(__dirname, 'src/public/applicant_photos'))) 
    fs.mkdirSync(path.join(__dirname, 'src/public/applicant_photos'), { recursive: true });


// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'src/public')));
app.use('/partials', express.static(path.join(__dirname, 'src/views/partials')));
app.use(
  '/applicant_photos',
  express.static(path.join(__dirname, 'src/public/applicant_photos'))
);

app.use(session({
    secret: 'my-super-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 43200000 }
}));

// Root → load userLogin.html directly
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/views/user/userLogin.html'));
});

// Routes
app.use('/', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/applicants', applicantRoutes);
app.use('/api/bantay-dagat', bantayDagatRoutes);
app.use('/api/registration', registration);
app.use('/api/apprehensionRprtRoutes', apprehensionRprtRoutes);
app.use('/api/munisOrdinance', munisOrdinance);
app.use('/cashier', cashierRoutes);
app.use('/api/fisherFolkRoutes', fisherFolkRoutes);
app.use('/api/announcements', announcements);

// Serve bantay_dagat login page
app.get('/BantayDagat', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/views/bantay_dagat/bantayDagatLogin.html'));
});

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));

module.exports = app;
