const express = require("express");
const router = express.Router();
const interactionController = require("../controllers/interactionController");
router.post("/recipes/:id/comments", interactionController.addComment);
router.post("/recipes/:id/rate", interactionController.addRating);
router.post("/recipes/:id/favorite", interactionController.toggleFavorite);
module.exports = router;
