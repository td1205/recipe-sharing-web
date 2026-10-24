# Kết quả đánh giá hệ gợi ý

Ngày chạy: 12:27:21 24/10/2026
Dữ liệu: 1202 món, 25419 tương tác, 300 người dùng được kiểm tra.
Thiết lập: hybrid = 0.3 × content + 0.7 × CF; dùng CF khi người dùng có >= 3 món đã tương tác.

Phương pháp: leave-one-out - với mỗi người dùng có >= 5 món yêu thích, giấu 1 món rồi kiểm tra
món đó có nằm trong top-10 gợi ý hay không. Mỗi con số là trung bình của 5 lần chạy.

> Lưu ý: tương tác được sinh bởi `scripts/simulate-users.js` (dữ liệu MÔ PHỎNG có gu rõ ràng).

## 1. Người dùng đã có lịch sử (300 người)

| Phương pháp | HitRate@10 (= Recall@10) | Precision@10 | NDCG@10 |
|---|---|---|---|
| Ngẫu nhiên (mốc so sánh) | 0.9% | 0.1% | 0.004 |
| Độ phổ biến | 7.5% | 0.8% | 0.036 |
| Content-based (TF-IDF) | 12.3% | 1.2% | 0.059 |
| Item-based CF | 28.9% | 2.9% | 0.155 |
| Hybrid 0.3 content + 0.7 CF | 29.8% | 3.0% | 0.156 |
| Hệ thống (switching) | 29.8% | 3.0% | 0.156 |

## 2. Theo số món đã biết về người dùng (mô phỏng người dùng mới)

Mỗi người dùng được kiểm tra chỉ giữ lại 1, 2, 3 hoặc 4 món trong lịch sử.

HitRate@10:

| Số món đã biết | Độ phổ biến | Content-based (TF-IDF) | Item-based CF | Hybrid 0.3 content + 0.7 CF | Hệ thống (switching) |
|---|---|---|---|---|---|
| 1 món | 3.6% | 3.7% | 3.6% | 3.7% | 3.7% |
| 2 món | 3.6% | 3.9% | 3.9% | 4.1% | 3.9% |
| 3 món | 3.8% | 4.4% | 4.8% | 5.3% | 5.3% |
| 4 món | 4.7% | 4.9% | 5.3% | 6.3% | 6.3% |
