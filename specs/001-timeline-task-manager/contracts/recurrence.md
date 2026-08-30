# Contract — Sinh lần xuất hiện và hợp nhất điều chỉnh riêng

Tầng: `src/domain/`. **Không import React, không chạm cơ sở dữ liệu.** Nhận dữ liệu đã đọc,
trả kết quả thuần — đó là điều kiện để kiểm thử toàn bộ quy tắc lặp mà không cần renderer
(Principle VIII) và không cần thiết bị.

Đây là hợp đồng quan trọng nhất của tính năng. Sai ở đây thì người dùng sửa một buổi lại đổi
cả chuỗi.

## Kiểu

```ts
type LocalDate = string;   // 'YYYY-MM-DD'
type LocalTime = string;   // 'HH:mm'
type Weekday = 1|2|3|4|5|6|7;   // 1 = Thứ Hai
type TaskStatus = 'processing' | 'done';

type RecurrenceFrequency = 'weekly' | 'monthlyByDay' | 'monthlyLastDay';

/** Giờ mà chuỗi TỪNG chạy, trước ngày `until` (loại trừ). */
interface TimeSegment {
  until: LocalDate;
  startTime: LocalTime;
  endTime: LocalTime | null;
}

interface RecurringRule {
  id: string;
  title: string;
  note: string | null;
  startDate: LocalDate;
  endDate: LocalDate | null;
  frequency: RecurrenceFrequency;
  daysOfWeek: readonly Weekday[];   // chỉ đọc khi frequency = 'weekly'
  daysOfMonth: readonly number[];   // chỉ đọc khi frequency = 'monthlyByDay'
  defaultStartTime: LocalTime;
  defaultEndTime: LocalTime | null;
  timeHistory: readonly TimeSegment[];
  reminderEnabled: boolean;
  reminderOffsetMinutes: ReminderOffset;
}

/**
 * Chỉ những trường THỰC SỰ bị ghi đè mới có mặt.
 * Vắng mặt = kế thừa từ quy tắc. Có mặt + null = buổi này cố ý không có giá trị đó.
 * Đây là lý do mọi trường ghi đè đều optional VÀ nullable — hai thứ khác nhau.
 */
interface RecurrenceOverride {
  ruleId: string;
  occurrenceDate: LocalDate;
  isSkipped: boolean;
  title?: string;
  note?: string | null;
  startTime?: LocalTime;
  endTime?: LocalTime | null;
  status?: TaskStatus;
  reminderEnabled?: boolean;
  reminderOffsetMinutes?: ReminderOffset;
}

interface Occurrence {
  ruleId: string;
  date: LocalDate;
  title: string;
  note: string | null;
  startTime: LocalTime;
  endTime: LocalTime | null;
  status: TaskStatus;
  reminderEnabled: boolean;
  reminderOffsetMinutes: ReminderOffset;
  /** Điều khiển nhãn "✎ ĐÃ CHỈNH RIÊNG" trên dòng. */
  hasOverride: boolean;
  /** Buổi bị bỏ qua ("chỉ lần này" khi xóa). Vẫn được sinh, nhưng vẽ mờ. */
  isSkipped: boolean;
}
```

## Hàm

```ts
/** Quy tắc này có sinh buổi vào ngày đó không? Chưa xét điều chỉnh riêng. */
function ruleOccursOn(rule: RecurringRule, date: LocalDate): boolean;

/**
 * Sinh các lần xuất hiện cho ĐÚNG MỘT ngày.
 * Buổi bị đánh dấu bỏ qua VẪN xuất hiện, mang `isSkipped: true` — dòng thời
 * gian vẽ nó mờ đi thay vì để lại một khoảng trống không giải thích được.
 * Bên đặt nhắc nhở phải tự lọc `isSkipped` trước khi lên lịch (FR-037).
 * Thứ tự trả về không đảm bảo — việc sắp xếp thuộc về tầng gọi.
 */
function buildOccurrences(
  rules: readonly RecurringRule[],
  overrides: readonly RecurrenceOverride[],
  date: LocalDate,
): Occurrence[];

/** Đếm số buổi trong một khoảng, phục vụ dòng "Ảnh hưởng N buổi" của S-05. */
function countOccurrences(
  rule: RecurringRule,
  from: LocalDate,
  to: LocalDate,
): number;
```

## Quy tắc `ruleOccursOn`

Áp dụng theo đúng thứ tự này:

1. `date < rule.startDate` → `false`. Không sinh buổi trước ngày bắt đầu (FR-024).
2. `rule.endDate ≠ null` và `date > rule.endDate` → `false`.
3. Theo `rule.frequency`:
   - `weekly` → thứ trong tuần của `date` phải nằm trong `rule.daysOfWeek`.
   - `monthlyByDay` → ngày trong tháng của `date` phải nằm trong `rule.daysOfMonth`.
   - `monthlyLastDay` → `date` phải là ngày cuối cùng của tháng chứa nó.
4. Ngược lại → `true`.

**`monthlyByDay` bỏ qua tháng thiếu ngày, không dồn.** Chuỗi vào ngày 31 không sinh buổi nào
trong tháng 2 (FR-020a). Bước 3 đã cho kết quả này miễn phí — không tháng nào có ngày 31 mà
lại thiếu — nên cái cần canh là đừng ai "sửa" nó thành dồn về ngày cuối tháng sau này. Dồn sẽ
đặt buổi vào một ngày người dùng không hề chọn; `monthlyLastDay` mới là kiểu dành cho ý đó.

**Ngày kết thúc là bao gồm.** Buổi rơi đúng vào `endDate` **vẫn được sinh** nếu ngày hôm đó
khớp mẫu lặp (FR-024). Đây là chỗ dễ viết nhầm thành `<` và lỗi chỉ lộ ra ở đúng một ngày
trong đời mỗi chuỗi.

**Kết thúc một chuỗi là đặt `endDate`, không phải xóa quy tắc** (FR-031b). Bước 2 vẫn cho
`true` với mọi ngày trước đó, nên lịch sử của người dùng còn nguyên trong khi tương lai đã
dừng.

`endDate = null` nghĩa là lặp vô thời hạn (FR-022) — bước 2 bị bỏ qua hoàn toàn, không thay
bằng một ngày xa nào cả.

## Quy tắc hợp nhất

Với mỗi quy tắc thỏa `ruleOccursOn`, tìm điều chỉnh riêng theo khóa `ruleId + occurrenceDate`:

Giá trị nền của `startTime`/`endTime` **không** phải `defaultStartTime`/`defaultEndTime` mà
là `timeOn(rule, date)` (xem dưới). Mọi trường còn lại lấy thẳng từ quy tắc.

| Trường hợp | Kết quả |
|---|---|
| Không có điều chỉnh riêng | Buổi lấy toàn bộ giá trị từ quy tắc, `hasOverride: false` |
| Có, `isSkipped: true` | Buổi **vẫn** được trả về với `isSkipped: true` (FR-027, "chỉ lần này" khi xóa); dòng vẽ mờ, không có nhắc nhở |
| Có, trường **vắng mặt** | Lấy giá trị từ quy tắc |
| Có, trường **có mặt** (kể cả `null`) | Lấy giá trị từ điều chỉnh riêng |

Kiểm tra sự có mặt bằng `'field' in override`, **không** bằng `override.field !== undefined`.
Hai cách này khác nhau khi giá trị được ghi tường minh là `undefined`, và cách thứ hai sẽ
lặng lẽ biến "buổi này cố ý không có giờ kết thúc" thành "kế thừa 10:00 từ quy tắc".

`hasOverride` là `true` khi có bản ghi điều chỉnh riêng **và** nó ghi đè ít nhất một trường
nội dung. Một điều chỉnh riêng chỉ chứa `status` (kết quả của thao tác tick) **không** bật
nhãn "✎ ĐÃ CHỈNH RIÊNG" — đánh dấu hoàn thành không phải là "chỉnh riêng" theo nghĩa người
dùng hiểu, và hiện nhãn đó sau mỗi lần tick sẽ làm nhãn mất hết ý nghĩa.

## `countOccurrences` và cửa sổ 365 ngày

Sheet chọn phạm vi hiển thị số buổi bị ảnh hưởng, vì con số là thứ khiến người dùng hiểu hậu
quả (FR-026b).

- Với chuỗi **có** `endDate`: đếm từ ngày đang thao tác tới `endDate`.
- Với chuỗi **không có** `endDate`: đếm trong **365 ngày** kể từ ngày đang thao tác, và giao
  diện **phải** nói rõ rằng các buổi sau mốc đó cũng bị ảnh hưởng (FR-026c). Trình bày con số
  đếm được như thể đó là toàn bộ là nói dối về một chuỗi vô hạn.

Hàm chỉ trả về số; việc chọn `to` và việc diễn đạt câu chữ thuộc tầng gọi.

**Phép đếm không bao giờ duyệt từng ngày.** Với `weekly` nó thuần số học: số tuần trọn vẹn
nhân với `daysOfWeek.length`, cộng phần dư ở hai đầu. Với hai kiểu theo tháng nó bước theo
**tháng**, nên cửa sổ 12 tháng tốn khoảng một tá vòng lặp chứ không phải 365. Duyệt 365 ngày
cho mỗi lần mở sheet là công việc vô ích trên JS thread ngay tại thời điểm người dùng đang
chờ (Principle VI).

## `timeOn` và `withTimeFrom` — lịch sử giờ của chuỗi

Sửa giờ của một chuỗi chỉ áp dụng từ hôm nay trở đi; buổi đã qua giữ nguyên giờ cũ (FR-030b).

- `timeOn(rule, date)` trả về mục **đầu tiên** trong `timeHistory` có `date < until`; không
  có mục nào khớp thì trả về `defaultStartTime`/`defaultEndTime`. `timeHistory` chỉ chứa giờ
  **quá khứ**, nên trường hợp phổ biến — chuỗi chưa từng sửa giờ, và mọi ngày từ lần sửa gần
  nhất trở đi — rơi thẳng vào giá trị mặc định mà không đọc danh sách.
- `withTimeFrom(rule, from, start, end)` trả về patch đặt giờ mới và ghi giờ cũ vào lịch sử
  với `until = from`. Hai phép nén giữ danh sách không phình: chuỗi không có buổi nào trước
  `from` thì bỏ luôn giờ cũ, và hai lần sửa trong cùng một ngày chỉ giữ giờ đã thực sự tới
  được một ngày quá khứ.

Ghi một điều chỉnh riêng cho từng ngày quá khứ là cách làm bị loại: chi phí của nó tăng theo
tuổi của chuỗi, và một chuỗi hằng ngày chạy một năm sẽ tốn 365 lượt ghi cho một lần sửa.

## Ràng buộc hiệu năng

- `buildOccurrences` **chỉ tính cho một ngày**. Không có API nào nhận khoảng ngày, vì tồn tại
  một API như vậy là lời mời để màn hình gọi nó khi cuộn (FR-023, SC-004).
- Tầng gọi dựng sẵn ngày liền trước và liền sau để việc chuyển ngày là tức thì; đó vẫn là ba
  lần gọi độc lập cho một ngày, không phải một lần gọi cho ba ngày.
- Hàm là thuần và không có trạng thái ẩn, nên tầng trên ghi nhớ kết quả được theo
  `(ngày, phiên bản dữ liệu)` mà không sợ lệch.

## Trường hợp biên phải có kiểm thử

| Trường hợp | Kỳ vọng |
|---|---|
| Quy tắc bắt đầu giữa tuần | Không có buổi nào trước `startDate` |
| Ngày xem trùng đúng `endDate` và thứ đó có lặp | Buổi **vẫn** được sinh |
| `endDate = null` | Buổi tiếp tục sinh ở ngày rất xa trong tương lai |
| Điều chỉnh riêng đặt `endTime` có mặt và `null` | Buổi không có giờ kết thúc, **không** kế thừa từ quy tắc |
| Điều chỉnh riêng vắng `endTime` | Buổi kế thừa `defaultEndTime` |
| `isSkipped: true` | Buổi có trong kết quả với `isSkipped: true`; `desiredReminders` không lên lịch cho nó |
| Điều chỉnh riêng chỉ có `status` | `hasOverride: false` — không hiện nhãn chỉnh riêng |
| Điều chỉnh riêng rơi ngoài phạm vi quy tắc sau khi sửa | Không sinh buổi, nhưng bản ghi **vẫn còn** trong dữ liệu |
| `daysOfWeek` rỗng | Không sinh buổi nào; tầng kiểm tra chặn trạng thái này trước khi lưu |
| `monthlyByDay` ngày 31, tháng 2 | Không sinh buổi nào — **không** dồn về ngày 28 |
| `monthlyByDay` chọn trùng một ngày hai lần | Đếm một lần, không phải hai |
| `monthlyLastDay` vào tháng 2 năm nhuận | Buổi rơi vào ngày 29, không phải 28 |
| Chuỗi bị kết thúc (`endDate` = hôm qua) | Ngày trước đó **vẫn** sinh buổi; hôm nay trở đi thì không |
| Sửa giờ chuỗi, xem một ngày quá khứ | Buổi giữ giờ cũ; buổi từ ngày sửa trở đi dùng giờ mới |
| Sửa giờ chuỗi hai lần | Mỗi ngày quá khứ lấy đúng giờ của thời kỳ nó thuộc về |
