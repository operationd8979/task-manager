# Contract — Cổng nhắc nhở cục bộ

Tầng: `src/services/notifications/`. Notifee nằm **phía sau** cổng này, không được import
trực tiếp ở bất kỳ đâu khác. Lý do không phải để "dễ đổi thư viện" — mà vì FR-041 đòi phép
hòa giải phải cho **cùng kết quả khi chạy nhiều lần**, và tính chất đó chỉ kiểm thử được khi
cổng thay thế được bằng bản giả trong Jest.

## Định danh — phần dễ hỏng nhất

Mỗi nhắc nhở có một định danh **ổn định và tính được**, không sinh ngẫu nhiên và không lưu:

```
task:{taskId}
recurring:{ruleId}:{occurrenceDate}
```

Ví dụ: `recurring:rule-123:2026-08-10`.

Tính được từ dữ liệu nghĩa là hủy và đặt lại nhiều lần cho cùng một kết quả — đó chính là
tính idempotent mà FR-041 yêu cầu. Nếu định danh được sinh ngẫu nhiên rồi lưu lại, ta có một
nguồn sự thật thứ hai phải đồng bộ, và nó sẽ lệch.

**Mặt trái của tính ổn định đó**: định danh không đổi khi công việc đổi giờ hay đổi tông, nên
nó **không** đủ để nhận ra một thông báo đã lỗi thời. Xem phần hòa giải bên dưới.

## Hai tông, một cổng

FR-033a: mọi công việc chưa hoàn thành đều có thông báo, công tắc nhắc nhở chỉ chọn tông.

| Tông | Khi nào | `fireAt` | Kênh Android |
|---|---|---|---|
| `alert` | `reminderEnabled === true` | giờ bắt đầu **trừ** mốc nhắc | `task-reminders-alarm` — có chuông, rung, lặp âm, vượt Không làm phiền |
| `silent` | `reminderEnabled === false` | **đúng** giờ bắt đầu | `task-notices` — importance HIGH nên vẫn hiện nổi, không âm thanh, không rung, không vượt Không làm phiền |

Hai kênh chứ không phải một kênh với hai cấu hình: cấu hình kênh thuộc về người dùng, và một
kênh chung sẽ biến "tắt chuông cho thông báo thường" thành cùng một công tắc với "tắt chuông
cho nhắc nhở" trong cài đặt hệ thống (FR-033b).

Việc chọn tông nằm ở tầng domain (`notificationPlan`), không nằm ở adapter. Adapter chỉ dịch
tông thành cấu hình kênh — nhờ vậy quy tắc kiểm thử được mà không cần Notifee.

## Giao diện

```ts
type ReminderOffset = 0 | 5 | 10 | 15 | 30 | 60;
type ReminderTone = 'alert' | 'silent';

interface ReminderRequest {
  id: string;              // theo quy ước định danh ở trên
  title: string;           // tên công việc
  fireAt: Date;            // giờ địa phương, đã tính theo tông
  taskDate: LocalDate;     // để mở đúng ngày khi người dùng chạm (FR-043)
  startTime: LocalTime;    // giờ của công việc, để đưa vào nội dung (FR-035)
  tone: ReminderTone;      // FR-033a
  targetRef: TargetRef;    // để làm nổi đúng công việc
}

/** Thông báo hệ điều hành đang giữ. Đủ để so sánh, không chỉ để đếm. */
interface ScheduledReminder {
  id: string;
  fireAt: Date;
  tone: ReminderTone;
}

type TargetRef =
  | { kind: 'task'; taskId: string }
  | { kind: 'occurrence'; ruleId: string; date: LocalDate };

type PermissionState = 'granted' | 'denied' | 'not-determined';

interface ExactAlarmState {
  /** Nền tảng có đòi quyền riêng cho nhắc đúng thời điểm không? iOS: false. */
  required: boolean;
  granted: boolean;
}

interface ReminderScheduler {
  getNotificationPermission(): Promise<PermissionState>;
  requestNotificationPermission(): Promise<PermissionState>;

  getExactAlarmState(): Promise<ExactAlarmState>;
  requestExactAlarm(): Promise<ExactAlarmState>;
  openSystemSettings(target: 'notifications' | 'exact-alarm'): Promise<void>;

  /** Đăng ký thông báo, ghi đè lên bản cũ nếu đã có cùng định danh. */
  schedule(request: ReminderRequest): Promise<void>;
  cancel(id: string): Promise<void>;
  /** Các thông báo TƯƠNG LAI mà hệ điều hành đang giữ, kèm thời điểm và tông. */
  listScheduled(): Promise<readonly ScheduledReminder[]>;
}
```

## Quy tắc xin quyền

- Quyền hiện thông báo và quyền báo thức chính xác là **hai thứ khác nhau**, xin riêng.
- Quyền báo thức chính xác chỉ xin vào **lần đầu người dùng bật nhắc nhở** (FR-036a) — nó chỉ
  có ý nghĩa với tông `alert`.
- Quyền hiện thông báo xin vào **lần đầu bật nhắc nhở hoặc lần đầu lưu một công việc**, tùy
  cái nào đến trước (FR-036d). Từ FR-033a, việc lưu một công việc đã đủ để ứng dụng cần quyền
  này; nếu chỉ xin ở công tắc nhắc nhở thì người chưa từng bật nhắc nhở sẽ không bao giờ nhận
  được gì. Việc xin quyền **không được await** trong đường lưu — một hộp thoại quyền không
  được làm chậm thao tác lưu.
- Không xin gì lúc mở ứng dụng lần đầu. Xin quyền trước khi người dùng nói ra ý định bằng một
  hành động là cách chắc chắn nhất để bị từ chối.
- Từ chối **không bao giờ** chặn việc lưu công việc (FR-039). Ứng dụng làm được phần nó làm
  được và nói thật phần nó không đảm bảo.
- Thiếu quyền báo thức chính xác → **vẫn đặt** nhắc ở chế độ gần đúng, và giao diện phải cho
  biết nhắc có thể bị phát trễ (FR-036b). SC-008 đặt ngưỡng đo được cho cả hai đường: ±1 phút
  khi có quyền, ≤15 phút khi không.

## Đồng bộ với thay đổi của công việc

Bảng này là FR-037 viết lại thành thao tác trên cổng. Mọi đường ghi phải đi qua đúng nó:

| Thao tác | Gọi gì |
|---|---|
| Tạo công việc | `schedule`, tông theo FR-033a |
| Đổi giờ hoặc đổi ngày | `schedule` lại cùng id, `fireAt` mới |
| Đánh dấu hoàn thành | `cancel` |
| Chuyển hoàn thành → đang thực hiện | `schedule` nếu thời điểm phát còn ở tương lai |
| Xóa công việc | `cancel` |
| Tắt nhắc nhở | `schedule` lại cùng id, tông `silent`, `fireAt` = giờ bắt đầu |
| Bật nhắc nhở | `schedule` lại cùng id, tông `alert`, `fireAt` = giờ bắt đầu trừ mốc nhắc |
| Di chuyển một lần xuất hiện | `schedule` lại **chỉ cho buổi đó** |
| Xóa toàn bộ chuỗi | `cancel` mọi thông báo tương lai của chuỗi |
| Hoàn tác một thao tác xóa | Khôi phục thông báo về đúng trạng thái trước đó (FR-011a) |

Định danh không đổi khi công việc đổi giờ hay đổi tông, nên "đặt lại" ở đây là **ghi đè trên
cùng một id**, không phải `cancel` rồi `schedule`. Ghi đè giữ nguyên tính idempotent mà không
mở ra khoảnh khắc nào không có thông báo tồn tại. `cancel` chỉ dành cho các trường hợp thông
báo thực sự phải biến mất.

**Thời điểm phát đã ở quá khứ** → **không** đặt, và giao diện cảnh báo (FR-038). Áp dụng cho
cả hai tông: với `alert` là mốc nhắc, với `silent` là giờ bắt đầu. Không đặt lặng lẽ rồi để
hệ điều hành bắn ngay lập tức.

**Lỗi khi đặt nhắc KHÔNG được làm thao tác lưu công việc thất bại** (FR-044). Việc lưu và
việc đặt nhắc là hai giao dịch riêng: lưu trước, đặt sau, và lỗi ở bước sau được ghi vào nhật
ký cục bộ (FR-055a) rồi báo riêng cho người dùng.

## Cửa sổ đặt trước cho công việc lặp lại

Không đăng ký lịch lặp vô hạn với hệ điều hành (FR-040). Thay vào đó đặt trước cho **30 ngày**
tính từ thời điểm làm mới, và làm mới khi: ứng dụng mở, ứng dụng quay lại tiền cảnh, và quy
tắc lặp thay đổi.

Ba mươi ngày là con số của đặc tả. Nó đủ dài để người dùng bình thường không bao giờ chạm tới
mép, và đủ ngắn để số nhắc nhở đang giữ trong hệ điều hành không vượt trần của nền tảng.

## Hòa giải — phải idempotent

Chạy khi ứng dụng khởi động và khi quay lại tiền cảnh (FR-041, FR-042):

```
1. Tính tập thông báo MONG MUỐN trong cửa sổ 30 ngày,
   từ công việc + quy tắc lặp + điều chỉnh riêng.
2. Đọc tập ĐANG CÓ bằng listScheduled() — {id, fireAt, tone}.
3. cancel những id có mà không mong muốn.
4. schedule những cái mong muốn mà CHƯA CÓ, hoặc đang có nhưng
   LỆCH fireAt hoặc LỆCH tone.
5. Cái nào khớp cả ba trường thì KHÔNG chạm vào.
```

Bước 5 là thứ khiến phép hòa giải idempotent: chạy hai lần liên tiếp thì lần thứ hai không
gọi `schedule` hay `cancel` lần nào. Viết theo kiểu "hủy sạch rồi đặt lại toàn bộ" đơn giản
hơn nhưng sẽ tạo một khoảng trống trong đó không có thông báo nào tồn tại, và trên máy bị thu
hồi tiến trình giữa chừng thì khoảng trống đó là vĩnh viễn.

Bước 4 phải so **cả ba trường**, không chỉ định danh (FR-041a). Định danh được tính từ công
việc nên nó sống sót qua mọi lần sửa: dời một công việc từ 09:00 sang 11:00 không đổi
`task:{id}`. Phiên bản chỉ so định danh sẽ báo thông báo cũ là "đã đúng", không đặt lại lần
nào, và người dùng vẫn bị báo theo giờ họ đã bỏ đi — mãi mãi. Cùng lỗi đó khiến việc bật/tắt
nhắc nhở trên một công việc đã lưu không có tác dụng gì.

`listScheduled()` vì vậy phải trả về đủ dữ liệu để so, không chỉ danh sách định danh. Tông
được ghi vào `data` của thông báo lúc đặt và đọc lại từ đó. Thông báo do phiên bản cũ đặt
không có trường này; đọc thiếu tông thì hiểu là `alert`, vì phiên bản cũ chỉ từng đặt nhắc
nhở có chuông — nhờ vậy lần chạy đầu sau khi cập nhật không đặt lại toàn bộ nhắc nhở trên máy
một cách vô ích.

Phép hòa giải cũng là đường bảo đảm cho FR-042 (khôi phục sau khi thiết bị khởi động lại).
Bộ nhận boot của Android chỉ là cải thiện, không phải chỗ dựa — mức phủ khác nhau giữa các
nhà sản xuất và các chế độ tiết kiệm pin.

## Mở ứng dụng từ nhắc nhở

Chạm vào nhắc nhở → mở ứng dụng, điều hướng tới `taskDate`, làm nổi công việc theo `targetRef`
(FR-043).

Công việc đã bị xóa → mở timeline của **ngày hiện tại**, không hiển thị lỗi hệ thống. Đây là
trường hợp thường gặp chứ không phải hiếm: nhắc nhở đã bắn nằm lại trong khay thông báo sau
khi người dùng xóa công việc.

## Giới hạn đã biết — chế độ im lặng

Chuông của tông `alert` **không kêu** khi máy đang ở chế độ im lặng hoặc chỉ rung. Đây là giới
hạn của nền tảng, không phải thiếu sót của cấu hình:

- `bypassDnd: true` chỉ xử lý chế độ **Không làm phiền**. Chế độ im lặng là chuyện khác — hệ
  điều hành tắt cứng luồng âm thanh thông báo, và không có thuộc tính kênh nào mở lại được.
- Muốn kêu thì âm phải phát trên luồng **báo thức**, tức kênh phải được tạo với
  `AudioAttributes` USAGE_ALARM. Notifee không mở trường này ra JavaScript; phải tạo kênh ở
  tầng native với **cùng định danh** (`task-reminders-alarm`), rồi Notifee dùng lại kênh đã có.
  Đánh đổi: âm lượng đi theo thanh trượt Báo thức và kênh nằm trong nhóm "Báo thức" ở cài đặt
  hệ thống.
- Trên iOS chỉ Critical Alerts vượt được chế độ im lặng, và nó cần entitlement do Apple duyệt
  riêng. `critical: false` là giá trị đúng cho tới khi có entitlement đó.

Nằm ngoài phạm vi phiên bản đầu tiên; xem Out of Scope trong spec.
