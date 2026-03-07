import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Eye, Pencil, Calendar, Clock, MessageSquare, Star, Loader2, Paperclip, GitBranch, AlertTriangle } from 'lucide-react';
import { getPriorityColor, getStatusColor, statusLabels, formatDate, getInitials, getUserName, isOverdue, formatDuration } from './task-helpers';

interface TaskListViewProps {
  tasks: any[];
  loading?: boolean;
  onViewTask: (task: any) => void;
  onEditTask?: (task: any) => void;
  showAssignee?: boolean;
  showProject?: boolean;
}

const TaskListView = ({
  tasks,
  loading = false,
  onViewTask,
  onEditTask,
  showAssignee = true,
  showProject = false,
}: TaskListViewProps) => {
  const colSpan = 8 + (showAssignee ? 1 : 0) + (showProject ? 1 : 0);

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/40">
            <TableHead className="font-semibold">Task</TableHead>
            {showAssignee && <TableHead className="font-semibold">Assigned To</TableHead>}
            {showProject && <TableHead className="font-semibold">Project</TableHead>}
            <TableHead className="font-semibold">Priority</TableHead>
            <TableHead className="font-semibold min-w-[130px]">Progress</TableHead>
            <TableHead className="font-semibold">Due Date</TableHead>
            <TableHead className="font-semibold">Est. Time</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold text-center">Info</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground mt-2">Loading tasks…</p>
              </TableCell>
            </TableRow>
          ) : tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center py-12 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <GitBranch className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm">No tasks found</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            tasks.map(task => {
              const overdue = isOverdue(task.dueDate, task.status);
              const childCount = task.childTasks?.length || 0;
              const completedChildren = task.childTasks?.filter((c: any) => c.status === 'completed').length || 0;

              return (
                <TableRow
                  key={task._id}
                  className="group hover:bg-secondary/30 transition-colors cursor-pointer"
                  onClick={() => onViewTask(task)}
                >
                  {/* ── Task Title + Meta ── */}
                  <TableCell>
                    <div className="max-w-[280px]">
                      <div className="flex items-center gap-1.5">
                        {overdue && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>This task is overdue</TooltipContent>
                          </Tooltip>
                        )}
                        <p className="font-medium text-sm truncate">{task.title}</p>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{task.description}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {task.tags?.slice(0, 2).map((tag: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 bg-secondary/50">{tag}</Badge>
                        ))}
                        {task.tags?.length > 2 && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">+{task.tags.length - 2}</Badge>
                        )}
                        {childCount > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-0.5 bg-blue-500/10 text-blue-400 border-blue-500/20">
                            <GitBranch className="h-2.5 w-2.5" />{completedChildren}/{childCount} subtasks
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* ── Assignee ── */}
                  {showAssignee && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 border-2 border-primary/20">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-[10px] font-bold">
                            {getInitials(getUserName(task.assignedTo))}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-xs">{getUserName(task.assignedTo)}</p>
                          {task.assignedTo?.department && (
                            <p className="text-[10px] text-muted-foreground">{task.assignedTo.department}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  )}

                  {/* ── Project ── */}
                  {showProject && (
                    <TableCell>
                      <span className="text-xs font-medium">
                        {task.project ? (typeof task.project === 'object' ? task.project.name : task.project) : '—'}
                      </span>
                    </TableCell>
                  )}

                  {/* ── Priority ── */}
                  <TableCell>
                    <Badge className={`text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                      {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)}
                    </Badge>
                  </TableCell>

                  {/* ── Progress ── */}
                  <TableCell>
                    <div className="space-y-1.5 min-w-[120px]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Progress</span>
                        <span className={`font-bold ${task.progress === 100 ? 'text-green-500' : task.progress >= 50 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {task.progress}%
                        </span>
                      </div>
                      <div className="relative">
                        <Progress value={task.progress} className="h-2 rounded-full" />
                      </div>
                      {task.estimatedTime ? (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />{formatDuration(task.estimatedTime)}
                          {task.actualTime > 0 && <span className="ml-1">/ {formatDuration(task.actualTime)} logged</span>}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>

                  {/* ── Due Date ── */}
                  <TableCell>
                    <div className={`flex items-center gap-1.5 text-xs ${overdue ? 'text-destructive font-bold' : ''}`}>
                      <Calendar className={`h-3.5 w-3.5 ${overdue ? 'text-destructive' : 'text-muted-foreground'}`} />
                      <span>{formatDate(task.dueDate)}</span>
                    </div>
                    {task.startDate && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">Started {formatDate(task.startDate)}</p>
                    )}
                  </TableCell>

                  {/* ── Est. Time ── */}
                  <TableCell>
                    {task.estimatedTime ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatDuration(task.estimatedTime)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* ── Status ── */}
                  <TableCell>
                    <Badge className={`text-xs font-medium ${getStatusColor(task.status)}`}>
                      {statusLabels[task.status] || task.status}
                    </Badge>
                  </TableCell>

                  {/* ── Quick Info ── */}
                  <TableCell>
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      {task.review?.comment && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                          </TooltipTrigger>
                          <TooltipContent>Reviewed {task.review.rating ? `(${task.review.rating}/5)` : ''}</TooltipContent>
                        </Tooltip>
                      )}
                      {task.comments?.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-0.5 text-[11px]">
                              <MessageSquare className="h-3.5 w-3.5" />{task.comments.length}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{task.comments.length} comment(s)</TooltipContent>
                        </Tooltip>
                      )}
                      {task.attachments?.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-0.5 text-[11px]">
                              <Paperclip className="h-3.5 w-3.5" />{task.attachments.length}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{task.attachments.length} file(s)</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>

                  {/* ── Actions (Edit instead of Delete) ── */}
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onViewTask(task)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Details</TooltipContent>
                      </Tooltip>
                      {onEditTask && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary hover:text-primary" onClick={() => onEditTask(task)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Task</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
};

export default TaskListView;
