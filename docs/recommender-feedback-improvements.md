# Cải thiện tín hiệu phản hồi trong hệ gợi ý

## Phạm vi

Thay đổi hệ chính trong `services/recommender`, không migration hay sửa dữ liệu.

- Đánh giá hiện tại 1–2 sao đặt điểm user–món thành -2, dù có yêu thích, xem hay bình luận. Khi đánh giá được sửa, lần đọc tiếp theo tính lại từ trạng thái database mới.
- Mỗi user–món chỉ được cộng 0.25 điểm bình luận một lần; lượt xem vẫn chỉ cộng một lần. Bình luận là tín hiệu quan tâm yếu, không phân tích cảm xúc.
- Content và CF không dùng điểm âm làm nguồn tích cực. Gợi ý cá nhân loại mọi món đã tương tác, bao gồm món bị chê, kể cả khi bổ sung popularity.
- Khi có lịch sử tích cực, điểm ứng viên được nhân với `1 - 0.35 * negativeSimilarity`. NegativeSimilarity là cosine với hồ sơ tổng hợp từ các món có điểm âm. Đây là giảm mềm, không cấm danh mục. Nhánh popularity thuần chưa giảm điểm các món tương tự món bị chê.
- CF dùng `cosine * n_common / (n_common + 5)`. Chỉ đếm người dùng có điểm dương ở cả hai món. Hệ số 5 là giá trị khởi đầu, chưa được tối ưu thực nghiệm.
- Nhãn thích dùng trong đánh giá offline cũng loại món có đánh giá 1–2 sao, tránh coi yêu thích mâu thuẫn là ground truth tích cực.

## Lưu ý đo lường

Kết quả đánh giá cũ không đại diện cho phiên bản mới. Cần chạy lại và so sánh trên cùng dữ liệu/seed trước khi khẳng định chất lượng tăng.

Hybrid vẫn chuẩn hóa mỗi nhánh theo cực đại: shrinkage thay đổi điểm tương đối giữa các cặp có mức hỗ trợ khác nhau, nhưng không bảo đảm giảm tổng ảnh hưởng CF khi mọi ứng viên có cùng mức hỗ trợ.

Chưa thay đổi: ngưỡng switching 3 món, trọng số hybrid 0.3/0.7, API món tương tự không cá nhân hóa, fallback cũ khi hệ chính lỗi. Time decay, từ điển nguyên liệu và đánh giá theo thời gian là các hạng mục tiếp theo, chưa triển khai trong đợt này.

## Kiểm thử

Chạy `node --test tests/recommenderFeedback.test.js tests/recommenderStrategy.test.js`.

Kiểm tra xung đột đánh giá thấp/yêu thích, sửa đánh giá, chống cộng điểm lặp, shrinkage, đối xứng/cache CF, loại món bị chê ở mọi chiến lược và giảm mềm ứng viên tương tự. Kiểm thử dùng dữ liệu trong bộ nhớ, không truy cập database.
