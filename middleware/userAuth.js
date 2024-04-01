const User = require("../models/User");
const express = require("express");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.raw({ type: "multipart/form-data" }));

const userAuth = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      const errorMessage = "No user found with this email address";
      return res.redirect("/login?error=" + encodeURIComponent(errorMessage));
    }

    if (user.isBlocked) {
      const errorMessage = "Access denied. Your account is blocked.";
      return res.redirect("/login?error=" + encodeURIComponent(errorMessage));
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      const errorMessage = "Invalid password. Passwords do not match.";
      return res.redirect("/login?error=" + encodeURIComponent(errorMessage));
    }

    req.session.userLogin = true;
    req.session.userId = user._id;
    next();
  } catch (error) {
    console.error("Error in userAuth middleware:", error);
    const errorMessage = "Internal server error";
    res.redirect("/login?error=" + encodeURIComponent(errorMessage));
  }
};

module.exports = userAuth;
