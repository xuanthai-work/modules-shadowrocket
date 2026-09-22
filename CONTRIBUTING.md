# Contributing Guidelines

Cảm ơn bạn đã quan tâm đóng góp cho dự án. Vui lòng đọc kỹ các quy tắc sau trước khi tạo Pull Request.

## 1. Nguyên tắc quan trọng

* **KHÔNG** thêm các module bypass mới cho các app bên ngoài phạm vi hiện tại nếu chưa thảo luận qua Issue.
* **KHÔNG** viết logic vô hiệu hóa certificate pinning, patch binary app, hoặc sử dụng Frida/jailbreak hooks.
* **KHÔNG** cố phá backend authorization, sửa database máy chủ hoặc bypass các cơ chế thanh toán server-side.
* **KHÔNG** đính kèm dữ liệu chứa tài khoản thật, token thực tế hoặc thông tin nhạy cảm vào code hay test fixtures.
* Nếu script cũ ngừng hoạt động do app đổi API/TLS pinning, hãy chuyển module sang `modules/experimental/` hoặc `modules/archived/` thay vì cố hack sâu vào app.

## 2. Cấu trúc thư mục

```
modules-shadowrocket/
├── modules/
│   ├── stable/            # Module đã test ổn định
│   ├── experimental/      # Module có giới hạn hoặc chưa xác thực
│   └── archived/          # Module đã ngừng hoạt động/deprecated
├── scripts/               # JavaScript thực thi trong môi trường Shadowrocket
│   ├── youtube/
│   ├── spotify/
│   └── ...
├── tests/
│   ├── fixtures/          # Dữ liệu mẫu giả lập (synthetic / scrubbed)
│   └── unit/              # Unit tests chạy offline
├── tools/
│   ├── build.js           # Build pipeline tạo dist/all-in-one.module
│   └── validate.js        # Kiểm tra cú pháp, format, dependencies
├── dist/                  # Tệp build sinh tự động (KHÔNG SỬA TAY)
└── .github/workflows/     # CI/CD tự động
```

## 3. Quy trình phát triển

1. **Chỉnh sửa/Thêm module**:
   * Định dạng module bắt buộc phải có đầy đủ metadata:
     ```ini
     #!name=Tên module
     #!desc=Mô tả chức năng
     #!author=Tên tác giả
     #!version=1.0.0
     #!last-tested=YYYY-MM-DD
     #!homepage=URL
     ```
   * Cấu hình `script-path` nội bộ sử dụng đường dẫn tương đối (ví dụ: `scripts/locket/locket.js`). Build tool sẽ tự động convert sang Base URL khi phát hành.

2. **Chạy Validator**:
   ```bash
   node tools/validate.js
   ```

3. **Chạy Test**:
   ```bash
   node --test tests/unit/test-scripts.js
   ```

4. **Build lại All-in-One**:
   ```bash
   node tools/build.js
   ```

5. **Cam kết Git**:
   Đảm bảo working tree sạch và file `dist/all-in-one.module` đã được cập nhật đồng bộ với các module stable.
