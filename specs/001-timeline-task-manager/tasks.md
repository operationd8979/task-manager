---

description: "Task list for Timeline Task Manager (MVP)"
---

# Tasks: Ứng dụng quản lý công việc theo Timeline (MVP)

**Input**: Design documents from `/specs/001-timeline-task-manager/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [design/](./design/)

**Tests**: Bao gồm các bài kiểm thử mà hợp đồng **bắt buộc** — 9 trường hợp biên của
[contracts/recurrence.md](./contracts/recurrence.md), tính idempotent của phép hòa giải trong
[contracts/reminders.md](./contracts/reminders.md), và các quy tắc kiểm tra dữ liệu ở
[data-model.md §5](./data-model.md). Đây không phải TDD toàn phần: chỉ những chỗ mà một lỗi
im lặng sẽ không lộ ra khi dùng tay.

**Organization**: Nhóm theo user story để mỗi story triển khai và kiểm chứng độc lập được.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Chạy song song được (khác file, không phụ thuộc task chưa xong)
- **[Story]**: US1…US7 theo [spec.md](./spec.md)

## Path Conventions

Một codebase React Native, bare workflow. Ranh giới tầng do thư mục quyết định (Principle II).
`src/` **chưa tồn tại** — Phase 1 tạo toàn bộ. Xem Structure Decision trong [plan.md](./plan.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dựng khung thư mục và đưa các phụ thuộc còn thiếu vào `package.json`

- [X] T001 Tạo cây thư mục `src/` theo plan.md: `app/{navigation,providers}`, `features/{timeline,task-editor,settings}/{screens,components,hooks}`, `components`, `theme`, `hooks`, `services/{db,notifications,logging}`, `domain`, `lib`, `types`
- [X] T002 Khai báo `react-native-unistyles` vào `dependencies` của `package.json` — hiện chỉ tồn tại dưới dạng peer chưa khai báo (research.md R6)
- [X] T003 Cài và khai báo `@react-navigation/native`, `@react-navigation/native-stack`, `react-native-screens` vào `package.json` (R1)
- [X] T004 Cài và khai báo `react-native-gesture-handler`, `react-native-reanimated`, `@gorhom/bottom-sheet`; thêm plugin Reanimated vào `babel.config.js` **ở vị trí cuối cùng** của mảng plugins (R3)
- [X] T005 Cài và khai báo `@notifee/react-native` và `@react-native-community/datetimepicker` vào `package.json` (R2, R4)
- [ ] T006 ⚠️ **BỊ CHẶN trên Windows** — Chạy `cd ios && pod install` (cập nhật `ios/Podfile.lock`); xác nhận build được trên cả hai nền tảng trước khi viết mã tính năng
- [X] T007 [P] Xác nhận `npm run lint` chạy sạch trên khung mới
- [X] T008 [P] Xác nhận `npx tsc --noEmit` pass với `strict: true` (kế thừa từ `@react-native/typescript-config`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Hạ tầng mà **mọi** user story đều cần

**⚠️ CRITICAL**: Không story nào bắt đầu được trước khi phase này xong

### Theme (Principle III)

- [X] T009 [P] Tạo `src/theme/brand.ts` với `BRAND_COLORS` (3 màu) và `BRAND_TYPOGRAPHY` theo [design/design-system.md §1](./design/design-system.md)
- [X] T010 [P] Tạo `src/theme/tokens.ts` với `APP_COLOR_LIGHT`, `APP_COLOR_DARK`, `APP_SPACING`, `APP_TYPE`, `TAP_TARGET_MIN`, `MAX_FONT_SCALE` — dùng đúng 9 giá trị hex đã kiểm tương phản ở [design/design-system.md §3](./design/design-system.md)
- [X] T011 Tạo `src/theme/setup.ts`: `createUnistylesConfig` với overrides `background`/`surface`/`onBackground`/`border`/`radius`/`typography`, ghép nhóm `appColor`/`appType`/`appSpacing`, `declare module` mở rộng `UnistylesThemes` (phụ thuộc T009, T010)
- [X] T012 Sửa `index.js` để import `src/theme/setup` **ở dòng đầu tiên**, trước mọi component — sai thứ tự này app render không style và **không báo lỗi** (R6)
- [X] T013 Tạo `src/theme/mode.ts` với `applyDisplayMode(mode)` dùng `UnistylesRuntime.setAdaptiveThemes(false)` **trước** `setTheme()` (R6)

### Lưu trữ (contracts/storage.md)

- [X] T014 [P] Tạo `src/services/db/schema.ts` khai báo 5 collection với field, index, `softDelete`, `timestamps` theo [data-model.md §2](./data-model.md)
- [X] T015 Tạo `src/services/db/gateway.ts`: `open`/`close`/`destroyAll`/`backupPosture`, scope `{ kind: 'guest' }`, `schemaVersion: 1`, mã hóa tắt (phụ thuộc T014)
- [X] T016 [P] Tạo `src/services/db/errors.ts` dịch `StorageError` sang lỗi miền bằng `isCode` — **không bao giờ parse message** (contracts/storage.md)
- [X] T017 [P] Tạo `src/services/logging/errorLog.ts` với `record({code, operation, recordId?})` và giới hạn cứng 500 bản ghi, cắt bớt khi ghi. Chữ ký **không nhận** đối tượng công việc — đây là cách thực thi FR-055b bằng kiểu (R10)
- [X] T018 Nối `setDiagnosticLogger` của gói lưu trữ vào `errorLog` trong `src/services/db/gateway.ts` (phụ thuộc T015, T017)

### Cấu hình native (FR-049, FR-058)

- [ ] T019 [P] Tạo `android/app/src/main/res/xml/data_extraction_rules.xml` và `backup_rules.xml` loại trừ `chipmobilesdk-localdb/`; trỏ tới chúng bằng `android:dataExtractionRules` và `android:fullBackupContent` trong `AndroidManifest.xml`. **Thiếu bước này FR-049 trượt im lặng** (R5)
- [ ] T020 [P] Gỡ `WRITE_EXTERNAL_STORAGE` bằng `tools:node="remove"` trong `android/app/src/main/AndroidManifest.xml` — quyền này do `react-native-fs` tự merge vào và không được dùng (R5, FR-058)

### Nền tảng dùng chung

- [X] T021 [P] Tạo `src/lib/date.ts`: `LocalDate`/`LocalTime`, cộng trừ ngày, thứ trong tuần, so sánh — toàn bộ theo giờ địa phương, không dùng dấu thời gian tuyệt đối
- [X] T022 [P] Tạo `src/lib/strings.ts`: danh mục chuỗi tiếng Việt tập trung, `as const`, phơi ra `t(key, params?)` (R9, FR-058a)
- [X] T023 [P] Thêm quy tắc lint cấm chuỗi ký tự trong JSX ở `src/features/` và `src/components/` — không có quy tắc này thì FR-058a chỉ là lời hứa (R9)
- [X] T024 [P] Tạo `src/components/Text.tsx` bọc `Text` của RN với `maxFontSizeMultiplier={1.7}` — trần phóng cỡ chữ phải thực thi ở đây, không phải ở `fontScale` của theme (design-system.md §4)
- [X] T025 [P] Tạo `src/components/{Skeleton,EmptyState,ErrorState}.tsx` — skeleton mang đúng hình dạng nội dung thật, `ErrorState` **bắt buộc** có hành động thử lại (Principle IV)
- [X] T026 [P] Tạo `src/components/{Chip,Segmented}.tsx` — cao 44pt, trạng thái chọn = nền đặc + chữ đảo màu + `fontWeight 800` + `accessibilityState.selected`, **không chỉ đổi màu** ([design/ux-ui-spec.md §4](./design/ux-ui-spec.md))
- [X] T027 Tạo `src/components/Sheet.tsx` bọc `@gorhom/bottom-sheet`: tiêu đề dính, nút × 44×44, nút chính dính đáy, và biến thể **chặn** không vuốt/chạm nền để đóng (S-05)
- [X] T028 [P] Tạo `src/app/navigation/{routes.ts,RootStack.tsx}` — stack 2 màn hình Timeline → Settings, tham số route có kiểu (R1)
- [X] T029 Tạo `src/app/providers/DatabaseProvider.tsx` mở handle **một lần** và cung cấp xuống dưới (phụ thuộc T015)
- [X] T030 Tạo `src/app/providers/UndoProvider.tsx` + `src/components/Toast.tsx` — toast sống **trên navigator**, không thuộc màn hình nào, để hoàn tác không bị nuốt khi đổi ngày (R11, FR-011a)
- [X] T031 Tạo `src/app/App.tsx` ghép providers + navigator; đọc `displayMode` và mở cơ sở dữ liệu **trước** khi dựng màn hình đầu tiên để tránh nháy sáng/tối lúc khởi động (R6)
- [X] T032 Rút gọn `App.tsx` ở gốc thành vỏ mỏng mount `src/app/App` (phụ thuộc T031)

**Checkpoint**: Nền tảng sẵn sàng — các user story bắt đầu được

---

## Phase 3: User Story 1 — Lập kế hoạch công việc trong ngày (P1) 🎯 MVP

**Goal**: Xem timeline theo ngày, tạo công việc, điều hướng ngày, dữ liệu còn nguyên sau khi đóng app

**Independent Test**: Bật chế độ máy bay, tạo 3 công việc ở 2 ngày khác nhau, buộc dừng ứng dụng, mở lại và xác nhận cả 3 hiển thị đúng ngày, đúng thứ tự giờ ([quickstart.md V1](./quickstart.md))

### Tests for User Story 1

- [X] T033 [P] [US1] Kiểm thử quy tắc kiểm tra dữ liệu trong `src/domain/__tests__/task.test.ts`: tên rỗng sau khi cắt khoảng trắng bị từ chối, `endTime ≤ startTime` bị từ chối, `endTime` vắng mặt là hợp lệ ([data-model.md §5](./data-model.md))

### Implementation for User Story 1

- [X] T034 [P] [US1] Tạo `src/domain/task.ts`: kiểu `Task`, `NewTask`, `TaskStatus` và các hàm kiểm tra thuần — **không import React**
- [X] T035 [US1] Tạo `src/services/db/taskRepository.ts` theo [contracts/storage.md](./contracts/storage.md): `listByDate` đọc qua chỉ mục `tasks_by_date_start` nên thứ tự giờ đến từ chỉ mục, không sắp lại trong JS (SC-004)
- [X] T036 [US1] Tạo `src/features/timeline/hooks/useTimelineDay.ts` — sở hữu đủ 5 trạng thái tải/có dữ liệu/rỗng/lỗi/thử lại (Principle IV)
- [X] T037 [P] [US1] Tạo `src/features/timeline/components/DayBar.tsx`: `‹ · Thứ Hai 03/08 · HÔM NAY · › · CĐ`, cao 56pt, kẻ dưới 2px ([design/wireframes.md W-01](./design/wireframes.md))
- [X] T038 [US1] Tạo `src/features/timeline/components/TaskRow.tsx` với **bốn vùng chạm tách bạch**: ô tick 44, thân dòng, tay cầm ⣿ 44, nút ⋯ 44; chiều cao do nội dung quyết định, không cắt chữ ([design/ux-ui-spec.md §1](./design/ux-ui-spec.md))
- [X] T039 [US1] Tạo `src/features/timeline/screens/TimelineScreen.tsx` dùng `FlatList` — chỉ dựng từ token, không hex (R8, Principle III)
- [X] T040 [US1] Nối 5 trạng thái màn hình vào `Skeleton`/`EmptyState`/`ErrorState`; skeleton mang đúng hình dạng dòng thật (cột giờ, ô tick, 2 dải chữ), thêm dòng "vẫn đang đọc dữ liệu" khi quá 3 giây ([design/ux-ui-spec.md §3](./design/ux-ui-spec.md))
- [X] T041 [US1] Tạo `src/features/task-editor/hooks/useTaskForm.ts`: giá trị mặc định điền sẵn (ngày = ngày đang xem, giờ 09:00, nhắc theo cài đặt), kiểm tra khi gõ, giữ nguyên dữ liệu khi lưu thất bại (FR-008, Delivery Baselines)
- [X] T042 [US1] Tạo `src/features/task-editor/screens/TaskFormSheet.tsx` theo [W-03](./design/wireframes.md); nút Lưu **dính đáy sheet** để luôn thấy khi bàn phím mở
- [X] T043 [US1] Nối lỗi từng trường trong `src/features/task-editor/screens/TaskFormSheet.tsx`: viền trái 3px accent trên **đúng ô sai** + câu nói cách sửa, cuộn tới trường sai đầu tiên khi bấm lưu (FR-009)
- [X] T044 [US1] Sau khi lưu, nếu ngày trong form khác ngày đang xem thì timeline **nhảy sang ngày đó** — nếu không người dùng tưởng mất việc ([design/ia-screens-flows.md F-2](./design/ia-screens-flows.md))
- [X] T045 [P] [US1] Tạo `src/features/timeline/components/DatePickerSheet.tsx` (S-02/W-07): lưới tháng dùng được **ngay**, chấm ngày bận là lớp tải sau; lỗi đếm không chặn việc chọn ngày
- [X] T046 [US1] Tạo `src/features/timeline/hooks/useDaySwipe.ts` — vuốt ngang chuyển ngày trên **toàn bộ** timeline kể cả khi bắt đầu đè lên một dòng; ngưỡng 64pt hoặc đủ vận tốc; thanh ngày hiện ngày đích trong lúc vuốt (FR-003a)
- [ ] T047 [US1] Thêm nhãn tiếp cận và xác nhận vùng chạm ≥44×44pt trong `src/features/timeline/` và `src/features/task-editor/` (Principle V)
- [ ] T048 [US1] Xác nhận dọn dẹp khi unmount trong `src/features/timeline/hooks/` và `src/features/task-editor/hooks/`: listener, timer, animation, cử chỉ đang chạy (Principle VII)

**Checkpoint**: US1 chạy độc lập được — đây là MVP có giá trị dùng hằng ngày

---

## Phase 4: User Story 2 — Theo dõi tiến độ công việc (P2)

**Goal**: Tick hoàn thành ngay trên danh sách, phân biệt trạng thái không chỉ bằng màu, đánh dấu quá hạn

**Independent Test**: Tạo 2 công việc (1 giờ đã qua, 1 tương lai), tick công việc tương lai, mở lại app và xác nhận trạng thái giữ nguyên đồng thời công việc đã qua giờ hiện dấu hiệu quá hạn

### Implementation for User Story 2

- [ ] T049 [P] [US2] Thêm hàm thuần `isOverdue(item, now)` vào `src/domain/task.ts` — quá hạn **được tính khi hiển thị**, không lưu xuống ([data-model.md §4](./data-model.md), FR-017)
- [ ] T050 [US2] Thêm `updateStatus` vào `src/services/db/taskRepository.ts`, ghi ngay không gộp lô (FR-046)
- [ ] T051 [US2] Nối ô tick trong `src/features/timeline/components/TaskRow.tsx`: ô vuông rỗng viền 2px 22×22 → ô đầy + ✓; tên gạch ngang; nhãn HOÀN THÀNH; cả dòng giảm còn 72% độ đậm (FR-016)
- [ ] T052 [US2] Hiện nhãn quá hạn trong `src/features/timeline/components/TaskRow.tsx` dạng chữ **kèm khoảng trễ cụ thể** ("QUÁ HẠN 5 giờ") trên nền `accentSoft` với chữ `accentInk` — không dùng riêng màu, không dùng dấu ⚠ đơn độc
- [ ] T053 [US2] Phản hồi tức thì: ô tick đổi **0ms**, gạch ngang tên trong 120ms — phải nhanh hơn cảm giác của ngón tay (SC-005, [design/ux-ui-spec.md §5.3](./design/ux-ui-spec.md))
- [ ] T054 [US2] Thêm rung mức trung bình khi đánh dấu hoàn thành ([design/ux-ui-spec.md §5.4](./design/ux-ui-spec.md))
- [ ] T055 [US2] Nhãn tiếp cận động theo trạng thái cho ô tick trong `src/features/timeline/components/TaskRow.tsx`; xác nhận trình đọc màn hình đọc trọn dòng thành một câu có nghĩa
- [ ] T056 [US2] Kiểm chứng thủ công theo [quickstart.md V1](./quickstart.md): trạng thái còn nguyên sau khi buộc dừng và mở lại ứng dụng

**Checkpoint**: US1 + US2 đều chạy độc lập

---

## Phase 5: User Story 3 — Điều chỉnh kế hoạch khi lịch thay đổi (P3)

**Goal**: Sửa nội dung, dời giờ bằng kéo-thả và bằng menu, đổi ngày, xóa kèm hoàn tác

**Independent Test**: Tạo công việc 09:00 hôm nay, dời sang 15:00 ngày mai, xác nhận biến mất khỏi hôm nay và xuất hiện đúng chỗ ở ngày mai; xóa rồi hoàn tác sau khi đã chuyển sang ngày khác ([quickstart.md V2, V3](./quickstart.md))

### Implementation for User Story 3

- [ ] T057 [US3] Thêm `softDelete`/`restore`/`purge`/`purgeAllSoftDeleted` vào `src/services/db/taskRepository.ts` (R11, contracts/storage.md)
- [ ] T058 [US3] Chạy `purgeAllSoftDeleted()` **một lần lúc khởi động** trong `src/app/App.tsx`, trước khi dựng màn hình đầu — đây là thứ biến "đóng app trong lúc chờ hoàn tác" thành xóa vĩnh viễn (edge case đã chốt)
- [ ] T059 [US3] Nối luồng xóa vào `src/app/providers/UndoProvider.tsx`: xóa mềm ngay, toast sống **≥5 giây** và **không biến mất** khi đổi ngày hay mở màn hình khác; hết giờ thì `purge` (FR-011, FR-011a)
- [ ] T060 [US3] Trong `src/app/providers/UndoProvider.tsx`, hoàn tác khôi phục công việc **cùng nhắc nhở** về đúng trạng thái trước khi xóa (FR-011a) — phần nhắc nhở nối vào ở US6, để lại điểm mở rộng rõ ràng
- [ ] T061 [P] [US3] Tạo `src/features/task-editor/components/RowActionsSheet.tsx` (S-06): Đổi giờ · Di chuyển · Sửa · Xóa; **không** dùng vuốt ngang trên dòng (FR-003b)
- [ ] T062 [P] [US3] Tạo `src/features/task-editor/components/TimeShiftSheet.tsx` (S-07): chip giờ hay dùng + bộ chọn giờ gốc; bộ chọn ngày kèm câu "Đây là nơi duy nhất đổi được ngày" (FR-018b)
- [ ] T063 [US3] Tạo `src/features/timeline/hooks/useTaskDrag.ts` — kéo **chỉ từ tay cầm ⣿**, không phải cả dòng; bám lưới 15 phút; ngưỡng bắt đầu 8pt; nhãn "Thả để đổi sang 10:15" trong lúc kéo; thả ngoài vùng = hủy (FR-018a)
- [ ] T064 [US3] Xử lý ưu tiên cử chỉ giữa `src/features/timeline/hooks/useTaskDrag.ts` và `useDaySwipe.ts`: vuốt bắt đầu **trong vùng chạm 44pt của tay cầm** thuộc về thao tác kéo, ngoài vùng đó là chuyển ngày. Ranh giới là **vùng chạm, không phải hướng vuốt** — phân biệt bằng hướng sẽ hỏng khi ngón tay đi chéo (FR-003c)
- [ ] T065 [US3] Thêm rung nhẹ trong `src/features/timeline/hooks/useTaskDrag.ts` khi bắt đầu kéo và mỗi lần bám sang nấc 15 phút
- [ ] T066 [US3] Cảnh báo thay đổi chưa lưu khi thoát `src/features/task-editor/screens/TaskFormSheet.tsx` — sheet 3 lựa chọn: Lưu rồi thoát · Tiếp tục sửa · Thoát và bỏ thay đổi (FR-013)
- [ ] T067 [US3] Trạng thái lưu thất bại trong `src/features/task-editor/screens/TaskFormSheet.tsx`: khối lỗi trên đầu sheet, nội dung vừa nhập giữ nguyên **100%** (Delivery Baselines)
- [ ] T068 [US3] Nhãn tiếp cận cho tay cầm kéo trong `src/features/timeline/components/TaskRow.tsx`: "Kéo để đổi giờ [tên việc]. Hoặc dùng nút Thao tác khác → Đổi giờ." — **không thao tác nào chỉ tồn tại dưới dạng cử chỉ** (FR-018c)
- [ ] T069 [US3] Thứ tự tiêu điểm bàn phím ngoài trong `src/features/timeline/components/TaskRow.tsx`: ô tick → thân dòng → tay cầm → ⋯; khóa vòng tiêu điểm trong sheet đang mở
- [ ] T070 [US3] Xác nhận `src/features/timeline/hooks/useTaskDrag.ts` dọn cử chỉ và animation khi unmount giữa lúc đang kéo (Principle VII)

**Checkpoint**: US1–US3 đều chạy độc lập

---

## Phase 6: User Story 4 — Công việc lặp lại theo ngày trong tuần (P4)

**Goal**: Thiết lập quy tắc lặp theo thứ, buổi tự xuất hiện đúng ngày mà không lưu sẵn

**Independent Test**: Tạo công việc lặp T2/T4/T6 từ hôm nay, duyệt 2 tuần kế tiếp, xác nhận xuất hiện đúng 3 ngày mỗi tuần kể cả sau khi mở lại app

### Tests for User Story 4 (hợp đồng bắt buộc)

- [ ] T071 [P] [US4] `src/domain/__tests__/recurrence.test.ts` — 4 trường hợp biên của `ruleOccursOn`: bắt đầu giữa tuần, ngày xem trùng đúng `endDate` (buổi **vẫn** sinh), `endDate = null` sinh ở ngày rất xa, `daysOfWeek` rỗng ([contracts/recurrence.md](./contracts/recurrence.md))
- [ ] T072 [P] [US4] `src/domain/__tests__/countOccurrences.test.ts` — phép đếm là số học thuần, không duyệt ngày; đúng với chuỗi có và không có `endDate`

### Implementation for User Story 4

- [ ] T073 [P] [US4] Tạo `src/domain/recurrence.ts`: `RecurringRule`, `ruleOccursOn`, `countOccurrences` — số học thuần, không vòng lặp 365 ngày trên JS thread (Principle VI)
- [ ] T074 [P] [US4] Tạo `src/domain/occurrence.ts`: `buildOccurrences` cho **đúng một ngày**; không có API nào nhận khoảng ngày, vì tồn tại một API như vậy là lời mời để màn hình gọi nó khi cuộn (FR-023)
- [ ] T075 [US4] Tạo `src/services/db/recurrenceRepository.ts`: `listRulesEffectiveOn`, `createRule`, `updateRule`, mã hóa `daysOfWeek` thành chuỗi đã sắp ở tầng dữ liệu ([data-model.md §2.2](./data-model.md))
- [ ] T076 [US4] Hợp nhất công việc thường và buổi lặp vào một danh sách sắp theo giờ trong `src/features/timeline/hooks/useTimelineDay.ts`; dựng sẵn ngày liền trước và liền sau (phụ thuộc T074)
- [ ] T077 [US4] Tạo `src/features/task-editor/components/RecurrenceSheet.tsx` (S-04/W-05): segmented Không lặp | Lặp theo thứ, 7 nút 44×44, preset T2–T6/Cuối tuần/Hằng ngày, ngày bắt đầu, ngày kết thúc dạng chuyển ngay trong sheet — **không mở cấp 4**
- [ ] T078 [US4] Xem trước bằng lời trong `src/features/task-editor/components/RecurrenceSheet.tsx` cập nhật theo từng lần chạm, đặt ngay trên nút XONG — đây là chỗ người dùng phát hiện mình chọn sai thứ (FR-024)
- [ ] T079 [US4] Bốn trạng thái của `src/features/task-editor/components/RecurrenceSheet.tsx` theo [design/ux-ui-spec.md §3](./design/ux-ui-spec.md): không lặp (phần chọn **ẩn hẳn**, không làm mờ) · chưa chọn thứ nào (lỗi tại chỗ, nút XONG **vẫn bấm được** và cuộn tới hàng thứ) · hợp lệ · ngày kết thúc trước ngày bắt đầu
- [ ] T080 [US4] Hiện dấu hiệu lặp trong `src/features/timeline/components/TaskRow.tsx`: ký hiệu ⟳ **luôn kèm chữ** "LẶP T2–T6" — ký hiệu không bao giờ đứng một mình (FR-025)

**Checkpoint**: US1–US4 đều chạy độc lập

---

## Phase 7: User Story 5 — Điều chỉnh riêng một lần xuất hiện (P5)

**Goal**: Sửa/dời/xóa đúng một buổi mà không đụng chuỗi, với sheet chọn phạm vi hiểu được hậu quả

**Independent Test**: Công việc lặp T2 lúc 09:00, dời riêng buổi T2 tuần sau sang 11:00, kiểm tra các T2 còn lại vẫn 09:00 và quy tắc gốc không đổi ([quickstart.md V4, V5](./quickstart.md))

### Tests for User Story 5 (hợp đồng bắt buộc)

- [ ] T081 [P] [US5] `src/domain/__tests__/merge.test.ts` — 5 trường hợp hợp nhất: `endTime` **có mặt + null** cho buổi không có giờ kết thúc (**không** kế thừa), `endTime` **vắng mặt** thì kế thừa, `isSkipped` không trả buổi nào, override chỉ có `status` thì `hasOverride: false`, override rơi ngoài phạm vi quy tắc vẫn còn trong dữ liệu ([contracts/recurrence.md](./contracts/recurrence.md))

### Implementation for User Story 5

- [ ] T082 [US5] Bổ sung logic hợp nhất vào `src/domain/occurrence.ts`: kiểm tra sự có mặt bằng `'field' in override`, **không** bằng `!== undefined` — sai chỗ này biến "buổi này cố ý không có giờ kết thúc" thành "kế thừa 10:00" (R7)
- [ ] T083 [US5] Tạo `src/services/db/overrideRepository.ts` với `id = "${ruleId}:${occurrenceDate}"` — ràng buộc "tối đa một điều chỉnh riêng mỗi buổi" trở thành thứ **không thể vi phạm** thay vì phải kiểm tra trước khi ghi (FR-028)
- [ ] T084 [US5] `upsertOverride` chỉ đưa vào payload những khóa **thực sự có mặt**; không điền `undefined` cho phần còn lại (contracts/storage.md)
- [ ] T085 [US5] `deleteRuleCascade` xóa quy tắc **và** mọi override của nó trong **cùng một transaction** — xóa riêng lẻ sẽ để lại override mồ côi làm nhiễu mọi lần đếm về sau ([data-model.md §6](./data-model.md))
- [ ] T086 [US5] Tạo `src/features/task-editor/components/ScopeSheet.tsx` (S-05/W-04) — loại **chặn**: không vuốt xuống, không chạm nền để đóng, chỉ ba lối ra rõ ràng
- [ ] T087 [US5] Trong `src/features/task-editor/components/ScopeSheet.tsx`, hiện số buổi bị ảnh hưởng cho mỗi lựa chọn; chuỗi vô hạn dùng cửa sổ **365 ngày** và nói rõ "và mọi buổi sau đó" — trình bày con số đếm được như thể đó là toàn bộ là nói dối (FR-026b, FR-026c)
- [ ] T088 [US5] Hai trạng thái của `src/features/task-editor/components/ScopeSheet.tsx`: đang đếm → hai khối lựa chọn **khóa**, dòng đếm là skeleton (không cho chọn khi chưa biết hậu quả); không đếm được → mở khóa, nói thật thay vì hiện số sai
- [ ] T089 [US5] Sheet phạm vi xuất hiện **SAU** khi bấm Lưu, ngay trước khi ghi — không hỏi trước khi người dùng biết mình sẽ sửa gì ([design/ia-screens-flows.md F-3](./design/ia-screens-flows.md))
- [ ] T090 [US5] Tick trạng thái trên buổi lặp ghi thẳng vào `status` của override qua `src/services/db/overrideRepository.ts`, **không hỏi phạm vi** (FR-026a); nhãn "✎ ĐÃ CHỈNH RIÊNG" **không** bật khi override chỉ chứa `status`
- [ ] T091 [US5] Toast trong `src/app/providers/UndoProvider.tsx` nhắc lại phạm vi đã áp dụng: "Chỉ lần này: đã đổi giờ sang 10:15."
- [ ] T092 [US5] Đổi nhãn xóa thành "Bỏ qua buổi này" trong `src/features/task-editor/components/RowActionsSheet.tsx` khi dòng là buổi của chuỗi; thêm dòng phụ "Thuộc công việc lặp T2–T6"

**Checkpoint**: US1–US5 đều chạy độc lập

---

## Phase 8: User Story 6 — Nhận nhắc nhở kịp lúc (P6)

**Goal**: Nhắc nhở cục bộ hoạt động khi app đóng và không có mạng, có xử lý từ chối quyền

**Independent Test**: Bật chế độ máy bay, tạo công việc có nhắc sau vài phút, đóng hẳn app, chờ tới giờ, xác nhận thông báo xuất hiện và chạm vào mở đúng công việc ([quickstart.md V6, V7](./quickstart.md))

### Tests for User Story 6 (hợp đồng bắt buộc)

- [ ] T093 [P] [US6] `src/services/notifications/__tests__/reconcile.test.ts` với `ReminderScheduler` giả — chạy hòa giải hai lần liên tiếp, lần thứ hai **không** gọi `schedule` hay `cancel` lần nào (FR-041, [contracts/reminders.md](./contracts/reminders.md))
- [ ] T094 [P] [US6] `src/domain/__tests__/reminder.test.ts` — định danh tính được và ổn định: `task:{id}` và `recurring:{ruleId}:{date}`

### Implementation for User Story 6

- [ ] T095 [P] [US6] Tạo `src/domain/reminder.ts`: `ReminderOffset`, `TargetRef`, hàm tính định danh và thời điểm bắn từ giờ bắt đầu trừ offset
- [ ] T096 [US6] Tạo `src/services/notifications/scheduler.ts` — cổng `ReminderScheduler`; Notifee nằm **phía sau**, không import trực tiếp ở đâu khác (R2)
- [ ] T097 [US6] Tạo kênh thông báo Android và chuỗi mục đích trong `ios/TaskManager/Info.plist`
- [ ] T098 [US6] Trong `src/services/notifications/scheduler.ts`, xin quyền hiện thông báo và quyền báo thức chính xác **riêng biệt**, chỉ vào lần đầu người dùng bật nhắc nhở — không phải lúc mở app lần đầu (FR-036a)
- [ ] T099 [US6] Thiếu quyền báo thức chính xác → **vẫn đặt** nhắc ở chế độ gần đúng; `src/features/timeline/components/TaskRow.tsx` mang nhãn "NHẮC −10′ · CÓ THỂ TRỄ" với viền `accentInk` (FR-036b)
- [ ] T100 [US6] Nối bảng đồng bộ FR-037 vào mọi đường ghi: tạo/đổi giờ/đổi ngày/tick/bỏ tick/xóa/tắt/bật nhắc, và **chỉ buổi đó** khi di chuyển một lần xuất hiện ([contracts/reminders.md](./contracts/reminders.md))
- [ ] T101 [US6] Trong `src/services/notifications/scheduler.ts`, đặt trước nhắc nhở cho chuỗi lặp trong cửa sổ **30 ngày**, làm mới khi app mở, khi quay lại tiền cảnh, và khi quy tắc lặp thay đổi (FR-040)
- [ ] T102 [US6] Cài phép hòa giải trong `src/services/notifications/reconcile.ts` theo đúng 5 bước của hợp đồng — cái nào ở cả hai tập thì **không chạm vào**. Viết kiểu "hủy sạch rồi đặt lại" sẽ tạo khoảng trống không có nhắc nhở nào, và trên máy bị thu hồi tiến trình giữa chừng thì khoảng trống đó là vĩnh viễn (FR-041, FR-042)
- [ ] T103 [US6] Trong `src/features/task-editor/hooks/useTaskForm.ts`, thời điểm nhắc đã ở quá khứ → **không** đặt và cảnh báo cho người dùng; không đặt lặng lẽ rồi để hệ điều hành bắn ngay (FR-038)
- [ ] T104 [US6] Trong `src/features/task-editor/hooks/useTaskForm.ts`, lỗi khi đặt nhắc **không** làm thao tác lưu thất bại — lưu trước, đặt sau, lỗi bước sau ghi vào `errorLog` rồi báo riêng (FR-044, FR-055a)
- [ ] T105 [US6] Xử lý chạm vào thông báo trong `src/app/App.tsx` và `src/app/navigation/RootStack.tsx`: mở đúng ngày và làm nổi đúng công việc; công việc đã bị xóa → mở timeline **hôm nay**, không báo lỗi hệ thống (FR-043)
- [ ] T106 [US6] Banner quyền bị từ chối trong `src/features/timeline/screens/TimelineScreen.tsx`, **trong luồng** ngay dưới thanh ngày, không phải modal; không đóng được vì trạng thái vẫn đúng (FR-039)
- [ ] T107 [US6] Công tắc nhắc nhở trong `src/features/task-editor/screens/TaskFormSheet.tsx` kèm **nhãn chữ** "Nhắc nhở bật / tắt"; khối cảnh báo thiếu quyền hiện ngay dưới kèm liên kết Cấp quyền — không phải toast biến mất
- [ ] T108 [US6] Hoàn thiện T060 trong `src/app/providers/UndoProvider.tsx`: hoàn tác một thao tác xóa khôi phục cả nhắc nhở về đúng trạng thái trước đó (FR-011a)

**Checkpoint**: US1–US6 đều chạy độc lập

---

## Phase 9: User Story 7 — Kiểm soát cài đặt và dữ liệu cá nhân (P7)

**Goal**: Xem trạng thái quyền, đổi mặc định, chọn chế độ hiển thị, xóa toàn bộ dữ liệu

**Independent Test**: Đổi ngày bắt đầu tuần và xác nhận bộ chọn lịch phản ánh thay đổi; chạy xóa toàn bộ dữ liệu và kiểm tra mọi công việc cùng lịch lặp đã biến mất ([quickstart.md V8, V12](./quickstart.md))

### Implementation for User Story 7

- [X] T109 [P] [US7] Tạo `src/services/db/settingsRepository.ts` — `getAll()` **luôn trả đủ khóa**, điền mặc định khi thiếu, để màn hình không phải xử lý `undefined` (contracts/storage.md)
- [ ] T110 [US7] Tạo `src/features/settings/hooks/useSettings.ts` với đủ 5 trạng thái bất đồng bộ
- [ ] T111 [US7] Tạo `src/features/settings/screens/SettingsScreen.tsx` theo [W-06](./design/wireframes.md)
- [ ] T112 [US7] Trong `src/features/settings/components/PermissionRow.tsx`, hàng trạng thái quyền dùng **nhãn có chữ** (✓ Đã cấp / ⚠ Chưa cấp), không phải chấm màu, kèm nút mở cài đặt hệ thống (FR-051)
- [ ] T113 [US7] `src/features/settings/components/DisplayModeRow.tsx`: segmented Tự động | Sáng | Tối, mỗi lựa chọn 44pt, "Tự động" có dòng phụ nói rõ nó theo cài đặt máy; áp dụng **ngay** không cần thoát màn hình (FR-052b, FR-052c)
- [ ] T114 [US7] Trong `src/features/settings/screens/SettingsScreen.tsx`, hàng mốc nhắc mặc định kèm câu "chỉ áp dụng cho việc tạo mới" — đổi mặc định **không** sửa công việc đã tồn tại (FR-052a)
- [ ] T115 [US7] Trong `src/features/settings/screens/SettingsScreen.tsx`, hàng ngày bắt đầu tuần, áp dụng cho bộ chọn lịch của S-02 (FR-052)
- [ ] T116 [US7] Khối dữ liệu: câu "chỉ lưu trên máy này, gỡ app là mất" + số mục đang lưu; **không khẳng định** loại trừ sao lưu nếu `backupPosture().observed` là `unknown` — lời trấn an sai còn tệ hơn không nói gì (FR-053, contracts/storage.md)
- [ ] T117 [US7] Nút xóa toàn bộ dữ liệu trong `src/features/settings/screens/SettingsScreen.tsx`: viền accent 2px nền trong suốt, **không phải nút đặc**; hộp thoại xác nhận có chữ nêu rõ **không có hoàn tác** kèm số mục sẽ mất (FR-054, FR-011b)
- [ ] T118 [US7] Ba trạng thái riêng của màn hình Cài đặt theo [design/ux-ui-spec.md §3](./design/ux-ui-spec.md): đang tải · lỗi đọc **theo từng hàng** (hàng đọc được vẫn hiện) · đang lưu một tùy chọn

**Checkpoint**: Cả 7 user story đều chạy độc lập

---

## Phase 10: Compliance Verification & Polish

**⚠️ Note**: Theming, trạng thái bất đồng bộ, tiếp cận và dọn dẹp **không phải** việc polish —
hiến pháp coi tính năng thiếu chúng là chưa xong, nên chúng nằm trong task của từng story.
Phase này **kiểm chứng**, không giới thiệu chúng lần đầu.

### Compliance verification (mandatory)

- [ ] T119 Rà soát toàn bộ `src/` tìm literal màu/khoảng cách/bo góc — **zero** hex ngoài `src/theme/` (Principle III)
- [ ] T120 Kiểm tra 9/9 màn hình dưới `src/features/` hiển thị đúng ở **cả** chế độ sáng và tối (Principle III, FR-056)
- [ ] T121 Kiểm tra mọi hook trong `src/features/*/hooks/` có đủ tải/thành công/rỗng/lỗi/thử lại; không màn hình trắng, không mã lỗi kỹ thuật (Principle IV, SC-014)
- [ ] T122 Duyệt trình đọc màn hình và phóng cỡ chữ lên mức lớn nhất trên mọi màn hình mới ([quickstart.md V11](./quickstart.md), Principle V)
- [ ] T123 Đo hiệu năng theo [quickstart.md V10](./quickstart.md): 5.000 công việc, timeline <0,5s, cuộn ≥60 FPS. **Kết quả bước này quyết định R8** — `FlatList` giữ được thì dừng, không thì mới cân nhắc thêm phụ thuộc ảo hóa
- [ ] T124 Kiểm tra dọn dẹp khi unmount trên mọi màn hình dưới `src/features/`: listener, timer, animation, cử chỉ (Principle VII)
- [ ] T125 Xác nhận không `any`, không số/chuỗi ma thuật, không mã chết; `npm run lint` và `npx tsc --noEmit` sạch (Principle VIII)
- [ ] T126 Xác nhận `npx jest src/domain` xanh **không cần renderer** — nếu nó cần renderer thì ranh giới tầng đã bị vi phạm (Principle II, VIII)
- [ ] T127 Rà soát `src/` và `src/services/logging/errorLog.ts`: không bí mật trong nguồn, nhật ký lỗi **không chứa** tên hay ghi chú công việc; số byte dữ liệu chẩn đoán rời thiết bị bằng 0 (Security Constraints, SC-015)
- [ ] T128 Kiểm chứng loại trừ sao lưu trên **thiết bị Android thật**: gỡ app, cài lại, xác nhận 0 công việc được khôi phục ([quickstart.md V12](./quickstart.md), FR-049)
- [ ] T129 Kiểm tra `android/app/src/main/AndroidManifest.xml` và `ios/TaskManager/Info.plist`: chỉ thông báo và báo thức chính xác; `WRITE_EXTERNAL_STORAGE` **đã bị gỡ** (FR-058)

### Polish

- [ ] T130 [P] Kiểm tra mọi chuỗi hiển thị đến từ `src/lib/strings.ts` — quy tắc lint ở T023 phải bắt được vi phạm, chạy thử một vi phạm cố ý để xác nhận
- [ ] T131 Trích xuất logic bị lặp giữa các story vào `src/components/` hoặc `src/hooks/` (Principle II)
- [ ] T132 [P] Chạy toàn bộ 12 kịch bản trong [quickstart.md](./quickstart.md) và ghi lại kết quả
- [ ] T133 Chạy [quickstart.md](./quickstart.md) trên cả hai nền tảng: nhất quán nghiệp vụ cho trạng thái, lặp lại, điều chỉnh riêng, di chuyển, lưu trữ và lịch nhắc (FR-059, SC-012)
- [ ] T134 [P] Chốt bộ icon thay cho ký hiệu chữ ⟳ ✎ ⣿ ✓ ‹ › — quyết định D-06 đã hoãn tới giai đoạn này ([design/decisions.md](./design/decisions.md))

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: không phụ thuộc gì
- **Foundational (Phase 2)**: sau Setup — **chặn toàn bộ** user story
- **User Stories (Phase 3–9)**: đều sau Foundational; sau đó chạy song song hoặc tuần tự theo ưu tiên
- **Polish (Phase 10)**: sau các story cần giao

### User Story Dependencies

Sáu story đầu độc lập với nhau về mặt hạ tầng, nhưng có ba ràng buộc **nghiệp vụ** thật, không
phải ràng buộc kỹ thuật tùy tiện:

- **US1 (P1)**: độc lập. Là MVP.
- **US2 (P2)**: độc lập — chỉ cần dòng công việc từ US1 để có chỗ đặt ô tick.
- **US3 (P3)**: độc lập. T060 để lại điểm mở rộng cho phần nhắc nhở của US6.
- **US4 (P4)**: độc lập — nhưng buổi lặp cần chỗ hiển thị, nên thực tế nên làm sau US1.
- **US5 (P5)**: **phụ thuộc US4**. Điều chỉnh riêng chỉ có nghĩa khi đã có quy tắc lặp.
- **US6 (P6)**: độc lập, nhưng T101/T102 (cửa sổ 30 ngày cho chuỗi lặp) chỉ kiểm chứng đầy đủ được sau US4.
- **US7 (P7)**: độc lập.

### Within Each User Story

Kiểu miền → repository → hook → màn hình. Màn hình **compose**, không giữ nghiệp vụ.
Một story chưa xong nếu chưa làm task về trạng thái, tiếp cận và dọn dẹp của nó.

### Parallel Opportunities

- Phase 1: T007, T008 song song
- Phase 2: T009+T010, rồi T014/T016/T017/T019/T020/T021/T022/T023/T024/T025/T026/T028 song song
- Sau Foundational: US1, US2, US3, US4, US6, US7 khởi động song song được nếu đủ người; US5 chờ US4
- Trong mỗi story: các task đánh [P] chạm file khác nhau

---

## Parallel Example: Foundational

```bash
# Sau khi T009+T010 xong, mười hai task này chạm mười hai file khác nhau:
Task: "src/services/db/schema.ts"          # T014
Task: "src/services/db/errors.ts"          # T016
Task: "src/services/logging/errorLog.ts"   # T017
Task: "android/.../data_extraction_rules.xml"  # T019
Task: "android/.../AndroidManifest.xml"    # T020
Task: "src/lib/date.ts"                    # T021
Task: "src/lib/strings.ts"                 # T022
Task: "src/components/Text.tsx"            # T024
Task: "src/components/Skeleton.tsx"        # T025
Task: "src/components/Chip.tsx"            # T026
Task: "src/app/navigation/RootStack.tsx"   # T028
```

## Parallel Example: User Story 4

```bash
# Hai bài kiểm thử hợp đồng, viết trước khi có hiện thực:
Task: "src/domain/__tests__/recurrence.test.ts"        # T071
Task: "src/domain/__tests__/countOccurrences.test.ts"  # T072

# Hai module miền, khác file:
Task: "src/domain/recurrence.ts"    # T073
Task: "src/domain/occurrence.ts"    # T074
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → 2. Phase 2 Foundational (**chặn tất cả**) → 3. Phase 3 US1
4. **DỪNG và kiểm chứng**: chạy [quickstart.md V1](./quickstart.md) trên máy ở chế độ máy bay
5. Tới đây đã có một sổ kế hoạch theo ngày dùng được hằng ngày, hoàn toàn offline

### Incremental Delivery

MVP (US1) → +US2 tiến độ → +US3 điều chỉnh → +US4 lặp lại → +US5 điều chỉnh riêng →
+US6 nhắc nhở → +US7 cài đặt. Mỗi bước thêm giá trị mà không phá bước trước.

**Điểm dừng có ý nghĩa nhất là sau US3**: tới đó ứng dụng đã đủ cho một người dùng thật dùng
hằng ngày. US4/US5 là phần phân biệt với một danh sách việc thông thường, và cũng là phần
tinh vi nhất — nên vào chúng khi ba story đầu đã ổn định, không sớm hơn.

### Parallel Team Strategy

Sau Foundational: A làm US1→US2, B làm US4→US5 (chuỗi bắt buộc), C làm US6→US7.
Ba nhánh chạm ba nhóm file khác nhau; điểm gặp duy nhất là `TaskRow.tsx` và `useTimelineDay.ts`,
nên thống nhất chữ ký hai file đó ngay khi Foundational xong.

---

## Notes

- Ba chỗ hỏng **im lặng** trong danh sách này, đáng đọc lại trước khi bắt đầu: T012 (thứ tự
  import theme — sai thì app render không style và không báo lỗi), T019 (thiếu XML thì FR-049
  trượt mà app vẫn chạy), T082 (`'field' in override` — sai thì mất dữ liệu người dùng không
  nhận ra).
- Commit sau mỗi task hoặc mỗi nhóm hợp lý.
- Dừng ở bất kỳ checkpoint nào để kiểm chứng story độc lập.
