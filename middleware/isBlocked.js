const User = require("../models/User");
const checkBlocked = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);

    if (user && user.isBlocked) {
      req.session.userLogin = false;
      const blockedMessage = "You are temporarily blocked";
      // Redirect to the login page with a query parameter for the blocked message
      return res.redirect("/login?error=" + encodeURIComponent(blockedMessage));
    }

    next();
  } catch (error) {
    console.error("Error in checkBlocked middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = checkBlocked;
