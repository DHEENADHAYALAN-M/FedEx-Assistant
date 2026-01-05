import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, trendUp, className }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden group hover:scale-[1.02] transition-all duration-300", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              {title}
            </p>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </h3>
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                {trendUp ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={cn(
                  "text-[10px] font-bold",
                  trendUp ? "text-green-600" : "text-red-600"
                )}>
                  {trend}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">vs last month</span>
              </div>
            )}
          </div>
          <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-primary/5 transition-colors duration-300">
            <Icon className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors duration-300" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
