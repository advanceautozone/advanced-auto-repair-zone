// server.js - Complete Node.js Backend Server
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// ========== MIDDLEWARE ==========
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware for passport
app.use(session({
    secret: JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serve static files - try both 'public' and current directory
app.use(express.static('public'));
app.use(express.static(__dirname));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// ========== MONGODB CONNECTION ==========
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/auto-shop';

mongoose.connect(MONGODB_URI)
.then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🔗 Connection state: ${mongoose.connection.readyState}`);
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('💡 Make sure MongoDB is running or check your MONGODB_URI in .env file');
    console.error('Full error:', err);
});

// ========== DATABASE MODELS ==========

// User Schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        trim: true
    },
    role: {
        type: String,
        enum: ['customer', 'admin'],
        default: 'customer'
    },
    googleId: {
        type: String,
        sparse: true,
        unique: true
    },
    profilePicture: {
        type: String
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    name: {
        type: String,
        required: true
    },
    email: String,
    phone: {
        type: String,
        required: true
    },
    service: {
        type: String,
        required: true
    },
    preferredDate: Date,
    message: String,
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

// Contact Form Schema
const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: String,
    message: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Contact = mongoose.model('Contact', contactSchema);

// ========== PASSPORT GOOGLE OAUTH STRATEGY ==========
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('🔐 Google OAuth callback received for:', profile.emails[0].value);
      
      // Check if user already exists
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        console.log('✅ Existing Google user found:', user.email);
        return done(null, user);
      }
      
      // Check if user exists with same email but different auth method
      user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        // Link Google account to existing user
        user.googleId = profile.id;
        user.authProvider = 'google';
        user.profilePicture = profile.photos[0]?.value;
        await user.save();
        console.log('✅ Linked Google account to existing user:', user.email);
        return done(null, user);
      }
      
      // Create new user
      user = new User({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
        profilePicture: profile.photos[0]?.value,
        authProvider: 'google',
        password: 'GOOGLE_AUTH_NO_PASSWORD' // Placeholder, won't be used
      });
      
      await user.save();
      console.log('✅ New Google user created:', user.email);
      done(null, user);
    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      done(error, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// ========== AUTHENTICATION MIDDLEWARE ==========
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
};

// ========== AUTHENTICATION ROUTES ==========

// Google OAuth routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/Login.html?error=google_auth_failed' }),
  (req, res) => {
    // Successful authentication
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Redirect to a page that will store the token and redirect to home
    res.send(`
      <html>
        <head><title>Login Successful</title></head>
        <body>
          <script>
            const userData = {
              token: '${token}',
              user: {
                id: '${req.user._id}',
                name: '${req.user.name}',
                email: '${req.user.email}',
                phone: '${req.user.phone || ''}',
                profilePicture: '${req.user.profilePicture || ''}'
              },
              loggedIn: true,
              loginTime: new Date().toISOString()
            };
            
            try {
              sessionStorage.setItem('autoShopUser', JSON.stringify(userData));
              window.sessionUser = userData;
            } catch(e) {
              console.error('Storage error:', e);
            }
            
            window.location.href = '/index.html';
          </script>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
  }
);

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        console.log('📝 Registration request received');
        console.log('Request body:', req.body);
        
        const { name, email, password, phone } = req.body;

        console.log('📝 Registration attempt for:', email);

        // Validation
        if (!name || !email || !password) {
            console.log('⚠️ Missing required fields');
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }

        if (password.length < 6) {
            console.log('⚠️ Password too short');
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }

        // Check MongoDB connection
        if (mongoose.connection.readyState !== 1) {
            console.error('❌ MongoDB not connected! State:', mongoose.connection.readyState);
            return res.status(500).json({ error: 'Database connection error. Please try again later.' });
        }

        // Check if user already exists
        console.log('🔍 Checking if user exists...');
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('⚠️ Email already registered:', email);
            return res.status(400).json({ error: 'Email already registered.' });
        }

        console.log('🔐 Hashing password...');
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        console.log('💾 Creating new user...');
        // Create new user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            phone
        });

        console.log('💾 Saving user to database...');
        await user.save();
        console.log('✅ User registered successfully:', email);

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('🎫 Token generated for:', email);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('❌ Registration error:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Server error during registration.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('🔐 Login attempt for:', email);

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            console.log('⚠️  User not found:', email);
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            console.log('⚠️  Invalid password for:', email);
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        console.log('✅ Login successful for:', email);

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// Get current user profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ user });
    } catch (error) {
        console.error('❌ Profile fetch error:', error);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Admin login (simple - for demo purposes)
app.post('/api/auth/admin-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Admin login attempt:', email);
        
        // Admin credentials - Change these for production
        const ADMIN_EMAIL = 'advanceautozone25@gmail.com';
        const ADMIN_PASSWORD = 'Adv@nc3Z0ne2025!Secure#NY'; // Change this to a secure password
        
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            const token = jwt.sign(
                { id: 'admin', email: email, role: 'admin' },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            console.log('✅ Admin login successful');
            
            return res.json({
                message: 'Admin login successful',
                token,
                user: {
                    id: 'admin',
                    email: email,
                    name: 'Admin',
                    role: 'admin'
                }
            });
        }
        
        console.log('⚠️ Invalid admin credentials');
        res.status(401).json({ error: 'Invalid admin credentials' });
    } catch (error) {
        console.error('❌ Admin login error:', error);
        res.status(500).json({ error: 'Server error during admin login.' });
    }
});

// Get all users (admin only)
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        console.log(`📋 Fetched ${users.length} users`);
        res.json({ users });
    } catch (error) {
        console.error('❌ Fetch users error:', error);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Delete user (admin only)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        
        console.log('✅ User deleted:', req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('❌ Delete user error:', error);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ========== APPOINTMENT ROUTES ==========

// Create appointment
app.post('/api/appointments', async (req, res) => {
    try {
        const { name, email, phone, service, preferredDate, message } = req.body;

        console.log('📅 New appointment request from:', name);

        // Validation
        if (!name || !phone || !service) {
            return res.status(400).json({ error: 'Name, phone, and service are required.' });
        }

        const appointment = new Appointment({
            name,
            email,
            phone,
            service,
            preferredDate,
            message
        });

        await appointment.save();
        console.log('✅ Appointment created successfully');

        res.status(201).json({
            message: 'Appointment request submitted successfully!',
            appointment
        });
    } catch (error) {
        console.error('❌ Appointment creation error:', error);
        res.status(500).json({ error: 'Server error while creating appointment.' });
    }
});

// Get user appointments (protected)
app.get('/api/appointments/my', authenticateToken, async (req, res) => {
    try {
        const appointments = await Appointment.find({ userId: req.user.id })
            .sort({ createdAt: -1 });
        res.json({ appointments });
    } catch (error) {
        console.error('❌ Fetch appointments error:', error);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Get all appointments (admin - protected)
app.get('/api/appointments', authenticateToken, async (req, res) => {
    try {
        const appointments = await Appointment.find().sort({ createdAt: -1 });
        console.log(`📋 Fetched ${appointments.length} appointments`);
        res.json({ appointments });
    } catch (error) {
        console.error('❌ Fetch all appointments error:', error);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Update appointment status (admin)
app.patch('/api/appointments/:id', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found.' });
        }

        console.log('✅ Appointment updated:', req.params.id);
        res.json({ message: 'Appointment updated', appointment });
    } catch (error) {
        console.error('❌ Update appointment error:', error);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Delete appointment
app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
    try {
        const appointment = await Appointment.findByIdAndDelete(req.params.id);
        
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found.' });
        }

        console.log('✅ Appointment deleted:', req.params.id);
        res.json({ message: 'Appointment deleted successfully' });
    } catch (error) {
        console.error('❌ Delete appointment error:', error);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ========== CONTACT FORM ROUTES ==========

// Submit contact form
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;

        console.log('📧 New contact form from:', email);

        // Validation
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Name, email, and message are required.' });
        }

        const contact = new Contact({
            name,
            email,
            phone,
            message
        });

        await contact.save();
        console.log('✅ Contact form saved successfully');

        res.status(201).json({
            message: 'Thank you for contacting us! We will get back to you soon.',
            contact
        });
    } catch (error) {
        console.error('❌ Contact form error:', error);
        res.status(500).json({ error: 'Server error while submitting form.' });
    }
});

// Get all contact submissions (admin)
app.get('/api/contact', authenticateToken, async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        console.log(`📧 Fetched ${contacts.length} contact submissions`);
        res.json({ contacts });
    } catch (error) {
        console.error('❌ Fetch contacts error:', error);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Delete contact message (admin)
app.delete('/api/contact/:id', authenticateToken, async (req, res) => {
    try {
        const contact = await Contact.findByIdAndDelete(req.params.id);
        
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found.' });
        }
        
        console.log('✅ Contact deleted:', req.params.id);
        res.json({ message: 'Contact deleted successfully' });
    } catch (error) {
        console.error('❌ Delete contact error:', error);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Backend is running',
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

// ========== SERVE FRONTEND ==========

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all route for HTML files
app.get('/*.html', (req, res) => {
    const fileName = req.path.substring(1); // Remove leading slash
    res.sendFile(path.join(__dirname, 'public', fileName), (err) => {
        if (err) {
            res.sendFile(path.join(__dirname, fileName));
        }
    });
});

// ========== ERROR HANDLING ==========

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not found',
        path: req.path,
        message: 'The requested resource was not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// ========== START SERVER ==========

app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('='.repeat(50));
    console.log('🚀 AUTO SHOP BACKEND SERVER');
    console.log('='.repeat(50));
    console.log(`📍 Server running on: http://localhost:${PORT}`);
    conosle.log("Admin Login ULR : https://advancedautorepairzone.com/admin-login.html")
    console.log(`📁 Serving static files from: 'public' folder`);
    console.log(`🔐 JWT Secret: ${JWT_SECRET.substring(0, 10)}...`);
    console.log(`💾 MongoDB URI: ${MONGODB_URI}`);
    console.log('');
    console.log('📌 Available Routes:');
    console.log('   GET  / or /index.html          - Homepage');
    console.log('   GET  /Login.html               - Login page');
    console.log('   POST /api/auth/register        - Register user');
    console.log('   POST /api/auth/login           - Login user');
    console.log('   GET  /api/auth/me              - Get current user');
    console.log('   POST /api/appointments         - Create appointment');
    console.log('   GET  /api/appointments         - Get all appointments');
    console.log('   POST /api/contact              - Submit contact form');
    console.log('   GET  /api/health               - Health check');
    console.log('='.repeat(50));
    console.log('');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM signal received: closing HTTP server');
    mongoose.connection.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 SIGINT signal received: closing HTTP server');
    mongoose.connection.close();
    process.exit(0);
});