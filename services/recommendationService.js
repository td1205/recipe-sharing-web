const CONTENT_WEIGHTS = {
  ingredients: 0.20,
  tags: 0.10,
  category: 0.10,
  courseType: 0.08,
  mealTime: 0.05,
  cookingMethod: 0.02,
};

const PERSONAL_WEIGHTS = {
  categoryAffinity: 0.08,
  ingredientTagAffinity: 0.06,
  positiveHistorySimilarity: 0.06,
};

const QUALITY_WEIGHTS = {
  rating: 0.08,
  views: 0.05,
  favorites: 0.04,
  comments: 0.03,
};

const FRESHNESS_WEIGHT = 0.05;
const ANONYMOUS_MULTIPLIERS = {
  content: 0.6875 / 0.55,
  quality: 0.25 / 0.20,
  freshness: 0.0625 / 0.05,
};

const COOKING_METHODS = [
  'ap chao', 'bake', 'boil', 'chien', 'grill', 'hap', 'kho', 'luoc',
  'nuong', 'rang', 'roast', 'salad', 'steam', 'stew', 'xao',
];

const INGREDIENT_STOP_WORDS = new Set([
  'an', 'cho', 'it', 'muoi', 'nuoc', 'tieu', 'tuoi', 'va',
]);

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toIngredientSet(recipe) {
  const tokens = (recipe.ingredients || []).flatMap((ingredient) =>
    normalizeText(ingredient.name).split(' ')
  );
  return new Set(tokens.filter((token) => token.length > 1 && !INGREDIENT_STOP_WORDS.has(token)));
}

function toTagSet(recipe) {
  return new Set([
    ...(recipe.recipe_tags || []).map((item) => normalizeText(item.tags?.name)),
    ...(recipe.user_tag_votes || []).map((item) => normalizeText(item.tags?.name)),
  ].filter(Boolean));
}

function toMethodSet(recipe) {
  const text = normalizeText(`${recipe.title || ''} ${recipe.description || ''}`);
  return new Set(COOKING_METHODS.filter((method) => new RegExp(`(^| )${method}( |$)`).test(text)));
}

function jaccard(left, right) {
  if (left.size === 0 || right.size === 0) return 0;
  let intersectionSize = 0;
  left.forEach((value) => {
    if (right.has(value)) intersectionSize += 1;
  });
  return intersectionSize / (left.size + right.size - intersectionSize);
}

function normalizeLog(value, maximum) {
  return maximum > 0 ? Math.log1p(value) / Math.log1p(maximum) : 0;
}

function getRecipeFeatures(recipe) {
  return {
    ingredients: toIngredientSet(recipe),
    tags: toTagSet(recipe),
    methods: toMethodSet(recipe),
  };
}

function getContentScore(candidate, candidateFeatures, reference, referenceFeatures) {
  return (
    CONTENT_WEIGHTS.ingredients * jaccard(candidateFeatures.ingredients, referenceFeatures.ingredients) +
    CONTENT_WEIGHTS.tags * jaccard(candidateFeatures.tags, referenceFeatures.tags) +
    CONTENT_WEIGHTS.category * Number(candidate.category_id === reference.category_id) +
    CONTENT_WEIGHTS.courseType * Number(Boolean(candidate.course_type_id) && candidate.course_type_id === reference.course_type_id) +
    CONTENT_WEIGHTS.mealTime * Number(Boolean(candidate.meal_time_id) && candidate.meal_time_id === reference.meal_time_id) +
    CONTENT_WEIGHTS.cookingMethod * jaccard(candidateFeatures.methods, referenceFeatures.methods)
  );
}

function buildPreferenceProfile(recipes, userId, recentIds, featureMap) {
  const parsedUserId = Number(userId) || null;
  const recentIndex = new Map(recentIds.map((id, index) => [Number(id), index]));
  const weightedRecipes = [];

  recipes.forEach((recipe) => {
    let weight = 0;
    if (parsedUserId) {
      if ((recipe.favorites || []).some((favorite) => favorite.user_id === parsedUserId)) weight += 1;
      const userRating = (recipe.ratings || []).find((rating) => rating.user_id === parsedUserId);
      if (userRating?.star_count >= 4) weight += (userRating.star_count - 3) / 2;
      if ((recipe.recipe_views || []).some((view) => view.user_id === parsedUserId)) weight += 0.25;
    }
    if (recentIndex.has(recipe.id)) weight += 1 / (recentIndex.get(recipe.id) + 1);
    if (weight > 0) weightedRecipes.push({ recipe, weight });
  });

  const categoryWeights = new Map();
  const featureWeights = new Map();
  weightedRecipes.forEach(({ recipe, weight }) => {
    categoryWeights.set(recipe.category_id, (categoryWeights.get(recipe.category_id) || 0) + weight);
    const features = featureMap.get(recipe.id);
    [...features.ingredients, ...features.tags].forEach((feature) => {
      featureWeights.set(feature, (featureWeights.get(feature) || 0) + weight);
    });
  });

  return {
    weightedRecipes,
    categoryWeights,
    featureWeights,
    maximumCategoryWeight: Math.max(0, ...categoryWeights.values()),
    maximumFeatureWeight: Math.max(0, ...featureWeights.values()),
  };
}

function getPersonalScore(candidate, candidateFeatures, profile, featureMap) {
  if (profile.weightedRecipes.length === 0) return 0;

  const categoryAffinity = profile.maximumCategoryWeight > 0
    ? (profile.categoryWeights.get(candidate.category_id) || 0) / profile.maximumCategoryWeight
    : 0;
  const preferenceFeatures = [...candidateFeatures.ingredients, ...candidateFeatures.tags];
  const ingredientTagAffinity = preferenceFeatures.length > 0 && profile.maximumFeatureWeight > 0
    ? preferenceFeatures.reduce(
      (sum, feature) => sum + (profile.featureWeights.get(feature) || 0) / profile.maximumFeatureWeight,
      0
    ) / preferenceFeatures.length
    : 0;
  const positiveHistorySimilarity = Math.max(0, ...profile.weightedRecipes.map(({ recipe }) => {
    const historyFeatures = featureMap.get(recipe.id);
    return (
      0.5 * jaccard(candidateFeatures.ingredients, historyFeatures.ingredients) +
      0.25 * jaccard(candidateFeatures.tags, historyFeatures.tags) +
      0.25 * Number(candidate.category_id === recipe.category_id)
    );
  }));

  return (
    PERSONAL_WEIGHTS.categoryAffinity * categoryAffinity +
    PERSONAL_WEIGHTS.ingredientTagAffinity * ingredientTagAffinity +
    PERSONAL_WEIGHTS.positiveHistorySimilarity * positiveHistorySimilarity
  );
}

function diversifyRecipes(rankedRecipes, limit) {
  const selected = [];
  const selectedIds = new Set();
  const categoryCounts = new Map();
  const authorCounts = new Map();

  const addRecipe = (recipe, enforceCategoryLimit = true, enforceAuthorLimit = true) => {
    if (selected.length >= limit || selectedIds.has(recipe.id)) return false;
    const categoryCount = categoryCounts.get(recipe.category_id) || 0;
    const authorCount = authorCounts.get(recipe.user_id) || 0;
    if (enforceCategoryLimit && categoryCount >= 4) return false;
    if (enforceAuthorLimit && authorCount >= 2) return false;
    selected.push(recipe);
    selectedIds.add(recipe.id);
    categoryCounts.set(recipe.category_id, categoryCount + 1);
    authorCounts.set(recipe.user_id, authorCount + 1);
    return true;
  };

  const newestRecipe = [...rankedRecipes].sort(
    (left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0)
  )[0];
  if (newestRecipe) addRecipe(newestRecipe);

  const availableCategories = new Set(rankedRecipes.map((recipe) => recipe.category_id)).size;
  const minimumCategories = Math.min(3, availableCategories);
  rankedRecipes.forEach((recipe) => {
    if (categoryCounts.size >= minimumCategories || categoryCounts.has(recipe.category_id)) return;
    addRecipe(recipe);
  });

  rankedRecipes.forEach((recipe) => addRecipe(recipe));
  rankedRecipes.forEach((recipe) => addRecipe(recipe, false, true));
  rankedRecipes.forEach((recipe) => addRecipe(recipe, false, false));

  return selected
    .sort((left, right) => right.recommendation_score - left.recommendation_score)
    .slice(0, limit);
}

function rankRecommendations({ recipes, referenceRecipeId, userId = null, recentIds = [], limit = 16 }) {
  const reference = recipes.find((recipe) => recipe.id === Number(referenceRecipeId));
  if (!reference) return [];

  const featureMap = new Map(recipes.map((recipe) => [recipe.id, getRecipeFeatures(recipe)]));
  const profile = buildPreferenceProfile(recipes, userId, recentIds, featureMap);
  const candidates = recipes.filter((recipe) => recipe.id !== reference.id);
  const maxima = {
    views: Math.max(0, ...candidates.map((recipe) => recipe.recipe_views?.length || 0)),
    favorites: Math.max(0, ...candidates.map((recipe) => recipe.favorites?.length || 0)),
    comments: Math.max(0, ...candidates.map((recipe) => recipe.comments?.length || 0)),
  };
  const recentSet = new Set(recentIds.map(Number));

  const ranked = candidates.map((candidate) => {
    const features = featureMap.get(candidate.id);
    const contentScore = getContentScore(candidate, features, reference, featureMap.get(reference.id));
    const personalScore = getPersonalScore(candidate, features, profile, featureMap);
    const totalRatings = candidate.ratings?.length || 0;
    const averageRating = totalRatings > 0
      ? candidate.ratings.reduce((sum, rating) => sum + rating.star_count, 0) / totalRatings
      : 0;
    const bayesianRating = (totalRatings * averageRating + 5 * 3.5) / (totalRatings + 5);
    const qualityScore = (
      QUALITY_WEIGHTS.rating * (bayesianRating / 5) +
      QUALITY_WEIGHTS.views * normalizeLog(candidate.recipe_views?.length || 0, maxima.views) +
      QUALITY_WEIGHTS.favorites * normalizeLog(candidate.favorites?.length || 0, maxima.favorites) +
      QUALITY_WEIGHTS.comments * normalizeLog(candidate.comments?.length || 0, maxima.comments)
    );
    const ageInDays = Math.max(0, (Date.now() - new Date(candidate.created_at || 0).getTime()) / 86400000);
    const freshnessScore = FRESHNESS_WEIGHT * Math.exp(-ageInDays / 30);
    const hasPersonalProfile = profile.weightedRecipes.length > 0;
    const score = hasPersonalProfile
      ? contentScore + personalScore + qualityScore + freshnessScore
      : contentScore * ANONYMOUS_MULTIPLIERS.content +
        qualityScore * ANONYMOUS_MULTIPLIERS.quality +
        freshnessScore * ANONYMOUS_MULTIPLIERS.freshness;
    const recentPenalty = recentSet.has(candidate.id) ? 0.85 : 1;

    return {
      ...candidate,
      recommendation_score: score * recentPenalty,
    };
  });

  ranked.sort((left, right) => {
    if (right.recommendation_score !== left.recommendation_score) {
      return right.recommendation_score - left.recommendation_score;
    }
    return new Date(right.created_at || 0) - new Date(left.created_at || 0);
  });

  return diversifyRecipes(ranked, limit);
}

module.exports = { jaccard, normalizeText, rankRecommendations };
