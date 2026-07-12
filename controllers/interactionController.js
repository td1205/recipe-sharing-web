const commentModel = require("../models/commentModel");
const ratingModel = require("../models/ratingModel");
const recipeModel = require("../models/recipeModel");
const favoriteModel = require("../models/favoriteModel");

// Add comment to a recipe
async function addComment(req, res) {
    try {
        // Ensure user is logged in
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

// Add rating to a recipe
async function addRating(req, res) {
    try {
        // Ensure user is logged in
        if (!req.session.user) {
            return res.redirect("/login");
        }
        const recipeId = req.params.id;

        const userId = req.session.user.id;
        const { star_count } = req.body;
        await ratingModel.createOrUpdateRating(userId, recipeId, parseInt(star_count));
        res.redirect(`/recipes/${recipeId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
}
 
// Toggle favorite
async function toggleFavorite(req, res) {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        const recipeId = req.params.id;
        const userId = req.session.user.id;

        const isFav = await favoriteModel.isFavorite(userId, recipeId);

        if (isFav) {
            await favoriteModel.removeFavorite(userId, recipeId);
        } else {
            await favoriteModel.addFavorite(userId, recipeId);
        }

        res.redirect(`/recipes/${recipeId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
}

// Show recipe detail with comments and rating
async function showRecipeDetail(req, res) {
    try {
        const recipeId = req.params.id;
        const recipe = await recipeModel.getRecipeById(recipeId);
        if (!recipe) {
            return res.status(404).send("Không tìm thấy món ăn");
        }
        const comments = await commentModel.getCommentsByRecipeId(recipeId);
        const rating = await ratingModel.getAverageRating(recipeId);
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
    toggleFavorite,
    showRecipeDetail,
};