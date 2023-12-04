const mongoose = require("mongoose");

const Restaurant = mongoose.model("Restaurant", {
  placeId: String,
  name: String,
  adress: String,
  location: {
    longitude: Number,
    latitude: Number,
  },
  phone: String,
  thumbnail: String,
  type: String,
  category: Number,
  rating: Number,
  vegan: Number,
  vegOnly: Number,
  link: String,
  description: String,
  pictures: Array,
  price: String,
  website: String,
  facebook: String,
  nearbyPlacesIds: Array,
  owner: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

module.exports = Restaurant;
