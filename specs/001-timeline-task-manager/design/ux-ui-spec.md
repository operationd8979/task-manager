# Spec UX/UI

## 1. Giải phẫu dòng công việc

Đây là thành phần khó nhất: năm thông tin phải cùng tồn tại mà vẫn đọc lướt được. Quy tắc
chốt — **bình thường thì nén, bất thường thì thành chữ**. Không thuộc tính nào được truyền
tải chỉ bằng màu (Constitution V, `spec.md` FR-016).

| Thuộc tính | Vật mang hình dạng | Vật mang chữ | Màu (tầng phụ) |
|---|---|---|---|
| Đang thực hiện | Ô vuông rỗng viền 2px, 22×22 | Không cần nhãn — đây là mặc định | Không |
| Hoàn thành | Ô vuông đầy + dấu ✓ | Tên gạch ngang; nhãn HOÀN THÀNH | Nền ô = `primary`; cả dòng giảm còn 72% độ đậm |
| Quá hạn | Không đổi vị trí, không đổi chiều cao | Nhãn "QUÁ HẠN 5 giờ" — **luôn kèm khoảng trễ cụ thể** | `accentInk` trên nền `accentSoft` |
| Là buổi của chuỗi | Ký hiệu ⟳ | "LẶP T2–T6" — ký hiệu **không bao giờ đứng một mình** | Không |
| Đã chỉnh riêng | Ký hiệu ✎ | "ĐÃ CHỈNH RIÊNG" | Không |
| Nhắc nhở bật | **Không** có biểu tượng chuông | Mốc cụ thể: "NHẮC −10′" hoặc "NHẮC ĐÚNG GIỜ" | Không |
| Nhắc có thể trễ | Viền nhãn đổi sang `accentInk` | Nối thêm "· CÓ THỂ TRỄ" — chữ, không phải dấu ⚠ đơn độc | `accentInk` |

Ô tick 22×22 là **hình vẽ**, vùng chạm bao quanh nó vẫn phải đủ 44×44.

## 2. Thang chữ và số đo

### Thang chữ

| Mẫu | Cỡ | Đậm | Vai trò | Token |
|---|---|---|---|---|
| Thứ Hai, 03/08 | 24 | 800 | h1 — tiêu đề rỗng/lỗi | `typography.headline` |
| Công việc mới | 20 | 800 | h2 | `typography.title` |
| Tiêu đề sheet | 17 | 800 | title | `appType.sheetTitle` |
| Gọi khách hàng Minh chốt hợp đồng | 15 | 600 | body — tên công việc | `typography.body` |
| Phòng khám 12 Lý Tự Trọng | 13 | 400 | small — ghi chú, mô tả | `typography.label` |
| QUÁ HẠN 5 GIỜ · NHẮC −10′ | 11 | 700 | caption — nhãn trạng thái | `typography.caption` |
| 09:00 | 13 | 800 | cột giờ — **`tabular-nums` bắt buộc** | `appType.clock` |

Chi tiết ánh xạ và lý do phải override thang mặc định của SDK: xem
[design-system.md](./design-system.md) mục 4.

### Vùng chạm và mật độ

| Chỉ số | Giá trị |
|---|---|
| Vùng chạm tối thiểu | **44 × 44 pt** |
| Chiều cao dòng (1 nhãn) | ≥ 76 pt |
| Chiều cao dòng (3 nhãn) | ≥ 92 pt |
| Thanh hành động chính | 56 pt, cố định đáy |
| Đệm cuối danh sách | 88 pt |
| Khoảng cách giữa 2 vùng chạm | ≥ 8 pt |
| Trần phóng cỡ chữ hỗ trợ | **170%** (`maxFontSizeMultiplier={1.7}`) |
| Bán kính bo góc | **0** — toàn hệ thống |

## 3. Ma trận trạng thái bắt buộc

Constitution IV yêu cầu đủ năm trạng thái cho mọi thao tác bất đồng bộ. Bảng này là bản
triển khai cụ thể — mỗi hàng là một trạng thái phải có thiết kế, không được suy ra lúc code.

| Cấp | Trạng thái | Hiển thị | Lối thoát / hành động |
|---|---|---|---|
| Màn hình | Đang tải | Skeleton đúng hình dạng dòng thật (cột giờ, ô tick, 2 dải chữ), nhịp opacity .55→1 trong 1.4s | Tự chuyển khi đọc xong; quá 3 giây thì thêm dòng "vẫn đang đọc dữ liệu" |
| Màn hình | Có dữ liệu | Danh sách theo giờ tăng dần, cụm chồng giờ có tiêu đề | — |
| Màn hình | Rỗng | Tiêu đề 20pt + một câu nêu đúng ngày đang xem + nút tạo | Tạo công việc · mũi tên đổi ngày |
| Màn hình | Lỗi đọc dữ liệu | Kẻ accent 2px, câu trấn an "dữ liệu vẫn nằm trên máy, chưa mất", **không mã lỗi** | THỬ LẠI (bắt buộc) · Mở Cài đặt |
| Màn hình | Quyền thông báo bị từ chối | Banner trong luồng ngay dưới thanh ngày, **không phải modal** | MỞ CÀI ĐẶT · banner không đóng được vì trạng thái vẫn đúng |
| Dòng | Nhắc có thể bị trễ | Nhãn "NHẮC −10′ · CÓ THỂ TRỄ", viền `accentInk` | Chạm dòng → form → Cấp quyền |
| Dòng | Đang kéo | Nền dòng đổi sang `surface` + nhãn "Thả để đổi sang 10:15" | Thả ra ngoài = hủy |
| Dòng | Vừa xóa, còn hoàn tác | Dòng biến mất ngay; toast nổi trên thanh hành động, kẻ accent 2px, nút HOÀN TÁC vùng chạm 44pt, sống ≥5 giây | HOÀN TÁC · tự đóng khi hết giờ |
| Sheet lịch | Đang đếm ngày bận | Lưới tháng hiện đủ, ô ngày dùng được ngay; chấm ngày bận là lớp riêng, hiện dạng skeleton nhịp 1.4s cho tới khi đếm xong | Chọn ngày được ngay, không phải chờ chấm |
| Sheet lịch | Lỗi đọc dữ liệu | Lưới tháng vẫn dùng được; dải chữ dưới tiêu đề: "Chưa đếm được ngày bận" + THỬ LẠI. Không chặn việc chọn ngày | THỬ LẠI · chọn ngày · × |
| Sheet lịch | Tháng không có công việc nào | Không có chấm nào — đây là trạng thái hợp lệ, **không** hiện thông báo rỗng | — |
| Cài đặt | Đang tải | Skeleton theo đúng hình dạng từng hàng; nhãn trạng thái quyền và số mục đang lưu là hai chỗ hiện sau cùng | Tự chuyển khi đọc xong |
| Cài đặt | Lỗi đọc dữ liệu | Các hàng đọc được vẫn hiện; hàng hỏng thay giá trị bằng "Chưa đọc được" + THỬ LẠI ngay tại hàng đó | THỬ LẠI theo từng hàng |
| Cài đặt | Đang lưu một tùy chọn | Điều khiển hiện giá trị mới ngay, khóa cho tới khi ghi xong. Ghi hỏng thì trả về giá trị cũ kèm dòng nói rõ chưa lưu được | Tự kết thúc · THỬ LẠI |
| Sheet phạm vi | Đang đếm số buổi | Hai khối lựa chọn hiện đủ nhưng **khóa**; dòng đếm là skeleton. Không cho chọn khi chưa biết hậu quả | Tự mở khóa khi đếm xong · HỦY |
| Sheet phạm vi | Không đếm được | Hai khối mở khóa, dòng đếm thay bằng "Không đếm được số buổi bị ảnh hưởng" — nói thật thay vì hiện số sai | Vẫn chọn được · HỦY |
| Xác nhận | Xóa toàn bộ dữ liệu | Hộp thoại có chữ, nêu rõ **không có hoàn tác**, kèm số mục sẽ mất | XÓA · HỦY |
| Form | Tạo mới | Tiêu đề "Công việc mới", không có nút xóa, giá trị mặc định đã điền sẵn | × · vuốt xuống |
| Form | Đang sửa | Tiêu đề "Sửa công việc", có nút XÓA viền accent | × |
| Form | Đang lưu | Nút đổi nhãn "ĐANG LƯU…", khóa nút, ô nhập vẫn đọc được | Tự kết thúc |
| Form | Lỗi từng trường | Viền trái 3px accent trên **đúng ô sai** + câu nói cách sửa, không phải "không hợp lệ" | Sửa ô đó |
| Form | Lưu thất bại | Khối lỗi trên đầu sheet, nội dung vừa nhập giữ nguyên **100%** | THỬ LƯU LẠI · xem dung lượng |
| Form | Xác nhận xóa | Sheet cấp 3, nói rõ có 5 giây hoàn tác | XÓA · GIỮ LẠI |
| Form | Còn thay đổi chưa lưu | Sheet 3 lựa chọn | Lưu rồi thoát · Tiếp tục sửa · Thoát và bỏ thay đổi |
| Sheet lặp lại | Không lặp (mặc định) | Segmented ở "Không lặp"; toàn bộ phần chọn thứ, ngày bắt đầu và ngày kết thúc **ẩn hẳn**, không phải làm mờ — không có gì để đọc thì không chiếm chỗ | XONG · × |
| Sheet lặp lại | Có lặp, chưa chọn thứ nào | Viền trái 3px accent trên hàng 7 nút thứ + câu ngay dưới: "Chọn ít nhất một thứ trong tuần." Nút XONG **vẫn bấm được** — bấm sẽ cuộn tới và làm nổi hàng thứ, không im lặng | Chọn một thứ · quay về "Không lặp" |
| Sheet lặp lại | Có lặp, hợp lệ | Khối xem trước bằng lời cập nhật theo từng lần chạm, ngay trên nút XONG | XONG |
| Sheet lặp lại | Ngày kết thúc trước ngày bắt đầu | Viền trái 3px accent trên hàng ngày kết thúc + câu nói cách sửa: "Ngày kết thúc phải từ 03/08 trở đi." Xem trước bằng lời đổi thành "Chưa tạo được buổi nào" | Sửa một trong hai ngày |
| Thao tác dòng | Việc thường | Bốn mục: Đổi giờ · Di chuyển · Sửa · Xóa | Chọn một mục · vuốt xuống · × |
| Thao tác dòng | Buổi của chuỗi | Cùng bốn mục, nhãn cuối đổi thành "Bỏ qua buổi này"; thêm dòng phụ "Thuộc công việc lặp T2–T6" để người dùng biết mình đang đứng ở đâu trước khi chọn | Chọn một mục · vuốt xuống · × |
| Đổi giờ / Di chuyển | Đang chọn giờ | Chip giờ hay dùng ở trên, bộ chọn giờ hệ thống ở dưới; giá trị hiện tại được chọn sẵn | ÁP DỤNG · × |
| Đổi giờ / Di chuyển | Đang chọn ngày | Bộ chọn ngày hệ thống, kèm câu "Đây là nơi duy nhất đổi được ngày" — kéo-thả không làm được việc này (FR-018b) | ÁP DỤNG · × |
| Đổi giờ / Di chuyển | Giờ kết thúc ≤ giờ bắt đầu | Nút ÁP DỤNG khóa + câu nói cách sửa ngay dưới cặp giờ | Sửa giờ · × |

## 4. Spec thành phần

### Dòng công việc
- Bốn vùng chạm tách bạch: ô tick (44), thân dòng mở form (co giãn), tay cầm kéo ⣿ (44), nút ⋯ (44).
- **Không dùng vuốt ngang để xóa**: xung đột với vuốt back của iOS và không có lối tương đương cho trình đọc màn hình.
- Chiều cao do nội dung quyết định, không cắt dòng tên. Ở 170% cỡ chữ, hàng nhãn tự xuống dòng.
- Nhãn cho trình đọc màn hình đọc trọn: *"09:00 đến 10:00, Gọi khách hàng Minh, quá hạn 5 giờ, buổi của công việc lặp lại, nhắc trước 15 phút."*

> Lệch với Constitution "Mandatory Delivery Baselines" — mục Lists nói *"Swipe actions are
> provided where a per-item action is meaningful"*. Ở đây vuốt ngang bị loại có chủ đích; lý
> do ghi ở trên. Ghi vào Complexity Tracking của plan.

### Cụm chồng giờ
- Gom các việc có khoảng giờ giao nhau; tiêu đề cụm "N VIỆC CHỒNG GIỜ hh:mm–hh:mm" **dính khi cuộn**.
- Dải dọc 3px accent chạy suốt cụm — chỗ **duy nhất** trong timeline dùng dải màu, và luôn có chữ đi kèm.
- **Không cột song song**: ở bề ngang 390pt, 3 việc chồng giờ thành 3 cột 100pt → cắt chữ và vùng chạm tụt dưới 44pt.
- Việc không có giờ kết thúc chỉ vào cụm khi có việc khác **bao trùm** mốc đó — tránh cụm giả.

### Bottom sheet
- Đỉnh cách mép trên tối thiểu 24pt để luôn thấy timeline phía sau.
- Tiêu đề dính, nút × 44×44 ở góc phải trên — một tay với tới được ở máy 6.7 inch.
- Nút chính dính đáy sheet, không trôi theo nội dung.
- Sheet phạm vi áp dụng là **loại chặn**: không vuốt xuống, không chạm nền để đóng — chỉ có ba lối ra rõ ràng.

### Toast + Hoàn tác
- Nổi **trên** thanh hành động, sống **ít nhất 5 giây**, kẻ accent 2px ở cạnh trên.
- Câu toast luôn nhắc lại phạm vi đã áp dụng: *"Chỉ lần này: đã đổi giờ sang 10:15."*
- Nút HOÀN TÁC là vùng chạm 44pt, không phải chữ nhỏ.
- **Sống xuyên qua điều hướng (FR-011a)**: đổi ngày, mở sheet, vào Cài đặt đều không được
  làm toast biến mất sớm. Đây là điều kiện của quyết định D-03, không phải chi tiết trau
  chuốt — toast bị nuốt nghĩa là mất luôn cơ chế bảo vệ đã thay thế hộp thoại xác nhận.
- Hoàn tác một thao tác xóa phải khôi phục cả **nhắc nhở** về đúng trạng thái trước đó.
- Thay thế hoàn toàn hộp thoại xác nhận cho các hành động một buổi. Ngoại lệ duy nhất là
  xóa toàn bộ dữ liệu (FR-011b).

### Chip chọn giá trị
- Dùng cho mốc nhắc, thời lượng, preset thứ trong tuần — **mọi miền giá trị hữu hạn** (Constitution I).
- Cao 44pt kể cả khi chữ ngắn; trạng thái chọn = nền đặc + chữ đảo màu + `fontWeight: 800`, **không chỉ đổi màu**.
- `accessibilityState={{ selected: true }}` thay vì dựa vào màu để báo trạng thái chọn.

### Công tắc nhắc nhở
- Kèm nhãn chữ "Nhắc nhở bật / tắt" — người dùng không phải suy ra từ vị trí nút gạt.
- Bật lần đầu là **điểm duy nhất** xin quyền hệ thống (`spec.md` FR-036a).
- Khi thiếu quyền chính xác, khối cảnh báo hiện ngay dưới, kèm liên kết Cấp quyền — **không phải toast biến mất**.

## 5. Interaction notes

### 5.1 Cử chỉ

| | |
|---|---|
| **Kéo tay cầm ⣿** | Chỉ tay cầm mới bắt đầu kéo, **không phải cả dòng** — nếu không sẽ tranh chấp với cuộn dọc. Bám lưới 15 phút, ngưỡng bắt đầu 8pt, nhãn xem trước "Thả để đổi sang 10:15" hiện trong lúc kéo. Thả ngoài vùng ngày = hủy, không ghi. |
| **Không kéo xuyên ngày** | Đã chốt (`spec.md` FR-018b). Cả nhãn trong menu ⋯ lẫn câu phụ trong sheet Di chuyển đều nói rõ bằng chữ để người dùng thôi thử. |
| **Vuốt ngang → chuyển ngày** | **FR-003a.** Vuốt sang trái = ngày sau, sang phải = ngày trước. Nhận trên **toàn bộ** vùng timeline, kể cả khi bắt đầu đè lên một dòng — cử chỉ ngang chỉ mang đúng một ý nghĩa trong màn hình này. Ngưỡng kích hoạt 64pt hoặc vận tốc đủ lớn; dưới ngưỡng thì nội dung trượt về chỗ cũ. Trong lúc vuốt, thanh ngày hiện ngày đích để người dùng biết mình sắp đi đâu trước khi thả. |
| **Ưu tiên so với kéo đổi giờ** | **FR-003c.** Vuốt bắt đầu trong vùng chạm của tay cầm ⣿ thuộc về thao tác kéo, không chuyển ngày. Ngoài vùng đó, cử chỉ ngang luôn là chuyển ngày. Ranh giới là vùng chạm 44pt của tay cầm, không phải hướng vuốt — phân biệt bằng hướng sẽ hỏng khi ngón tay đi chéo. |
| **Không vuốt ngang trên dòng để thao tác** | **FR-003b.** Không hành động nào của riêng một công việc kích hoạt bằng cử chỉ. Mọi hành động nằm trong ⋯. Ngoài lý do cử chỉ ngang đã có chủ khác, vuốt-để-xóa còn xung đột với vuốt back của iOS và không có lối tương đương cho trình đọc màn hình. |
| **Vuốt xuống** | Đóng sheet — trừ sheet phạm vi áp dụng. |
| **Vuốt ngang khi sheet đang mở** | Cử chỉ chuyển ngày thuộc về timeline. Sheet đang mở giữ cử chỉ của nó và **không** chuyển ngày phía sau — nếu không, người dùng đóng sheet ra sẽ thấy mình ở một ngày khác mà không hiểu tại sao. |
| **Chạm giữ** | Không gán chức năng nào — người dùng đang bận không nên phải giữ chờ. |

### 5.2 Lối thay thế không cần cử chỉ

| | |
|---|---|
| **Ngang hàng, không phải hạng hai** | Mọi việc kéo-thả làm được đều có trong ⋯ → "Đổi giờ trong ngày", với chip giờ hay dùng và bộ chọn giờ hệ thống. Cùng đi qua đúng sheet phạm vi như khi kéo. (`spec.md` FR-018c) |
| **Trình đọc màn hình** | Tay cầm kéo có nhãn "Kéo để đổi giờ [tên việc]. Hoặc dùng nút Thao tác khác → Đổi giờ." Ô tick có nhãn động theo trạng thái. **Không có thao tác nào chỉ tồn tại dưới dạng cử chỉ.** |
| **Bàn phím ngoài** | Thứ tự tiêu điểm trong dòng: ô tick → thân dòng → tay cầm → ⋯. Vòng tiêu điểm bị khóa trong sheet đang mở. |
| **Focus ring** | 2px `primary`, offset 2px — không dùng ring xanh mặc định của hệ thống. |

### 5.3 Chuyển động

| | |
|---|---|
| **Ngân sách thời lượng** | Sheet vào 160ms, ra 120ms; toast 120ms. **Không hiệu ứng nào vượt 200ms** — app này mở nhiều lần mỗi ngày, hoạt ảnh dài sẽ thành phiền. |
| **Không hoạt ảnh khi cuộn** | Không đổ bóng động, không parallax, không hiệu ứng xuất hiện từng dòng. Danh sách phải giữ 60 FPS trên máy yếu (Constitution VI, `spec.md` SC-006). |
| **Đánh dấu xong** | Ô tick đổi **tức thì (0ms)**, gạch ngang tên trong 120ms. Phản hồi phải nhanh hơn cảm giác của ngón tay. |
| **Giảm chuyển động** | Tôn trọng cài đặt hệ thống: sheet chuyển thành hiện/ẩn tức thì, **giữ nguyên mọi thông tin**. |

### 5.4 Phản hồi rung

| Mức | Khi nào |
|---|---|
| Nhẹ | Bắt đầu kéo, mỗi lần bám sang nấc 15 phút |
| Trung bình | Đánh dấu hoàn thành, áp dụng phạm vi thành công |
| Cảnh báo | Lưu thất bại, lỗi kiểm tra dữ liệu |
| *(không rung)* | Chỉ điều hướng |

### 5.5 Hiệu năng — 5.000 công việc, máy yếu

| | |
|---|---|
| **Sinh buổi theo ngày** | Chỉ tính lần xuất hiện cho ngày đang xem, dựng sẵn ngày liền trước và liền sau. **Không duyệt toàn bộ chuỗi khi cuộn.** |
| **Danh sách ảo hóa** | Chiều cao dòng suy ra từ cỡ chữ hiện tại và **đo một lần cho mỗi biến thể**, để danh sách ước lượng được chiều cao mà không dựng hết. (Constitution VI) |
| **Chấm ngày bận trong lịch** | Đếm sẵn theo tháng khi mở sheet, không truy vấn từng ô. |
| **Ghi dữ liệu** | Ghi ngay khi tick, **không gộp lô** — người dùng có thể tắt app bất cứ lúc nào và không có đồng bộ nào cứu lại. (`spec.md` NFR-002, FR-046) |

### 5.6 Ngôn ngữ và nội dung

| | |
|---|---|
| **Chỉ tiếng Việt** | Không chuỗi tiếng Anh lọt lưới, kể cả trong thông báo lỗi và nhãn trình đọc màn hình. Mọi chuỗi lấy từ danh mục tập trung (`spec.md` FR-058a). |
| **Lỗi nói cách sửa** | *"Giờ kết thúc phải sau 09:00. Bỏ trống nếu chỉ là một mốc giờ."* — không dùng "Dữ liệu không hợp lệ". |
| **Không mã lỗi kỹ thuật** | Không hiện tên ngoại lệ, không mã số. Người dùng không có ai để báo lỗi cho. |
| **Thời gian nói bằng lời** | *"QUÁ HẠN 5 giờ"* thay vì dấu chấm than; *"nhắc trước 10 phút"* thay vì "−10". |
