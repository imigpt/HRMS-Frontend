import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatsCard from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Building2,
  Users,
  UserCircle,
  Clock,
  CalendarCheck,
  ClipboardList,
  Receipt,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { adminAPI } from '@/lib/apiClient';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [dashboardRes, activityRes] = await Promise.all([
          adminAPI.getDashboard(),
          adminAPI.getActivity(),
        ]);

        if (dashboardRes.data.success) {
          setDashboardData(dashboardRes.data.data);
        }
        if (activityRes.data.success) {
          setActivityData(activityRes.data.data || []);
        }
      } catch (err: any) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const stats = dashboardData?.stats || {};
  const systemHealth = dashboardData?.systemHealth || {};
  const alerts = dashboardData?.alerts || [];

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Companies"
            value={stats.totalCompanies || 0}
            icon={Building2}
            className="stagger-1"
          />
          <StatsCard
            title="HR Managers"
            value={stats.totalHR || 0}
            icon={Users}
            className="stagger-2"
          />
          <StatsCard
            title="Total Employees"
            value={stats.totalEmployees || 0}
            icon={UserCircle}
            className="stagger-3"
          />
          <StatsCard
            title="Active Today"
            value={stats.activeToday || 0}
            icon={Clock}
            suffix={`/${stats.totalEmployees || 0}`}
            className="stagger-4"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Pending Leaves"
            value={stats.pendingLeaves || 0}
            icon={CalendarCheck}
            className="stagger-5"
          />
          <StatsCard
            title="Active Tasks"
            value={stats.activeTasks || 0}
            icon={ClipboardList}
            className="stagger-6"
          />
          <StatsCard
            title="Pending Expenses"
            value={stats.pendingExpenses || 0}
            icon={Receipt}
            prefix="₹"
            className="stagger-6"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest actions across the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityData.length > 0 ? (
                  activityData.slice(0, 5).map((activity: any, index: number) => (
                    <div
                      key={activity._id || index}
                      className="flex items-start gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className={`w-2 h-2 mt-2 rounded-full ${
                        activity.type === 'success' ? 'bg-success' :
                        activity.type === 'error' ? 'bg-destructive' :
                        activity.type === 'warning' ? 'bg-warning' : 'bg-primary'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{activity.action || activity.description}</p>
                        <p className="text-xs text-muted-foreground">{activity.user || activity.userName}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {activity.time || new Date(activity.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* System Alerts */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                System Alerts
              </CardTitle>
              <CardDescription>Items requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length > 0 ? (
                  alerts.map((alert: any, index: number) => (
                    <div
                      key={alert._id || index}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border bg-secondary/30"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{alert.message}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          alert.priority === 'high' ? 'status-rejected' :
                          alert.priority === 'medium' ? 'status-pending' : 'status-approved'
                        }
                      >
                        {alert.priority}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No alerts</p>
                )}
              </div>

              {/* System Health */}
              <div className="mt-6 space-y-4">
                <h4 className="text-sm font-medium text-foreground">System Health</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Server Load</span>
                      <span className="text-foreground">{systemHealth.serverLoad || 0}%</span>
                    </div>
                    <Progress value={systemHealth.serverLoad || 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Database</span>
                      <span className="text-foreground">{systemHealth.database || 0}%</span>
                    </div>
                    <Progress value={systemHealth.database || 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Storage</span>
                      <span className="text-foreground">{systemHealth.storage || 0}%</span>
                    </div>
                    <Progress value={systemHealth.storage || 0} className="h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
