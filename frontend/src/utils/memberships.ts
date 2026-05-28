export type MembershipRow = {
  role?: 'admin' | 'owner' | 'member' | null;
  status?: 'active' | 'pending' | 'rejected' | 'blocked' | null;
  created_at?: string | null;
};

export type NormalizedMembership = {
  status: 'active' | 'pending' | 'rejected' | 'blocked' | 'unknown';
  role: 'admin' | 'owner' | 'member' | 'none';
  isAdmin: boolean;
  joinedAt: string | null;
};

export function normalizeMembership(row: MembershipRow | null | undefined): NormalizedMembership | null {
  if (!row) return null;
  const status = (row.status as any) || 'active';
  const role = (row.role as any) || 'member';
  const isAdmin = role === 'admin' || role === 'owner';
  return {
    status: ['active', 'pending', 'rejected', 'blocked'].includes(status) ? status : 'unknown',
    role: ['admin', 'owner', 'member'].includes(role) ? role : 'none',
    isAdmin,
    joinedAt: row.created_at || null,
  };
}
