# Câu trả lời cho Play Console — App content

Câu trả lời đề xuất cho các mục **Policy → App content** của Task Manager (`com.taskmanager`),
dựa trên code ngày 13/10/2026 và [công bố Data safety của Google cho AdMob](https://developers.google.com/admob/android/privacy/play-data-disclosure).
Tên mục để nguyên tiếng Anh như trong Play Console. Bạn là người chịu trách nhiệm cuối cùng
về câu trả lời; nếu app thêm SDK hay tính năng gửi dữ liệu ra ngoài, phải sửa lại bảng này.

## Data safety

Định nghĩa của Play ([Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)):
*collect* = dữ liệu rời khỏi thiết bị; dữ liệu chỉ xử lý trên máy không phải khai. Dữ liệu
do SDK gửi đi vẫn phải khai.

### Data collection and security

| Câu hỏi | Trả lời | Lý do |
| --- | --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** | Google Mobile Ads SDK gửi dữ liệu ở bảng dưới |
| Is all of the user data collected by your app encrypted in transit? | **Yes** | Google: SDK mã hóa bằng TLS |
| Account creation | **My app does not allow users to create an account** | App không có tài khoản |
| Do you provide a way for users to request that their data is deleted? | **No** | App không giữ dữ liệu nào ở máy chủ; dữ liệu trên máy bị xóa khi gỡ app hoặc "Xóa toàn bộ dữ liệu"; dữ liệu Google thu thập do Google quản lý |

### Data types

Mỗi loại dưới đây: **Collected = Yes**, **Shared = Yes**, **Processed ephemerally = No**,
**Required** (người dùng không tắt riêng được, ngoài form đồng ý ở EEA/UK/CH và việc mua
"Bỏ quảng cáo"). Mục đích cho cả *collection* và *sharing*: **Advertising or marketing**,
**Analytics**, **Fraud prevention, security, and compliance**.

| Nhóm trong Play Console | Loại dữ liệu | Theo công bố của Google |
| --- | --- | --- |
| Location | Approximate location | Địa chỉ IP, dùng để ước tính vị trí gần đúng |
| App activity | App interactions | Mở app, chạm, xem video |
| App info and performance | Diagnostics | Hiệu năng app và SDK, như thời gian khởi động |
| Device or other IDs | Device or other IDs | Advertising ID, app set ID |

Không khai (không rời khỏi thiết bị):

- **Personal info, Messages, Files and docs, Calendar**: công việc, ghi chú, nhắc nhở chỉ nằm
  trong SQLite trên máy, không sao lưu đám mây (`allowBackup=false`).
- **Financial info → Purchase history**: Google Play xử lý thanh toán; app chỉ lưu trạng thái
  đã mua và bản ghi giao dịch trên máy (MMKV `chipmobilesdk.payment`), không gửi cho ai.
  Thông tin thẻ do Google thu thập trực tiếp, app không truy cập.
- **App info and performance → Crash logs**: nhật ký lỗi chỉ ở trên máy; không có crash
  reporting.

## Các mục khác trong App content

| Mục | Trả lời |
| --- | --- |
| Privacy policy | `https://operationd8979.github.io/task-manager/privacy/` |
| Ads | **Yes, my app contains ads** |
| App access | **All functionality is available without special access** |
| Advertising ID | **Yes**; mục đích: **Advertising or marketing**, **Analytics**, **Fraud prevention, security, and compliance** |
| Target audience and content | **18 and over**; app không hấp dẫn trẻ em (*Appeals to children: No*) |
| Content rating (IARC) | Category: **Utility, Productivity, Communication, or Other**. Bạo lực, tình dục, ngôn ngữ, chất kích thích, cờ bạc: **No**. Users interact or exchange content: **No**. Shares location with other users: **No**. Allows purchase of digital goods: **Yes**. Web browser or search engine: **No** |
| Government apps | **No** |
| Financial features | **My app doesn't provide any financial features** |
| Health | **My app does not have any health features** |
| News apps | **No** |

Quyền trong bản release (kiểm từ merged manifest ngày 13/10/2026): INTERNET,
ACCESS_NETWORK_STATE, AD_ID và ba quyền Privacy Sandbox (ACCESS_ADSERVICES_*), BILLING,
POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM, RECEIVE_BOOT_COMPLETED, VIBRATE, WAKE_LOCK,
FOREGROUND_SERVICE (không có foreground service type nào, nên không cần khai Foreground
service permissions), ACCESS_NOTIFICATION_POLICY.
