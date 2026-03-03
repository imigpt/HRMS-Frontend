import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  BarChart3, Users, TrendingUp, Clock, CheckCircle, AlertTriangle,
  Loader2, Target,
} from 'lucide-react';
import { getInitials, getUserName, formatDuration, statusLabels } from './task-helpers';
import { taskAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const TaskAnalytics = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [productivity, setProductivity] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, prodRes, workRes] = await Promise.all([
        taskAPI.getStatistics(),
        taskAPI.getProductivityAnalytics(),
        taskAPI.getWorkloadDistribution(),
      ]);
      setStats(statsRes.data.data || null);
      setProductivity(prodRes.data.data || []);
      setWorkload(workRes.data.data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to load analytics', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.byStatus?.completed || 0}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.overdue || 0}</p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Target className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.total > 0 ? Math.round(((stats.byStatus?.completed || 0) / stats.total) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status & Priority Breakdown */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Status Distribution</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(stats.byStatus || {}).map(([status, count]: [string, any]) => (
                <div key={status} className="flex items-center gap-3">
                  <Badge variant="outline" className="w-24 justify-center text-xs capitalize">
                    {statusLabels[status] || status.replace('-', ' ')}
                  </Badge>
                  <Progress
                    value={stats.total > 0 ? (count / stats.total) * 100 : 0}
                    className="h-2 flex-1"
                  />
                  <span className="text-sm font-semibold w-8 text-right">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Priority Distribution</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(stats.byPriority || {}).map(([priority, count]: [string, any]) => (
                <div key={priority} className="flex items-center gap-3">
                  <Badge variant="outline" className="w-24 justify-center text-xs capitalize">{priority}</Badge>
                  <Progress
                    value={stats.total > 0 ? (count / stats.total) * 100 : 0}
                    className="h-2 flex-1"
                  />
                  <span className="text-sm font-semibold w-8 text-right">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Productivity Scores */}
      {productivity.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />Productivity Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {productivity.map((entry: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/20">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {getInitials(getUserName(entry.user))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{getUserName(entry.user)}</p>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Completion</p>
                        <Progress value={entry.scores?.completionRate || 0} className="h-1 mt-0.5" />
                        <p className="text-[10px] font-medium mt-0.5">{Math.round(entry.scores?.completionRate || 0)}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">On Time</p>
                        <Progress value={entry.scores?.onTimeDelivery || 0} className="h-1 mt-0.5" />
                        <p className="text-[10px] font-medium mt-0.5">{Math.round(entry.scores?.onTimeDelivery || 0)}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Efficiency</p>
                        <Progress value={entry.scores?.timeEfficiency || 0} className="h-1 mt-0.5" />
                        <p className="text-[10px] font-medium mt-0.5">{Math.round(entry.scores?.timeEfficiency || 0)}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Quality</p>
                        <Progress value={entry.scores?.qualityScore || 0} className="h-1 mt-0.5" />
                        <p className="text-[10px] font-medium mt-0.5">{Math.round(entry.scores?.qualityScore || 0)}%</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{Math.round(entry.overallScore || 0)}</p>
                    <p className="text-[10px] text-muted-foreground">Score</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workload Distribution */}
      {workload.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />Workload Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workload.map((entry: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/20">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {getInitials(getUserName(entry.user))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{getUserName(entry.user)}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <p className="font-bold">{entry.totalTasks || 0}</p>
                      <p className="text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-primary">{entry.inProgress || 0}</p>
                      <p className="text-muted-foreground">Active</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-success">{entry.completed || 0}</p>
                      <p className="text-muted-foreground">Done</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-destructive">{entry.overdue || 0}</p>
                      <p className="text-muted-foreground">Overdue</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TaskAnalytics;
