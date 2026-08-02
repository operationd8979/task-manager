# Contract — Cổng lưu trữ

Tầng: `src/services/db/`. `@chipmobilesdk/rn-local-db` nằm **phía sau** cổng này. Tầng miền
nhận và trả kiểu miền, không bao giờ thấy `StoredRecord`, `StorageError` hay bất kỳ kiểu nào
của gói.

Cấu trúc bảng, chỉ mục và ngữ nghĩa bốn trạng thái giá trị nằm ở
[data-model.md](../data-model.md). File này chỉ định nghĩa **phép toán**.

## Mở và vòng đời

```ts
interface DatabaseGateway {
  open(): Promise<void>;     // gọi đúng một lần, trong composition root
  close(): Promise<void>;
  /** Xóa toàn bộ dữ liệu trong phạm vi — FR-054. Xóa thật, không phải xóa mềm. */
  destroyAll(): Promise<void>;
  /** Báo lại tình trạng loại trừ sao lưu để Cài đặt nói đúng sự thật. */
  backupPosture(): BackupPosture;
}
```

Cấu hình cố định: `scope: { kind: 'guest' }`, `schemaVersion: 1`, mã hóa **tắt**, loại trừ
sao lưu **bật** (R5).

`backupPosture()` được phơi ra vì hai nền tảng không đối xứng. iOS được gói enforce; Android
phụ thuộc vào manifest của chính repository này và gói chỉ **quan sát** được. Màn hình Cài
đặt không nên khẳng định dữ liệu bị loại khỏi sao lưu nếu tình trạng quan sát được là
`unknown` — FR-053 yêu cầu nói đúng, và một lời trấn an sai còn tệ hơn không nói gì.

## Kho công việc

```ts
interface TaskRepository {
  listByDate(date: LocalDate): Promise<Task[]>;      // đã sắp theo startTime
  find(id: string): Promise<Task | null>;
  create(input: NewTask): Promise<Task>;
  update(id: string, patch: Partial<TaskFields>): Promise<Task>;

  /** Xóa mềm — cơ chế hoàn tác (R11). Rời khỏi mọi truy vấn đọc ngay lập tức. */
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<Task>;
  /** Xóa cứng. Gọi khi hết 5 giây, và trong lượt quét lúc khởi động. */
  purge(id: string): Promise<void>;
  purgeAllSoftDeleted(): Promise<number>;

  countAll(): Promise<number>;   // "số mục đang lưu" ở màn hình Cài đặt
}
```

`listByDate` đọc qua chỉ mục `tasks_by_date_start`, nên thứ tự giờ đến từ chính chỉ mục và
không phải sắp lại trong JavaScript. Đây là điều kiện của SC-004.

`purgeAllSoftDeleted` chạy **một lần lúc khởi động**, trước khi dựng màn hình đầu tiên. Nó
là thứ biến "đóng ứng dụng trong lúc hoàn tác còn hiệu lực" thành xóa vĩnh viễn, đúng như
edge case đã chốt.

## Kho quy tắc lặp và điều chỉnh riêng

```ts
interface RecurrenceRepository {
  /** Quy tắc còn hiệu lực trong ngày — lọc theo khoảng, chưa xét thứ trong tuần. */
  listRulesEffectiveOn(date: LocalDate): Promise<RecurringRule[]>;
  findRule(id: string): Promise<RecurringRule | null>;
  createRule(input: NewRecurringRule): Promise<RecurringRule>;
  updateRule(id: string, patch: Partial<RuleFields>): Promise<RecurringRule>;

  /** Xóa quy tắc VÀ mọi điều chỉnh riêng của nó trong CÙNG một transaction. */
  deleteRuleCascade(id: string): Promise<void>;

  listOverridesOn(date: LocalDate): Promise<RecurrenceOverride[]>;
  findOverride(ruleId: string, date: LocalDate): Promise<RecurrenceOverride | null>;

  /**
   * Ghi điều chỉnh riêng. id = `${ruleId}:${occurrenceDate}` nên thao tác này
   * KHÔNG THỂ tạo bản ghi thứ hai cho cùng một buổi (FR-028).
   * patch chỉ chứa các trường thực sự ghi đè; trường vắng mặt là "kế thừa".
   */
  upsertOverride(
    ruleId: string,
    date: LocalDate,
    patch: OverridePatch,
  ): Promise<RecurrenceOverride>;

  /** Gỡ bỏ ghi đè, đưa buổi về đúng như quy tắc gốc. */
  clearOverride(ruleId: string, date: LocalDate): Promise<void>;
}
```

`deleteRuleCascade` là một transaction, không phải hai lời gọi. Xóa riêng lẻ sẽ để lại điều
chỉnh riêng mồ côi khi thao tác đứt giữa chừng — chúng không hiện lên đâu cả nhưng vẫn làm
nhiễu mọi lần đếm về sau.

`OverridePatch` phải phân biệt được **vắng mặt** và **null**. Chữ ký dùng optional cộng
nullable, và tầng hiện thực ghi xuống bằng cách chỉ đưa vào payload những khóa thực sự có
mặt — không được điền `undefined` cho phần còn lại (R7).

## Cài đặt

```ts
interface SettingsRepository {
  getAll(): Promise<AppSettings>;   // luôn trả về đủ khóa, điền mặc định khi thiếu
  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>;
}
```

`getAll` không bao giờ trả về khóa thiếu. Màn hình không phải xử lý `undefined` cho một tùy
chọn có giá trị mặc định rõ ràng, và điều đó loại bỏ cả một nhánh trạng thái khỏi giao diện.

## Nhật ký lỗi

```ts
interface ErrorLog {
  /** KHÔNG nhận đối tượng công việc. Chữ ký này là cách thực thi FR-055b. */
  record(entry: {
    code: string;
    operation: string;
    recordId?: string;
  }): Promise<void>;

  recent(limit: number): Promise<ErrorLogEntry[]>;
}
```

Giới hạn cứng 500 bản ghi, cắt bớt cũ nhất khi ghi (R10). Việc cấm log tên và ghi chú công
việc được thực thi bằng **kiểu**, không bằng quy ước — không có tham số nào nhận được chúng.

## Xử lý lỗi

Gói phơi ra `StorageError` với mã ổn định và có hàm `isCode`. **Không bao giờ parse message.**

Cổng dịch lỗi của gói sang lỗi miền trước khi trả lên trên. Tầng giao diện không được thấy
mã lỗi kỹ thuật, vì FR-055 cấm hiển thị chúng cho người dùng và người dùng cũng không có ai
để báo lỗi cho.

Mọi lỗi bắt được đều phải đi tới một trong hai chỗ: trạng thái hiển thị cho người dùng, hoặc
`ErrorLog`. Không có nhánh `catch` nào được im lặng (Principle IV, FR-055a).
