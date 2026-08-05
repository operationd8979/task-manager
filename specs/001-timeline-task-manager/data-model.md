# Phase 1 — Data model

Lưu trữ qua `@chipmobilesdk/rn-local-db`, phạm vi `{ kind: 'guest' }`, `schemaVersion: 1`.
Mọi thời gian là **giờ địa phương của thiết bị**, không phụ thuộc đồng hồ máy chủ.

Quy ước kiểu chuỗi dùng xuyên suốt:

| Tên | Dạng | Ví dụ |
|---|---|---|
| `LocalDate` | `YYYY-MM-DD` | `2026-08-03` |
| `LocalTime` | `HH:mm`, 24 giờ | `09:00` |
| `Weekday` | số 1–7, 1 = Thứ Hai | `1` |

Ngày và giờ lưu tách nhau, không lưu dấu thời gian tuyệt đối. Đó là điều kiện để đạt giả
định về múi giờ trong đặc tả: đổi múi giờ thiết bị thì công việc 09:00 vẫn là 09:00.

---

## 1. Bốn trạng thái giá trị — đọc trước khi thiết kế bất cứ thứ gì

Gói lưu trữ phân biệt bốn trạng thái, và tính năng này **dùng cả bốn**. Xử lý chỉ hai trạng
thái đầu sẽ tạo ra mất dữ liệu im lặng ở phần điều chỉnh riêng.

| Trạng thái | Nhìn thấy bằng | Nghĩa trong tính năng này |
|---|---|---|
| Bản ghi không tồn tại | `find` trả `null` | Chưa từng có điều chỉnh riêng cho buổi đó |
| Trường có mặt, giá trị `null` | `'endTime' in data` là `true`, giá trị `null` | Buổi này **cố ý** không có giờ kết thúc |
| Trường vắng mặt | `'endTime' in data` là `false` | Buổi này **kế thừa** giờ kết thúc từ quy tắc lặp |
| Bản ghi bị xóa mềm | Không xuất hiện trong đọc trừ khi `includeSoftDeleted` | Đã xóa, đang trong 5 giây hoàn tác |

Truy vấn phân biệt hai trạng thái giữa bằng toán tử `exists`. Một trường vắng mặt **không
thỏa mãn toán tử nào khác** — kể cả `ne`.

---

## 2. Collections

### 2.1 `tasks` — công việc thông thường

Chỉ chứa công việc độc lập. Lần xuất hiện của công việc lặp lại **không nằm ở đây** và không
bao giờ được ghi vào đây.

| Field | Type | Nullable | Ghi chú |
|---|---|---|---|
| `title` | string | không | Bắt buộc, không rỗng sau khi cắt khoảng trắng (FR-009) |
| `note` | string | có | |
| `taskDate` | string | không | `LocalDate` |
| `startTime` | string | không | `LocalTime` |
| `endTime` | string | có | `null` = chỉ là một mốc giờ (FR-002, edge case) |
| `status` | string | không | `'processing' | 'done'` (FR-014) |
| `reminderEnabled` | boolean | không | |
| `reminderOffsetMinutes` | number | không | Một trong `0, 5, 10, 15, 30, 60` (FR-036) |

`timestamps: true` — gói tự duy trì `createdAt`/`updatedAt`.
`softDelete: true` — **bắt buộc**, đây là cơ chế hoàn tác (R11).

**Indexes**

| Tên | Fields | Phục vụ |
|---|---|---|
| `tasks_by_date_start` | `taskDate`, `startTime` | Truy vấn chính của timeline, đã sắp sẵn theo giờ (FR-001, SC-004) |
| `tasks_by_reminder` | `reminderEnabled`, `taskDate` | Hòa giải lịch nhắc lúc khởi động (FR-041) |

Chỉ mục đầu là thứ giữ SC-004: một ngày được lấy bằng `eq` trên `taskDate`, và thứ tự giờ đến
từ chính chỉ mục nên không phải sắp lại trong JavaScript.

### 2.2 `recurring_rules` — quy tắc lặp

Không bao giờ hiện trực tiếp trên timeline. Người dùng chỉ chạm được vào nó thông qua một
buổi cụ thể.

| Field | Type | Nullable | Ghi chú |
|---|---|---|---|
| `title` | string | không | |
| `note` | string | có | |
| `startDate` | string | không | `LocalDate`, chỉ sinh buổi từ ngày này trở đi (FR-024) |
| `endDate` | string | có | `null` = lặp vô thời hạn (FR-022) |
| `daysOfWeek` | string | không | Các `Weekday` đã sắp, nối bằng dấu phẩy: `"1,3,5"` ¹ |
| `defaultStartTime` | string | không | `LocalTime` |
| `defaultEndTime` | string | có | |
| `reminderEnabled` | boolean | không | |
| `reminderOffsetMinutes` | number | không | |

¹ Lưu dạng chuỗi vì tập kiểu trường khai báo được của gói không có mảng, và chuỗi này chỉ cần
lọc bằng `eq`/`in` chứ không cần truy vấn theo từng phần tử. Miền giá trị hữu hạn (127 tổ
hợp) nên chuẩn hóa bằng cách sắp tăng dần trước khi ghi. Tầng miền phơi ra `Weekday[]`; việc
mã hóa nằm gọn trong tầng dữ liệu.

`timestamps: true`, `softDelete: true`.

**Indexes**

| Tên | Fields | Phục vụ |
|---|---|---|
| `rules_by_range` | `startDate`, `endDate` | Lọc quy tắc còn hiệu lực trong ngày đang xem |

### 2.3 `recurrence_overrides` — điều chỉnh riêng

Bản ghi mỏng đè lên **đúng một buổi**. Đây là collection dùng cả bốn trạng thái giá trị ở
mục 1 — mọi trường ghi đè đều **có thể vắng mặt**.

| Field | Type | Nullable | Ghi chú |
|---|---|---|---|
| `ruleId` | string | không | Khóa tới `recurring_rules` |
| `occurrenceDate` | string | không | `LocalDate` của buổi bị đè |
| `isSkipped` | boolean | không | `true` = buổi này bị bỏ qua (FR-031, "chỉ lần này") |
| `title` | string | **vắng mặt được** | Có mặt = ghi đè, vắng = kế thừa |
| `note` | string | **vắng mặt được** | Có mặt + `null` = buổi này cố ý không có ghi chú |
| `startTime` | string | **vắng mặt được** | |
| `endTime` | string | **vắng mặt được** | Có mặt + `null` = buổi này cố ý không có giờ kết thúc |
| `status` | string | **vắng mặt được** | Nơi lưu kết quả của thao tác tick (FR-026a) |
| `reminderEnabled` | boolean | **vắng mặt được** | |
| `reminderOffsetMinutes` | number | **vắng mặt được** | |

`timestamps: true`. **Không** `softDelete` — hoàn tác một thao tác trên buổi lặp là ghi đè
lại điều chỉnh riêng, không phải khôi phục bản ghi.

**Khóa logic duy nhất**: `ruleId + occurrenceDate` (FR-028). Gói không có ràng buộc duy nhất
tổ hợp, nên **định danh bản ghi tự mang khóa đó**: `id = "${ruleId}:${occurrenceDate}"`.
Cách này biến ràng buộc "tối đa một điều chỉnh riêng mỗi buổi" thành thứ **không thể vi phạm**
— `upsert` cùng id sẽ cập nhật đúng bản ghi đó thay vì tạo bản thứ hai. Đây là lựa chọn có
chủ đích thay cho việc kiểm tra trước khi ghi, vốn có khe hở giữa lúc kiểm và lúc ghi.

**Indexes**

| Tên | Fields | Phục vụ |
|---|---|---|
| `ovr_by_rule_date` | `ruleId`, `occurrenceDate` | Nạp điều chỉnh riêng của một ngày trong một truy vấn |
| `ovr_by_date` | `occurrenceDate` | Sinh buổi cho ngày đang xem không cần biết trước quy tắc nào |

### 2.4 `app_settings` — cài đặt

Cặp khóa–giá trị, `id` chính là khóa.

| Field | Type | Nullable |
|---|---|---|
| `value` | string | không |

Khóa dùng trong phiên bản đầu:

| Khóa | Miền giá trị | Mặc định | Requirement |
|---|---|---|---|
| `countdownMinutes` | `5|10|15|30|60` | `5` | FR-052a |
| `firstDayOfWeek` | `1` (Thứ Hai) hoặc `7` (Chủ Nhật) | `1` | FR-052 |
| `displayMode` | `auto|light|dark` | `auto` | FR-052b |

Không `softDelete`, không `timestamps`.

`countdownMinutes` là cửa sổ đếm ngược **toàn ứng dụng**, không phải mốc nhắc nhở. Nó áp
dụng cho mọi công việc trên dòng thời gian, kể cả công việc không bật nhắc nhở, và không
ảnh hưởng đến thông báo nào. Mốc nhắc nhở được chọn **chỉ** ở màn hình tạo công việc và
lưu trên chính bản ghi công việc (`reminderOffsetMinutes`).

Khóa cũ `defaultReminderOffset` không còn được đọc. Nó cho phép giá trị `0`, còn cửa sổ
đếm ngược thì không — dùng lại khóa đó sẽ lặng lẽ tắt đếm ngược của người đang nâng cấp.

### 2.5 `error_log` — nhật ký lỗi cục bộ

| Field | Type | Nullable | Ghi chú |
|---|---|---|---|
| `at` | timestamp | không | |
| `code` | string | không | Mã ổn định, **không bao giờ** là message đã parse |
| `operation` | string | không | Ví dụ `'timeline.load'`, `'reminder.schedule'` |
| `recordId` | string | có | Định danh, không phải nội dung |

**Cấm tuyệt đối**: tên hoặc ghi chú công việc (FR-055b). Ràng buộc này được thực thi bằng
kiểu — hàm ghi log nhận mã và định danh, không nhận đối tượng công việc.

Giới hạn cứng **500 bản ghi**, cắt bớt cũ nhất khi ghi. `timestamps: true`.

**Index**: `log_by_at` trên `at`, phục vụ cả việc cắt bớt lẫn việc đọc khi chẩn đoán.

---

## 3. Lần xuất hiện — dữ liệu dẫn xuất, không lưu

`Occurrence` là thứ người dùng nhìn thấy trên timeline và tưởng là "công việc", nhưng **nó
không phải một bản ghi** (FR-023). Nó được tính khi vẽ đúng ngày đang xem.

```
Occurrence = merge(RecurringRule, RecurrenceOverride?) tại một LocalDate
```

Kiểu hợp nhất mà giao diện nhận:

```ts
type TimelineItem =
  | { kind: 'task';       taskId: string;                    /* …trường hiển thị */ }
  | { kind: 'occurrence'; ruleId: string; date: LocalDate;
      hasOverride: boolean;  /* điều khiển nhãn "✎ ĐÃ CHỈNH RIÊNG" */ };
```

Giao diện **phải** phân biệt được hai nhánh này, vì chúng có luồng ghi khác nhau: sửa một
`task` không bao giờ hỏi phạm vi; sửa một `occurrence` thì có (FR-026), trừ khi chỉ đổi trạng
thái (FR-026a).

Quy tắc hợp nhất đầy đủ, kèm thứ tự và các trường hợp biên, nằm ở
[contracts/recurrence.md](./contracts/recurrence.md).

---

## 4. Chuyển trạng thái

### Công việc và lần xuất hiện

```
processing ──tick──> done
    ^                  │
    └──────tick────────┘
```

- Chuyển hai chiều, thực hiện ngay trên timeline, ghi ngay (FR-015, FR-046).
- Với một lần xuất hiện, trạng thái ghi vào `status` của điều chỉnh riêng — **không hỏi phạm
  vi** (FR-026a) và **không ảnh hưởng buổi khác** (FR-032).
- Chuyển sang `done` hủy nhắc nhở chưa phát; chuyển ngược lại đặt lại nếu thời điểm nhắc còn
  ở tương lai (FR-037).
- **Quá hạn không phải một trạng thái lưu trữ.** Nó được tính khi hiển thị:
  `startTime đã qua AND status ≠ done` (FR-017). Lưu nó xuống sẽ tạo ra dữ liệu phải cập nhật
  theo đồng hồ, và sẽ sai ngay khi người dùng đổi múi giờ.

### Vòng đời xóa (cơ chế hoàn tác — R11)

```
tồn tại ──xóa──> xóa mềm ──hoàn tác (≤5s)──> tồn tại
                    │
                    ├──hết 5 giây──> xóa cứng
                    └──mở lại app──> xóa cứng (lượt quét khởi động)
```

Lượt quét lúc khởi động là thứ khiến "đóng ứng dụng trong lúc hoàn tác còn hiệu lực" trở
thành xóa vĩnh viễn, đúng như edge case đã chốt trong đặc tả.

---

## 5. Quy tắc kiểm tra dữ liệu

Đây là các quy tắc **miền**, kiểm thử được không cần renderer (Principle VIII). Kiểm tra ở
giao diện chỉ là tiện lợi cho người dùng, không phải nơi thực thi.

| Quy tắc | Áp dụng cho | Requirement |
|---|---|---|
| Tên sau khi cắt khoảng trắng không được rỗng | task, rule | FR-009 |
| `endTime > startTime` khi `endTime` có mặt và khác `null` | task, rule, override | FR-009 |
| `reminderOffsetMinutes` ∈ `{0,5,10,15,30,60}` | task, rule, override | FR-036 |
| `daysOfWeek` không rỗng khi quy tắc đang bật lặp | rule | S-04 trạng thái lỗi |
| `endDate ≥ startDate` khi `endDate` khác `null` | rule | S-04 trạng thái lỗi |
| `status` ∈ `{processing, done}` | task, override | FR-014 |
| `displayMode` ∈ `{auto, light, dark}` | settings | FR-052b |

---

## 6. Quan hệ và toàn vẹn

```
recurring_rules 1 ──── n recurrence_overrides
      │                        (id = "${ruleId}:${occurrenceDate}")
      └── sinh ra ──> Occurrence (dẫn xuất, không lưu)

tasks  (độc lập, không quan hệ với gì)
```

Gói lưu trữ không có khóa ngoại, nên toàn vẹn tham chiếu do tầng miền giữ:

- Xóa một quy tắc lặp (FR-031, "toàn bộ chuỗi") **phải** xóa mọi điều chỉnh riêng của nó
  trong **cùng một transaction**. Xóa riêng lẻ sẽ để lại điều chỉnh riêng mồ côi — chúng
  không hiện lên đâu cả nhưng vẫn chiếm chỗ và sẽ làm nhiễu mọi lần đếm về sau.
- Sửa quy tắc lặp làm thu hẹp phạm vi ngày **giữ nguyên** các điều chỉnh riêng rơi ra ngoài
  phạm vi mới (edge case đã chốt trong đặc tả: giữ trong dữ liệu, không hiển thị). Đây là
  lựa chọn có chủ đích để tránh mất dữ liệu khi người dùng mở lại phạm vi.

---

## 7. Migration

`schemaVersion: 1` với **một migration version 1 rỗng**.

Không phải thừa: gói yêu cầu chuỗi migration **liên tục từ 1** tới `schemaVersion`, và "không
có migration nào" bị coi là một lỗ hổng trong chuỗi chứ không phải "không có gì để migrate".
Mở cơ sở dữ liệu mà thiếu nó sẽ ném `MIGRATION_CONFIG_INVALID` — và triệu chứng duy nhất
người dùng thấy là màn hình "Chưa đọc được dữ liệu", không mã, không tên trường.

Ràng buộc này được khoá bằng kiểm thử ở `src/services/db/__tests__/schema.test.ts`.

Ba ràng buộc ghi lại để phiên bản sau khỏi phải suy luận:

1. Gói chạy toàn bộ validate **trước khi ghi bất cứ thứ gì** — chuỗi migration đứt hay chỉ
   mục trỏ vào trường chưa khai báo đều báo lỗi trước khi chạm vào file.
2. Migration thất bại phải để dữ liệu hiện có nguyên vẹn và hiển thị được cho người dùng một
   thông báo có hành động (FR-048, FR-055). Không được rơi vào màn hình trắng.
3. Mỗi lần tăng `schemaVersion` phải kèm đúng một migration mang số đó. Bỏ qua một số là
   lỗi lúc mở, không phải lúc chạy migration.
