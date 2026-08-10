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
	'day.backToToday': 'VỀ HÔM NAY',

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
	'timeline.newTaskSwipeHint': 'Vuốt lên để tạo công việc mới',
	'timeline.overlapCluster': '{count} VIỆC CHỒNG GIỜ {from}–{to}',

	// Row labels
	'row.done': 'HOÀN THÀNH',
	'row.overdue': 'QUÁ HẠN {duration}',
	'row.skipped': 'ĐÃ BỎ QUA',
	'row.countdown': 'CÒN {time}',
	'row.countdownLabel': 'Còn {minutes} phút {seconds} giây nữa đến giờ',
	'row.restoreSkipped': 'Bỏ đánh dấu bỏ qua {title}',
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

	// Reminder permissions
	'permission.deniedTitle': 'Nhắc nhở đang bị tắt',
	'permission.deniedBody': 'Ứng dụng chưa được phép hiện thông báo, nên nhắc nhở sẽ không xuất hiện.',
	'permission.openSettings': 'MỞ CÀI ĐẶT',
	'permission.inexactTitle': 'Nhắc nhở có thể bị trễ',
	'permission.inexactBody': 'Thiếu quyền báo thức chính xác, nên nhắc nhở vẫn được đặt nhưng có thể phát trễ vài phút.',
	'permission.grant': 'CẤP QUYỀN',

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
	'undo.seriesDeleted': 'Đã xóa toàn bộ chuỗi {title}.',

	// Unsaved changes
	'unsaved.title': 'Còn thay đổi chưa lưu',
	'unsaved.saveAndClose': 'Lưu rồi thoát',
	'unsaved.keepEditing': 'Tiếp tục sửa',
	'unsaved.discard': 'Thoát và bỏ thay đổi',

	// Recurrence sheet (S-04)
	'repeat.title': 'Thiết lập lặp lại',
	'repeat.none': 'Không lặp',
	'repeat.byWeekday': 'Lặp theo thứ',
	'repeat.weekdays': 'Các thứ trong tuần',
	'repeat.presetWeekdays': 'T2–T6',
	'repeat.presetWeekend': 'Cuối tuần',
	'repeat.presetDaily': 'Hằng ngày',
	'repeat.startDate': 'Ngày bắt đầu',
	'repeat.endDate': 'Ngày kết thúc',
	'repeat.noEndDate': 'Không giới hạn',
	'repeat.untilDate': 'Đến ngày',
	'repeat.previewNone': 'Chưa tạo được buổi nào.',
	'repeat.preview': 'Sẽ tạo buổi vào {days} lúc {time}, từ {start}{end}.',
	'repeat.previewOpenEnded': ' và không có ngày kết thúc',
	'repeat.previewUntil': ' đến {end}',
	'repeat.summary': 'Lặp {days} lúc {time}',
	'repeat.summaryDaily': 'Lặp hằng ngày lúc {time}',

	// Apply-scope sheet (S-05)
	'scope.title': 'Áp dụng thay đổi cho?',
	'scope.subject': '{title} · {date} · lặp lại',
	'scope.thisOnly': 'CHỈ LẦN NÀY',
	'scope.wholeSeries': 'TOÀN BỘ CHUỖI',
	'scope.thisOnlyEffect': 'Ảnh hưởng 1 buổi · các buổi còn lại giữ nguyên',
	'scope.seriesEffect': 'Ảnh hưởng {count} buổi trong 12 tháng tới',
	'scope.seriesEffectOpen': 'Ảnh hưởng {count} buổi trong 12 tháng tới, và mọi buổi sau đó',
	'scope.counting': 'Đang đếm số buổi bị ảnh hưởng…',
	'scope.countFailed': 'Không đếm được số buổi bị ảnh hưởng',
	'scope.cancel': 'HỦY — KHÔNG THAY ĐỔI GÌ',
	'scope.skipThisSession': 'Bỏ qua buổi này',
	'scope.changedTime': 'đã đổi giờ sang {time}.',
	'scope.skipped': 'đã bỏ qua buổi này.',
	'scope.seriesDeleted': 'Đã xóa toàn bộ chuỗi lặp.',

	// Row actions (S-06)
	'actions.title': 'Thao tác',
	'actions.move': 'Di chuyển',
	'actions.edit': 'Sửa',
	'actions.delete': 'Xóa',

	// Time shift / move (S-07)
	'shift.timeTitle': 'Đổi giờ',
	'shift.moveTitle': 'Di chuyển',
	'shift.commonTimes': 'Giờ hay dùng',
	'shift.dateOnlyHere': 'Đây là nơi duy nhất đổi được ngày. Kéo-thả chỉ đổi giờ trong cùng một ngày.',
	'shift.dropPreview': 'Thả để đổi sang {time}',

	// Settings (S-08)
	'settings.back': 'Quay lại',
	'settings.reminders': 'NHẮC NHỞ',
	'settings.notificationPermission': 'Quyền hiện thông báo',
	'settings.exactAlarmPermission': 'Quyền nhắc đúng thời điểm',
	'settings.granted': '✓ Đã cấp',
	'settings.notGranted': '⚠ Chưa cấp',
	'settings.mayBeLate': 'Nhắc nhở có thể bị phát trễ.',
	'settings.countdown': 'ĐẾM NGƯỢC',
	'settings.countdownOffset': 'Bắt đầu đếm ngược trước',
	'settings.countdownBefore': '{minutes} phút',
	'settings.countdownHint':
		'Áp dụng cho mọi công việc, kể cả công việc không bật nhắc nhở. Đến mốc này, dòng công việc hiện đồng hồ đếm ngược từng giây. Không ảnh hưởng đến thông báo.',
	'settings.display': 'HIỂN THỊ',
	'settings.displayMode': 'Chế độ',
	'settings.modeAuto': 'Tự động',
	'settings.modeAutoHint': 'Theo máy',
	'settings.modeLight': 'Sáng',
	'settings.modeDark': 'Tối',
	'settings.firstDayOfWeek': 'Ngày bắt đầu tuần',
	'settings.monday': 'Thứ Hai',
	'settings.sunday': 'Chủ Nhật',
	'settings.data': 'DỮ LIỆU',
	'settings.dataOnDevice': 'Dữ liệu chỉ lưu trên máy này. Gỡ ứng dụng là mất.',
	'settings.backupUnknown': 'Chưa xác nhận được dữ liệu có bị loại khỏi sao lưu của hệ điều hành hay không.',
	'settings.itemCount': 'Đang lưu {count} công việc.',
	'settings.destroyAll': 'XÓA TOÀN BỘ DỮ LIỆU',
	'settings.destroyTitle': 'Xóa toàn bộ dữ liệu?',
	'settings.destroyBody': 'Thao tác này không hoàn tác được. {count} công việc cùng mọi nhắc nhở sẽ bị xóa.',
	'settings.destroyConfirm': 'XÓA',
	'settings.saveFailed': 'Chưa lưu được lựa chọn',

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
