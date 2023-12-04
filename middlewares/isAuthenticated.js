const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  try {
    // console.log("req.body isAuthenticated >>", req.body);
    const isThereAToken = req.headers.authorization;
    if (!isThereAToken) {
      return res.status(401).json({ message: "Unauthorized." });
    }
    const token = isThereAToken.replace("Bearer ", "");
    const user = await User.findOne({ token: token }).select("-salt -hash");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized." });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = isAuthenticated;
