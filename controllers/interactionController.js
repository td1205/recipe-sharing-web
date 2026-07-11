const commentModel = require("../models/commentModel");
const ratingModel = require("../models/ratingModel");

async function addComment(req, res) {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const recipeId = req.params.id;
        const userId = req.session.user.id;
        const { content } = req.body;

        if (!content || content.trim() === "") {
            return res.redirect(`/recipes/${recipeId}`);
        }

        await commentModel.createComment(userId, recipeId, content);

        res.redirect(`/recipes/${recipeId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
}

async function addRating(req, res) {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const recipeId = req.params.id;
        const userId = req.session.user.id;
        const { star_count } = req.body;

        await ratingModel.createOrUpdateRating(
            userId,
            recipeId,
            parseInt(star_count)
        );

        res.redirect(`/recipes/${recipeId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
}

// Hiển thị trang chi tiết món ăn có bình luận và đánh giá
const recipeModel = require("../models/recipeModel");
const commentModel = require("../models/commentModel");
const ratingModel = require("../models/ratingModel");

async function showRecipeDetail(req, res) {
    try {
        const recipeId = req.params.id;

        // Lấy thông tin món ăn
        const recipe = await recipeModel.getRecipeById(recipeId);

        if (!recipe) {
            return res.status(404).send("Không tìm thấy món ăn");
        }

        // Lấy bình luận
        const comments = await commentModel.getCommentsByRecipeId(recipeId);

        // Lấy đánh giá sao
        const rating = await ratingModel.getAverageRating(recipeId);

        // Lấy đánh giá của người dùng hiện tại
        let userRating = null;
        if (req.session.user) {
            userRating = await ratingModel.getUserRating(req.session.user.id, recipeId);
        }

        res.render("recipes/detail", {
            recipe,
            comments,
            rating,
            userRating,
            user: req.session.user,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
}

module.exports = {
    addComment,
    addRating,
    showRecipeDetail,
};