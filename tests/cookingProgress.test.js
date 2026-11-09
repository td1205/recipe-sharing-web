const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCookingProgress, roomForUser } = require('../services/cookingSocket');

test('cooking progress follows sequential steps and user-scoped rooms', () => {
  assert.equal(roomForUser(12), 'cooking:user:12');
  assert.deepEqual(normalizeCookingProgress({ recipeId: 7, completedSteps: 0, currentStep: 1 }, 3), {
    recipeId: 7, completedSteps: 0, currentStep: 1, totalSteps: 3,
  });
  assert.deepEqual(normalizeCookingProgress({ recipeId: 7, completedSteps: 3, currentStep: null }, 3), {
    recipeId: 7, completedSteps: 3, currentStep: null, totalSteps: 3,
  });
  assert.equal(normalizeCookingProgress({ recipeId: 7, completedSteps: 2, currentStep: 2 }, 3), null);
  assert.equal(normalizeCookingProgress({ recipeId: 7, completedSteps: 4, currentStep: null }, 3), null);
  assert.equal(normalizeCookingProgress({ recipeId: 'bad', completedSteps: 0, currentStep: 1 }, 3), null);
});
