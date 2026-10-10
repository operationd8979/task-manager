# Raw spec: Quảng cáo và gói mua bỏ quảng cáo cho Task Manager

> Tài liệu này là **raw spec**: nó nêu ý định, bối cảnh, ràng buộc và những câu hỏi
> còn mở. Nó **không** chốt thiết kế kỹ thuật, không nêu tên API, không mô tả cấu
> trúc mã. Dùng nó làm đầu vào cho `/sdd-spec` → `/sdd-plan`.
>
> **§4** ghi lại tám quyết định sản phẩm, đã chốt ngày 2026-10-10. Hai mục được chốt lại
> trong cùng ngày sau khi cân rủi ro:
>
> - **§4.3** — interstitial hiện **sau khi** đã quay về timeline và task mới đã hiển thị,
>   không chặn ngay lúc bấm Lưu. Tần suất "mỗi 3 task" không đổi.
> - **§4.4** — banner **ghim ngoài vùng vuốt chuyển ngày**, không nằm trong danh sách
>   task. Phương án "là một item của danh sách" bị bỏ vì giãn cách yêu cầu của
>   `@chipmobilesdk/rn-ads` 0.3.0 sẽ làm nó vắng mặt phần lớn thời gian.
>
> **Ba câu hỏi nhỏ còn mở**: điểm vào paywall; ghim banner ở đáy hay đỉnh và thứ tự xếp
> lớp với snackbar hoàn tác cùng nút thêm task; và cách đếm bộ đếm 3 task.
>
> **§16** đánh giá hai SDK dùng chung. §16.1 là hạng mục đã được triển khai ở repo SDK
> sau khi raw spec này nêu ra; phần còn lại ghi cái gì cố ý thuộc về ứng dụng. Mục §16
> không thuộc phạm vi triển khai của app này.

## 1. Mục đích

Task Manager hiện là ứng dụng miễn phí, hoàn toàn offline, không có nguồn thu. Mục
tiêu của hạng mục này là tạo ra doanh thu bằng **quảng cáo** cho người dùng miễn
phí, đồng thời bán một **gói bỏ quảng cáo** để người dùng trả tiền một lần (hoặc
theo kỳ — xem §4.1) có trải nghiệm sạch.

Hai năng lực kỹ thuật đã tồn tại dưới dạng SDK dùng chung của hệ sinh thái:
`@chipmobilesdk/rn-ads` và `@chipmobilesdk/rn-payment`. **Cả hai đều không biết gì
về nhau và không biết gì về Task Manager.** Hạng mục này vì vậy không phải là xây
SDK, mà là:

1. Quyết định **chính sách sản phẩm**: bán cái gì, giá bao nhiêu, quảng cáo xuất
   hiện ở đâu, với tần suất nào, và điều gì xảy ra trên nền tảng chưa được hỗ trợ.
2. **Nối dây** tín hiệu quyền lợi của SDK thanh toán vào trạng thái bật/tắt của SDK
   quảng cáo, bằng mã của chính ứng dụng.
3. Dựng các **giao diện** mà SDK không dựng: paywall, nút khôi phục giao dịch, trạng
   thái chờ thanh toán, và chỗ dành cho banner trên timeline.
4. Hoàn thành **nghĩa vụ phía Play Console và Play policy** mà không thể làm bằng mã
   nguồn.

Nói ngắn gọn: **SDK sở hữu năng lực, ứng dụng này sở hữu chính sách.** Phần lớn công
việc nằm ở chính sách và ở giao diện, không ở kỹ thuật tích hợp.

## 2. Bối cảnh ứng dụng hiện tại

Đây là phần khiến raw spec này là của *ứng dụng này*, không phải một spec chung. Mọi
quyết định ở §4 phải tương thích với các sự thật dưới đây.

### 2.1. Sản phẩm

- **Ứng dụng quản lý công việc theo timeline ngày.** Màn hình chính hiển thị timeline
  của một ngày; người dùng tạo công việc có ngày, giờ bắt đầu, giờ kết thúc tùy chọn.
- **Có quy tắc lặp theo ngày trong tuần**, có điều chỉnh riêng từng buổi.
- **Có nhắc nhở cục bộ** qua thông báo hệ thống, kèm luồng xin quyền.
- **Có màn hình Cài đặt** chứa: trạng thái quyền thông báo, ngày bắt đầu tuần, mốc
  nhắc mặc định, chế độ sáng/tối, và xóa toàn bộ dữ liệu.
- **Dùng theo nhịp ngắn, nhiều lần trong ngày.** Người dùng mở app để xem hôm nay có
  gì, tick một việc, rồi đóng. Đây là yếu tố quyết định format quảng cáo phù hợp.

### 2.2. Những ràng buộc có ảnh hưởng trực tiếp

| # | Sự thật | Hệ quả cho hạng mục này |
|---|---|---|
| 1 | **Không có đăng nhập, không có tài khoản người dùng** — nằm ngoài phạm vi theo spec 001 | Quyền lợi chỉ gắn với **tài khoản cửa hàng** trên máy, không gắn với tài khoản ứng dụng. Không có nhu cầu phân vùng quyền lợi theo người dùng app. Khôi phục giao dịch đi qua tài khoản cửa hàng. |
| 2 | **Dữ liệu chỉ nằm trên thiết bị, không đồng bộ, không sao lưu đám mây** | Không có backend nào để xác thực biên nhận. Quyền lợi mặc định được tính ở phía client. |
| 3 | **Sao lưu nền tảng đã bị TẮT cho dữ liệu công việc** — để bảo đảm dữ liệu biến mất khi gỡ app | **Bất đối xứng quan trọng:** dữ liệu công việc *cố ý* không sống sót qua gỡ app, nhưng quyền lợi đã mua **buộc phải** quay lại sau khi cài lại. Hai thứ này phải được xử lý khác nhau. |
| 4 | **Timeline dùng cử chỉ vuốt ngang để chuyển ngày**, và kéo-thả trong phạm vi một ngày | Vị trí banner phải không được xung đột với hai cử chỉ này, và không được làm dịch chuyển layout khiến kéo-thả lệch. **Đã xử lý ở §4.4** bằng cách ghim banner ngoài vùng vuốt. |
| 5 | **Có snackbar hoàn tác (undo)** sau khi xóa công việc | Banner xuất hiện/biến mất không được đẩy snackbar ra khỏi tầm nhìn hoặc làm người dùng bấm nhầm. **Còn mở**: thứ tự xếp lớp ở đáy màn hình, xem §4.4. |
| 6 | **Ba ngôn ngữ: vi-VN, en-US, ja-JP** | Mọi nội dung của paywall, nút khôi phục, trạng thái chờ thanh toán, thông báo lỗi đều phải dịch đủ ba. Giá tiền phải lấy từ cửa hàng, không tự dựng chuỗi. |
| 7 | **Có chế độ sáng/tối, kể cả chế độ Tự động** | Placeholder giữ chỗ banner, paywall và mọi trạng thái phải đúng ở cả hai chế độ. Nội dung quảng cáo thì do nhà cung cấp dựng, không theme được. |
| 8 | **Mục tiêu hiệu năng: tối đa 5.000 công việc, timeline phải mượt** | Banner không được gây re-render timeline, không được làm tụt frame khi cuộn hoặc vuốt chuyển ngày. |
| 9 | **Spec 001 ghi nền tảng mục tiêu là Android *và* iOS** | Cả hai SDK hiện **chỉ hỗ trợ Android**. Đây là câu hỏi mở lớn nhất — xem §4.5. |
| 10 | Ứng dụng đã có `react-native-nitro-modules` ở phiên bản mà SDK thanh toán cần | Giảm rủi ro xung đột phiên bản so với repo SDK, nhưng **vẫn phải xác minh**, không được giả định. |
| 11 | `applicationId` là `com.taskmanager`, `versionCode` 1 | Nếu chưa từng upload lên Play thì toàn bộ phần đăng ký sản phẩm là đường găng — xem §4.7. |

### 2.3. Năng lực mà hai SDK đã cung cấp

Nêu ở mức năng lực, không nêu API:

**SDK quảng cáo** cung cấp banner thích ứng, quảng cáo toàn màn (interstitial),
quảng cáo có thưởng (rewarded), và quảng cáo khi mở app (app-open). Nó nhận một
**khóa vị trí (placement key)** do ứng dụng đặt và tự lo việc yêu cầu quảng cáo.
Quan trọng: nó nhận trạng thái bật/tắt **ba giá trị** — bật, tắt, và **chưa quyết
định** — chính là để phục vụ một ứng dụng bán gói bỏ quảng cáo và vì thế không thể
trả lời "có hiện quảng cáo không" ngay lúc khởi động.

**SDK thanh toán** cung cấp mua một lần vĩnh viễn, mua tiêu hao, và thuê bao. Đầu ra
chính là **khóa quyền lợi (entitlement key)** do ứng dụng đặt, với ba trạng thái:
chưa biết, có quyền, không có quyền. Nó bảo đảm giao dịch đã trả tiền luôn được hoàn
tất với cửa hàng, hoạt động được khi offline, và chặn build không phải production
tạo giao dịch thật.

**Hai SDK không biết nhau.** Việc "có quyền lợi bỏ quảng cáo thì tắt quảng cáo" là
mã của ứng dụng này, và đó là thiết kế có chủ ý.

## 3. Các quyết định phạm vi đã làm rõ

- Phạm vi là **một hạng mục của ứng dụng Task Manager**, không phải sửa SDK. Nếu phát
  hiện thiếu sót trong SDK, ghi lại và xử lý ở repo SDK, không vá cục bộ trong app.
- Người dùng miễn phí thấy quảng cáo. Người dùng đã mua gói bỏ quảng cáo **không thấy
  bất kỳ quảng cáo nào**, ở mọi format, không có ngoại lệ.
- Quảng cáo **không bao giờ** được chen vào giữa một thao tác đang diễn ra: đang tạo
  công việc, đang kéo-thả, đang mở form, đang trong luồng xin quyền, đang hiển thị
  snackbar hoàn tác.
- Giá hiển thị **phải lấy từ cửa hàng**. Tuyệt đối không dựng chuỗi giá trong mã, vì
  ứng dụng có ba ngôn ngữ và sẽ bán ở nhiều quốc gia.
- Ứng dụng **phải có nút khôi phục giao dịch** ở nơi người dùng tìm được. Nhiều nền
  tảng yêu cầu điều này.
- Việc mất mạng, cửa hàng không khả dụng, hoặc quảng cáo không có hàng **không được
  làm hỏng** bất kỳ luồng chính nào: xem timeline, tạo/sửa công việc, nhắc nhở.
- Không có backend ở phiên bản này. Xác thực biên nhận phía server để dành.
- Không dùng giao dịch production thật để kiểm thử thủ công.

## 4. Những quyết định đã chốt

> **Chốt ngày 2026-10-10.** Tám câu hỏi mở ban đầu đã được chủ sản phẩm trả lời. Phần
> dưới ghi lại quyết định kèm hệ quả kéo theo. Hai mục có **rủi ro cần xác nhận lại**
> trước khi implement — xem §4.3 và §4.4.

### 4.1. Mô hình bán — **CHỐT: mua một lần vĩnh viễn**

Một sản phẩm `one_time_permanent` duy nhất.

Hệ quả: không có vòng đời thuê bao, nên **toàn bộ phần ân hạn / tạm giữ / đổi gói /
quản lý thuê bao nằm ngoài phạm vi**. Hạn chế đã biết của nền tảng về việc không phân
biệt được ân hạn với tạm giữ trên Android **không còn liên quan**. Không cần lối đi tới
màn hình quản lý thuê bao của cửa hàng.

### 4.2. Gói bán cái gì — **CHỐT: chỉ bỏ quảng cáo**

Đúng **một** khóa quyền lợi. Gói không mở thêm tính năng nào.

Hệ quả: paywall chỉ có một lựa chọn, thông điệp đơn giản. Nếu sau này muốn thêm tier
trả phí thì đó là hạng mục riêng, và khóa quyền lợi hiện tại không được đổi tên.

### 4.3. Format quảng cáo — **CHỐT: banner + interstitial mỗi 3 task, hiện sau khi về timeline**

- **Banner**: hiển thị thường trực trên timeline.
- **Interstitial**: cứ mỗi **3 task được tạo mới**, hiện quảng cáo toàn màn **sau khi đã
  quay về timeline và task mới đã hiển thị** (xem phần dưới).
- Không dùng rewarded. Không dùng app-open.

Hệ quả: việc đếm "mỗi 3 task" là **logic của ứng dụng** — SDK quảng cáo cố ý không có
cơ chế giới hạn tần suất. Bộ đếm cần quyết định: đếm theo phiên hay đếm bền qua các lần
mở app, và có đếm cả task sinh từ quy tắc lặp hay chỉ task tạo thủ công.

**Thời điểm hiện interstitial — CHỐT LẠI ngày 2026-10-10: sau khi đã quay về timeline
và task mới đã hiển thị**, không chặn ngay lúc bấm Lưu.

Lý do thay đổi so với phương án ban đầu:

- **Chính sách.** Google khuyến nghị interstitial đặt ở *điểm chuyển tiếp tự nhiên*,
  không chen vào giữa một hành động người dùng vừa chủ động thực hiện. Bấm "Lưu" có kỳ
  vọng rõ ràng: thấy task xuất hiện trên timeline. Chen toàn màn đúng khoảnh khắc đó là
  kiểu đặt dễ bị gắn cờ.
- **Trải nghiệm.** Chặn lúc bấm Lưu làm người dùng mất luôn phản hồi "đã lưu thành
  công" — họ không thấy task mình vừa tạo.

Tần suất **không đổi**: vẫn mỗi 3 task tạo mới. Chỉ thời điểm dịch sang sau khi
timeline đã hiển thị task mới. Việc quay về timeline chính là điểm chuyển tiếp tự nhiên
mà chính sách khuyến nghị.

Hệ quả cho implement: bộ đếm tăng khi lưu thành công, nhưng lệnh hiện quảng cáo phát ở
thời điểm timeline đã render xong task mới. Hai việc này tách nhau.

### 4.4. Vị trí banner — **CHỐT LẠI ngày 2026-10-10: ghim ngoài vùng vuốt, không nằm trong danh sách**

Banner **không** là một dòng trong danh sách task. Nó được ghim ở một vị trí cố định của
màn hình timeline, **bên ngoài** vùng vuốt chuyển ngày. Khi không có hàng hoặc lỗi thì
**thu lại hoàn toàn**, không giữ chỗ — giữ nguyên lựa chọn ban đầu về cách xử lý lỗi.

**Lý do đổi khỏi phương án "là một item của danh sách":**

`@chipmobilesdk/rn-ads` 0.3.0 cưỡng chế giãn cách tối thiểu 60 giây giữa hai yêu cầu cho
cùng một vị trí banner (§16.1). Một dòng banner nằm *bên trong* vùng vuốt sẽ bị hủy và
dựng lại mỗi lần đổi ngày → bị giãn cách chặn → thu lại → **biến mất**. Thực tế người
dùng sẽ thấy banner ở ngày đầu tiên rồi mất suốt cả phút khi vuốt qua lại. Vị trí banner
là quyết định hình ảnh; việc banner có hiện hay không là quyết định doanh thu — và phương
án ghim giữ được cái thứ hai.

**Những gì phương án này giải quyết luôn:**

| Vấn đề ở bản trước | Trạng thái |
|---|---|
| Banner bị giãn cách mỗi lần vuốt chuyển ngày | **Hết.** Banner giữ nguyên mount khi đổi ngày, giữ được quảng cáo đã tải, chỉ tốn một yêu cầu mỗi phiên |
| Banner xung đột cử chỉ vuốt ngang | **Hết.** Nó không còn nằm trong vùng nhận cử chỉ |
| Banner làm lệch điểm thả khi kéo-thả task | **Hết.** Nó ở ngoài danh sách |
| Layout nhảy mỗi lần vuốt | **Hết.** Chỉ nhảy một lần lúc banner xuất hiện hoặc biến mất trong phiên |

Ghi chú về tự làm mới: AdMob có cơ chế tự làm mới banner cấu hình trong AdMob Console.
Cơ chế đó chạy bên trong thành phần native, **không đi qua** giãn cách của SDK, nên ghim
banner không làm mất khả năng tự làm mới.

**Cái mất phải chấp nhận:** không còn cảm giác quảng cáo "là một item của danh sách". Nếu
sau này vẫn muốn quảng cáo hòa vào danh sách thật sự thì đó là **native ads**, một hạng
mục riêng ở repo SDK — xem §16.3.

> **Hai câu hỏi nhỏ còn mở về vị trí ghim, cần chốt ở `/sdd-spec` hoặc `/sdd-design`:**
>
> **1. Ghim ở đáy hay đỉnh?** Đáy là quy ước phổ biến cho banner neo, và đỉnh màn hình
> timeline đang là vùng điều hướng ngày. **Khuyến nghị: đáy.**
>
> **2. Nếu ghim đáy, thứ tự xếp lớp với những thứ đã có ở đáy là gì?** Màn hình timeline
> hiện đã có snackbar hoàn tác, và rất có thể có nút thêm task. Cần chốt:
> - Snackbar hoàn tác phải nổi **phía trên** banner, không bị banner che — thao tác hoàn
>   tác có thời hạn, bị che là mất dữ liệu (xem FR-A12).
> - Nút thêm task phải được nâng lên trên banner, không bị banner che.
> - Banner phải nằm trên vùng cử chỉ hệ thống, không bị chồng.
> - Khi banner thu lại, cả snackbar và nút thêm task phải tụt xuống lại mượt, không nhảy
>   giật.

### 4.5. iOS — **CHỐT: chỉ hỗ trợ Android ở hạng mục này**

Không quan tâm iOS lúc này.

Hệ quả: **phạm vi nền tảng của spec 001 cần được ghi nhận lại** — spec 001 ghi mục tiêu
là Android và iOS. Không được để tồn tại trạng thái người dùng iOS thấy paywall mà bấm
vào không mua được; cách đơn giản nhất là chưa phát hành iOS.

### 4.6. Quyền riêng tư và đồng ý — **CHỐT: bán toàn thế giới, có luồng đồng ý GDPR**

Hệ quả: phải có luồng đồng ý cho EU/EEA/UK, và **không được gửi yêu cầu quảng cáo nào**
trước khi cổng đồng ý cho phép.

Tin tốt: SDK quảng cáo **đã bọc sẵn** luồng đồng ý của Google (UMP) — gồm cả **biểu mẫu
do Google dựng**. Ứng dụng không phải tự thiết kế dialog đồng ý, chỉ cần gọi đúng thứ tự
và hiển thị lối vào "Tùy chọn quyền riêng tư" ở Cài đặt cho người dùng đổi ý sau.

Vẫn thuộc trách nhiệm ứng dụng: chính sách quyền riêng tư bằng ba ngôn ngữ, và khai báo
Data safety phản ánh advertising ID.

### 4.7. Trạng thái Play Console — **CHỐT: đã có tài khoản dev + payments profile; CHƯA tạo app**

Hệ quả, và đây là đường găng thật của hạng mục:

1. **Payments profile đã xong** — phần chờ duyệt lâu nhất đã qua. Tốt.
2. **Chưa tạo app trên Play Console.** Cần: tạo app với `applicationId` chốt là
   `com.taskmanager`, **tạo keystore release thật** (hiện release đang ký bằng debug
   keystore — không upload được), hoàn thành mục App content, và **upload ít nhất một
   bản lên kênh testing**.
3. **Sản phẩm trong app không hoạt động với build chưa từng upload lên Play.** Vì vậy
   không thể test mua hàng trên máy cho tới khi bước 2 xong.
4. Cần tạo đơn vị quảng cáo trong tài khoản AdMob và liên kết với app.

Việc mã nguồn và việc Play Console chạy song song được: toàn bộ logic nối dây kiểm thử
được bằng bộ giả lập của hai SDK, không cần cửa hàng.

### 4.8. Giá — **CHỐT: để Google quy đổi theo quốc gia**

Đặt một mức giá gốc, để Play tự quy đổi theo từng thị trường.

Hệ quả: củng cố yêu cầu đã có — **giá hiển thị phải lấy từ cửa hàng**, không được dựng
chuỗi giá trong mã. Với ba ngôn ngữ và bán toàn cầu, đây là điều kiện bắt buộc chứ không
phải khuyến nghị.

## 5. Thuật ngữ

- **Khóa quyền lợi (entitlement key)**: khóa logic do ứng dụng đặt, ví dụ `no_ads`. Mã
  nghiệp vụ hỏi tới nó, không hỏi tới mã sản phẩm của cửa hàng.
- **Khóa sản phẩm (product key)**: khóa logic do ứng dụng đặt cho một thứ bán được. Được
  ánh xạ sang mã sản phẩm của cửa hàng trong cấu hình.
- **Khóa vị trí (placement key)**: khóa logic do ứng dụng đặt cho một chỗ đặt quảng cáo.
- **Trạng thái "chưa biết"**: trạng thái quyền lợi lúc ứng dụng vừa khởi động và chưa
  đồng bộ xong với cửa hàng. Khác hẳn "không có quyền".
- **Trạng thái "chưa quyết định"** của quảng cáo: trạng thái bật/tắt tương ứng với
  "chưa biết" ở trên, dùng để giữ quảng cáo lại thay vì đoán.
- **Giao dịch đang chờ**: đã bắt đầu mua nhưng chưa trả xong tiền (ví dụ thanh toán
  tiền mặt). **Chưa được cấp quyền lợi.**
- **Khôi phục giao dịch**: đồng bộ lại quyền lợi từ cửa hàng, cho máy mới hoặc sau khi
  cài lại.

## 6. Mục tiêu

- Người dùng miễn phí thấy quảng cáo, và quảng cáo đó **không làm giảm** khả năng dùng
  app cho việc chính của nó.
- Người dùng đã trả tiền **không bao giờ** thấy quảng cáo, kể cả ngay lúc khởi động
  lạnh, kể cả khi offline, kể cả sau khi cài lại hoặc đổi máy.
- Không có trường hợp nào người dùng chưa trả tiền thành công mà được bỏ quảng cáo,
  đặc biệt với giao dịch đang chờ.
- Không có trường hợp nào người dùng đã trả tiền bị đối xử như chưa trả, dù chỉ trong
  vài giây lúc khởi động.
- Quảng cáo, thanh toán, mạng, cửa hàng — bất kỳ cái nào hỏng — **không làm hỏng**
  timeline, việc tạo/sửa công việc, hay nhắc nhở.
- Build phát triển và build test **không thể** tạo giao dịch thật, và **không thể** gửi
  yêu cầu tới đơn vị quảng cáo thật.
- Mọi nội dung mới đều có đủ ba ngôn ngữ và đúng ở cả chế độ sáng và tối.

## 7. Use case và story

Thứ tự phản ánh mức độ quan trọng.

### 7.1. Người dùng đã trả tiền không thấy quảng cáo, kể cả lúc khởi động lạnh (P1)

Là người dùng đã mua gói bỏ quảng cáo, tôi mở app và **không thấy quảng cáo nào**,
không có cảnh quảng cáo hiện lên rồi biến mất.

- Lúc khởi động, quyền lợi ở trạng thái "chưa biết" trong một khoảng ngắn. Trong khoảng
  đó, quảng cáo phải ở trạng thái "chưa quyết định" và **không được yêu cầu quảng cáo**.
- Khi quyền lợi xác nhận là có, quảng cáo bị tắt và không bao giờ bật lại trong phiên.
- Khi quyền lợi xác nhận là không có, quảng cáo được bật.
- Theo §4.4, dòng banner **thu lại** khi chưa có gì để hiện. Nghĩa là trong lúc "chưa
  quyết định" timeline không có dòng banner, và nó xuất hiện khi quyền lợi xác nhận là
  không có. Hệ quả phải chấp nhận: layout nhảy một lần ngay sau khi mở app. Cần xác nhận
  mức độ nhảy này ở `/sdd-design`.

### 7.2. Mua gói bỏ quảng cáo (P1)

Là người dùng miễn phí, tôi muốn trả tiền để bỏ quảng cáo, và quảng cáo biến mất ngay,
không cần khởi động lại app.

- Ứng dụng mở paywall từ một hoặc nhiều điểm vào (xem 7.3).
- Giá và mô tả gói lấy từ cửa hàng, hiển thị đúng tiền tệ và định dạng của người dùng.
- Kết quả phải phân biệt được: thành công, người dùng hủy, đang chờ thanh toán, đã sở
  hữu từ trước, không bán ở nước này, mất mạng, cửa hàng lỗi.
- **Người dùng hủy là chuyện bình thường**, không được hiển thị như lỗi.
- Khi thành công, quảng cáo tắt ngay trong phiên đang chạy.

### 7.3. Tìm được chỗ mua và chỗ khôi phục (P1)

Là người dùng, tôi tìm được chỗ mua gói bỏ quảng cáo, và nếu đã mua rồi thì tìm được
chỗ khôi phục.

- Cần chốt **điểm vào paywall**: màn hình Cài đặt? Một mục trên timeline? Một nút nhỏ
  cạnh banner? Hay cả mấy chỗ?
- **Nút khôi phục giao dịch bắt buộc phải có**, và nên nằm ở Cài đặt cạnh các mục quản
  lý dữ liệu hiện có.
- Khôi phục phải báo rõ kết quả, **kể cả trường hợp "không tìm thấy giao dịch nào"** —
  không được hiển thị thông báo thành công sai sự thật.
- Không cần lối đi tới màn hình quản lý thuê bao, vì §4.1 chốt là mua một lần.
- Cần có lối vào **"Tùy chọn quyền riêng tư"** ở Cài đặt để người dùng EU đổi lựa chọn
  đồng ý quảng cáo sau này (§4.6).

### 7.4. Đã mua rồi, cài lại máy hoặc đổi máy (P1)

Là người dùng đã mua, tôi cài lại app (hoặc dùng máy mới cùng tài khoản cửa hàng) và
quyền lợi tự quay lại.

- **Lưu ý bất đối xứng ở §2.2 #3**: dữ liệu công việc *cố ý* không quay lại sau khi gỡ
  app, nhưng quyền lợi **phải** quay lại. Cần bảo đảm việc tắt sao lưu nền tảng cho dữ
  liệu công việc không vô tình chặn quyền lợi quay lại.
- Đồng bộ tự động khi khởi động và khi app quay lại foreground.
- Người dùng chưa từng mua mà bấm khôi phục thì nhận thông báo "không tìm thấy", không
  phải thông báo thành công.

### 7.5. Hoạt động khi offline (P1)

Là người dùng đã mua và đang không có mạng, tôi vẫn không thấy quảng cáo.

- Quyền lợi đọc được khi offline, dựa trên lần đồng bộ thành công gần nhất.
- Mất mạng **không** được biến thành "mất quyền lợi", cũng **không** được biến thành
  "quyền lợi vĩnh viễn không bao giờ kiểm tra lại".
- Quảng cáo không tải được khi offline là chuyện bình thường; timeline phải hoạt động
  đầy đủ.

### 7.6. Giao dịch đang chờ thanh toán (P1)

Là người dùng trả bằng phương thức chậm, tôi hiểu rằng mình chưa trả xong, và quảng cáo
tự tắt khi tiền về, kể cả ở lần mở app sau.

- Giao dịch đang chờ **không bao giờ** được cấp quyền lợi, tức là quảng cáo vẫn hiện.
- Ứng dụng phải hiển thị được trạng thái chờ theo cách của mình, bằng cả ba ngôn ngữ.
- Khi tiền về ở phiên sau, quyền lợi được cấp mà không cần mua lại.

### 7.7. Quảng cáo không được phá luồng chính (P1)

Là người dùng miễn phí, tôi vẫn dùng được app bình thường dù có quảng cáo.

- Banner ghim ngoài vùng vuốt, nên không chặn cử chỉ chuyển ngày và không làm lệch
  kéo-thả công việc (§4.4). Vẫn phải kiểm chứng vùng chạm trên thiết bị thật.
- Banner không được che snackbar hoàn tác hoặc nút thêm task. Hoàn tác có thời hạn — bị
  che đồng nghĩa với mất dữ liệu.
- Banner giữ nguyên khi người dùng vuốt qua lại giữa các ngày; nó không nhấp nháy theo
  từng lần vuốt.
- Quảng cáo toàn màn không được xuất hiện khi đang mở form, đang kéo-thả, đang trong
  luồng xin quyền, khi một nhắc nhở vừa bật lên, hoặc khi snackbar hoàn tác còn hiệu lực.
- Quảng cáo không có hàng, lỗi, hoặc bị chặn bởi cổng đồng ý — không cái nào được làm
  hỏng màn hình.

### 7.8. Hoàn tiền thì quảng cáo quay lại (P2)

Là chủ ứng dụng, tôi muốn người đã lấy lại tiền thì thấy quảng cáo trở lại.

- Khi cửa hàng không còn báo giao dịch là hợp lệ, quyền lợi mất đi ở lần đồng bộ kế
  tiếp và quảng cáo bật lại.
- Bộ nhớ đệm cục bộ không được biến quyền lợi đã bị thu hồi thành vĩnh viễn.

### 7.9. Hiển thị đúng giá theo thị trường (P2)

Là người dùng, tôi thấy giá bằng đúng tiền tệ và định dạng ở nước tôi.

- Giá, tên gói, mô tả lấy từ cửa hàng.
- Nếu sản phẩm chưa được duyệt hoặc không bán ở nước hiện tại, paywall phải báo rõ, không
  hiển thị mục trống hoặc giá rỗng.

### 7.10. Phát triển và kiểm thử an toàn (P1)

Là lập trình viên, tôi muốn chắc chắn không thể vô tình tạo giao dịch thật hoặc gửi
yêu cầu quảng cáo thật trong lúc phát triển.

- Build phát triển không tạo được giao dịch production. (SDK thanh toán **chặn**, và
  việc chặn quan sát được.)
- Build phát triển dùng đơn vị quảng cáo test. (SDK quảng cáo **thay thế** bằng đơn vị
  test và cảnh báo — khác với thanh toán, và đây là bất đối xứng có chủ ý.)
- Hệ quả thực tế cần biết trước khi lập kế hoạch: **giao dịch của license tester là giao
  dịch Play thật**, nên việc kiểm thử mua trên máy cần build cấu hình release, không phải
  build debug.

## 8. Ngoài phạm vi

- Backend xác thực biên nhận và cơ sở dữ liệu quyền lợi phía server. Chỉ để mở đường.
- Đồng bộ quyền lợi giữa Android và iOS cho cùng một người. Không có tài khoản ứng dụng
  thì không có cách nào làm đúng việc này.
- Thử nghiệm A/B giá, khuyến mãi, mã giảm giá, dùng thử có điều kiện.
- Phân tích doanh thu, dashboard, tích hợp một nhà cung cấp analytics cụ thể.
- Cổng thanh toán ngoài cửa hàng, ví điện tử, thẻ trực tiếp. Hàng hóa số trong app phải
  dùng hệ thống thanh toán của cửa hàng.
- Quảng cáo gốc (native ads) và quảng cáo tự bán.
- Tier trả phí nhiều mức (Pro/Premium). §4.2 chốt chỉ bỏ quảng cáo.
- **Toàn bộ vòng đời thuê bao**: gia hạn, ân hạn, tạm giữ, đổi gói, màn hình quản lý
  thuê bao. §4.1 chốt mua một lần vĩnh viễn.
- **Quảng cáo có thưởng (rewarded) và quảng cáo khi mở app (app-open).** §4.3 chốt chỉ
  dùng banner và interstitial.
- **iOS.** §4.5 chốt chỉ Android.
- Sửa đổi SDK quảng cáo hoặc SDK thanh toán *trong repo này*. Thiếu sót được ghi ở §16
  và xử lý ở repo SDK.

## 9. Yêu cầu chức năng

### 9.1. Quyền lợi và nối dây

- **FR-A01**: Ứng dụng phải định nghĩa khóa quyền lợi cho việc bỏ quảng cáo và dùng nó
  ở mọi nơi cần quyết định có hiện quảng cáo hay không.
- **FR-A02**: Trạng thái quyền lợi "chưa biết" phải được xử lý như một trạng thái riêng,
  không được coi là "không có quyền".
- **FR-A03**: Trạng thái quảng cáo phải phản ánh quyền lợi theo đúng ba trạng thái: có
  quyền → tắt, không có quyền → bật, chưa biết → chưa quyết định.
- **FR-A04**: Việc nối dây phải nằm trong mã của ứng dụng. Hai SDK không được biết nhau.
- **FR-A05**: Khi quyền lợi đổi trong lúc app đang chạy, trạng thái quảng cáo phải đổi
  theo ngay, không cần khởi động lại.
- **FR-A06**: Phải xác định hành vi nếu trạng thái "chưa quyết định" kéo dài bất thường
  (ví dụ cửa hàng không khả dụng): bật quảng cáo, hay giữ tắt?

### 9.2. Quảng cáo

- **FR-A07**: Ứng dụng phải khai báo các khóa vị trí quảng cáo và ánh xạ chúng sang đơn
  vị quảng cáo theo từng môi trường.
- **FR-A08**: Mọi format được chọn ở §4.3 phải có thời điểm hiển thị do ứng dụng quyết
  định tường minh. SDK không tự chọn thời điểm.
- **FR-A09**: Ứng dụng phải tự đếm và quyết định thời điểm hiện interstitial theo quy tắc
  "mỗi 3 task tạo mới" (§4.3). SDK cố ý không có cơ chế giới hạn tần suất.
- **FR-A09a**: Bộ đếm phải nêu rõ: đếm theo phiên hay bền qua các lần mở app, và có tính
  task sinh từ quy tắc lặp hay chỉ task tạo thủ công.
- **FR-A10**: Chỗ dành cho banner phải xử lý đủ các trạng thái: đang tải, có quảng cáo,
  không có hàng, lỗi, bị chặn bởi đồng ý, không khả dụng, **bị giãn cách
  (`throttled`)**, và bị tắt vì đã mua.
- **FR-A10a**: Trạng thái `throttled` phải được phân biệt với `failed` và với "không có
  hàng" trong log và trong chẩn đoán. Hiển thị cho người dùng có thể giống nhau (thu lại
  chỗ), nhưng chỉ một trong ba là đáng điều tra.
- **FR-A10b**: Banner phải được ghim **ngoài** vùng vuốt chuyển ngày, để nó không bị hủy
  và dựng lại mỗi lần đổi ngày (§4.4). Đây là điều kiện để giãn cách yêu cầu của SDK
  không làm banner vắng mặt phần lớn thời gian.
- **FR-A10c**: Khi banner xuất hiện hoặc thu lại, snackbar hoàn tác và nút thêm task phải
  dịch theo mà không bị che và không nhảy giật.
- **FR-A11**: Banner không được xung đột với cử chỉ vuốt chuyển ngày và kéo-thả. Việc
  ghim banner ngoài vùng vuốt (FR-A10b) loại bỏ xung đột này ở tầng cấu trúc, nhưng vẫn
  phải kiểm chứng trên thiết bị — một banner ghim đáy vẫn có thể hứng cử chỉ nếu vùng
  chạm của nó tràn lên phần danh sách.
- **FR-A12**: Quảng cáo không được xuất hiện khi đang có lớp phủ, form, luồng xin quyền,
  hoặc snackbar hoàn tác đang hoạt động.
- **FR-A13**: Nếu bán ở vùng cần đồng ý, không được có yêu cầu quảng cáo nào trước khi
  cổng đồng ý cho phép.

### 9.3. Mua hàng

- **FR-A14**: Ứng dụng phải khai báo danh mục sản phẩm, ánh xạ sang mã sản phẩm của cửa
  hàng, và sang khóa quyền lợi.
- **FR-A15**: Paywall phải lấy giá, tên và mô tả từ cửa hàng. Không được dựng chuỗi giá.
- **FR-A16**: Paywall phải có đủ ba ngôn ngữ và đúng ở cả chế độ sáng và tối.
- **FR-A17**: Mọi kết quả mua phải được xử lý riêng biệt, và người dùng hủy không được
  thể hiện như lỗi.
- **FR-A18**: Giao dịch đang chờ phải có cách hiển thị riêng, và không được cấp quyền lợi.
- **FR-A19**: Mua lại khi đã sở hữu phải dẫn tới khôi phục quyền lợi, không phải báo lỗi.
- **FR-A20**: Phải có nút khôi phục giao dịch, và kết quả phải phân biệt "đã khôi phục"
  với "không tìm thấy giao dịch nào".
- **FR-A21**: Paywall phải xử lý trạng thái "đã sở hữu" — người đã mua mở lại paywall
  không được thấy nút mua còn hoạt động.

### 9.4. Môi trường và an toàn

- **FR-A22**: Ba môi trường phát triển, test, production phải tách biệt cho cả quảng cáo
  và thanh toán.
- **FR-A23**: Build không phải production không được tạo giao dịch thật.
- **FR-A24**: Build không phải production không được gửi yêu cầu tới đơn vị quảng cáo thật.
- **FR-A25**: Mã sản phẩm, đơn vị quảng cáo, và mọi khóa cấu hình phải nằm trong cấu hình
  của ứng dụng, không rải rác trong mã nghiệp vụ.
- **FR-A26**: Phải có cách tắt toàn bộ việc bán hàng và/hoặc quảng cáo mà không làm hỏng
  app, phục vụ tình huống sự cố.

### 9.5. Không làm hỏng thứ đang có

- **FR-A27**: Timeline phải giữ nguyên hiệu năng mục tiêu với 5.000 công việc khi có banner.
- **FR-A28**: Nhắc nhở và luồng xin quyền thông báo không được bị ảnh hưởng.
- **FR-A29**: Chức năng xóa toàn bộ dữ liệu hiện có phải được xem lại: nó **không được**
  xóa quyền lợi đã mua, vì người dùng vẫn đã trả tiền.
- **FR-A30**: Chế độ sáng/tối, kể cả Tự động, phải đúng cho mọi giao diện mới.
- **FR-A31**: Mọi giao diện mới phải đạt yêu cầu tiếp cận (accessibility) tương đương
  phần còn lại của app: vai trò, nhãn, thứ tự focus, co giãn chữ.

## 10. Trách nhiệm

### 10.1. Ứng dụng này sở hữu

- Quyết định bán gì, giá bao nhiêu, quảng cáo ở đâu, tần suất nào.
- Toàn bộ giao diện: paywall, nút khôi phục, trạng thái chờ, chỗ giữ banner, nội dung
  đồng ý (nếu cần).
- Nối tín hiệu quyền lợi sang trạng thái quảng cáo.
- Bản dịch ba ngôn ngữ cho mọi nội dung mới.
- Cấu hình môi trường, build flavor, và kiểm tra cấu hình trước khi phát hành.
- Chuyển tiếp sự kiện/lỗi của hai SDK sang hệ thống log của app.

### 10.2. SDK sở hữu

- Hợp đồng công khai, state machine, mô hình quyền lợi, mô hình sự kiện/lỗi.
- Bảo đảm hoàn tất giao dịch, chống mất giao dịch khi app bị đóng đột ngột.
- Chặn giao dịch production ngoài production; thay đơn vị quảng cáo test ngoài production.
- Lưu trữ cục bộ quyền lợi và hoạt động offline.
- Bộ giả lập phục vụ kiểm thử tự động.

### 10.3. Play Console — không làm được bằng mã nguồn

- Hoàn tất **payments profile** của tài khoản nhà phát triển. **Đây là đường găng.**
- Tạo và kích hoạt sản phẩm, đặt giá theo quốc gia, cấu hình thuế.
- Tạo đơn vị quảng cáo trong tài khoản quảng cáo và liên kết với app.
- Thêm license tester để mua thử không mất tiền.
- Upload build lên ít nhất một kênh testing — **sản phẩm trong app không hoạt động với
  build chưa từng upload lên Play**.
- Keystore release thật và cấu hình ký.

### 10.4. Play policy — chủ ứng dụng thực hiện

- Khai báo **Data safety** phản ánh dữ liệu mà SDK quảng cáo thu, gồm advertising ID.
- Khai báo app có chứa quảng cáo.
- Chính sách quyền riêng tư và điều khoản mua bán hợp lệ, bằng cả ba ngôn ngữ nếu cần.
- Công bố giá và điều kiện trước khi người dùng trả tiền.
- Phân loại nội dung và khai báo đối tượng mục tiêu, có xét tới việc có quảng cáo.
- Nếu chọn thuê bao: nghĩa vụ pháp lý về tự động gia hạn ở từng thị trường.

## 11. Yêu cầu phi chức năng

- **Hiệu năng**: không làm tụt frame khi cuộn timeline hoặc vuốt chuyển ngày; không làm
  chậm khởi động app một cách đáng kể; không giữ listener hay timer sau khi màn hình bị
  hủy.
- **Ổn định**: lỗi quảng cáo hoặc thanh toán luôn là lỗi có thể cô lập; mặc định không
  được biến thành crash hay chặn luồng chính.
- **Bảo mật**: không ghi secret, mã sản phẩm production, hay dữ liệu cá nhân vào log.
- **Giới hạn tin cậy**: quyền lợi tính ở phía client có thể bị can thiệp trên máy đã
  root. Ứng dụng không được tuyên bố mức bảo đảm mà nó không có. Nếu điều này không chấp
  nhận được thì cần backend, và việc đó nằm ngoài phạm vi phiên bản này.
- **Khả năng test**: mọi logic nối dây phải kiểm thử được mà không cần thiết bị, không
  cần mạng, không cần tài khoản cửa hàng, không tạo giao dịch thật.
- **i18n**: mọi chuỗi mới đi qua hệ thống dịch hiện có; không hardcode chuỗi hiển thị.

## 12. Các kịch bản chấp nhận chính

1. **Khởi động lạnh của người đã mua**: không có quảng cáo nào hiện lên dù chỉ một
   khoảnh khắc, và không có yêu cầu quảng cáo nào được gửi.
2. **Khởi động lạnh của người chưa mua**: quảng cáo xuất hiện sau khi quyền lợi xác nhận
   là không có, và layout không nhảy một cách khó chịu.
3. **Mua thành công**: quảng cáo tắt ngay trong phiên, không cần khởi động lại.
4. **Người dùng hủy giữa luồng mua**: không có lỗi nào hiển thị, quảng cáo giữ nguyên.
5. **Đang chờ thanh toán**: quảng cáo vẫn hiện, có thông báo trạng thái chờ; khi tiền về
   ở phiên sau, quảng cáo tắt mà không cần mua lại.
6. **Cài lại app**: dữ liệu công việc mất đúng như thiết kế, nhưng quyền lợi quay lại sau
   khi đồng bộ, và quảng cáo vẫn tắt.
7. **Khôi phục khi chưa từng mua**: nhận thông báo "không tìm thấy giao dịch".
8. **Offline**: người đã mua không thấy quảng cáo; người chưa mua thấy chỗ banner xử lý
   trạng thái không tải được một cách gọn gàng.
9. **Hoàn tiền**: quảng cáo bật lại ở lần đồng bộ kế tiếp.
10. **Vuốt chuyển ngày khi có banner**: cử chỉ hoạt động bình thường, banner không chặn.
10a. **Vuốt nhanh qua 10 ngày**: banner **giữ nguyên trên màn hình suốt quá trình**, và
    tổng số yêu cầu quảng cáo gửi đi là **một**, không phải mười. Đây là kịch bản chứng
    minh quyết định ghim ở §4.4 là đúng.
10b. **Xoay máy khi đang có banner**: banner tự thích ứng chiều rộng mới và **không** bị
    giãn cách chặn — xoay máy là miễn trừ có chủ ý của SDK.
10c. **Xóa task khi banner đang hiện**: snackbar hoàn tác hiện **phía trên** banner, bấm
    được, và không bị banner che.
10d. **Banner thu lại giữa phiên**: snackbar và nút thêm task tụt xuống mượt, không nhảy
    giật và không để lại khoảng trống.
11. **Kéo-thả công việc khi có banner**: vị trí thả đúng, không lệch.
12. **Snackbar hoàn tác khi có banner**: snackbar vẫn thấy và bấm được.
13. **Xóa toàn bộ dữ liệu**: công việc bị xóa, **quyền lợi đã mua không bị xóa**.
14. **Thiết bị không có dịch vụ cửa hàng**: app khởi động và chạy bình thường, chỉ mất
    khả năng bán; không hiện paywall dẫn tới đường cụt.
15. **Build phát triển**: không tạo được giao dịch thật, không gửi yêu cầu quảng cáo thật.
16. **Ba ngôn ngữ**: mọi nội dung mới đúng ở vi-VN, en-US, ja-JP.
17. **Sáng/tối/tự động**: mọi giao diện mới đúng ở cả ba chế độ.

## 13. Kiểm thử bắt buộc

### 13.1. Tự động

- Nối dây quyền lợi → trạng thái quảng cáo, cho cả ba trạng thái, kể cả "chưa biết".
- Chuyển trạng thái trong lúc chạy: mua xong, hoàn tiền, quyền lợi hết hạn.
- Mọi kết quả mua, gồm hủy, chờ, đã sở hữu, không bán ở nước này, lỗi mạng.
- Hành vi offline và độ cũ dữ liệu.
- Xóa toàn bộ dữ liệu không xóa quyền lợi.
- Mọi chuỗi mới có đủ ba ngôn ngữ.
- Hai SDK phải được giả lập; test không phụ thuộc thiết bị, mạng, hay tài khoản cửa hàng.

### 13.2. Trên thiết bị

- Mua thật bằng license tester, trên **build cấu hình release**.
- Giao dịch đang chờ bằng phương thức thanh toán test.
- Khôi phục sau khi gỡ và cài lại.
- Quảng cáo test hiển thị đúng ở mọi vị trí đã chọn.
- Cử chỉ vuốt, kéo-thả, snackbar hoàn tác — kiểm tra lại toàn bộ khi có banner.
- Chế độ máy bay.
- Thiết bị không có dịch vụ cửa hàng.
- Xác minh không có giao dịch production nào phát sinh từ build phát triển, lưu lại làm
  bằng chứng phát hành.

**Không dùng giao dịch production thật để kiểm thử thủ công.**

## 14. Tiêu chí hoàn thành

- Người đã mua không thấy quảng cáo ở mọi tình huống trong §12.
- Người chưa mua thấy quảng cáo mà không mất khả năng dùng app.
- Không tồn tại đường đi nào cấp quyền lợi cho giao dịch đang chờ.
- Nút khôi phục giao dịch có mặt và báo kết quả trung thực.
- Xóa toàn bộ dữ liệu không làm mất quyền lợi đã mua.
- Lint, typecheck, test tự động, và build Android đều thành công.
- Ba ngôn ngữ và hai chế độ hiển thị đều đúng.
- Có bằng chứng build phát triển không tạo được giao dịch thật.
- Khai báo Data safety, phân loại nội dung, và chính sách quyền riêng tư đã cập nhật.
- Phạm vi nền tảng của spec 001 đã được ghi nhận lại theo §4.5 (chỉ Android).

## 15. Để dành cho giai đoạn plan/implement

Những mục sau cần chọn dựa trên trạng thái thật của repo tại thời điểm triển khai; raw
spec không áp đặt trước:

- Phiên bản SDK quảng cáo và SDK thanh toán sẽ dùng, và **xác minh tương thích** với
  React Native của app này. Đặc biệt lưu ý: SDK quảng cáo có khóa trần phiên bản cho thư
  viện quảng cáo nền tảng vì lý do trình biên dịch; cần kiểm tra lại trên React Native
  của app này thay vì giả định.
- Nơi đặt cấu hình danh mục sản phẩm và vị trí quảng cáo.
- Cách lấy giá trị môi trường và cờ build.
- Cấu trúc màn hình paywall và điểm vào.
- Cách giữ chỗ banner để layout ổn định.
- Cơ chế lưu tùy chọn liên quan, nếu có.
- Cách chuyển tiếp sự kiện/lỗi của hai SDK sang log của app.

Mọi lựa chọn kỹ thuật phải giữ nguyên nguyên tắc: **hai SDK không biết nhau**, chính
sách sản phẩm nằm ở ứng dụng, và không thứ gì liên quan tới quảng cáo hay thanh toán
được phép làm hỏng việc quản lý công việc.

## 16. Đánh giá hai SDK — có cần bổ sung gì ở tầng lib?

> Phần này **không** thuộc phạm vi triển khai của app. Nó ghi lại kết luận sau khi đối
> chiếu thiết kế đã chốt ở §4 với năng lực thật của hai SDK, để biết cái gì phải mở
> hạng mục ở repo SDK và cái gì cố ý thuộc về ứng dụng.

### 16.1. ✅ ĐÃ XONG — giãn cách yêu cầu theo từng vị trí (`rn-ads` 0.3.0)

> **Trạng thái: đã triển khai và phát hành ngày 2026-10-10.** Mục này giữ lại phần phân
> tích vì nó giải thích *vì sao* thuộc lib, và vì kết luận của nó ảnh hưởng trực tiếp tới
> quyết định vị trí banner ở §4.4.

**Những gì đã có trong 0.3.0:**

- Giãn cách tối thiểu giữa hai **yêu cầu** cho cùng một vị trí, cấu hình được qua
  `minRequestIntervalMs`, giới hạn 0–600.000 ms, kiểm tra ngay lúc khởi tạo và nêu tên
  vị trí sai thay vì âm thầm từ chối mọi yêu cầu trong production.
- **Mặc định theo format**: 60 giây cho banner — lấy đúng sàn làm mới banner mà AdMob
  tự công bố, nên con số là của nhà cung cấp chứ không phải tự nghĩ ra. **Tắt (0) cho
  interstitial, rewarded, app-open** — các format này được tải bằng lệnh tường minh chứ
  không do renderer mount, nên chưa bao giờ có vấn đề này; đặt sàn mặc định ở đó sẽ phá
  vỡ chính thiết kế "mỗi 3 task" của hạng mục này.
- **Quan sát được**: vị trí báo trạng thái `throttled`, `load()` trả
  `{ status: 'throttled', retryAfterMs }`, và phát sự kiện `request_throttled` kèm sàn
  đã từ chối nó. `throttled` **khác** `failed` và khác no-fill: no-fill là mạng không có
  hàng, còn đây là ta không hỏi.
- **Không phát `load_started`** cho yêu cầu bị từ chối — một yêu cầu không xảy ra thì
  không phải một vòng, và luồng sự kiện không được khai một yêu cầu tính tiền không tồn
  tại.
- **Hai miễn trừ có chủ ý**: xoay máy (đổi chiều rộng trong cùng một lần mount) không bị
  tính, nếu không thì màn hình vừa xoay sẽ mất banner cả phút; và lời gọi tải trùng đồng
  thời không bị tính, vì chúng đã được gộp vào yêu cầu đang bay sẵn.
- **Chịu được đồng hồ nhảy lùi** — đổi giờ thủ công hoặc hiệu chỉnh NTP làm nó mở ra chứ
  không khóa vị trí lại cho tới khi đồng hồ đuổi kịp.

**Hệ quả cho hạng mục này — đã xử lý.** Giãn cách phạt nặng nhất đúng phương án "banner
là một item trong danh sách", vì dòng banner nằm bên trong vùng vuốt. Câu trả lời kiến
trúc — và cũng là điều README của SDK nói thẳng — là đưa banner ra ngoài vùng bị remount.
**§4.4 đã chốt lại theo hướng đó**, nên hạng mục này không còn chịu ảnh hưởng của giãn
cách trong vận hành bình thường: banner giữ nguyên mount khi đổi ngày và tốn một yêu cầu
mỗi phiên.

Giãn cách vẫn là lưới an toàn có ích về sau: nếu một màn hình mới nào đó đặt banner vào
vùng bị remount, nó sẽ báo `throttled` thay vì âm thầm tạo lưu lượng dồn dập.

### 16.1b. Phân tích gốc — vì sao việc này thuộc lib chứ không thuộc app

**Vấn đề (trạng thái trước 0.3.0).** Timeline chuyển ngày bằng vuốt ngang, và theo §4.4
dòng banner là một item trong danh sách của ngày đó. Mỗi lần chuyển ngày, dòng banner bị
hủy và dựng lại, tạo một yêu cầu quảng cáo mới. SDK lúc đó đã bảo đảm *không tạo yêu cầu
trùng khi đang tải*, nhưng **không có giãn cách tối thiểu giữa hai lần yêu cầu liên
tiếp** cho cùng một vị trí. Vuốt nhanh qua 10 ngày tạo 10 yêu cầu trong vài giây.

**Vì sao thuộc lib, không thuộc app.** Đây là ranh giới đáng giữ cho sạch:

| Loại quyết định | Thuộc về |
|---|---|
| *Bao lâu hiện một interstitial một lần* | **Ứng dụng** — đây là chính sách sản phẩm |
| *Bao lâu được phép gửi lại một yêu cầu cho cùng vị trí* | **SDK** — đây là an toàn tài khoản |

Lưu lượng không hợp lệ có thể dẫn tới hạn chế hoặc đình chỉ tài khoản quảng cáo. Đó là
cùng hạng với việc SDK đã tự thay đơn vị quảng cáo test ngoài production: một thuộc tính
an toàn mà lib **cưỡng chế** thay vì ghi vào tài liệu rồi hy vọng từng app tự làm đúng.
Nếu để mỗi app tự chống, mọi app đặt banner trong danh sách hoặc trong tab chuyển qua lại
đều phải dựng lại cùng một cơ chế, và app nào quên thì trả giá bằng tài khoản.

**Đề xuất đã được thực hiện đúng như nêu**: giãn cách tối thiểu cấu hình được cho mỗi vị
trí, mặc định an toàn theo format, và việc bị giãn cách **quan sát được** qua trạng thái
`throttled` cộng sự kiện `request_throttled` — để app phân biệt "đang chờ giãn cách" với
"không có hàng", hai thứ cần hiển thị khác nhau. Chi tiết ở §16.1.

### 16.2. Không cần bổ sung — giới hạn tần suất interstitial

Việc đếm "mỗi 3 task" **phải** nằm ở ứng dụng. Nếu lib có cơ chế giới hạn tần suất thì
lib bắt đầu sở hữu chính sách sản phẩm, trái với ranh giới mà cả hai SDK được xây trên.
Mỗi app có nhịp khác nhau: app này đếm theo task tạo mới, app khác đếm theo lần mở màn
hình, app khác nữa đếm theo thời gian. Không có mặc định nào đúng cho tất cả.

Những thứ **lib đã làm đúng** và app không cần tự lo: từ chối hiện khi app đang không ở
tiền cảnh, từ chối hiện khi đã có một quảng cáo toàn màn khác đang mở, và từ chối hiện
một quảng cáo đã dùng rồi.

### 16.3. Về câu hỏi "template" — phân biệt hai nghĩa

Câu hỏi "quảng cáo có nhiều template, lib có cần enhance không" có hai nghĩa, và câu trả
lời khác nhau:

**Nghĩa 1 — các *format* quảng cáo.** Banner, interstitial, rewarded, app-open. SDK đã
có đủ bốn. Với bốn format này, **nhận định của anh là đúng**: nội dung quảng cáo do
Google dựng, lib lo việc yêu cầu và trình bày, app chỉ quyết định đặt ở đâu và lúc nào.
Lib không cần thêm gì.

**Nghĩa 2 — *native ads* và các template bố cục của chúng.** Đây là thứ khác hẳn, và là
**khoảng trống thật** của SDK. Native ads không trả về một khối hình đã dựng sẵn; nó trả
về **các thành phần rời**: tiêu đề, mô tả, ảnh, icon, nhãn nhà quảng cáo, nút hành động,
xếp hạng. App tự bố cục chúng để trông giống nội dung của mình.

Với native ads thì **"template là việc của app" không còn đúng hoàn toàn**, vì lib buộc
phải:

- Phơi các thành phần quảng cáo ra dưới dạng dữ liệu đã chuẩn hóa, không để lộ đối tượng
  của nhà cung cấp.
- Cưỡng chế các thành phần **bắt buộc phải hiển thị** theo chính sách của nhà cung cấp.
- Cưỡng chế việc gắn **nhãn "Quảng cáo"** — bắt buộc, vì native ad trông giống nội dung.
- Đăng ký đúng các vùng chạm để tính click và impression hợp lệ.

**Có cần cho hạng mục này không? Không.** §4.4 chốt dùng banner thường, và một banner do
Google dựng tự nó đã phân biệt được với nội dung nên không có rủi ro gây nhầm lẫn.

**Khi nào cần?** Nếu sau này muốn quảng cáo **trông thật giống một task item** — tức là
hòa vào danh sách chứ không phải một khối hình chữ nhật nằm giữa danh sách. Lúc đó đây là
một hạng mục đáng kể ở repo SDK, không phải một tùy chọn nhỏ.

**Mức ưu tiên: thấp**, và chỉ mở khi có nhu cầu sản phẩm rõ ràng.

### 16.4. SDK thanh toán — đủ cho hạng mục này

Đối chiếu thiết kế đã chốt với năng lực SDK:

| Nhu cầu từ §4 | Trạng thái |
|---|---|
| Mua một lần vĩnh viễn | Có |
| Một khóa quyền lợi duy nhất | Có |
| Không có tài khoản ứng dụng | Phù hợp — quyền lợi gắn tài khoản cửa hàng; không cần phân vùng theo người dùng |
| Khôi phục sau khi cài lại / đổi máy | Có |
| Hoạt động offline, có ngưỡng dữ liệu cũ | Có |
| Giá lấy từ cửa hàng, quy đổi theo quốc gia | Có |
| Chặn giao dịch thật ở build phát triển | Có, và quan sát được |
| Trạng thái "chưa biết" để tránh nháy quảng cáo | Có, và khớp đúng với trạng thái "chưa quyết định" của SDK quảng cáo |

**Không tìm thấy khoảng trống nào cần bổ sung.** Những thứ SDK có mà hạng mục này không
dùng — thuê bao, tiêu hao, đổi gói, điểm cắm xác thực server, phân vùng theo tài khoản —
đều là năng lực sẵn có cho app sau, không phải gánh nặng.

Một mục **tùy chọn, ưu tiên thấp**: Play có cơ chế **mã khuyến mãi** cho sản phẩm mua một
lần, hữu ích khi tặng gói cho người đánh giá hoặc bù cho người dùng bị lỗi. SDK hiện không
phơi luồng này. Chỉ mở nếu có nhu cầu kinh doanh thật.

### 16.5. Việc cần xác minh, không được giả định

- **Phiên bản SDK quảng cáo cần dùng: `0.3.0` hoặc mới hơn.** Các phiên bản trước không
  có giãn cách yêu cầu, tức là thiết kế banner của hạng mục này sẽ tạo lưu lượng dồn dập
  khi người dùng vuốt chuyển ngày.
- **Tương thích React Native.** App này chạy React Native mới hơn repo SDK. SDK quảng cáo
  có **khóa trần phiên bản** cho thư viện quảng cáo nền tảng vì lý do siêu dữ liệu trình
  biên dịch Kotlin. Trần đó được xác định trên phiên bản React Native của repo SDK và
  **phải kiểm tra lại** trên app này.
- **SDK thanh toán chưa được xác minh trên thiết bị với thư viện billing đã cài.** Phần
  nối với nhà cung cấp được viết theo tài liệu nhưng chưa chạy thật lần nào. Đây là hạng
  mục xác minh, không phải hạng mục phát triển, nhưng phải làm trước khi phát hành.
