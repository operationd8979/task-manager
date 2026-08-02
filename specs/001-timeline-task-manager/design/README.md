# Design artifacts — Timeline Task Manager

Nguồn: Claude Design project `537c8234-5867-43f3-84c9-e20a8413d3fd`, file
`Design Artifacts.dc.html` (đặc tả tĩnh) và `Timeline App.dc.html` (prototype tương tác).
Bộ tài liệu này là bản chuyển thể sang Markdown để `/speckit.plan` và `/speckit.tasks`
đọc được trực tiếp, đã đối chiếu với `@chipmobilesdk/rn-theme@0.2.1` đang cài trong repo.

## Đọc cái nào, khi nào

| File | Nội dung | Dùng ở giai đoạn |
|---|---|---|
| [design-system.md](./design-system.md) | 3 màu thương hiệu, bảng token ngữ nghĩa đã kiểm tương phản, cách nối vào `@chipmobilesdk/rn-theme`, mã thiết lập, các khoảng lệch với mặc định của SDK | Plan — Technical Context, Phase 1 |
| [ia-screens-flows.md](./ia-screens-flows.md) | Cây màn hình, nguyên tắc IA, mô hình dữ liệu mà UI phải phản ánh, bảng 9 màn hình, 6 luồng người dùng kèm ngân sách thao tác | Plan — thiết kế màn hình, Tasks — chia theo user story |
| [wireframes.md](./wireframes.md) | 6 wireframe lo-fi 390×812 theo khối, kèm chiều cao tối thiểu tính bằng pt | Tasks — dựng màn hình |
| [ux-ui-spec.md](./ux-ui-spec.md) | Giải phẫu dòng công việc, thang chữ, số đo vùng chạm, ma trận trạng thái bắt buộc, spec 6 thành phần, ghi chú tương tác | Plan + Tasks — mọi màn hình |
| [open-decisions.md](./open-decisions.md) | Quyết định còn bỏ ngỏ, kèm khuyến nghị và cái giá phải trả nếu chọn khác | Cần chốt **trước** khi chạy `/speckit.plan` |
| [traceability.md](./traceability.md) | Ma trận requirement ↔ màn hình ↔ luồng, phần chưa được phủ, và 4 xung đột giữa spec và design | Gate trước plan — **file sinh tự động, không sửa tay** |
| `manifest.json` | Provenance: nguồn Claude Design, hash từng artifact, hash spec lúc import | Dùng để phát hiện design lỗi thời — **file sinh tự động** |

Hai file cuối do extension `design` quản lý. Kiểm tra bằng `/speckit-design-check`; chi
tiết cơ chế ở [.specify/extensions/design/README.md](../../../.specify/extensions/design/README.md).

## Quan hệ với các tài liệu đã có

- [spec.md](../spec.md) là nguồn nghiệp vụ chốt (cái gì / tại sao). Bộ này là nguồn giao
  diện (trông thế nào / thao tác ra sao). Khi hai bên mâu thuẫn, `spec.md` thắng về nghiệp
  vụ, bộ design thắng về hình thức và tương tác.
- [design-validation-prompt.md](../design-validation-prompt.md) là prompt đã dùng để sinh ra
  bộ artifact này. Giữ lại để truy nguyên, không cần chạy lại.
- [.specify/memory/constitution.md](../../../.specify/memory/constitution.md) vẫn ràng buộc.
  Bộ design này được viết để tuân thủ, trừ đúng một chỗ đã ghi rõ ở
  [open-decisions.md](./open-decisions.md) mục D-02.

## Ràng buộc rút gọn cho người lập kế hoạch

1. Mọi giá trị màu, khoảng cách, cỡ chữ, bo góc đến từ theme. Không hex trong component —
   hex chỉ tồn tại trong `src/theme/`. (Constitution III)
2. Chế độ sáng và tối đều phải hoàn chỉnh; token cho cả hai đã có sẵn trong
   [design-system.md](./design-system.md).
3. Không thuộc tính nào của dòng công việc được truyền tải chỉ bằng màu — luôn có chữ hoặc
   hình dạng đi kèm. (Constitution V)
4. Vùng chạm tối thiểu 44×44 pt, bố cục chịu được phóng cỡ chữ hệ thống tới 170%.
5. Bo góc bằng 0 trên toàn hệ thống — đây là lệch so với mặc định của SDK, xem
   [design-system.md](./design-system.md) mục "Override bắt buộc".
