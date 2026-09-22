# External Dependencies

Tài liệu liệt kê tất cả các script và thư viện được tải từ bên ngoài hoặc nhúng trong repository.

## 1. Remote Script Dependencies (Từ repo ngoài)

| Script | URL | Owner | Mục đích | Trạng thái pin | Mức độ rủi ro | Xử lý |
| ------ | --- | ----- | -------- | -------------- | ------------- | ----- |
| `bilibili-proto.js` | `https://raw.githubusercontent.com/app2smile/rules/master/js/bilibili-proto.js` | `app2smile` | Lọc quảng cáo dạng protobuf trong Bilibili | ❌ Unpinned (`master`) | 🔴 Cao (Mã có thể thay đổi bất kỳ lúc nào, giải mã traffic người dùng) | Đã **comment out** mặc định trong `bilibili.module` |
| `bilibili_dynamic.js` | `https://raw.githubusercontent.com/yjqiang/surge_scripts/main/scripts/bilibili/bilibili_dynamic.js` | `yjqiang` | Lọc quảng cáo động thái Bilibili | ❌ Unpinned (`main`) | 🔴 Cao (Không kiểm soát được commit) | Đã **comment out** mặc định trong `bilibili.module` |
| `youtube.response.js` | `https://raw.githubusercontent.com/duyvinh09/Module_IOS/34865755c1aee7ba770c1afa364254d8924cfd85/js/youtube.response.js` | `duyvinh09` | YouTube protobuf response/request (ads, PiP, background) | ✅ Pinned commit `34865755` (2025-05-20) | 🟠 Trung bình (đã ghim commit, nhưng script đọc/sửa body MITM) | **Không vendor.** Repo nguồn không có LICENSE. Cả `youtube.request` và `youtube.response` trỏ cùng URL này |

> [!WARNING]
> Không chạy các script trỏ trực tiếp đến nhánh `master` hoặc `main` của repository bên thứ ba khi bật MITM. Các script này có toàn quyền đọc/chỉnh sửa nội dung mạng của hostname được cấu hình.

## 2. Bundled / Embedded Libraries (Đã nhúng cục bộ)

| Thư viện | Tệp chứa | Phiên bản | Bản quyền | Ghi chú |
| -------- | -------- | --------- | --------- | ------- |
| `protobuf.js` | `scripts/spotify/spotify.js` | v6.x bundle | BSD-3-Clause | Đã bundle trong script Spotify |
| `MagicJS` | `scripts/bilibili/bilibili_json.js` | v2.2.3.3 | MIT | Thư viện shim đa nền tảng (Surge/Loon/QX/Node) nhúng ở cuối file |

> [!NOTE]
> **YouTube (duyvinh09) license decision**: [`duyvinh09/Module_IOS`](https://github.com/duyvinh09/Module_IOS) không có file LICENSE và README không nêu giấy phép (GitHub API: license not found). Script cũng không chứa header bản quyền. Vì vậy **không copy** `js/youtube.response.js` vào `scripts/youtube/`. Module trỏ external URL đã ghim commit `34865755c1aee7ba770c1afa364254d8924cfd85`. Bản Maasea từng vendor trước đó đã được gỡ.

## 3. Khuyến nghị & Nguyên tắc an toàn
* Tất cả script của module phải ưu tiên lưu trữ nội bộ (`scripts/`) hoặc trỏ đến bản release có gắn tag/commit hash cố định.
* Không tự ý copy mã nguồn từ repo ngoài nếu không có thông tin license rõ ràng.
