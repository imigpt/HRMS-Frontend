import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/contexts/NotificationContext';
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
  AlertTriangle,
  Bell,
  Info,
  ArrowRight,
  UserCheck,
  CheckCircle,
  XCircle,
  CheckCheck,
  Wallet,
  ChevronDown,
  TrendingUp,
  Banknote,
  IndianRupee,
} from 'lucide-react';
import aseleaLogo from '@/assets/aselea-logo.png';

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  children?: NavItem[];
}

const adminNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { title: 'HR Accounts', href: '/admin/hr-accounts', icon: Users },
  { title: 'Employees', href: '/admin/employees', icon: UserCircle },
  { title: 'Clients', href: '/admin/clients', icon: UserCheck },
  { title: 'Attendance', href: '/admin/attendance', icon: Clock },
  { title: 'Edit Requests', href: '/admin/attendance-requests', icon: FileEdit },
  { title: 'Leaves', href: '/admin/leaves', icon: CalendarCheck, children: [
    { title: 'Leaves', href: '/admin/leaves', icon: CalendarCheck },
    { title: 'Leave Management', href: '/admin/leave-management', icon: Calendar },
  ]},
  { title: 'Tasks', href: '/admin/tasks', icon: ClipboardList },
  { title: 'Expenses', href: '/admin/expenses', icon: Receipt },
  { title: 'Chat', href: '/admin/chat', icon: MessageSquare },
  { title: 'Announcements', href: '/admin/announcements', icon: Megaphone },
  { title: 'Company Policies', href: '/admin/policies', icon: FileText },
  { title: 'Payroll', href: '/admin/payroll', icon: Wallet, children: [
    { title: 'Pre Payments', href: '/admin/pre-payments', icon: Banknote },
    { title: 'Increment/Promotion', href: '/admin/increments', icon: TrendingUp },
    { title: 'Payroll', href: '/admin/payroll', icon: IndianRupee },
    { title: 'Employee Salaries', href: '/admin/salaries', icon: Wallet },
  ]},
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
  { title: 'Leaves', href: '/hr/leaves', icon: CalendarCheck, children: [
    { title: 'Employee Leaves', href: '/hr/employee-leaves', icon: Users },
    { title: 'My Leaves', href: '/hr/leaves', icon: CalendarCheck },
  ]},
  { title: 'Tasks', href: '/hr/tasks', icon: ClipboardList },
  { title: 'Expenses', href: '/hr/expenses', icon: Receipt },
  { title: 'Chat', href: '/hr/chat', icon: MessageSquare },
  { title: 'Announcements', href: '/hr/announcements', icon: Megaphone },
  { title: 'Company Policies', href: '/hr/policies', icon: FileText },
  { title: 'Payroll', href: '/hr/payroll', icon: Wallet, children: [
    { title: 'Pre Payments', href: '/hr/pre-payments', icon: Banknote },
    { title: 'Increment/Promotion', href: '/hr/increments', icon: TrendingUp },
    { title: 'Payroll', href: '/hr/payroll', icon: IndianRupee },
    { title: 'My Salary', href: '/hr/salaries', icon: Wallet },
  ]},
  { title: 'Holidays', href: '/hr/holidays', icon: CalendarDays },
];

const employeeNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/employee', icon: LayoutDashboard },
  { title: 'My Profile', href: '/employee/profile', icon: UserCircle },
  { title: 'Attendance', href: '/employee/attendance', icon: Clock },
  { title: 'Tasks', href: '/employee/tasks', icon: ClipboardList },
  { title: 'Expenses', href: '/employee/expenses', icon: Receipt },
  { title: 'Chat', href: '/employee/chat', icon: MessageSquare },
  { title: 'Announcements', href: '/employee/announcements', icon: Megaphone },
  { title: 'Company Policies', href: '/employee/policies', icon: FileText },
  { title: 'Payroll', href: '/employee/payroll', icon: Wallet, children: [
    { title: 'Pre Payments', href: '/employee/pre-payments', icon: Banknote },
    { title: 'Increment/Promotion', href: '/employee/increments', icon: TrendingUp },
    { title: 'Payroll', href: '/employee/payroll', icon: IndianRupee },
    { title: 'My Salary', href: '/employee/salaries', icon: Wallet },
  ]},
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
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  // Use the aggregated notification system
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const previewNotifications = notifications.slice(0, 6);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = getNavItems(userRole);

  const getNotifIcon = (type: string) => {
    if (type.includes('approved')) return <CheckCircle className="h-4 w-4 text-success" />;
    if (type.includes('rejected')) return <XCircle className="h-4 w-4 text-destructive" />;
    if (type === 'chat') return <MessageSquare className="h-4 w-4 text-blue-400" />;
    if (type === 'announcement') return <Megaphone className="h-4 w-4 text-primary" />;
    if (type.includes('pending')) return <AlertTriangle className="h-4 w-4 text-warning" />;
    return <Bell className="h-4 w-4 text-muted-foreground" />;
  };

  const getNotifLink = () => {
    switch (userRole) {
      case 'admin': return '/admin/notifications';
      case 'hr': return '/hr/notifications';
      case 'client': return '/client/notifications';
      default: return '/employee/notifications';
    }
  };

  const formatTimeAgo = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <img src={aseleaLogo} alt="Aselea" className="h-8 w-auto object-contain" />
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            if (item.children && item.children.length > 0) {
              const isExpanded = expandedMenus[item.title] || false;
              const isChildActive = item.children.some(child => location.pathname === child.href);
              return (
                <div key={item.title}>
                  <button
                    onClick={() => setExpandedMenus(prev => ({ ...prev, [item.title]: !prev[item.title] }))}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full',
                      isChildActive
                        ? 'bg-primary/15 text-primary'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5 flex-shrink-0', isChildActive && 'text-primary')} />
                    {sidebarOpen && (
                      <>
                        <span className="flex-1 text-left">{item.title}</span>
                        <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
                      </>
                    )}
                  </button>
                  {sidebarOpen && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                      {item.children.map((child) => {
                        const isActive = location.pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            to={child.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                              isActive
                                ? 'bg-primary/15 text-primary font-medium'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
                            )}
                          >
                            <child.icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-primary')} />
                            <span>{child.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
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
            <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0 glass-card" align="end">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      Notifications
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary h-7"
                      onClick={() => markAllRead()}
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Mark all read
                    </Button>
                  )}
                </div>

                {/* Notification list */}
                <ScrollArea className="max-h-[380px]">
                  <div className="p-2">
                    {previewNotifications.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-muted-foreground">
                        <Bell className="h-8 w-8 mb-2 opacity-30" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      previewNotifications.map((n) => (
                        <div
                          key={n.id}
                          className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer mb-1 transition-colors hover:bg-secondary/60 ${
                            !n.read ? 'bg-primary/5' : ''
                          }`}
                          onClick={() => {
                            if (!n.read) markAsRead(n.id);
                            setNotificationOpen(false);
                            if (n.link) navigate(n.link);
                          }}
                        >
                          <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                            !n.read ? 'bg-primary/20' : 'bg-secondary'
                          }`}>
                            {getNotifIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={`text-sm font-medium truncate ${
                                !n.read ? 'text-foreground' : 'text-muted-foreground'
                              }`}>
                                {n.title}
                              </p>
                              {!n.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                              {formatTimeAgo(n.time)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Footer */}
                <div className="p-3 border-t border-border">
                  <Button
                    variant="ghost"
                    className="w-full justify-between text-sm"
                    onClick={() => {
                      setNotificationOpen(false);
                      navigate(getNotifLink());
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
