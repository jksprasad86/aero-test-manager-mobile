// ─────────────────────────────────────────────────────────────────────────────
// API Configuration
// ─────────────────────────────────────────────────────────────────────────────
export const API_BASE_URL = 'https://qa.aerosimple.app/api';

export const COLORS = {
  primary:    '#1414B4',
  primaryDark:'#0D0D7A',
  accent:     '#DC2626',
  success:    '#16A34A',
  warning:    '#D97706',
  info:       '#0284C7',
  background: '#F3F4F6',
  surface:    '#FFFFFF',
  text:       '#1F2937',
  textMuted:  '#6B7280',
  border:     '#E5E7EB',
  error:      '#EF4444',
  headerBg:   '#1414B4',
  headerText: '#FFFFFF',
};

export const ITEM_TYPES = [
  { value: 'TICKETS_VERIFIED',  label: 'Tickets Verified'    },
  { value: 'ATTENDED_MEETINGS', label: 'Attended Meetings'   },
  { value: 'TEST_CASES',        label: 'Test Cases'          },
  { value: 'SPENT_ON_KT',       label: 'KT (Knowledge Transfer)' },
];

export const ITEM_TYPE_COLORS = {
  TICKETS_VERIFIED:  { bg: '#EDE9FE', text: '#5B21B6' },
  ATTENDED_MEETINGS: { bg: '#FEF3C7', text: '#92400E' },
  TEST_CASES:        { bg: '#D1FAE5', text: '#065F46' },
  SPENT_ON_KT:       { bg: '#FEE2E2', text: '#991B1B' },
};
