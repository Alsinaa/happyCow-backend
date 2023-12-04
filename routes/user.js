const express = require("express");
const router = express.Router();
const fileUpload = require("express-fileupload");
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const cloudinary = require("cloudinary").v2;

// IMPORT MODELES
const User = require("../models/User");

const isAuthenticated = require("../middlewares/isAuthenticated");

const convertToBase64 = require("../utils/convertToBase64");

router.post("/user/signup", async (req, res) => {
  try {
    const { username, email, location, preferences, password } = req.body;

    // if (!username || !email || !location || !preferences || !password) {
    //   return res.status(400).json({ message: "Missing parameters" });
    // }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "The password must be at least 8 characters long" });
    }

    const emailAlreadyUsed = await User.findOne({ email: email });
    if (emailAlreadyUsed) {
      return res
        .status(409)
        .json({ message: "This email address is already used" });
    }

    const usernameAlreadyUsed = await User.findOne({ username: username });
    if (usernameAlreadyUsed) {
      return res.status(409).json({ message: "This username is already used" });
    }

    // Création du salt, du hash et du token
    const salt = uid2(16);
    const hash = SHA256(password + salt).toString(encBase64);
    const token = uid2(64);

    const newUser = new User({
      username: username,
      email: email,
      location: location,
      preferences: preferences,
      token: token,
      salt: salt,
      hash: hash,
    });

    await newUser.save();

    res.status(200).json({
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      location: newUser.location,
      preferences: newUser.preferences,
      token: token,
      // avatar: newUser.avatar.secure_url,
    });
  } catch (error) {
    console.log("error signup >>>", error);
    res.status(400).json({ message: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing parameters." });
    }

    const userExists = await User.findOne({ email: email });
    if (!userExists) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    // Vérification du hash
    const newHash = SHA256(password + userExists.salt).toString(encBase64);
    if (newHash !== userExists.hash) {
      return res.status(401).json({ message: "Unauthorized." });
    }
    let avatar;
    if (userExists.avatar) {
      avatar = userExists.avatar.secure_url;
    } else {
      avatar = null;
    }
    res.status(200).json({
      _id: userExists._id,
      username: userExists.username,
      email: userExists.email,
      location: userExists.location,
      preferences: userExists.preferences,
      avatar: avatar,
      token: userExists.token,
      shops: userExists.shops,
      favorites: userExists.favorites,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/user/profile/:id", isAuthenticated, async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ message: "The user id is missing." });
  }
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }
    let avatar;
    if (user.avatar) {
      avatar = user.avatar.secure_url;
    } else {
      avatar = null;
    }
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      location: user.location,
      preferences: user.preferences,
      avatar: avatar,
      token: user.token,
      shops: user.shops,
      favorites: user.favorites,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/user/update", isAuthenticated, fileUpload(), async (req, res) => {
  try {
    // console.log(req.body);
    const userEmailAlreadyUsed = await User.findOne({ email: req.body.email });
    const usernameAlreadyUsed = await User.findOne({
      username: req.body.username,
    });

    if (usernameAlreadyUsed && req.user.username !== req.body.username) {
      return res
        .status(409)
        .json({ message: "This username is already used." });
    }
    if (userEmailAlreadyUsed && req.user.email !== req.body.email) {
      return res
        .status(409)
        .json({ message: "This email address is already used." });
    }

    if (
      req.body.username ||
      req.body.email ||
      req.body.location ||
      req.body.preferences ||
      req?.files?.avatar
    ) {
      const userToUpdate = await User.findById(req.user._id);
      if (req.body.username) {
        if (req.body.username !== userToUpdate.username) {
          userToUpdate.username = req.body.username;
        }
      }
      if (req.body.email) {
        if (req.body.email !== userToUpdate.email) {
          userToUpdate.email = req.body.email;
        }
      }
      if (req.body.location) {
        if (req.body.location !== userToUpdate.location) {
          userToUpdate.location = req.body.location;
        }
      }
      if (req.body.preferences) {
        if (req.body.preferences !== userToUpdate.preferences) {
          userToUpdate.preferences = req.body.preferences;
        }
      }

      if (req.files?.avatar) {
        if (!userToUpdate.avatar) {
          const result = await cloudinary.uploader.upload(
            convertToBase64(req.files.avatar),
            {
              folder: `/happycow/user/${userToUpdate._id}`,
            }
          );
          userToUpdate.avatar = result;
          // console.log(result);
        } else {
          await cloudinary.uploader.destroy(userToUpdate.avatar.public_id);
          const result = await cloudinary.uploader.upload(
            convertToBase64(req.files.avatar),
            {
              folder: `/happycow/user/${userToUpdate._id}`,
            }
          );
          userToUpdate.avatar = result;
        }
      }

      await userToUpdate.save();
      let avatar;
      if (userToUpdate.avatar) {
        avatar = userToUpdate.avatar.secure_url;
      } else {
        avatar = null;
      }
      res.status(200).json({
        _id: userToUpdate._id,
        username: userToUpdate.username,
        email: userToUpdate.email,
        location: userToUpdate.location,
        preferences: userToUpdate.preferences,
        avatar: avatar,
        token: userToUpdate.token,
        shops: userToUpdate.shops,
        favorites: userToUpdate.favorites,
      });
    } else {
      res.status(400).json({ message: "Missing informations." });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
