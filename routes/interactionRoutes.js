const express = require("express");
const router = express.Router();

const interactionController = require("../controllers/interactionController");

// Thêm bình luận
router.post(
    "/recipes/:id/comments",
    interactionController.addComment
);

// Đánh giá sao
router.post(
    "/recipes/:id/rate",
    interactionController.addRating
);

// Thích / Bỏ thích
router.post(
    "/recipes/:id/favorite",
    interactionController.toggleFavorite
);

module.exports = router;