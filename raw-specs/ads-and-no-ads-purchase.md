# Raw spec: Quảng cáo và gói mua bỏ quảng cáo cho Task Manager

> Tài liệu này là **raw spec**: nó nêu ý định, bối cảnh, ràng buộc và những câu hỏi
> còn mở. Nó **không** chốt thiết kế kỹ thuật, không nêu tên API, không mô tả cấu
> trúc mã. Dùng nó làm đầu vào cho `/sdd-spec` → `/sdd-plan`.
>
> Phần **§4 Những quyết định cần làm rõ** là phần quan trọng nhất cần giải quyết
> trước khi lập kế hoạch. Mọi mục còn lại được viết để câu hỏi ở §4 có đủ ngữ cảnh
> mà trả lời.

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
| 4 | **Timeline dùng cử chỉ vuốt ngang để chuyển ngày**, và kéo-thả trong phạm vi một ngày | Vị trí banner phải không được xung đột với hai cử chỉ này, và không được làm dịch chuyển layout khiến kéo-thả lệch. |
| 5 | **Có snackbar hoàn tác (undo)** sau khi xóa công việc | Banner xuất hiện/biến mất không được đẩy snackbar ra khỏi tầm nhìn hoặc làm người dùng bấm nhầm. |
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

## 4. Những quyết định cần làm rõ

Đây là phần cần giải quyết trong `/sdd-spec`. Mỗi mục nêu lựa chọn và hệ quả, không
nêu kết luận.

### 4.1. Mô hình bán gói bỏ quảng cáo

| Lựa chọn | Ưu | Nhược |
|---|---|---|
| **Mua một lần vĩnh viễn** | Dễ hiểu, dễ bán cho một app tiện ích nhỏ; không cần quản lý vòng đời thuê bao | Doanh thu một lần; không có thu nhập định kỳ |
| **Thuê bao** | Doanh thu định kỳ | Người dùng phản ứng xấu khi phải trả theo kỳ chỉ để bỏ quảng cáo; kéo theo toàn bộ vòng đời gia hạn, ân hạn, tạm giữ, đổi gói |
| **Cả hai** | Người dùng chọn | Phức tạp gấp đôi ở paywall và ở quyền lợi |

Cần chốt: **mô hình nào**, và nếu có thuê bao thì chính sách trong thời gian ân hạn
và tạm giữ là gì. Lưu ý một hạn chế nền tảng đã biết: trên Android, phía client
**không phân biệt được** thời gian ân hạn với trạng thái tạm giữ; muốn chính xác thì
cần dữ liệu từ server.

### 4.2. Gói đó bán cái gì ngoài việc bỏ quảng cáo

- **Chỉ bỏ quảng cáo** — thông điệp sạch, dễ định giá, nhưng giá trị cảm nhận thấp.
- **Bỏ quảng cáo + một vài tính năng trả phí** — giá trị cao hơn, nhưng cần quyết định
  tính năng nào và điều đó mở ra một hạng mục sản phẩm riêng.

Nếu chọn phương án bundle, cần chốt **ngay bây giờ** là bao nhiêu khóa quyền lợi, vì
một khóa hay nhiều khóa ảnh hưởng tới cấu hình và tới paywall.

### 4.3. Format quảng cáo nào được dùng

SDK hỗ trợ bốn format. Với một app dùng theo nhịp ngắn, mỗi format có đặc thù riêng:

| Format | Phù hợp với app này? | Cân nhắc |
|---|---|---|
| **Banner** trên timeline | Có khả năng cao nhất | Phải tránh xung đột cử chỉ vuốt/kéo-thả (§2.2 #4), và phải giữ chỗ ổn định để không đẩy layout |
| **Interstitial** | Cần hết sức cẩn trọng | App được mở hàng chục lần mỗi ngày trong vài giây. Chen toàn màn hình sai nhịp sẽ phá trải nghiệm và đẩy người dùng đi |
| **Rewarded** | Chỉ khi có thứ để thưởng | App hiện không có vật phẩm tiêu hao hay giới hạn nào để mở bằng quảng cáo. Nếu dùng, cần định ra phần thưởng trước |
| **App-open** | Rủi ro cao | Chính là khoảnh khắc người dùng mở app để xem nhanh hôm nay có gì. Có thể là format gây phản ứng xấu nhất với app này |

Cần chốt: **dùng những format nào ở phiên bản đầu**, và nếu có interstitial/app-open
thì **thời điểm và tần suất** cụ thể.

### 4.4. Banner đặt ở đâu trên timeline

Cần chốt vị trí và hành vi, vì đây là nơi va chạm với cử chỉ:

- Trên cùng / dưới cùng / chèn giữa danh sách?
- Khi chưa có quảng cáo hoặc quảng cáo lỗi: **giữ chỗ** hay **thu lại**? Giữ chỗ thì
  layout ổn định nhưng chiếm không gian vô ích; thu lại thì layout nhảy.
- Trên màn hình nào ngoài timeline, nếu có? Màn tạo/sửa công việc nên sạch hay không?
- Màn hình Cài đặt có quảng cáo không?

### 4.5. Chuyện gì xảy ra trên iOS — câu hỏi lớn nhất

Spec 001 ghi nền tảng mục tiêu là **Android và iOS**. Cả hai SDK **chỉ triển khai
Android**; trên iOS chúng báo "không khả dụng" một cách an toàn chứ không lỗi.

Hệ quả nếu phát hành iOS hôm nay: trên iOS app sẽ **không có quảng cáo** và **không
bán được gì**. Tức là bản iOS là bản miễn phí, sạch quảng cáo. Cần chốt một trong các
hướng:

| Hướng | Hệ quả |
|---|---|
| Chỉ phát hành Android ở hạng mục này; iOS để sau | Đơn giản nhất, nhưng phải chốt lại phạm vi nền tảng của spec 001 |
| Phát hành cả hai, iOS tạm miễn phí không quảng cáo | Người dùng iOS được lợi, nhưng tạo bất đối xứng khó giải thích và khó thu lại về sau |
| Hoãn hạng mục này tới khi SDK có adapter iOS | Chậm doanh thu; phụ thuộc lịch của repo SDK |

Dù chọn hướng nào, **không được** để người dùng iOS thấy paywall mà bấm vào thì không
mua được.

### 4.6. Quyền riêng tư và sự đồng ý cho quảng cáo

- Ứng dụng sẽ bán/phát hành ở **những quốc gia nào**? Nếu có EU/EEA/UK thì phải có
  luồng xin đồng ý cho quảng cáo cá nhân hóa, và SDK quảng cáo **chặn mọi yêu cầu
  quảng cáo** cho tới khi cổng đồng ý cho phép.
- **Ai dựng giao diện và nội dung đồng ý?** SDK chỉ tiêu thụ kết quả, không dựng
  dialog và không cung cấp nội dung pháp lý.
- App có hướng tới trẻ em không? (Mặc định: không, nhưng cần khai báo rõ vì nó đổi
  cấu hình quảng cáo và phân loại nội dung trên store.)
- Khai báo **Data safety** của Play sẽ thay đổi: thêm advertising ID và dữ liệu do
  SDK quảng cáo thu. Cần biết trước ai chịu trách nhiệm cập nhật.

### 4.7. Trạng thái Play Console hiện tại

`applicationId` là `com.taskmanager`, `versionCode` 1. Cần xác nhận:

- Đã tạo app trên Play Console chưa, hay chưa từng upload?
- **Payments profile (hồ sơ thanh toán)** đã hoàn tất chưa? Chưa có thì không tạo được
  sản phẩm nào, và việc duyệt mất ngày đến tuần. Đây là **đường găng thực sự**, không
  phải phần mã nguồn.
- Đã có keystore release thật chưa?

Nếu cả ba đều chưa, thì phần lớn thời gian của hạng mục này là chờ duyệt hồ sơ, và kế
hoạch phải sắp xếp để công việc mã nguồn không bị chặn bởi nó.

### 4.8. Giá

Cần chốt giá cho từng quốc gia mục tiêu, hoặc chốt một mức giá gốc và để Play quy đổi.
Không thuộc phạm vi mã nguồn, nhưng thuộc phạm vi hạng mục.

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
- Phải quyết định: trong lúc "chưa quyết định", chỗ dành cho banner **giữ chỗ hay thu
  lại**? Giữ chỗ rồi thu lại sẽ làm layout nhảy ngay khi người dùng vừa mở app.

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
- Nếu chọn mô hình thuê bao thì còn cần lối đi tới màn hình quản lý thuê bao của cửa
  hàng.

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

- Banner không được chặn cử chỉ vuốt chuyển ngày.
- Banner không được làm lệch kéo-thả công việc trong ngày.
- Banner không được đẩy snackbar hoàn tác ra khỏi tầm nhìn.
- Quảng cáo toàn màn (nếu dùng) không được xuất hiện khi đang mở form, đang kéo-thả,
  đang trong luồng xin quyền, hoặc khi một nhắc nhở vừa bật lên.
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
- Tier trả phí nhiều mức (ví dụ Pro/Premium) nếu §4.2 chốt là chỉ bỏ quảng cáo.
- Sửa đổi SDK quảng cáo hoặc SDK thanh toán. Thiếu sót được ghi lại và xử lý ở repo SDK.

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
- **FR-A09**: Ứng dụng phải định ra tần suất tối đa cho quảng cáo toàn màn, nếu dùng.
  SDK không có cơ chế giới hạn tần suất.
- **FR-A10**: Chỗ dành cho banner phải xử lý đủ các trạng thái: đang tải, có quảng cáo,
  không có hàng, lỗi, bị chặn bởi đồng ý, không khả dụng, và bị tắt vì đã mua.
- **FR-A11**: Banner không được xung đột với cử chỉ vuốt chuyển ngày và kéo-thả.
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
- **FR-A21**: Nếu chọn thuê bao, phải có lối đi tới màn hình quản lý thuê bao của cửa
  hàng. Không được tự dựng màn hình hủy.

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
- Quyết định về iOS (§4.5) đã được chốt và ghi lại.

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
