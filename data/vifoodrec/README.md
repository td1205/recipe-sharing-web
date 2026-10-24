# Dữ liệu món ăn ViFoodRec

`recipes.json.gz` gồm 5.289 công thức món Việt đã làm sạch. Nó được sinh từ dữ liệu thô của bộ **ViFoodRec**, thu thập từ cooky.vn và monngonmoingay.com.

- Bài báo: An Tran, Thanh Dang, Hong Dang, Tin Huynh, *A New Dataset and Empirical Evaluation for Vietnamese Food Recommendation System*, PACLIC 2024. https://aclanthology.org/2024.paclic-1.4
- Repo gốc: https://github.com/QuocAn55/DS300, thư mục `Data/Raw Dataset`.
- Bản quyền nội dung và hình ảnh thuộc các trang gốc. Chỉ dùng cho mục đích học tập và nghiên cứu, và cần trích dẫn bài báo trên.

## Cách tạo lại file

```bash
git clone https://github.com/QuocAn55/DS300.git
python scripts/data/prepare_vifoodrec.py "DS300/Data/Raw Dataset" data/vifoodrec/recipes.json.gz
```

Script chỉ dùng thư viện chuẩn của Python. Các bước xử lý:

1. Dùng bản **Raw**. Bản "Clean" bị lỗi thay chữ: có 1.846 chỗ "muỗnguỗng", "ml" bị thành "muỗngl"…
2. Tách nguyên liệu thành các trường tên, số lượng, đơn vị. Chữ viết tắt `2M` được đổi thành "2 muỗng canh", `1m` thành "1 muỗng cà phê".
3. Tách phần cách làm thành các bước. Với món của monngonmoingay, thêm bước "Sơ chế" và "Cách dùng", còn "Mách nhỏ" được đưa vào mô tả.
4. Suy ra danh mục từ tên món theo từ khóa: lẩu, canh, nướng, hấp, chiên, xào, kho, luộc, gỏi…
5. Gắn tag gồm: tag gốc của dataset, nhóm nguyên liệu chính (hải sản, cá, thịt bò, thịt gà…) và "món chay".
6. Loại 211 món trùng tên và 9 món thiếu dữ liệu.

**Vì sao web chỉ nhập món của monngonmoingay:** khi kiểm tra vào 10/2026, máy chủ ảnh `image.cooky.vn` không còn kết nối được. Lỗi vẫn xảy ra khi bỏ referer, nên đây không phải chặn hotlink. Ảnh của monngonmoingay.com thì tải được gần như 100%. Link ảnh được giữ nguyên cách mã hóa dấu gốc, vì một số tên file trên máy chủ dùng dạng Unicode NFD. Mặc định `scripts/import-vifoodrec.js` chỉ nhập 1.187 món monngonmoingay có ảnh. Dùng `--source all` để lấy cả món Cooky.

Bộ `ratings.csv` của ViFoodRec **không được dùng**. Điểm trong đó phân bố đều tuyệt đối trên 11 mức từ 0 đến 5 (khoảng 16.500 lượt mỗi mức), và độ lệch điểm trung bình giữa các món trùng với mức kỳ vọng của dữ liệu ngẫu nhiên. Vì vậy dữ liệu tương tác được sinh lại bằng `scripts/simulate-users.js`.
