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

## Giao diện

```ts
type ReminderOffset = 0 | 5 | 10 | 15 | 30 | 60;

interface ReminderRequest {
  id: string;              // theo quy ước định danh ở trên
  title: string;           // tên công việc
  fireAt: Date;            // giờ địa phương, đã trừ offset
  taskDate: LocalDate;     // để mở đúng ngày khi người dùng chạm (FR-043)
  targetRef: TargetRef;    // để làm nổi đúng công việc
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

  schedule(request: ReminderRequest): Promise<void>;
  cancel(id: string): Promise<void>;
  /** Danh sách nhắc nhở TƯƠNG LAI mà hệ điều hành đang giữ. */
  listScheduled(): Promise<readonly string[]>;
}
```

## Quy tắc xin quyền

- Quyền hiện thông báo và quyền báo thức chính xác là **hai thứ khác nhau**, xin riêng.
- Cả hai chỉ được xin vào **lần đầu người dùng bật nhắc nhở**, không phải lúc mở ứng dụng
  lần đầu (FR-036a). Xin quyền trước khi người dùng nói ra ý định là cách chắc chắn nhất để
  bị từ chối.
- Từ chối **không bao giờ** chặn việc lưu công việc (FR-039). Ứng dụng làm được phần nó làm
  được và nói thật phần nó không đảm bảo.
- Thiếu quyền báo thức chính xác → **vẫn đặt** nhắc ở chế độ gần đúng, và giao diện phải cho
  biết nhắc có thể bị phát trễ (FR-036b). SC-008 đặt ngưỡng đo được cho cả hai đường: ±1 phút
  khi có quyền, ≤15 phút khi không.

## Đồng bộ với thay đổi của công việc

Bảng này là FR-037 viết lại thành thao tác trên cổng. Mọi đường ghi phải đi qua đúng nó:

| Thao tác | Gọi gì |
|---|---|
| Tạo công việc có bật nhắc | `schedule` |
| Đổi giờ hoặc đổi ngày | `cancel(id cũ)` rồi `schedule(id mới)` |
| Đánh dấu hoàn thành | `cancel` |
| Chuyển hoàn thành → đang thực hiện | `schedule` nếu thời điểm nhắc còn ở tương lai |
| Xóa công việc | `cancel` |
| Tắt nhắc nhở | `cancel` |
| Bật nhắc nhở | `schedule` |
| Di chuyển một lần xuất hiện | `cancel` + `schedule` **chỉ cho buổi đó** |
| Xóa toàn bộ chuỗi | `cancel` mọi nhắc tương lai của chuỗi |
| Hoàn tác một thao tác xóa | Khôi phục nhắc nhở về đúng trạng thái trước đó (FR-011a) |

Với thao tác đổi giờ trên công việc thông thường, `taskId` không đổi nên định danh không đổi;
`cancel` + `schedule` cùng id là cách diễn đạt "đặt lại" mà vẫn idempotent.

**Thời điểm nhắc đã ở quá khứ** → **không** đặt, và giao diện cảnh báo (FR-038). Không đặt
lặng lẽ rồi để hệ điều hành bắn ngay lập tức.

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
1. Tính tập nhắc nhở MONG MUỐN trong cửa sổ 30 ngày,
   từ công việc + quy tắc lặp + điều chỉnh riêng.
2. Đọc tập ĐANG CÓ bằng listScheduled().
3. cancel những cái có mà không mong muốn.
4. schedule những cái mong muốn mà chưa có.
5. Cái nào ở cả hai tập thì KHÔNG chạm vào.
```

Bước 5 là thứ khiến phép hòa giải idempotent: chạy hai lần liên tiếp thì lần thứ hai không
gọi `schedule` hay `cancel` lần nào. Viết theo kiểu "hủy sạch rồi đặt lại toàn bộ" đơn giản
hơn nhưng sẽ tạo một khoảng trống trong đó không có nhắc nhở nào tồn tại, và trên máy bị thu
hồi tiến trình giữa chừng thì khoảng trống đó là vĩnh viễn.

Phép hòa giải cũng là đường bảo đảm cho FR-042 (khôi phục sau khi thiết bị khởi động lại).
Bộ nhận boot của Android chỉ là cải thiện, không phải chỗ dựa — mức phủ khác nhau giữa các
nhà sản xuất và các chế độ tiết kiệm pin.

## Mở ứng dụng từ nhắc nhở

Chạm vào nhắc nhở → mở ứng dụng, điều hướng tới `taskDate`, làm nổi công việc theo `targetRef`
(FR-043).

Công việc đã bị xóa → mở timeline của **ngày hiện tại**, không hiển thị lỗi hệ thống. Đây là
trường hợp thường gặp chứ không phải hiếm: nhắc nhở đã bắn nằm lại trong khay thông báo sau
khi người dùng xóa công việc.
