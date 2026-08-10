# Information architecture, screen list, user flows

## 1. Cây màn hình

Không tài khoản, không đồng bộ, một người dùng — nên IA phẳng có chủ đích: một gốc duy nhất,
không tab bar, không ngăn kéo. Sâu nhất là ba cấp; mọi thứ tạm thời đều là bottom sheet chồng
lên timeline chứ không đẩy màn hình mới.

```
● Cấp 1 — Timeline (gốc, luôn tồn tại)
  ├ Cấp 2 — Chọn ngày            (sheet lịch tháng)
  ├ Cấp 2 — Thao tác dòng        (sheet ⋯)
  │   └ Cấp 3 — Đổi giờ / Di chuyển
  ├ Cấp 2 — Form tạo·sửa         (sheet toàn chiều cao)
  │   ├ Cấp 3 — Thiết lập lặp lại
  │   └ Cấp 3 — Xác nhận xóa
  ├ Cấp 2 — Chọn phạm vi áp dụng (sheet chặn, ưu tiên cao nhất)
  └ Cấp 2 — Cài đặt
      └ Cấp 3 — Xác nhận xóa toàn bộ dữ liệu
```

## 2. Nguyên tắc IA

| Nguyên tắc | Nội dung |
|---|---|
| **Một gốc** | Timeline là màn hình duy nhất tồn tại lâu dài. Mọi thứ khác đóng lại là quay về đây. |
| **Không tab bar** | Chỉ có hai đích ngoài timeline (Cài đặt, form). Tab bar sẽ chiếm 49pt vĩnh viễn cho hai thứ hiếm dùng. |
| **Tạm thời = sheet** | Form, lặp lại, phạm vi, lịch, xác nhận đều là bottom sheet — giữ ngữ cảnh timeline phía sau, một tay đóng được bằng nút × ở góc trên hoặc vuốt xuống. |
| **Trần ba cấp** | Timeline → form → lặp lại là sâu nhất. Ngày kết thúc của chuỗi là bộ chọn ngay trong sheet lặp lại, không mở cấp bốn. |
| **Ngày là địa chỉ** | Trạng thái điều hướng duy nhất cần nhớ là ngày đang xem. Mở lại app luôn về hôm nay, không khôi phục ngày cũ. |
| **Phạm vi chặn** | Sheet chọn phạm vi áp dụng đứng trên mọi lớp khác và không đóng được bằng vuốt — bấm nhầm ra ngoài không được phép ghi dữ liệu. |

> Constitution I cấm chuỗi điều hướng sâu quá ba cấp và yêu cầu bottom tabs / stack /
> sheet / modal cho luồng tạm thời. IA này dùng **một stack hai màn hình** (Timeline, Cài đặt)
> cộng bottom sheet, không dùng bottom tabs — đây là lựa chọn có chủ đích chứ không phải
> thiếu sót; lý do ghi ở hàng "Không tab bar". Ghi lại trong Complexity Tracking của plan.

## 3. Mô hình dữ liệu mà giao diện phải phản ánh

| Thực thể | Bản chất | Trường |
|---|---|---|
| **Công việc thông thường** | Một bản ghi độc lập, sửa gì cũng chỉ ảnh hưởng chính nó. Không bao giờ hỏi phạm vi. | ngày · giờ bắt đầu · giờ kết thúc? · ghi chú? · trạng thái · nhắc? |
| **Quy tắc lặp** | Không hiện trực tiếp trên timeline. Người dùng chỉ chạm được vào nó thông qua một buổi cụ thể. | các thứ · giờ mặc định · ngày bắt đầu · ngày kết thúc? · mốc nhắc |
| **Lần xuất hiện** | Sinh khi vẽ đúng ngày đang xem, **không lưu**. Đây là thứ người dùng nhìn thấy và tưởng là "công việc". | quy tắc + ngày → giờ, tên, trạng thái |
| **Điều chỉnh riêng** | Bản ghi mỏng đè lên đúng một buổi. Có nhãn "✎ ĐÃ CHỈNH RIÊNG" trên dòng. | khóa quy tắc\|ngày · giờ? · nội dung? · trạng thái? · bỏ qua? |

> **Điểm dễ sai nhất của toàn bộ sản phẩm nằm ở đây: lần xuất hiện không phải là một bản
> ghi.** Nó được sinh ra từ quy tắc lặp khi vẽ đúng ngày đang xem, và chỉ tồn tại thật khi có
> điều chỉnh riêng đè lên. Giao diện phải làm cho ranh giới đó hiện rõ — nếu không, người
> dùng sửa một buổi lại đổi cả chuỗi.

Ánh xạ sang `spec.md` §6: Công việc → `Task`, Quy tắc lặp → `RecurringRule`, Điều chỉnh riêng
→ `RecurringOverride` (khóa `recurringRuleId + occurrenceDate`), Lần xuất hiện → dữ liệu dẫn
xuất, không có bảng.

## 4. Screen list

| ID | Màn hình | Dạng | Cấp | Vào từ | Hành động chính | Trạng thái phải có |
|---|---|---|---|---|---|---|
| **S-01** | Timeline | Màn hình gốc | 1 | Mở app | Tick trạng thái · Tạo mới · **Vuốt ngang đổi ngày** | Đang tải · Có dữ liệu · Rỗng · Lỗi đọc · Banner quyền bị từ chối · Vừa xóa còn hoàn tác |
| **S-02** | Chọn ngày | Bottom sheet · lịch tháng | 2 | Chạm tiêu đề ngày | Chọn ngày · Về hôm nay | Đang đếm ngày bận · Có chấm ngày bận · Lỗi đếm · Tháng rỗng · Ngày đang chọn · Ngoài tháng |
| **S-03** | Tạo / sửa công việc | Bottom sheet toàn chiều cao | 2 | Nút tạo · Chạm dòng | Lưu | Tạo mới · Đang sửa · Đang lưu · Lỗi từng trường · Lưu thất bại · Chưa lưu khi thoát |
| **S-04** | Thiết lập lặp lại | Bottom sheet | 3 | Hàng "Lặp lại" trong form | Xong | Không lặp · Có lặp · Chưa chọn thứ nào (lỗi) · Xem trước bằng lời |
| **S-05** | Chọn phạm vi áp dụng | Bottom sheet **chặn** | 2 | Sau khi sửa nội dung, di chuyển hoặc xóa một buổi lặp — **không** khi tick trạng thái (FR-026a) | Chỉ lần này · Toàn bộ chuỗi | Đang đếm số buổi (khóa lựa chọn) · Đếm xong · Không đếm được · Sửa · Đổi giờ · Di chuyển · Xóa |
| **S-06** | Thao tác dòng | Bottom sheet ⋯ | 2 | Nút ⋯ trên dòng | Đổi giờ · Di chuyển · Sửa · Xóa | Việc thường · Buổi của chuỗi (đổi nhãn xóa thành "Bỏ qua buổi này") |
| **S-07** | Đổi giờ / Di chuyển | Bottom sheet | 3 | Từ S-06 hoặc sau khi kéo-thả | Áp dụng | Chip giờ hay dùng · Bộ chọn giờ · Bộ chọn ngày (chỉ ở đây mới đổi được ngày) |
| **S-08** | Cài đặt | Màn hình đẩy ngang | 2 | Nút CĐ trên thanh ngày | Cấp quyền · Đổi mặc định · **Đổi chế độ hiển thị** | Đang tải · Lỗi đọc theo hàng · Đang lưu tùy chọn · Quyền đã cấp / bị từ chối / nhắc có thể trễ |
| **S-09** | Xác nhận phá hủy | Bottom sheet | 3 | Xóa công việc · Xóa toàn bộ dữ liệu · Thoát khi chưa lưu | Xác nhận | Xóa 1 việc · Xóa tất cả · Chưa lưu (3 lựa chọn) |

Đối chiếu với `spec.md` §11: S-01↔SCR-001, S-03↔SCR-002, S-04↔SCR-003, S-05↔SCR-004,
S-08↔SCR-005. S-02, S-06, S-07, S-09 là bốn màn hình mà `spec.md` chưa liệt kê riêng nhưng
các FR đã ngầm yêu cầu (FR-003 chọn ngày từ lịch, FR-018 di chuyển, FR-011 xác nhận xóa).

## 5. User flows

Mỗi luồng ghi kèm số thao tác thực tế. Ràng buộc Constitution I là **1–2 thao tác** cho tác
vụ thường gặp; luồng nào vượt thì đã ghi rõ lý do và đó là chỗ cần cắt trước tiên.

### F-1 · Đánh dấu xong một việc — **1 thao tác**
*Nhiều lần mỗi ngày — luồng quan trọng nhất.*

```
Mở app (về hôm nay)
  → Chạm ô tick trên dòng (vùng chạm 44×44)
  → Ghi ngay (buổi lặp = chỉ lần này, KHÔNG hỏi phạm vi)
  → Toast + Hoàn tác 5 giây
```

Không hỏi phạm vi khi tick. Trạng thái luôn thuộc về buổi cụ thể; hỏi mỗi lần sẽ biến thao
tác thường nhất thành hai bước và người dùng sẽ bấm bừa. **Đã chốt** — FR-026a nói rõ đổi
trạng thái không hỏi phạm vi; xem [D-01](./decisions.md).

### F-2 · Tạo công việc thường — **2 thao tác tới bản lưu được**
*Vài lần mỗi ngày.*

```
Chạm "CÔNG VIỆC MỚI" (thanh đáy, luôn thấy)
  → Gõ tên (ngày = ngày đang xem, giờ = 09:00, nhắc = mặc định trong Cài đặt)
  → [Cần đổi gì thêm?] chip +30 phút, chip mốc nhắc
  → Lưu (kiểm tra tên rỗng, giờ kết thúc ≤ giờ bắt đầu)
  → Đóng sheet, dòng mới sáng lên tại đúng vị trí giờ
```

Mọi trường có miền hữu hạn đều là chip hoặc bộ chọn hệ thống. Chỉ tên và ghi chú là gõ tay.
Nếu ngày trong form khác ngày đang xem, sau khi lưu timeline **nhảy sang ngày đó** — nếu
không người dùng tưởng mất việc.

### F-3 · Sửa một buổi của chuỗi lặp — **3 thao tác, có chủ đích**
*Vài lần mỗi tuần.*

```
Chạm dòng có nhãn ⟳ LẶP (form mở với dữ liệu buổi đó)
  → Sửa giờ hoặc nội dung
  → Lưu
  → [Chọn phạm vi] hai khối lớn, mỗi khối có dòng đếm số buổi bị ảnh hưởng
  → Ghi + toast nhắc lại phạm vi đã chọn, kèm Hoàn tác
```

Thao tác thứ ba là cố ý và **không được rút gọn**: đây là chỗ duy nhất người dùng có thể phá
hỏng dữ liệu của 122 buổi bằng một cú chạm. Sheet xuất hiện **SAU** khi bấm Lưu, ngay trước
khi ghi — không hỏi trước khi người dùng biết mình sẽ sửa gì.

### F-4 · Dời việc sang giờ khác trong ngày — **1 cử chỉ hoặc 3 thao tác**
*Hằng ngày.*

```
[Kéo hay bấm? — hai lối ngang hàng]
  ├ Kéo tay cầm ⣿ (bám lưới 15 phút, nhãn "Thả để đổi sang 10:15" hiện trong lúc kéo)
  └ Hoặc ⋯ → Đổi giờ (chip giờ hay dùng + bộ chọn giờ hệ thống)
  → [Là buổi của chuỗi?] Có → sheet phạm vi
  → Ghi + Hoàn tác
```

Kéo-thả **không đi xuyên ngày** (`spec.md` FR-018b). Đổi ngày chỉ nằm ở ⋯ → Di chuyển và ở
trường Ngày trong form — và cả hai chỗ đều nói rõ điều đó bằng chữ, để người dùng thôi cố kéo.

### F-5 · Xin quyền thông báo lần đầu — **không thêm thao tác nào**
*Một lần trong đời máy, ở điểm nào tới trước.*

```
Bật công tắc Nhắc nhở trong form ─┐
                                  ├→ Xin quyền thông báo (KHÔNG xin lúc mở app lần đầu)
Lưu công việc đầu tiên ───────────┘     → [Được cấp?]
                                           └ Bị từ chối → công việc vẫn lưu,
                                             nói rõ nhắc nhở đang bị vô hiệu hóa
                                             + lối mở cài đặt hệ thống

Bật công tắc Nhắc nhở → thêm: xin quyền báo thức chính xác
  → [Được cấp?]
     └ Bị từ chối → vẫn đặt nhắc gần đúng, nói rõ "có thể trễ vài phút" + lối cấp lại quyền
  → Dòng công việc mang nhãn "NHẮC −10′ · CÓ THỂ TRỄ"
```

Hai lối vào chứ không phải một, vì từ FR-033a mọi công việc đều có thông báo: người chưa từng
bật nhắc nhở mà chỉ xin quyền ở công tắc thì sẽ không bao giờ nhận được gì. Ở lối "lưu công
việc", hộp thoại quyền **không được await** — nó không được làm chậm hay chặn nút lưu.

Từ chối quyền **không bao giờ** chặn việc lưu công việc. App tiếp tục làm được phần nó làm
được, và nói thật phần nó không đảm bảo. Khớp `spec.md` FR-036a, FR-036b, FR-036d, FR-039.

### F-6 · Xóa — **2–3 thao tác tùy loại**
*Hiếm — nhưng không hoàn tác được nếu làm sai.*

```
⋯ trên dòng
  → [Việc thường hay buổi của chuỗi?]
     ├ Việc thường → xóa ngay, toast Hoàn tác 5 giây, KHÔNG hộp thoại
     └ Buổi của chuỗi → sheet phạm vi
        ("Bỏ qua buổi này" hay "Xóa cả chuỗi + mọi buổi chưa diễn ra")
  → Toast + Hoàn tác
```

Xóa toàn bộ dữ liệu trong Cài đặt là **ngoại lệ duy nhất** dùng hộp thoại xác nhận có chữ, vì
không có hoàn tác và không có bản sao ở bất cứ đâu (FR-011b).

**Đã chốt** — FR-011 nay quy định xóa ngay không chặn bằng xác nhận, và FR-011a đặt ba điều
kiện cho hành động hoàn tác: sống ≥5 giây, không bị nuốt khi đổi ngày hay mở màn hình khác,
và khôi phục cả nhắc nhở. Xem [D-03](./decisions.md).

---

### F-7 · Chuyển ngày bằng vuốt ngang — **1 cử chỉ**
*Nhiều lần mỗi ngày.*

```
Vuốt sang trái/phải ở bất kỳ đâu trên timeline
  → Thanh ngày hiện ngày đích trong lúc vuốt
  → [Qua ngưỡng 64pt hoặc đủ vận tốc?]
     ├ Có  → Timeline chuyển sang ngày đó
     └ Không → Nội dung trượt về chỗ cũ, không đổi gì
```

Lối thay thế không cần cử chỉ đã có sẵn: nút `‹ ›` trên thanh ngày (FR-003) — nên cử chỉ này
không tạo thêm gánh nặng tiếp cận nào. Vuốt bắt đầu trong vùng chạm tay cầm ⣿ thuộc về thao
tác kéo đổi giờ, không chuyển ngày (FR-003c).

---

### F-8 · Thiết lập một công việc lặp lại — **4 thao tác kể từ timeline**
*Vài lần mỗi tháng — hiếm, nhưng mỗi lần thay thế hàng chục lần nhập tay.*

```
Chạm CÔNG VIỆC MỚI → gõ tên          (2 thao tác, chung với F-2)
  → Chạm hàng "Lặp lại: Không lặp ›"  → sheet cấp 3 mở
  → [Chọn thế nào?]
     ├ Preset: T2–T6 / Cuối tuần / Hằng ngày   → 1 chạm
     └ Chọn từng thứ trong 7 nút 44×44         → 1–7 chạm
  → Xem trước bằng lời cập nhật ngay:
    "Sẽ tạo buổi vào T2, T3, T4, T5, T6 lúc 09:00, từ 03/08, không có ngày kết thúc."
  → XONG → quay về form, hàng Lặp lại hiện tóm tắt
  → Lưu
```

**Ngân sách**: 4 thao tác tới bản lưu được nếu dùng preset, vượt ngưỡng 1–2 của Constitution I.
Vượt có chủ đích và đã được bù bằng ba thứ: preset gộp 5 lần chạm thành 1, ngày bắt đầu mặc
định là ngày đang xem, và giờ mặc định lấy từ form nên không phải nhập lại. Cắt thêm nữa sẽ
phải bỏ xem trước bằng lời — mà đó chính là chỗ người dùng phát hiện mình chọn sai thứ
(FR-024).

**Điểm hỏng thường gặp**: người dùng gạt sang "Lặp theo thứ" rồi bấm XONG mà chưa chọn thứ
nào. Sheet không được im lặng nuốt thao tác — xem trạng thái "Có lặp, chưa chọn thứ nào"
trong [ux-ui-spec §3](./ux-ui-spec.md).

Phục vụ US-4 · FR-020, FR-021, FR-022, FR-024.
