# Implementation Plan: Ứng dụng quản lý công việc theo Timeline (MVP)

**Branch**: `001-timeline-task-manager` | **Date**: 2026-08-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-timeline-task-manager/spec.md`

## Summary

Một ứng dụng lập kế hoạch công việc theo ngày, chạy hoàn toàn trên thiết bị: không tài khoản,
không máy chủ, không đồng bộ. Người dùng xem timeline của một ngày, tạo và chỉnh sửa công
việc, đánh dấu hoàn thành ngay trên danh sách, dời công việc, thiết lập lịch lặp theo thứ
trong tuần với khả năng điều chỉnh riêng từng buổi, và nhận nhắc nhở cục bộ.

Kiến trúc bám đúng bốn tầng của Principle II — `UI → hooks → domain → data` — với **cơ sở dữ
liệu là nguồn sự thật duy nhất** và hai loại dữ liệu dẫn xuất không bao giờ được lưu: *lần
xuất hiện* của công việc lặp lại (sinh khi vẽ đúng ngày đang xem) và *nhắc nhở đã đặt* (luôn
tái tạo được từ công việc và quy tắc lặp). Đây là ràng buộc kiến trúc quan trọng nhất của
tính năng: mọi thứ khác đều là hệ quả của nó.

Repository hiện là bộ khung React Native trần — chưa có `src/`. Kế hoạch này tạo ra toàn bộ
cấu trúc nguồn, và bổ sung năm nhóm phụ thuộc mà bộ khung chưa có (điều hướng, cử chỉ, nhắc
nhở cục bộ, bộ chọn ngày giờ, và khai báo tường minh hai gói đang tồn tại ngầm).

## Technical Context

**Language/Version**: TypeScript `^5.8.3`, `strict: true` kế thừa từ `@react-native/typescript-config`
(đã xác minh: `"strict": true` tại dòng 27 của config gốc). React `19.2.3`.

**Primary Dependencies**: React Native `0.86.2`, **bare workflow** (`android/` và `ios/` được
commit, không có Expo). Đã cài và dùng được:
`@chipmobilesdk/rn-theme@0.2.1`, `@chipmobilesdk/rn-local-db@0.1.1`, `@op-engineering/op-sqlite@17.1.3`,
`@dr.pogodin/react-native-fs@2.39.2`, `react-native-safe-area-context@^5.5.2`,
`react-native-unistyles@3.3.0` (peer chưa khai báo), `tinycolor2@1.6.0` (transitive).

Tính năng này **thêm** các phụ thuộc sau — mỗi dòng kèm lý do cân với Principle VI:

| Gói | Vì sao bắt buộc | Requirement |
|---|---|---|
| `@react-navigation/native` + `native-stack` | Cần một stack thật cho Cài đặt; hiến pháp yêu cầu thư viện điều hướng | FR-051…054 |
| `react-native-screens` | Peer của native-stack; bật màn hình gốc, giảm chi phí dựng | — |
| `react-native-gesture-handler` | Ba cử chỉ bắt buộc: kéo đổi giờ, vuốt chuyển ngày, vuốt đóng sheet | FR-003a, FR-018a |
| `react-native-reanimated` | Chạy cử chỉ trên UI thread; ngân sách 60 FPS không đạt được nếu chạy trên JS thread | SC-006 |
| `@gorhom/bottom-sheet` | 6/9 màn hình là bottom sheet, một trong số đó là loại chặn | Toàn bộ IA |
| `@notifee/react-native` | Nhắc nhở cục bộ có lịch, kênh thông báo, và quyền báo thức chính xác trên Android | FR-033…044 |
| `@react-native-community/datetimepicker` | Bộ chọn ngày/giờ **gốc** của hệ điều hành theo Principle I | FR-007, FR-021 |
| `react-native-unistyles` *(khai báo lại)* | App import trực tiếp nhưng chưa khai trong `package.json`; hiện chỉ tồn tại nhờ peer của gói theme | Constitution III |

**Không** thêm: thư viện i18n (một ngôn ngữ — xem R9), thư viện quản lý state toàn cục (xem
R11), `react-native-quick-crypto` (chỉ cần khi bật mã hóa — xem R5), `@shopify/flash-list`
(chỉ leo thang nếu `FlatList` trượt SC-006 — xem R8).

**Storage**: `@chipmobilesdk/rn-local-db@0.1.1` trên `op-sqlite`. Phạm vi dữ liệu
`{ kind: 'guest' }` — ứng dụng không có tài khoản. Mã hóa **tắt**: dữ liệu công việc không
phải thông tin xác thực hay dữ liệu thanh toán theo mục Security của hiến pháp, và bật mã hóa
sẽ kéo theo `react-native-quick-crypto` cùng cờ dựng SQLCipher. Loại trừ khỏi sao lưu nền
tảng là mặc định của gói trên iOS, còn Android **bắt buộc** app tự khai trong manifest (R5).

**Testing**: Jest `^29.6.3` với preset `@react-native/jest-preset` ([jest.config.js](../../jest.config.js)).
Bài kiểm thử app-level nằm ở [__tests__/](../../__tests__/); logic miền được kiểm thử cạnh
mã nguồn trong `src/domain/__tests__/`. Toàn bộ tầng miền chạy được **không cần renderer**
(Principle VIII) — đó là điều kiện để kiểm thử quy tắc lặp và điều chỉnh riêng cho rẻ.

**Target Platform**: Android `minSdkVersion 24`, `compileSdk`/`targetSdk 36`
([android/build.gradle](../../android/build.gradle)); iOS dùng `min_ios_version_supported`
của React Native 0.86 ([ios/Podfile](../../ios/Podfile)). Dự án bare — mọi thay đổi manifest
và Info.plist đều do repository này sở hữu.

**Project Type**: Ứng dụng di động — một codebase React Native duy nhất. **Không có backend
trong repository này và tính năng không cần backend nào** (FR-034, FR-058).

**Performance Goals**: Timeline một ngày hiển thị < 0,5s với 5.000 công việc (SC-004); đổi
trạng thái phản hồi < 0,1s và tạo/sửa < 0,3s (SC-005); cuộn giữ ≥60 FPS với <1% khung bị bỏ
trên thiết bị cấu hình thấp (SC-006).

**Constraints**: Hoạt động đầy đủ ở chế độ máy bay (SC-007); chế độ sáng và tối đều hoàn
chỉnh (FR-056); vùng chạm ≥44×44pt và bố cục chịu được cỡ chữ hệ thống tới 170% (FR-057);
điều hướng sâu tối đa 3 cấp; giao diện chỉ tiếng Việt, mọi chuỗi lấy từ danh mục tập trung
(FR-058a).

**Scale/Scope**: 9 màn hình (S-01…S-09), 8 luồng (F-1…F-8), 4 thực thể lưu trữ + 1 bảng cài
đặt, 80 yêu cầu chức năng, 15 tiêu chí thành công.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate | Status |
|---|-----------|------|--------|
| I | Native Mobile Experience First | Tác vụ chính 1–2 thao tác; điều hướng ≤3 cấp; ưu tiên chọn hơn gõ; mặc định điền sẵn; cử chỉ gốc | **PASS** ¹ |
| II | Generic, Reusable Component Architecture | Mẫu dùng chung ở `src/components/`; không có nghiệp vụ trong view; import chỉ đi vào trong | **PASS** |
| III | Centralized Theming (NON-NEGOTIABLE) | Không có literal màu/khoảng cách/bo góc; mọi giá trị từ `src/theme/`; sáng và tối đều đủ | **PASS** |
| IV | Complete Async State Coverage (NON-NEGOTIABLE) | Mọi đường bất đồng bộ có tải/thành công/rỗng/lỗi/thử lại; không màn trắng; không nuốt lỗi | **PASS** |
| V | Accessibility by Default | Vai trò và nhãn; vùng chạm ≥44pt; chịu được phóng cỡ chữ; tương phản AA cả hai chế độ | **PASS** |
| VI | Performance on Low-End Devices | Danh sách ảo hóa; giới hạn re-render; không chặn JS thread; phụ thuộc mới có lý do | **PASS** |
| VII | Deterministic Resource & State Lifecycle | Unmount dọn listener, timer, animation; một nguồn sự thật cho mỗi state | **PASS** |
| VIII | Type-Safe, Testable Code | Không `any`; không số/chuỗi ma thuật; nghiệp vụ kiểm thử được không cần renderer | **PASS** |

¹ Hai chỗ lệch có chủ đích, đã ghi ở **Complexity Tracking**: không dùng bottom tabs, và
không có swipe action trên dòng. Cả hai là quyết định thiết kế có lý do, không phải thiếu sót.

**Security check**: **PASS** — không có bí mật, khóa API hay endpoint nào trong tính năng
này; nhật ký lỗi cục bộ bị cấm chứa tên và ghi chú công việc (FR-055b) và không bao giờ rời
thiết bị (FR-055c); không có analytics hay báo sự cố bên thứ ba. Không có token hay dữ liệu
cá nhân cần lưu ở kho bảo mật nền tảng — ứng dụng không có tài khoản.

**Delivery baselines**: **PASS với một ngoại lệ đã ghi**. Forms: kiểm tra khi gõ, lỗi ngay
tại trường, giữ nguyên dữ liệu đã nhập, cuộn tới trường sai đầu tiên — phủ bởi ma trận trạng
thái cấp Form và cấp Sheet lặp lại. Lists: skeleton, trạng thái rỗng, ảo hóa — đủ. **Swipe
actions bị bỏ có chủ đích** (Complexity Tracking, dòng 2). Pull-to-refresh **không áp dụng**:
dữ liệu chỉ nằm trên máy, không có nguồn xa nào để làm mới; timeline tự cập nhật sau mỗi
thao tác ghi (FR-004).

## Project Structure

### Documentation (this feature)

```text
specs/001-timeline-task-manager/
├── spec.md              # Đặc tả nghiệp vụ (đã chốt, 80 FR)
├── plan.md              # File này
├── research.md          # Phase 0 — 11 quyết định kỹ thuật
├── data-model.md        # Phase 1 — collections, chỉ mục, ngữ nghĩa override
├── quickstart.md        # Phase 1 — kịch bản kiểm chứng chạy được
├── contracts/           # Phase 1 — hợp đồng cổng giữa các tầng
│   ├── storage.md
│   ├── recurrence.md
│   └── reminders.md
├── design/              # Artifacts UX/UI (đã qua /speckit-design-check)
└── tasks.md             # Phase 2 — do /speckit-tasks tạo, KHÔNG phải lệnh này
```

### Source Code (repository root)

`src/` **chưa tồn tại**; tính năng này tạo toàn bộ. Ngoài `src/`, tính năng chạm vào
`index.js` (mount vỏ app), `package.json` (phụ thuộc), và hai thư mục native cho quyền và
quy tắc sao lưu.

```text
src/
├── app/
│   ├── App.tsx                       # Vỏ: providers + navigator
│   ├── navigation/
│   │   ├── RootStack.tsx             # Timeline → Settings (2 màn hình)
│   │   └── routes.ts                 # Tên route + kiểu tham số
│   └── providers/
│       ├── DatabaseProvider.tsx      # Mở handle một lần, cung cấp xuống dưới
│       ├── UndoProvider.tsx          # Toast Hoàn tác sống trên navigator (FR-011a)
│       └── SheetProvider.tsx         # Vật chủ bottom sheet
├── features/
│   ├── timeline/                     # S-01, S-02 · US-1, US-2
│   │   ├── screens/TimelineScreen.tsx
│   │   ├── components/               # TaskRow, OverlapCluster, DayBar, DatePickerSheet
│   │   ├── hooks/                    # useTimelineDay, useDaySwipe, useTaskDrag
│   │   └── index.ts
│   ├── task-editor/                  # S-03, S-04, S-06, S-07, S-09 · US-3, US-4, US-5
│   │   ├── screens/TaskFormSheet.tsx
│   │   ├── components/               # RecurrenceSheet, ScopeSheet, RowActionsSheet, TimeShiftSheet
│   │   ├── hooks/                    # useTaskForm, useApplyScope
│   │   └── index.ts
│   └── settings/                     # S-08 · US-7
│       ├── screens/SettingsScreen.tsx
│       ├── components/               # PermissionRow, DisplayModeRow
│       ├── hooks/useSettings.ts
│       └── index.ts
├── components/                       # Dùng chung ≥2 feature
│   ├── Text.tsx                      # Bọc maxFontSizeMultiplier=1.7 (FR-057)
│   ├── Chip.tsx  Segmented.tsx  Sheet.tsx  Toast.tsx
│   ├── Skeleton.tsx  EmptyState.tsx  ErrorState.tsx
├── theme/                            # Nguồn sự thật DUY NHẤT chứa hex
│   ├── brand.ts  tokens.ts  setup.ts  mode.ts
├── hooks/                            # Hook dùng chung
├── services/
│   ├── db/                           # Cấu hình schema, mở/đóng, migration
│   ├── notifications/                # Cổng Notifee + hòa giải lịch nhắc
│   └── logging/                      # Nhật ký lỗi cục bộ xoay vòng (FR-055a/b/c)
├── domain/                           # KHÔNG import React — kiểm thử không cần renderer
│   ├── task.ts  recurrence.ts  occurrence.ts  overlap.ts  reminder.ts
│   └── __tests__/
├── lib/
│   ├── date.ts                       # Ngày/giờ địa phương, không phụ thuộc đồng hồ máy chủ
│   └── strings.ts                    # Danh mục chuỗi tập trung (FR-058a)
└── types/

index.js                              # Import src/theme/setup TRƯỚC, rồi mount src/app
android/app/src/main/AndroidManifest.xml          # Quyền + trỏ tới quy tắc sao lưu
android/app/src/main/res/xml/data_extraction_rules.xml   # Loại trừ sao lưu (Android 12+)
android/app/src/main/res/xml/backup_rules.xml            # Loại trừ sao lưu (dưới 12)
ios/TaskManager/Info.plist                        # Chuỗi mục đích thông báo
__tests__/                                        # Kiểm thử app-level (đã có)
```

**Structure Decision**: Một codebase React Native duy nhất, bare workflow. Trong các thư mục
trên, **chỉ `android/`, `ios/`, `__tests__/` và `index.js` đã tồn tại** — toàn bộ `src/` do
tính năng này tạo, nên đây cũng là tính năng thiết lập ranh giới tầng cho mọi tính năng sau.
`index.js` giữ vai trò vỏ mỏng: import `src/theme/setup` ở dòng đầu (thứ tự này là bắt buộc,
xem R6) rồi mount `src/app`. Không có backend trong repository và tính năng không cần backend.

### Tái kiểm sau Phase 1

Chạy lại toàn bộ cổng sau khi hợp đồng và mô hình dữ liệu đã có. **Không cổng nào đổi trạng
thái**; ba mục dưới đây là bằng chứng mà thiết kế Phase 1 bổ sung cho các cổng vốn chỉ mới
là ý định ở lần kiểm đầu:

| Cổng | Bằng chứng Phase 1 mang lại |
|---|---|
| II — ranh giới tầng | `src/domain/` không import React; hợp đồng recurrence nhận dữ liệu đã đọc và trả kết quả thuần, nên `npx jest src/domain` chạy được không cần renderer. Kiểm chứng bằng một lệnh, không bằng review |
| IV — không nuốt lỗi | [contracts/storage.md](./contracts/storage.md) quy định mọi `catch` đi tới một trong hai chỗ: trạng thái hiển thị, hoặc `ErrorLog`. `record()` có chữ ký không nhận nổi đối tượng công việc, nên FR-055b được thực thi bằng kiểu |
| VII — một nguồn sự thật | R11 loại thư viện state; hoàn tác dùng xóa mềm trong chính cơ sở dữ liệu thay vì giữ bản sao trong bộ nhớ, nên không có bản sao thứ hai nào tồn tại |

Một rủi ro mới lộ ra ở Phase 1 và đã được xử lý trong thiết kế chứ không để lại cho lúc code:
`countOccurrences` cho chuỗi vô hạn phải đếm trong cửa sổ 365 ngày, và cách viết ngây thơ là
duyệt từng ngày — 365 vòng lặp trên JS thread ngay lúc người dùng đang chờ sheet mở. Hợp đồng
quy định phép đếm là số học thuần (số tuần trọn vẹn × số thứ được chọn, cộng phần dư hai
đầu), giữ Principle VI.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **Principle I — không dùng bottom tabs** (hiến pháp liệt kê bottom tabs là hình thức điều hướng chuẩn) | Ngoài Timeline chỉ có đúng hai đích: Cài đặt và form tạo/sửa. Timeline là màn hình duy nhất tồn tại lâu dài; mọi thứ khác đóng lại là quay về đây | Tab bar chiếm vĩnh viễn ~49pt chiều cao cho hai đích hiếm dùng, trên màn hình mà mật độ thông tin theo giờ là giá trị cốt lõi. Stack 2 màn hình + bottom sheet giữ nguyên trần 3 cấp mà không mất chiều dọc. Ghi ở [design/ia-screens-flows.md §2](./design/ia-screens-flows.md) |
| **Mandatory Delivery Baselines — Lists: không có swipe action trên dòng** | Cử chỉ vuốt ngang đã được cấp cho việc chuyển ngày (FR-003a) — hành động giá trị nhất trong một ứng dụng xoay quanh ngày. Một cử chỉ chỉ mang được một ý nghĩa | Giữ swipe-để-xóa sẽ (a) xung đột với vuốt-back của iOS ở mép trái, (b) không có lối tương đương cho trình đọc màn hình, vi phạm Principle V vốn là NON-NEGOTIABLE và thắng Delivery Baseline. Mọi hành động trên dòng nằm trong nút ⋯ với vùng chạm 44pt. Ghi ở [design/decisions.md D-02](./design/decisions.md) |
| **Ba phụ thuộc cử chỉ/hoạt ảnh** (`gesture-handler`, `reanimated`, `@gorhom/bottom-sheet`) | FR-018a (kéo đổi giờ bám lưới 15 phút, có phản hồi trong lúc kéo), FR-003a (vuốt chuyển ngày trên toàn timeline), và 6/9 màn hình là bottom sheet có vuốt-để-đóng | Cử chỉ chạy trên JS thread không giữ nổi 60 FPS của SC-006 khi danh sách đang ảo hóa. `Modal` gốc của React Native không có vuốt-để-đóng và không dựng được sheet loại chặn với tiêu đề dính. Ba gói này là một cụm: có hai gói đầu rồi thì gói thứ ba gần như miễn phí |
