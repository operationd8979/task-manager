# Feature Specification: Ứng dụng quản lý công việc theo Timeline (MVP)

**Feature Branch**: `001-timeline-task-manager`

**Created**: 2026-08-01

**Status**: Draft

**Input**: User description: "Ứng dụng mobile React Native quản lý công việc theo timeline, offline-first, dựa trên artifacts/Task_Manager_Implementation_Playbook.md"

## Clarifications

### Session 2026-08-01

- Q: Nhắc nhở cần chính xác tới mức nào trên Android, và ứng dụng có xin quyền báo thức chính xác không? → A: Chỉ xin quyền báo thức chính xác vào lần đầu người dùng bật nhắc nhở; nếu bị từ chối vẫn đặt nhắc nhở ở chế độ gần đúng và hiển thị rõ nhắc nhở có thể bị trễ.
- Q: Người dùng di chuyển công việc bằng những cách nào trong phiên bản đầu tiên? → A: Kéo-thả để đổi khung giờ trong cùng một ngày, còn đổi ngày dùng hành động "Di chuyển" hoặc sửa trong form.
- Q: Phiên bản đầu tiên hỗ trợ những mốc nhắc nhở nào? → A: Đúng giờ và trước 5, 10, 15, 30, 60 phút; đặt được cho từng công việc và từng quy tắc lặp, kèm một giá trị mặc định đổi được trong Cài đặt.
- Q: Ngôn ngữ giao diện và hạ tầng chuỗi cho phiên bản đầu tiên? → A: Giao diện chỉ tiếng Việt, nhưng mọi chuỗi hiển thị nằm trong một danh mục tập trung để thêm ngôn ngữ sau mà không phải sửa từng màn hình.
- Q: Ứng dụng ghi nhận lỗi kỹ thuật như thế nào để có thể chẩn đoán sự cố? → A: Nhật ký lỗi cục bộ có giới hạn dung lượng và tự xoay vòng, không chứa tên hay ghi chú công việc, không bao giờ gửi ra khỏi thiết bị, và không dùng analytics hay crash reporting của bên thứ ba.

### Session 2026-08-02

- Q: Khi người dùng tick trạng thái hoàn thành trên một lần xuất hiện của công việc lặp lại, hệ thống có hỏi phạm vi áp dụng không? → A: Không hỏi. Đổi trạng thái luôn áp dụng cho đúng lần xuất hiện đó, không bao giờ cho toàn chuỗi.
- Q: Xóa một công việc thông thường: hỏi xác nhận trước, hay xóa ngay kèm Hoàn tác? → A: Xóa ngay, kèm thông báo có hành động Hoàn tác sống ít nhất 5 giây và không bị mất khi người dùng đổi ngày hoặc mở màn hình khác. Xóa toàn bộ dữ liệu vẫn giữ bước xác nhận.
- Q: Vuốt ngang trên dòng công việc để xóa hoặc thao tác nhanh: giữ hay bỏ? → A: Cử chỉ vuốt ngang được dành cho việc chuyển ngày, áp dụng trên toàn bộ timeline kể cả khi vuốt đè lên một dòng. Không có thao tác nào trên dòng được kích hoạt bằng vuốt ngang.
- Q: Với chuỗi lặp không có ngày kết thúc, số buổi bị ảnh hưởng được đếm tới đâu khi hỏi phạm vi áp dụng? → A: Đếm trong 365 ngày kể từ ngày đang thao tác, và nói rõ rằng các buổi sau mốc đó cũng bị ảnh hưởng.
- Q: Chế độ sáng/tối theo cài đặt hệ thống, hay người dùng đổi được trong ứng dụng? → A: Cài đặt có mục chọn ba giá trị — Tự động (theo hệ thống), Sáng, Tối — mặc định là Tự động, và lựa chọn được lưu lại.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lập kế hoạch công việc trong ngày (Priority: P1)

Người dùng mở ứng dụng và thấy ngay timeline công việc của hôm nay, sắp xếp theo giờ. Họ tạo một công việc mới bằng cách nhập tên, chọn ngày và giờ bắt đầu, rồi thấy công việc đó xuất hiện đúng vị trí trên timeline. Họ có thể chuyển tới ngày trước, ngày sau, chọn một ngày bất kỳ từ lịch, và quay nhanh về hôm nay. Dữ liệu vẫn còn nguyên sau khi đóng và mở lại ứng dụng.

**Why this priority**: Đây là lát cắt tối thiểu tạo ra giá trị. Nếu chỉ triển khai story này, người dùng đã có một sổ kế hoạch theo ngày dùng được hằng ngày, hoàn toàn offline. Mọi story còn lại đều xây trên dữ liệu và màn hình do story này tạo ra.

**Independent Test**: Cài ứng dụng lên máy đang bật chế độ máy bay, tạo ba công việc ở các khung giờ khác nhau trong hai ngày khác nhau, đóng hẳn ứng dụng, mở lại và xác nhận cả ba công việc hiển thị đúng ngày, đúng thứ tự giờ.

**Acceptance Scenarios**:

1. **Given** ứng dụng vừa được mở, **When** màn hình chính hiển thị, **Then** timeline của ngày hôm nay được chọn sẵn.
2. **Given** người dùng đang ở màn hình tạo công việc, **When** nhập tên, chọn ngày và giờ bắt đầu rồi lưu, **Then** công việc xuất hiện trên timeline của ngày đó theo đúng thứ tự giờ bắt đầu tăng dần.
3. **Given** người dùng để trống tên công việc, **When** bấm lưu, **Then** ứng dụng chặn lưu và hiển thị thông báo lỗi ngay tại trường tên.
4. **Given** người dùng nhập giờ kết thúc sớm hơn hoặc bằng giờ bắt đầu, **When** bấm lưu, **Then** ứng dụng chặn lưu và hiển thị lỗi giải thích ràng buộc.
5. **Given** ngày được chọn không có công việc nào, **When** timeline hiển thị, **Then** ứng dụng hiển thị trạng thái rỗng kèm hành động tạo công việc mới.
6. **Given** người dùng đang xem ngày hôm nay, **When** chuyển sang ngày trước hoặc ngày sau bằng nút điều hướng hoặc bằng thao tác vuốt ngang, **Then** timeline hiển thị đúng dữ liệu của ngày mới được chọn.
7. **Given** người dùng vuốt ngang bắt đầu từ vị trí nằm đè lên một công việc, **When** kết thúc thao tác vuốt, **Then** timeline chuyển ngày và công việc đó không bị thay đổi gì.
8. **Given** người dùng đã tạo công việc, **When** đóng hẳn ứng dụng và mở lại, **Then** công việc vẫn còn với đầy đủ thông tin đã nhập.

---

### User Story 2 - Theo dõi tiến độ công việc (Priority: P2)

Người dùng đánh dấu một công việc là hoàn thành ngay trên timeline mà không cần mở form chỉnh sửa, và có thể chuyển ngược lại về đang thực hiện. Công việc đã hoàn thành vẫn hiển thị nhưng trông khác rõ ràng. Công việc đã qua giờ mà chưa hoàn thành được đánh dấu là quá hạn.

**Why this priority**: Không có khả năng cập nhật tiến độ, timeline chỉ là danh sách tĩnh. Đây là thao tác lặp lại nhiều nhất trong ngày nên phải nhanh và nằm ngay trên danh sách.

**Independent Test**: Tạo hai công việc, một ở giờ đã qua và một ở giờ tương lai. Đánh dấu hoàn thành công việc tương lai, mở lại ứng dụng và xác nhận trạng thái được giữ nguyên, đồng thời công việc đã qua giờ hiển thị dấu hiệu quá hạn.

**Acceptance Scenarios**:

1. **Given** một công việc đang ở trạng thái đang thực hiện, **When** người dùng bấm điều khiển trạng thái trên timeline, **Then** công việc chuyển sang hoàn thành và thay đổi được lưu ngay.
2. **Given** một công việc đã hoàn thành, **When** người dùng bấm lại điều khiển trạng thái, **Then** công việc quay về đang thực hiện.
3. **Given** một công việc đã hoàn thành, **When** timeline hiển thị, **Then** công việc vẫn nằm trên timeline nhưng được phân biệt bằng dấu hiệu không chỉ dựa vào màu sắc.
4. **Given** thời gian của công việc đã trôi qua và công việc chưa hoàn thành, **When** timeline hiển thị, **Then** công việc mang dấu hiệu quá hạn và không tự động chuyển sang hoàn thành.
5. **Given** người dùng vừa đổi trạng thái, **When** đóng và mở lại ứng dụng, **Then** trạng thái mới vẫn được giữ.

---

### User Story 3 - Điều chỉnh kế hoạch khi lịch thay đổi (Priority: P3)

Người dùng chỉnh sửa nội dung công việc, dời công việc sang khung giờ khác trong cùng ngày, sang một ngày khác, hoặc cả hai. Người dùng cũng có thể xóa công việc không còn cần thiết, và lấy lại được ngay nếu xóa nhầm.

**Why this priority**: Kế hoạch trong ngày thay đổi liên tục. Nếu không dời được công việc, người dùng buộc phải xóa và tạo lại, làm mất ghi chú và trạng thái.

**Independent Test**: Tạo một công việc lúc 09:00 hôm nay, dời sang 15:00 ngày mai, kiểm tra công việc biến mất khỏi timeline hôm nay và xuất hiện đúng chỗ ở ngày mai; xóa nó rồi dùng hành động hoàn tác và kiểm tra nó quay lại nguyên vẹn; xóa lại và để hành động hoàn tác hết hạn, rồi kiểm tra nó không còn ở bất kỳ ngày nào.

**Acceptance Scenarios**:

1. **Given** một công việc đang tồn tại, **When** người dùng mở và sửa tên, ghi chú, ngày, giờ bắt đầu, giờ kết thúc hoặc trạng thái rồi lưu, **Then** timeline phản ánh thay đổi ngay lập tức.
2. **Given** người dùng chọn hành động di chuyển trên một công việc, **When** chọn ngày và giờ mới rồi xác nhận, **Then** công việc biến mất khỏi vị trí cũ và xuất hiện tại vị trí mới.
3. **Given** người dùng đang xem timeline của một ngày, **When** kéo một công việc thả vào khung giờ khác trong cùng ngày đó, **Then** công việc nhận giờ mới, thay đổi được lưu ngay, và timeline sắp xếp lại theo giờ.
4. **Given** người dùng dùng trình đọc màn hình, **When** cần đổi giờ của một công việc, **Then** hành động "Di chuyển" cho kết quả giống hệt thao tác kéo-thả mà không cần cử chỉ.
5. **Given** người dùng chọn xóa một công việc thông thường, **When** xác nhận thao tác xóa, **Then** công việc bị xóa khỏi dữ liệu trên thiết bị và không còn trên timeline, đồng thời hành động hoàn tác được cung cấp.
6. **Given** người dùng vừa xóa một công việc, **When** dùng hành động hoàn tác trong vòng 5 giây, kể cả sau khi đã chuyển sang ngày khác, **Then** công việc được khôi phục nguyên vẹn cùng nhắc nhở của nó.
7. **Given** form tạo hoặc sửa đang có dữ liệu chưa lưu, **When** người dùng thoát form, **Then** ứng dụng cảnh báo về thay đổi chưa lưu trước khi đóng.

---

### User Story 4 - Công việc lặp lại theo ngày trong tuần (Priority: P4)

Người dùng thiết lập một công việc lặp lại vào một hoặc nhiều ngày cố định trong tuần, với giờ mặc định, ngày bắt đầu áp dụng và tùy chọn ngày kết thúc. Công việc tự xuất hiện đúng những ngày phù hợp mà không cần tạo lại thủ công.

**Why this priority**: Đây là điểm khác biệt chính so với một danh sách việc thông thường và loại bỏ phần lớn công sức nhập liệu lặp đi lặp lại.

**Independent Test**: Tạo một công việc lặp vào Thứ Hai, Thứ Tư, Thứ Sáu bắt đầu từ hôm nay, rồi duyệt qua hai tuần kế tiếp và xác nhận công việc xuất hiện đúng ba ngày mỗi tuần với giờ mặc định, kể cả sau khi mở lại ứng dụng.

**Acceptance Scenarios**:

1. **Given** người dùng đang thiết lập lặp lại, **When** chọn nhiều ngày trong tuần, đặt ngày bắt đầu và giờ mặc định rồi lưu, **Then** công việc xuất hiện vào đúng các ngày đã chọn kể từ ngày bắt đầu.
2. **Given** quy tắc lặp có ngày bắt đầu rơi vào giữa tuần, **When** người dùng xem các ngày trước ngày bắt đầu, **Then** không có lần xuất hiện nào được tạo trước ngày bắt đầu.
3. **Given** quy tắc lặp có ngày kết thúc trùng một ngày trong tuần được chọn, **When** người dùng xem đúng ngày kết thúc đó, **Then** lần xuất hiện của ngày đó vẫn hiển thị.
4. **Given** quy tắc lặp không đặt ngày kết thúc, **When** người dùng duyệt tới các ngày xa trong tương lai, **Then** lần xuất hiện vẫn tiếp tục được tạo.
5. **Given** timeline chứa cả công việc thông thường và lần xuất hiện của công việc lặp lại, **When** timeline hiển thị, **Then** cả hai loại nằm chung một danh sách sắp theo giờ và loại lặp lại có dấu hiệu nhận biết riêng.

---

### User Story 5 - Điều chỉnh riêng một lần xuất hiện (Priority: P5)

Khi một buổi cụ thể của công việc lặp lại cần đổi giờ, đổi nội dung, đánh dấu hoàn thành hoặc bỏ qua, người dùng chọn phạm vi áp dụng "Chỉ lần này" và thay đổi chỉ ảnh hưởng đúng buổi đó. Khi cần đổi cả lịch, họ chọn "Toàn bộ chuỗi".

**Why this priority**: Đây là yêu cầu nghiệp vụ tinh vi nhất và là điều phân biệt ứng dụng với các công cụ lặp lại đơn giản. Nó chỉ có ý nghĩa sau khi công việc lặp lại đã hoạt động.

**Independent Test**: Với công việc lặp vào Thứ Hai lúc 09:00, dời riêng buổi Thứ Hai tuần sau sang 11:00, rồi kiểm tra các Thứ Hai còn lại vẫn ở 09:00 và quy tắc gốc không đổi.

**Acceptance Scenarios**:

1. **Given** người dùng thao tác trên một lần xuất hiện của công việc lặp lại, **When** thực hiện chỉnh sửa hoặc di chuyển, **Then** ứng dụng hỏi phạm vi áp dụng gồm "Chỉ lần này", "Toàn bộ chuỗi" và "Hủy".
2. **Given** người dùng chọn "Chỉ lần này" và đổi giờ, **When** lưu, **Then** chỉ buổi đó đổi giờ, các buổi khác giữ nguyên giờ mặc định và quy tắc lặp không thay đổi.
3. **Given** người dùng chọn "Toàn bộ chuỗi" và đổi giờ mặc định, **When** lưu, **Then** mọi lần xuất hiện chưa có điều chỉnh riêng đều dùng giờ mới, còn các lần đã điều chỉnh riêng vẫn giữ giá trị riêng.
4. **Given** người dùng chọn xóa và chọn "Chỉ lần này", **When** xác nhận, **Then** buổi đó không còn hiển thị nhưng các buổi sau vẫn xuất hiện bình thường.
5. **Given** người dùng chọn xóa và chọn "Toàn bộ chuỗi", **When** xác nhận, **Then** toàn bộ lịch lặp bị xóa và không còn lần xuất hiện nào trong tương lai.
6. **Given** một lần xuất hiện được đánh dấu hoàn thành, **When** người dùng xem các lần xuất hiện tiếp theo, **Then** các lần đó vẫn ở trạng thái đang thực hiện.

---

### User Story 6 - Nhận nhắc nhở kịp lúc (Priority: P6)

Người dùng bật nhắc nhở cho một công việc và chọn mốc nhắc — đúng giờ bắt đầu hoặc trước đó 5, 10, 15, 30 hay 60 phút — rồi nhận được thông báo trên thiết bị vào đúng mốc đã chọn, kể cả khi ứng dụng đã đóng và thiết bị không có Internet. Chạm vào thông báo sẽ mở đúng công việc đó.

**Why this priority**: Nhắc nhở biến ứng dụng từ nơi ghi kế hoạch thành công cụ thực thi kế hoạch. Nó phụ thuộc vào dữ liệu công việc và lịch lặp đã ổn định nên nằm sau các story trên.

**Independent Test**: Bật chế độ máy bay, tạo một công việc có nhắc nhở sau vài phút, đóng hẳn ứng dụng, chờ tới giờ và xác nhận thông báo xuất hiện; chạm vào thông báo và xác nhận ứng dụng mở đúng ngày và làm nổi bật đúng công việc.

**Acceptance Scenarios**:

1. **Given** người dùng bật nhắc nhở khi tạo công việc ở thời điểm tương lai, **When** tới mốc nhắc đã chọn, **Then** thông báo xuất hiện với tên công việc và thời gian, ngay cả khi ứng dụng không mở và không có Internet.
2. **Given** ứng dụng lần đầu cần gửi thông báo, **When** người dùng được hỏi quyền và từ chối, **Then** công việc vẫn được lưu, ứng dụng không gặp sự cố, hiển thị rõ rằng nhắc nhở đang bị vô hiệu hóa và cung cấp lối tắt mở cài đặt hệ thống.
3. **Given** người dùng bật nhắc nhở lần đầu trên nền tảng đòi hỏi quyền riêng cho nhắc đúng thời điểm, **When** người dùng từ chối quyền đó, **Then** nhắc nhở vẫn được đặt ở chế độ gần đúng và giao diện cho biết nhắc nhở có thể bị phát trễ.
4. **Given** người dùng chọn mốc nhắc trước 15 phút cho một công việc lúc 09:00, **When** tới 08:45, **Then** thông báo được phát, và mốc nhắc này không ảnh hưởng tới mốc nhắc của các công việc khác.
5. **Given** một công việc có nhắc nhở, **When** người dùng đổi giờ hoặc đổi ngày của công việc, **Then** nhắc nhở cũ bị hủy và nhắc nhở mới được đặt theo thời gian mới.
6. **Given** một công việc có nhắc nhở chưa phát, **When** người dùng đánh dấu hoàn thành hoặc xóa công việc hoặc tắt nhắc nhở, **Then** nhắc nhở bị hủy.
7. **Given** một công việc đã hoàn thành có nhắc nhở, **When** người dùng chuyển nó về đang thực hiện và thời điểm nhắc vẫn ở tương lai, **Then** nhắc nhở được đặt lại.
8. **Given** thời điểm nhắc đã nằm trong quá khứ, **When** người dùng lưu công việc, **Then** ứng dụng không đặt nhắc nhở và cảnh báo cho người dùng biết.
9. **Given** người dùng chạm vào thông báo của một công việc đã bị xóa, **When** ứng dụng mở, **Then** ứng dụng hiển thị timeline của ngày hiện tại và không hiển thị lỗi hệ thống.
10. **Given** thiết bị vừa khởi động lại hoặc vừa đổi múi giờ, **When** người dùng mở lại ứng dụng, **Then** ứng dụng đối chiếu và đặt lại các nhắc nhở tương lai còn thiếu hoặc sai giờ.

---

### User Story 7 - Kiểm soát cài đặt và dữ liệu cá nhân (Priority: P7)

Người dùng xem trạng thái quyền thông báo, mở cài đặt hệ thống khi cần, chọn ngày bắt đầu tuần, chọn chế độ hiển thị sáng/tối, đọc thông tin cho biết dữ liệu chỉ nằm trên thiết bị, và có thể xóa toàn bộ dữ liệu khi muốn bắt đầu lại.

**Why this priority**: Là lớp hoàn thiện cần cho niềm tin của người dùng và cho yêu cầu quyền riêng tư, nhưng không chặn bất kỳ luồng công việc chính nào.

**Independent Test**: Mở màn hình cài đặt, đổi ngày bắt đầu tuần và xác nhận bộ chọn lịch phản ánh thay đổi; sau đó chạy chức năng xóa toàn bộ dữ liệu, xác nhận, và kiểm tra mọi công việc cùng lịch lặp đã biến mất.

**Acceptance Scenarios**:

1. **Given** quyền thông báo đang bị từ chối, **When** người dùng mở màn hình cài đặt, **Then** trạng thái quyền được hiển thị rõ kèm hành động mở cài đặt hệ thống.
2. **Given** người dùng đổi ngày bắt đầu tuần, **When** mở bộ chọn ngày, **Then** lịch bắt đầu tuần theo lựa chọn mới và lựa chọn được giữ sau khi mở lại ứng dụng.
3. **Given** người dùng đổi mốc nhắc mặc định thành trước 10 phút, **When** tạo một công việc mới và bật nhắc nhở, **Then** công việc mới nhận mốc trước 10 phút, còn các công việc đã tạo trước đó giữ nguyên mốc nhắc cũ.
4. **Given** người dùng chọn xóa toàn bộ dữ liệu, **When** xác nhận ở bước cảnh báo, **Then** mọi công việc, quy tắc lặp, điều chỉnh riêng và nhắc nhở đã đặt đều bị xóa.
5. **Given** người dùng gỡ ứng dụng rồi cài lại, **When** mở ứng dụng, **Then** không có công việc nào được khôi phục tự động.
6. **Given** người dùng chọn chế độ hiển thị Tối, **When** đóng và mở lại ứng dụng, **Then** ứng dụng vẫn ở chế độ Tối bất kể hệ thống đang ở chế độ nào.
7. **Given** người dùng để chế độ hiển thị ở Tự động, **When** hệ thống chuyển sáng/tối trong lúc ứng dụng đang mở, **Then** ứng dụng đổi theo ngay mà không cần khởi động lại.

---

### Edge Cases

- **Di chuyển công việc về quá khứ**: Ứng dụng vẫn cho lưu, không đặt nhắc nhở, và hiển thị công việc là quá hạn nếu chưa hoàn thành.
- **Công việc không có giờ kết thúc**: Vẫn hợp lệ, hiển thị như một mốc thời gian đơn.
- **Nhiều công việc trùng hoặc chồng giờ**: Được phép; timeline phải hiển thị tất cả, không ẩn hay gộp mất dữ liệu.
- **Đổi ngày hoặc thoát khi form còn dữ liệu chưa lưu**: Cảnh báo trước khi đóng để tránh mất nhập liệu.
- **Sửa quy tắc lặp đang có điều chỉnh riêng**: Các điều chỉnh riêng được giữ lại. Nếu một điều chỉnh riêng rơi ra ngoài phạm vi quy tắc mới, nó được giữ trong dữ liệu nhưng không hiển thị, thay vì bị xóa âm thầm.
- **Quy tắc lặp bắt đầu giữa tuần**: Chỉ sinh lần xuất hiện từ ngày bắt đầu trở đi.
- **Ngày kết thúc của quy tắc lặp**: Lần xuất hiện đúng ngày kết thúc vẫn được sinh nếu ngày đó nằm trong các ngày lặp.
- **Đổi múi giờ hoặc giờ mùa hè**: Công việc giữ nguyên giờ hiển thị theo giờ địa phương; ứng dụng kiểm tra và đặt lại nhắc nhở khi được mở lại.
- **Người dùng tắt quyền thông báo từ cài đặt hệ thống**: Công việc vẫn tồn tại; ứng dụng hiển thị rằng nhắc nhở không hoạt động cho tới khi quyền được bật lại.
- **Người dùng từ chối hoặc thu hồi quyền đặt nhắc nhở đúng thời điểm**: Nhắc nhở vẫn được đặt ở chế độ gần đúng; ứng dụng cho biết nhắc nhở có thể bị phát trễ và cung cấp lối tắt cấp lại quyền, thay vì tắt nhắc nhở.
- **Thiết bị khởi động lại**: Công việc vẫn còn; các nhắc nhở tương lai được khôi phục sau khi khởi động lại hoặc chậm nhất khi ứng dụng được mở lại.
- **Lỗi đọc hoặc ghi dữ liệu trên thiết bị**: Người dùng nhận thông báo dễ hiểu kèm hành động thử lại; ứng dụng không hiển thị mã lỗi kỹ thuật và không mất dữ liệu đã lưu trước đó.
- **Lỗi khi đặt nhắc nhở**: Việc lưu công việc vẫn thành công; ứng dụng báo riêng rằng nhắc nhở chưa được đặt.
- **Đóng ứng dụng trong lúc hành động hoàn tác còn hiệu lực**: Việc xóa đã được ghi xuống thiết bị ngay khi thực hiện, nên nó là vĩnh viễn; hành động hoàn tác không được khôi phục ở lần mở sau và ứng dụng không hiển thị tàn dư nào của thao tác đó.
- **Vuốt ngang khi một lớp tạm thời đang mở**: Cử chỉ chuyển ngày chỉ áp dụng cho timeline; lớp đang mở giữ nguyên cử chỉ của nó và không chuyển ngày phía sau.

## Requirements *(mandatory)*

### Functional Requirements

#### Hiển thị timeline và điều hướng ngày

- **FR-001**: Hệ thống MUST hiển thị công việc của ngày được chọn dưới dạng timeline, sắp xếp theo giờ bắt đầu tăng dần, gồm cả công việc thông thường và lần xuất hiện của công việc lặp lại.
- **FR-002**: Mỗi mục trên timeline MUST hiển thị tối thiểu: tên công việc, giờ bắt đầu, giờ kết thúc hoặc thời lượng, trạng thái, dấu hiệu lặp lại nếu có, và dấu hiệu nhắc nhở nếu đang bật.
- **FR-003**: Người dùng MUST có thể xem ngày hôm nay, chuyển sang ngày trước, chuyển sang ngày sau, chọn một ngày cụ thể từ lịch, và quay nhanh về hôm nay.
- **FR-003a**: Người dùng MUST có thể chuyển sang ngày trước hoặc ngày sau bằng thao tác vuốt ngang. Thao tác này MUST hoạt động trên toàn bộ vùng timeline, kể cả khi bắt đầu trên một công việc, để cử chỉ vuốt ngang chỉ mang đúng một ý nghĩa duy nhất trong màn hình.
- **FR-003b**: Vuốt ngang MUST KHÔNG kích hoạt bất kỳ hành động nào của riêng một công việc. Mọi hành động trên một công việc MUST được truy cập qua một điều khiển hiện hữu trên dòng, không qua cử chỉ.
- **FR-003c**: Khi vuốt ngang bắt đầu trong vùng chạm của điều khiển kéo-thả đổi giờ, thao tác kéo-thả MUST được ưu tiên và MUST KHÔNG chuyển ngày.
- **FR-004**: Timeline MUST tự cập nhật ngay sau khi công việc được tạo, sửa, xóa, di chuyển hoặc đổi trạng thái.
- **FR-005**: Khi ngày được chọn không có công việc nào, hệ thống MUST hiển thị trạng thái rỗng có nội dung giải thích và cho phép tạo công việc trực tiếp từ đó.
- **FR-006**: Hệ thống MUST hiển thị đầy đủ các công việc có thời gian trùng hoặc chồng nhau mà không ẩn hoặc gộp mất công việc nào.

#### Tạo, chỉnh sửa và xóa công việc

- **FR-007**: Người dùng MUST có thể tạo công việc với các trường bắt buộc là tên, ngày thực hiện và giờ bắt đầu; các trường tùy chọn là ghi chú, giờ kết thúc, trạng thái ban đầu, nhắc nhở và quy tắc lặp lại.
- **FR-008**: Khi tạo công việc mới, hệ thống MUST đặt giá trị mặc định: trạng thái là đang thực hiện, không lặp lại, nhắc nhở tắt.
- **FR-009**: Hệ thống MUST từ chối lưu công việc khi tên trống, khi giờ kết thúc sớm hơn hoặc bằng giờ bắt đầu, hoặc khi ngày/giờ không hợp lệ, và MUST hiển thị lỗi ngay tại trường tương ứng.
- **FR-010**: Người dùng MUST có thể chỉnh sửa tên, ghi chú, ngày, giờ bắt đầu, giờ kết thúc, trạng thái, nhắc nhở và quy tắc lặp lại của một công việc.
- **FR-011**: Người dùng MUST có thể xóa công việc thông thường. Hệ thống MUST thực hiện xóa ngay mà không chặn bằng bước xác nhận, và MUST cung cấp hành động hoàn tác thay cho việc xác nhận trước.
- **FR-011a**: Hành động hoàn tác MUST khả dụng ít nhất 5 giây kể từ khi xóa, MUST KHÔNG biến mất khi người dùng chuyển ngày hoặc mở màn hình khác trong khoảng đó, và khi được dùng MUST khôi phục công việc cùng mọi nhắc nhở của nó về đúng trạng thái trước khi xóa.
- **FR-011b**: Xóa toàn bộ dữ liệu trong Cài đặt MUST vẫn yêu cầu bước xác nhận, vì thao tác đó không có hoàn tác (xem FR-054).
- **FR-012**: Sau khi xóa, hệ thống MUST loại công việc khỏi timeline, xóa dữ liệu của nó khỏi thiết bị, và hủy nhắc nhở liên quan.
- **FR-013**: Hệ thống MUST cảnh báo người dùng khi họ rời khỏi form tạo hoặc sửa mà còn thay đổi chưa lưu.

#### Trạng thái công việc

- **FR-014**: Hệ thống MUST hỗ trợ hai trạng thái công việc: đang thực hiện và hoàn thành.
- **FR-015**: Người dùng MUST có thể chuyển đổi trạng thái theo cả hai chiều ngay trên timeline mà không cần mở form chỉnh sửa, và thay đổi MUST được lưu ngay.
- **FR-016**: Công việc hoàn thành MUST vẫn hiển thị trên timeline với dấu hiệu trực quan khác biệt không chỉ dựa vào màu sắc.
- **FR-017**: Hệ thống MUST đánh dấu công việc là quá hạn khi thời gian của nó đã trôi qua và trạng thái chưa phải hoàn thành, và MUST KHÔNG tự động chuyển công việc quá hạn sang hoàn thành.

#### Di chuyển công việc

- **FR-018**: Người dùng MUST có thể di chuyển một công việc thông thường sang khung giờ khác trong cùng ngày, sang ngày khác, hoặc sang khung giờ khác của ngày khác.
- **FR-018a**: Người dùng MUST có thể đổi khung giờ của công việc trong cùng một ngày bằng thao tác kéo và thả trên timeline, với phản hồi trực quan về vị trí thả trong lúc kéo.
- **FR-018b**: Việc đổi sang ngày khác MUST được thực hiện qua hành động "Di chuyển" hoặc qua form chỉnh sửa; kéo và thả MUST KHÔNG dùng để chuyển công việc sang ngày khác.
- **FR-018c**: Mọi thao tác thực hiện được bằng kéo và thả MUST có lối thay thế không dùng cử chỉ, khả dụng với trình đọc màn hình.
- **FR-019**: Sau khi di chuyển, hệ thống MUST cập nhật thời gian của công việc, cập nhật timeline ngay, và đặt lại nhắc nhở theo thời gian mới.

#### Công việc lặp lại

- **FR-020**: Người dùng MUST có thể thiết lập công việc lặp lại vào một hoặc nhiều ngày trong tuần, từ Thứ Hai đến Chủ Nhật.
- **FR-021**: Một quy tắc lặp lại MUST lưu được: ngày bắt đầu áp dụng, các ngày trong tuần, giờ bắt đầu mặc định, giờ kết thúc hoặc thời lượng mặc định, ngày kết thúc tùy chọn, và cấu hình nhắc nhở mặc định.
- **FR-022**: Khi không có ngày kết thúc, hệ thống MUST tiếp tục sinh lần xuất hiện vô thời hạn.
- **FR-023**: Hệ thống MUST sinh lần xuất hiện của công việc lặp lại theo nhu cầu hiển thị thay vì lưu sẵn toàn bộ lần xuất hiện trong dữ liệu.
- **FR-024**: Hệ thống MUST chỉ sinh lần xuất hiện từ ngày bắt đầu trở đi, và MUST bao gồm cả ngày kết thúc nếu ngày đó nằm trong các ngày lặp đã chọn.
- **FR-025**: Hệ thống MUST phân biệt trực quan lần xuất hiện của công việc lặp lại với công việc thông thường trên timeline.

#### Điều chỉnh riêng từng lần xuất hiện

- **FR-026**: Khi người dùng chỉnh sửa nội dung, di chuyển hoặc xóa một lần xuất hiện của công việc lặp lại, hệ thống MUST yêu cầu chọn phạm vi áp dụng gồm "Chỉ lần này", "Toàn bộ chuỗi" và "Hủy".
- **FR-026a**: Đổi trạng thái của một lần xuất hiện MUST KHÔNG hỏi phạm vi áp dụng. Thao tác này luôn được ghi nhận cho đúng lần xuất hiện đó, tương đương phạm vi "Chỉ lần này".
- **FR-026b**: Khi hỏi phạm vi áp dụng, hệ thống MUST cho biết số lần xuất hiện bị ảnh hưởng bởi mỗi lựa chọn, để người dùng hiểu hậu quả trước khi chọn.
- **FR-026c**: Số lần xuất hiện bị ảnh hưởng MUST được đếm trong 365 ngày kể từ ngày đang thao tác. Khi quy tắc lặp không có ngày kết thúc, hệ thống MUST nói rõ rằng các lần xuất hiện sau mốc đó cũng bị ảnh hưởng, thay vì trình bày con số đếm được như thể đó là toàn bộ.
- **FR-027**: Khi chọn "Chỉ lần này", hệ thống MUST chỉ ghi nhận điều chỉnh riêng cho lần xuất hiện đó và MUST KHÔNG thay đổi quy tắc lặp lại.
- **FR-028**: Một lần xuất hiện MUST có tối đa một điều chỉnh riêng, xác định duy nhất bởi cặp quy tắc lặp lại và ngày xuất hiện.
- **FR-029**: Điều chỉnh riêng MUST có thể thay đổi giờ bắt đầu, giờ kết thúc, tên, ghi chú, trạng thái, cấu hình nhắc nhở, hoặc đánh dấu lần xuất hiện đó bị bỏ qua.
- **FR-030**: Khi chọn "Toàn bộ chuỗi" để chỉnh sửa, hệ thống MUST cập nhật quy tắc lặp lại và áp dụng cho mọi lần xuất hiện chưa có điều chỉnh riêng, đồng thời MUST giữ nguyên các điều chỉnh riêng đã tạo.
- **FR-031**: Khi chọn "Toàn bộ chuỗi" để xóa, hệ thống MUST xóa quy tắc lặp lại, loại bỏ mọi lần xuất hiện tương lai và hủy mọi nhắc nhở tương lai của chuỗi đó.
- **FR-032**: Việc đánh dấu hoàn thành cho một lần xuất hiện MUST KHÔNG làm thay đổi trạng thái của các lần xuất hiện khác trong cùng chuỗi.

#### Nhắc nhở

- **FR-033**: Người dùng MUST có thể bật hoặc tắt nhắc nhở, và chọn mốc nhắc, cho từng công việc và cho từng quy tắc lặp lại.
- **FR-034**: Nhắc nhở MUST hoạt động hoàn toàn trên thiết bị, không phụ thuộc vào máy chủ, dịch vụ đẩy thông báo từ xa hoặc kết nối Internet.
- **FR-035**: Nội dung nhắc nhở MUST gồm tối thiểu tên ứng dụng, tên công việc, thời gian công việc, và đủ thông tin định danh để mở đúng công việc khi người dùng chạm vào.
- **FR-036**: Hệ thống MUST hỗ trợ các mốc nhắc sau, tính theo giờ bắt đầu của công việc: đúng giờ, trước 5 phút, trước 10 phút, trước 15 phút, trước 30 phút và trước 1 giờ.
- **FR-036c**: Khi người dùng bật nhắc nhở cho một công việc mới, hệ thống MUST áp dụng mốc nhắc mặc định lấy từ cài đặt ứng dụng, và người dùng MUST có thể đổi mốc đó riêng cho công việc hoặc quy tắc lặp đang chỉnh sửa.
- **FR-036a**: Trên nền tảng đòi hỏi quyền riêng để đặt nhắc nhở đúng thời điểm, hệ thống MUST xin quyền đó vào lần đầu người dùng bật nhắc nhở, chứ không phải khi khởi động ứng dụng lần đầu.
- **FR-036b**: Khi quyền đặt nhắc nhở đúng thời điểm bị từ chối hoặc bị thu hồi, hệ thống MUST vẫn đặt nhắc nhở ở chế độ gần đúng, MUST hiển thị rõ cho người dùng rằng nhắc nhở có thể bị phát trễ, và MUST cung cấp lối tắt để cấp lại quyền.
- **FR-037**: Hệ thống MUST đồng bộ nhắc nhở với mọi thay đổi của công việc theo bảng sau:

  | Thao tác | Xử lý nhắc nhở |
  | --- | --- |
  | Tạo công việc có bật nhắc nhở | Đặt nhắc nhở |
  | Đổi giờ hoặc đổi ngày công việc | Hủy nhắc nhở cũ và đặt lại theo thời gian mới |
  | Đánh dấu hoàn thành | Hủy nhắc nhở chưa phát |
  | Chuyển từ hoàn thành về đang thực hiện | Đặt lại nếu thời điểm nhắc còn ở tương lai |
  | Xóa công việc | Hủy nhắc nhở |
  | Tắt nhắc nhở | Hủy nhắc nhở |
  | Bật nhắc nhở | Đặt nhắc nhở |
  | Di chuyển một lần xuất hiện lặp lại | Chỉ cập nhật nhắc nhở của lần xuất hiện đó |
  | Xóa toàn bộ chuỗi lặp lại | Hủy mọi nhắc nhở tương lai của chuỗi |

- **FR-038**: Khi thời điểm nhắc đã nằm trong quá khứ tại lúc lưu, hệ thống MUST KHÔNG đặt nhắc nhở và MUST hiển thị cảnh báo cho người dùng.
- **FR-039**: Hệ thống MUST xin quyền gửi thông báo theo quy định của nền tảng. Nếu người dùng từ chối, công việc vẫn được lưu, ứng dụng vẫn hoạt động bình thường, hiển thị rõ nhắc nhở đang bị vô hiệu hóa, và cung cấp hướng dẫn mở cài đặt hệ thống.
- **FR-040**: Với công việc lặp lại, hệ thống MUST đặt trước nhắc nhở cho một khoảng thời gian giới hạn ở phía trước thay vì đăng ký lặp vô hạn, và MUST làm mới khoảng này khi ứng dụng mở, khi ứng dụng quay lại tiền cảnh, và khi quy tắc lặp thay đổi.
- **FR-041**: Khi ứng dụng khởi động, hệ thống MUST đối chiếu công việc đã lưu với nhắc nhở đang được đặt và MUST đặt lại những nhắc nhở bị thiếu hoặc sai thời gian. Việc đối chiếu MUST cho cùng kết quả khi chạy nhiều lần.
- **FR-042**: Sau khi thiết bị khởi động lại, hệ thống MUST khôi phục các nhắc nhở tương lai nếu nền tảng đã xóa chúng.
- **FR-043**: Khi người dùng chạm vào nhắc nhở, hệ thống MUST mở ứng dụng, điều hướng tới ngày chứa công việc và làm nổi bật hoặc mở chi tiết công việc đó. Nếu công việc đã bị xóa, hệ thống MUST mở timeline của ngày hiện tại mà không hiển thị lỗi hệ thống.
- **FR-044**: Lỗi khi đặt nhắc nhở MUST KHÔNG làm thao tác lưu công việc thất bại.

#### Lưu trữ dữ liệu trên thiết bị

- **FR-045**: Hệ thống MUST lưu toàn bộ dữ liệu trên thiết bị, gồm công việc, quy tắc lặp lại, điều chỉnh riêng, trạng thái, cấu hình nhắc nhở và cài đặt ứng dụng.
- **FR-046**: Hệ thống MUST ghi dữ liệu xuống bộ nhớ lâu dài của thiết bị ngay sau mỗi thao tác thành công, không chỉ giữ trong bộ nhớ tạm, và MUST đọc lại dữ liệu khi khởi động.
- **FR-047**: Dữ liệu MUST tồn tại sau khi đóng ứng dụng, buộc dừng ứng dụng, khởi động lại thiết bị và cập nhật phiên bản ứng dụng.
- **FR-048**: Khi cấu trúc dữ liệu thay đổi giữa các phiên bản, hệ thống MUST giữ nguyên dữ liệu hiện có và MUST KHÔNG tự động xóa dữ liệu; trường hợp nâng cấp thất bại MUST được xử lý an toàn, không làm hỏng dữ liệu đang có.
- **FR-049**: Dữ liệu công việc MUST KHÔNG rời khỏi thiết bị và MUST KHÔNG được khôi phục tự động từ dịch vụ sao lưu của nền tảng sau khi cài lại ứng dụng.
- **FR-050**: Một thao tác của người dùng MUST KHÔNG tạo ra công việc trùng lặp.

#### Cài đặt

- **FR-051**: Người dùng MUST có thể xem trạng thái quyền thông báo và trạng thái quyền đặt nhắc nhở đúng thời điểm, và mở cài đặt hệ thống tương ứng từ trong ứng dụng.
- **FR-052**: Người dùng MUST có thể chọn ngày bắt đầu tuần, và lựa chọn này MUST được áp dụng cho bộ chọn ngày và được lưu lại.
- **FR-052a**: Người dùng MUST có thể chọn mốc nhắc mặc định trong Cài đặt. Thay đổi này MUST chỉ áp dụng cho công việc tạo mới về sau và MUST KHÔNG sửa mốc nhắc của công việc hay quy tắc lặp đã tồn tại.
- **FR-052b**: Người dùng MUST có thể chọn chế độ hiển thị trong Cài đặt với đúng ba giá trị: Tự động (theo cài đặt sáng/tối của hệ thống), Sáng, và Tối. Giá trị mặc định MUST là Tự động.
- **FR-052c**: Lựa chọn chế độ hiển thị MUST được lưu lại và áp dụng ngay khi thay đổi, MUST giữ nguyên sau khi mở lại ứng dụng, và khi ở chế độ Tự động MUST đi theo thay đổi của hệ thống trong lúc ứng dụng đang chạy.
- **FR-053**: Ứng dụng MUST hiển thị thông tin cho người dùng biết dữ liệu chỉ được lưu trên thiết bị.
- **FR-054**: Người dùng MUST có thể xóa toàn bộ dữ liệu sau một bước xác nhận, và thao tác này MUST xóa mọi công việc, quy tắc lặp, điều chỉnh riêng và nhắc nhở đã đặt.

#### Chất lượng trải nghiệm

- **FR-055**: Mọi thao tác đọc dữ liệu MUST xử lý đủ các trạng thái đang tải, có dữ liệu, rỗng và lỗi kèm hành động thử lại; MUST KHÔNG hiển thị màn hình trắng hoặc mã lỗi kỹ thuật cho người dùng.
- **FR-055a**: Mọi lỗi đọc/ghi dữ liệu và lỗi đặt nhắc nhở MUST được ghi vào một nhật ký lỗi cục bộ trên thiết bị; lỗi MUST KHÔNG bị bỏ qua im lặng.
- **FR-055b**: Nhật ký lỗi MUST có giới hạn dung lượng và tự xoay vòng để không tăng vô hạn, MUST KHÔNG chứa tên hoặc ghi chú của công việc, và MUST KHÔNG được gửi ra khỏi thiết bị.
- **FR-055c**: Ứng dụng MUST KHÔNG tích hợp analytics hoặc dịch vụ báo sự cố của bên thứ ba.
- **FR-056**: Ứng dụng MUST hoạt động đầy đủ ở cả chế độ sáng và chế độ tối.
- **FR-057**: Mọi thành phần tương tác MUST có nhãn cho trình đọc màn hình, vùng chạm đủ lớn theo chuẩn của nền tảng, và bố cục MUST không bị cắt chữ khi người dùng phóng to cỡ chữ hệ thống.
- **FR-058**: Ứng dụng MUST KHÔNG yêu cầu đăng nhập, đăng ký, hoặc bất kỳ thông tin định danh cá nhân nào, và MUST KHÔNG yêu cầu quyền hệ thống không liên quan tới chức năng.
- **FR-058a**: Mọi chuỗi hiển thị cho người dùng, gồm cả nội dung nhắc nhở và thông báo lỗi, MUST được lấy từ một danh mục chuỗi tập trung; MUST KHÔNG viết thẳng chuỗi hiển thị trong màn hình hay thành phần giao diện. Phiên bản đầu tiên chỉ cung cấp bản tiếng Việt.
- **FR-059**: Android và iOS MUST cho cùng kết quả nghiệp vụ đối với trạng thái công việc, lặp lại, điều chỉnh riêng, di chuyển công việc, lưu trữ dữ liệu và lịch nhắc nhở.

### Key Entities

- **Công việc (Task)**: Một việc cần làm tại một ngày và khung giờ cụ thể. Gồm tên, ghi chú tùy chọn, ngày thực hiện, giờ bắt đầu, giờ kết thúc tùy chọn, trạng thái, cấu hình nhắc nhở, và mốc thời gian tạo/cập nhật. Công việc thông thường không gắn với quy tắc lặp lại nào.
- **Quy tắc lặp lại (Recurring Rule)**: Lịch mẫu sinh ra các lần xuất hiện theo những ngày cố định trong tuần. Gồm tên, ghi chú tùy chọn, ngày bắt đầu áp dụng, ngày kết thúc tùy chọn, tập các ngày trong tuần, giờ bắt đầu và kết thúc mặc định, và cấu hình nhắc nhở mặc định.
- **Lần xuất hiện (Occurrence)**: Một buổi cụ thể của quy tắc lặp lại tại một ngày. Được suy ra từ quy tắc lặp lại kết hợp với điều chỉnh riêng nếu có, không được lưu sẵn cho mọi ngày trong tương lai.
- **Điều chỉnh riêng (Override)**: Thay đổi chỉ áp dụng cho đúng một lần xuất hiện, xác định duy nhất bởi cặp quy tắc lặp lại và ngày xuất hiện. Có thể ghi đè tên, ghi chú, giờ bắt đầu, giờ kết thúc, trạng thái, cấu hình nhắc nhở, hoặc đánh dấu lần xuất hiện bị bỏ qua.
- **Nhắc nhở đã đặt (Scheduled Reminder)**: Lời nhắc gắn với một công việc hoặc một lần xuất hiện, có định danh ổn định để có thể hủy và đặt lại nhiều lần cho cùng một kết quả. Đây là dữ liệu dẫn xuất, luôn có thể tái tạo từ công việc và quy tắc lặp lại.
- **Cài đặt ứng dụng (App Setting)**: Cặp khóa–giá trị lưu tùy chọn của người dùng, ví dụ ngày bắt đầu tuần, thời điểm nhắc mặc định, và chế độ hiển thị sáng/tối.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người dùng mới tạo được công việc đầu tiên trong dưới 60 giây kể từ lần mở ứng dụng đầu tiên, không cần hướng dẫn.
- **SC-002**: Người dùng tạo một công việc với tên, ngày và giờ trong tối đa 5 thao tác kể từ timeline.
- **SC-003**: 100% công việc đã lưu vẫn còn nguyên sau khi đóng ứng dụng, buộc dừng ứng dụng và khởi động lại thiết bị.
- **SC-004**: Timeline của một ngày hiển thị đầy đủ trong dưới 0,5 giây khi dữ liệu trên thiết bị chứa tới 5.000 công việc.
- **SC-005**: Thao tác đổi trạng thái công việc phản hồi trên giao diện trong dưới 0,1 giây; thao tác tạo hoặc cập nhật công việc phản hồi trong dưới 0,3 giây.
- **SC-006**: Cuộn timeline của một ngày đầy công việc trên thiết bị cấu hình thấp thuộc nhóm mục tiêu giữ tối thiểu 60 khung hình mỗi giây, với không quá 1% khung hình bị bỏ lỡ trong 10 giây cuộn liên tục.
- **SC-007**: 100% chức năng cốt lõi — xem, tạo, sửa, xóa, đổi trạng thái, di chuyển, lặp lại và nhắc nhở — hoạt động đầy đủ khi thiết bị ở chế độ máy bay.
- **SC-008**: Khi quyền đặt nhắc nhở đúng thời điểm được cấp, nhắc nhở xuất hiện trong khoảng ±1 phút so với thời điểm đã đặt, kể cả khi ứng dụng đã đóng hoàn toàn. Khi quyền bị từ chối, nhắc nhở vẫn được phát trong vòng 15 phút kể từ thời điểm đã đặt và giao diện cho biết trước rằng nhắc nhở có thể bị trễ.
- **SC-009**: Việc di chuyển hoặc chỉnh sửa riêng một lần xuất hiện không làm thay đổi 100% các lần xuất hiện còn lại của cùng chuỗi.
- **SC-010**: Chạm vào nhắc nhở mở đúng ngày và đúng công việc trong 100% trường hợp công việc còn tồn tại, và không gây lỗi hệ thống trong 100% trường hợp công việc đã bị xóa.
- **SC-011**: Sau khi gỡ và cài lại ứng dụng, số công việc được khôi phục tự động bằng 0.
- **SC-012**: 100% kịch bản nghiệm thu cốt lõi cho cùng kết quả nghiệp vụ trên Android và iOS.
- **SC-013**: Không có trường hợp mất dữ liệu nào khi ứng dụng bị đóng ngay sau một thao tác lưu thành công.
- **SC-014**: 100% trường hợp lỗi đọc dữ liệu hiển thị thông báo dễ hiểu kèm hành động thử lại; không có màn hình nào rơi vào trạng thái trắng hoặc không phản hồi.
- **SC-015**: 100% lỗi đọc/ghi dữ liệu và lỗi đặt nhắc nhở được ghi vào nhật ký cục bộ; số mục nhật ký chứa tên hoặc ghi chú công việc bằng 0; số byte dữ liệu chẩn đoán rời khỏi thiết bị bằng 0.

## Out of Scope

Những nội dung sau nằm ngoài phạm vi phiên bản đầu tiên:

- Đăng nhập, đăng ký, hoặc tài khoản người dùng.
- Đồng bộ dữ liệu giữa nhiều thiết bị và sao lưu lên dịch vụ đám mây.
- Chia sẻ công việc, quản lý nhóm, không gian làm việc, bình luận, trò chuyện hoặc tệp đính kèm.
- Thông báo đẩy từ máy chủ và đồng bộ thời gian thực.
- Phiên bản web.
- Khôi phục dữ liệu sau khi gỡ ứng dụng.
- Nhập hoặc xuất tệp bảng tính.
- Tích hợp lịch của bên thứ ba.
- Phạm vi chỉnh sửa "Lần này và các lần sau" cho công việc lặp lại.
- Nhắc nhở lặp lại nhiều lần cho cùng một công việc, hoặc mốc nhắc tùy ý ngoài danh sách đã quy định.
- Kéo và thả để chuyển công việc sang một ngày khác (kéo-thả chỉ áp dụng trong phạm vi một ngày).
- Thao tác nhanh trên một công việc bằng cách vuốt ngang trên dòng — cử chỉ vuốt ngang đã được dành cho việc chuyển ngày (FR-003a).
- Quy tắc lặp lại theo chu kỳ khác ngày trong tuần, ví dụ theo ngày trong tháng hoặc cách N ngày.
- Phân loại công việc bằng nhãn, dự án, mức ưu tiên, hoặc tìm kiếm toàn cục.

## Assumptions

Những giả định sau được chọn làm mặc định hợp lý vì tài liệu nguồn không quy định dứt khoát. Nên xác nhận chúng trước khi lập kế hoạch triển khai.

- **Mốc nhắc mặc định**: Giá trị mặc định ban đầu là nhắc đúng giờ bắt đầu; người dùng đổi được trong Cài đặt.
- **Phạm vi chỉnh sửa công việc lặp lại**: Phiên bản đầu tiên chỉ hỗ trợ "Chỉ lần này" và "Toàn bộ chuỗi", đúng theo giới hạn MVP mà tài liệu nguồn cho phép.
- **Khoảng đặt trước nhắc nhở cho công việc lặp lại**: 30 ngày tính từ thời điểm làm mới, theo khuyến nghị của tài liệu nguồn.
- **Sao lưu của nền tảng**: Cơ chế sao lưu và khôi phục tự động của hệ điều hành được tắt cho dữ liệu công việc, để bảo đảm yêu cầu dữ liệu biến mất khi gỡ ứng dụng.
- **Múi giờ**: Công việc được hiểu theo giờ địa phương của thiết bị. Khi người dùng đổi múi giờ, công việc giữ nguyên giờ hiển thị; ví dụ 09:00 vẫn là 09:00 ở múi giờ mới.
- **Quy ước tuần**: Ngày bắt đầu tuần mặc định là Thứ Hai; người dùng có thể đổi trong cài đặt.
- **Người dùng**: Một người dùng duy nhất trên mỗi thiết bị, không có vai trò hay phân quyền; mọi chức năng đều khả dụng với người dùng thiết bị.
- **Nền tảng mục tiêu**: Android và iOS, các phiên bản hệ điều hành còn được nhà sản xuất hỗ trợ tại thời điểm phát hành.
- **Khối lượng dữ liệu**: Mục tiêu hiệu năng đặt ở mức tối đa 5.000 công việc trên một thiết bị.

## Dependencies

- Cơ chế thông báo cục bộ theo lịch của hệ điều hành, bao gồm luồng xin quyền của từng nền tảng.
- Cơ chế lưu trữ dữ liệu có cấu trúc trong vùng dữ liệu riêng của ứng dụng trên thiết bị.
- Khả năng khôi phục lịch nhắc nhở sau khi thiết bị khởi động lại trên Android.
- Cấu hình sao lưu ở cấp nền tảng để loại dữ liệu công việc khỏi sao lưu tự động.
- Tài liệu nguồn: [artifacts/Task_Manager_Implementation_Playbook.md](../../artifacts/Task_Manager_Implementation_Playbook.md).

## Design artifacts

Đặc tả giao diện đã chốt nằm ở [design/](./design/) — bắt buộc đọc trước `/speckit.plan`:

- [design/README.md](./design/README.md) — chỉ mục, đọc file nào ở giai đoạn nào.
- [design/design-system.md](./design/design-system.md) — ba màu thương hiệu, bảng token ngữ nghĩa đã kiểm tương phản WCAG, cách nối vào `@chipmobilesdk/rn-theme@0.2.1`, mã thiết lập Unistyles, và các khoảng lệch phải override so với mặc định của SDK.
- [design/ia-screens-flows.md](./design/ia-screens-flows.md) — cây màn hình, 9 màn hình (S-01…S-09), 6 luồng người dùng kèm ngân sách thao tác.
- [design/wireframes.md](./design/wireframes.md) — 6 wireframe 390×812 kèm chiều cao tối thiểu.
- [design/ux-ui-spec.md](./design/ux-ui-spec.md) — giải phẫu dòng công việc, thang chữ, ma trận trạng thái bắt buộc, spec thành phần, ghi chú tương tác.
- [design/decisions.md](./design/decisions.md) — 6 quyết định thiết kế. Năm quyết định đã chốt trong phiên làm rõ ngày 2026-08-02 và đã được ghi vào bản đặc tả này (FR-003a/b/c, FR-011/011a/011b, FR-026/026a/026b/026c, FR-052b/052c); quyết định về bộ biểu tượng được hoãn sang giai đoạn lập kế hoạch.
- [design/traceability.md](./design/traceability.md) — ma trận truy vết yêu cầu ↔ màn hình ↔ luồng, phủ 80/80 yêu cầu. Mục 5 ghi hai chỗ lệch có chủ đích so với hiến pháp dự án, cần đưa vào bảng Complexity Tracking khi lập kế hoạch.
