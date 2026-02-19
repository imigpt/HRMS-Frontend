import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  announcementAPI,
  leaveAPI,
  expenseAPI,
  attendanceAPI,
  chatAPI,
  hrAPI,
} from '@/lib/apiClient';

// ─── safe array extractor ─────────────────────────────────────────────────────
// Handles { data: { data: [] } }, { data: { items: [] } }, { data: { leaves: [] } } etc.
const safeArray = (res: any, ...keys: string[]): any[] => {
  if (!res?.data) return [];
  for (const key of keys) {
    if (Array.isArray(res.data[key])) return res.data[key];
  }
  if (Array.isArray(res.data)) return res.data;
  return [];
};

export type NotificationType =
  | 'announcement'
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_pending'
  | 'expense_approved'
  | 'expense_rejected'
  | 'expense_pending'
  | 'attendance_edit_approved'
  | 'attendance_edit_rejected'
  | 'attendance_edit_pending'
  | 'chat';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string; // ISO string
  read: boolean;
  link?: string;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  markAsRead: () => {},
  markAllRead: () => {},
  refresh: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

// ─── localStorage helpers ──────────────────────────────────────────────────────
const getStorageKey = (uid: string) => `hrms_read_notifications_${uid}`;

const getReadIds = (uid: string): Set<string> => {
  try {
    const raw = localStorage.getItem(getStorageKey(uid));
    return raw ? new Set(JSON.parse(raw)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
};

const saveReadIds = (uid: string, ids: Set<string>) => {
  try {
    localStorage.setItem(getStorageKey(uid), JSON.stringify([...ids]));
  } catch {}
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { userRole, user } = useAuth();
  const userId = user?._id ?? '';

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const buildNotifications = useCallback(async () => {
    if (!userId || !userRole) return;

    setLoading(true);
    const readIds = getReadIds(userId);
    const result: AppNotification[] = [];
    const isRead = (id: string) => readIds.has(id);

    const leaveLink = userRole === 'hr' ? '/hr/leaves' : userRole === 'admin' ? '/admin/leaves' : '/employee/leave';
    const expLink   = userRole === 'hr' ? '/hr/expenses' : userRole === 'admin' ? '/admin/expenses' : '/employee/expenses';
    const attLink   = userRole === 'hr' ? '/hr/attendance-requests' : '/employee/attendance';

    // ── 1. Announcements (all roles) ─────────────────────────────────────────
    try {
      const res = await announcementAPI.getAnnouncements({ limit: 10 });
      const announcements: any[] = safeArray(res, 'data', 'announcements');
      const annLink =
        userRole === 'admin'  ? '/admin/announcements' :
        userRole === 'hr'     ? '/hr/announcements' :
        userRole === 'client' ? '/client/chat' :
        '/employee/announcements';

      announcements.slice(0, 5).forEach((a: any) => {
        const id = `ann_${a._id}`;
        result.push({
          id,
          type: 'announcement',
          title: 'New Announcement',
          message: a.title || 'Company announcement',
          time: a.createdAt || new Date().toISOString(),
          read: isRead(id),
          link: annLink,
        });
      });
    } catch { /* silent */ }

    // ── 2. Chat unread count (all roles) ─────────────────────────────────────
    try {
      // Prefer lightweight unread-count endpoint
      let count = 0;
      try {
        const res = await chatAPI.getUnreadCount();
        count = res?.data?.unreadCount ?? res?.data?.count ?? res?.data?.total ?? 0;
      } catch {
        count = 0;
      }

      // Fallback: fetch rooms and compute unread from room objects if count is zero
      if (!count) {
        try {
          const roomsRes = await chatAPI.getRooms().catch(() => null);
          const rooms: any[] = safeArray(roomsRes, 'data', 'rooms');
          count = rooms.reduce((acc: number, r: any) => acc + (r.unreadCount || 0), 0);
        } catch {
          count = 0;
        }
      }

      if (count > 0) {
        const id = 'chat_unread_bulk';
        const chatLink =
          userRole === 'admin'  ? '/admin/chat' :
          userRole === 'hr'     ? '/hr/chat' :
          userRole === 'client' ? '/client/chat' :
          '/employee/chat';
        result.push({
          id,
          type: 'chat',
          title: 'Unread Messages',
          message: `You have ${count} unread message${count > 1 ? 's' : ''}`,
          time: new Date().toISOString(),
          read: isRead(id),
          link: chatLink,
        });
      }
    } catch (err) {
      // keep silent but log during development if needed
      // console.debug('NotificationContext chat unread error', err);
    }

    // ── 3. Leave decisions (employee & HR) ───────────────────────────────────
    if (userRole === 'employee' || userRole === 'hr') {
      try {
        const res = await leaveAPI.getLeaves({ limit: 20 });
        const leaves: any[] = safeArray(res, 'data', 'leaves');
        leaves
          .filter((l: any) => l.status === 'approved' || l.status === 'rejected')
          .slice(0, 5)
          .forEach((l: any) => {
            const id = `leave_${l._id}_${l.status}`;
            result.push({
              id,
              type: l.status === 'approved' ? 'leave_approved' : 'leave_rejected',
              title: l.status === 'approved' ? '✅ Leave Approved' : '❌ Leave Rejected',
              message: `Your ${l.leaveType || 'leave'} request (${
                l.startDate ? new Date(l.startDate).toLocaleDateString() : '—'
              }) was ${l.status}`,
              time: l.updatedAt || l.createdAt || new Date().toISOString(),
              read: isRead(id),
              link: leaveLink,
            });
          });
      } catch { /* silent */ }

      // ── 4. Expense decisions ─────────────────────────────────────────────
      try {
        const res = await expenseAPI.getExpenses({ limit: 20 });
        const expenses: any[] = safeArray(res, 'data', 'expenses');
        expenses
          .filter((e: any) => e.status === 'approved' || e.status === 'rejected')
          .slice(0, 5)
          .forEach((e: any) => {
            const id = `exp_${e._id}_${e.status}`;
            result.push({
              id,
              type: e.status === 'approved' ? 'expense_approved' : 'expense_rejected',
              title: e.status === 'approved' ? '✅ Expense Approved' : '❌ Expense Rejected',
              message: `Your expense "${e.title || e.description || 'request'}" was ${e.status}`,
              time: e.updatedAt || e.createdAt || new Date().toISOString(),
              read: isRead(id),
              link: expLink,
            });
          });
      } catch { /* silent */ }

      // ── 5. Attendance edit outcomes ──────────────────────────────────────
      try {
        const res = await attendanceAPI.getMyEditRequests();
        const edits: any[] = safeArray(res, 'data', 'requests', 'editRequests');
        edits
          .filter((r: any) => r.status === 'approved' || r.status === 'rejected')
          .slice(0, 5)
          .forEach((r: any) => {
            const id = `attedit_${r._id}_${r.status}`;
            result.push({
              id,
              type: r.status === 'approved' ? 'attendance_edit_approved' : 'attendance_edit_rejected',
              title: r.status === 'approved' ? '✅ Attendance Edit Approved' : '❌ Attendance Edit Rejected',
              message: `Your attendance correction was ${r.status}`,
              time: r.reviewedAt || r.updatedAt || r.createdAt || new Date().toISOString(),
              read: isRead(id),
              link: attLink,
            });
          });
      } catch { /* silent */ }
    }

    // ── 6. HR/Admin: pending items awaiting action ───────────────────────────
    if (userRole === 'hr' || userRole === 'admin') {
      try {
        const res = await hrAPI.getPendingLeaves({ limit: 10 });
        const pendingLeaves: any[] = safeArray(res, 'data', 'leaves');
        pendingLeaves.slice(0, 3).forEach((l: any) => {
          const id = `pending_leave_${l._id}`;
          result.push({
            id,
            type: 'leave_pending',
            title: '📋 Leave Request Pending',
            message: `${l.user?.name || 'An employee'} requested ${l.leaveType || 'leave'} — awaiting review`,
            time: l.createdAt || new Date().toISOString(),
            read: isRead(id),
            link: leaveLink,
          });
        });
      } catch { /* silent */ }

      try {
        const res = await attendanceAPI.getPendingEditRequests();
        const pendingEdits: any[] = safeArray(res, 'data', 'requests', 'editRequests');
        pendingEdits.slice(0, 3).forEach((r: any) => {
          const id = `pending_edit_${r._id}`;
          result.push({
            id,
            type: 'attendance_edit_pending',
            title: '📋 Attendance Edit Request',
            message: `${r.user?.name || 'An employee'} requested attendance correction`,
            time: r.createdAt || new Date().toISOString(),
            read: isRead(id),
            link: attLink,
          });
        });
      } catch { /* silent */ }
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    setNotifications(result);
    setLoading(false);
  }, [userId, userRole]); // ← stable deps: no full user object

  useEffect(() => {
    if (!userId || !userRole) return;
    buildNotifications();
    const interval = setInterval(buildNotifications, 60_000);
    return () => clearInterval(interval);
  }, [buildNotifications, userId, userRole]);

  const markAsRead = useCallback(
    (id: string) => {
      if (!userId) return;
      const readIds = getReadIds(userId);
      readIds.add(id);
      saveReadIds(userId, readIds);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    },
    [userId]
  );

  const markAllRead = useCallback(() => {
    if (!userId) return;
    const readIds = getReadIds(userId);
    notifications.forEach((n) => readIds.add(n.id));
    saveReadIds(userId, readIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [userId, notifications]);

  const refresh = useCallback(() => {
    buildNotifications();
  }, [buildNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, markAsRead, markAllRead, refresh }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
