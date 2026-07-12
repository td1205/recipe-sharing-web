const express = require("express");
const router = express.Router();

const interactionController = require("../controllers/interactionController");

router.get(
    "/comments",
    interactionController.adminComments
);

router.post(
    "/comments/delete/:id",
    interactionController.deleteComment
);

module.exports = router;
