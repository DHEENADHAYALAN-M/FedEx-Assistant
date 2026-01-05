import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  trendUp,
  className
}: StatCardProps) {
  return (
    <Card className={cn("hover-elevate transition-all duration-200 border shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {trend && (
          <p className={cn(
            "text-xs mt-1 font-medium",
            trendUp ? "text-green-600" : "text-red-600"
          )}>
            {trend} <span className="text-muted-foreground font-normal">vs last month</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
