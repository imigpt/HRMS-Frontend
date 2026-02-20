import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { notificationAPI } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Bell,
  CalendarDays,
  Clock,
  ClipboardList,
  Receipt,
  Megaphone,
  MessageSquare,
  CheckCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Inbox,
} from 'lucide-react';

interface Notification {
  _id: string;
  title?: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedId?: string;
  relatedEntityType?: string;
  sender?: { name: string; _id: string } | null;
  createdAt: string;
}

const NOTIFICATION_TYPES = [
  { value: '', label: 'All', icon: Bell },
  { value: 'leave', label: 'Leave', icon: CalendarDays },
  { value: 'attendance', label: 'Attendance', icon: Clock },
  { value: 'task', label: 'Tasks', icon: ClipboardList },
  { value: 'expense', label: 'Expense', icon: Receipt },
  { value: 'announcement', label: 'Announcements', icon: Megaphone },
  { value: 'chat', label: 'Chat', icon: MessageSquare },
  { value: 'system', label: 'System', icon: Bell },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'leave': return <CalendarDays className="h-5 w-5 text-blue-500" />;
    case 'attendance': return <Clock className="h-5 w-5 text-green-500" />;
    case 'task': return <ClipboardList className="h-5 w-5 text-purple-500" />;
    case 'expense': return <Receipt className="h-5 w-5 text-orange-500" />;
    case 'announcement': return <Megaphone className="h-5 w-5 text-pink-500" />;
    case 'chat': return <MessageSquare className="h-5 w-5 text-teal-500" />;
    default: return <Bell className="h-5 w-5 text-primary" />;
  }
};

const getTypeBgColor = (type: string) => {
  switch (type) {
    case 'leave': return 'bg-blue-500/10';
    case 'attendance': return 'bg-green-500/10';
    case 'task': return 'bg-purple-500/10';
    case 'expense': return 'bg-orange-500/10';
    case 'announcement': return 'bg-pink-500/10';
    case 'chat': return 'bg-teal-500/10';
    default: return 'bg-primary/10';
  }
};

const timeAgo = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

interface NotificationsPageProps {
  role: 'admin' | 'hr' | 'employee' | 'client';
}

const NotificationsPage = ({ role }: NotificationsPageProps) => {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const effectiveRole = role || userRole;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all');

  const isClient = effectiveRole === 'client';

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (typeFilter) params.type = typeFilter;
      if (readFilter === 'unread') params.isRead = 'false';
      const response = await notificationAPI.getNotifications(params);
      if (response.data) {
        setNotifications(response.data.data || []);
        setUnreadCount(response.data.unreadCount || 0);
        setTotal(response.data.total || 0);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, readFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      fetchNotifications();
      toast({ title: 'All notifications marked as read' });
    } catch {
      toast({ title: 'Failed to mark all as read', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationAPI.deleteNotification(id);
      fetchNotifications();
    } catch {
      toast({ title: 'Failed to delete notification', variant: 'destructive' });
    }
  };

  const handleNotifClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await notificationAPI.markAsRead(notif._id);
    }
    const base = `/${effectiveRole}`;
    let path = base;
    switch (notif.type) {
      case 'leave': path = `${base}/leaves`; break;
      case 'attendance': path = `${base}/attendance`; break;
      case 'task': path = `${base}/tasks`; break;
      case 'expense': path = `${base}/expenses`; break;
      case 'announcement': path = `${base}/announcements`; break;
      case 'chat': path = `${base}/chat`; break;
      default: break;
    }
    navigate(path);
  };

  const availableTypes = isClient
    ? NOTIFICATION_TYPES.filter(t => t.value === '' || t.value === 'chat')
    : NOTIFICATION_TYPES;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              Notifications
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              Mark All Read
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              {/* Read/Unread Filter */}
              <div className="flex gap-2">
                <Button
                  variant={readFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setReadFilter('all'); setPage(1); }}
                >
                  All
                </Button>
                <Button
                  variant={readFilter === 'unread' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setReadFilter('unread'); setPage(1); }}
                  className="gap-1"
                >
                  Unread
                  {unreadCount > 0 && (
                    <span className="ml-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              </div>
              {/* Type Filter */}
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-1">
                  {availableTypes.map((t) => {
                    const Icon = t.icon;
                    return (
                      <Button
                        key={t.value}
                        variant={typeFilter === t.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setTypeFilter(t.value); setPage(1); }}
                        className="gap-1.5 whitespace-nowrap"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {t.label}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Notification List */}
        <Card className="glass-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">
                  {readFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={cn(
                      'flex items-start gap-4 p-4 transition-colors cursor-pointer group',
                      notif.isRead
                        ? 'hover:bg-secondary/50'
                        : 'bg-primary/5 hover:bg-primary/10'
                    )}
                    onClick={() => handleNotifClick(notif)}
                  >
                    {/* Type Icon */}
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                      getTypeBgColor(notif.type)
                    )}>
                      {getTypeIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={cn(
                            'text-sm leading-snug',
                            !notif.isRead ? 'font-semibold text-foreground' : 'text-foreground'
                          )}>
                            {notif.title || notif.message}
                          </p>
                          {notif.title && notif.message && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            {notif.sender && typeof notif.sender === 'object' && (
                              <span className="text-xs text-muted-foreground">
                                {notif.sender.name}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground/70">
                              {timeAgo(notif.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notif.isRead && (
                            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDelete(notif._id, e)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;