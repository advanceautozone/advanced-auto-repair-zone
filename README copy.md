# Auto Repair Shop - Node.js Backend Setup Guide

## 📋 Prerequisites

Before you begin, make sure you have the following installed:
- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** - Choose one option:
  - **Local MongoDB** - [Download here](https://www.mongodb.com/try/download/community)
  - **MongoDB Atlas** (Cloud) - [Sign up free](https://www.mongodb.com/cloud/atlas)

## 🚀 Quick Start

### 1. Project Structure

Organize your files like this:

```
auto-shop/
├── public/                  # Frontend files
│   ├── index.html
│   ├── Login.html
│   ├── about.html
│   ├── services.html
│   ├── brakes.html
│   ├── contact.html
│   ├── coupons.html
│   ├── towing.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── main.js
│   ├── images/
│   └── icons/
├── server.js               # Backend server
├── package.json
├── .env                    # Environment variables
└── README.md
```

### 2. Install Dependencies

Open terminal in your project folder and run:

```bash
npm install
```

This will install:
- `express` - Web framework
- `mongoose` - MongoDB database
- `bcryptjs` - Password encryption
- `jsonwebtoken` - User authentication
- `cors` - Cross-origin requests
- `dotenv` - Environment variables

### 3. Set Up MongoDB

#### Option A: Local MongoDB

1. Install MongoDB on your computer
2. Start MongoDB service:
   ```bash
   # Windows
   net start MongoDB
   
   # Mac
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```

3. Keep the default `.env` setting:
   ```
   MONGODB_URI=mongodb://localhost:27017/auto-shop
   ```

#### Option B: MongoDB Atlas (Cloud - Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Update `.env` file:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/auto-shop
   ```
   Replace `username` and `password` with your credentials

### 4. Configure Environment Variables

Edit the `.env` file:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/auto-shop
JWT_SECRET=your-super-secret-key-change-this-12345
```

**⚠️ IMPORTANT:** Change `JWT_SECRET` to a random string in production!

### 5. Start the Server

```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

You should see:
```
🚀 Server running on http://localhost:3000
📁 Serving static files from 'public' folder
✅ MongoDB connected successfully
```

### 6. Test Your Website

Open your browser and go to:
- **Homepage:** http://localhost:3000
- **Login Page:** http://localhost:3000/Login.html

## 🔐 API Endpoints

### Authentication

- **POST** `/api/auth/register` - Create new account
- **POST** `/api/auth/login` - Login user
- **GET** `/api/auth/me` - Get current user (requires token)

### Appointments

- **POST** `/api/appointments` - Create appointment
- **GET** `/api/appointments/my` - Get user's appointments (requires token)
- **GET** `/api/appointments` - Get all appointments (admin)
- **PATCH** `/api/appointments/:id` - Update appointment status

### Contact

- **POST** `/api/contact` - Submit contact form
- **GET** `/api/contact` - Get all contacts (admin)

## 📝 Usage Examples

### Register a New User

```javascript
fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    phone: '555-1234'
  })
})
```

### Login

```javascript
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'password123'
  })
})
```

### Create Appointment (Authenticated)

```javascript
fetch('http://localhost:3000/api/appointments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    name: 'John Doe',
    phone: '555-1234',
    service: 'oil-change',
    preferredDate: '2024-02-01'
  })
})
```

## 🛠 Troubleshooting

### MongoDB Connection Error

**Error:** `MongoNetworkError: failed to connect`

**Solution:**
1. Make sure MongoDB is running
2. Check your `MONGODB_URI` in `.env`
3. For Atlas, check IP whitelist (allow 0.0.0.0/0 for testing)

### CORS Error

**Error:** `Access to fetch has been blocked by CORS policy`

**Solution:** The backend already has CORS enabled. Make sure you're accessing from the correct URL.

### Port Already in Use

**Error:** `EADDRINUSE: address already in use`

**Solution:**
1. Change `PORT` in `.env` to 3001 or another number
2. Or stop the process using port 3000

## 🔒 Security Best Practices

For production deployment:

1. **Change JWT_SECRET** to a strong random string
2. **Use HTTPS** for secure connections
3. **Add rate limiting** to prevent brute force attacks
4. **Validate all inputs** on both frontend and backend
5. **Use environment variables** for sensitive data
6. **Enable MongoDB authentication**
7. **Add email verification** for new accounts

## 📦 Deployment

### Deploy to Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-app-name

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set JWT_SECRET=your-secret-key

# Deploy
git push heroku main
```

### Deploy to Railway/Render

1. Connect your GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically on push

## 📞 Support

If you need help:
1. Check MongoDB connection is working
2. Verify all dependencies are installed
3. Check console for error messages
4. Make sure `.env` file is configured correctly

## 🎉 You're All Set!

Your auto shop website now has:
- ✅ User registration and login
- ✅ JWT authentication
- ✅ Appointment booking
- ✅ Contact form submissions
- ✅ Secure password hashing
- ✅ MongoDB database storage

Happy coding! 🚗💨