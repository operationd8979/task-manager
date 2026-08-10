# Product Specification — Ứng dụng quản lý công việc theo Timeline

## 1. Tổng quan sản phẩm

### 1.1 Tên sản phẩm

Ứng dụng quản lý công việc theo Timeline.

### 1.2 Nền tảng

Ứng dụng mobile đa nền tảng được phát triển bằng React Native, hỗ trợ:

* Android.
* iOS.

### 1.3 Mục tiêu

Ứng dụng giúp người dùng:

* Lập kế hoạch công việc theo ngày và khung giờ.
* Theo dõi trạng thái thực hiện của từng công việc.
* Di chuyển công việc khi lịch trình thay đổi.
* Thiết lập các công việc lặp lại vào những ngày cố định trong tuần.
* Nhận thông báo khi đến thời gian thực hiện công việc.
* Sử dụng hoàn toàn offline, không cần đăng nhập hoặc kết nối backend.

### 1.4 Đối tượng người dùng

Người dùng cá nhân muốn quản lý công việc và lịch trình hằng ngày trên một thiết bị mobile.

---

# 2. Phạm vi phiên bản đầu tiên

## 2.1 Trong phạm vi

Phiên bản đầu tiên bao gồm:

* Tạo, xem, chỉnh sửa và xóa task.
* Hiển thị task theo timeline của từng ngày.
* Quản lý trạng thái task.
* Di chuyển task sang thời gian khác.
* Thiết lập task lặp lại theo các ngày trong tuần.
* Cho phép thay đổi riêng một lần xuất hiện của task lặp lại.
* Đặt local scheduled notification.
* Lưu toàn bộ dữ liệu trên thiết bị.
* Hoạt động không cần Internet.

## 2.2 Ngoài phạm vi

Phiên bản đầu tiên không bao gồm:

* Đăng nhập hoặc đăng ký tài khoản.
* Đồng bộ dữ liệu giữa nhiều thiết bị.
* Backup lên Google Drive hoặc dịch vụ cloud.
* Chia sẻ task với người khác.
* Web application.
* Quản lý team hoặc workspace.
* Chat, comment hoặc attachment.
* Push notification từ server.
* Realtime synchronization.
* Khôi phục dữ liệu sau khi gỡ ứng dụng.
* Import hoặc export Excel.
* Tích hợp Google Calendar hoặc Apple Calendar.

---

# 3. Khái niệm nghiệp vụ

## 3.1 Task thông thường

Task thông thường là công việc chỉ xuất hiện tại một ngày và một khoảng thời gian cụ thể.

Ví dụ:

```text
Ngày: 05/08/2026
Thời gian: 09:00–10:00
Tên: Review pull request
```

Khi người dùng di chuyển task này, thời gian của chính task sẽ được cập nhật.

## 3.2 Task cố định lặp lại

Task cố định là một lịch mẫu được lặp lại theo các ngày trong tuần.

Ví dụ:

```text
Tên: Daily exercise
Thời gian mặc định: 07:00–07:30
Lặp lại: Thứ Hai, Thứ Tư, Thứ Sáu
```

Task sẽ xuất hiện vào các ngày phù hợp với quy tắc lặp lại.

## 3.3 Lần xuất hiện của task lặp lại

Mỗi task lặp lại tạo ra các lần xuất hiện theo ngày.

Ví dụ:

```text
Recurring task:
Daily exercise, 07:00, thứ Hai và thứ Tư

Occurrences:
Thứ Hai 03/08 — 07:00
Thứ Tư 05/08 — 07:00
Thứ Hai 10/08 — 07:00
```

Khi người dùng di chuyển lần xuất hiện ngày 05/08 sang 08:00, chỉ lần xuất hiện đó thay đổi.

```text
Thứ Hai 03/08 — 07:00
Thứ Tư 05/08 — 08:00
Thứ Hai 10/08 — 07:00
```

Quy tắc lặp gốc vẫn giữ thời gian 07:00.

## 3.4 Override

Override là thay đổi chỉ áp dụng cho một lần xuất hiện cụ thể của task lặp lại.

Override có thể bao gồm:

* Thời gian bắt đầu khác.
* Thời gian kết thúc khác.
* Trạng thái khác.
* Tiêu đề hoặc nội dung khác.
* Đánh dấu lần xuất hiện đã bị bỏ qua.

---

# 4. Yêu cầu chức năng

## FR-001 — Hiển thị task theo timeline

Ứng dụng phải hiển thị danh sách task của ngày được chọn theo timeline.

Timeline phải:

* Sắp xếp task theo thời gian bắt đầu tăng dần.
* Hiển thị khung giờ của từng task.
* Hiển thị task thông thường và task lặp lại.
* Hiển thị trạng thái hiện tại của task.
* Phân biệt task lặp lại với task thông thường.
* Tự cập nhật khi task được tạo, sửa, xóa hoặc di chuyển.

Mỗi task item tối thiểu hiển thị:

* Tên task.
* Thời gian bắt đầu.
* Thời gian kết thúc hoặc thời lượng.
* Trạng thái.
* Dấu hiệu task lặp lại nếu có.
* Dấu hiệu notification nếu đã bật.

## FR-002 — Chuyển đổi ngày

Người dùng phải có thể:

* Xem ngày hiện tại.
* Chuyển sang ngày trước.
* Chuyển sang ngày sau.
* Chọn một ngày cụ thể từ lịch.
* Quay nhanh về ngày hôm nay.

Khi đổi ngày, timeline phải hiển thị dữ liệu tương ứng với ngày đã chọn.

## FR-003 — Tạo task

Người dùng phải có thể tạo task mới.

Thông tin tối thiểu:

* Tên task.
* Ngày thực hiện.
* Thời gian bắt đầu.

Thông tin tùy chọn:

* Thời gian kết thúc.
* Ghi chú.
* Trạng thái ban đầu.
* Notification.
* Quy tắc lặp lại.

Giá trị mặc định:

```text
Status: Processing
Repeat: Không lặp lại
Notification: Tắt
```

Không được tạo task khi:

* Tên task trống.
* Thời gian kết thúc sớm hơn hoặc bằng thời gian bắt đầu.
* Ngày hoặc giờ không hợp lệ.

## FR-004 — Chỉnh sửa task

Người dùng phải có thể chỉnh sửa:

* Tên task.
* Ghi chú.
* Ngày thực hiện.
* Thời gian bắt đầu.
* Thời gian kết thúc.
* Trạng thái.
* Notification.
* Quy tắc lặp lại.

Sau khi lưu, timeline và notification liên quan phải được cập nhật.

## FR-005 — Xóa task thông thường

Người dùng phải có thể xóa task thông thường.

Trước khi xóa, ứng dụng phải yêu cầu xác nhận.

Sau khi xóa:

* Task không còn xuất hiện trên timeline.
* Local notification liên quan phải bị hủy.
* Dữ liệu task phải bị xóa khỏi local database.

## FR-006 — Quản lý trạng thái task

Task hỗ trợ tối thiểu hai trạng thái:

```text
Processing
Done
```

Người dùng phải có thể chuyển nhanh trạng thái ngay trên timeline:

```text
Processing → Done
Done → Processing
```

Khi task ở trạng thái `Done`:

* Task vẫn xuất hiện trên timeline.
* Task phải có biểu hiện trực quan khác với task đang thực hiện.
* Notification chưa phát phải được hủy.
* Việc đánh dấu `Done` cho một lần xuất hiện không được làm các lần xuất hiện sau của task lặp lại thành `Done`.

## FR-007 — Di chuyển task thông thường

Người dùng phải có thể di chuyển task sang:

* Khung giờ khác trong cùng ngày.
* Một ngày khác.
* Khung giờ khác của ngày khác.

Có thể hỗ trợ một hoặc nhiều cách tương tác:

* Kéo và thả.
* Chọn chức năng “Di chuyển”.
* Chỉnh sửa ngày và thời gian trong form.

Sau khi di chuyển:

* Thời gian của task phải được cập nhật.
* Timeline phải cập nhật ngay.
* Notification phải được hủy và đăng ký lại theo thời gian mới.

## FR-008 — Thiết lập task lặp lại

Người dùng phải có thể đặt task lặp lại theo các ngày trong tuần.

Các ngày hỗ trợ:

* Thứ Hai.
* Thứ Ba.
* Thứ Tư.
* Thứ Năm.
* Thứ Sáu.
* Thứ Bảy.
* Chủ Nhật.

Người dùng có thể chọn một hoặc nhiều ngày.

Ví dụ:

```text
Lặp lại vào:
Thứ Hai, Thứ Tư, Thứ Sáu
```

Thông tin của quy tắc lặp lại gồm:

* Ngày bắt đầu áp dụng.
* Các ngày trong tuần.
* Thời gian bắt đầu mặc định.
* Thời gian kết thúc hoặc thời lượng mặc định.
* Ngày kết thúc lặp lại, nếu có.
* Notification mặc định.

Nếu không có ngày kết thúc, task tiếp tục lặp lại vô thời hạn.

## FR-009 — Di chuyển một lần xuất hiện của task lặp lại

Người dùng phải có thể di chuyển một lần xuất hiện cụ thể của task lặp lại.

Ví dụ:

```text
Lịch gốc:
Thứ Hai lúc 09:00

Riêng ngày 10/08:
Di chuyển sang 11:00
```

Kết quả:

* Ngày 10/08 hiển thị lúc 11:00.
* Các thứ Hai tiếp theo vẫn hiển thị lúc 09:00.
* Quy tắc lặp lại gốc không bị thay đổi.
* Hệ thống phải tạo một override cho ngày 10/08.

## FR-010 — Chỉnh sửa task lặp lại

Khi người dùng chỉnh sửa một task lặp lại, ứng dụng phải cho chọn phạm vi áp dụng:

```text
Chỉ lần này
Lần này và các lần sau
Toàn bộ chuỗi lặp lại
```

### Chỉ lần này

* Tạo hoặc cập nhật override.
* Không thay đổi recurring rule.

### Lần này và các lần sau

* Kết thúc recurring rule cũ trước ngày được chọn.
* Tạo recurring rule mới bắt đầu từ ngày được chọn.
* Các lần trước đó không thay đổi.

### Toàn bộ chuỗi lặp lại

* Cập nhật recurring rule gốc.
* Áp dụng cho tất cả lần xuất hiện chưa có override.
* Các override đã tạo phải được giữ lại, trừ khi người dùng chọn xóa override.

Với MVP, có thể giới hạn chỉ hỗ trợ:

```text
Chỉ lần này
Toàn bộ chuỗi lặp lại
```

`Lần này và các lần sau` có thể được triển khai ở phiên bản tiếp theo.

## FR-011 — Xóa task lặp lại

Khi xóa một lần xuất hiện của task lặp lại, ứng dụng phải cho chọn:

```text
Chỉ lần này
Toàn bộ chuỗi lặp lại
```

### Chỉ lần này

* Recurring rule vẫn tồn tại.
* Hệ thống tạo một override đánh dấu occurrence đó bị bỏ qua.
* Các lần sau vẫn xuất hiện.

### Toàn bộ chuỗi lặp lại

* Recurring rule bị xóa.
* Tất cả notification tương lai thuộc chuỗi phải bị hủy.
* Các lần xuất hiện tương lai không còn xuất hiện.

## FR-012 — Local scheduled notification

Người dùng phải có thể bật hoặc tắt nhắc nhở cho task.

Notification phải được đăng ký bằng cơ chế local notification của hệ điều hành.

Ứng dụng không được phụ thuộc vào:

* Backend.
* Google Cloud.
* Firebase Cloud Messaging.
* APNs server-side push.
* Kết nối Internet.

Notification phải có tối thiểu:

* Tên ứng dụng.
* Tên task.
* Thời gian task.
* Dữ liệu định danh task để mở đúng task khi người dùng chạm vào notification.

Ví dụ:

```text
Task sắp bắt đầu
Review pull request — 09:00
```

## FR-013 — Thời điểm notification

MVP hỗ trợ notification vào đúng thời gian bắt đầu task.

Có thể mở rộng sau với các lựa chọn:

* Đúng giờ.
* Trước 5 phút.
* Trước 10 phút.
* Trước 15 phút.
* Trước 30 phút.
* Trước 1 giờ.

Nếu notification time đã nằm trong quá khứ khi người dùng lưu task:

* Không đăng ký notification.
* Hiển thị cảnh báo cho người dùng.

## FR-014 — Xin quyền notification

Ứng dụng phải xin quyền gửi notification theo quy định của Android và iOS.

Nếu người dùng từ chối:

* Task vẫn được lưu.
* Ứng dụng không được crash.
* Hiển thị trạng thái notification đang bị vô hiệu hóa.
* Có hướng dẫn mở cài đặt hệ thống để cấp quyền lại.

## FR-015 — Đồng bộ notification với task

Hệ thống phải cập nhật notification khi task thay đổi.

| Thao tác                       | Xử lý notification                            |
| ------------------------------ | --------------------------------------------- |
| Tạo task có reminder           | Đăng ký notification                          |
| Đổi giờ task                   | Hủy notification cũ và đăng ký lại            |
| Đổi ngày task                  | Hủy notification cũ và đăng ký lại            |
| Đánh dấu Done                  | Hủy notification chưa phát                    |
| Chuyển Done về Processing      | Đăng ký lại nếu thời gian còn trong tương lai |
| Xóa task                       | Hủy notification                              |
| Tắt reminder                   | Hủy notification                              |
| Bật reminder                   | Đăng ký notification                          |
| Di chuyển recurring occurrence | Chỉ cập nhật notification của occurrence đó   |
| Xóa recurring series           | Hủy notification tương lai của series         |

## FR-016 — Mở task từ notification

Khi người dùng chạm vào notification:

* Ứng dụng phải được mở.
* Ứng dụng điều hướng đến ngày chứa task.
* Task tương ứng phải được làm nổi bật hoặc mở trang chi tiết.
* Nếu task đã bị xóa, ứng dụng mở timeline của ngày hiện tại và không được báo lỗi hệ thống.

## FR-017 — Lưu dữ liệu local

Toàn bộ dữ liệu phải được lưu trên thiết bị.

Dữ liệu tối thiểu gồm:

* Task.
* Recurring rule.
* Recurring override.
* Trạng thái task.
* Reminder configuration.
* App settings.

Ứng dụng phải đọc lại dữ liệu khi khởi động.

## FR-018 — Khôi phục notification sau khi ứng dụng khởi động

Khi ứng dụng được mở, hệ thống phải đối chiếu:

* Task trong local database.
* Notification đang được đăng ký với hệ điều hành.

Nếu phát hiện notification bị thiếu hoặc không còn đúng thời gian, ứng dụng phải đăng ký lại.

Trên Android, ứng dụng phải có cơ chế đăng ký lại notification sau khi thiết bị khởi động lại, nếu hệ điều hành xóa các alarm đã đăng ký.

## FR-019 — Hiển thị trạng thái rỗng

Khi ngày được chọn không có task, ứng dụng phải hiển thị trạng thái rỗng rõ ràng.

Ví dụ:

```text
Chưa có công việc nào trong ngày này.
```

Người dùng phải có thể tạo task trực tiếp từ trạng thái rỗng.

## FR-020 — Xử lý task quá hạn

Task được xem là quá hạn khi:

```text
Thời gian bắt đầu hoặc kết thúc đã qua
AND
Status != Done
```

Task quá hạn phải có dấu hiệu trực quan khác.

Ví dụ:

* Nhãn “Quá hạn”.
* Icon cảnh báo.
* Kiểu chữ hoặc nền khác.

Task quá hạn không tự động chuyển sang `Done`.

---

# 5. User stories

## US-001 — Xem lịch công việc hôm nay

Là người dùng, tôi muốn xem các task của hôm nay theo timeline để biết mình cần làm gì và vào thời gian nào.

### Acceptance criteria

* Mặc định ứng dụng mở ngày hôm nay.
* Các task được sắp xếp theo giờ bắt đầu.
* Task hoàn thành và đang xử lý được phân biệt rõ.
* Task lặp lại được hiển thị cùng task thông thường.

## US-002 — Tạo một task

Là người dùng, tôi muốn tạo một task tại một thời gian cụ thể để lập kế hoạch công việc.

### Acceptance criteria

* Người dùng nhập được tên, ngày và giờ.
* Task xuất hiện ngay trên timeline sau khi lưu.
* Task vẫn tồn tại sau khi đóng và mở lại app.
* Không thể lưu task với tên trống.

## US-003 — Đánh dấu hoàn thành

Là người dùng, tôi muốn đánh dấu task là Done trực tiếp trên danh sách để cập nhật nhanh tiến độ.

### Acceptance criteria

* Có thể thay đổi trạng thái mà không cần mở form chỉnh sửa.
* Trạng thái mới được lưu ngay.
* Task vẫn giữ trạng thái sau khi mở lại app.
* Notification chưa phát của task được hủy.

## US-004 — Di chuyển task

Là người dùng, tôi muốn chuyển task sang một khung giờ khác khi kế hoạch thay đổi.

### Acceptance criteria

* Có thể chọn ngày và giờ mới.
* Task biến mất khỏi vị trí cũ.
* Task xuất hiện tại vị trí mới.
* Reminder được cập nhật theo giờ mới.

## US-005 — Tạo task lặp lại

Là người dùng, tôi muốn đặt một task lặp vào một số ngày trong tuần để không phải tạo lại thủ công.

### Acceptance criteria

* Có thể chọn nhiều ngày trong tuần.
* Task xuất hiện đúng các ngày đã chọn.
* Các lần xuất hiện dùng thời gian mặc định của recurring rule.
* Dữ liệu lặp vẫn tồn tại sau khi mở lại app.

## US-006 — Di chuyển riêng một task lặp lại

Là người dùng, tôi muốn thay đổi giờ của một lần xuất hiện mà không ảnh hưởng lịch lặp trong tương lai.

### Acceptance criteria

* Người dùng chọn “Chỉ lần này”.
* Lần xuất hiện được di chuyển sang giờ mới.
* Các lần sau vẫn dùng giờ mặc định.
* Notification chỉ được thay đổi cho occurrence đã chọn.

## US-007 — Nhận nhắc nhở task

Là người dùng, tôi muốn nhận notification khi đến thời gian của task để không bỏ lỡ công việc.

### Acceptance criteria

* Notification xuất hiện vào thời điểm đã đặt.
* Notification hoạt động khi app không mở.
* Notification hoạt động khi không có Internet.
* Chạm notification mở đúng task.
* Task đã hoàn thành không tiếp tục phát notification.

---

# 6. Mô hình dữ liệu đề xuất

## 6.1 Task

```typescript
type TaskStatus = 'processing' | 'done';

interface Task {
  id: string;
  title: string;
  note?: string;

  taskDate: string;
  startTime: string;
  endTime?: string;

  status: TaskStatus;

  recurringRuleId?: string;
  occurrenceDate?: string;

  reminderEnabled: boolean;
  reminderOffsetMinutes: number;

  createdAt: string;
  updatedAt: string;
}
```

Đối với task thông thường:

```text
recurringRuleId = null
occurrenceDate = null
```

## 6.2 RecurringRule

```typescript
interface RecurringRule {
  id: string;

  title: string;
  note?: string;

  startDate: string;
  endDate?: string;

  daysOfWeek: number[];

  defaultStartTime: string;
  defaultEndTime?: string;

  reminderEnabled: boolean;
  reminderOffsetMinutes: number;

  createdAt: string;
  updatedAt: string;
}
```

Quy ước `daysOfWeek`:

```text
1 = Monday
2 = Tuesday
3 = Wednesday
4 = Thursday
5 = Friday
6 = Saturday
7 = Sunday
```

## 6.3 RecurringOverride

```typescript
interface RecurringOverride {
  id: string;
  recurringRuleId: string;
  occurrenceDate: string;

  overrideTitle?: string;
  overrideNote?: string;

  overrideStartTime?: string;
  overrideEndTime?: string;

  status?: TaskStatus;
  isSkipped: boolean;

  reminderEnabled?: boolean;
  reminderOffsetMinutes?: number;

  createdAt: string;
  updatedAt: string;
}
```

Khóa logic duy nhất:

```text
recurringRuleId + occurrenceDate
```

Mỗi recurring occurrence chỉ được có tối đa một override.

## 6.4 AppSetting

```typescript
interface AppSetting {
  key: string;
  value: string;
}
```

Ví dụ:

```text
defaultReminderOffset
timelineStartHour
timelineEndHour
firstDayOfWeek
```

---

# 7. Quy tắc sinh task lặp lại

Ứng dụng không cần tạo sẵn vô hạn các task trong database.

Khi hiển thị một ngày, hệ thống thực hiện:

```text
1. Lấy task thông thường của ngày.
2. Lấy recurring rules có hiệu lực trong ngày.
3. Kiểm tra ngày trong tuần có nằm trong daysOfWeek không.
4. Tạo occurrence tạm thời từ recurring rule.
5. Tìm override theo recurringRuleId + occurrenceDate.
6. Nếu override.isSkipped = true, không hiển thị.
7. Nếu có override khác, merge dữ liệu override vào occurrence.
8. Sắp xếp toàn bộ task theo thời gian.
```

Pseudo flow:

```typescript
const timelineTasks = [
  ...normalTasks,
  ...buildRecurringOccurrences(selectedDate),
].sort(compareByStartTime);
```

Cách này tránh lưu một lượng lớn occurrence trong database.

---

# 8. Chiến lược lưu trữ

## 8.1 Công nghệ đề xuất

Ứng dụng sử dụng local database nằm trong vùng lưu trữ riêng của app.

Khuyến nghị:

```text
SQLite
```

Có thể triển khai qua thư viện React Native tương thích với kiến trúc dự án.

Không nên dùng AsyncStorage làm nơi lưu toàn bộ dữ liệu task vì:

* Không phù hợp với dữ liệu có quan hệ.
* Khó query theo ngày.
* Khó quản lý recurring rules và overrides.
* Khó migration khi schema thay đổi.
* Không tối ưu khi số lượng task tăng.

AsyncStorage chỉ nên dùng cho setting nhỏ nếu cần.

## 8.2 Vòng đời dữ liệu

Dữ liệu phải:

* Tồn tại khi đóng app.
* Tồn tại khi force stop app.
* Tồn tại khi thiết bị khởi động lại.
* Tồn tại khi cập nhật phiên bản app.
* Bị mất khi người dùng gỡ ứng dụng.

Ứng dụng không cung cấp cloud backup trong phiên bản đầu tiên.

## 8.3 Backup hệ điều hành

Để đảm bảo yêu cầu “xóa app thì mất dữ liệu”, cần xem xét tắt cơ chế tự động backup/restore của hệ điều hành.

Nếu không tắt, Android hoặc iOS có thể khôi phục dữ liệu app sau khi cài lại tùy cấu hình thiết bị và tài khoản người dùng.

Yêu cầu:

* Android: không đưa local database vào Auto Backup, hoặc tắt backup cho dữ liệu task.
* iOS: đánh dấu local database không được backup lên iCloud nếu muốn dữ liệu thực sự chỉ tồn tại trên thiết bị.

---

# 9. Local notification

## 9.1 Nguyên tắc

Ứng dụng phải dùng local scheduled notification.

Notification được đăng ký ngay khi:

* Task được tạo.
* Task được chỉnh sửa.
* Recurring occurrence được tạo hoặc thay đổi.
* Ứng dụng khởi động và phát hiện notification bị thiếu.

Không sử dụng background loop để kiểm tra thời gian liên tục.

## 9.2 Notification identifier

Mỗi task hoặc occurrence phải có notification identifier ổn định.

Task thông thường:

```text
task:{taskId}
```

Recurring occurrence:

```text
recurring:{recurringRuleId}:{occurrenceDate}
```

Ví dụ:

```text
recurring:rule-123:2026-08-10
```

## 9.3 Recurring notification

Không nên đăng ký notification lặp vô hạn trực tiếp với hệ điều hành khi task có override.

Khuyến nghị đăng ký notification cho một khoảng thời gian giới hạn phía trước.

Ví dụ:

```text
Đăng ký notification cho 30 ngày tiếp theo.
```

Mỗi khi:

* App mở.
* App quay lại foreground.
* Recurring rule thay đổi.

Hệ thống sẽ:

```text
1. Hủy notification tương lai không còn hợp lệ.
2. Sinh occurrence trong 30 ngày tiếp theo.
3. Áp dụng override.
4. Đăng ký notification cần thiết.
```

## 9.4 Time zone

Task được hiểu theo múi giờ local của thiết bị.

Dữ liệu nên lưu:

* Ngày local dạng `YYYY-MM-DD`.
* Giờ local dạng `HH:mm`.
* Time zone ID tại thời điểm tạo nếu cần hỗ trợ thay đổi múi giờ sau này.

MVP có thể quy định:

> Khi người dùng đổi múi giờ thiết bị, task giữ nguyên giờ hiển thị theo giờ local.

Ví dụ task 09:00 vẫn là 09:00 tại múi giờ mới.

---

# 10. Yêu cầu phi chức năng

## NFR-001 — Offline-first

Toàn bộ chức năng cốt lõi phải hoạt động khi không có Internet.

Bao gồm:

* Xem task.
* Tạo task.
* Chỉnh sửa task.
* Xóa task.
* Đổi trạng thái.
* Di chuyển task.
* Task lặp lại.
* Local notification.

## NFR-002 — Persistence

Dữ liệu phải được ghi vào local database ngay sau mỗi thao tác thành công.

Không được chỉ giữ dữ liệu trong memory hoặc global state.

## NFR-003 — Data deletion

Khi người dùng gỡ ứng dụng, dữ liệu task phải bị xóa cùng vùng dữ liệu của ứng dụng.

Ứng dụng không được tự động khôi phục task từ cloud sau khi cài lại.

## NFR-004 — Hiệu năng

Mục tiêu ban đầu:

* Mở timeline của một ngày trong dưới 500 ms với tối đa 5.000 task.
* Thao tác đổi trạng thái phản hồi trên UI trong dưới 100 ms.
* Tạo hoặc cập nhật task phản hồi trên UI trong dưới 300 ms.
* Scroll timeline không bị giật đáng kể trên các thiết bị mục tiêu.

## NFR-005 — Độ tin cậy

* Không mất dữ liệu khi app bị đóng ngay sau khi lưu.
* Một thao tác không được tạo task trùng lặp.
* Reschedule notification phải có tính idempotent.
* Lỗi notification không được làm việc lưu task thất bại.
* Lỗi database phải được ghi log local và hiển thị thông báo phù hợp.

## NFR-006 — Khả năng migration

Database phải có schema version.

Khi cập nhật app:

* Migration phải giữ lại dữ liệu hiện có.
* Không được tự động xóa database khi schema thay đổi.
* Migration thất bại phải được xử lý an toàn.

## NFR-007 — Privacy

* Dữ liệu task không được gửi ra khỏi thiết bị.
* Không sử dụng analytics chứa title hoặc note của task.
* Không yêu cầu email, số điện thoại hoặc thông tin định danh.
* Không yêu cầu quyền không liên quan đến chức năng.

## NFR-008 — Accessibility

* Các action chính phải có accessibility label.
* Trạng thái không được chỉ phân biệt bằng màu sắc.
* Kích thước vùng chạm phải phù hợp với tiêu chuẩn mobile.
* Hỗ trợ font scaling ở mức hợp lý.
* Notification phải có nội dung dễ hiểu.

## NFR-009 — Cross-platform consistency

Android và iOS phải có cùng business behavior đối với:

* Task status.
* Recurrence.
* Override.
* Di chuyển task.
* Data persistence.
* Notification scheduling.

UI có thể khác nhẹ để phù hợp với convention của từng hệ điều hành.

## NFR-010 — Security

* Local database nằm trong app sandbox.
* Không lưu dữ liệu task vào thư mục public.
* Không yêu cầu quyền truy cập toàn bộ file của thiết bị.
* Không xuất task ra clipboard hoặc file ngoài app trừ khi có chức năng rõ ràng trong tương lai.

---

# 11. Danh sách màn hình

## SCR-001 — Timeline

Nội dung:

* Ngày đang chọn.
* Điều hướng ngày trước/ngày sau.
* Nút mở calendar.
* Danh sách task theo giờ.
* Checkbox hoặc status control.
* Nút tạo task.
* Empty state.
* Overdue state.

Thao tác:

* Chạm task để xem/chỉnh sửa.
* Chuyển trạng thái.
* Kéo hoặc chọn di chuyển.
* Chuyển ngày.

## SCR-002 — Tạo/chỉnh sửa task

Các field:

* Title.
* Note.
* Date.
* Start time.
* End time.
* Status.
* Repeat.
* Notification.
* Save.
* Delete khi chỉnh sửa.

## SCR-003 — Thiết lập lặp lại

Các field:

* Không lặp lại.
* Chọn ngày trong tuần.
* Ngày bắt đầu.
* Ngày kết thúc hoặc không giới hạn.
* Reminder mặc định.

## SCR-004 — Chọn phạm vi chỉnh sửa

Hiển thị khi thao tác với task lặp lại:

* Chỉ lần này.
* Toàn bộ chuỗi.
* Hủy.

Có thể bổ sung “Lần này và các lần sau” ở phiên bản sau.

## SCR-005 — Cài đặt

Nội dung MVP:

* Trạng thái quyền notification.
* Mở system settings.
* Thời gian reminder mặc định.
* Ngày bắt đầu tuần.
* Thông tin dữ liệu chỉ lưu trên thiết bị.
* Xóa toàn bộ dữ liệu.

---

# 12. Trạng thái màn hình

Timeline cần xử lý:

* Loading dữ liệu local.
* Có dữ liệu.
* Không có task.
* Lỗi đọc database.
* Task quá hạn.
* Task đang thực hiện.
* Task đã hoàn thành.
* Notification permission denied.

Form cần xử lý:

* Tạo mới.
* Chỉnh sửa.
* Đang lưu.
* Validation error.
* Lưu thất bại.
* Xóa và xác nhận xóa.
* Chọn phạm vi recurring action.

---

# 13. Các trường hợp biên

## EC-001 — Di chuyển task sang thời gian quá khứ

Ứng dụng cho phép lưu nhưng:

* Không đăng ký notification.
* Hiển thị task là quá hạn nếu chưa Done.

## EC-002 — Task không có end time

Task vẫn hợp lệ và hiển thị như một mốc thời gian.

## EC-003 — Hai task trùng thời gian

Ứng dụng cho phép nhiều task trùng hoặc chồng thời gian.

Timeline phải hiển thị được tất cả task mà không làm mất dữ liệu.

## EC-004 — Đổi ngày trong khi đang tạo task

Nếu form có dữ liệu chưa lưu, ứng dụng phải cảnh báo trước khi đóng form.

## EC-005 — Chỉnh recurring rule có override

Override hiện có phải được giữ lại.

Nếu override không còn nằm trong phạm vi rule mới, có thể:

* Giữ trong database nhưng không hiển thị.
* Hoặc xóa sau khi xác nhận.

MVP nên giữ lại để tránh mất dữ liệu.

## EC-006 — Task lặp lại có ngày bắt đầu giữa tuần

Chỉ sinh occurrence từ `startDate` trở đi.

## EC-007 — Ngày kết thúc recurring rule

Nếu `endDate` được đặt, occurrence tại `endDate` vẫn được sinh nếu đúng ngày trong tuần.

## EC-008 — Daylight saving time

Ứng dụng dùng giờ local và để hệ điều hành xử lý thay đổi DST.

Sau khi timezone hoặc DST thay đổi, app phải kiểm tra và đăng ký lại notification khi được mở.

## EC-009 — Người dùng tắt notification từ system settings

Task vẫn tồn tại.

Ứng dụng phải hiển thị reminder không thể hoạt động cho đến khi quyền được bật lại.

## EC-010 — Thiết bị reboot

Task vẫn tồn tại trong database.

Android phải đăng ký lại notification tương lai sau reboot hoặc khi app mở lại.

---

# 14. Permission matrix

Ứng dụng không có account và chỉ có một người dùng local.

| Chức năng            | Người dùng thiết bị |
| -------------------- | ------------------: |
| Xem task             |                  Có |
| Tạo task             |                  Có |
| Chỉnh sửa task       |                  Có |
| Xóa task             |                  Có |
| Đổi trạng thái       |                  Có |
| Tạo recurring task   |                  Có |
| Di chuyển occurrence |                  Có |
| Quản lý notification |                  Có |
| Xóa toàn bộ dữ liệu  |                  Có |

Không có role hoặc permission theo tài khoản.

---

# 15. Tiêu chí nghiệm thu tổng thể

Phiên bản MVP được xem là hoàn thành khi:

1. Người dùng có thể tạo task và thấy task trên timeline.
2. Task vẫn còn sau khi đóng và mở lại ứng dụng.
3. Người dùng có thể đổi trạng thái giữa Processing và Done.
4. Người dùng có thể di chuyển task sang ngày hoặc giờ khác.
5. Người dùng có thể tạo task lặp lại theo các ngày trong tuần.
6. Người dùng có thể di chuyển riêng một recurring occurrence.
7. Việc di chuyển riêng không làm thay đổi recurring rule trong tương lai.
8. Local notification xuất hiện khi đến thời gian task.
9. Notification được cập nhật khi task đổi lịch.
10. Notification được hủy khi task Done hoặc bị xóa.
11. Toàn bộ chức năng hoạt động khi không có Internet.
12. Ứng dụng không yêu cầu đăng nhập hoặc đăng ký.
13. Dữ liệu bị mất sau khi gỡ ứng dụng và không được tự động khôi phục từ cloud.
14. Android và iOS có cùng kết quả nghiệp vụ cho các chức năng cốt lõi.

---

# 16. Đề xuất kỹ thuật ban đầu

```text
Framework:
React Native

Storage:
SQLite local database

State:
Repository/service layer phía trên SQLite

Notification:
Local scheduled notification abstraction
- Android native scheduler
- iOS local notification scheduler

Date handling:
Local date + local time
Không phụ thuộc server clock

Architecture:
Presentation
→ Application/use cases
→ Domain
→ Local persistence and notification adapters
```

Các module chính:

```text
TaskRepository
RecurringRuleRepository
RecurringOverrideRepository
TimelineService
RecurrenceService
TaskNotificationService
TaskSchedulerReconciliationService
DatabaseMigrationService
```

Nguyên tắc:

* Database là source of truth.
* UI state không phải source of truth.
* Notification là dữ liệu dẫn xuất từ task.
* Notification có thể được tái tạo từ database.
* Recurring occurrence được sinh từ rule và override, không lưu vô hạn.
