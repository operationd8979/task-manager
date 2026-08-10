# Wireframes — lo-fi, 390 × 812

Số bên phải mỗi khối là **chiều cao tối thiểu tính bằng pt**. Chiều cao thật do nội dung
quyết định — ở 170% cỡ chữ hệ thống, hàng nhãn tự xuống dòng và khối cao thêm. Không khối nào
được đặt chiều cao cố định cắt chữ (Constitution V).

---

## W-01 · Timeline — có dữ liệu

```
┌──────────────────────────────────────────────┐
│ ‹ · Thứ Hai 03/08 · HÔM NAY · › · CĐ    56pt │  ← kẻ dưới 2px lineStrong
├──────────────────────────────────────────────┤
│ 06:30 ☑ tên gạch ngang · HOÀN THÀNH     76pt │  ← nền surface, cả dòng 72% độ đậm
├──────────────────────────────────────────────┤
│▌2 VIỆC CHỒNG GIỜ 09:00–10:30            32pt │  ← tiêu đề cụm, dính khi cuộn, nền accentSoft
│▌09:00–10:00 ☐ · QUÁ HẠN 5 giờ · NHẮC −15′ 92 │  ← dải dọc 3px accent chạy suốt cụm
│▌09:30–09:45 ☐ · ⟳ LẶP T2–T6 · ✎ chỉnh riêng 92│
├──────────────────────────────────────────────┤
│ 13:00 ☐ · ghi chú 1 dòng · NHẮC −60′    92pt │
│ 15:00–16:00 ☐                           76pt │
│                                              │
│ (vùng cuộn còn lại + đệm cuối 88pt)          │
├──────────────────────────────────────────────┤
│ + CÔNG VIỆC MỚI            (nhãn căn trái) 56│  ← thanh cố định đáy, nền accentFill
└──────────────────────────────────────────────┘
```

Cụm chồng giờ có tiêu đề riêng và dải dọc 3px; các dòng bên trong **vẫn nguyên chiều rộng**,
không thu nhỏ. Đệm cuối danh sách 88pt để dòng cuối không nằm dưới thanh hành động.

---

## W-02 · Timeline — tải · rỗng · lỗi

```
┌──────────────────────────────────────────────┐
│ Thanh ngày                              56pt │
├──────────────────────────────────────────────┤
│ ĐANG TẢI — skeleton dòng ×6, nhịp thở 1.4s   │
│ ▭ giờ  ▭ tick  ▭▭▭▭▭ tên  ▭▭ meta       60pt │
│ ▭ giờ  ▭ tick  ▭▭▭ tên  ▭▭▭ meta        60pt │
├──────────────────────────────────────────────┤
│ RỖNG — tiêu đề 20pt + 1 câu + nút tạo        │
│ "Ngày này chưa có công việc"                 │
│ + gợi ý xem ngày khác                   92pt │
├──────────────────────────────────────────────┤
│ LỖI ĐỌC — kẻ accent 2px trên đầu khối        │
│ "Dữ liệu vẫn nằm trên máy, chưa mất"         │
│ [THỬ LẠI]  [Cài đặt]        nền accentSoft   │
├──────────────────────────────────────────────┤
│ + CÔNG VIỆC MỚI                         56pt │
└──────────────────────────────────────────────┘
```

Skeleton mang **đúng hình dạng dòng thật**: cột giờ, ô tick, hai dải chữ. Không spinner giữa
màn trắng (Constitution IV). Ba trạng thái trên vẽ chung một khung để so sánh — trong app
chúng loại trừ nhau.

Quá 3 giây vẫn đang tải thì thêm dòng "vẫn đang đọc dữ liệu" dưới skeleton.

---

## W-07 · Chọn ngày — sheet lịch tháng

```
        (timeline mờ phía sau)

┌──────────────────────────────────────────────┐
│ Tháng 8, 2026            ‹  ›        ×   52pt│  ← tiêu đề dính
├──────────────────────────────────────────────┤
│ T2 T3 T4 T5 T6 T7 CN — nhãn cột          32pt│  ← thứ tự theo FR-052
│                                              │
│  ●  ●  ·  ●  ·  ·  ·   ô ngày 44×44          │
│  ·  ●  ●  ·  ●  ·  ·   chấm = có công việc   │
│  ·  ·  [12] ●  ·  ·  · ô viền 2px = đang chọn│
│  ●  ·  ·  ·  ·  ·  ·                     ~300│
│  ·  ·  ·  ·  ·  ·  ·   ngoài tháng: mờ 40%   │
├──────────────────────────────────────────────┤
│ VỀ HÔM NAY                               52pt│
└──────────────────────────────────────────────┘
```

**Chấm ngày bận là lớp riêng, tải sau lưới.** Ô ngày dùng được ngay từ khi sheet mở; chấm
hiện dần khi đếm xong. Đây là lý do màn hình này cần trạng thái riêng trong ma trận: nếu đợi
đếm xong mới cho chọn ngày, thao tác thường gặp nhất của sheet bị chặn bởi thứ chỉ mang tính
trang trí.

Lỗi đếm **không** chặn việc chọn ngày — chỉ mất chấm, kèm dòng "Chưa đếm được ngày bận" +
THỬ LẠI. Tháng không có công việc nào là trạng thái hợp lệ, không hiện thông báo rỗng.

---

## W-03 · Form tạo / sửa

```
┌──────────────────────────────────────────────┐
│ Công việc mới                        ×  52pt │  ← tiêu đề dính, × 44×44 góc phải
├──────────────────────────────────────────────┤
│ Tên công việc  [ô nhập 44pt]            68pt │  ← +dòng lỗi khi sai
│ Ngày · Bắt đầu · Kết thúc (3 ô 1 hàng)  72pt │  ← tự xuống dòng khi cỡ chữ lớn
│ Chip: +30 phút · +45 · +1 giờ ·              │
│       Không có giờ kết thúc              44pt │
│ Trạng thái — segmented 2 lựa chọn        56pt │
│ Lặp lại: "Không lặp"                  ›  60pt │  ← lối DUY NHẤT xuống cấp 3
│ Nhắc nhở [công tắc]                          │
│   chip 0/5/10/15/30/60 + cảnh báo trễ   104pt │
│ Ghi chú — textarea                       72pt │
│                                              │
├──────────────────────────────────────────────┤
│ TẠO CÔNG VIỆC          (dính đáy sheet)  56pt│  ← khi đang sửa: thêm XÓA viền accent
└──────────────────────────────────────────────┘
```

Nút Lưu **dính đáy sheet** nên luôn thấy dù bàn phím đang mở (Constitution I: hành động chính
không cần cuộn). Hàng "Lặp lại" là lối duy nhất xuống cấp 3.

---

## W-04 · Chọn phạm vi áp dụng — sheet chặn

```
        (timeline mờ phía sau — vẫn thấy ngữ cảnh)

┌──────────────────────────────────────────────┐
│ Áp dụng thay đổi cho?                        │
│ Gọi khách hàng Minh · Thứ Ba 04/08 · lặp lại │ 76pt
├──────────────────────────────────────────────┤
│ CHỈ LẦN NÀY — mô tả hậu quả bằng lời     60pt │
│ ↳ "Ảnh hưởng 1 buổi · 41 buổi còn lại        │
│    giữ nguyên"              nền accentSoft 36│
├──────────────────────────────────────────────┤
│ TOÀN BỘ CHUỖI — mô tả hậu quả            60pt │
│ ↳ "Ảnh hưởng 122 buổi trong 12 tháng tới,    │
│    và mọi buổi sau đó"      nền accentSoft 36│
├──────────────────────────────────────────────┤
│ HỦY — KHÔNG THAY ĐỔI GÌ                  52pt │
└──────────────────────────────────────────────┘
```

**Dòng đếm số buổi bị ảnh hưởng là thứ khiến người dùng hiểu hậu quả — mạnh hơn mọi câu cảnh
báo.** Sheet này không vuốt xuống được, không chạm nền để đóng được; chỉ có ba lối ra rõ ràng.

Cửa sổ đếm là **365 ngày** kể từ ngày đang thao tác (FR-026c, D-05). Với chuỗi có ngày kết
thúc nằm trong cửa sổ, câu chữ bỏ vế "và mọi buổi sau đó". Phép đếm là thao tác tính toán:
trong lúc đếm, hai khối lựa chọn **khóa** và dòng đếm là skeleton — không cho chọn khi chưa
biết hậu quả. Xem [ux-ui-spec §3](./ux-ui-spec.md).

---

## W-05 · Thiết lập lặp lại

```
┌──────────────────────────────────────────────┐
│ Thiết lập lặp lại                    ×  52pt │
├──────────────────────────────────────────────┤
│ [ Không lặp | Lặp theo thứ ]  segmented  52pt│
│ T2 T3 T4 T5 T6 T7 CN — 7 nút 44×44       60pt│
│ Preset: T2–T6 · Cuối tuần · Hằng ngày    44pt│
│ Ngày bắt đầu — bộ chọn hệ thống          64pt│
│ Ngày kết thúc: Không giới hạn | Đến ngày →   │
│                                          88pt│
│ ┌ Xem trước bằng lời ─────────────────────┐  │
│ │ "Sẽ tạo buổi vào T2, T3… lúc 09:00,     │  │
│ │  từ… và không có ngày kết thúc."        │  │
│ └─────────────────────────────────────────┘  │
├──────────────────────────────────────────────┤
│ XONG                                     52pt│
└──────────────────────────────────────────────┘
```

Ngày kết thúc là bộ chuyển **ngay trong sheet**, không mở cấp 4. Xem trước bằng lời là chỗ
người dùng phát hiện mình chọn sai — đặt nó ngay trên nút XONG, không giấu ở trên.

---

## W-06 · Cài đặt

```
┌──────────────────────────────────────────────┐
│ ‹ Cài đặt                                52pt│
├──────────────────────────────────────────────┤
│ NHẮC NHỞ                                     │
│ Quyền hiện thông báo · ✓ Đã cấp              │
│   [MỞ CÀI ĐẶT HỆ THỐNG]                  76pt│
│ Quyền nhắc đúng thời điểm · ⚠ Chưa cấp       │
│   "nhắc có thể trễ"        nền accentSoft 76 │
│ Mốc nhắc mặc định — chip 0/5/10/15/30/60     │
│   "chỉ áp dụng cho việc tạo mới"         96pt│
├──────────────────────────────────────────────┤
│ HIỂN THỊ                                     │
│ Chế độ — segmented: Tự động|Sáng|Tối     76pt│  ← FR-052b, mặc định Tự động
│ Ngày bắt đầu tuần — Thứ Hai | Chủ Nhật   76pt│
├──────────────────────────────────────────────┤
│ DỮ LIỆU                                      │
│ "chỉ lưu trên máy này, gỡ app là mất"        │
│ + số mục đang lưu                            │
├──────────────────────────────────────────────┤
│ XÓA TOÀN BỘ DỮ LIỆU                      56pt│  ← viền accent 2px, nền TRONG SUỐT
└──────────────────────────────────────────────┘
```

Trạng thái quyền là **nhãn có chữ** (✓ Đã cấp / ⚠ Chưa cấp), không phải chấm màu
(Constitution V: không phân biệt chỉ bằng màu). Xóa dữ liệu nằm cuối, viền đỏ, **không phải
nút đặc** — nút đặc màu accent dành cho hành động chính, không dành cho hành động phá hủy.

Hàng **Chế độ** là segmented ba lựa chọn, mỗi lựa chọn cao 44pt. "Tự động" phải có dòng phụ
nói rõ nó theo cài đặt máy, nếu không người dùng không đoán được nó khác gì Sáng/Tối. Đổi
chế độ áp dụng **ngay**, không cần thoát màn hình (FR-052c).

Màn hình này đọc dữ liệu (tùy chọn đã lưu, trạng thái hai quyền, số mục đang lưu) nên phải
có trạng thái đang tải và lỗi đọc theo từng hàng — xem [ux-ui-spec §3](./ux-ui-spec.md) cấp
"Cài đặt".
