CREATE TABLE `shopping_list_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `recipe_id` INT NOT NULL,
  `ingredient_id` INT NOT NULL,
  `is_checked` BOOLEAN NOT NULL DEFAULT false,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shopping_list_item_once` (`user_id`, `recipe_id`, `ingredient_id`),
  KEY `shopping_list_items_user_recipe_idx` (`user_id`, `recipe_id`),
  CONSTRAINT `shopping_list_items_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shopping_list_items_recipe_fk` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shopping_list_items_ingredient_fk` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE
);
