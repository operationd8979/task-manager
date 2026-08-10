# Quickstart — kiểm chứng tính năng

Kịch bản chạy được để chứng minh tính năng hoạt động đầu-cuối. Đây **không** phải bộ kiểm
thử: mỗi mục dưới đây là một phép thử thủ công hoặc một lệnh, gắn với tiêu chí thành công mà
nó chứng minh.

## Điều kiện tiên quyết

```bash
node --version        # cần >= 22.11.0
npm install
cd ios && pod install && cd ..
```

Kiểm tra ba thứ mà bộ khung hiện tại **chưa** có trước khi bắt đầu:

```bash
node -p "require('./package.json').dependencies['react-native-unistyles'] ?? 'CHƯA KHAI BÁO'"
node -p "require('./package.json').dependencies['@notifee/react-native'] ?? 'CHƯA CÀI'"
ls android/app/src/main/res/xml/data_extraction_rules.xml 2>/dev/null || echo "CHƯA CÓ quy tắc loại trừ sao lưu"
```

Cả ba đều phải có trước khi tính năng chạy đúng. Cái thứ ba trượt im lặng: ứng dụng vẫn chạy,
chỉ là dữ liệu sẽ được Android khôi phục sau khi cài lại, làm hỏng FR-049.

## Chạy

```bash
npm start                 # Metro
npm run android           # hoặc
npm run ios
```

## Kiểm thử tự động

```bash
npm test                  # Jest
npm run lint
npx tsc --noEmit          # bắt buộc pass: strict mode, không any
```

Tầng miền phải chạy được **không cần renderer**. Lệnh dưới đây phải xanh mà không dựng
component nào:

```bash
npx jest src/domain
```

Nếu nó cần một renderer thì ranh giới tầng đã bị vi phạm (Principle II, VIII).

---

## Kịch bản kiểm chứng

### V1 · Lát cắt tối thiểu — tạo và giữ được dữ liệu → SC-003, SC-007

1. Bật **chế độ máy bay**.
2. Mở ứng dụng. Timeline hôm nay hiện sẵn.
3. Tạo ba công việc ở ba khung giờ khác nhau, thuộc hai ngày khác nhau.
4. **Buộc dừng** ứng dụng (không phải chỉ đóng), mở lại.

**Kỳ vọng**: cả ba còn nguyên, đúng ngày, sắp theo giờ tăng dần. Không có màn hình trắng ở
bất kỳ bước nào.

### V2 · Xóa và hoàn tác → FR-011, FR-011a

1. Xóa một công việc. Thông báo có nút HOÀN TÁC xuất hiện.
2. **Chuyển sang ngày khác** trong lúc thông báo còn hiển thị.
3. Bấm HOÀN TÁC.

**Kỳ vọng**: công việc quay lại đầy đủ, kèm nhắc nhở của nó, ở đúng ngày cũ. Thông báo không
được biến mất khi đổi ngày ở bước 2 — đây chính là điều kiện của quyết định D-03.

4. Xóa lại, chờ quá 5 giây. Công việc mất vĩnh viễn.
5. Xóa một công việc khác rồi **buộc dừng ứng dụng ngay** trong vòng 5 giây. Mở lại.

**Kỳ vọng**: công việc đó đã mất, và không có tàn dư nào của thao tác — không thông báo, không
mục nào ở trạng thái nửa vời.

### V3 · Vuốt chuyển ngày và kéo đổi giờ → FR-003a, FR-003c, FR-018a

1. Vuốt ngang ở **vùng trống** của timeline → chuyển ngày.
2. Vuốt ngang **bắt đầu đè lên một dòng công việc** → vẫn chuyển ngày, công việc không đổi gì.
3. Kéo **tay cầm** của một công việc theo chiều dọc → đổi giờ, bám lưới 15 phút, nhãn xem
   trước hiện trong lúc kéo.
4. Bắt đầu vuốt **ngang** từ trong vùng tay cầm → thao tác kéo thắng, **không** chuyển ngày.

Bước 4 là ranh giới dễ hỏng nhất của tính năng. Nếu nó cư xử theo hướng vuốt thay vì theo
vùng chạm, thao tác chéo sẽ cho kết quả ngẫu nhiên.

### V4 · Điều chỉnh riêng không lan sang buổi khác → SC-009, FR-027, FR-032

1. Tạo công việc lặp vào Thứ Hai lúc 09:00, không đặt ngày kết thúc.
2. Duyệt tới Thứ Hai tuần sau, đổi giờ buổi đó sang 11:00, chọn **"Chỉ lần này"**.
3. Kiểm tra ba Thứ Hai kế tiếp.

**Kỳ vọng**: chỉ buổi đã sửa ở 11:00; mọi buổi khác vẫn 09:00; quy tắc gốc không đổi. Buổi đã
sửa mang nhãn "✎ ĐÃ CHỈNH RIÊNG".

4. Tick hoàn thành một buổi bất kỳ.

**Kỳ vọng**: **không** hỏi phạm vi (FR-026a); các buổi sau vẫn đang thực hiện; buổi vừa tick
**không** mọc thêm nhãn "✎ ĐÃ CHỈNH RIÊNG" — tick không phải là chỉnh riêng.

### V5 · Điều chỉnh riêng đặt giá trị rỗng có chủ đích → R7, hợp đồng recurrence

Đây là phép thử phân biệt "vắng mặt" với "null", và là chỗ mất dữ liệu im lặng dễ xảy ra nhất.

1. Tạo quy tắc lặp có **giờ kết thúc mặc định 10:00**.
2. Ở một buổi cụ thể, xóa giờ kết thúc để buổi đó chỉ còn là một mốc giờ. Chọn "Chỉ lần này".
3. Đóng và mở lại ứng dụng, quay lại đúng buổi đó.

**Kỳ vọng**: buổi đó **vẫn không có** giờ kết thúc. Nếu nó âm thầm nhận lại 10:00 thì tầng
hợp nhất đang xử lý chỉ hai trạng thái giá trị thay vì bốn.

### V6 · Nhắc nhở khi ngoại tuyến và khi thiếu quyền → SC-008, FR-036a/b, FR-039

1. Bật chế độ máy bay. Tạo công việc có nhắc nhở sau 2 phút.
2. Quyền được hỏi **đúng lúc này**, không phải lúc mở ứng dụng lần đầu. Với người chưa từng
   bật nhắc nhở, quyền hiện thông báo được hỏi ở lần lưu công việc đầu tiên (FR-036d) — và
   hộp thoại đó **không** được chặn hay làm chậm việc lưu.
3. **Từ chối** quyền báo thức chính xác (Android).

**Kỳ vọng**: công việc vẫn lưu được; dòng công việc hiện nhãn "· CÓ THỂ TRỄ"; có lối mở cài
đặt hệ thống.

4. Buộc dừng ứng dụng. Chờ tới giờ.

**Kỳ vọng**: thông báo vẫn xuất hiện (trong vòng 15 phút ở đường gần đúng). Chạm vào nó mở
đúng ngày và làm nổi đúng công việc.

5. Cấp lại quyền, tạo công việc mới có nhắc.

**Kỳ vọng**: thông báo xuất hiện trong khoảng ±1 phút.

6. Xóa một công việc có nhắc nhở chưa phát, rồi chạm vào một thông báo cũ đã bắn của nó.

**Kỳ vọng**: ứng dụng mở ở timeline hôm nay, **không** báo lỗi hệ thống.

### V6a · Hai tông thông báo → FR-033a, FR-033b, FR-008

1. Tạo hai công việc cách hiện tại vài phút: một **bật** nhắc nhở, một **không**.
2. Đọc dòng chữ dưới công tắc khi nó đang tắt.

**Kỳ vọng**: form nói rõ rằng vẫn sẽ có thông báo vào giờ bắt đầu, chỉ không có chuông. Một
công tắc ghi "tắt" mà không giải thích gì thì mặc nhiên hứa rằng sẽ không có gì xảy ra.

3. Buộc dừng ứng dụng. Chờ tới giờ của cả hai.

**Kỳ vọng**: **cả hai** thông báo đều xuất hiện. Công việc bật nhắc nhở phát chuông trước giờ
bắt đầu theo mốc đã chọn; công việc kia hiện im lặng vào **đúng** giờ bắt đầu, không âm thanh,
không rung.

4. Vào cài đặt thông báo của ứng dụng trong hệ điều hành.

**Kỳ vọng**: hai kênh riêng — "Nhắc nhở công việc" và "Thông báo công việc". Tắt chuông của
kênh này **không** ảnh hưởng kênh kia (FR-033b).

5. Bật chế độ Không làm phiền, chờ tới giờ của cả hai.

**Kỳ vọng**: chuông nhắc nhở vẫn phát; thông báo im lặng bị chặn theo đúng Không làm phiền.

*Giới hạn đã biết*: ở chế độ **im lặng** (khác Không làm phiền) thì chuông không kêu. Đây là
giới hạn nền tảng đã ghi trong Out of Scope, không phải lỗi của bước này.

### V7 · Hòa giải lịch nhắc là idempotent → FR-041

1. Tạo vài công việc có nhắc nhở.
2. Mở lại ứng dụng ba lần liên tiếp.
3. Đọc nhật ký chẩn đoán của phép hòa giải.

**Kỳ vọng**: lần chạy thứ hai và thứ ba **không** gọi đặt hay hủy lần nào. Có gọi nghĩa là
phép hòa giải đang hủy sạch rồi đặt lại, và nó sẽ tạo khoảng trống không có nhắc nhở nào.

### V7a · Sửa công việc đã lưu phải đổi được thông báo → FR-041a, SC-020

Bước này bắt đúng cái lỗi mà một phép hòa giải chỉ-so-định-danh sẽ để lọt.

1. Tạo một công việc lúc 09:00, bật nhắc trước 15 phút. Đóng và mở lại ứng dụng.
2. Sửa nó sang 11:00. Buộc dừng ứng dụng, chờ tới 08:45 và 10:45.

**Kỳ vọng**: **không** có gì phát lúc 08:45; chuông phát lúc 10:45. Nếu vẫn nghe chuông lúc
08:45 thì phép hòa giải đang so định danh — định danh không đổi khi công việc dời giờ.

3. Mở lại, **tắt** nhắc nhở của chính công việc đó. Buộc dừng, chờ tới 10:45 và 11:00.

**Kỳ vọng**: không có gì lúc 10:45; thông báo im lặng lúc 11:00.

4. Bật lại nhắc nhở, chờ tới 10:45.

**Kỳ vọng**: chuông trở lại đúng 10:45.

### V8 · Chế độ hiển thị ba giá trị → FR-052b, FR-052c

1. Cài đặt → Chế độ → **Tối**. Giao diện đổi ngay.
2. Đóng và mở lại. Vẫn tối, bất kể hệ thống đang ở chế độ nào.
3. Đổi về **Tự động**. Đổi chế độ sáng/tối **của hệ thống** trong lúc ứng dụng đang mở.

**Kỳ vọng**: ứng dụng đổi theo ngay, không cần khởi động lại.

4. Chọn **Sáng** trên máy đang ở chế độ tối, buộc dừng, mở lại.

**Kỳ vọng**: không có nhịp nháy tối→sáng khi khởi động (R6).

### V9 · Trạng thái bất đồng bộ → SC-014, Principle IV

Với **mỗi** màn hình có đọc dữ liệu (Timeline, sheet chọn ngày, Cài đặt):

1. Trạng thái đang tải hiện skeleton **đúng hình dạng nội dung thật**, không phải vòng xoay
   trên nền trắng.
2. Trạng thái rỗng giải thích và cho hành động thoát ra.
3. Gây lỗi đọc (ví dụ: làm hỏng file cơ sở dữ liệu trên máy thử) → thông báo dễ hiểu, có
   THỬ LẠI, **không** mã lỗi kỹ thuật.

Không màn hình nào được rơi vào trắng hoặc không phản hồi.

### V10 · Hiệu năng → SC-004, SC-005, SC-006

1. Nạp 5.000 công việc rải trên nhiều ngày.
2. Mở timeline một ngày → **< 0,5 giây**.
3. Tick trạng thái → phản hồi **< 0,1 giây** (ô tick đổi tức thì).
4. Cuộn liên tục 10 giây trên thiết bị cấu hình thấp → **≥60 FPS**, dưới 1% khung bị bỏ.

Bước 4 là dữ liệu quyết định R8: `FlatList` giữ được thì dừng ở đó, không thì mới cân nhắc
thêm phụ thuộc ảo hóa.

### V11 · Tiếp cận → FR-057, Principle V

1. Bật trình đọc màn hình. Duyệt một dòng công việc.

**Kỳ vọng**: đọc trọn một câu có nghĩa, ví dụ *"09:00 đến 10:00, Gọi khách hàng Minh, quá hạn
5 giờ, buổi của công việc lặp lại, nhắc trước 15 phút."* Mọi thao tác đều tới được **không
cần cử chỉ**.

2. Đặt cỡ chữ hệ thống lên mức lớn nhất.

**Kỳ vọng**: không chữ nào bị cắt, không bố cục nào tràn, hàng nhãn tự xuống dòng. Trần phóng
dừng ở 170%.

3. Kiểm tra mọi vùng chạm ≥ 44×44 pt.

### V12 · Quyền riêng tư và vòng đời dữ liệu → SC-011, SC-015, FR-049

1. Tạo dữ liệu, gỡ ứng dụng, cài lại.

**Kỳ vọng**: **không** công việc nào được khôi phục. Trên Android, phép thử này chỉ có ý
nghĩa khi hai file quy tắc sao lưu đã được ship — nếu chưa, nó sẽ đậu vì lý do sai (thiết bị
chưa kịp sao lưu) và lỗi sẽ lộ ra ở máy người dùng thật.

2. Đọc nhật ký lỗi cục bộ sau khi gây vài lỗi.

**Kỳ vọng**: có mục ghi nhận; **không** mục nào chứa tên hay ghi chú công việc; số byte dữ
liệu chẩn đoán rời khỏi thiết bị bằng **0**.

3. Kiểm tra quyền mà ứng dụng khai báo.

**Kỳ vọng**: chỉ có quyền thông báo và báo thức chính xác. `WRITE_EXTERNAL_STORAGE` mà
`react-native-fs` tự merge vào **phải đã bị gỡ** (R5, FR-058).

---

## Bảng đối chiếu

| Kịch bản | Chứng minh |
|---|---|
| V1 | SC-003, SC-007, FR-001, FR-007 |
| V2 | FR-011, FR-011a, FR-046 |
| V3 | FR-003a, FR-003b, FR-003c, FR-018a |
| V4 | SC-009, FR-026a, FR-027, FR-032 |
| V5 | FR-029, hợp đồng recurrence — bốn trạng thái giá trị |
| V6 | SC-008, SC-010, FR-036a, FR-036b, FR-039, FR-043 |
| V7 | FR-041, FR-042 |
| V8 | FR-052b, FR-052c |
| V9 | SC-014, FR-055 |
| V10 | SC-004, SC-005, SC-006 |
| V11 | FR-057, FR-002 |
| V12 | SC-011, SC-015, FR-049, FR-055b, FR-058 |
