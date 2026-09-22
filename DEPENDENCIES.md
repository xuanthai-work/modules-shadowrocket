# External Dependencies

Tài liệu liệt kê tất cả các script và thư viện được tải từ bên ngoài hoặc nhúng trong repository.

## 1. Remote Script Dependencies (Từ repo ngoài)

| Script | URL | Owner | Mục đích | Trạng thái pin | Mức độ rủi ro | Xử lý |
| ------ | --- | ----- | -------- | -------------- | ------------- | ----- |
| `bilibili-proto.js` | `https://raw.githubusercontent.com/app2smile/rules/master/js/bilibili-proto.js` | `app2smile` | Lọc quảng cáo dạng protobuf trong Bilibili | ❌ Unpinned (`master`) | 🔴 Cao (Mã có thể thay đổi bất kỳ lúc nào, giải mã traffic người dùng) | Đã **comment out** mặc định trong `bilibili.module` |
| `bilibili_dynamic.js` | `https://raw.githubusercontent.com/yjqiang/surge_scripts/main/scripts/bilibili/bilibili_dynamic.js` | `yjqiang` | Lọc quảng cáo động thái Bilibili | ❌ Unpinned (`main`) | 🔴 Cao (Không kiểm soát được commit) | Đã **comment out** mặc định trong `bilibili.module` |

> [!WARNING]
> Không chạy các script trỏ trực tiếp đến nhánh `master` hoặc `main` của repository bên thứ ba khi bật MITM. Các script này có toàn quyền đọc/chỉnh sửa nội dung mạng của hostname được cấu hình.

## 2. Bundled / Embedded Libraries (Đã nhúng cục bộ)

| Thư viện | Tệp chứa | Phiên bản | Bản quyền | Ghi chú |
| -------- | -------- | --------- | --------- | ------- |
| Maasea YouTube scripts | `scripts/youtube/youtube.response.js`, `scripts/youtube/youtube.request.js` | commit `65075cd` (2026-07) | Apache-2.0 | **Vendored** từ [`Maasea/sgmodule`](https://github.com/Maasea/sgmodule) (Apache-2.0). Copy nguyên trạng, ghim commit hash, có header ghi nguồn/giấy phép ở đầu mỗi file. Không hotlink `master`. |
| `@bufbuild/protobuf` | `scripts/youtube/youtube.response.js`, `scripts/youtube/youtube.request.js` | v1.x runtime | Apache-2.0 | Đã bundle sẵn bên trong script YouTube của Maasea |
| `protobuf.js` | `scripts/spotify/spotify.js` | v6.x bundle | BSD-3-Clause | Đã bundle trong script Spotify |
| `MagicJS` | `scripts/bilibili/bilibili_json.js` | v2.2.3.3 | MIT | Thư viện shim đa nền tảng (Surge/Loon/QX/Node) nhúng ở cuối file |

> [!NOTE]
> **YouTube (Maasea) license decision**: `Maasea/sgmodule` phát hành theo **Apache-2.0**, cho phép sao chép & phân phối lại kèm chỉnh sửa nếu giữ attribution và ghi chú thay đổi (Apache-2.0 §4). Do đó hai script YouTube được **vendor cục bộ** thay vì hotlink, ghim ở commit `65075cdb388fc5e3094afd7e7314c67b243f3525` để tái lập được. Build system tự sinh URL raw GitHub tuyệt đối trong `dist/`.

## 3. Khuyến nghị & Nguyên tắc an toàn
* Tất cả script của module phải ưu tiên lưu trữ nội bộ (`scripts/`) hoặc trỏ đến bản release có gắn tag/commit hash cố định.
* Không tự ý copy mã nguồn từ repo ngoài nếu không có thông tin license rõ ràng.
