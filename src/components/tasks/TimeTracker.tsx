import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Play, Square, Clock, Timer, Plus, Loader2,
} from 'lucide-react';
import { formatDuration, formatDate } from './task-helpers';
import { taskAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface TimeTrackerProps {
  tasks: any[];
  compact?: boolean;
}

const TimeTracker = ({ tasks, compact = false }: TimeTrackerProps) => {
  const { toast } = useToast();
  const [runningTimer, setRunningTimer] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [logForm, setLogForm] = useState({
    taskId: '',
    duration: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const fetchRunningTimer = useCallback(async () => {
    try {
      const res = await taskAPI.getRunningTimer();
      if (res.data.data) {
        setRunningTimer(res.data.data);
        const start = new Date(res.data.data.startTime).getTime();
        setElapsed(Math.floor((Date.now() - start) / 1000));
      } else {
        setRunningTimer(null);
        setElapsed(0);
      }
    } catch {
      setRunningTimer(null);
    }
  }, []);

  const fetchTimeLogs = useCallback(async () => {
    try {
      const res = await taskAPI.getTimeLogs({ limit: 10 });
      setTimeLogs(res.data.data || []);
    } catch {
      setTimeLogs([]);
    }
  }, []);

  useEffect(() => {
    fetchRunningTimer();
    fetchTimeLogs();
  }, [fetchRunningTimer, fetchTimeLogs]);

  useEffect(() => {
    if (runningTimer) {
      intervalRef.current = setInterval(() => {
        const start = new Date(runningTimer.startTime).getTime();
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [runningTimer]);

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = async (taskId: string) => {
    setLoading(true);
    try {
      await taskAPI.startTimer(taskId);
      toast({ title: 'Timer started' });
      fetchRunningTimer();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to start timer', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleStopTimer = async () => {
    if (!runningTimer) return;
    setLoading(true);
    try {
      await taskAPI.stopTimer(runningTimer._id);
      toast({ title: 'Timer stopped' });
      setRunningTimer(null);
      setElapsed(0);
      fetchTimeLogs();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to stop timer', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogManual = async () => {
    if (!logForm.taskId || !logForm.duration) return;
    setLoading(true);
    try {
      await taskAPI.logTime({
        taskId: logForm.taskId,
        duration: parseInt(logForm.duration),
        description: logForm.description || undefined,
        date: logForm.date || undefined,
      });
      toast({ title: 'Success', description: 'Time logged' });
      setLogForm({ taskId: '', duration: '', description: '', date: new Date().toISOString().split('T')[0] });
      setIsLogOpen(false);
      fetchTimeLogs();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to log time', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${runningTimer ? 'bg-destructive/20' : 'bg-primary/20'}`}>
                {runningTimer ? <Square className="h-5 w-5 text-destructive" /> : <Timer className="h-5 w-5 text-primary" />}
              </div>
              <div>
                {runningTimer ? (
                  <>
                    <p className="text-lg font-mono font-bold text-primary">{formatElapsed(elapsed)}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeof runningTimer.task === 'object' ? runningTimer.task.title : 'Task in progress'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">No active timer</p>
                    <p className="text-xs text-muted-foreground">Start timer on a task</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {runningTimer ? (
                <Button size="sm" variant="destructive" onClick={handleStopTimer} disabled={loading}>
                  <Square className="h-3 w-3 mr-1" />Stop
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsLogOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" />Log
                </Button>
              )}
            </div>
          </div>
        </CardContent>

        {/* Manual Log Dialog */}
        <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
          <DialogContent className="bg-background max-w-md">
            <DialogHeader>
              <DialogTitle>Log Time Manually</DialogTitle>
              <DialogDescription>Record time spent on a task</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Task *</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={logForm.taskId}
                  onChange={(e) => setLogForm({ ...logForm, taskId: e.target.value })}
                >
                  <option value="">Select a task</option>
                  {tasks.map(t => (
                    <option key={t._id} value={t._id}>{t.title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes) *</Label>
                <Input type="number" placeholder="e.g. 60" value={logForm.duration} onChange={(e) => setLogForm({ ...logForm, duration: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="What did you work on?" rows={2} value={logForm.description} onChange={(e) => setLogForm({ ...logForm, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={logForm.date} onChange={(e) => setLogForm({ ...logForm, date: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsLogOpen(false)}>Cancel</Button>
              <Button onClick={handleLogManual} disabled={!logForm.taskId || !logForm.duration || loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Log Time
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Timer */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4" />Time Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {runningTimer ? (
            <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <div>
                <p className="text-3xl font-mono font-bold text-primary">{formatElapsed(elapsed)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {typeof runningTimer.task === 'object' ? runningTimer.task.title : 'Task in progress'}
                </p>
              </div>
              <Button variant="destructive" onClick={handleStopTimer} disabled={loading}>
                <Square className="h-4 w-4 mr-2" />Stop Timer
              </Button>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active timer. Start one from a task or log time manually.</p>
            </div>
          )}

          <div className="flex gap-2">
            {!runningTimer && tasks.length > 0 && (
              <div className="flex-1">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  onChange={(e) => { if (e.target.value) handleStartTimer(e.target.value); }}
                  defaultValue=""
                >
                  <option value="">Start timer for a task...</option>
                  {tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').map(t => (
                    <option key={t._id} value={t._id}>{t.title}</option>
                  ))}
                </select>
              </div>
            )}
            <Button variant="outline" onClick={() => setIsLogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Log Manually
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Time Logs */}
      {timeLogs.length > 0 && (
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base">Recent Time Logs</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timeLogs.map(log => (
                <div key={log._id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {typeof log.task === 'object' ? log.task.title : 'Task'}
                    </p>
                    {log.description && <p className="text-xs text-muted-foreground truncate">{log.description}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold">{formatDuration(log.duration)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(log.date)}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{log.logType}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Log Dialog */}
      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent className="bg-background max-w-md">
          <DialogHeader>
            <DialogTitle>Log Time Manually</DialogTitle>
            <DialogDescription>Record time spent on a task</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task *</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={logForm.taskId}
                onChange={(e) => setLogForm({ ...logForm, taskId: e.target.value })}
              >
                <option value="">Select a task</option>
                {tasks.map(t => (
                  <option key={t._id} value={t._id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes) *</Label>
              <Input type="number" placeholder="e.g. 60" value={logForm.duration} onChange={(e) => setLogForm({ ...logForm, duration: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="What did you work on?" rows={2} value={logForm.description} onChange={(e) => setLogForm({ ...logForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={logForm.date} onChange={(e) => setLogForm({ ...logForm, date: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsLogOpen(false)}>Cancel</Button>
            <Button onClick={handleLogManual} disabled={!logForm.taskId || !logForm.duration || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Log Time
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeTracker;
