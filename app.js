const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session');
const db = require('./models/db.js');
const nocache = require('nocache');
const crypto = require('crypto');
const adminRouter = require('./routes/adminRouter.js');
const userRouter = require('./routes/userRouter.js');
const Razorpay = require('razorpay');
require('dotenv').config();

// Ensure the existence of the SESSION_SECRET in your environment variables or .env file
const sessionSecret = crypto.randomBytes(32).toString('hex')

app.use(nocache());

app.use(
  session({
    secret: sessionSecret,
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 } // Set the maxAge to control the session expiration time (in milliseconds)
  })
);
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

db(); // Assuming this function handles your database connection

// Set up view engine and static files
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static('assets'));
app.use('/public/product-images', express.static(path.join(__dirname, 'public', 'product-images')));
app.use(adminRouter);
app.use(userRouter);


app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

const port = process.env.PORT || 3001;

// Add error handling for database connection
app.on('error', (err) => {
  console.error('Server error:', err);
});
const razorpay=new Razorpay({
  key_id:process.env.RAZORPAY_KEY_ID,
  key_secret:process.env.RAZORPAY_KEY_SECRET
})
app.listen(port, "localhost", () => {
  console.log(`Server is running on port ${port}`);
});
