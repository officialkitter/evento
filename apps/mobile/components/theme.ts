export const colors = {
  brown: '#2D1A12',
  brownSoft: '#4A2E22',
  gold: '#D4AF37',
  goldSoft: '#F1E3B0',
  canvas: '#FAF8F5',
  white: '#FFFFFF',
  ink: '#2D1A12',
  muted: '#8D6E63',
  line: '#E8DFD5',
} as const;

export const statusColors: Record<string, string> = {
  draft: '#757575',
  pending: '#FFB300',
  confirmed: '#2E7D32',
  paid: '#2E7D32',
  partial: '#F57C00',
  failed: '#D32F2F',
  expired: '#8D6E63',
  live: '#008080',
  checked_in: '#008080',
};

export function statusColor(status?: string): string {
  return statusColors[status ?? 'draft'] ?? statusColors.draft;
}

export const radius = 16;
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
