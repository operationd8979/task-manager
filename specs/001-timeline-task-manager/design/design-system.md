# Design system — nối vào `@chipmobilesdk/rn-theme`

Phiên bản gói đối chiếu: `@chipmobilesdk/rn-theme@0.2.1`, `react-native-unistyles@3.3.0`
(đã có trong `node_modules`, xem mục "Việc phải làm trước khi code" ở cuối).

## 1. Đầu vào thương hiệu

Ba màu là **toàn bộ** đầu vào màu. Mọi token khác suy ra bằng thuật toán, không khai báo tay
ở từng màn hình — đó là điều kiện để chế độ sáng và tối luôn hoàn chỉnh cùng lúc.

```ts
// src/theme/brand.ts
import type { BrandColors, TypographyConfig } from '@chipmobilesdk/rn-theme';

export const BRAND_COLORS: BrandColors = {
  primary: '#EC3013',   // Accent — hành động chính, quá hạn, focus ring, dải cụm chồng giờ
  secondary: '#201E1D', // Ink — chữ, đường kẻ, cấu trúc; là nền ở chế độ tối
  tertiary: '#F3F2F2',  // Ground — nền sáng, surface; là chữ ở chế độ tối
};

export const BRAND_TYPOGRAPHY: TypographyConfig = {
  fontFamily: 'System', // SF trên iOS, Roboto trên Android — đủ dấu tiếng Việt, không tốn dung lượng gói
  baseFontSize: 16,
  fontScale: 1,
};
```

| Màu | Vai trò | Ghi chú |
|---|---|---|
| `primary` `#EC3013` | Hành động chính, quá hạn, focus ring, dải dọc cụm chồng giờ | Chỉ **một** điểm nhấn mỗi màn hình |
| `secondary` `#201E1D` | Chữ, đường kẻ 2px, cấu trúc | Ở chế độ tối lật thành nền |
| `tertiary` `#F3F2F2` | Nền và surface ở chế độ sáng | Ở chế độ tối lật thành chữ |

## 2. Điều mà SDK cho sẵn và điều nó không cho

`createUnistylesConfig` trả về `StyleTheme` gồm `color` (21 khóa), `typography`, `spacing`,
`radius`, `shadow`, `zIndex`, và nhận `overrides.light` / `overrides.dark` kiểu
`DeepPartial<StyleTheme>`.

**Chỗ dễ sai nhất**: `generateLightPalette` / `generateDarkPalette` **không** suy `background`,
`surface`, `onBackground`, `onSurface`, `border` từ ba màu thương hiệu — chúng là hằng số
trung tính viết cứng trong gói:

| Token | Mặc định SDK (light) | Mặc định SDK (dark) | Design yêu cầu |
|---|---|---|---|
| `background` | `#F8F9FA` | `#121212` | `#F3F2F2` / `#201E1D` |
| `surface` | `#FFFFFF` | `#1E1E1E` | `#E9E7E7` / `#302D2C` |
| `onBackground` / `onSurface` | `#1A1A1A` | `#E6E6E6` | `#201E1D` / `#F3F2F2` |
| `border` | `#E0E0E0` | `#3A3A3A` | `#D6D2D2` / `#403C3A` |

Nếu không override, app sẽ chạy được nhưng **không phải màu thương hiệu** — nền xanh xám
`#F8F9FA` thay vì `#F3F2F2`, và chế độ tối `#121212` thay vì mực `#201E1D`. Đây là lỗi im
lặng, không có cảnh báo lúc chạy.

`DeepPartial<StyleTheme>` chỉ cho phép ghi đè khóa **đã có**, không thêm được khóa mới. Bảy
token ngữ nghĩa của design — `textMuted`, `lineStrong`, `accentFill`, `accentInk`,
`accentSoft`, `scrim`, `skeleton` — không có chỗ trong `ThemeColors`. Cách xử lý ở mục 5.

## 3. Bảng token màu ngữ nghĩa — đã kiểm tương phản

Mọi giá trị dưới đây tính bằng `tinycolor2` (chính thư viện SDK dùng) từ ba màu thương hiệu.
Cột tương phản là tỉ lệ WCAG so với nền dùng chung với token đó; ngưỡng AA cho chữ cỡ thường
là **4.5:1**.

### Chế độ sáng

| Token app | Giá trị | Suy ra từ | Dùng ở đâu | Tương phản |
|---|---|---|---|---|
| `background` | `#F3F2F2` | `tertiary` | Nền màn hình, nền sheet | — |
| `surface` | `#E9E7E7` | `darken(tertiary, 4)` | Ô nhập, nền cụm chồng giờ | — |
| `onBackground` / `onSurface` | `#201E1D` | `secondary` | Tên công việc, tiêu đề | **14.86** ✅ |
| `textMuted` | `#706966` | `lighten(secondary, 30)` | Ghi chú, meta, nhãn phụ | **4.82** ✅ |
| `border` | `#D6D2D2` | `darken(tertiary, 12)` | Kẻ giữa các dòng | — |
| `lineStrong` | `#201E1D` @ 40% | `secondary` | Kẻ 2px giữa vùng lớn | — |
| `primary` | `#EC3013` | `primary` | Ô tick đã xong, dải cụm 3px, focus ring | 3.76 ⚠️ **chỉ dùng cho vùng không có chữ** |
| `accentFill` | `#BD260F` | `darken(primary, 10)` | Nền nút chính có nhãn chữ | **5.45** với `onAccent` ✅ |
| `onAccent` | `#F3F2F2` | `tertiary` | Chữ trên `accentFill` | **5.45** ✅ |
| `accentInk` | `#A0210D` | `darken(primary, 16)` | Chữ màu accent cỡ body/caption | **6.91** trên `background`, **4.99** trên `accentSoft` ✅ |
| `accentSoft` | `#F4C5BE` | `lighten(primary,35).desaturate(15)` | Nền nhãn QUÁ HẠN, banner quyền | — |
| `scrim` | `#201E1D` @ 45% | `secondary` | Lớp phủ sau bottom sheet | — |
| `skeleton` | `#E9E7E7` ↔ `#F3F2F2` | `surface` ↔ `background` | Nhịp thở khi tải, opacity .55→1 | — |

### Chế độ tối

| Token app | Giá trị | Suy ra từ | Dùng ở đâu | Tương phản |
|---|---|---|---|---|
| `background` | `#201E1D` | `secondary` | Nền màn hình, nền sheet | — |
| `surface` | `#302D2C` | `lighten(secondary, 6)` | Ô nhập, nền cụm chồng giờ | — |
| `onBackground` / `onSurface` | `#F3F2F2` | `tertiary` | Tên công việc, tiêu đề | **14.86** ✅ |
| `textMuted` | `#978F8C` | `lighten(secondary, 45)` | Ghi chú, meta, nhãn phụ | **5.24** ✅ |
| `border` | `#403C3A` | `lighten(secondary, 12)` | Kẻ giữa các dòng | — |
| `lineStrong` | `#57514E` | `lighten(secondary, 20)` | Kẻ 2px giữa vùng lớn | — |
| `primary` | `#F05942` | `lighten(primary, 10)` — **SDK tự làm** | Nút chính, ô tick, dải cụm | **4.91** trên `background` ✅ |
| `accentFill` | `#F05942` | như trên | Nền nút chính | **4.91** với `onAccent` ✅ |
| `onAccent` | `#201E1D` | `secondary` | Chữ trên `accentFill` | **4.91** ✅ |
| `accentInk` | `#F48371` | `lighten(primary, 20)` | Chữ màu accent cỡ body/caption | **6.59** trên `background`, **4.91** trên `accentSoft` ✅ |
| `accentSoft` | `#4E2B25` | `mix(secondary, darkPrimary, 22%)` | Nền nhãn QUÁ HẠN, banner quyền | — |
| `scrim` | `#201E1D` @ 80% | `secondary` | Lớp phủ sau bottom sheet | — |
| `skeleton` | `#302D2C` ↔ `#403C3A` | `surface` ↔ `border` | Nhịp thở khi tải | — |

> **Hai ngoại lệ bắt buộc, không được rút gọn.**
> 1. `#EC3013` nguyên bản trên nền sáng chỉ đạt **3.76:1** — không đủ AA cho chữ. Chữ màu
>    accent cỡ body phải dùng `accentInk`, nền nút có nhãn phải dùng `accentFill`. `primary`
>    nguyên bản chỉ dùng cho ô tick đã tô đầy, dải dọc 3px và focus ring — những chỗ không
>    có chữ nằm trên.
> 2. `onPrimary` mà SDK tự sinh ra là **`#000000`** cho cả hai chế độ, vì
>    `isReadable('#FFFFFF', '#EC3013')` trả về false (4.20 < 4.5). Nút chính chữ đen trên nền
>    đỏ không phải ý đồ thiết kế — đó là lý do `accentFill` tồn tại. Nếu dùng thẳng
>    `color.primary` + `color.onPrimary` của SDK sẽ ra nút đỏ chữ đen.

## 4. Token không phải màu

### Thang chữ

Design dùng thang 7 bậc; SDK sinh 6 bậc với cỡ khác hẳn. **Phải override**, nếu không mọi
màn hình sẽ to hơn thiết kế 30–40%.

| Vai trò trong design | Cỡ | Đậm | Token SDK ánh xạ tới | Mặc định SDK |
|---|---|---|---|---|
| h1 — tiêu đề rỗng/lỗi | 24 | 800 | `typography.headline` | 32 / 600 |
| h2 — "Công việc mới" | 20 | 800 | `typography.title` | 22 / 600 |
| title — tiêu đề sheet | 17 | 800 | *(không có slot)* → dùng `title` + đè tại chỗ | — |
| body — tên công việc | 15 | 600 | `typography.body` | 16 / 400 |
| small — ghi chú, mô tả | 13 | 400 | `typography.label` | 14 / 500 |
| caption — nhãn trạng thái | 11 | 700 | `typography.caption` | 12 / 400 |
| giờ — cột thời gian | 13 | 800 | *(không có slot)* → `appType.clock` | — |

`typography.display` (57pt) không dùng trong app này.

Cột giờ **bắt buộc** `fontVariant: ['tabular-nums']` — nếu không, `09:00` và `11:30` lệch
chiều rộng và cả cột giờ nhảy khi cuộn.

**Cảnh báo về `fontScale`**: `buildTypography` nhân `fontScale` **một lần lúc cấu hình** rồi
chốt số. Nó không theo dõi cỡ chữ hệ thống lúc chạy. React Native tự nhân thêm cỡ chữ hệ
thống ở tầng `Text`, nên trần 170% của design phải thực thi bằng
`maxFontSizeMultiplier={1.7}` trên component `Text` dùng chung, không phải bằng `fontScale`.

### Khoảng cách

Thang 4pt. `SpacingTokens` của SDK là `xs 4 / sm 8 / md 16 / lg 24 / xl 32 / xxl 48` — thiếu
đúng bậc **12** mà design dùng nhiều (đệm trong dòng, khoảng giữa nhãn). Override `xxl`
thành 12? Không — `xxl` đang có nghĩa khác. Cách đúng: giữ nguyên thang SDK và bổ sung bậc
12 vào nhóm mở rộng ở mục 5, hoặc chấp nhận dùng `sm` + `xs` cộng lại. Khuyến nghị: bổ sung,
vì cộng token là mở đường cho số ma thuật quay lại.

### Bo góc

Design chốt **bán kính 0 trên toàn hệ thống**. SDK mặc định `sm 4 / md 8 / lg 16 / xl 24 /
full 9999`. Override cả năm về 0 (giữ `full` cho trường hợp cần hình tròn thật, nếu có).

### Đổ bóng

Design không dùng đổ bóng — phân tách bằng đường kẻ 2px. `shadow` của SDK để nguyên, không
dùng đến; nếu component nào cần nổi khối thì dùng viền, không dùng `shadow.md`.

## 5. Thiết lập — mã tham chiếu

`StyleTheme` không nhận khóa mới qua `overrides`, nên nhóm token mở rộng được ghép vào theme
**sau** khi `createUnistylesConfig` trả về, rồi khai báo lại kiểu cho Unistyles. Cách này giữ
đúng một nguồn sự thật: hex chỉ tồn tại trong `src/theme/`, component chỉ đọc token.

```ts
// src/theme/tokens.ts
import tinycolor from 'tinycolor2';
import { BRAND_COLORS } from './brand';

const { primary, secondary, tertiary } = BRAND_COLORS;
const darkPrimary = tinycolor(primary).lighten(10).toHexString(); // #f05942 — khớp SDK

export const APP_COLOR_LIGHT = {
  textMuted: tinycolor(secondary).lighten(30).toHexString(),   // #706966
  lineStrong: tinycolor(secondary).setAlpha(0.4).toRgbString(),
  accentFill: tinycolor(primary).darken(10).toHexString(),     // #bd260f
  accentInk: tinycolor(primary).darken(16).toHexString(),      // #a0210d
  accentSoft: tinycolor(primary).lighten(35).desaturate(15).toHexString(), // #f4c5be
  onAccent: tertiary,
  scrim: tinycolor(secondary).setAlpha(0.45).toRgbString(),
  skeletonFrom: tinycolor(tertiary).darken(4).toHexString(),
  skeletonTo: tertiary,
} as const;

export const APP_COLOR_DARK: typeof APP_COLOR_LIGHT = {
  textMuted: tinycolor(secondary).lighten(45).toHexString(),   // #978f8c
  lineStrong: tinycolor(secondary).lighten(20).toHexString(),  // #57514e
  accentFill: darkPrimary,
  accentInk: tinycolor(primary).lighten(20).toHexString(),     // #f48371
  accentSoft: tinycolor.mix(secondary, darkPrimary, 22).toHexString(), // #4e2b25
  onAccent: secondary,
  scrim: tinycolor(secondary).setAlpha(0.8).toRgbString(),
  skeletonFrom: tinycolor(secondary).lighten(6).toHexString(),
  skeletonTo: tinycolor(secondary).lighten(12).toHexString(),
};

export const APP_SPACING = { gap12: 12 } as const;

export const APP_TYPE = {
  sheetTitle: { fontSize: 17, fontWeight: '800', lineHeight: 22 },
  clock: { fontSize: 13, fontWeight: '800', lineHeight: 16, fontVariant: ['tabular-nums'] },
} as const;

export const TAP_TARGET_MIN = 44;
export const MAX_FONT_SCALE = 1.7;
```

```ts
// src/theme/setup.ts — import ĐẦU TIÊN trong index.js, trước mọi component
import { StyleSheet } from 'react-native-unistyles';
import { createUnistylesConfig } from '@chipmobilesdk/rn-theme';
import { BRAND_COLORS, BRAND_TYPOGRAPHY } from './brand';
import { APP_COLOR_LIGHT, APP_COLOR_DARK, APP_SPACING, APP_TYPE } from './tokens';

const ZERO_RADIUS = { sm: 0, md: 0, lg: 0, xl: 0, full: 9999 };

const TYPE_OVERRIDE = {
  headline: { fontSize: 24, fontWeight: '800' as const, lineHeight: 26 },
  title:    { fontSize: 20, fontWeight: '800' as const, lineHeight: 24 },
  body:     { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  label:    { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  caption:  { fontSize: 11, fontWeight: '700' as const, lineHeight: 14, letterSpacing: 0.4 },
};

const base = createUnistylesConfig(
  {
    brandColors: BRAND_COLORS,
    typographyConfig: BRAND_TYPOGRAPHY,
    overrides: {
      light: {
        color: {
          background: '#F3F2F2', surface: '#E9E7E7', surfaceVariant: '#E9E7E7',
          onBackground: '#201E1D', onSurface: '#201E1D', border: '#D6D2D2',
          error: APP_COLOR_LIGHT.accentInk,
        },
        radius: ZERO_RADIUS,
        typography: TYPE_OVERRIDE,
      },
      dark: {
        color: {
          background: '#201E1D', surface: '#302D2C', surfaceVariant: '#302D2C',
          onBackground: '#F3F2F2', onSurface: '#F3F2F2', border: '#403C3A',
          error: APP_COLOR_DARK.accentInk,
        },
        radius: ZERO_RADIUS,
        typography: TYPE_OVERRIDE,
      },
    },
  },
  { adaptiveThemes: true }, // theo cài đặt sáng/tối của hệ thống
);

const themes = {
  light: { ...base.themes.light, appColor: APP_COLOR_LIGHT, appSpacing: APP_SPACING, appType: APP_TYPE },
  dark:  { ...base.themes.dark,  appColor: APP_COLOR_DARK,  appSpacing: APP_SPACING, appType: APP_TYPE },
};

type AppThemes = typeof themes;
declare module 'react-native-unistyles' {
  export interface UnistylesThemes extends AppThemes {}
}

StyleSheet.configure({ ...base, themes });
```

> Thứ tự khởi tạo là chỗ hỏng âm thầm: nếu `setup.ts` được import **sau** component đầu tiên
> dùng style, app render **không có style và không báo lỗi**. Import nó ở dòng đầu của
> `index.js`, trước cả `App`.

> `adaptiveThemes: true` và `initialTheme` **không dùng chung được** — gói sẽ ném lỗi khi
> validate. Chọn đúng một. Design không nói tới nút đổi chủ đề trong app, nên `adaptiveThemes`
> là lựa chọn khớp nhất; xem [open-decisions.md](./open-decisions.md) D-04.

## 6. Việc phải làm trước khi code

| # | Việc | Lý do |
|---|---|---|
| 1 | Thêm `react-native-unistyles` vào `dependencies` của `package.json` | `package-lock.json` đánh dấu nó `"peer": true` — npm tự kéo về vì `@chipmobilesdk/rn-theme` khai `peerDependencies: { "react-native-unistyles": ">=3.2" }`. App **chưa khai báo** nó, dù đây là thứ app trực tiếp `import`. Cả `StyleSheet.configure` lẫn `declare module` ở mục 5 đều phụ thuộc vào nó. |
| 2 | Thêm `tinycolor2` + `@types/tinycolor2` vào `dependencies` nếu dùng mã ở mục 5 | Nó là dependency **của gói theme**, không phải của app. Dựa vào cây phụ thuộc phẳng là mượn ké, sẽ vỡ khi gói theme đổi phiên bản. Cách khác: viết cứng 9 hex đã tính sẵn ở bảng mục 3 vào `tokens.ts` và bỏ `tinycolor2` — vẫn đúng Constitution III vì hex chỉ nằm trong `src/theme/`. |
| 3 | *(ngoài phạm vi theme, nhưng chặn Phase 1)* `@chipmobilesdk/rn-local-db` cần 4 peer: `@op-engineering/op-sqlite` ✅ 17.1.3, `@dr.pogodin/react-native-fs` ✅ 2.39.2, `react-native-quick-crypto` ❌ **chưa cài**, `react` / `react-native` ✅ | Tầng lưu trữ không chạy được nếu thiếu. Cả ba gói đang có cũng ở trạng thái peer không khai báo, giống mục 1. |
| 4 | Chốt [open-decisions.md](./open-decisions.md) | Bốn trong sáu quyết định làm đổi luồng, không chỉ đổi hình. |

`strict` đã bật sẵn: `tsconfig.json` kế thừa `@react-native/typescript-config`, trong đó
`"strict": true`. Không cần làm gì thêm cho Constitution VIII ở mức cấu hình.
