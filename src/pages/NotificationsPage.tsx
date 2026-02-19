import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bell,
  CheckCircle,
  XCircle,
  MessageSquare,
  Megaphone,
  Clock,
  RefreshCw,
  CheckCheck,
  ChevronRight,
  AlertCircle,
  CalendarCheck,
  Receipt,
  FileEdit,
} from 'lucide-react';
import { useNotifications, AppNotification, NotificationType } from '@/contexts/NotificationContext';

const typeConfig: Record<
  NotificationType,
  { label: string; icon: React.ReactNode; color: string; badgeClass: string }
> = {
  announcement: {
    label: 'Announcement',
    icon: <Megaphone className="h-4 w-4" />,
    color: 'text-primary',
    badgeClass: 'bg-primary/20 text-primary border-primary/30',
  },
  chat: {
    label: 'Chat',
    icon: <MessageSquare className="h-4 w-4" />,
    color: 'text-blue-400',
    badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  leave_approved: {
    label: 'Leave Approved',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-success',
    badgeClass: 'bg-success/20 text-success border-success/30',
  },
  leave_rejected: {
    label: 'Leave Rejected',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-destructive',
    badgeClass: 'bg-destructive/20 text-destructive border-destructive/30',
  },
  leave_pending: {
    label: 'Leave Pending',
    icon: <CalendarCheck className="h-4 w-4" />,
    color: 'text-warning',
    badgeClass: 'bg-warning/20 text-warning border-warning/30',
  },
  expense_approved: {
    label: 'Expense Approved',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-success',
    badgeClass: 'bg-success/20 text-success border-success/30',
  },
  expense_rejected: {
    label: 'Expense Rejected',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-destructive',
    badgeClass: 'bg-destructive/20 text-destructive border-destructive/30',
  },
  expense_pending: {
    label: 'Expense Pending',
    icon: <Receipt className="h-4 w-4" />,
    color: 'text-warning',
    badgeClass: 'bg-warning/20 text-warning border-warning/30',
  },
  attendance_edit_approved: {
    label: 'Attendance Edit Approved',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-success',
    badgeClass: 'bg-success/20 text-success border-success/30',
  },
  attendance_edit_rejected: {
    label: 'Attendance Edit Rejected',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-destructive',
    badgeClass: 'bg-destructive/20 text-destructive border-destructive/30',
  },
  attendance_edit_pending: {
    label: 'Attendance Edit Pending',
    icon: <FileEdit className="h-4 w-4" />,
    color: 'text-warning',
    badgeClass: 'bg-warning/20 text-warning border-warning/30',
  },
};

type FilterType = 'all' | 'unread' | NotificationType;

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllRead, refresh } =
    useNotifications();
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });

  const handleNotificationClick = (n: AppNotification) => {
    if (!n.read) markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: `Unread (${unreadCount})` },
    { key: 'announcement', label: 'Announcements' },
    { key: 'chat', label: 'Chat' },
    { key: 'leave_approved', label: 'Leave' },
    { key: 'expense_approved', label: 'Expenses' },
    { key: 'attendance_edit_approved', label: 'Attendance' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              Notifications
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" onClick={markAllRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{notifications.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{unreadCount}</p>
                <p className="text-xs text-muted-foreground">Unread</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {notifications.filter((n) => n.type.includes('approved')).length}
                </p>
                <p className="text-xs text-muted-foreground">Approvals</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {notifications.filter((n) => n.type.includes('rejected')).length}
                </p>
                <p className="text-xs text-muted-foreground">Rejections</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {filterButtons.map((btn) => (
            <Button
              key={btn.key}
              variant={filter === btn.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(btn.key)}
            >
              {btn.label}
            </Button>
          ))}
        </div>

        {/* Notifications List */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">
              {filter === 'all'
                ? 'All Notifications'
                : filter === 'unread'
                ? 'Unread Notifications'
                : typeConfig[filter as NotificationType]?.label || 'Notifications'}
              <span className="ml-2 text-sm text-muted-foreground font-normal">
                ({filtered.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-primary mr-3" />
                <p className="text-muted-foreground">Loading notifications...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Bell className="h-12 w-12 mb-4 opacity-30" />
                <p className="font-medium">No notifications</p>
                <p className="text-sm mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((n) => {
                  const cfg = typeConfig[n.type];
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`flex items-start gap-4 p-4 cursor-pointer transition-colors hover:bg-secondary/40 ${
                        !n.read ? 'bg-primary/5' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${
                          !n.read ? 'bg-primary/20' : 'bg-secondary'
                        }`}
                      >
                        <span className={cfg?.color || 'text-muted-foreground'}>
                          {cfg?.icon || <Bell className="h-4 w-4" />}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className={`text-sm font-semibold ${
                              !n.read ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {n.title}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${cfg?.badgeClass || ''}`}
                          >
                            {cfg?.label || n.type}
                          </Badge>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                          {n.message}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(n.time)}
                        </p>
                      </div>

                      {/* Arrow */}
                      {n.link && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

const formatTimeAgo = (isoString: string) => {
  const now = Date.now();
  const diff = now - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
};

export default NotificationsPage;
