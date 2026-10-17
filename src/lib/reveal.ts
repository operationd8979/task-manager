/**
 * Where a scroll view has to be for one field inside it to be in sight.
 *
 * Pure geometry in the scroll content's own coordinates, so it can be tested
 * without a renderer and does not care WHAT covers the bottom of the viewport —
 * the keyboard, a button bar docked above it, or both. The caller measures;
 * this only decides.
 */
export interface RevealGeometry {
	/** The field's top edge, measured from the top of the scroll content. */
	fieldTop: number;
	fieldHeight: number;
	/** How far the content is scrolled right now. */
	offset: number;
	/** Height of the part of the viewport nothing covers. */
	visibleHeight: number;
	/** Room kept between the field and the edge it is brought up to. */
	margin: number;
}

/**
 * Layout and scroll positions are floats. A field half a point from where it
 * should be is in sight; scrolling for it would only twitch the screen.
 */
const TOLERANCE = 1;

/**
 * The offset to scroll to, or null when the field is already in sight.
 *
 * When the bottom is hidden the bottom wins, even for a field taller than the
 * gap: that is where the caret is while someone is typing, and the reason this
 * exists is that people could not see what they were writing.
 */
export function revealOffset({
	fieldTop,
	fieldHeight,
	offset,
	visibleHeight,
	margin,
}: RevealGeometry): number | null {
	if (visibleHeight <= 0) {
		return null;
	}
	const neededForBottom = fieldTop + fieldHeight + margin - visibleHeight;
	if (neededForBottom - offset > TOLERANCE) {
		return neededForBottom;
	}
	const neededForTop = Math.max(0, fieldTop - margin);
	if (offset - neededForTop > TOLERANCE) {
		return neededForTop;
	}
	return null;
}
