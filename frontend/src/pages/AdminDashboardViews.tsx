import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { formatDate, formatCurrency } from '../lib/utils';
import {
  Search, Star, Ban, CheckCircle,
  RefreshCw, Activity, DollarSign, Calendar, Users,
  TrendingUp, FileText
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import toast from 'react-hot-toast';

// ─── 1. USER MANAGEMENT TAB ──────────────────────────────────────
export const AdminUsersTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter, page],
    queryFn: async () => {
      const { data } = await api.get('/admin/users', {
        params: { page, limit: 10, search: search || undefined, role: roleFilter || undefined }
      });
      return data;
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/admin/users/${id}/toggle-status`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { data } = await api.patch(`/admin/users/${id}/role`, { role });
      return data;
    },
    onSuccess: () => {
      toast.success('User role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    }
  });

  const users = data?.data || [];
  const meta = data?.meta || { totalPages: 1 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">User Management</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Manage platform credentials, suspend/reactivate users, and configure access permissions.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm outline-none bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-xl text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">All Roles</option>
          <option value="ATTENDEE">Attendee</option>
          <option value="ORGANIZER">Organizer</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-400 uppercase bg-gray-50/50 dark:bg-transparent">
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Stats</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-4 text-right"><Skeleton className="h-8 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">No users found.</td>
                </tr>
              ) : (
                users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-gray-950 dark:text-white">{u.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <select
                        value={u.role}
                        onChange={(e) => updateRoleMutation.mutate({ id: u.id, role: e.target.value })}
                        className="px-2 py-1 border rounded-lg text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="ATTENDEE">ATTENDEE</option>
                        <option value="ORGANIZER">ORGANIZER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <Badge variant={u.isActive ? 'success' : 'danger'} className="text-[10px]">
                        {u.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </td>
                    <td className="p-4 text-xs text-gray-500 dark:text-gray-400">
                      {u._count.organizedEvents} events · {u._count.bookings} bookings
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        variant={u.isActive ? 'danger' : 'primary'}
                        onClick={() => toggleStatusMutation.mutate(u.id)}
                        isLoading={toggleStatusMutation.isPending}
                      >
                        {u.isActive ? <Ban className="w-3.5 h-3.5 mr-1" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                        {u.isActive ? 'Suspend' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-gray-100 dark:border-gray-800">
            <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-xs text-gray-400">Page {page} of {meta.totalPages}</span>
            <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── 2. EVENT MANAGEMENT TAB ─────────────────────────────────────
export const AdminEventsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-events', search, statusFilter, page],
    queryFn: async () => {
      const { data } = await api.get('/admin/events', {
        params: { page, limit: 10, search: search || undefined, status: statusFilter || undefined }
      });
      return data;
    }
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/admin/events/${id}/toggle-featured`);
      return data;
    },
    onSuccess: () => {
      toast.success('Featured status toggled');
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
    }
  });

  const toggleTrendingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/admin/events/${id}/toggle-trending`);
      return data;
    },
    onSuccess: () => {
      toast.success('Trending status toggled');
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/admin/events/${id}/status`, { status });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Event status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/events/${id}`);
    },
    onSuccess: () => {
      toast.success('Event deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
    }
  });

  const events = data?.data || [];
  const meta = data?.meta || { totalPages: 1 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">Event Management</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Review platforms listings, control feature tags, or cancel/cancel inappropriate events.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by event title or venue..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm outline-none bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-xl text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-400 uppercase bg-gray-50/50 dark:bg-transparent">
                <th className="p-4">Event Details</th>
                <th className="p-4">Organizer</th>
                <th className="p-4">Status</th>
                <th className="p-4">Features</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="p-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-28" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-4 text-right"><Skeleton className="h-8 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">No events found.</td>
                </tr>
              ) : (
                events.map((e: any) => (
                  <tr key={e.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-gray-950 dark:text-white line-clamp-1">{e.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{formatDate(e.startDate)} · {e.venue}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-850 dark:text-gray-300">{e.organizer.name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[150px]">{e.organizer.email}</div>
                    </td>
                    <td className="p-4">
                      <select
                        value={e.status}
                        onChange={(opt) => updateStatusMutation.mutate({ id: e.id, status: opt.target.value })}
                        className="px-2 py-1 border rounded-lg text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-medium"
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="PUBLISHED">PUBLISHED</option>
                        <option value="CANCELLED">CANCELLED</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </td>
                    <td className="p-4 space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => toggleFeaturedMutation.mutate(e.id)}
                        className={`p-1 rounded-lg border transition-colors ${e.isFeatured ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-transparent border-gray-200 dark:border-gray-800 text-gray-400'}`}
                        title="Toggle Featured"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleTrendingMutation.mutate(e.id)}
                        className={`p-1 rounded-lg border transition-colors ${e.isTrending ? 'bg-violet-500/10 border-violet-500/30 text-violet-500' : 'bg-transparent border-gray-200 dark:border-gray-800 text-gray-400'}`}
                        title="Toggle Trending"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => { if (confirm('Are you sure you want to delete this event permanently?')) deleteMutation.mutate(e.id); }}
                        isLoading={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-gray-100 dark:border-gray-800">
            <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-xs text-gray-400">Page {page} of {meta.totalPages}</span>
            <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── 3. PAYMENTS & REFUNDS TAB ───────────────────────────────────
export const AdminPaymentsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', search, page],
    queryFn: async () => {
      const { data } = await api.get('/admin/payments', {
        params: { page, limit: 10, search: search || undefined }
      });
      return data;
    }
  });

  const refundMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data } = await api.post(`/admin/payments/${bookingId}/refund`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Refund successfully processed');
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to refund transaction');
    }
  });

  const bookings = data?.data || [];
  const meta = data?.meta || { totalPages: 1 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">Transaction Logs & Refunds</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Audit platform billing records, trace transaction IDs, and execute ticket cancellations/refund rollbacks.</p>
      </div>

      {/* Search filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by transaction reference code, payment ID, or buyer name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm outline-none bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-400 uppercase bg-gray-50/50 dark:bg-transparent">
                <th className="p-4">Reference</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Event</th>
                <th className="p-4">Total Paid</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-28" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-4 text-right"><Skeleton className="h-8 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">No transactions recorded.</td>
                </tr>
              ) : (
                bookings.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                    <td className="p-4 font-mono text-xs">
                      <div className="text-gray-950 dark:text-white font-bold">{b.bookingReference}</div>
                      <div className="text-gray-400 mt-0.5">PayID: {b.paymentId || 'Sandbox Mock'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-900 dark:text-gray-200">{b.user.name}</div>
                      <div className="text-xs text-gray-400 truncate max-w-[150px]">{b.user.email}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-800 dark:text-gray-300 line-clamp-1">{b.event.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{b.ticketCount} ticket{b.ticketCount > 1 ? 's' : ''} · {b.ticketTier.name}</div>
                    </td>
                    <td className="p-4 font-bold text-gray-900 dark:text-white">
                      {formatCurrency(b.totalAmount)}
                    </td>
                    <td className="p-4">
                      <Badge variant={b.status === 'CONFIRMED' ? 'success' : b.status === 'REFUNDED' ? 'warning' : 'default'} className="text-[10px]">
                        {b.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      {b.status === 'CONFIRMED' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => { if (confirm(`Initiate full refund of ${formatCurrency(b.totalAmount)} for ${b.user.name}?`)) refundMutation.mutate(b.id); }}
                          isLoading={refundMutation.isPending && refundMutation.variables === b.id}
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1" />
                          Refund
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-gray-100 dark:border-gray-800">
            <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-xs text-gray-400">Page {page} of {meta.totalPages}</span>
            <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── 4. AUDIT LOGS TAB ───────────────────────────────────────────
export const AdminLogsTab: React.FC = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs', page],
    queryFn: async () => {
      const { data } = await api.get('/admin/audit-logs', { params: { page, limit: 12 } });
      return data;
    }
  });

  const logs = data?.data || [];
  const meta = data?.meta || { totalPages: 1 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">Security Audit Trails</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Chronological record of platform modifications, administrative permissions changes, suspensions, and billing actions.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-400 uppercase bg-gray-50/50 dark:bg-transparent">
                <th className="p-4">Action</th>
                <th className="p-4">Context Details</th>
                <th className="p-4">Performed By</th>
                <th className="p-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="p-4"><Skeleton className="h-4 w-28" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-48" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">No logs found. Perform some admin actions to populate.</td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-brand-500" />
                        <span className="font-mono text-xs font-bold uppercase text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          {log.action}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">
                      {log.details}
                      <span className="text-[10px] text-gray-400 block mt-0.5 font-mono">Target: {log.target}</span>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-900 dark:text-gray-200">{log.performedBy}</div>
                      <div className="text-[10px] text-gray-400 font-mono">IP: {log.ipAddress || '127.0.0.1'}</div>
                    </td>
                    <td className="p-4 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(log.createdAt)} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-gray-100 dark:border-gray-800">
            <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-xs text-gray-400">Page {page} of {meta.totalPages}</span>
            <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── 5. ANALYTICS & REPORTS TAB ──────────────────────────────────
export const AdminAnalyticsTab: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const { data } = await api.get('/admin/analytics');
      return data.data;
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  const summary = data?.summary || { totalRevenue: 0, totalUsers: 0, totalEvents: 0, totalBookings: 0 };
  const userGrowth = data?.userGrowthTimeline || [];
  const sales = data?.salesTimeline || [];
  const categories = data?.categorySplit || [];

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">Platform Health Analytics</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Global aggregation maps representing active user registrations, billing timelines, and categories allocations.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Card */}
        <div className="card p-5 relative overflow-hidden bg-gradient-to-br from-brand-500/10 via-transparent to-transparent border-brand-500/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Gross Platform Revenue</p>
              <h3 className="text-2xl font-display font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(summary.totalRevenue)}</h3>
            </div>
            <div className="p-3 bg-brand-500/10 rounded-xl text-brand-500">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Users Card */}
        <div className="card p-5 relative overflow-hidden bg-gradient-to-br from-violet-500/10 via-transparent to-transparent border-violet-500/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Platform Users</p>
              <h3 className="text-2xl font-display font-bold text-gray-900 dark:text-white mt-1">{summary.totalUsers}</h3>
            </div>
            <div className="p-3 bg-violet-500/10 rounded-xl text-violet-500">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Events Card */}
        <div className="card p-5 relative overflow-hidden bg-gradient-to-br from-pink-500/10 via-transparent to-transparent border-pink-500/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Listed Experiences</p>
              <h3 className="text-2xl font-display font-bold text-gray-900 dark:text-white mt-1">{summary.totalEvents}</h3>
            </div>
            <div className="p-3 bg-pink-500/10 rounded-xl text-pink-500">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Bookings Card */}
        <div className="card p-5 relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-transparent to-transparent border-amber-500/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Gross Reservations</p>
              <h3 className="text-2xl font-display font-bold text-gray-900 dark:text-white mt-1">{summary.totalBookings}</h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Timeline */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Gross Transactions Billing History</h3>
          <div className="h-72">
            {sales.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">Waiting for sales trends...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sales}>
                  <defs>
                    <linearGradient id="salesColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e1e24" className="hidden dark:block" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                  <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#salesColor)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* User Growth */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Active User Registrations Growth</h3>
          <div className="h-72">
            {userGrowth.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">Waiting for user growth...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e1e24" className="hidden dark:block" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="registrations" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Split */}
        <div className="card p-5 col-span-1 lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Listed Experiences Category Split</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="h-60">
              {categories.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs">No categorised events...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categories.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Categories Map</h4>
              <div className="grid grid-cols-2 gap-3">
                {categories.map((entry: any, index: number) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{entry.name}</span>
                    <span className="text-gray-400 ml-auto font-bold">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
