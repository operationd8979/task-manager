# Quyết định thiết kế

Cập nhật 2026-08-02 sau phiên `/speckit-clarify`. Năm quyết định đầu **đã chốt** và đã được
ghi vào [spec.md](../spec.md); phần ghi lại ở đây là lý do và hệ quả thiết kế, để lần sau
không ai vô tình lật lại. D-06 vẫn mở nhưng không chặn planning.

| | Quyết định | Trạng thái | Requirement |
|---|---|---|---|
| D-01 | Tick buổi lặp không hỏi phạm vi | ✅ Chốt | FR-026a |
| D-02 | Vuốt ngang dành cho chuyển ngày | ✅ Chốt | FR-003a/b/c |
| D-03 | Xóa ngay + Hoàn tác thay xác nhận | ✅ Chốt | FR-011, FR-011a/b |
| D-04 | Chế độ hiển thị ba giá trị | ✅ Chốt | FR-052b/c |
| D-05 | Đếm buổi trong cửa sổ 365 ngày | ✅ Chốt | FR-026b/c |
| D-06 | Bộ icon | ⏸ Hoãn tới Phase 1 | — |

---

## D-01 · Tick một buổi lặp có hỏi phạm vi không? — ✅ **Không hỏi**

Đổi trạng thái luôn ghi vào điều chỉnh riêng của đúng buổi đó, tương đương phạm vi "chỉ lần
này". F-1 giữ **1 thao tác**.

**Lý do**: hỏi mỗi lần sẽ biến thao tác thường nhất trong ngày thành hai bước, và người dùng
sẽ bấm bừa nút đầu tiên — lúc đó việc hỏi mất hết tác dụng bảo vệ mà vẫn giữ nguyên chi phí.

**Đã thay đổi trong spec**: FR-026 thu hẹp còn "chỉnh sửa nội dung, di chuyển hoặc xóa";
FR-026a nói rõ đổi trạng thái không hỏi phạm vi. Xung đột C-1 khép lại.

## D-02 · Vuốt ngang trên dòng — ✅ **Dành cho chuyển ngày, không phải thao tác trên dòng**

Vuốt ngang ở **bất kỳ đâu** trên timeline, kể cả khi bắt đầu đè lên một công việc, đều
chuyển sang ngày trước hoặc ngày sau. Không thao tác nào của riêng một công việc được kích
hoạt bằng cử chỉ.

**Lý do**: đây không phải phương án "giữ hay bỏ" ban đầu mà là cách thứ ba — tiêu cử chỉ
ngang vào việc có giá trị nhất trong một ứng dụng xoay quanh ngày. Đồng thời giải luôn hai
vấn đề của swipe-trên-dòng: xung đột vuốt-back iOS (timeline là màn hình gốc, không có
back), và gánh nặng a11y (nút `‹ ›` trên thanh ngày đã sẵn là lối tương đương không cần cử
chỉ, FR-003).

**Hệ quả cần thiết kế**: xem [ux-ui-spec §5.1](./ux-ui-spec.md). Quan trọng nhất là quan hệ
ưu tiên với tay cầm kéo ⣿ (FR-003c) và hành vi khi một sheet đang mở.

**Còn lại**: xung đột C-3 với Constitution "Lists: swipe actions where meaningful" **vẫn
tồn tại** — chỉ là giờ đã có quyết định. Ghi vào Complexity Tracking của plan: cử chỉ ngang
được cấp cho điều hướng, và Principle V (a11y, NON-NEGOTIABLE) thắng Delivery Baseline.

## D-03 · Xóa việc thường: xác nhận hay hoàn tác? — ✅ **Xóa ngay + Hoàn tác**

**Lý do**: hộp thoại chặn sai lầm *trước* khi xảy ra, hoàn tác sửa sai lầm *đã* xảy ra. Với
thao tác hiếm, người dùng bấm "Xác nhận" theo phản xạ, nên hộp thoại bảo vệ kém hơn vẻ ngoài
của nó. Hoàn tác giữ được 1 thao tác và phục hồi được thật.

**Ràng buộc đi kèm** (FR-011a): hành động hoàn tác sống ít nhất 5 giây, **không bị nuốt khi
người dùng đổi ngày hoặc mở màn hình khác**, và khi dùng phải khôi phục cả nhắc nhở. Đây là
điều kiện của quyết định, không phải chi tiết trang trí — không đảm bảo được thì phương án
này thua hộp thoại.

**Ngoại lệ giữ nguyên**: xóa toàn bộ dữ liệu trong Cài đặt vẫn có bước xác nhận (FR-011b,
FR-054), vì không có hoàn tác và không có bản sao ở đâu.

**Đã thay đổi trong spec**: FR-011 viết lại, thêm FR-011a/b, sửa US-3 mô tả và AC-5/AC-6.
Xung đột C-2 khép lại.

## D-04 · Chế độ sáng/tối — ✅ **Ba giá trị: Tự động | Sáng | Tối**

Mặc định Tự động. Lựa chọn được lưu và áp dụng ngay.

**Đây là phương án ngược với khuyến nghị ban đầu của tài liệu này** (trước đó đề xuất chỉ
theo hệ thống, không thêm hàng nào vào Cài đặt). Quyết định của người dùng thắng.

**Hệ quả kỹ thuật**: `createUnistylesConfig` chỉ nhận một chiến lược khởi động, nên ba giá
trị phải thực hiện qua `UnistylesRuntime` lúc chạy — xem
[design-system.md §5 "Chế độ hiển thị ba giá trị"](./design-system.md). Có một rủi ro nháy
màn hình lúc khởi động cần plan xử lý.

**Hệ quả giao diện**: thêm một hàng vào Cài đặt — xem [wireframes W-06](./wireframes.md).

## D-05 · Đếm buổi bị ảnh hưởng cho chuỗi vô hạn — ✅ **Cửa sổ 365 ngày**

Đếm trong 365 ngày kể từ ngày đang thao tác, và **nói rõ các buổi sau mốc đó cũng bị ảnh
hưởng**. Cùng một mốc cho mọi chuỗi để câu chữ nhất quán.

**Lý do**: con số là thứ khiến người dùng hiểu hậu quả, mạnh hơn mọi câu cảnh báo. Nhưng
trình bày con số đếm được như thể đó là toàn bộ sẽ là nói dối về một chuỗi vô hạn.

**Câu mẫu**: "Ảnh hưởng 122 buổi trong 12 tháng tới, và mọi buổi sau đó."
**Đã thay đổi trong spec**: FR-026b/c.
**Hệ quả**: phép đếm là một thao tác tính toán — cần trạng thái đang tính, xem
[ux-ui-spec §3](./ux-ui-spec.md).

## D-06 · Bộ icon — ⏸ **Hoãn**

Spec dùng ký hiệu chữ (⟳ ✎ ⣿ ✓ ‹ ›) làm chỗ giữ. Cần chốt 6 icon: kéo, thêm, lịch, cài đặt,
lặp, cảnh báo.

**Vì sao hoãn được**: mọi icon đều bắt buộc có chữ đi kèm ([ux-ui-spec §1](./ux-ui-spec.md)),
nên bộ icon chỉ là lớp trang trí — chọn bộ nào cũng không làm hỏng khả năng đọc hay khả năng
tiếp cận. Ưu tiên bộ không kéo thêm dependency nặng.

---

## Hai điều design đã tự chốt, ghi lại để khỏi mở lại

| | |
|---|---|
| **Font hệ thống, không gói font kèm** | `fontFamily: 'System'` — SF trên iOS, Roboto trên Android. Đủ dấu tiếng Việt, không tốn dung lượng gói, tự đi theo cỡ chữ hệ thống. Font riêng sẽ phải gói kèm và tự xử lý cỡ chữ hệ thống. |
| **Ngưỡng cụm chồng giờ** | Gom mọi khoảng giờ **giao nhau**. Việc không có giờ kết thúc chỉ vào cụm khi có việc khác bao trùm mốc đó; hai mốc giờ trùng khít mà cả hai đều không có giờ kết thúc thì **không** tạo cụm. |
