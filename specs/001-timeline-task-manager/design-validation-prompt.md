# Prompt kiểm định UX/UI — dùng trước khi lập kế hoạch triển khai

Nguồn: [spec.md](./spec.md) (bản sau phiên `/speckit-clarify` ngày 2026-08-01).
Cách dùng: sao chép toàn bộ khối bên dưới, dán vào một hội thoại Claude mới.

---

Bạn là senior product designer chuyên ứng dụng mobile. Nhiệm vụ của bạn là **kiểm định và đề xuất giao diện** cho một ứng dụng sắp được triển khai. Bản đặc tả nghiệp vụ đã chốt; phần thiết kế thì chưa. Hãy phản biện thẳng thắn, ưu tiên chỉ ra chỗ sai trước khi vẽ đẹp.

## Bối cảnh sản phẩm

Ứng dụng mobile quản lý công việc cá nhân theo timeline từng ngày, chạy trên Android và iOS.

- Hoạt động hoàn toàn offline. Không tài khoản, không đăng nhập, không backend, không đồng bộ.
- Dữ liệu chỉ nằm trên máy; gỡ app là mất.
- Một người dùng duy nhất trên mỗi máy, không phân quyền.
- Giao diện tiếng Việt.
- Người dùng mở app nhiều lần mỗi ngày, thường thao tác bằng một tay, trong lúc đang bận.
- Mục tiêu hiệu năng đặt ở thiết bị cấu hình thấp, tối đa 5.000 công việc.

## Khái niệm nghiệp vụ cần thể hiện được trên giao diện

- **Công việc thông thường**: có ngày, giờ bắt đầu, giờ kết thúc tùy chọn, ghi chú tùy chọn.
- **Công việc lặp lại**: một quy tắc lặp theo các thứ trong tuần, có giờ mặc định, ngày bắt đầu, ngày kết thúc tùy chọn.
- **Lần xuất hiện**: một buổi cụ thể của quy tắc lặp tại một ngày.
- **Điều chỉnh riêng**: thay đổi chỉ áp dụng cho đúng một lần xuất hiện — đổi giờ, đổi nội dung, đổi trạng thái, hoặc bỏ qua buổi đó — mà không đụng tới các buổi còn lại.

Khi người dùng sửa, di chuyển hoặc xóa một lần xuất hiện, app luôn phải hỏi phạm vi áp dụng: **Chỉ lần này** / **Toàn bộ chuỗi** / **Hủy**.

## Màn hình trong phạm vi

1. **Timeline** (màn hình chính): ngày đang chọn, chuyển ngày trước/ngày sau, mở lịch chọn ngày bất kỳ, quay nhanh về hôm nay, danh sách công việc xếp theo giờ tăng dần, điều khiển đổi trạng thái ngay trên dòng, nút tạo công việc.
2. **Tạo / chỉnh sửa công việc**: tên, ghi chú, ngày, giờ bắt đầu, giờ kết thúc, trạng thái, thiết lập lặp lại, bật/tắt nhắc nhở và chọn mốc nhắc, lưu, xóa (khi đang sửa).
3. **Thiết lập lặp lại**: không lặp / chọn các thứ trong tuần, ngày bắt đầu, ngày kết thúc hoặc không giới hạn, mốc nhắc mặc định.
4. **Chọn phạm vi áp dụng**: Chỉ lần này / Toàn bộ chuỗi / Hủy.
5. **Cài đặt**: trạng thái quyền thông báo, trạng thái quyền đặt nhắc đúng thời điểm, lối mở cài đặt hệ thống, mốc nhắc mặc định, ngày bắt đầu tuần, thông tin "dữ liệu chỉ lưu trên máy này", xóa toàn bộ dữ liệu.

## Những trạng thái bắt buộc phải có thiết kế

**Trên một dòng công việc**, bốn thuộc tính sau có thể xuất hiện đồng thời:

- Trạng thái: đang thực hiện / hoàn thành.
- Quá hạn: thời gian đã trôi qua mà chưa hoàn thành. Không bao giờ tự động chuyển thành hoàn thành.
- Là lần xuất hiện của công việc lặp lại.
- Nhắc nhở đang bật — và biến thể "nhắc nhở có thể bị phát trễ" khi thiếu quyền hệ thống.

**Ở cấp màn hình**: đang tải (skeleton đúng hình dạng nội dung thật, không phải spinner trên nền trắng), có dữ liệu, rỗng, lỗi đọc dữ liệu kèm hành động thử lại, quyền thông báo bị từ chối.

**Ở cấp form**: tạo mới, đang sửa, đang lưu, lỗi kiểm tra dữ liệu theo từng trường, lưu thất bại, xác nhận xóa, cảnh báo còn thay đổi chưa lưu khi thoát.

## Ràng buộc bắt buộc — vi phạm là lỗi, không phải góp ý

- Mọi giá trị màu, khoảng cách, cỡ chữ, bo góc, đổ bóng đều lấy từ token của design system. Không có màu viết cứng.
- Chế độ sáng và chế độ tối đều phải hoàn chỉnh. Màn hình không đọc được ở một trong hai chế độ là màn hình chưa xong.
- Không được phân biệt trạng thái **chỉ bằng màu sắc**. Chữ và thành phần quan trọng đạt tương phản WCAG AA ở cả hai chế độ.
- Vùng chạm tối thiểu 44×44 pt.
- Bố cục phải chịu được việc người dùng phóng to cỡ chữ hệ thống, không cắt chữ, không tràn.
- Điều hướng không sâu quá ba cấp. Luồng tạm thời dùng bottom sheet hoặc modal.
- Hành động chính phải nhìn thấy mà không cần cuộn.
- Mọi tác vụ thường gặp hoàn tất trong 1–2 thao tác kể từ điểm bắt đầu.
- Đổi trạng thái công việc phải làm được ngay trên danh sách, không mở form.
- Trường nào có miền giá trị hữu hạn thì cho chọn, không bắt gõ tay. Trường nào đoán được giá trị thì có sẵn mặc định hợp lý.
- Danh sách dài phải cuộn mượt ở 60 FPS trên máy yếu.
- Không bao giờ hiện màn hình trắng, mã lỗi kỹ thuật, hay thông báo lỗi không kèm hành động khắc phục.

## Các quyết định đã chốt — đừng đề xuất làm khác

- **Di chuyển công việc**: kéo-thả để đổi khung giờ **trong cùng một ngày**. Đổi sang ngày khác thì dùng hành động "Di chuyển" hoặc sửa trong form — không kéo-thả xuyên ngày. Mọi việc làm được bằng kéo-thả đều phải có lối thay thế không cần cử chỉ, dùng được với trình đọc màn hình.
- **Mốc nhắc nhở**: đúng giờ bắt đầu, hoặc trước 5 / 10 / 15 / 30 / 60 phút. Đặt được cho từng công việc và từng quy tắc lặp, cộng một giá trị mặc định đổi được trong Cài đặt. Đổi mặc định chỉ ảnh hưởng công việc tạo mới về sau.
- **Quyền nhắc đúng thời điểm**: chỉ xin vào lần đầu người dùng bật nhắc nhở, không xin lúc mở app lần đầu. Bị từ chối thì vẫn đặt nhắc ở chế độ gần đúng và nói rõ nhắc nhở có thể trễ, kèm lối cấp lại quyền.
- **Phạm vi sửa công việc lặp lại**: chỉ có "Chỉ lần này" và "Toàn bộ chuỗi". Không có "Lần này và các lần sau".
- **Ngôn ngữ**: chỉ tiếng Việt.
- **Công việc chồng giờ**: được phép và phải hiển thị đủ, không gộp, không ẩn bớt.
- **Công việc không có giờ kết thúc**: hợp lệ, hiển thị như một mốc thời gian đơn.

## Ngoài phạm vi — đừng đề xuất

Tài khoản, đồng bộ nhiều máy, sao lưu đám mây, chia sẻ, nhóm, bình luận, đính kèm, bản web, nhập/xuất tệp, tích hợp lịch bên thứ ba, nhãn, dự án, mức ưu tiên, tìm kiếm toàn cục, thống kê năng suất, gamification.

## Việc cần bạn làm

1. **Rà soát luồng trước khi vẽ.** Với từng màn hình, chỉ ra: chỗ tốn thao tác thừa, chỗ người dùng dễ hiểu nhầm, chỗ vi phạm ràng buộc ở trên. Nói rõ vi phạm ràng buộc nào.
2. **Giải bài toán khó nhất**: một dòng công việc phải đồng thời truyền tải trạng thái, quá hạn, dấu hiệu lặp lại, dấu hiệu nhắc nhở và cảnh báo nhắc trễ — mà vẫn đọc lướt được và không rối. Đề xuất ít nhất hai phương án, kèm đánh đổi.
3. **Đề xuất cách hiển thị công việc chồng giờ** trên timeline sao cho không mất thông tin và vẫn chạm được từng mục.
4. **Thiết kế luồng chọn phạm vi áp dụng** cho công việc lặp lại: xuất hiện lúc nào, dạng gì, làm sao để người dùng hiểu hậu quả của mỗi lựa chọn trước khi bấm.
5. **Đánh giá rủi ro tiếp cận của kéo-thả** và mô tả cụ thể lối thay thế không cần cử chỉ.
6. **Dựng prototype** dạng một trang HTML tự chứa, responsive, hỗ trợ cả chế độ sáng và tối, mô phỏng các màn hình chính và các trạng thái bắt buộc. Dùng biến CSS làm token màu và khoảng cách để thấy rõ hệ thống, không viết cứng giá trị rải rác.
7. **Liệt kê các quyết định thiết kế còn bỏ ngỏ** mà bạn phải tự chọn để hoàn thành prototype, kèm khuyến nghị của bạn cho từng cái.

## Định dạng trả lời

- **Phần A — Đánh giá và rủi ro**: xếp theo mức tác động giảm dần. Mỗi mục nói rõ vấn đề, hệ quả với người dùng, và hướng sửa.
- **Phần B — Prototype**: một trang HTML tự chứa như mô tả ở mục 6.
- **Phần C — Quyết định cần chốt**: danh sách ngắn, mỗi mục kèm khuyến nghị và lý do một câu.

Nếu thiếu thông tin thực sự chặn việc thiết kế, hãy hỏi tối đa 3 câu trước khi bắt đầu. Ngoài ra, cứ chọn mặc định hợp lý và ghi lại lựa chọn đó ở Phần C.
