import type { Interruption } from '../domain/monetization';

/**
 * "Is the user in the middle of something?" — the one question the consent form
 * and the full-screen ad must ask before appearing (specs/002-ads-and-remove-ads
 * FR-10, AC-6.2, AC-8.5).
 *
 * Reference-counted per reason, so several rows or sheets can each hold one
 * without clearing another's. The reasons are the domain's, which decides what
 * each one means for a waiting ad.
 */
export type InterruptionReason = Interruption;

export interface InterruptionTracker {
	/** Marks the reason active; the returned release is safe to call twice. */
	acquire(reason: InterruptionReason): () => void;
	active(): ReadonlySet<InterruptionReason>;
	subscribe(listener: () => void): () => void;
	/**
	 * Resolves once nothing is active. `cancel` stops waiting without resolving,
	 * so an unmounted caller leaves no listener behind (Principle VII).
	 */
	waitUntilIdle(): { promise: Promise<void>; cancel: () => void };
}

export function createInterruptionTracker(): InterruptionTracker {
	const counts = new Map<InterruptionReason, number>();
	const listeners = new Set<() => void>();
	let snapshot: ReadonlySet<InterruptionReason> = new Set();

	const publish = () => {
		snapshot = new Set([...counts].filter(([, n]) => n > 0).map(([r]) => r));
		listeners.forEach(listener => listener());
	};

	const tracker: InterruptionTracker = {
		acquire(reason) {
			counts.set(reason, (counts.get(reason) ?? 0) + 1);
			publish();
			let released = false;
			return () => {
				if (released) {
					return;
				}
				released = true;
				counts.set(reason, Math.max(0, (counts.get(reason) ?? 0) - 1));
				publish();
			};
		},
		active: () => snapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		waitUntilIdle() {
			let unsubscribe: (() => void) | null = null;
			const promise = new Promise<void>(resolve => {
				if (snapshot.size === 0) {
					resolve();
					return;
				}
				unsubscribe = tracker.subscribe(() => {
					if (snapshot.size === 0) {
						unsubscribe?.();
						resolve();
					}
				});
			});
			return { promise, cancel: () => unsubscribe?.() };
		},
	};
	return tracker;
}
