import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Calendar, Clock, Paperclip, MessageSquare } from 'lucide-react';
import { getPriorityColor, getStatusColor, formatDate, getInitials, getUserName, isOverdue, statusLabels, formatDuration } from './task-helpers';

interface Task {
  _id: string;
  title: string;
  description?: string;
  assignedTo: any;
  priority: string;
  status: string;
  progress: number;
  dueDate?: string;
  tags: string[];
  estimatedTime?: number;
  actualTime?: number;
  comments?: any[];
  attachments?: any[];
  project?: any;
}

interface TaskKanbanBoardProps {
  tasks: Task[];
  onViewTask: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  showAssignee?: boolean;
}

const columns = [
  { key: 'draft', label: 'Draft', color: 'bg-gray-500/20', accent: 'border-l-gray-500' },
  { key: 'pending-approval', label: 'Pending Approval', color: 'bg-amber-500/20', accent: 'border-l-amber-500' },
  { key: 'assigned', label: 'Assigned', color: 'bg-blue-500/20', accent: 'border-l-blue-400' },
  { key: 'in-progress', label: 'In Progress', color: 'bg-cyan-500/20', accent: 'border-l-cyan-500' },
  { key: 'under-review', label: 'Under Review', color: 'bg-purple-500/20', accent: 'border-l-purple-500' },
  { key: 'completed', label: 'Completed', color: 'bg-emerald-500/20', accent: 'border-l-emerald-500' },
  { key: 'closed', label: 'Closed', color: 'bg-slate-500/20', accent: 'border-l-slate-500' },
  { key: 'rejected', label: 'Rejected', color: 'bg-red-500/20', accent: 'border-l-red-500' },
];

const TaskKanbanBoard = ({ tasks, onViewTask, onStatusChange, showAssignee = true }: TaskKanbanBoardProps) => {
  const getColumnTasks = (status: string) => tasks.filter(t => t.status === status);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onStatusChange) {
      onStatusChange(taskId, status);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {columns.map(col => {
        const colTasks = getColumnTasks(col.key);
        return (
          <div
            key={col.key}
            className="space-y-3"
            onDrop={(e) => handleDrop(e, col.key)}
            onDragOver={handleDragOver}
          >
            <div className={`flex items-center justify-between p-3 rounded-lg ${col.color}`}>
              <h3 className="font-semibold text-sm">{col.label}</h3>
              <Badge variant="outline" className="text-xs">{colTasks.length}</Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-20rem)]">
              <div className="space-y-3 pr-2">
                {colTasks.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm border border-dashed rounded-lg">
                    No tasks
                  </div>
                ) : (
                  colTasks.map(task => (
                    <Card
                      key={task._id}
                      className={`glass-card card-hover cursor-grab active:cursor-grabbing border-l-4 ${col.accent}`}
                      draggable={!!onStatusChange}
                      onDragStart={(e) => handleDragStart(e, task._id)}
                    >
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm line-clamp-2 flex-1">{task.title}</h4>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-1" onClick={() => onViewTask(task)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                        )}

                        {task.tags && task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {task.tags.slice(0, 3).map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                            ))}
                            {task.tags.length > 3 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{task.tags.length - 3}</Badge>
                            )}
                          </div>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-semibold">{task.progress}%</span>
                          </div>
                          <Progress value={task.progress} className="h-1" />
                        </div>

                        <div className="flex items-center justify-between">
                          <Badge className={`text-[10px] ${getPriorityColor(task.priority)}`}>
                            {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)}
                          </Badge>
                          {task.dueDate && (
                            <span className={`flex items-center gap-1 text-[10px] ${isOverdue(task.dueDate, task.status) ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                              <Calendar className="h-3 w-3" />
                              {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-border/50">
                          {showAssignee && task.assignedTo && (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="bg-primary/20 text-primary text-[8px]">
                                  {getInitials(getUserName(task.assignedTo))}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                                {getUserName(task.assignedTo)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {task.comments && task.comments.length > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px]">
                                <MessageSquare className="h-3 w-3" />{task.comments.length}
                              </span>
                            )}
                            {task.attachments && task.attachments.length > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px]">
                                <Paperclip className="h-3 w-3" />{task.attachments.length}
                              </span>
                            )}
                            {task.estimatedTime && (
                              <span className="flex items-center gap-0.5 text-[10px]">
                                <Clock className="h-3 w-3" />{formatDuration(task.estimatedTime)}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
};

export default TaskKanbanBoard;
