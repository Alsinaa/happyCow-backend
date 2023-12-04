const mongoose = require("mongoose");

const Review = mongoose.model("Review", {
  title: String,
  review: String,
  rating: Number,
  date: String,
  pros: String,
  cons: String,
  photos: Array,
  restaurant: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
    },
  ],
  owner: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

module.exports = Review;
