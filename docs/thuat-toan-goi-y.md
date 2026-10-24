# Hệ gợi ý món ăn: thuật toán và cách giải thích

Tài liệu này giải thích hệ gợi ý của recipe_web, dùng cho báo cáo và thuyết trình.
Code nằm trong `services/recommender/`, mỗi file có chú thích công thức ở đầu file.

## 1. Tổng quan: hybrid kiểu "chuyển trạng thái" (switching)

Hệ thống chọn thuật toán theo lượng dữ liệu đã biết về người dùng:

| Người dùng | Thuật toán | Vì sao |
|---|---|---|
| Khách hoặc người mới (0 tương tác) | **Độ phổ biến** | Chưa biết gì về họ, nên gợi ý món được cộng đồng thích |
| Đã tương tác 1–2 món | **Content-based (TF-IDF)** | Chỉ cần 1 món là tìm được món giống, và giải thích được ngay |
| Đã tương tác từ 3 món | **Hybrid = 0,3 × Content + 0,7 × CF** | Đủ dữ liệu để học từ hành vi cộng đồng |

Ba chỗ dùng hệ gợi ý trên web:

1. **Trang chủ, mục "Dành riêng cho bạn"**: dùng bảng trên.
2. **Trang chi tiết, mục "Gợi ý cho bạn"** (món tương tự): `0,7 × độ giống nội dung + 0,3 × độ giống CF`.
3. **"Nấu gì với nguyên liệu có sẵn?"**: API `GET /api/recommendations/by-ingredients?items=trứng,cà chua`.

Mỗi món được gợi ý có kèm **lý do**, ví dụ *"Giống món bạn quan tâm: Canh chua cá lóc"*. Lý do này hiển thị dưới tên món.

## 2. Quy đổi hành vi thành "điểm quan tâm" (`interactions.js`)

Người dùng ít khi chấm sao, nhưng mỗi lần xem hay thả tim đều cho biết họ thích gì (implicit feedback):

| Hành vi | Điểm |
|---|---|
| Xem món (tính 1 lần) | +1 |
| Bình luận | +1 |
| Yêu thích | +3 |
| Chấm 5 sao / 4 sao / 3 sao | +3 / +2 / 0 |
| Chấm 1–2 sao | −2 |

## 3. Content-based filtering: TF-IDF và cosine (`contentModel.js`)

**Ý tưởng:** hai món dùng nhiều nguyên liệu, tag và cách chế biến giống nhau thì giống nhau.

Mỗi món là một vector đặc trưng gồm: nguyên liệu (hệ số 1,0), tag (1,5), danh mục (1,0) và từ trong tên món (0,5).

**TF-IDF** làm đặc trưng hiếm quan trọng hơn đặc trưng phổ biến:

```
idf(t) = ln( N / df(t) )        N: số món, df(t): số món có đặc trưng t
w(t, món) = hệ_số_nhóm(t) × idf(t)
```

- "muối" có ở khoảng 41% số món, nên idf ≈ 0,9 và ảnh hưởng ít.
- "nước cốt dừa" chỉ có ở khoảng 3% số món, nên idf ≈ 3,5 và ảnh hưởng mạnh.

**Độ giống cosine** giữa hai món (từ 0 đến 1):

```
cos(A, B) = (A · B) / (|A| × |B|)
```

**Gợi ý cho người dùng:** tạo **hồ sơ sở thích** bằng cách cộng các vector món họ đã tương tác, mỗi vector nhân với điểm quan tâm. Sau đó gợi ý những món có cosine cao nhất so với hồ sơ.

- Ưu điểm: dùng được ngay từ món đầu tiên, gợi ý được cả món mới đăng, dễ giải thích ("cùng có tôm, nước cốt dừa").
- Nhược điểm: chỉ gợi ý món na ná những gì người dùng đã thích, ít bất ngờ.

## 4. Item-based Collaborative Filtering (`cfModel.js`)

**Ý tưởng:** *"Người thích món A cũng thường thích món B"*. Cách này không cần biết món ăn có gì.

Ma trận R có hàng là người dùng, cột là món, giá trị là điểm quan tâm. Độ giống giữa hai món là cosine giữa hai **cột**:

```
              Σ_u r(u,i) × r(u,j)
sim(i, j) = ---------------------------
            √Σ_u r(u,i)² × √Σ_u r(u,j)²

score(u, j) = Σ_{i: món u đã tương tác} sim(i, j) × r(u, i)
```

- Ưu điểm: phát hiện được những liên hệ mà nội dung không thấy, và độ chính xác cao khi có đủ dữ liệu.
- Nhược điểm: món mới chưa ai tương tác thì không được gợi ý, và cần người dùng có lịch sử (cold start).

## 5. Độ phổ biến (`popularity.js`)

**Điểm sao kiểu Bayes** tránh trường hợp món chỉ có một lượt 5 sao đứng đầu bảng:

```
B = (v × R + m × C) / (v + m)     v: số lượt đánh giá, R: điểm TB của món,
                                   C: điểm TB toàn hệ thống, m = 5
phổ_biến = 0,4 × B/5 + 0,3 × log(1+yêu thích)/log(1+max) + 0,3 × log(1+xem)/log(1+max)
```

## 6. Gợi ý theo nguyên liệu có sẵn (`hybrid.js`, hàm `recipesByIngredients`)

Đây là cách **gợi ý dựa trên tri thức** (knowledge-based). Hệ thống bỏ qua các gia vị nhà nào cũng có (muối, đường, nước mắm, tỏi…), rồi tính:

```
độ_phủ   = nguyên liệu chính khớp / nguyên liệu chính của món    (thiếu ít)
tận_dụng = nguyên liệu bạn nhập được dùng / nguyên liệu bạn nhập  (dùng được nhiều)
điểm     = 0,5 × độ_phủ + 0,5 × tận_dụng
```

Kết quả trả kèm danh sách nguyên liệu còn thiếu. Người dùng gõ không dấu ("tom", "thit bo") vẫn tìm được món.

## 7. Đa dạng và hòa điểm

- Mỗi danh mục có tối đa 4 món trong danh sách gợi ý, để danh sách không bị một loại món chiếm hết.
- Hai món bằng điểm thì món phổ biến hơn được xếp trước.

## 8. Đánh giá (`evaluation.js`, `scripts/evaluate-recommender.js`)

**Leave-one-out:** với mỗi người dùng có từ 5 món yêu thích trở lên, giấu đi 1 món họ thích, huấn luyện mô hình trên phần còn lại, rồi kiểm tra món bị giấu có nằm trong top-10 gợi ý không.

- **HitRate@10** (= Recall@10): tỉ lệ người dùng có món bị giấu nằm trong top-10.
- **Precision@10** = HitRate / 10.
- **NDCG@10** = 1/log₂(vị trí + 1): trúng ở vị trí càng cao thì điểm càng cao.

Kết quả tham khảo: 1.187 món, 300 người dùng mô phỏng. Mỗi con số là **trung bình của 15 lần chạy** (3 bộ người dùng mô phỏng × 5 cách chọn món bị giấu). Chạy `npm run recommend:evaluate` để có kết quả trên dữ liệu trong database của bạn (trung bình 5 lần chạy).

**Người dùng đã có lịch sử:**

| Phương pháp | HitRate@10 | NDCG@10 |
|---|---|---|
| Ngẫu nhiên | 0,8% | 0,004 |
| Độ phổ biến | 6,3% | 0,031 |
| Content-based | 12,5% | 0,061 |
| Item-based CF | **33,4%** | **0,185** |
| Hybrid 0,3/0,7 | 31,6% | 0,174 |

**Người dùng mới** (chỉ giữ 1–4 món trong lịch sử), HitRate@10:

| Số món đã biết | Độ phổ biến | Content | CF | Hybrid |
|---|---|---|---|---|
| 1 món | 3,2% | 3,9% | 3,2% | 3,9% |
| 2 món | 3,5% | 5,0% | 3,6% | 5,1% |
| 3 món | 3,6% | 4,7% | 5,4% | 5,9% |
| 4 món | 4,3% | 4,6% | 5,9% | 6,5% |

**Kết luận dùng khi thuyết trình:**
- **Kết luận chắc chắn:** khi người dùng đã có lịch sử, CF và hybrid tốt gấp khoảng **2,5 lần content-based** và **5 lần độ phổ biến**. Học từ hành vi cộng đồng hiệu quả hơn hẳn chỉ nhìn nội dung món.
- **Với người dùng mới, các phương pháp gần như ngang nhau** (3–6%). Chênh lệch chỉ 1–2%, trong khi 300 người dùng thì 1% tương đương 3 người, và thứ tự xếp hạng còn thay đổi giữa các lần chạy. Vì vậy **không kết luận được** phương pháp nào tốt hơn cho người mới.
- **Vì sao vẫn dùng content cho 1–2 món đầu:** lý do mang tính thiết kế, không phải độ chính xác. Content-based giải thích được ("giống món bạn vừa xem"), gợi ý được món mới đăng, và không phụ thuộc vào việc người khác đã tương tác hay chưa.
- **Ngưỡng 3 món:** theo trung bình 15 lần chạy, từ 3 món hybrid bắt đầu nhỉnh hơn content. Mức chênh nhỏ, nên đây là lựa chọn hợp lý chứ không phải tối ưu tuyệt đối.
- **Trọng số 0,3/0,7:** đã thử 0,5/0,5, 0,3/0,7 và 0,2/0,8. CF có trọng số càng cao thì kết quả càng sát CF thuần. Vẫn giữ 30% content để gợi ý được món mới (CF không biết món chưa ai tương tác) và để có lý do gợi ý dễ hiểu. Đổi lại, HitRate thấp hơn CF thuần khoảng 2%.

> **Trung thực khi báo cáo:** tương tác là dữ liệu **mô phỏng** (`scripts/lib/simulation.js`). Mỗi người dùng ảo có 1–2 "gu" và hành xử nhất quán. Số liệu tuyệt đối phụ thuộc vào cách mô phỏng; điều đáng tin là **thứ tự so sánh** giữa các phương pháp. Bộ `ratings.csv` gốc của ViFoodRec **không được dùng**, vì điểm phân bố đều tuyệt đối trên mọi mức từ 0 đến 5, tức là điểm ngẫu nhiên.

## 9. Dữ liệu

- **Món ăn:** ViFoodRec (An Tran, Thanh Dang, Hong Dang, Tin Huynh, PACLIC 2024), gồm 5.289 món sau khi làm sạch và lọc trùng. Web chỉ nhập **1.187 món của monngonmoingay.com có ảnh**, vì máy chủ ảnh của cooky.vn (`image.cooky.vn`) không còn truy cập được, khiến khoảng 78% món của Cooky không có ảnh. Xem `data/vifoodrec/README.md`.
- **Người dùng:** 300 người dùng mô phỏng thuộc 10 nhóm gu: ăn chay, hải sản, nướng & lẩu, healthy, hảo ngọt, cơm nhà, thịt bò, món gà, đồ chiên, bún phở mì.

## 10. Câu hỏi thường gặp khi bảo vệ

- **Vì sao không dùng Matrix Factorization hay deep learning?** Dữ liệu nhỏ (vài trăm người dùng). Item-based CF đạt kết quả tốt, chạy nhanh và giải thích được từng gợi ý.
- **Hệ thống có chậm không?** Mô hình được dựng trong bộ nhớ khoảng 0,1 giây cho 1.187 món và tự dựng lại sau mỗi 10 phút. Mỗi lượt gợi ý mất dưới 30ms. Lịch sử của người dùng được đọc mới mỗi lần, nên vừa thả tim là gợi ý thay đổi ngay.
- **Món mới đăng có được gợi ý không?** Có, qua content-based (30% trong hybrid) và mục "món tương tự".
- **Xem thuật toán nào đang áp dụng cho mình?** Gọi `GET /api/recommendations/explain`.
