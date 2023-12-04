const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// IMPORT ROUTES
const restaurantsRoute = require("./routes/restaurants");
const userRoute = require("./routes/user");
app.use(restaurantsRoute);
app.use(userRoute);

app.get("/", (req, res) => {
  res.json({ message: "Welcome on my Happy Cow project" });
});

app.all("*", (req, res) => {
  res.status(404).json({ message: "page not found" });
});

app.listen(process.env.PORT, () => {
  console.log("Happy Cow server has started 😎");
});
