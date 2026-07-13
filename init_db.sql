CREATE DATABASE IF NOT EXISTS recipe_db;
USE recipe_db;
-- 1. Bảng lưu trữ thông tin người dùng
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    fullname VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng lưu danh mục món ăn (ví dụ: Món Á, Món Âu, Món Chay)
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng lưu thông tin công thức món ăn chính
CREATE TABLE IF NOT EXISTS recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    prep_time INT NOT NULL, -- Thời gian chuẩn bị (phút)
    cook_time INT NOT NULL, -- Thời gian nấu (phút)
    servings INT NOT NULL,  -- Số khẩu phần ăn
    image_url VARCHAR(255), -- Đường dẫn ảnh món ăn
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 4. Bảng lưu các nguyên liệu chi tiết của món ăn
CREATE TABLE IF NOT EXISTS ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    amount VARCHAR(50), -- Số lượng (ví dụ: 500, 2)
    unit VARCHAR(50),   -- Đơn vị tính (ví dụ: gram, quả, muỗng)
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- 5. Bảng lưu các bước làm món ăn
CREATE TABLE IF NOT EXISTS steps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    step_number INT NOT NULL, -- Số thứ tự bước (1, 2, 3...)
    instruction TEXT NOT NULL, -- Hướng dẫn chi tiết bước làm
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- 6. Bảng bình luận món ăn
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    recipe_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- 7. Bảng đánh giá số sao (Từ 1 đến 5 sao)
CREATE TABLE IF NOT EXISTS ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    recipe_id INT NOT NULL,
    star_count INT NOT NULL CHECK (star_count >= 1 AND star_count <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- 8. Bảng lưu công thức yêu thích của người dùng
CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    recipe_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_recipe (user_id, recipe_id) -- Tránh một người thích 1 món nhiều lần
);

-- 9. Dữ liệu mẫu cho danh mục (categories)
INSERT IGNORE INTO categories (id, name, description) VALUES
(2, 'Món Kho', 'Các món kho đậm đà, hao cơm'),
(3, 'Món Chiên', 'Các món chiên rán giòn tan, hấp dẫn'),
(4, 'Món Xào', 'Các món xào thơm ngon, đầy đủ dinh dưỡng'),
(5, 'Món Canh', 'Các món canh nóng hổi, thanh mát, ngọt nước'),
(6, 'Món Nướng', 'Các món nướng thơm lừng, thích hợp cho dịp cuối tuần'),
(7, 'Món Lẩu', 'Các món lẩu nghi ngút khói, thích hợp quây quần gia đình'),
(8, 'Món Hấp', 'Các món hấp thanh đạm, giữ nguyên vị ngọt tự nhiên');

-- 10. Dữ liệu mẫu cho công thức (recipes)
-- Giả định sử dụng user_id = 1 (Tài khoản admin mặc định trong hệ thống)
INSERT IGNORE INTO recipes (id, user_id, category_id, title, description, prep_time, cook_time, servings, image_url) VALUES
(3, 1, 2, 'Gà kho gừng', 'Món gà kho gừng ấm nồng, cay nhẹ là món ăn cực kỳ quen thuộc và đưa cơm trong bữa ăn gia đình Việt.', 20, 30, 3, 'https://cdn.tgdd.vn/Files/2021/12/24/1406516/tong-hop-cong-thuc-nau-an-theo-cach-che-bien-de-lam-tai-nha-202112241205239944.jpg'),
(4, 1, 2, 'Thịt heo kho sả ớt', 'Thịt heo kho xong có màu nâu trong rất đẹp, thấm đều gia vị, dậy lên mùi sả ớt cay nồng bắt mắt.', 15, 30, 3, 'https://cdn.tgdd.vn/Files/2021/12/24/1406516/tong-hop-cong-thuc-nau-an-theo-cach-che-bien-de-lam-tai-nha-202112241210158265.jpg'),
(5, 1, 2, 'Thịt heo kho thơm (dứa)', 'Vị chua ngọt thanh mát của dứa hòa quyện cùng vị béo ngậy của thịt ba chỉ, mang lại hương vị đậm đà lạ miệng.', 30, 20, 4, 'https://cdn.tgdd.vn/Files/2021/12/24/1406516/tong-hop-cong-thuc-nau-an-theo-cach-che-bien-de-lam-tai-nha-202112241332440224.jpg'),
(6, 1, 3, 'Cá mối khô chiên đường', 'Món khô cá mối chiên vàng giòn rụm được ngào lớp nước đường kẹo ngọt cay nhẹ hấp dẫn vô cùng.', 10, 15, 4, 'https://cdn.tgdd.vn/Files/2021/12/24/1406516/tong-hop-cong-thuc-nau-an-theo-cach-che-bien-de-lam-tai-nha-202112241337065383.jpg'),
(7, 1, 3, 'Cá bạc má chiên giấm', 'Món cá chiên độc đáo với nước sốt giấm chua ngọt đượm vị tỏi phi thơm lừng kích thích vị giác.', 15, 35, 3, 'https://cdn.tgdd.vn/Files/2021/12/24/1406516/tong-hop-cong-thuc-nau-an-theo-cach-che-bien-de-lam-tai-nha-202112241339363391.jpg'),
(8, 1, 4, 'Cà tím xào tôm thịt', 'Sự kết hợp hoàn hảo giữa tôm sú ngọt thanh, thịt ba chỉ béo ngậy và vị cà tím mềm ngọt cùng lá lốt, tía tô thơm lừng.', 15, 35, 4, 'https://cdn.tgdd.vn/Files/2021/12/24/1406516/tong-hop-cong-thuc-nau-an-theo-cach-che-bien-de-lam-tai-nha-202112241345127674.jpg'),
(9, 1, 4, 'Sườn xào chua ngọt với dứa', 'Sườn xào chua ngọt theo phong vị Nam Bộ với vị thơm thanh đậm đà từ dứa, miếng sườn dai ngọt mềm mại.', 20, 30, 4, 'https://cdn.tgdd.vn/Files/2021/12/24/1406516/tong-hop-cong-thuc-nau-an-theo-cach-che-bien-de-lam-tai-nha-202112241346472926.jpg'),
(10, 1, 5, 'Canh cua rau ngót', 'Nước canh ngọt lịm từ cua đồng tự nhiên kết hợp với rau ngót xanh mát, vừa mát ruột vừa bổ dưỡng cho những ngày hè.', 20, 15, 3, 'https://cdn.tgdd.vn/Files/2021/12/24/1406516/tong-hop-cong-thuc-nau-an-theo-cach-che-bien-de-lam-tai-nha-202112241350073508.jpg'),
(11, 1, 5, 'Canh sườn hầm củ sen', 'Món canh bổ dưỡng với nước dùng trong vắt ngọt lịm từ sườn non heo cùng củ sen giòn giòn sần sật tốt cho sức khỏe.', 20, 50, 3, 'https://cdn.tgdd.vn/Files/2021/12/24/1406516/tong-hop-cong-thuc-nau-an-theo-cach-che-bien-de-lam-tai-nha-202112241354376344.jpg'),
(12, 1, 6, 'Cá mú nướng sa tế', 'Cá mú nướng thơm lừng đượm nước sốt sa tế cay cay ngọt ngọt mang hương vị hải sản nướng hoang dã cực đã.', 15, 90, 4, 'https://cdn.tgdd.vn/Files/2021/12/24/1406516/tong-hop-cong-thuc-nau-an-theo-cach-che-bien-de-lam-tai-nha-202112241357090542.jpg'),
(13, 1, 6, 'Nem nướng chay', 'Món nem nướng thuần chay làm từ bột mì và heo lát chay dai dẻo thơm lừng mùi quế và mè rang.', 40, 60, 4, 'https://cdn.tgdd.vn/Files/2021/12/24/1406516/tong-hop-cong-thuc-nau-an-theo-cach-che-bien-de-lam-tai-nha-202112241403381548.jpg'),
(14, 1, 7, 'Lẩu hải sản Thái Lan', 'Nồi lẩu hải sản chua chua cay cay đậm vị lẩu Thái đầy đặn mực, tôm, nghêu và thịt bò ngọt mát.', 20, 30, 4, 'https://cdn.tgdd.vn/Files/2021/12/24/1406516/tong-hop-cong-thuc-nau-an-theo-cach-che-bien-de-lam-tai-nha-202112241405574020.jpg'),
(15, 1, 7, 'Lẩu bò hầm sả', 'Hương vị bò hầm sả ngọt thanh đặc trưng từ xương ống và thịt nạm bò mềm mại, ăn kèm mướp hương thanh mát.', 20, 30, 4, 'https://cdn.tgdd.vn/Files/2021/12/24/1406516/tong-hop-cong-thuc-nau-an-theo-cach-che-bien-de-lam-tai-nha-202112241409349090.jpg'),
(16, 1, 8, 'Cá tai tượng hấp hành', 'Cá hấp cách thủy giữ nguyên vị ngọt đậm đà vốn có, ăn kèm nước mắm me chua ngọt tuyệt hảo.', 20, 40, 4, 'https://cdn.tgdd.vn/Files/2021/12/24/1406516/tong-hop-cong-thuc-nau-an-theo-cach-che-bien-de-lam-tai-nha-202112241411588569.jpg'),
(17, 1, 8, 'Thịt dê hấp sả', 'Món thịt dê hấp sả nóng hổi, thịt dê dai dai ngọt tự nhiên quyện cùng mùi sả gừng ấm nóng tốt cho sức khỏe.', 20, 30, 4, 'https://cdn.tgdd.vn/Files/2021/12/24/1406516/tong-hop-cong-thuc-nau-an-theo-cach-che-bien-de-lam-tai-nha-202112241416037998.jpg');

-- 11. Dữ liệu mẫu cho nguyên liệu (ingredients)
INSERT IGNORE INTO ingredients (recipe_id, name, amount, unit) VALUES
-- Gà kho gừng (ID: 3)
(3, 'Thịt gà', '500', 'g'),
(3, 'Gừng', '1', 'củ'),
(3, 'Tỏi', '3', 'tép'),
(3, 'Ớt hiểm', '2', 'trái'),
(3, 'Hạt nêm', '1', 'muỗng cà phê'),
(3, 'Nước mắm', '2', 'muỗng canh'),
(3, 'Nước màu', '1', 'muỗng cà phê'),
(3, 'Đường', '1', 'muỗng canh'),
-- Thịt heo kho sả ớt (ID: 4)
(4, 'Thịt heo', '200', 'g'),
(4, 'Sả cây', '2', 'nhánh'),
(4, 'Hành tím', '1', 'củ'),
(4, 'Ớt hiểm', '2', 'trái'),
(4, 'Đường', '2', 'muỗng canh'),
(4, 'Nước mắm', '3', 'muỗng canh'),
(4, 'Hạt nêm', '1', 'muỗng cà phê'),
-- Thịt heo kho thơm (ID: 5)
(5, 'Thịt ba rọi', '300', 'g'),
(5, 'Thơm (dứa)', '150', 'g'),
(5, 'Ớt hiểm', '2', 'trái'),
(5, 'Tỏi', '2', 'tép'),
(5, 'Hành tím', '3', 'củ'),
(5, 'Nước dừa tươi', '300', 'ml'),
(5, 'Hành lá', '1', 'muỗng canh'),
-- Cá mối khô chiên đường (ID: 6)
(6, 'Cá mối khô', '2', 'con'),
(6, 'Đường', '3', 'muỗng canh'),
(6, 'Nước lọc', '0.5', 'chén'),
(6, 'Muối', '0.5', 'muỗng cà phê'),
(6, 'Bột ngọt', '0.5', 'muỗng cà phê'),
(6, 'Dầu ăn', '2', 'muỗng canh'),
-- Cá bạc má chiên giấm (ID: 7)
(7, 'Cá bạc má', '2', 'con'),
(7, 'Hành lá', '3', 'nhánh'),
(7, 'Tỏi', '1', 'củ'),
(7, 'Giấm', '3', 'muỗng canh'),
(7, 'Đường', '2.5', 'muỗng canh'),
(7, 'Muối', '1', 'muỗng cà phê'),
-- Cà tím xào tôm thịt (ID: 8)
(8, 'Cà tím', '200', 'g'),
(8, 'Tôm sú', '200', 'g'),
(8, 'Thịt ba chỉ', '100', 'g'),
(8, 'Cà chua bi', '150', 'g'),
(8, 'Rau tía tô', '20', 'g'),
(8, 'Lá lốt', '20', 'g'),
(8, 'Bột nghệ', '0.5', 'muỗng cà phê'),
-- Sườn xào chua ngọt với dứa (ID: 9)
(9, 'Sườn non', '500', 'g'),
(9, 'Dứa (thơm)', '100', 'g'),
(9, 'Giấm', '1', 'muỗng canh'),
(9, 'Nước mắm', '1', 'muỗng canh'),
(9, 'Tương ớt', '1', 'muỗng canh'),
(9, 'Đường', '1', 'muỗng canh'),
-- Canh cua rau ngót (ID: 10)
(10, 'Cua đồng', '300', 'g'),
(10, 'Rau ngót', '1', 'bó'),
(10, 'Muối', '0.5', 'muỗng cà phê'),
(10, 'Hạt nêm', '1', 'muỗng cà phê'),
(10, 'Nước mắm', '1', 'muỗng cà phê'),
-- Canh sườn hầm củ sen (ID: 11)
(11, 'Sườn heo', '300', 'g'),
(11, 'Củ sen', '1', 'củ'),
(11, 'Hành lá', '5', 'nhánh'),
(11, 'Hành tím', '4', 'củ'),
(11, 'Nước mắm', '2', 'muỗng cà phê'),
(11, 'Hạt nêm', '3', 'muỗng cà phê'),
(11, 'Đường', '2', 'muỗng cà phê'),
-- Cá mú nướng sa tế (ID: 12)
(12, 'Cá mú', '1', 'con'),
(12, 'Sa tế', '4', 'muỗng canh'),
(12, 'Dầu hào', '1', 'muỗng canh'),
(12, 'Tương ớt', '1', 'muỗng canh'),
(12, 'Ớt khô', '0.5', 'muỗng canh'),
(12, 'Đường', '0.3', 'muỗng canh'),
(12, 'Nước mắm', '1', 'muỗng canh'),
-- Nem nướng chay (ID: 13)
(13, 'Heo lát chay', '20', 'g'),
(13, 'Bột khoai', '15', 'cọng'),
(13, 'Bột mì', '50', 'g'),
(13, 'Mè rang', '2', 'muỗng cà phê'),
(13, 'Hạt nêm chay', '2', 'muỗng cà phê'),
(13, 'Bột quế (ngũ vị hương)', '0.5', 'muỗng cà phê'),
(13, 'Sốt ướp đồ nướng', '1', 'muỗng cà phê'),
-- Lẩu hải sản Thái Lan (ID: 14)
(14, 'Mực ống', '300', 'g'),
(14, 'Tôm sú', '300', 'g'),
(14, 'Nghêu', '500', 'g'),
(14, 'Thịt bò', '200', 'g'),
(14, 'Gia vị lẩu Thái', '1', 'gói'),
(14, 'Cà chua', '2', 'quả'),
(14, 'Rau ăn kèm', '1', 'phần'),
-- Lẩu bò hầm sả (ID: 15)
(15, 'Thịt nạm bò', '500', 'g'),
(15, 'Thịt cổ bò', '500', 'g'),
(15, 'Xương ống bò', '1', 'kg'),
(15, 'Củ cải trắng', '1', 'củ'),
(15, 'Sả cây', '10', 'nhánh'),
(15, 'Đậu hũ', '2', 'miếng'),
(15, 'Mướp hương', '1', 'trái'),
-- Cá tai tượng hấp hành (ID: 16)
(16, 'Cá tai tượng', '1', 'con'),
(16, 'Hành lá', '100', 'g'),
(16, 'Ớt sừng', '2', 'trái'),
(16, 'Tương ớt', '1', 'muỗng canh'),
(16, 'Hạt nêm', '2', 'muỗng cà phê'),
(16, 'Nước mắm', '2', 'muỗng canh'),
-- Thịt dê hấp sả (ID: 17)
(17, 'Thịt dê', '500', 'g'),
(17, 'Sả cây', '5', 'nhánh'),
(17, 'Gừng', '1', 'củ'),
(17, 'Ớt sừng', '2', 'trái'),
(17, 'Hạt nêm', '2', 'muỗng cà phê'),
(17, 'Hạt tiêu', '0.5', 'muỗng cà phê');

-- 12. Dữ liệu mẫu cho các bước làm (steps)
INSERT IGNORE INTO steps (recipe_id, step_number, instruction) VALUES
-- Gà kho gừng (ID: 3)
(3, 1, 'Sơ chế thịt gà cho sạch và chặt thành từng cục vừa ăn. Gừng cạo sạch vỏ và thái sợi.'),
(3, 2, 'Ướp thịt gà trong một cái tô cùng với một ít bột ngọt, hạt nêm, muối, nước mắm, đường, tương ớt, nước màu trong 10 - 15 phút.'),
(3, 3, 'Bắt nồi lên bếp, phi vàng tỏi rồi cho thịt gà đã ướp vào nấu trong 2 phút cho thêm nước lọc vào vừa ngập thịt gà. Tiếp tục nấu trong khoảng 20 phút ở lửa vừa, nêm nếm lại cho vừa ăn rồi cho gừng và tiêu vào hoàn thành món ăn.'),
-- Thịt heo kho sả ớt (ID: 4)
(4, 1, 'Thịt heo sơ chế sạch, cắt thành từng miếng vừa ăn. Sả rửa sạch, hành tím lột vỏ rồi để ráo và đem đi băm nhuyễn.'),
(4, 2, 'Ướp thịt với hạt nêm, đường, bột ngọt, tiêu, tương ớt, hành tím và phần sả băm rồi đảo đều, để thấm gia vị trong 30 phút.'),
(4, 3, 'Bắc chảo lên bếp cho 2 muỗng canh dầu ăn, 2 muỗng canh đường để làm nước màu. Sau đó, cho thịt heo vào đảo đều đến khi săn lại, cho thêm 3 muỗng canh nước mắm và một ít nước kho ở lửa vừa trong 15 phút, nêm nếm lại cho vừa ăn, rồi tắt bếp.'),
-- Thịt heo kho thơm (ID: 5)
(5, 1, 'Sơ chế thịt heo sạch rồi thái thành từng miếng vừa ăn tầm 0.5cm. Dứa thì ta sẽ cắt bỏ bớt phần cùi, sau đó thái lát dày tầm 1cm nhé. Còn tỏi, ớt (chỉ lấy 1 trái) và hành tím thì sẽ băm nhuyễn.'),
(5, 2, 'Ướp thịt với nước tương, hạt nêm, tiêu, ớt bột, ½ muỗng canh đường và tỏi, ớt, hành tím băm trong 30 phút. Thơm miếng ướp với 1.5 muỗng canh đường trong 20 phút.'),
(5, 3, 'Cho dứa lên bếp và sên với đường ở lửa vừa để cho đường thấm vào bên trong dứa, đến khi nào phần nước hơi khô lại thì tắt bếp (khoảng 5 phút).'),
(5, 4, 'Bắt nồi lên bếp cho ½ thìa cà phê tỏi, ớt và hành tím băm nhuyễn vào phi vàng thơm. Cho phần thịt đã được ướp gia vị vào trong nồi, xào đến khi săn lại rồi cho nước dừa và thơm đã sên vào. Sau đó hạ lửa nhỏ và kho trong 20 phút rồi nêm nếm lại rồi tắt bếp.'),
-- Cá mối khô chiên đường (ID: 6)
(6, 1, 'Làm sạch cá mối và cắt thành khúc vừa ăn. Sau đó, chiên sơ cá mối cho vàng đều.'),
(6, 2, 'Pha hỗn hợp nước đường với ½ chén nước lọc, cho vào 3 muỗng canh đường, ½ muỗng cà phê muối, ½ muỗng cà phê bột ngọt, sau đó khuấy đều cho tan.'),
(6, 3, 'Từ chảo dầu chiên ban đầu bạn cho toàn bộ hỗn hợp nước đường vào khuấy đều cho sệt và khi chuyển sang màu vàng thì cho cá mối vào đảo đều là được.'),
-- Cá bạc má chiên giấm (ID: 7)
(7, 1, 'Cá bạc má làm sạch. Tỏi bạn lột vỏ và băm nhỏ. Hành lá rửa sạch và cắt khúc nhỏ.'),
(7, 2, 'Làm nước sốt giấm với 3 muỗng canh giấm, 2.5 muỗng canh đường, 1 muỗng cà phê muối, 1/2 muỗng cà phê bột ngọt và khuấy đều.'),
(7, 3, 'Bắc chảo lên bếp phi thơm tỏi và cho cá vào chiên. Sau đó, cho nước giấm đã pha vào và nấu đến khi sệt lại, nêm cho vừa ăn rồi rắc hành lá lên.'),
-- Cà tím xào tôm thịt (ID: 8)
(8, 1, 'Sơ chế cà tím, cắt thành khúc khoảng 3cm. Tôm sú sơ chết sạch, lột vỏ để ráo. Thịt rửa sạch cắt thành từng khúc vừa ăn. Lá lốt và tía tô lặt lá héo xong rồi thì bạn cắt nhỏ, cà chua bi bạn rửa sạch cắt làm đôi còn ớt thì bạn đập dập khoảng 2 trái.'),
(8, 2, 'Chia thịt và tôm làm 2 phần và ướp với 1/2 muỗng cà phê bột ngọt, 1/2 muỗng cà phê hạt nêm, 1/4 muỗng cà phê tiêu xay, 1/2 muỗng cà phê bột nghệ và 1 muỗng canh hành tím và tỏi băm, trộn đều các nguyên liệu lại.'),
(8, 3, 'Chần sơ cà tím qua nước sôi. Sau đó bắt chảo phi thơm hành tỏi và cho phần thịt ba chỉ, tôm sú, tiếp đến là cà tím, cà bi rồi nêm nếm lại cho vừa ăn.'),
-- Sườn xào chua ngọt với dứa (ID: 9)
(9, 1, 'Sơ chế sườn sạch và chặt thành miếng vừa ăn ướp với một ít hạt nêm. Dứa bạn cắt miếng vừa ăn rồi ướp với chút đường và hạt nêm.'),
(9, 2, 'Chiên sườn cho vàng đều. Sau đó, bạn hòa tan 1 thìa canh đường, 1 thìa canh giấm, 1 thìa canh nước mắm và 1 thìa canh tương ớt để làm sốt chua ngọt nhé.'),
(9, 3, 'Đun nóng chảo với dầu ăn rồi phi thơm hành tỏi, cho sườn vào xào chung với nước sốt chua ngọt đã chuẩn bị trong lửa nhỏ đến khi nước sốt sệt lại là xong.'),
-- Canh cua rau ngót (ID: 10)
(10, 1, 'Sơ chế cua và đem xay nhuyễn, lược qua rây để lấy thịt cua. Rau ngót bạn tuốt lấy lá và đem rửa sạch. Vớt ra rồi dùng tay vò sơ qua để rau ngót được mềm.'),
(10, 2, 'Đun sôi nước lọc cua nêm thêm các loại gia vị gồm muối, hạt nêm, bột ngọt và nước mắm. Khi thịt và gạch cua nổi lên trên thì cho rau ngót vào.'),
(10, 3, 'Đun sôi thêm một lúc cho nước sôi lại thì tắt bếp.'),
-- Canh sườn hầm củ sen (ID: 11)
(11, 1, 'Sơ chế, làm sạch sườn non và củ sen, cắt thành khúc vừa ăn. Ướp sườn với 1/2 phần hành tím, 2 muỗng cà phê hạt nêm, 1 muỗng cà phê tiêu, 2 muỗng cà phê nước mắm. Đảo đều và để ướp 15 phút cho thấm gia vị.'),
(11, 2, 'Làm nóng nồi và phi thơm hành tím. Sau đó, cho sườn và 2 lít nước lọc vào hầm. Nêm 3 muỗng cà phê hạt nêm, 2 muỗng cà phê đường, cho phần củ sen vào, hầm lửa vừa trong 35 phút.'),
(11, 3, 'Nêm nếm lại gia vị và tắt bếp.'),
-- Cá mú nướng sa tế (ID: 12)
(12, 1, 'Sơ chế, làm sạch cá mú, dùng dao khứa lên cá các đường đều nhau với khoảng cách giữa hai đường bằng ½ ngón tay.'),
(12, 2, 'Bạn dùng 4 muỗng canh sa tế, 1 muỗng canh dầu hào, 1 muỗng canh tương ớt, 1/2 muỗng canh ớt khô, 1/3 muỗng canh đường, 1 muỗng canh nước mắm rồi khuấy đều ướp hỗn hợp này lên cá trong 15 phút.'),
(12, 3, 'Bạn nên hấp cá trước cho cá chín khoảng 60 phút, sau đó nướng lại trên vỉ nướng trong 30 phút, lúc nướng quét hỗn hợp nước sốt lên mình cá.'),
-- Nem nướng chay (ID: 13)
(13, 1, 'Các bạn chiên bột khoai ở lửa vừa cho nở ra. Sau đó ngâm vào tô nước lạnh và cắt thành từng khúc khoảng 1 lóng tay.'),
(13, 2, 'Xay nhuyễn heo lát, trộn với 3 muỗng cà phê đường, 2 muỗng cà phê hạt nêm chay, 1 muỗng cà phê mè rang, 1/2 muỗng cà phê muối, 1/2 muỗng cà phê bột quế và bột khoai vào trộn đều đến khi dẻo lại thì nắn thành que nem.'),
(13, 3, 'Bạn chuẩn bị 1 cái chén cho vào 1 muỗng canh dầu ăn, 1 muỗng cà phê sốt ướp đồ nướng, 1 muỗng cà phê mè rang rồi khuấy đều để làm nước sốt. Khi nướng nem thì quét sốt này lên là được.'),
-- Lẩu hải sản Thái Lan (ID: 14)
(14, 1, 'Các loại hải sản, thịt bò rửa sạch cắt miếng vừa ăn, nấm rơm rửa sạch nếu nấm lớn thì cắt đôi. Cà chua cắt múi cau, sả, ớt, hành tím băm nhỏ. Các loại rau ăn kèm bỏ các phần già, bẻ khúc vừa ăn.'),
(14, 2, 'Chuẩn bị 1 cái nồi, cho sả, hành tím, ớt, cà chua vào đảo đều cho thơm rồi cho nước lọc vào, nước sôi thì cho gói gia vị nấu lẩu thái vào, nêm nếm lại cho vừa ăn là được.'),
-- Lẩu bò hầm sả (ID: 15)
(15, 1, 'Làm sạch và chần sơ xương bò qua nước sôi. Sơ chế đậu hũ, mướp hương, củ cải rồi cắt khúc vừa ăn. Sả rửa sạch, buộc thành bó.'),
(15, 2, 'Đun sôi 6 lít nước và cho tất cả nguyên liệu đã sơ chế vào nấu và nêm nếm với 2 muỗng muối, 2 muỗng hạt nêm, 2 muỗng đường.'),
(15, 3, 'Để lửa riu riu nấu khoảng 1 tiếng cho thịt bò mềm là được.'),
-- Cá tai tượng hấp hành (ID: 16)
(16, 1, 'Sơ chế và làm sạch cá tai tượng, sau đó dùng dao rạch vài đường trên thân cá cho thấm gia vị. Hành lá thì nên cắt khúc, ớt sừng bỏ hạt rồi cắt sợi và tỏi, ớt hiểm thì băm nhuyễn.'),
(16, 2, 'Ướp đều toàn bộ con cá với 2 muỗng cà phê hạt nêm, 1 muỗng canh đường, 1 muỗng cà phê bột ngọt, 1 muỗng canh tương ớt, tỏi băm và một ít tỏi phi. Nhét một ít hành lá và ớt vào bụng, đầu của con cá.'),
(16, 3, 'Hấp cách thủy trong vòng 30 phút là hoàn thành món cá tai tượng hấp.'),
(16, 4, 'Làm nước chấm cá với một ít nước lọc, 3 muỗng đường, tỏi ớt băm và 2 muỗng nước mắm, sau đó trộn đều.'),
-- Thịt dê hấp sả (ID: 17)
(17, 1, 'Thịt dê làm sạch thái miếng nhỏ. Sả, ớt, gừng làm sạch và đập dập, băm hơi nhuyễn.'),
(17, 2, 'Ướp thịt dê với hạt nêm, đường, bột ngọt vào trộn thật đều để trong 30 phút.'),
(17, 3, 'Chuẩn bị một cái nồi lớn, cho sả xuống dưới đáy nồi rồi cho thịt dê đã được ướp gia vị đặt lên trên. Hấp cách thủy với sả trong 40 phút là được.');
