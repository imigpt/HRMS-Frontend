import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { announcementAPI } from '@/lib/apiClient';
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
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);

  const navItems = getNavItems(userRole);

  // Fetch recent announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await announcementAPI.getAnnouncements({ limit: 3 });
        if (response.data?.data) {
          setRecentAnnouncements(response.data.data.slice(0, 3));
        }
      } catch (error) {
        console.error('Failed to fetch announcements:', error);
      }
    };
    fetchAnnouncements();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'medium':
        return <Bell className="h-4 w-4 text-warning" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-destructive';
      case 'medium':
        return 'text-warning';
      default:
        return 'text-primary';
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
            <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Megaphone className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                    {recentAnnouncements.length}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 glass-card" align="end">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-primary" />
                    Recent Announcements
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Latest updates and notifications
                  </p>
                </div>
                <ScrollArea className="max-h-[400px]">
                  <div className="p-2">
                    {recentAnnouncements.map((announcement, index) => (
                      <div
                        key={announcement._id || announcement.id || `announcement-${index}`}
                        className="p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer mb-2"
                        onClick={() => {
                          setNotificationOpen(false);
                          navigate(
                            userRole === 'admin' 
                              ? '/admin/announcements' 
                              : userRole === 'hr' 
                              ? '/hr/announcements' 
                              : userRole === 'client'
                              ? '/client'
                              : '/employee/announcements'
                          );
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {getPriorityIcon(announcement.priority)}
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-medium text-foreground truncate",
                              getPriorityColor(announcement.priority)
                            )}>
                              {announcement.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {announcement.createdAt ? new Date(announcement.createdAt).toLocaleDateString() : announcement.date}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="p-3 border-t border-border">
                  <Button
                    variant="ghost"
                    className="w-full justify-between text-sm"
                    onClick={() => {
                      setNotificationOpen(false);
                      navigate(
                        userRole === 'admin' 
                          ? '/admin/announcements' 
                          : userRole === 'hr' 
                          ? '/hr/announcements' 
                          : userRole === 'client'
                          ? '/client'
                          : '/employee/announcements'
                      );
                    }}
                  >
                    View All Announcements
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
