import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import AnimatedCounter from '@/components/ui/animated-counter';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  prefix?: string;
  suffix?: string;
  className?: string;
}

const StatsCard = ({
  title,
  value,
  icon: Icon,
  trend,
  prefix,
  suffix,
  className,
}: StatsCardProps) => {
  return (
    <Card className={cn('card-hover glass-card', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">
          <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
        </div>
        {trend && (
          <p className={cn(
            'text-xs mt-2 flex items-center gap-1',
            trend.isPositive ? 'text-success' : 'text-destructive'
          )}>
            <span>{trend.isPositive ? '↑' : '↓'} {trend.value}%</span>
            <span className="text-muted-foreground">from last month</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;
