import { useDashboardStats } from "@/hooks/use-dashboard";
import { StatCard } from "@/components/StatCard";
import { 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  BarChart3, 
  TrendingUp, 
  Activity 
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRole } from "@/hooks/use-role.tsx";

const MODERN_COLORS = {
  High: '#ef4444',
  Medium: '#f97316',
  Low: '#10b981'
};

const COLORS = ['#232b6e', '#ff6200', '#10b981', '#ef4444']; // Primary, Accent, Green, Red

export default function Dashboard() {
  const { role } = useRole();
  const { data: stats, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load dashboard data. Please try again.
      </div>
    );
  }

  // Priority Distribution Data
  const pieData = stats.casesByPriority?.map((p: any) => ({
    ...p,
    color: MODERN_COLORS[p.name as keyof typeof MODERN_COLORS] || COLORS[0]
  })) || [];

  const isAdmin = role === "admin";

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">
          {isAdmin ? "Admin Dashboard" : "Agency Dashboard"}
        </h1>
        <p className="text-muted-foreground">
          {isAdmin 
            ? "Real-time insights across all debt collection agencies." 
            : "Real-time insights into your agency's performance."}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Cases" 
          value={stats.totalCases} 
          icon={Users} 
          trend="+12.5%" 
          trendUp={true} 
        />
        <StatCard 
          title="Pending Cases" 
          value={stats.pendingCases} 
          icon={Activity} 
          className="border-l-4 border-l-orange-500 shadow-sm"
        />
        <StatCard 
          title="Recovered Cases" 
          value={stats.recoveredCases} 
          icon={CheckCircle2} 
          trend="+5.2%" 
          trendUp={true} 
          className="border-l-4 border-l-green-500 shadow-sm"
        />
        <StatCard 
          title="SLA Breaches" 
          value={stats.slaBreaches} 
          icon={AlertTriangle} 
          trend="-2.1%" 
          trendUp={false} 
          className="border-l-4 border-l-red-500 shadow-sm"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cases by Status */}
        <Card className="shadow-md border-border/40 overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Case Pipeline Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.casesByStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid hsl(var(--border))', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'hsl(var(--card))',
                      padding: '12px'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))" 
                    radius={[6, 6, 0, 0]} 
                    barSize={32}
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card className="shadow-md border-border/40 overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Priority Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full flex flex-col">
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={105}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                    animationDuration={1500}
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--card))'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-2">
                {pieData.map((entry: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs font-medium text-muted-foreground">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top DCAs - Only show for Admin */}
      {isAdmin && (
        <Card className="shadow-md border-border/40 overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Agency Performance Benchmarking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.casesByDca} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="4 4" horizontal={true} vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--card))'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--accent))" 
                    radius={[0, 6, 6, 0]} 
                    barSize={20}
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
