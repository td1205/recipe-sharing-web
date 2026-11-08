# Chỉnh sửa báo cáo qua Google Docs API

CLI độc lập: `scripts/google-docs.js`; không import ứng dụng, `.env` hoặc database.
Tài liệu mặc định: https://docs.google.com/document/d/1CqtYPpgz4YRuLC_JLZubXDEpGNOPLVLcEWQUqxxSMHw/edit

## Cấp quyền Desktop OAuth một lần

1. Trong Google Cloud project của bạn, bật **Google Docs API**. Cấu hình OAuth consent; thêm tài khoản vào Test users nếu ứng dụng ở chế độ Testing.
2. Tạo OAuth client loại **Desktop app**, tải JSON. Lưu tại `.local/google-docs/credentials.json` hoặc `~/.config/recipe-docs/credentials.json`. Có thể chỉ định đường dẫn khác bằng biến môi trường `GOOGLE_DOCS_CREDENTIALS`.
3. Chạy `npm run docs -- auth`, tự mở URL được in trong trình duyệt hệ thống và cấp quyền. CLI không điều khiển trình duyệt. Callback chỉ lắng nghe tại `127.0.0.1`, port ngẫu nhiên, kiểm tra state và PKCE; hết hạn sau 5 phút. Không gửi authorization code/token vào chat.

CLI yêu cầu đúng một scope `https://www.googleapis.com/auth/documents`; không yêu cầu Drive, Gmail hay thông tin hồ sơ. Scope này cần thiết cho đọc/sửa tài liệu có sẵn qua ID mà không dùng Google Picker. **Google không giới hạn scope này vào một tài liệu**: nó cho phép truy cập Google Docs trong quyền của tài khoản; CLI tự giới hạn vào document ID đã chọn. `drive.file` hẹp hơn theo từng file nhưng cần bước cấp quyền file qua Picker/app, không thể chỉ dán ID tài liệu cũ rồi mặc nhiên truy cập. Không yêu cầu thêm `documents.readonly` vì scope ghi đã bao gồm đọc.

Token lưu trong `.local/google-docs/token.json`, toàn bộ `.local/` được gitignore. Không commit client JSON, token, backup, plan hoặc bản đọc chứa dữ liệu cá nhân. Unix dùng mode 0600/0700; trên Windows hãy giữ thư mục trong profile riêng với ACL cá nhân (mode POSIX không thay thế ACL). Không đồng bộ token vào cloud công cộng. Token refresh được cập nhật cục bộ; nếu ứng dụng Testing bị hết hạn quyền, chạy lại auth. Muốn thu hồi quyền, dùng trang quản lý quyền tài khoản Google rồi xóa token cục bộ; không gửi token ra ngoài.

## Đọc và tìm trong từng mục

```powershell
npm run docs -- read --section "CHƯƠNG 1. TỔNG QUAN ĐỀ TÀI"
npm run docs -- read --section "CHƯƠNG 1. TỔNG QUAN ĐỀ TÀI" --out reads/chapter1.json
npm run docs -- search --section "3.2.1. Yêu cầu nghiệp vụ" --find "BR-09"
```

Tiêu đề phải khớp chính xác một heading có style HEADING_1…HEADING_6; kết thúc tại heading kế tiếp cùng cấp hoặc cấp cao hơn, bao gồm các tiểu mục và bảng bên trong. Không dùng dòng trong mục lục làm heading. Nếu tiêu đề lặp giữa các tab, thêm `--tab t.0`. Tiêu đề gõ tay chưa gán heading sẽ bị từ chối, không đoán phạm vi.

`documents.get` lấy cấu trúc tài liệu và tabs về bộ nhớ để xác định ranh giới, styles, revision và bảo vệ nội dung. Docs API không cung cấp truy vấn nội dung theo khoảng heading. **Chỉ phần đã chọn được in ra context**, không in toàn bộ tài liệu. `search` chỉ in đoạn ngữ cảnh quanh kết quả. `--out` lưu bản đọc cục bộ thay vì in văn bản.

## Xem trước, rồi mới ghi

```powershell
npm run docs -- replace --section "3.2.1. Yêu cầu nghiệp vụ" --find "văn bản cũ" --with "văn bản mới" --expect 1 --plan plans/change.json
npm run docs -- apply --plan plans/change.json --dry-run
# Chỉ chạy lệnh dưới khi đã duyệt plan và có yêu cầu sửa báo cáo:
npm run docs -- apply --plan plans/change.json
```

`replace` luôn dry-run. Plan được tạo mới bằng exclusive write, không ghi đè plan cũ; đổi tên cho lần mới. `--expect` phải bằng số kết quả đã duyệt. Chỉ `apply` không có `--dry-run` mới gửi batchUpdate. Có thể thêm `--document ID` cho tài liệu khác; apply bắt buộc khớp document ID trong plan. Không có thao tác thay toàn chương bằng plain text.

Để gom nhiều thay thế độc lập trong cùng mục, lưu JSON cục bộ dạng `[{"find":"cũ","with":"mới","expect":1}]`, rồi chạy `replace --section "tiêu đề" --changes changes.json --plan plans/batch.json`. Đường dẫn JSON tính từ `.local/google-docs/`. Batch tối đa 100 thay thế, từ chối các vùng chồng lấn; vẫn áp dụng đầy đủ kiểm tra chữ đỏ, từng text run, revision, sao lưu và hậu kiểm. Các bước `apply --dry-run` và `apply` giữ nguyên.

Trước ghi, CLI đọc lại source, so revision, tái lập plan và kiểm hash; sao lưu JSON rồi đọc lại xác nhận backup. Batch dùng `writeControl.requiredRevisionId`; revision đổi thì dừng, không tự merge/retry. Ghi lỗi/timeout phải đọc lại tài liệu trước quyết định; không gửi lại batch một cách mù quáng. Sau ghi, đọc lại và so fingerprint văn bản, styles và cấu trúc tất cả tab, bảng, hình, header/footer/footnote; lưu kết quả hậu kiểm. Khi hậu kiểm lệch, không tự rollback vì có thể ghi đè thay đổi của người khác.

### Bảo toàn định dạng và chữ đỏ

- Thay thế phải nằm trong **một text run**, không chứa newline/control character; giữ paragraph style và áp lại text style. Hỗ trợ text trong ô bảng; không xóa bảng/ảnh hoặc đổi số hàng/cột.
- Từ chối text màu có thành phần đỏ trội (kể cả đỏ sẫm/hồng), màu không giải được và đoạn có suggested edits. Kiểm tra cả style kế thừa từ named style. Không có cờ bỏ qua bảo vệ chữ đỏ.
- Không vượt qua ranh giới nhiều run, hyperlink/ảnh/đoạn; nếu cần chỉnh phức tạp, chia nhỏ yêu cầu. Hậu kiểm kiểm cả nội dung ngoài mục và chữ đỏ; bất kỳ lệch nào đều báo không xác minh thành công.
- Backup `.local/google-docs/backups/*.json` là **snapshot cấu trúc API**, có styles và tham chiếu hình nhưng không chứa binary ảnh, không phải bản Google Docs/PDF tự phục hồi hoàn chỉnh. Với chỉnh sửa quan trọng, nên giữ thêm bản sao native từ Google Docs trước đó; CLI không xin thêm quyền Drive để tự copy/export. Không có lệnh restore tự động.
- Hậu kiểm API không chứng minh bố cục PDF; sau chỉnh sửa nội dung dài vẫn cần xuất và kiểm tra PDF.

Google Docs có thể gộp text run và làm ký tự xuống dòng kế thừa font từ đoạn vừa thay. CLI ghi nhận và áp lại style cuối đoạn khi cần. Với batch cũ đã gặp sai lệch này, `repair-boundaries --backup backups/ten-backup.json --plan plans/repair.json` chỉ tạo dry-run phục hồi style của ký tự xuống dòng thuộc các đoạn đã sửa. Lệnh từ chối nếu mô phỏng không khôi phục đúng fingerprint toàn bộ tài liệu dự kiến, nếu số đoạn thay đổi hoặc nếu có chữ đỏ liên quan. Sau đó vẫn phải dùng `apply --dry-run` rồi `apply`; không tự rollback văn bản hay tái gửi batch cũ. Plan cũ không còn tái lập được sau nâng cấp validator phải được tạo lại, không sửa JSON plan để vượt kiểm tra.

## Kiểm tra công cụ

```powershell
npm run test:docs
node --check scripts/google-docs.js
```

Các test dùng cấu trúc fixture tổng hợp, không gọi Google API, không phải bằng chứng đã kết nối tài liệu thật. Không chạy `apply` để kiểm tra thiết lập. Mất credentials, chưa cấp OAuth, API chưa bật hoặc thiếu quyền tài liệu phải ghi rõ chưa đọc thành công.

## Nguồn kỹ thuật chính thức

- Google, [OAuth 2.0 for Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app).
- Google, [Choose Google Docs API scopes](https://developers.google.com/workspace/docs/api/auth).
- Google, [documents.batchUpdate và WriteControl](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/batchUpdate).
- Google, [Format text](https://developers.google.com/workspace/docs/api/how-tos/format-text).
- Google, [Work with tabs](https://developers.google.com/workspace/docs/api/how-tos/tabs).
