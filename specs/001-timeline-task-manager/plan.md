# Implementation Plan: Ứng dụng quản lý công việc theo Timeline (MVP)

**Branch**: `001-timeline-task-manager` | **Date**: 2026-08-02 (cập nhật 2026-08-05) | **Spec**: [spec.md](./spec.md)

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

Khi kế hoạch này được viết, repository còn là bộ khung React Native trần — chưa có `src/`.
Kế hoạch tạo ra toàn bộ cấu trúc nguồn, và bổ sung năm nhóm phụ thuộc mà bộ khung chưa có
(điều hướng, cử chỉ, nhắc nhở cục bộ, bộ chọn ngày giờ, và khai báo tường minh hai gói đang
tồn tại ngầm).

**Trạng thái 2026-08-05**: bảy user story đã triển khai và chạy trên thiết bị thật. Vòng dùng
thử đầu tiên sinh ra một loạt thay đổi hành vi đã được ghi ngược vào [spec.md](./spec.md)
(FR-003d, FR-005a, FR-008a, FR-013a, FR-018d/e, FR-019a, FR-029a, FR-031a, FR-035a/b/c,
FR-053a, FR-060…062) và vào Phase 11 của [tasks.md](./tasks.md). Mục *Ràng buộc thư viện phát
hiện khi triển khai* bên dưới ghi năm chỗ mà hành vi mặc định của thư viện đi ngược lại điều
kế hoạch giả định — đó là phần đắt nhất của vòng này và là phần dễ mất nhất nếu không ghi lại.

**Trạng thái 2026-09-12**: giao diện đã có ba ngôn ngữ — tiếng Việt, tiếng Anh, tiếng Nhật
(FR-058a…c). Danh mục chuỗi tập trung của vòng trước là thứ khiến việc này không phải sửa
từng màn hình, đúng như R9 dự đoán; phần tốn công nằm ở `src/lib/format.ts` và ở ba chỗ
L-8…L-10 bên dưới, không nằm ở các màn hình.

## Technical Context

**Language/Version**: TypeScript `^5.8.3`, `strict: true` kế thừa từ `@react-native/typescript-config`
(đã xác minh: `"strict": true` tại dòng 27 của config gốc). React `19.2.3`.

**Primary Dependencies**: React Native `0.86.2`, **bare workflow** (`android/` và `ios/` được
commit, không có Expo). Đã cài và dùng được:
`@chipmobilesdk/rn-theme@0.2.2`, `@chipmobilesdk/rn-local-db@0.1.1`, `@op-engineering/op-sqlite@^17.1.3`,
`@dr.pogodin/react-native-fs@^2.39.2`, `react-native-safe-area-context@^5.5.2`,
`react-native-unistyles@^3.3.0`, `tinycolor2@1.6.0` (transitive).

Tính năng này **thêm** các phụ thuộc sau — mỗi dòng kèm lý do cân với Principle VI. Cột phiên
bản là những gì thực sự nằm trong [package.json](../../package.json) sau khi triển khai:

| Gói | Phiên bản | Vì sao bắt buộc | Requirement |
|---|---|---|---|
| `@react-navigation/native` + `native-stack` | `^7.3.14` / `^7.18.6` | Cần một stack thật cho Cài đặt; hiến pháp yêu cầu thư viện điều hướng. Cũng là nơi khai báo chuyển cảnh có hướng | FR-051…054, FR-060 |
| `react-native-screens` | `^4.26.2` | Peer của native-stack; bật màn hình gốc, giảm chi phí dựng | — |
| `react-native-gesture-handler` | `^3.1.0` | Bốn cử chỉ: kéo đổi giờ, vuốt chuyển ngày, vuốt lên tạo việc, vuốt đóng sheet | FR-003a, FR-005a, FR-018a |
| `react-native-reanimated` | `^4.5.3` | Chạy cử chỉ và chuyển cảnh ngày trên UI thread; ngân sách 60 FPS không đạt được nếu chạy trên JS thread | SC-006, FR-060 |
| `react-native-worklets` | `^0.11.3` | Reanimated 4 tách plugin Babel sang gói này; **phải nằm cuối** mảng plugins | SC-006 |
| `react-native-nitro-modules` | `^0.36.5` | Peer bắt buộc của `op-sqlite` ở dòng 17.x | — |
| `@gorhom/bottom-sheet` | `^5.2.14` | 6/9 màn hình là bottom sheet, một trong số đó là loại chặn | Toàn bộ IA |
| `@chipmobilesdk/rn-notification` | `0.2.0` | Nhắc nhở cục bộ: định danh ổn định, hòa giải bất biến, kênh/tông khai báo, quyền tách đôi, định tuyến chạm qua cold start | FR-033…044 |
| `react-native-notify-kit` | `^10.5.0` | Engine thông báo mà SDK dùng phía sau (bản fork còn bảo trì của Notifee) | FR-033…044 |
| `react-native-mmkv` | `^4.3.2` | Peer bắt buộc của SDK thông báo — bản ghi trạng thái có giới hạn | FR-033…044 |
| `react-native-localize` | `^3.7.0` | Peer bắt buộc của SDK thông báo — múi giờ nền tảng cho việc neo lại giờ treo tường | FR-033…044 |
| `@react-native-community/datetimepicker` | `^9.1.0` | Bộ chọn ngày/giờ **gốc** của hệ điều hành theo Principle I | FR-007, FR-021 |
| `react-native-unistyles` *(khai báo lại)* | `^3.3.0` | App import trực tiếp nhưng chưa khai trong `package.json`; trước đó chỉ tồn tại nhờ peer của gói theme | Constitution III |
| `@chipmobilesdk/rn-i18n` | `^0.1.1` | Ba ngôn ngữ: chọn theo thiết bị, fallback giữa các ngôn ngữ, số nhiều (Hermes không có `Intl.PluralRules`), đổi lúc chạy, và CLI đồng bộ khóa giữa mã nguồn và ba file JSON | FR-058a…c |

**Không** thêm: thư viện quản lý state toàn cục (xem R11), `react-native-quick-crypto` (chỉ
cần khi bật mã hóa — xem R5), `@shopify/flash-list` (chỉ leo thang nếu `FlatList` trượt SC-006
— xem R8). *Thư viện i18n từng nằm trong danh sách này khi ứng dụng còn một ngôn ngữ; xem
phần thay thế của R9.*

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
điều hướng sâu tối đa 3 cấp; ba ngôn ngữ giao diện — Việt, Anh, Nhật — đổi được lúc chạy,
mọi chuỗi lấy từ danh mục tập trung, mỗi ngôn ngữ một danh mục đầy đủ (FR-058a…c).

**Scale/Scope**: 9 màn hình (S-01…S-09), 8 luồng (F-1…F-8), 4 thực thể lưu trữ + 1 bảng cài
đặt, 96 yêu cầu chức năng, 18 tiêu chí thành công (80/15 khi lập kế hoạch; phần chênh đến từ
vòng dùng thử 2026-08-05).

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

`src/` **chưa tồn tại** khi kế hoạch được viết; tính năng này tạo toàn bộ. Ngoài `src/`, tính
năng chạm vào `index.js` (mount vỏ app), `package.json` (phụ thuộc), và hai thư mục native
cho quyền và quy tắc sao lưu.

Cây dưới đây là **hiện trạng sau khi triển khai**. Ba chỗ lệch so với dự kiến ban đầu được
đánh dấu, vì mỗi chỗ đều là một quyết định chứ không phải thiếu sót.

```text
src/
├── app/
│   ├── App.tsx                       # Vỏ: providers + navigator
│   ├── navigation/
│   │   ├── RootStack.tsx             # Timeline → Settings, slide_from_right 220ms (FR-060)
│   │   └── routes.ts                 # Tên route + kiểu tham số
│   └── providers/
│       ├── DatabaseProvider.tsx      # Mở handle một lần, cung cấp xuống dưới
│       ├── ReminderProvider.tsx      # Quyền + hòa giải lịch nhắc (thay cho SheetProvider ①)
│       └── UndoProvider.tsx          # Toast Hoàn tác sống trên navigator (FR-011a)
├── features/
│   ├── timeline/                     # S-01, S-02 · US-1, US-2
│   │   ├── screens/TimelineScreen.tsx
│   │   ├── components/               # TaskRow, DayBar, DatePickerSheet ②
│   │   ├── hooks/                    # useTimelineDay, useDaySwipe, useTaskDrag,
│   │   │                             #   useCreateSwipe (FR-005a), useBusyDays
│   │   └── index.ts
│   ├── task-editor/                  # S-03, S-04, S-06, S-07, S-09 · US-3, US-4, US-5
│   │   ├── screens/TaskFormSheet.tsx
│   │   ├── components/               # RecurrenceSheet, ScopeSheet, RowActionsSheet,
│   │   │                             #   TimeShiftSheet, DateTimeField, Field
│   │   ├── hooks/useTaskForm.ts      # ③ useApplyScope không tồn tại: logic phạm vi
│   │   └── index.ts                  #   nằm trong TimelineScreen, nơi sở hữu pendingScope
│   └── settings/                     # S-08 · US-7
│       ├── screens/SettingsScreen.tsx  # PermissionRow nội tuyến — dùng đúng một chỗ
│       ├── hooks/useSettings.ts
│       └── index.ts
├── components/                       # Dùng chung ≥2 feature
│   ├── Text.tsx                      # Bọc maxFontSizeMultiplier=1.7 (FR-057)
│   ├── Chevron.tsx                   # Mũi tên VẼ bằng viền, không phải ký tự ‹ › (D-06)
│   ├── Chip.tsx  Segmented.tsx  Sheet.tsx  Toast.tsx
│   └── Skeleton.tsx  EmptyState.tsx  ErrorState.tsx
├── theme/                            # Nguồn sự thật DUY NHẤT chứa hex
│   └── brand.ts  tokens.ts  setup.ts  mode.ts  theme.ts
├── services/
│   ├── db/                           # schema, gateway, errors + 3 repository
│   ├── notifications/                # runtime (SDK) + tones + requests + routing + reconcile
│   └── logging/                      # Nhật ký lỗi cục bộ xoay vòng (FR-055a/b/c)
├── domain/                           # KHÔNG import React — kiểm thử không cần renderer
│   ├── task.ts  recurrence.ts  occurrence.ts  reminder.ts
│   ├── timeline.ts  settings.ts      # ② thay cho overlap.ts, xem ghi chú
│   └── __tests__/
├── i18n/                             # Ba ngôn ngữ (FR-058a…c) — thay cho lib/strings.ts
│   ├── index.ts                      # Instance SDK + `t` cho chỗ không có render
│   ├── useT.ts                       # `t` gắn theo ngôn ngữ — xem ③ bên dưới
│   ├── config.ts  storage.ts         # Ba locale; lựa chọn lưu bằng MMKV, không phải SQLite
│   ├── keys.generated.ts             # SINH RA bởi `npm run i18n:sync`, không sửa tay
│   └── locales/                      # vi-VN.json  en-US.json  ja-JP.json
├── lib/
│   ├── date.ts                       # Ngày/giờ địa phương, không phụ thuộc đồng hồ máy chủ
│   ├── format.ts                     # Chuỗi ghép lúc chạy — cũng lấy chữ từ danh mục
│   ├── haptics.ts
│   └── __tests__/
└── types/

index.js                              # Import src/theme/setup TRƯỚC, rồi mount src/app
android/app/src/main/AndroidManifest.xml          # Quyền + trỏ tới quy tắc sao lưu
android/app/src/main/res/xml/data_extraction_rules.xml   # Loại trừ sao lưu (Android 12+)
android/app/src/main/res/xml/backup_rules.xml            # Loại trừ sao lưu (dưới 12)
ios/TaskManager/Info.plist                        # Chuỗi mục đích thông báo
__tests__/                                        # Kiểm thử app-level (đã có)
```

① **`SheetProvider` không cần tồn tại.** `BottomSheetModalProvider` của thư viện đã là vật chủ
duy nhất cần có, và mỗi sheet tự dựng khi state của màn hình nói nó nên hiện. Thêm một
provider của riêng ứng dụng chỉ để bọc lại nó là một tầng gián tiếp không mang thông tin.
Chỗ trống đó dành cho `ReminderProvider`, thứ thực sự cần sống trên navigator: nó giữ trạng
thái quyền và chạy hòa giải khi app quay lại tiền cảnh (FR-040, FR-041).

② **`overlap.ts` và `OverlapCluster` không được dựng.** FR-006 chỉ yêu cầu hiển thị **đầy đủ**
các công việc chồng giờ, không yêu cầu gộp chúng thành cụm. Một danh sách phẳng đã thỏa mãn
điều đó và giữ được ngân sách cuộn của SC-006. `domain/timeline.ts` thay vào đó làm việc hữu
ích hơn: hợp nhất công việc thường và buổi lặp thành một kiểu `TimelineItem` duy nhất, để màn
hình không phải phân biệt hai nguồn dữ liệu trong lúc vẽ.

③ **Không có `overrideRepository.ts` riêng.** Override luôn được đọc và ghi cùng quy tắc sinh
ra nó, và `deleteRuleCascade` bắt buộc phải chạm cả hai trong một transaction ([data-model.md
§6](./data-model.md)). Tách đôi sẽ tạo ra một ranh giới mà chính transaction đó phải phá.

**Structure Decision**: Một codebase React Native duy nhất, bare workflow. Khi lập kế hoạch,
**chỉ `android/`, `ios/`, `__tests__/` và `index.js` đã tồn tại** — toàn bộ `src/` do tính
năng này tạo, nên đây cũng là tính năng thiết lập ranh giới tầng cho mọi tính năng sau.
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

## Ràng buộc thư viện phát hiện khi triển khai

Năm chỗ dưới đây là nơi **hành vi mặc định của thư viện đi ngược lại điều kế hoạch giả định**.
Không chỗ nào lộ ra khi đọc tài liệu; mỗi chỗ đều mất một vòng dùng thử để tìm. Ghi lại vì
chúng sẽ tái xuất hiện ở bất kỳ tính năng nào chạm vào cùng thư viện.

| # | Giả định của kế hoạch | Thực tế | Cách xử lý |
|---|---|---|---|
| L-1 | Mở một sheet từ trong sheet khác thì sheet dưới ở nguyên chỗ | `@gorhom/bottom-sheet` mặc định `stackBehavior: 'switch'`, tức **thu nhỏ** sheet đang mở khi sheet mới hiện. Người dùng thấy màn hình đang làm dở trượt đi mất | Khai `stackBehavior="push"` trong `src/components/Sheet.tsx`. Áp dụng cho mọi sheet, vì mọi sheet lồng nhau ở đây đều mở từ bên trong sheet cha |
| L-2 | `onDismiss` nghĩa là "người dùng đã đóng sheet này" | Nó cũng bắn khi **chủ sở hữu thay sheet này bằng sheet khác**, và bắn sau khi hoạt ảnh đóng kết thúc — tức vài trăm ms sau cú chạm. Kết quả: hành động trên dòng đóng sheet rồi xóa luôn sheet mà chính cú chạm đó vừa mở | `Sheet` nhớ mình đã bị React unmount hay chưa và bỏ qua báo cáo muộn. Sau khi unmount, chủ sở hữu đã tự biết cái gì đang hiện |
| L-3 | `enableDynamicSizing` giới hạn chiều cao sheet theo màn hình | Nó giới hạn **sheet**, nhưng `BottomSheetView` bên trong vẫn dựng ở chiều cao tự nhiên rồi tràn ra ngoài. Form dài chạy khỏi đáy màn hình, các trường cuối không chạm tới được | Nội dung sheet là `BottomSheetScrollView` — nó báo kích thước **nội dung** thay vì kích thước layout, nên sheet lớn tới mức trần rồi cuộn phần còn lại. Cũng là thứ hợp tác đúng với cử chỉ vuốt-đóng, thứ mà `ScrollView` trần chống lại |
| L-4 | `stickyHeaderIndices` ghim một hàng mà giữ nguyên bố cục của nó | React Native **chuyển style của con lên phần tử bọc** rồi đưa con `{flex: 1}` (`ScrollViewStickyHeader`). `flexDirection: 'row'` đi theo, tiêu đề và nút đóng xếp thành cột | Tiêu đề sheet trở thành `handleComponent`. Vị trí đó nằm ngoài vùng cuộn, được thư viện đo vào chiều cao sheet, và giữ nguyên style được giao |
| L-5 | Đổi cấu hình kênh thông báo là đủ để mọi nhắc nhở nhận cấu hình mới | Kênh Android **bất biến sau khi tạo**, và phép hòa giải (FR-041) cố ý không đụng vào id đã đúng lịch. Hai điều đó cộng lại: thêm âm báo chỉ có tác dụng với người cài mới | Đổi id kênh, và khi phát hiện kênh cũ vẫn còn thì hủy toàn bộ nhắc nhở đang chờ để lần hòa giải kế tiếp dựng lại chúng trên kênh mới (FR-035c) |
| L-6 | Định danh ổn định là đủ để hòa giải nhận ra thông báo nào đã lỗi thời | Định danh được tính **từ công việc**, nên nó sống sót qua mọi lần sửa: dời một việc từ 09:00 sang 11:00 vẫn ra `task:{id}`. Phép hòa giải so định danh báo "đã đúng" và không đặt lại lần nào — người dùng bị báo theo giờ đã bỏ đi, vĩnh viễn. Cùng lỗi khiến bật/tắt nhắc nhở trên việc đã lưu không có tác dụng | `listScheduled()` trả về `{id, fireAt, tone}` (qua `notifee.getTriggerNotifications()`, không phải `getTriggerNotificationIds()`), và hòa giải so cả ba. Đặt lại bằng cách **ghi đè trên cùng id** nên vẫn không mở ra khoảng trống (FR-041a) |
| L-7 | `bypassDnd: true` là đủ để chuông kêu khi máy im lặng | `bypassDnd` chỉ áp dụng cho **Không làm phiền**. Chế độ im lặng tắt cứng luồng âm thanh thông báo ở tầng hệ điều hành, và không thuộc tính kênh nào mở lại được | Chưa xử lý — cần tạo kênh ở tầng native với `AudioAttributes` USAGE_ALARM để phát trên luồng báo thức. Ghi vào Out of Scope của spec, là hạng mục kế tiếp |
| L-8 | `useTranslation()` trả về một `t` dùng được trong mảng phụ thuộc của `useMemo` | Nó dựng **closure mới mỗi lần render**. Cho `t` vào mảng phụ thuộc thì memo hỏng hoàn toàn; bỏ ra thì giá trị đóng băng ở ngôn ngữ của lần render đầu — hàng công việc vẫn ghi "QUÁ HẠN" sau khi người dùng đổi sang tiếng Anh. Cả hai vế đều là lỗi thật, và `react-hooks/exhaustive-deps` tìm ra **bảy** chỗ ngay lần đầu | `src/i18n/useT.ts` giữ đúng **một** binding cho mỗi ngôn ngữ trong một `Map`. Danh tính đổi khi và chỉ khi ngôn ngữ đổi, nên `t` trở thành một phụ thuộc trung thực: memo tính lại đúng một lần lúc đổi ngôn ngữ, không phải mỗi render (SC-006) |
| L-9 | CLI của SDK chạy được bằng lệnh trong README | `node --experimental-strip-types` **từ chối** mọi file nằm dưới `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`) — vĩnh viễn, theo thiết kế của Node. Lệnh in trong README không chạy trên Node 22.12 | `scripts/i18n-sync.mjs` sao thư mục tooling ra thư mục tạm của hệ điều hành (khóa theo số phiên bản gói) rồi chạy từ đó. Ràng buộc nằm ở **đường dẫn**, không ở mã |
| L-10 | Trình trích xuất khóa chỉ cần thấy `t('...')` là đủ | Nó xóa khỏi cả ba file JSON mọi khóa nó không thấy được **tĩnh**. `t(preset.key)`, `t(chip.key)` và `messageKey` sinh từ tầng miền đều vô hình với nó, nên lần chạy đầu sẽ lặng lẽ xóa đúng những khóa đó | Đổi tên trường thành `labelKey`/`messageKey` và khai thêm một mẫu regex trong `i18n-sync.config.json`: app tự nói cho công cụ biết khóa của mình nằm ở đâu. Những chỗ còn lại viết thành `t('literal')` tường minh (`switch` trong `format.ts`). Đổi lại, lần chạy đó phát hiện **5 khóa chết** không quy tắc lint nào thấy được |

Một quan sát chung, đắt hơn cả năm dòng trên: **ký tự không phải biểu tượng.** Căn giữa `‹`
trong một ô vuông không cho ra một mũi tên nằm giữa ô vuông, vì phông chữ đặt nét theo
ascent/descent bất đối xứng của riêng nó và mỗi ký tự lại lệch một kiểu. Hai vòng chỉnh
padding đều thất bại; chỉ khi **vẽ** mũi tên bằng viền (`src/components/Chevron.tsx`) thì các
biểu tượng trong thanh tiêu đề mới thẳng hàng. Đây là dữ kiện quyết định D-06 trong
[design/decisions.md](./design/decisions.md).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **Principle I — không dùng bottom tabs** (hiến pháp liệt kê bottom tabs là hình thức điều hướng chuẩn) | Ngoài Timeline chỉ có đúng hai đích: Cài đặt và form tạo/sửa. Timeline là màn hình duy nhất tồn tại lâu dài; mọi thứ khác đóng lại là quay về đây | Tab bar chiếm vĩnh viễn ~49pt chiều cao cho hai đích hiếm dùng, trên màn hình mà mật độ thông tin theo giờ là giá trị cốt lõi. Stack 2 màn hình + bottom sheet giữ nguyên trần 3 cấp mà không mất chiều dọc. Ghi ở [design/ia-screens-flows.md §2](./design/ia-screens-flows.md) |
| **Mandatory Delivery Baselines — Lists: không có swipe action trên dòng** | Cử chỉ vuốt ngang đã được cấp cho việc chuyển ngày (FR-003a) — hành động giá trị nhất trong một ứng dụng xoay quanh ngày. Một cử chỉ chỉ mang được một ý nghĩa | Giữ swipe-để-xóa sẽ (a) xung đột với vuốt-back của iOS ở mép trái, (b) không có lối tương đương cho trình đọc màn hình, vi phạm Principle V vốn là NON-NEGOTIABLE và thắng Delivery Baseline. Mọi hành động trên dòng nằm trong nút ⋯ với vùng chạm 44pt. Ghi ở [design/decisions.md D-02](./design/decisions.md) |
| **Ba phụ thuộc cử chỉ/hoạt ảnh** (`gesture-handler`, `reanimated`, `@gorhom/bottom-sheet`) | FR-018a (kéo đổi giờ bám lưới 15 phút, có phản hồi trong lúc kéo), FR-003a (vuốt chuyển ngày trên toàn timeline), và 6/9 màn hình là bottom sheet có vuốt-để-đóng | Cử chỉ chạy trên JS thread không giữ nổi 60 FPS của SC-006 khi danh sách đang ảo hóa. `Modal` gốc của React Native không có vuốt-để-đóng và không dựng được sheet loại chặn với tiêu đề dính. Ba gói này là một cụm: có hai gói đầu rồi thì gói thứ ba gần như miễn phí |
