import type {LocalDate} from '../../lib/date';

/**
 * Two screens is the whole stack. Everything else is a bottom sheet layered
 * over the timeline, which keeps navigation depth at three
 * (design/ia-screens-flows.md §1).
 */
export type RootStackParamList = {
  Timeline: {
    /** Set when opening from a reminder, so the app lands on the right day. */
    focusDate?: LocalDate;
    /** Identifier of the item to highlight, if any (FR-043). */
    focusTaskId?: string;
    focusRuleId?: string;
  };
  Settings: undefined;
};

export const ROUTES = {
  timeline: 'Timeline',
  settings: 'Settings',
} as const;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
