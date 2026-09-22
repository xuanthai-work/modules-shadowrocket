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

Toàn bộ module hiện tại đều được xếp loại **`Experimental`** do đã vượt qua kiểm tra tĩnh (static validation) nhưng chưa được xác minh hoạt động thực tế trên thiết bị iOS / phiên bản Shadowrocket cụ thể:

| Module | Mô tả | Định dạng | Tệp cấu hình nguồn | Tệp cài đặt (Dist) |
| ------ | ----- | --------- | ------------------ | ------------------ |
| **YouTube BlockAd** | Hỗ trợ PiP, phát nền, chặn quảng cáo video | Protobuf | [`modules/experimental/youtube.module`](modules/experimental/youtube.module) | [Cài đặt (Raw)](https://raw.githubusercontent.com/xuanthai-work/modules-shadowrocket/main/dist/modules/youtube.module) |
| **Locket Gold** | Giả lập quyền truy cập Locket Gold | JSON | [`modules/experimental/locket.module`](modules/experimental/locket.module) | [Cài đặt (Raw)](https://raw.githubusercontent.com/xuanthai-work/modules-shadowrocket/main/dist/modules/locket.module) |
| **Spotify Premium** | Mở một số tính năng client-side (chuyển bài) | Protobuf | [`modules/experimental/spotify.module`](modules/experimental/spotify.module) | [Cài đặt (Raw)](https://raw.githubusercontent.com/xuanthai-work/modules-shadowrocket/main/dist/modules/spotify.module) |
| **Super Duolingo** | Giả lập Super Duolingo | JSON | [`modules/experimental/duolingo.module`](modules/experimental/duolingo.module) | [Cài đặt (Raw)](https://raw.githubusercontent.com/xuanthai-work/modules-shadowrocket/main/dist/modules/duolingo.module) |
| **SoundCloud Go+** | Mở một số tính năng giao diện | JSON | [`modules/experimental/soundcloud.module`](modules/experimental/soundcloud.module) | [Cài đặt (Raw)](https://raw.githubusercontent.com/xuanthai-work/modules-shadowrocket/main/dist/modules/soundcloud.module) |
| **Bilibili Ad Block** | Chặn quảng cáo, mở 1080P | JSON | [`modules/experimental/bilibili.module`](modules/experimental/bilibili.module) | [Cài đặt (Raw)](https://raw.githubusercontent.com/xuanthai-work/modules-shadowrocket/main/dist/modules/bilibili.module) |

> [!NOTE]
> Khi một module được người dùng/maintainer kiểm thử thực tế và xác nhận hoạt động ổn định trên iOS & Shadowrocket, module đó sẽ được chuyển vào `modules/stable/`.

---

## 🚀 Hướng dẫn cài đặt vào Shadowrocket

### Cách 1: Sử dụng gói All-in-One (Tổng hợp)
1. Trong Shadowrocket, mở **Cấu hình (Configuration)** -> **Mô-đun (Module)**.
2. Nhấn biểu tượng dấu `+` ở góc trên cùng.
3. Dán liên kết sau:
   ```text
   https://raw.githubusercontent.com/xuanthai-work/modules-shadowrocket/main/dist/all-in-one.module
   ```
4. Nhấn **Xác nhận (OK)** và kích hoạt module.

### Cách 2: Cài từng module riêng lẻ
Sao chép URL raw của tệp tương ứng từ thư mục phân phối **`dist/modules/`** (đã được build với `script-path` tuyệt đối) và dán vào mục Module của Shadowrocket.
*Không sử dụng trực tiếp tệp trong `modules/` vì các tệp nguồn sử dụng đường dẫn tương đối nội bộ.*

---

## 🛠 Hướng dẫn phát triển & Build

Dự án yêu cầu môi trường **Node.js >= 18** (chỉ sử dụng các thư viện chuẩn tích hợp sẵn, không yêu cầu npm install).

### Các lệnh chính:

```bash
# 1. Kiểm tra tính hợp lệ của toàn bộ module
node tools/validate.js

# 2. Chạy bộ unit test offline (với mock runtime Shadowrocket)
node --test tests/unit/test-scripts.js

# 3. Build tệp dist/ (bản phát hành hiện tại)
#    Đây là lệnh chuẩn tái tạo đúng dist/ đã commit và được CI kiểm tra.
#    Vì modules/stable/ hiện đang rỗng (giai đoạn pre-release), dist/all-in-one.module
#    được tạo bằng cách merge các module trong modules/experimental/ qua cờ này.
node tools/build.js --include-experimental

# (Mặc định, không có cờ) chỉ merge modules/stable/. Khi stable/ rỗng, lệnh này
# sẽ tạo một all-in-one.module rỗng có ghi chú rõ ràng thay vì bundle experimental.
node tools/build.js

# 4. Build với Base URL tùy chỉnh hoặc release tag (thêm --include-experimental để
#    tái tạo đúng bundle như dist/ đã commit)
node tools/build.js --include-experimental --base-url https://raw.githubusercontent.com/<user>/<repo>/v1.0.0
```

---

## 📋 Ma trận tương thích & Phụ thuộc
* Xem chi tiết tại [COMPATIBILITY.md](COMPATIBILITY.md).
* Xem audit bảo mật các script ngoài tại [DEPENDENCIES.md](DEPENDENCIES.md).
* Đọc quy định đóng góp tại [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📄 Bản quyền
Phát hành theo giấy phép [MIT License](LICENSE).