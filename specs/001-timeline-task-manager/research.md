# Phase 0 — Research

Mười một quyết định kỹ thuật cần chốt trước khi thiết kế hợp đồng. Mỗi mục ghi **Quyết định
→ Lý do → Phương án đã loại**. Không mục nào còn ở trạng thái NEEDS CLARIFICATION.

Điều kiện chung: dự án là React Native **bare** 0.86.2, TypeScript strict, không backend,
không tài khoản, mục tiêu hiệu năng đặt ở thiết bị cấu hình thấp.

---

## R1 · Thư viện điều hướng

**Quyết định**: `@react-navigation/native` + `@react-navigation/native-stack` +
`react-native-screens`. Một stack duy nhất với hai màn hình: `Timeline` (gốc) và `Settings`.

**Lý do**: Danh sách kiểm tra áp dụng trong hiến pháp yêu cầu một thư viện điều hướng, và
`native-stack` dùng navigator gốc của từng nền tảng nên cử chỉ back của iOS và hoạt ảnh
chuyển màn hình là hành vi hệ thống thật, không phải mô phỏng. Hai màn hình là toàn bộ nhu
cầu — bảy màn hình còn lại là bottom sheet chồng lên timeline (xem R3).

**Đã loại**:
- *Không dùng thư viện, tự quản bằng state*: mất cử chỉ back gốc, mất khôi phục trạng thái,
  và mọi sheet sẽ phải tự xử lý thứ tự lớp. Rẻ lúc đầu, đắt ở màn hình thứ ba.
- *`@react-navigation/stack` (JS)*: hoạt ảnh chạy trên JS thread, đối đầu trực tiếp với SC-006.
- *Bottom tabs*: đã loại ở tầng thiết kế, lý do ghi trong Complexity Tracking của plan.

---

## R2 · Nhắc nhở cục bộ

**Quyết định**: `@notifee/react-native`. Toàn bộ lịch nhắc đi qua một cổng
`ReminderScheduler` do app định nghĩa (xem [contracts/reminders.md](./contracts/reminders.md)),
Notifee chỉ là một hiện thực phía sau cổng đó.

**Lý do**: Đây là thư viện duy nhất phủ đủ ba thứ mà FR-036a/FR-036b bắt buộc trên Android:
kênh thông báo, lịch chạy chính xác (`AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE`), và **hỏi
riêng quyền báo thức chính xác** (`SCHEDULE_EXACT_ALARM`) tách khỏi quyền hiện thông báo.
Đặc tả yêu cầu đúng sự tách biệt đó: xin quyền chính xác vào lần đầu bật nhắc nhở, và khi bị
từ chối thì vẫn đặt nhắc ở chế độ gần đúng kèm cảnh báo có thể trễ.

Việc bọc sau một cổng không phải lớp trừu tượng thừa: FR-041 yêu cầu hòa giải lịch nhắc phải
**cho cùng kết quả khi chạy nhiều lần**, và tính chất đó chỉ kiểm thử được nếu cổng thay thế
được bằng bản giả trong Jest.

**Đã loại**:
- *`react-native-push-notification`*: thiên về thông báo đẩy từ máy chủ, phần lịch cục bộ
  yếu hơn và không phơi ra luồng quyền báo thức chính xác của Android 12+.
- *API thông báo cục bộ của Expo*: dự án là bare workflow, không có Expo.

**Cần xác minh khi triển khai, không phải bây giờ**: hành vi khôi phục sau khi thiết bị khởi
động lại. Android xóa alarm đã đăng ký khi reboot; Notifee có bộ nhận boot nhưng mức phủ khác
nhau giữa các nhà sản xuất. **Kế hoạch không dựa vào nó**: FR-041 (hòa giải khi ứng dụng mở)
là đường bảo đảm, bộ nhận boot chỉ là cải thiện. Thiết kế theo thứ tự đó thì FR-042 vẫn đạt
kể cả trên máy có tối ưu pin hung hãn.

**Bổ sung 2026-08-10 — hai kênh, một cổng**: FR-033a chia thông báo thành hai tông, và cả hai
vẫn đi qua đúng cổng này. Adapter Notifee giữ hai kênh Android (`task-reminders-alarm` cho
tông chuông, `task-notices` cho tông im lặng) và chọn kênh theo trường `tone` của yêu cầu.
Quy tắc chọn tông nằm ở tầng domain, nên nó kiểm thử được mà không cần Notifee — đúng lý do
cổng này tồn tại.

Điều này cũng buộc `listScheduled()` phải trả về `{id, fireAt, tone}` thay vì danh sách định
danh: định danh sống sót qua mọi lần sửa công việc, nên chỉ so định danh thì hòa giải không
bao giờ phát hiện được một thông báo đã lệch giờ hoặc lệch tông (FR-041a).
`notifee.getTriggerNotifications()` cung cấp đủ dữ liệu đó, `getTriggerNotificationIds()` thì
không — nên adapter đổi sang hàm thứ nhất.

**Thay thế 2026-08-17 — chuyển sang `@chipmobilesdk/rn-notification`**: quyết định ở trên
được thay bằng SDK nội bộ. Lý do không phải "đổi thư viện": SDK đã sở hữu đúng những thứ mà
cổng tự viết phải tự làm — hòa giải bất biến theo miền (`groupTag`), định danh do người gọi
tự dẫn xuất, di trú kênh Android theo phiên bản tông, hai quyền tách rời với sáu trạng thái,
đệm bền cho cú chạm lúc cold start, và neo lại giờ treo tường khi đổi múi giờ (điều mà bản
Notifee **không** làm: một nhắc 09:00 sẽ trôi theo múi giờ mới).

Cổng `ReminderScheduler` bị bỏ vì lý do nó tồn tại đã được đáp ứng ở nơi khác: FR-041 kiểm
thử được bằng engine giả của chính SDK (`@chipmobilesdk/rn-notification/testing`), nên phép
hòa giải thật — chứ không phải một bản mô phỏng — mới là thứ được kiểm thử. Phần duy nhất
còn ở app là `desiredReminders()`: SDK **không bao giờ** tự đoán tập mong muốn.

Engine phía sau là `react-native-notify-kit` (bản fork còn bảo trì của Notifee — kho Notifee
đã lưu trữ ngày 2026-04-07).

**Bổ sung 2026-08-30 — SDK 0.2.0**: hai thứ từng mất đi khi chuyển sang SDK đã được trả lại
ở tầng khai báo tông, không cần bump `version` tông nào:

- **Chuông lặp có giới hạn**: tông `task-reminder` khai `repeatAlert: { forMs: 15 phút }`.
  Chuông lặp cho tới khi người dùng xử lý, hoặc tới khi hết 15 phút — và **thông báo vẫn nằm
  lại** trong tray sau khi tắt tiếng, vì người vắng nhà vẫn phải thấy mình đã lỡ việc gì.
  Kèm theo một bước bắt buộc: `registerBackgroundNotificationHandler` ở module scope trong
  `index.js`, nếu không thì không có gì dừng chuông khi tiến trình đã chết. Mười lăm phút là
  **sàn** chứ không phải điểm cắt chính xác: mốc dừng được đặt như một thông báo bình thường
  nên thiếu quyền báo thức chính xác thì nó chạy quá giờ.
- **Nhãn kênh**: `name`/`description` giờ thật sự tới màn hình cài đặt hệ thống, nên người
  dùng đọc "Nhắc nhở công việc" thay vì `task-reminder`.

Giới hạn còn lại, ghi ra chứ không lấp: iOS **không** lặp chuông (không có API loop, và mức
cảnh báo duy nhất vượt được nút tắt tiếng cần entitlement Apple cấp theo đơn) — thông báo vẫn
tới và vẫn kêu một lần; `timeSensitive` trên iOS cần capability riêng của app; âm trên Android
dùng **âm lượng thông báo**, không phải âm lượng báo thức; và mỗi nhắc nhở có chuông chiếm
thêm một suất trong hạn mức thông báo chờ của Android.

---

## R3 · Cử chỉ, hoạt ảnh và bottom sheet

**Quyết định**: `react-native-gesture-handler` + `react-native-reanimated` +
`@gorhom/bottom-sheet`.

**Lý do**: Tính năng có ba cử chỉ bắt buộc, và cả ba đều phải chạy ở 60 FPS trong lúc một
danh sách ảo hóa đang cuộn:

| Cử chỉ | Requirement | Vì sao cần UI thread |
|---|---|---|
| Kéo tay cầm đổi giờ, bám lưới 15 phút | FR-018a | Nhãn xem trước cập nhật theo từng khung hình |
| Vuốt ngang chuyển ngày trên toàn timeline | FR-003a | Phải phân biệt được với cuộn dọc mà không trễ |
| Vuốt xuống đóng sheet | Toàn bộ IA | Sheet phải bám ngón tay |

`@gorhom/bottom-sheet` xử lý được ba thứ mà `Modal` gốc không có: tiêu đề dính, nút chính
dính đáy khi bàn phím mở, và sheet **loại chặn** không đóng được bằng vuốt hay chạm nền
(S-05 bắt buộc như vậy — bấm nhầm ra ngoài không được phép ghi dữ liệu).

**Điểm cần cẩn thận**: cử chỉ vuốt ngang chuyển ngày phải nhường quyền cho tay cầm kéo khi
chạm bắt đầu trong vùng 44pt của tay cầm (FR-003c). Ranh giới là **vùng chạm**, không phải
hướng vuốt — phân biệt bằng hướng sẽ hỏng khi ngón tay đi chéo.

**Đã loại**: `Animated` của React Native chạy hoạt ảnh cử chỉ trên JS thread; `PanResponder`
không có cơ chế nhường quyền giữa các cử chỉ lồng nhau.

---

## R4 · Bộ chọn ngày và giờ

**Quyết định**: `@react-native-community/datetimepicker`.

**Lý do**: Principle I yêu cầu dùng bộ chọn ngày/giờ **gốc** khi nó phù hợp, và mọi trường
ngày giờ trong tính năng đều có miền giá trị hữu hạn nên phải cho chọn chứ không bắt gõ.
Bộ chọn gốc cũng tự đi theo định dạng 12/24 giờ và ngày bắt đầu tuần của hệ điều hành.

**Bổ sung, không thay thế**: thiết kế đặt các *chip* giá trị hay dùng ở phía trên bộ chọn —
"+30 phút", "+1 giờ", mốc nhắc 0/5/10/15/30/60. Chip xử lý phần lớn trường hợp trong một
chạm; bộ chọn gốc lo phần đuôi. Bỏ chip đi thì mọi thao tác đổi giờ đều phải mở bộ chọn.

---

## R5 · Cấu hình lưu trữ

**Quyết định**: `@chipmobilesdk/rn-local-db` với `scope: { kind: 'guest' }`, `schemaVersion: 1`,
**mã hóa tắt**, loại trừ sao lưu **bật** trên cả hai nền tảng.

**Lý do**:

*Phạm vi `guest`* — ứng dụng không có tài khoản, không có định danh người dùng nào để tạo
scope `identity`. Đây cũng là lý do mục "đăng xuất không phải là xóa" của gói không áp dụng:
không có đăng xuất. FR-054 (xóa toàn bộ dữ liệu) ánh xạ sang `deleteScopeData`, là xóa thật.

*Mã hóa tắt* — mục Security của hiến pháp bắt buộc kho bảo mật nền tảng cho **token, thông
tin xác thực, dữ liệu cá nhân, dữ liệu y tế, dữ liệu thanh toán**. Tên công việc không thuộc
các nhóm đó, và đặc tả không yêu cầu mã hóa ở bất kỳ điều khoản nào. Bật mã hóa kéo theo
`react-native-quick-crypto` cộng cờ dựng `op-sqlite.sqlcipher` — chi phí dựng và kích thước
gói không đổi lấy một yêu cầu nào cả.

*Loại trừ sao lưu* — FR-049 nói dữ liệu **MUST KHÔNG** được khôi phục tự động sau khi cài
lại. Gói đặt `NSURLIsExcludedFromBackupKey` trên iOS và **enforce được**. Trên Android thì
không: participation khai trong manifest, là thứ build-time và thuộc về app. Gói không viết
mã native nên không tự khai được — nó chỉ kiểm tra và báo lại `backupPosture.observed`.
Vì vậy repository này **phải** ship hai file XML và trỏ tới chúng trong manifest, nếu không
FR-049 sẽ trượt âm thầm trên Android. Đây là một task hạ tầng, không phải tùy chọn.

Cũng nên gỡ quyền `WRITE_EXTERNAL_STORAGE` mà `@dr.pogodin/react-native-fs` tự khai và merge
vào app — gói lưu trữ không bao giờ ghi ra ngoài thư mục riêng của ứng dụng, nên quyền đó
thừa và sẽ hiện trên trang Play kèm một câu hỏi an toàn dữ liệu không có câu trả lời trung
thực. FR-058 cấm xin quyền không liên quan tới chức năng.

**Đã loại**: AsyncStorage (không truy vấn được theo ngày, không migration, không quan hệ),
và `op-sqlite` trần (mất schema khai báo, migration có kiểm tra, và ngữ nghĩa bốn trạng thái
giá trị ở R7).

---

## R6 · Nối theme và chế độ hiển thị

**Quyết định**: `createUnistylesConfig` từ `@chipmobilesdk/rn-theme`, cấu hình khởi động ở
`adaptiveThemes: true`, và chế độ ba giá trị đi qua `UnistylesRuntime` lúc chạy.
`react-native-unistyles` được **khai báo tường minh** trong `package.json`.

**Lý do**: `createUnistylesConfig` chỉ nhận đúng một chiến lược khởi động —
`initialTheme` và `adaptiveThemes` dùng chung sẽ bị chặn khi validate. FR-052b cần ba giá trị
(Tự động | Sáng | Tối), nên cách duy nhất là khởi động ở "Tự động" rồi áp lựa chọn đã lưu khi
đọc xong: `setAdaptiveThemes(false)` **trước**, rồi `setTheme(mode)`. Thứ tự ngược lại sẽ bị
chế độ hệ thống ghi đè ở lần đổi kế tiếp.

Về khai báo phụ thuộc: `package-lock.json` đánh dấu `react-native-unistyles` là `"peer": true`
— nó có mặt chỉ vì gói theme khai peer, còn app thì `import` nó trực tiếp trong
`src/theme/setup.ts`. Một lần `npm ci` với cây phụ thuộc khác có thể không có nó.

**Hai chỗ hỏng âm thầm cần chặn bằng task riêng**:

1. **Thứ tự khởi tạo**. Nếu `src/theme/setup` được import *sau* component đầu tiên dùng
   style, ứng dụng render **không có style và không báo lỗi**. Import ở dòng đầu `index.js`.
2. **Nháy màn hình lúc khởi động**. Đọc lựa chọn chế độ là thao tác bất đồng bộ; giữa lúc app
   mở và lúc áp lựa chọn, giao diện đang theo hệ thống. Người dùng chọn Sáng trên máy đang
   tối sẽ thấy một nhịp nháy. **Quyết định**: đọc lựa chọn trước khi dựng màn hình đầu tiên,
   giữ màn hình gốc ở trạng thái skeleton trong lúc đó. Đây cũng là chỗ mở cơ sở dữ liệu, nên
   không tốn thêm một pha chờ nào.

**Đã loại**: tự viết theme provider (Principle III yêu cầu một nguồn sự thật, và gói đã sinh
sẵn cả hai bảng màu đã kiểm tương phản); giữ `adaptiveThemes` cố định (không đạt FR-052b).

---

## R7 · Ngữ nghĩa điều chỉnh riêng: vắng mặt khác null

**Quyết định**: Điều chỉnh riêng lưu **chỉ những trường thực sự bị ghi đè**. Trường **vắng
mặt** nghĩa là "kế thừa từ quy tắc lặp"; trường **có mặt và null** nghĩa là "buổi này cố ý
không có giá trị đó". Truy vấn dùng toán tử `exists` để phân biệt hai trạng thái.

**Lý do**: Đây là bài toán trung tâm của toàn bộ tính năng và cũng là chỗ dễ mất dữ liệu
nhất. Ví dụ cụ thể: quy tắc lặp có giờ kết thúc mặc định 10:00. Người dùng sửa riêng buổi
thứ Ba thành "không có giờ kết thúc". Nếu điều chỉnh riêng chỉ biết "set" và "null" thì
`endTime: null` không phân biệt được với "chưa từng ghi đè" — và buổi thứ Ba sẽ lặng lẽ nhận
lại 10:00 từ quy tắc gốc.

Gói lưu trữ phân biệt sẵn bốn trạng thái này (`'field' in record.data` cho vắng mặt, `exists`
cho truy vấn), và tài liệu của gói cảnh báo đúng rằng xử lý chỉ hai trạng thái sẽ tạo ra mất
dữ liệu im lặng. Ngữ nghĩa hợp nhất được viết đầy đủ ở
[contracts/recurrence.md](./contracts/recurrence.md).

**Đã loại**: cột `overriddenFields: string[]` song song (hai nguồn sự thật cho cùng một câu
hỏi, và chúng sẽ lệch nhau); sentinel như `-1` hay chuỗi rỗng (số ma thuật, Principle VIII).

---

## R8 · Ảo hóa danh sách

**Quyết định**: `FlatList` của React Native trước. Chỉ leo thang lên `@shopify/flash-list`
nếu đo thực tế trượt SC-006.

**Lý do**: Chiều cao dòng **thay đổi theo nội dung** — thiết kế quy định 76pt cho dòng một
nhãn, 92pt cho dòng ba nhãn, và cao hơn nữa khi người dùng phóng cỡ chữ tới 170%. Vì vậy
`getItemLayout` không dùng được và lợi thế lớn nhất của FlashList (tái dùng ô theo kích thước
ước lượng) bị giảm đáng kể. Thêm nữa, một ngày hiếm khi có hơn vài chục công việc: 5.000 là
tổng trên toàn thiết bị, **không phải trên một màn hình**. Số lượng phần tử thực tế của danh
sách nhỏ; chi phí nằm ở truy vấn và ở việc sinh buổi lặp, không ở ảo hóa.

Thêm một phụ thuộc để giải quyết vấn đề chưa đo được là vi phạm Principle VI theo chiều
ngược lại. Task đo SC-006 phải nằm trong `tasks.md` để quyết định này có dữ liệu.

**Đo chiều cao**: đo **một lần cho mỗi biến thể dòng** ở cỡ chữ hiện tại rồi dùng lại, thay
vì đo từng dòng. Thiết kế đã ghi ràng buộc này.

---

## R9 · Danh mục chuỗi

**Quyết định**: một module TypeScript `src/lib/strings.ts` — object phẳng, `as const`, khóa
có kiểu. Không thêm thư viện i18n.

**Lý do**: FR-058a yêu cầu mọi chuỗi hiển thị đến từ một danh mục tập trung và **cấm** viết
thẳng chuỗi trong màn hình, nhưng phiên bản đầu chỉ có tiếng Việt. Một object `as const` cho
đủ thứ cần: một nơi duy nhất, khóa được kiểm kiểu, và khóa thiếu là lỗi biên dịch chứ không
phải chuỗi rỗng lúc chạy. Thêm `i18next` cho một ngôn ngữ là tăng kích thước gói mà không
đổi lấy hành vi nào — Principle VI.

Cấu trúc chọn sẵn để thêm ngôn ngữ sau không phải sửa từng màn hình: module phơi ra hàm
`t(key, params?)` chứ không phơi object trực tiếp, nên đổi sang thư viện thật về sau chỉ thay
phần thân hàm.

**Ràng buộc kiểm tra được**: một quy tắc lint cấm chuỗi ký tự trong JSX ở `src/features/` và
`src/components/`. Không có quy tắc đó thì FR-058a chỉ là lời hứa.

**Thay thế 2026-09-12 — chuyển sang `@chipmobilesdk/rn-i18n`**: yêu cầu đổi (FR-058a…c: ba
ngôn ngữ — Việt, Anh, Nhật), nên lý do "một ngôn ngữ" ở trên không còn. Dùng SDK nội bộ vì nó
đã sở hữu đúng những thứ mà bản tự viết sẽ phải làm lại: chọn ngôn ngữ theo thiết bị, chuỗi
fallback giữa các ngôn ngữ, số nhiều theo quy tắc của gói (Hermes **không** có
`Intl.PluralRules`), đổi ngôn ngữ lúc chạy không cần khởi động lại, và một CLI trích xuất khóa
từ mã nguồn rồi đồng bộ ba file JSON.

Dự đoán của quyết định gốc đúng: `t(key, params)` là thứ giữ cho việc này không phải sửa từng
màn hình. Cái *thật sự* tốn công không phải 14 file gọi `t`, mà là ba chỗ dưới đây — không chỗ
nào nhìn ra được trước khi bắt tay:

1. **`src/lib/format.ts`**. Nửa số chữ tiếng Việt của ứng dụng không nằm trong danh mục mà
   nằm ở đây, trong các hàm ghép chuỗi lúc chạy: tên thứ, tên tháng, "5 giờ", "cuối tháng".
   Chúng vô hình với `jsx-no-literals` vì không phải JSX.
2. **Khóa động**. `t(preset.key)` và `messageKey` sinh từ tầng miền không được trình quét
   nhìn thấy, nên CLI sẽ xóa những khóa đó khỏi cả ba file như khóa thừa. Xử lý bằng cách
   đặt tên trường là `labelKey`/`messageKey` rồi khai báo thêm một mẫu regex trong
   `i18n-sync.config.json` — app tự nói cho công cụ biết khóa của mình nằm ở đâu.
3. **Danh tính của `t`** — xem L-8 trong *Ràng buộc thư viện phát hiện khi triển khai*
   của [plan.md](./plan.md). Đây là chỗ tốn nhất trong ba chỗ.

Cùng lần chạy đó, CLI xóa 5 khóa chưa bao giờ được dùng (`form.delete`,
`form.notePlaceholder`, `permission.inexactTitle`, `settings.backupUnknown`,
`timeline.loading`). Chúng đã nằm trong danh mục từ đầu và không quy tắc lint nào thấy được:
lint cấm chuỗi viết thẳng, nó không biết khóa nào không ai gọi.

**Đã loại (lần này)**: *`i18next` + `react-i18next`* — phủ được, nhưng kéo theo một hệ sinh
thái plugin cho những thứ SDK đã làm sẵn, và không có phần trích xuất khóa nào ràng buộc được
ba file JSON với mã nguồn. *Tự mở rộng `strings.ts` thành ba object* — rẻ đúng một tuần, rồi
phải tự viết lại phát hiện ngôn ngữ thiết bị, fallback, số nhiều và lưu lựa chọn; và không có
gì bắt ba object phải cùng tập khóa.

---

## R10 · Nhật ký lỗi cục bộ

**Quyết định**: một collection `error_log` trong chính cơ sở dữ liệu, giới hạn cứng **500
bản ghi**, cắt bớt khi ghi. Mỗi mục chứa: mốc thời gian, mã lỗi ổn định, tên thao tác, và
định danh bản ghi liên quan. **Không** chứa tên hay ghi chú công việc.

**Lý do**: FR-055a/b/c yêu cầu ghi mọi lỗi đọc/ghi và lỗi đặt nhắc nhở, có giới hạn dung
lượng, tự xoay vòng, không chứa nội dung công việc, không rời thiết bị. Dùng chính cơ sở dữ
liệu giữ mọi thứ trong một cơ chế lưu trữ và một lần xóa (`deleteScopeData` cho FR-054 dọn
luôn nhật ký). Gói lưu trữ cũng phơi ra `setDiagnosticLogger` với mã lỗi ổn định, nên nguồn
lỗi tầng lưu trữ nối vào đây trực tiếp.

**Ràng buộc thiết kế**: hàm ghi log nhận **mã lỗi và định danh**, không nhận đối tượng công
việc. Ký kiểu như vậy khiến việc vô tình log tên công việc trở thành lỗi biên dịch chứ không
phải chuyện phải nhớ khi review.

**Đã loại**: ghi ra file qua `react-native-fs` (thêm một cơ chế lưu trữ thứ hai phải tự xoay
vòng và tự dọn); Sentry hoặc bất kỳ dịch vụ nào (FR-055c cấm tuyệt đối).

---

## R11 · Trạng thái ứng dụng và cơ chế hoàn tác

**Quyết định**: Không thêm thư viện quản lý state. State cục bộ là mặc định; ba thứ thật sự
dùng chung đi qua ba context hẹp: handle cơ sở dữ liệu, hàng đợi hoàn tác, và vật chủ sheet.
Hoàn tác dùng **xóa mềm rồi xóa cứng**: `softDelete` khi người dùng xóa, `restore` khi hoàn
tác, và một lượt quét lúc khởi động xóa cứng mọi bản ghi còn ở trạng thái xóa mềm.

**Lý do**: Principle VII bắt buộc một nguồn sự thật duy nhất, và ở đây nguồn đó là cơ sở dữ
liệu. Thêm Redux hay Zustand sẽ tạo bản sao thứ hai của cùng dữ liệu và sinh ra đúng loại lỗi
mà nguyên tắc này cấm.

Phần hoàn tác đáng nói vì nó dung hòa hai yêu cầu nhìn qua thì mâu thuẫn:

- FR-046 — ghi xuống bộ nhớ lâu dài **ngay** sau mỗi thao tác, không giữ trong bộ nhớ tạm.
- FR-011a — hoàn tác phải khôi phục công việc **cùng mọi nhắc nhở** về đúng trạng thái trước.
- Edge case đã chốt — đóng ứng dụng trong lúc hoàn tác còn hiệu lực thì việc xóa là **vĩnh
  viễn**, và lần mở sau không được thấy tàn dư nào.

Xóa mềm đáp ứng cả ba: bản ghi rời khỏi mọi truy vấn đọc ngay lập tức (đúng nghĩa "đã xóa"
với người dùng), việc ghi đã xuống đĩa, khôi phục là một thao tác `restore` chứ không phải
dựng lại bản ghi từ bộ nhớ, và lượt quét lúc khởi động biến "đóng app trong lúc chờ" thành
xóa vĩnh viễn đúng như đặc tả.

**Toast phải sống trên navigator**, không thuộc màn hình: FR-011a nói hoàn tác không được
biến mất khi người dùng đổi ngày hay mở màn hình khác. Đặt nó trong `TimelineScreen` là hỏng
yêu cầu này. Đó là lý do `UndoProvider` nằm ở `src/app/providers/`.

**Đã loại**: giữ bản ghi đã xóa trong bộ nhớ 5 giây rồi mới ghi (vi phạm FR-046, và mất dữ
liệu nếu hệ điều hành thu hồi tiến trình); Redux/Zustand (bản sao thứ hai của nguồn sự thật).
