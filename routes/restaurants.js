const express = require("express");
const router = express.Router();
const axios = require("axios");
const fileUpload = require("express-fileupload");

const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const Review = require("../models/Review");

const isAuthenticated = require("../middlewares/isAuthenticated");

const convertToBase64 = require("../utils/convertToBase64");

router.get("/restaurants", async (req, res) => {
  try {
    console.log("req.query restau >>", req.query);

    let filters = {};
    if (req.query.name) {
      filters.name = new RegExp(req.query.name, "gi");
    }
    if (req.query.category) {
      filters.category = req.query.category;
    }

    let sort = {};
    if (req.query.sort) {
      if (req.query.sort === "asc") {
        sort = { name: 1 };
      } else if (req.query.sort === "desc") {
        sort = { name: -1 };
      } else if (req.query.sort === "RatingDesc") {
        sort = { rating: -1 };
      }
    } else {
      sort = null;
    }

    let limit;
    if (req.query.limit) {
      limit = Number(req.query.limit);
    }

    let skip = 0;
    if (!req.query.skip) {
      skip = 0;
    } else {
      skip = Number(req.query.skip);
    }

    const response = await axios.get(
      "https://res.cloudinary.com/lereacteur-apollo/raw/upload/v1575242111/10w-full-stack/Scraping/restaurants.json",
      {
        params: {
          filters,
          sort,
          limit,
          skip,
        },
      }
    );
    // const allRestau = await Restaurant.find(filters)
    //   .sort(sort)
    //   .collation({ locale: "en", caseLevel: true, strength: 1 })
    //   .skip(skip)
    //   .limit(limit);
    // const restauCount = await Restaurant.countDocuments(filters);

    res.json(response.data);
    // count: restauCount, shops: allRestau
  } catch (error) {
    console.log("/resto error>>", error);
  }
});

router.post("/add", isAuthenticated, fileUpload(), async (req, res) => {
  try {
    const {
      name,
      address,
      lng,
      lat,
      phone,
      type,
      category,
      rating,
      description,
      price,
      website,
      facebook,
    } = req.body;

    if (
      !name ||
      !address ||
      !lng ||
      !lat ||
      !phone ||
      !type ||
      !category ||
      !rating ||
      !description ||
      !price
    ) {
      return res.status(400).json({ message: "Missing parameters !" });
    }

    // Vérif du restaurant dans la DB
    const restauExist = await Restaurant.findOne({ name: name });
    if (restauExist) {
      return res
        .status(409)
        .json({ message: "This restaurant has already been added" });
    }
    // const parsedLocation = JSON.parse(location);
    // console.log("parsedLocation >>",parsedLocation);
    const nearbyPlaces = await Restaurant.find({
      location: {
        $near: [Number(lng), Number(lat)],
        $maxDistance: 0.05,
      },
    }).select("placeId -_id");

    const newRestaurant = new Restaurant({
      name: name,
      address: address,
      phone: phone,
      type: type,
      category: category,
      rating: rating,
      description: description,
      price: price,
      owner: req.user._id,
    });

    newRestaurant.location = { lng: Number(lng), lat: Number(lat) };
    newRestaurant.placeId = newRestaurant._id;

    const nearbyPlacesIds = [];
    for (let i = 0; i < nearbyPlaces.length; i++) {
      if (nearbyPlaces.length > 5 && i < 5) {
        nearbyPlacesIds.push(nearbyPlaces[i].placeId);
      } else if (nearbyPlaces.length > 0 && nearbyPlaces.length <= 5) {
        nearbyPlacesIds.push(nearbyPlaces[i].placeId);
      }
    }
    newRestaurant.nearbyPlacesIds = nearbyPlacesIds;
    if (facebook) {
      newRestaurant.facebook = facebook;
    }
    if (website) {
      newRestaurant.website = website;
    }
    newRestaurant.link = `https://res.cloudinary.com/lereacteur-apollo/raw/upload/v1575242111/10w-full-stack/Scraping/restaurants.json/${newRestaurant._id}`;
    if (req.files.pictures) {
      const arrayOfpicturesUrl = [];
      if (req.files.pictures.length === undefined) {
        let result = await cloudinary.uploader.upload(
          convertToBase64(req.files.pictures),
          {
            folder: `/happycow/restaurant/${newRestaurant._id}`,
          }
        );
        // console.log("result >>",result);
        // arrayOfpicturesUrl.push(result.secure_url);
        newRestaurant.thumbnail = result.secure_url;
      } else if (req.files.pictures.length > 1) {
        for (let i = 0; i < req.files.pictures.length; i++) {
          if (i === 0) {
            let result = await cloudinary.uploader.upload(
              convertToBase64(req.files.pictures[i]),
              {
                folder: `/happycow/restaurant/${newRestaurant._id}`,
              }
            );
            newRestaurant.thumbnail = result.secure_url;
          } else {
            let result = await cloudinary.uploader.upload(
              convertToBase64(req.files.pictures[i]),
              {
                folder: `/happycow/restaurant/${newRestaurant._id}`,
              }
            );
            // console.log("req.files.pictures[1] >>",req.files.pictures[1]);
            arrayOfpicturesUrl.push(result.secure_url);
            newRestaurant.pictures.push(result.secure_url);
          }
        }
      }
    }
    // console.log("newRestaurant >>",newRestaurant);
    await newRestaurant.save();
    res.json(newRestaurant);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post(
  "/restaurant/add-review",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      // console.log("req.files.length >>",req.files.length);
      const { title, review, rating, pros, cons, placeId } = req.body;
      // console.log("req.files >>",req.files);
      const restauToReview = await Restaurant.findById(placeId).populate(
        "reviews"
      );
      const reviewer = await User.findById(req.user._id).select(
        "-hash -salt -email -token"
      );
      // console.log("reviewer >>",reviewer);
      if (!title || !review || !rating || !placeId) {
        return res.status(400).json({ message: "Missing parameters." });
      }

      const newReview = new Review({
        title: title,
        review: review,
        rating: rating,
        restaurant: placeId,
        owner: reviewer,
      });

      if (pros) {
        newReview.pros = pros;
      }
      if (cons) {
        newReview.cons = cons;
      }
      if (req?.files?.photos) {
        const arrayOfPhotosUrl = [];
        if (req.files.photos.length === undefined) {
          let result = await cloudinary.uploader.upload(
            convertToBase64(req.files.photos),
            {
              folder: `/happycow/restaurant/${placeId}`,
            }
          );
          // console.log("result review >>",result);
          arrayOfPhotosUrl.push(result.secure_url);
          restauToReview.pictures.push(result.secure_url);
        } else if (req.files.photos.length > 1) {
          for (let i = 0; i < req.files.photos.length; i++) {
            let result = await cloudinary.uploader.upload(
              convertToBase64(req.files.photos[i]),
              {
                folder: `/happycow/restaurant/${placeId}`,
              }
            );
            // console.log(req.files.photos[1]);
            arrayOfPhotosUrl.push(result.secure_url);
            restauToReview.pictures.push(result.secure_url);
          }
        }

        newReview.photos = arrayOfPhotosUrl;
        // console.log("arrayOfPhotosUrl >>",arrayOfPhotosUrl);
      }
      const newDate = new Date();
      const options = { month: "short" };
      const reviewDate = `${newDate.getDate()} ${Intl.DateTimeFormat(
        "fr-FR",
        options
      ).format(newDate)} ${newDate.getFullYear()}`;

      // console.log("restauToReview >>",restauToReview);
      reviewer.reviews.push(newReview);
      restauToReview.reviews.push(newReview);
      newReview.date = reviewDate;
      // console.log("restauToReview.reviews >>",restauToReview.reviews);
      let totalRating = 0;
      for (let i = 0; i < restauToReview.reviews.length; i++) {
        totalRating =
          Number(totalRating) + Number(restauToReview.reviews[i].rating);
      }

      restauToReview.rating = (
        Number(totalRating) / restauToReview.reviews.length
      ).toFixed(1);
      await newReview.save();
      await reviewer.save();
      await restauToReview.save();
      res.status(200).json({ newReview, reviewer, restauToReview });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.get("/restaurant/:id", async (req, res) => {
  try {
    if (!req.params) {
      return res.status(400).json({ message: error.message });
    }
    const restaurant = await Restaurant.findById(req.params.id);
    const reviews = await Review.find({ restaurant: req.params.id }).populate(
      "owner"
    );
    // console.log("reviews >>>", reviews);
    res.status(200).json({ restaurant, reviews });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
