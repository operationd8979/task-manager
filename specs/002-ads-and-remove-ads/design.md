---
rev: 1
spec_rev: 1
---
# Design: Ads and Remove-ads purchase

- **Canvas**: https://claude.ai/artifact/WzK6S8svewWRZF4mrnopVv ("002 Ads and Remove-ads
  purchase")
- **Design system**: TaskManager design system,
  https://claude.ai/artifact/3qkoos68veiV382pdKnXUK (version `1791685474-53b1`). It is
  installed on the canvas as `ds/taskmanager`. It holds tokens only, with no components, so
  the artboards are markup using exact token values.
- **Targets**: 390×844 phone. Drawn in light; dark comes from the canvas theme switch on the
  installed tokens.

## Screens

| ID | Screen | Serves | States drawn | Artboards |
|---|---|---|---|---|
| SCR-1 | Timeline: banner area | US-1 (AC-1.1–AC-1.4, AC-1.7), US-2 (AC-2.1–AC-2.11), AC-6.3 | banner shown; banner collapsed (unknown, owned, no fill, offline, throttled, consent-blocked); undo toast above the banner | `Main.dc.html`, `SCR1-collapsed.dc.html`, `SCR1-undo-toast.dc.html` |
| SCR-2 | Remove-ads sheet | US-3 (AC-3.1–AC-3.8), US-4 (AC-4.2–AC-4.4), US-5 (AC-5.1, AC-5.2), AC-7.1 | loading; ready; payment pending; success/owned; restore found nothing; not available (empty); store error with retry; development build blocked | `SCR2-loading.dc.html`, `SCR2-ready.dc.html`, `SCR2-pending.dc.html`, `SCR2-success.dc.html`, `SCR2-nothing-found.dc.html`, `SCR2-unavailable.dc.html`, `SCR2-error.dc.html`, `SCR2-dev-blocked.dc.html` |
| SCR-3 | Settings: Remove-ads section | AC-1.6, US-4 (Restore), AC-5.2, AC-6.4, AC-6.5, FR-14, FR-15 | free; checking (unknown); pending; owned; purchases unavailable on device; consent region with Privacy options (SL-5) | `SCR3-free.dc.html`, `SCR3-checking.dc.html`, `SCR3-pending.dc.html`, `SCR3-owned.dc.html`, `SCR3-unavailable.dc.html`, `SCR3-privacy-sl5.dc.html` |

Stories with no screen of their own:

- **US-7**: development-build safety is not UI, except AC-7.1, which is on `SCR2-dev-blocked`.
- **US-8**: the full-screen ad is drawn by Google, and its timing lives in the spec.
- **US-9**: ads returning after a refund reuses the SCR-1 states.

## Flows

- US-3, from the banner: tap BỎ QUẢNG CÁO on SCR-1, then SCR-2 ready, then MUA, then the
  Play purchase sheet, then SCR-2 success. Two taps to the store.
- US-3, from Settings: tap ⚙ on SCR-1, then the "Bỏ quảng cáo" row on SCR-3, then MUA on
  SCR-2. Three taps to the store.
- US-4: tap "Khôi phục giao dịch" on SCR-3 or on SCR-2. The result shows in SCR-2: the
  success layout with the restored copy (D-4), the nothing-found notice, or the error layout
  (D-4). One tap.
- US-5: SCR-2 pending replaces MUA, and the SCR-3 row carries the ĐANG CHỜ THANH TOÁN tag in
  every session until the payment settles.
- US-6: Google's consent form over an idle SCR-1. The Privacy options row on SCR-3 reopens
  it (SL-5, once rn-ads 0.4.0 ships).
- US-2 and US-1: SCR-1 shows the banner when the status is not owned and an ad is ready.
  Otherwise it collapses (SCR-1 collapsed); appearing or collapsing moves the bar and toast
  with an animation.

## Copy (vi-VN source; en-US and ja-JP are added at implement time via `npm run i18n:sync`)

| Where | vi-VN |
|---|---|
| Banner strip label · link | QUẢNG CÁO · BỎ QUẢNG CÁO (a11y: "Bỏ quảng cáo. Mở trang mua gói bỏ quảng cáo") |
| Sheet title | Bỏ quảng cáo |
| Sheet pitch | Mua một lần, dùng mãi. Gỡ ứng dụng hoặc đổi máy vẫn khôi phục được bằng cùng tài khoản cửa hàng. |
| Price label · buy · restore · footnote | GIÁ · MUA · KHÔI PHỤC GIAO DỊCH · Thanh toán qua Google Play. |
| Loading | Đang lấy giá từ cửa hàng… |
| Pending | ĐANG CHỜ THANH TOÁN / Cửa hàng chưa xác nhận khoản thanh toán của bạn. / Quảng cáo sẽ tự tắt khi thanh toán hoàn tất, kể cả ở lần mở ứng dụng sau. Bạn không cần mua lại. |
| Success | ĐÃ MUA / Đã bỏ quảng cáo / Cảm ơn bạn. Quảng cáo đã tắt, không cần khởi động lại ứng dụng. / Trên máy mới hoặc sau khi cài lại, giao dịch tự khôi phục với cùng tài khoản cửa hàng. / XONG |
| Restored (success layout, D-4) | Đã khôi phục giao dịch / Quảng cáo đã tắt trên máy này. |
| Nothing found | KHÔNG TÌM THẤY GIAO DỊCH / Tài khoản cửa hàng trên máy này chưa từng mua gói bỏ quảng cáo. Nếu bạn đã mua bằng tài khoản khác, hãy đăng nhập tài khoản đó trong cửa hàng rồi thử lại. |
| Not available | Chưa bán ở khu vực của bạn / Gói bỏ quảng cáo chưa có trên cửa hàng ở nơi bạn đang ở. Ứng dụng vẫn dùng bình thường. Nếu đã mua ở nơi khác, bạn có thể khôi phục. |
| Store error | Chưa kết nối được cửa hàng / Kiểm tra kết nối mạng rồi thử lại. Công việc và nhắc nhở của bạn không bị ảnh hưởng. / THỬ LẠI |
| Restore failed (error layout, D-4) | Chưa khôi phục được giao dịch / (same body) / THỬ LẠI |
| Dev blocked | BẢN DỰNG PHÁT TRIỂN / Bản dựng này không mua được. / Chỉ bản phát hành mới tạo được giao dịch thật. Chưa có khoản phí nào được tính. |
| Settings section · rows | QUẢNG CÁO · Bỏ quảng cáo / Mua một lần, dùng mãi. · Khôi phục giao dịch |
| Settings checking · owned | Đang kiểm tra giao dịch với cửa hàng… · Đã bỏ quảng cáo / Cảm ơn bạn đã ủng hộ ứng dụng. |
| Settings unavailable | Máy này chưa mua được trong ứng dụng. / Cần có dịch vụ cửa hàng Google Play để mua hoặc khôi phục gói bỏ quảng cáo. Mọi tính năng khác vẫn dùng bình thường. |
| Settings privacy (SL-5) | Tùy chọn quyền riêng tư / Đổi lựa chọn đồng ý quảng cáo của bạn. Biểu mẫu do Google hiển thị. |
| Data statement, ads line (FR-14) | Quảng cáo do Google cung cấp và dùng mã nhận dạng quảng cáo của máy. Tên và ghi chú công việc không bao giờ được gửi đi. |

## Decisions & conflicts

- D-1 Bottom stack, top to bottom: the list, the New-task bar, a 44pt strip
  ("QUẢNG CÁO" left, "BỎ QUẢNG CÁO" link right, 1px `color.border` above), the banner, the
  system inset. This follows plan D-5.
  - The strip is also the buffer between the primary button and the ad, which keeps
    accidental-click risk down.
  - Cost: about 44pt plus the banner (adaptive anchored, about 50–62pt) leaves the list.
  - Keep it; measure the real banner height in SL-2.
- D-2 The undo toast sits on top of the New-task bar (offset = inset + banner + strip +
  bar), never over the ad (AC-2.6, FR-9).
- D-3 Spec AC-2.1 says the link is "next to" the banner. It is drawn as a strip directly
  above, because an adaptive banner takes the full width and a link beside it would touch
  the ad. Not a behaviour change; spec wording may stay.
- D-4 No separate artboards for restored/already-owned or for restore failed:
  - restored and already-owned (AC-3.4, AC-4.2) reuse `SCR2-success` with the "Restored"
    copy;
  - restore failed (AC-4.4) reuses `SCR2-error` with the "Restore failed" title.
- D-5 Surfaces drawn by Google get no artboard: banner ad content (a labelled placeholder),
  the full-screen ad, the consent form, and the Play purchase sheet.
- D-6 Development-blocked (AC-7.1) appears after tapping MUA, which then turns into a
  disabled, outlined button.
- D-7 The data-statement ad line shows only while ads are active (free, status resolved).
  It is hidden for owners, while checking, and on devices that cannot buy (FR-14).
- D-8 "Khôi phục giao dịch" in Settings opens SCR-2 and runs the restore there. That gives
  one place for every result (restored, nothing found, failed), instead of a second set of
  messages in Settings.
- D-9 The new Settings section "QUẢNG CÁO" sits between NGÔN NGỮ and DỮ LIỆU, next to data
  management as the raw spec suggests.
- Conflict, standards: `docs/standards.md` `## Design` still says "Design system: none
  yet", while this canvas uses the TaskManager design system. Recommendation: run
  `/sdd-design-build-system` with that link to record it.

## Changelog

- r1 (2026-10-11): created from spec r1.
