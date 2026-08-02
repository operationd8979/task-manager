/**
 * Centralised display-string catalogue (FR-058a).
 *
 * The first release is Vietnamese only, so a full i18n library would be bundle
 * growth with no behaviour change (research.md R9). What matters is that every
 * string lives in one place and that a missing key is a compile error rather
 * than an empty string at runtime.
 *
 * Access goes through `t()` rather than the object, so swapping in a real i18n
 * library later replaces this function body and nothing else.
 */

const CATALOG = {
  // Day bar
  'day.today': 'HÔM NAY',
  'day.previous': 'Ngày trước',
  'day.next': 'Ngày sau',
  'day.openCalendar': 'Mở lịch chọn ngày',
  'day.settings': 'Cài đặt',

  // Calendar sheet
  'calendar.title': 'Chọn ngày',
  'calendar.busyFailed': 'Chưa đếm được ngày bận',
  'calendar.backToToday': 'VỀ HÔM NAY',
  'calendar.day': 'Ngày {date}',
  'calendar.dayBusy': 'Ngày {date}, có công việc',
  'calendar.previousMonth': 'Tháng trước',
  'calendar.nextMonth': 'Tháng sau',
  'calendar.month': 'Tháng {month}, {year}',

  // Timeline states
  'timeline.loading': 'Đang đọc dữ liệu',
  'timeline.loadingSlow': 'Vẫn đang đọc dữ liệu',
  'timeline.emptyTitle': 'Ngày này chưa có công việc',
  'timeline.emptyBody': 'Tạo một công việc, hoặc xem ngày khác.',
  'timeline.errorTitle': 'Chưa đọc được dữ liệu',
  'timeline.errorBody': 'Dữ liệu vẫn nằm trên máy, chưa mất.',
  'timeline.retry': 'THỬ LẠI',
  'timeline.newTask': '+ CÔNG VIỆC MỚI',
  'timeline.overlapCluster': '{count} VIỆC CHỒNG GIỜ {from}–{to}',

  // Row labels
  'row.done': 'HOÀN THÀNH',
  'row.overdue': 'QUÁ HẠN {duration}',
  'row.repeats': 'LẶP {days}',
  'row.edited': 'ĐÃ CHỈNH RIÊNG',
  'row.reminder': 'NHẮC {offset}',
  'row.reminderOnTime': 'NHẮC ĐÚNG GIỜ',
  'row.reminderMayBeLate': 'CÓ THỂ TRỄ',
  'row.more': 'Thao tác khác',
  'row.dragHandle': 'Kéo để đổi giờ {title}. Hoặc dùng nút Thao tác khác → Đổi giờ.',
  'row.toggleDone': 'Đánh dấu hoàn thành {title}',
  'row.toggleProcessing': 'Bỏ đánh dấu hoàn thành {title}',

  // Task form
  'form.newTitle': 'Công việc mới',
  'form.editTitle': 'Sửa công việc',
  'form.close': 'Đóng',
  'form.name': 'Tên công việc',
  'form.date': 'Ngày',
  'form.start': 'Bắt đầu',
  'form.end': 'Kết thúc',
  'form.note': 'Ghi chú',
  'form.status': 'Trạng thái',
  'form.repeat': 'Lặp lại',
  'form.noRepeat': 'Không lặp',
  'form.reminder': 'Nhắc nhở',
  'form.save': 'TẠO CÔNG VIỆC',
  'form.saveEdit': 'LƯU',
  'form.saving': 'ĐANG LƯU…',
  'form.delete': 'XÓA',
  'form.noEndTime': 'Không có giờ kết thúc',
  'form.plus30': '+30 phút',
  'form.plus45': '+45 phút',
  'form.plus60': '+1 giờ',
  'form.statusProcessing': 'Đang thực hiện',
  'form.statusDone': 'Hoàn thành',
  'form.reminderOn': 'Nhắc nhở bật',
  'form.reminderOff': 'Nhắc nhở tắt',
  'form.reminderOnTime': 'Đúng giờ',
  'form.reminderBefore': 'Trước {minutes} phút',
  'form.notePlaceholder': 'Thêm ghi chú',
  'form.endUnset': '—',

  // Validation — every message says how to fix, never "invalid"
  'validate.titleRequired': 'Nhập tên công việc để lưu được.',
  'validate.endBeforeStart':
    'Giờ kết thúc phải sau {start}. Bỏ trống nếu chỉ là một mốc giờ.',
  'validate.weekdayRequired': 'Chọn ít nhất một thứ trong tuần.',
  'validate.endDateBeforeStart': 'Ngày kết thúc phải từ {start} trở đi.',
  'validate.reminderInPast':
    'Thời điểm nhắc đã qua, nên ứng dụng sẽ không đặt nhắc nhở cho công việc này.',

  // Save failure
  'save.failedTitle': 'Chưa lưu được',
  'save.retry': 'THỬ LƯU LẠI',

  // Undo
  'undo.action': 'HOÀN TÁC',
  'undo.deleted': 'Đã xóa {title}.',
  'undo.scopeThisOnly': 'Chỉ lần này: {change}',
  'undo.scopeWholeSeries': 'Toàn bộ chuỗi: {change}',

  // Unsaved changes
  'unsaved.title': 'Còn thay đổi chưa lưu',
  'unsaved.saveAndClose': 'Lưu rồi thoát',
  'unsaved.keepEditing': 'Tiếp tục sửa',
  'unsaved.discard': 'Thoát và bỏ thay đổi',

  // Common
  'common.cancel': 'HỦY',
  'common.done': 'XONG',
  'common.apply': 'ÁP DỤNG',
} as const;

export type StringKey = keyof typeof CATALOG;

type Params = Readonly<Record<string, string | number>>;

/**
 * Look up a display string, filling `{name}` placeholders.
 *
 * An unknown placeholder is left in place rather than replaced with `undefined`
 * — a visible `{foo}` in the UI is a bug report; the word "undefined" is not.
 */
export function t(key: StringKey, params?: Params): string {
  const template: string = CATALOG[key];
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}
