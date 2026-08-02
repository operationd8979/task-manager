# Quyết định còn bỏ ngỏ — chốt trước khi chạy `/speckit.plan`

Sáu quyết định dưới đây chưa có câu trả lời trong `spec.md`, hoặc design và `spec.md` đang
nói khác nhau. **D-01, D-02, D-03 làm đổi luồng người dùng**, không chỉ đổi hình — chọn sai
thì phải sửa cả tasks. D-04, D-05, D-06 đổi hình hoặc đổi chi tiết triển khai.

---

## D-01 · Tick một buổi lặp có hỏi phạm vi không?

**Xung đột thật.** `spec.md` FR-026 viết: *"Khi người dùng chỉnh sửa, di chuyển hoặc xóa một
lần xuất hiện… hệ thống MUST yêu cầu chọn phạm vi áp dụng."* Đánh dấu hoàn thành không nằm
trong ba động từ đó, nhưng FR-029 lại cho phép điều chỉnh riêng ghi đè `trạng thái` — nên
đọc chặt thì tick cũng là một dạng ghi lên buổi.

| Phương án | Hệ quả |
|---|---|
| **A — Không hỏi (khuyến nghị)** | Tick luôn ghi vào điều chỉnh riêng của đúng buổi đó. F-1 giữ **1 thao tác**. Khớp `spec.md` FR-032 ("đánh dấu hoàn thành cho một lần xuất hiện MUST KHÔNG làm thay đổi các lần khác") — vì phạm vi *đã* được quy định sẵn là "chỉ lần này", hỏi là thừa. |
| B — Có hỏi | Thao tác thường nhất trong ngày thành 2 bước. Người dùng sẽ bấm bừa nút đầu tiên và ta mất luôn giá trị của việc hỏi. |

**Khuyến nghị: A.** Nếu chọn A, cần sửa `spec.md` FR-026 để nói rõ *"chỉnh sửa, di chuyển
hoặc xóa"* không bao gồm đổi trạng thái, và đổi trạng thái luôn có phạm vi "chỉ lần này".

---

## D-02 · Vuốt ngang trên dòng công việc

**Lệch với Constitution.** Mục "Mandatory Delivery Baselines → Lists" viết *"Swipe actions are
provided where a per-item action is meaningful"*, và Principle I liệt kê swipe trong bộ cử chỉ
native phải dùng. Design **loại bỏ** vuốt ngang.

Lý do loại: xung đột với vuốt-back của iOS ở mép trái, và không có lối tương đương cho trình
đọc màn hình (vi phạm Principle V, vốn là NON-NEGOTIABLE mạnh hơn).

**Khuyến nghị: giữ quyết định của design, ghi vào Complexity Tracking của plan** với đúng lý
do trên — hai nguyên tắc đụng nhau và nguyên tắc tiếp cận thắng.

---

## D-03 · Xóa việc thường: hộp thoại xác nhận hay toast Hoàn tác?

**Xung đột thật.** `spec.md` FR-011: *"hệ thống MUST yêu cầu xác nhận trước khi xóa"*. Design
F-6: việc thường xóa ngay, toast Hoàn tác 5 giây, không hộp thoại.

| Phương án | Hệ quả |
|---|---|
| **A — Toast Hoàn tác (khuyến nghị)** | 1 thao tác thay vì 2. Khả năng phục hồi **cao hơn** hộp thoại: hộp thoại chặn sai lầm trước khi xảy ra, hoàn tác sửa được sai lầm đã xảy ra — với thao tác hiếm, người dùng bấm "Xác nhận" theo phản xạ nên hộp thoại bảo vệ kém hơn thực tế. Cần sửa FR-011. |
| B — Giữ hộp thoại | Đúng chữ `spec.md`, nhưng mâu thuẫn với chính design ở chỗ xóa buổi lặp (đã có sheet phạm vi) → hai kiểu xác nhận khác nhau cho cùng một động tác. |

**Khuyến nghị: A**, kèm điều kiện — toast phải sống đủ 5 giây và **không bị nuốt** khi người
dùng đổi ngày hoặc mở sheet khác. Nếu không đảm bảo được điều đó thì chọn B.

Xóa toàn bộ dữ liệu trong Cài đặt vẫn giữ hộp thoại xác nhận có chữ ở cả hai phương án.

---

## D-04 · Chiến lược khởi động chủ đề: `adaptiveThemes` hay `initialTheme`?

`createUnistylesConfig` bắt chọn đúng một; dùng chung hai cái sẽ bị chặn lúc validate.
`spec.md` FR-056 chỉ nói *"MUST hoạt động đầy đủ ở cả chế độ sáng và chế độ tối"*, không nói
người dùng có đổi được trong app không, và màn hình Cài đặt (S-08 / W-06) **không có** hàng
chọn chủ đề.

**Khuyến nghị: `adaptiveThemes: true`** — theo cài đặt hệ thống, không thêm hàng nào vào Cài
đặt. Nếu sau này muốn cho đổi trong app thì phải tự lưu lựa chọn; gói theme nói rõ việc lưu
đó thuộc về app, không thuộc về gói.

---

## D-05 · Đếm số buổi bị ảnh hưởng khi chuỗi không có ngày kết thúc

Sheet phạm vi (W-04) hiển thị *"Ảnh hưởng 122 buổi"* — con số này là thứ khiến người dùng
hiểu hậu quả. Với chuỗi vô hạn thì đếm tới đâu?

| Phương án | Hệ quả |
|---|---|
| **A — Đếm trong 365 ngày tới, ghi rõ (khuyến nghị)** | *"Ảnh hưởng 122 buổi trong 12 tháng tới, và mọi buổi sau đó."* Trung thực, đếm được, không nói dối về vô hạn. |
| B — Không đếm, chỉ nói "toàn bộ chuỗi" | Mất đúng thứ làm cho sheet có tác dụng. |
| C — Đếm tới ngày kết thúc thật | Không áp dụng được cho chuỗi vô hạn. |

**Khuyến nghị: A**, cùng một mốc 365 ngày cho mọi chuỗi để câu chữ nhất quán.

---

## D-06 · Bộ icon

Spec này dùng ký hiệu chữ (⟳ ✎ ⣿ ✓ ‹ ›) làm chỗ giữ. Cần chốt 6 icon: **kéo, thêm, lịch, cài
đặt, lặp, cảnh báo**, rồi thay đồng loạt.

Ràng buộc khi chọn: mọi icon đều phải có chữ đi kèm (mục 1 của
[ux-ui-spec.md](./ux-ui-spec.md)), nên bộ icon chỉ là lớp trang trí — chọn bộ nào cũng không
làm hỏng khả năng đọc. Ưu tiên bộ nào không kéo thêm dependency nặng.

**Chưa cần chốt để chạy `/speckit.plan`** — có thể để Phase 1 quyết. Ghi ở đây để không quên.

---

## Ngoài ra — hai điều design đã tự chốt, ghi lại để khỏi mở lại

| | |
|---|---|
| **Font hệ thống, không gói font kèm** | `fontFamily: 'System'` — SF trên iOS, Roboto trên Android. Cả hai đủ dấu tiếng Việt, không tốn dung lượng gói, và tự đi theo cỡ chữ hệ thống. Nếu thương hiệu đòi font riêng thì phải gói kèm và tự xử lý cỡ chữ hệ thống — tăng dung lượng và rủi ro dấu tiếng Việt. |
| **Ngưỡng cụm chồng giờ** | Gom mọi khoảng giờ **giao nhau**. Việc không có giờ kết thúc chỉ vào cụm khi có việc khác bao trùm mốc đó — hai mốc giờ trùng khít mà cả hai đều không có giờ kết thúc thì **không** tạo cụm. |
