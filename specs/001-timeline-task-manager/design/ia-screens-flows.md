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
| **S-01** | Timeline | Màn hình gốc | 1 | Mở app | Tick trạng thái · Tạo mới | Đang tải · Có dữ liệu · Rỗng · Lỗi đọc · Banner quyền bị từ chối |
| **S-02** | Chọn ngày | Bottom sheet · lịch tháng | 2 | Chạm tiêu đề ngày | Chọn ngày · Về hôm nay | Có chấm ngày bận · Ngày đang chọn · Ngoài tháng |
| **S-03** | Tạo / sửa công việc | Bottom sheet toàn chiều cao | 2 | Nút tạo · Chạm dòng | Lưu | Tạo mới · Đang sửa · Đang lưu · Lỗi từng trường · Lưu thất bại · Chưa lưu khi thoát |
| **S-04** | Thiết lập lặp lại | Bottom sheet | 3 | Hàng "Lặp lại" trong form | Xong | Không lặp · Có lặp · Chưa chọn thứ nào (lỗi) · Xem trước bằng lời |
| **S-05** | Chọn phạm vi áp dụng | Bottom sheet **chặn** | 2 | Sau mọi thao tác ghi lên một buổi lặp | Chỉ lần này · Toàn bộ chuỗi | Sửa · Đổi giờ · Di chuyển · Xóa — mỗi loại một bộ lời khác nhau |
| **S-06** | Thao tác dòng | Bottom sheet ⋯ | 2 | Nút ⋯ trên dòng | Đổi giờ · Di chuyển · Sửa · Xóa | Việc thường · Buổi của chuỗi (đổi nhãn xóa thành "Bỏ qua buổi này") |
| **S-07** | Đổi giờ / Di chuyển | Bottom sheet | 3 | Từ S-06 hoặc sau khi kéo-thả | Áp dụng | Chip giờ hay dùng · Bộ chọn giờ · Bộ chọn ngày (chỉ ở đây mới đổi được ngày) |
| **S-08** | Cài đặt | Màn hình đẩy ngang | 2 | Nút CĐ trên thanh ngày | Cấp quyền · Đổi mặc định | Quyền đã cấp / bị từ chối / nhắc có thể trễ |
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
tác thường nhất thành hai bước và người dùng sẽ bấm bừa. **Đây là quyết định D-01 ở
[open-decisions.md](./open-decisions.md), cần chốt trước khi plan** — nó mâu thuẫn với
`spec.md` FR-026 ở dạng chữ.

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

### F-5 · Bật nhắc nhở lần đầu — **2 thao tác + hộp thoại hệ thống**
*Một lần trong đời máy.*

```
Bật công tắc Nhắc nhở trong form (đúng lúc người dùng vừa nói ra ý định)
  → Xin quyền thông báo (KHÔNG xin lúc mở app lần đầu)
  → [Được cấp?]
     └ Bị từ chối → vẫn đặt nhắc gần đúng, nói rõ "có thể trễ vài phút" + lối cấp lại quyền
  → Dòng công việc mang nhãn "NHẮC −10′ · CÓ THỂ TRỄ"
```

Từ chối quyền **không bao giờ** chặn việc lưu công việc. App tiếp tục làm được phần nó làm
được, và nói thật phần nó không đảm bảo. Khớp `spec.md` FR-036a, FR-036b, FR-039.

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
không có hoàn tác và không có bản sao ở bất cứ đâu.

> Lưu ý mâu thuẫn cần plan xử lý: `spec.md` FR-011 nói "MUST yêu cầu xác nhận trước khi xóa"
> công việc thông thường. Design thay hộp thoại xác nhận bằng **toast + Hoàn tác 5 giây** —
> mạnh hơn về khả năng phục hồi, nhẹ hơn về thao tác. Xem D-03 ở
> [open-decisions.md](./open-decisions.md).
