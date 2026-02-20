import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { notificationAPI } from '@/lib/apiClient';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCircle,
  CalendarDays,
  CalendarCheck,
  ClipboardList,
  Receipt,
  MessageSquare,
  Megaphone,
  Settings,
  LogOut,
  Clock,
  Calendar,
  FileText,
  FileEdit,
  LucideIcon,
  Menu,
  X,
  User,
  Bell,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import aseleaLogo from '@/assets/aselea-logo.png';

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

const adminNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { title: 'HR Accounts', href: '/admin/hr-accounts', icon: Users },
  { title: 'Employees', href: '/admin/employees', icon: UserCircle },
  { title: 'Clients', href: '/admin/clients', icon: UserCheck },
  { title: 'Attendance', href: '/admin/attendance', icon: Clock },
  { title: 'Edit Requests', href: '/admin/attendance-requests', icon: FileEdit },
  { title: 'Leaves', href: '/admin/leaves', icon: CalendarCheck },
  { title: 'Leave Management', href: '/admin/leave-management', icon: CalendarDays },
  { title: 'Tasks', href: '/admin/tasks', icon: ClipboardList },
  { title: 'Expenses', href: '/admin/expenses', icon: Receipt },
  { title: 'Chat', href: '/admin/chat', icon: MessageSquare },
  { title: 'Announcements', href: '/admin/announcements', icon: Megaphone },
  { title: 'System Overview', href: '/admin/system', icon: Settings },
];

const hrNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/hr', icon: LayoutDashboard },
  { title: 'My Profile', href: '/hr/profile', icon: User },
  { title: 'Employees', href: '/hr/employees', icon: UserCircle },
  { title: 'Clients', href: '/hr/clients', icon: UserCheck },
  { title: 'My Attendance', href: '/hr/my-attendance', icon: Clock },
  { title: 'Attendance', href: '/hr/attendance', icon: Clock },
  { title: 'Edit Requests', href: '/hr/attendance-requests', icon: FileEdit },
  { title: 'Leave Requests', href: '/hr/leaves', icon: CalendarCheck },
  { title: 'Tasks', href: '/hr/tasks', icon: ClipboardList },
  { title: 'Expenses', href: '/hr/expenses', icon: Receipt },
  { title: 'Chat', href: '/hr/chat', icon: MessageSquare },
  { title: 'Announcements', href: '/hr/announcements', icon: Megaphone },
  { title: 'Holidays', href: '/hr/holidays', icon: CalendarDays },
];

const employeeNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/employee', icon: LayoutDashboard },
  { title: 'My Profile', href: '/employee/profile', icon: UserCircle },
  { title: 'Attendance', href: '/employee/attendance', icon: Clock },
  { title: 'Leave', href: '/employee/leave', icon: CalendarCheck },
  { title: 'Tasks', href: '/employee/tasks', icon: ClipboardList },
  { title: 'Expenses', href: '/employee/expenses', icon: Receipt },
  { title: 'Chat', href: '/employee/chat', icon: MessageSquare },
  { title: 'Announcements', href: '/employee/announcements', icon: Megaphone },
];

const clientNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/client', icon: LayoutDashboard },
  { title: 'Chat', href: '/client/chat', icon: MessageSquare },
];

const getNavItems = (role: UserRole): NavItem[] => {
  switch (role) {
    case 'admin':
      return adminNavItems;
    case 'hr':
      return hrNavItems;
    case 'employee':
      return employeeNavItems;
    case 'client':
      return clientNavItems;
    default:
      return [];
  }
};

const getRoleLabel = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'hr':
      return 'HR Manager';
    case 'employee':
      return 'Employee';
    case 'client':
      return 'Client';
    default:
      return '';
  }
};

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole, userName, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifBellOpen, setNotifBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = getNavItems(userRole);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await notificationAPI.getNotifications({ limit: 10 });
      if (response.data?.data) {
        setNotifications(response.data.data);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNotifTypeIcon = (type: string) => {
    switch (type) {
      case 'leave': return <CalendarDays className="h-4 w-4 text-blue-500" />;
      case 'attendance': return <Clock className="h-4 w-4 text-green-500" />;
      case 'task': return <ClipboardList className="h-4 w-4 text-purple-500" />;
      case 'expense': return <Receipt className="h-4 w-4 text-orange-500" />;
      case 'announcement': return <Megaphone className="h-4 w-4 text-pink-500" />;
      case 'chat': return <MessageSquare className="h-4 w-4 text-teal-500" />;
      default: return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const getNotifNavigationPath = (notif: any) => {
    const base = `/${userRole}`;
    switch (notif.type) {
      case 'leave': return `${base}/leaves`;
      case 'attendance': return `${base}/attendance`;
      case 'task': return `${base}/tasks`;
      case 'expense': return `${base}/expenses`;
      case 'announcement': return `${base}/announcements`;
      case 'chat': return `${base}/chat`;
      default: return `${base}/notifications`;
    }
  };

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <img src={aseleaLogo} alt="Aselea" className="h-8 w-auto object-contain" />
        {sidebarOpen && (
          <span className="text-lg font-semibold text-foreground slide-in-left">
            Aselea
          </span>
        )}
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                {sidebarOpen && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className={cn('flex items-center gap-3 mb-4', !sidebarOpen && 'justify-center')}>
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <UserCircle className="w-6 h-6 text-primary" />
          </div>
          {sidebarOpen && (
            <div className="slide-in-left overflow-hidden">
              <p className="text-sm font-medium text-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground">{getRoleLabel(userRole)}</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            'w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10',
            !sidebarOpen && 'px-2'
          )}
        >
          <LogOut className="h-4 w-4" />
          {sidebarOpen && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <NavContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50 transform transition-transform duration-300 lg:hidden flex flex-col',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <NavContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* Desktop sidebar toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <h1 className="text-lg font-semibold">
              {getRoleLabel(userRole)} Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <Popover open={notifBellOpen} onOpenChange={setNotifBellOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 glass-card" align="end">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={async () => {
                        await notificationAPI.markAllAsRead();
                        fetchNotifications();
                      }}
                    >
                      Mark all read
                    </Button>
                  )}
                </div>
                <ScrollArea className="max-h-[350px]">
                  <div className="p-2">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No notifications</p>
                    ) : (
                      notifications.map((notif: any) => (
                        <div
                          key={notif._id}
                          className={cn(
                            'p-3 rounded-lg transition-colors cursor-pointer mb-1 flex items-start gap-3',
                            notif.isRead ? 'hover:bg-secondary/50' : 'bg-primary/5 hover:bg-primary/10'
                          )}
                          onClick={async () => {
                            if (!notif.isRead) {
                              await notificationAPI.markAsRead(notif._id);
                              fetchNotifications();
                            }
                            setNotifBellOpen(false);
                            navigate(getNotifNavigationPath(notif));
                          }}
                        >
                          <div className="mt-0.5 flex-shrink-0">{getNotifTypeIcon(notif.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm leading-snug', !notif.isRead ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                              {notif.title || notif.message}
                            </p>
                            {notif.title && notif.message && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{notif.message}</p>
                            )}
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              {new Date(notif.createdAt).toLocaleDateString()} &bull; {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {!notif.isRead && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
                <div className="p-2 border-t border-border">
                  <Button
                    variant="ghost"
                    className="w-full justify-between text-sm"
                    onClick={() => {
                      setNotifBellOpen(false);
                      navigate(`/${userRole}/notifications`);
                    }}
                  >
                    View All Notifications
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </PopoverContent>
            </Popover>


          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
