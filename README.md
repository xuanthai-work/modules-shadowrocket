<h1 align="center">🚀 Shadowrocket Modules</h1>

<p align="center">
  <b>Tập hợp các module và script tùy chỉnh cho Shadowrocket.</b>
  <br>
  <i>Đã được refactor theo chuẩn engineering, kiểm thử offline, CI/CD tự động và bảo trì dài hạn.</i>
</p>

---

> [!CAUTION]
> **CẢNH BÁO BẢO MẬT VỀ MITM (Man-in-the-Middle):**
> Chứng chỉ CA của Shadowrocket cho phép giải mã toàn bộ lưu lượng HTTPS của các hostname được cấu hình.
> **Chỉ sử dụng các module/script từ nguồn bạn hoàn toàn tin tưởng và đã audit mã nguồn.**
> Tuyệt đối không cài đặt script từ các domain hoặc repository không rõ nguồn gốc.

---

## 📂 Danh sách Module

### 1. Stable Modules (`modules/stable/`)

| Module | Mô tả | Định dạng | Tệp cấu hình |
| ------ | ----- | --------- | ------------ |
| **YouTube BlockAd** | Hỗ trợ Picture-in-Picture (PiP), phát nền, chặn quảng cáo video | Protobuf | [`modules/stable/youtube.module`](modules/stable/youtube.module) |
| **Locket Gold** | Giả lập quyền truy cập Locket Gold qua RevenueCat | JSON | [`modules/stable/locket.module`](modules/stable/locket.module) |

### 2. Experimental Modules (`modules/experimental/`)

| Module | Mô tả | Giới hạn / Trạng thái | Tệp cấu hình |
| ------ | ----- | --------------------- | ------------ |
| **Spotify Premium** | Mở một số tính năng client-side (chuyển bài) | ⚠ Không hỗ trợ Extreme Audio (do mã hóa server-side) | [`modules/experimental/spotify.module`](modules/experimental/spotify.module) |
| **Super Duolingo** | Giả lập Super Duolingo | ⚠ Có thể bị chặn bởi TLS Pinning trên app mới | [`modules/experimental/duolingo.module`](modules/experimental/duolingo.module) |
| **SoundCloud Go+** | Mở một số tính năng giao diện | 🧪 Server-side audio stream chưa được xác thực | [`modules/experimental/soundcloud.module`](modules/experimental/soundcloud.module) |
| **Bilibili Ad Block** | Chặn quảng cáo, mở 1080P | 🧪 Phụ thuộc vào MagicJS; script protobuf ngoài đã comment out | [`modules/experimental/bilibili.module`](modules/experimental/bilibili.module) |

---

## 🚀 Hướng dẫn cài đặt vào Shadowrocket

### Cách 1: Sử dụng gói All-in-One (Tổng hợp các module Stable)
1. Trong Shadowrocket, mở **Cấu hình (Configuration)** -> **Mô-đun (Module)**.
2. Nhấn biểu tượng dấu `+` ở góc trên cùng.
3. Dán liên kết sau:
   ```text
   https://raw.githubusercontent.com/xuanthai-work/modules-shadowrocket/main/dist/all-in-one.module
   ```
4. Nhấn **Xác nhận (OK)** và kích hoạt module.

### Cách 2: Cài từng module riêng lẻ
Sao chép URL raw của tệp `.module` tương ứng từ thư mục `modules/stable/` hoặc `modules/experimental/` và thêm vào mục Module trong app.

---

## 🛠 Hướng dẫn phát triển & Build

Dự án yêu cầu môi trường **Node.js >= 18** (chỉ sử dụng các thư viện chuẩn tích hợp sẵn, không yêu cầu npm install).

### Các lệnh chính:

```bash
# 1. Kiểm tra tính hợp lệ của toàn bộ module
node tools/validate.js

# 2. Chạy bộ unit test offline (với mock runtime Shadowrocket)
node --test tests/unit/test-scripts.js

# 3. Build tệp all-in-one.module từ các module stable
node tools/build.js

# 4. Build với Base URL tùy chỉnh hoặc release tag
node tools/build.js --base-url https://raw.githubusercontent.com/<user>/<repo>/v1.0.0
```

---

## 📋 Ma trận tương thích & Phụ thuộc
* Xem chi tiết tại [COMPATIBILITY.md](COMPATIBILITY.md).
* Xem audit bảo mật các script ngoài tại [DEPENDENCIES.md](DEPENDENCIES.md).
* Đọc quy định đóng góp tại [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📄 Bản quyền
Phát hành theo giấy phép [MIT License](LICENSE).