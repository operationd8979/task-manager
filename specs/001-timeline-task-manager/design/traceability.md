# Traceability — requirements ↔ design

> **GENERATED FILE — do not hand-edit.** Produced by `/speckit-design-import` and
> re-verified by `/speckit-design-check`. Nó tồn tại để kiểm toán pha thiết kế mà không
> phải đọc lại từng artifact, và để một requirement thêm sau này lộ ra là chưa được phủ.

**Spec**: [spec.md](../spec.md) · **Spec hash at import**: `4022a420a7c4c2e5`
**Nguồn**: Claude Design project `537c8234-5867-43f3-84c9-e20a8413d3fd`
**Generated**: 2026-08-02

Ký hiệu: `—` nghĩa là requirement không có bề mặt giao diện; luôn kèm lý do, không bao giờ
để trống.

## 1. Requirement coverage

| Requirement | Screen(s) | Flow(s) | Artifact section | Ghi chú |
|---|---|---|---|---|
| FR-001 timeline theo giờ | S-01 | — | [wireframes W-01](./wireframes.md) | |
| FR-002 nội dung mỗi mục | S-01 | — | [ux-ui-spec §1](./ux-ui-spec.md) | Giải phẫu dòng: 5 thuộc tính đồng thời |
| FR-003 điều hướng ngày | S-01, S-02 | — | [ia §4](./ia-screens-flows.md) | |
| FR-004 tự cập nhật | S-01 | F-1, F-2, F-4 | [ux-ui-spec §3](./ux-ui-spec.md) | |
| FR-005 trạng thái rỗng | S-01 | — | [wireframes W-02](./wireframes.md) | |
| FR-006 hiển thị chồng giờ | S-01 | — | [ux-ui-spec §4 Cụm chồng giờ](./ux-ui-spec.md) | Không cột song song |
| FR-007 tạo công việc | S-03 | F-2 | [wireframes W-03](./wireframes.md) | |
| FR-008 giá trị mặc định | S-03 | F-2 | [ia §5 F-2](./ia-screens-flows.md) | |
| FR-009 chặn lưu khi sai | S-03 | F-2 | [ux-ui-spec §3 Form/Lỗi từng trường](./ux-ui-spec.md) | |
| FR-010 chỉnh sửa | S-03 | F-3 | [wireframes W-03](./wireframes.md) | |
| FR-011 xóa có xác nhận | S-06, S-09 | F-6 | [open-decisions D-03](./open-decisions.md) | **Xung đột C-2** |
| FR-012 dọn dẹp sau xóa | S-01 | F-6 | [ia §5 F-6](./ia-screens-flows.md) | Phần hủy nhắc nhở không có bề mặt UI |
| FR-013 cảnh báo chưa lưu | S-09 | — | [ux-ui-spec §3 Form/Còn thay đổi](./ux-ui-spec.md) | 3 lựa chọn |
| FR-014 hai trạng thái | S-01 | F-1 | [ux-ui-spec §1](./ux-ui-spec.md) | |
| FR-015 đổi trạng thái trên list | S-01 | F-1 | [ia §5 F-1](./ia-screens-flows.md) | 1 thao tác |
| FR-016 phân biệt không chỉ bằng màu | S-01 | — | [ux-ui-spec §1](./ux-ui-spec.md) | Ô đầy + ✓ + gạch ngang |
| FR-017 quá hạn | S-01 | — | [ux-ui-spec §1](./ux-ui-spec.md) | Nhãn kèm khoảng trễ cụ thể |
| FR-018 di chuyển | S-06, S-07 | F-4 | [wireframes W-01](./wireframes.md) | |
| FR-018a kéo-thả trong ngày | S-01 | F-4 | [ux-ui-spec §5.1](./ux-ui-spec.md) | Tay cầm ⣿, lưới 15′ |
| FR-018b không kéo xuyên ngày | S-07 | F-4 | [ux-ui-spec §5.1](./ux-ui-spec.md) | Nói rõ bằng chữ |
| FR-018c lối thay thế không cử chỉ | S-06, S-07 | F-4 | [ux-ui-spec §5.2](./ux-ui-spec.md) | Ngang hàng, không hạng hai |
| FR-019 cập nhật sau di chuyển | S-01 | F-4 | [ia §5 F-4](./ia-screens-flows.md) | |
| FR-020 chọn thứ trong tuần | S-04 | — | [wireframes W-05](./wireframes.md) | 7 nút 44×44 |
| FR-021 trường của quy tắc lặp | S-04 | — | [wireframes W-05](./wireframes.md) | |
| FR-022 lặp vô thời hạn | S-04 | — | [wireframes W-05](./wireframes.md) | "Không giới hạn" |
| FR-023 sinh theo nhu cầu | — | — | [ux-ui-spec §5.5](./ux-ui-spec.md) | Ràng buộc hiệu năng, không có bề mặt UI |
| FR-024 biên ngày bắt đầu/kết thúc | S-04 | — | [wireframes W-05](./wireframes.md) | Xem trước bằng lời |
| FR-025 phân biệt buổi lặp | S-01 | — | [ux-ui-spec §1](./ux-ui-spec.md) | ⟳ + "LẶP T2–T6" |
| FR-026 hỏi phạm vi áp dụng | S-05 | F-3, F-4, F-6 | [open-decisions D-01](./open-decisions.md) | **Xung đột C-1** |
| FR-027 "chỉ lần này" | S-05 | F-3 | [wireframes W-04](./wireframes.md) | |
| FR-028 tối đa 1 điều chỉnh/buổi | — | — | [ia §3](./ia-screens-flows.md) | Ràng buộc dữ liệu; UI phản ánh qua nhãn ✎ |
| FR-029 phạm vi điều chỉnh riêng | S-03, S-06 | F-3 | [ia §3](./ia-screens-flows.md) | |
| FR-030 "toàn bộ chuỗi" khi sửa | S-05 | F-3 | [wireframes W-04](./wireframes.md) | Dòng đếm buổi bị ảnh hưởng |
| FR-031 "toàn bộ chuỗi" khi xóa | S-05 | F-6 | [wireframes W-04](./wireframes.md) | |
| FR-032 tick không lan sang buổi khác | S-01 | F-1 | [open-decisions D-01](./open-decisions.md) | Cơ sở cho khuyến nghị D-01 |
| FR-033 bật/tắt + chọn mốc nhắc | S-03, S-04 | F-5 | [wireframes W-03](./wireframes.md) | Chip 0/5/10/15/30/60 |
| FR-034 nhắc nhở chạy trên máy | — | — | — | Ràng buộc kỹ thuật, không có bề mặt UI |
| FR-035 nội dung nhắc nhở | — | — | [ux-ui-spec §5.6](./ux-ui-spec.md) | Chuỗi thuộc danh mục tập trung |
| FR-036 sáu mốc nhắc | S-03, S-04, S-08 | F-5 | [wireframes W-03, W-06](./wireframes.md) | |
| FR-036a xin quyền đúng lúc | S-03 | F-5 | [ia §5 F-5](./ia-screens-flows.md) | Chỉ khi bật lần đầu |
| FR-036b nhắc gần đúng + báo trễ | S-01, S-03, S-08 | F-5 | [ux-ui-spec §1, §3](./ux-ui-spec.md) | Nhãn "· CÓ THỂ TRỄ" |
| FR-036c mốc mặc định từ Cài đặt | S-03, S-08 | F-2 | [wireframes W-06](./wireframes.md) | |
| FR-037 đồng bộ nhắc theo thay đổi | — | F-1, F-4, F-6 | — | Dẫn xuất; UI chỉ phản ánh qua nhãn NHẮC |
| FR-038 mốc nhắc ở quá khứ | S-03 | F-2 | [ux-ui-spec §3 Form](./ux-ui-spec.md) | Cảnh báo, vẫn lưu |
| FR-039 quyền thông báo bị từ chối | S-01, S-08 | F-5 | [ux-ui-spec §3](./ux-ui-spec.md) | Banner trong luồng, không modal |
| FR-040 đặt trước theo cửa sổ | — | — | [ux-ui-spec §5.5](./ux-ui-spec.md) | Ràng buộc kỹ thuật |
| FR-041 đối chiếu khi khởi động | — | — | — | Không có bề mặt UI |
| FR-042 khôi phục sau reboot | — | — | — | Không có bề mặt UI |
| FR-043 chạm nhắc mở đúng việc | S-01 | — | [ia §2 "Ngày là địa chỉ"](./ia-screens-flows.md) | Ngoại lệ: mở app không về hôm nay |
| FR-044 lỗi nhắc không chặn lưu | S-03 | F-5 | [ux-ui-spec §3 Form](./ux-ui-spec.md) | Báo riêng |
| FR-045…FR-050 lưu trữ trên máy | — | — | [ux-ui-spec §5.5](./ux-ui-spec.md) | Không có bề mặt UI, trừ FR-046 (ghi ngay khi tick) |
| FR-051 trạng thái hai quyền | S-08 | — | [wireframes W-06](./wireframes.md) | Nhãn có chữ, không chấm màu |
| FR-052 ngày bắt đầu tuần | S-08, S-02 | — | [wireframes W-06](./wireframes.md) | |
| FR-052a mốc nhắc mặc định | S-08 | — | [wireframes W-06](./wireframes.md) | "chỉ áp dụng cho việc tạo mới" |
| FR-053 dữ liệu chỉ trên máy | S-08 | — | [wireframes W-06](./wireframes.md) | + số mục đang lưu |
| FR-054 xóa toàn bộ dữ liệu | S-08, S-09 | — | [wireframes W-06](./wireframes.md) | Ngoại lệ duy nhất dùng hộp thoại |
| FR-055 đủ trạng thái bất đồng bộ | S-01, S-03 | — | [ux-ui-spec §3](./ux-ui-spec.md) | Ma trận 14 dòng |
| FR-055a/b/c nhật ký lỗi cục bộ | — | — | — | Không có bề mặt UI; ràng buộc quyền riêng tư |
| FR-056 sáng và tối hoàn chỉnh | tất cả | — | [design-system §3](./design-system.md) | Hai bảng token đầy đủ |
| FR-057 a11y: nhãn, vùng chạm, phóng chữ | tất cả | — | [ux-ui-spec §2, §4, §5.2](./ux-ui-spec.md) | 44pt, trần 170% |
| FR-058 không tài khoản, không quyền thừa | S-08 | — | [ia §2](./ia-screens-flows.md) | IA không có màn hình đăng nhập |
| FR-058a chuỗi từ danh mục tập trung | tất cả | — | [ux-ui-spec §5.6](./ux-ui-spec.md) | |
| FR-059 Android/iOS cùng nghiệp vụ | — | — | — | Ràng buộc triển khai |

## 2. Screen coverage

| Screen | Tên | Cấp | Serves | Wireframe | Trạng thái đã thiết kế |
|---|---|---|---|---|---|
| S-01 | Timeline | 1 | FR-001…006, 014…017, 018a, 025, 039, 043, 055 | W-01, W-02 | Tải · Có dữ liệu · Rỗng · Lỗi đọc · Banner quyền |
| S-02 | Chọn ngày | 2 | FR-003, 052 | — | Chấm ngày bận · Ngày đang chọn · Ngoài tháng |
| S-03 | Tạo / sửa | 2 | FR-007…010, 013, 033, 036, 036a…c, 038, 044 | W-03 | Tạo · Sửa · Đang lưu · Lỗi từng trường · Lưu thất bại · Chưa lưu |
| S-04 | Thiết lập lặp lại | 3 | FR-020…022, 024, 033, 036 | W-05 | Không lặp · Có lặp · Chưa chọn thứ · Xem trước |
| S-05 | Chọn phạm vi | 2 | FR-026, 027, 030, 031 | W-04 | Sửa · Đổi giờ · Di chuyển · Xóa |
| S-06 | Thao tác dòng | 2 | FR-011, 018, 018c, 029 | — | Việc thường · Buổi của chuỗi |
| S-07 | Đổi giờ / Di chuyển | 3 | FR-018, 018b, 018c | — | Chip giờ · Bộ chọn giờ · Bộ chọn ngày |
| S-08 | Cài đặt | 2 | FR-036c, 051…054, 058 | W-06 | Quyền đã cấp / từ chối / có thể trễ |
| S-09 | Xác nhận phá hủy | 3 | FR-011, 013, 054 | — | Xóa 1 việc · Xóa tất cả · Chưa lưu |

Không có màn hình nào không phục vụ requirement nào.

## 3. Flow coverage

| Flow | Tên | Serves | Số thao tác | Trong ngân sách 1–2? |
|---|---|---|---|---|
| F-1 | Đánh dấu xong | US-2, FR-015, FR-032 | 1 | ✅ |
| F-2 | Tạo công việc thường | US-1, FR-007, FR-008 | 2 | ✅ |
| F-3 | Sửa một buổi của chuỗi | US-5, FR-026, FR-027, FR-030 | 3 | ⚠️ Vượt có chủ đích — [ia §5 F-3](./ia-screens-flows.md) |
| F-4 | Dời giờ trong ngày | US-3, FR-018a, FR-018c | 1 cử chỉ / 3 thao tác | ✅ theo lối cử chỉ |
| F-5 | Bật nhắc nhở lần đầu | US-6, FR-036a, FR-036b | 2 + hộp thoại hệ thống | ✅ |
| F-6 | Xóa | US-3, FR-011, FR-031 | 2–3 | ⚠️ Phụ thuộc [D-03](./open-decisions.md) |

## 4. Uncovered

**Requirement không có bề mặt giao diện và không nêu lý do**: không có.
**Màn hình không phục vụ requirement nào**: không có.
**User story không có flow**: US-4 (công việc lặp lại) — được phục vụ bởi S-04 nhưng chưa
có flow riêng; luồng thiết lập lặp lại nằm lồng trong F-2. **MEDIUM** — nên tách thành
F-7 khi dựng tasks, vì đây là luồng có ngân sách thao tác riêng.
**US-7** (cài đặt, dữ liệu) — phục vụ bởi S-08, không có flow riêng; chấp nhận được vì là
màn hình tra cứu, không phải luồng tác vụ.

## 5. Conflicts between spec and design

Ghi nhận, không tự giải quyết. Mỗi xung đột phải kết thúc bằng một trong hai: sửa spec,
hoặc sửa design — trước khi lập kế hoạch.

| ID | Spec nói | Design làm | Tác động | Decision |
|---|---|---|---|---|
| C-1 | FR-026: mọi thao tác ghi lên buổi lặp MUST hỏi phạm vi | Tick trạng thái không hỏi, luôn là "chỉ lần này" | **Luồng** — F-1 và F-3 | [D-01](./open-decisions.md) |
| C-2 | FR-011: xóa công việc thường MUST yêu cầu xác nhận | Xóa ngay + toast Hoàn tác 5 giây | **Luồng** — F-6 | [D-03](./open-decisions.md) |
| C-3 | Constitution "Lists": swipe actions where meaningful | Bỏ hẳn vuốt ngang trên dòng | **Luồng** — mọi hành động vào ⋯ | [D-02](./open-decisions.md) |
| C-4 | Constitution I: điều hướng dùng bottom tabs / stack / sheet | Không dùng bottom tabs, chỉ stack 2 màn + sheet | Cấu trúc | [ia §2](./ia-screens-flows.md) — có lý do, cần ghi Complexity Tracking |
