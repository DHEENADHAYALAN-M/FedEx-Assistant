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
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto bg-[#f8fafc]/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold font-display text-[#1e293b] tracking-tight">
            {isAdmin ? "Executive Overview" : "Performance Analytics"}
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Welcome back, <span className="text-primary font-bold">Admin</span>. Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Status</span>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Live Updates Active
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Inbound Cases" 
          value={stats.totalCases} 
          icon={Users} 
          trend="+12.5%" 
          trendUp={true} 
        />
        <StatCard 
          title="Active Operations" 
          value={stats.pendingCases} 
          icon={Activity} 
        />
        <StatCard 
          title="Total Recovery" 
          value={stats.recoveredCases} 
          icon={CheckCircle2} 
          trend="+5.2%" 
          trendUp={true} 
        />
        <StatCard 
          title="Risk Alerts" 
          value={stats.slaBreaches} 
          icon={AlertTriangle} 
          trend="-2.1%" 
          trendUp={false} 
        />
      </div>

      {/* Main Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cases by Status - Area Chart for more "Pro" feel */}
        <Card className="lg:col-span-2 shadow-2xl shadow-slate-200/60 border-slate-100/80 overflow-hidden bg-white/80 backdrop-blur-md">
          <CardHeader className="pb-2 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <BarChart3 className="w-4 h-4 text-primary" />
                </div>
                Case Lifecycle Dynamics
              </CardTitle>
              <div className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded">Last 24 Hours</div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.casesByStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 11 }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(8px)',
                      padding: '16px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card className="shadow-2xl shadow-slate-200/60 border-slate-100/80 overflow-hidden bg-white/80 backdrop-blur-md">
          <CardHeader className="pb-2 border-b border-slate-50">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <div className="p-1.5 bg-accent/10 rounded-lg">
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              Portfolio Risk
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px] w-full flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={10}
                    dataKey="value"
                    stroke="none"
                    animationDuration={2000}
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4">
                {pieData.map((entry: any, index: number) => (
                  <div key={index} className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-0.5">{entry.name}</span>
                      <span className="text-xs font-bold text-slate-700 leading-none">{entry.value} Cases</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agency Performance - Horizontal Benchmarking */}
      {isAdmin && (
        <Card className="shadow-2xl shadow-slate-200/60 border-slate-100/80 overflow-hidden bg-white/80 backdrop-blur-md">
          <CardHeader className="border-b border-slate-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                Agency Efficiency Benchmark
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs font-bold text-primary hover:bg-primary/5">View Full Report</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.casesByDca} layout="vertical" margin={{ top: 0, right: 30, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={140} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 700 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc', opacity: 0.5 }}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="url(#barGradient)" 
                    radius={[0, 10, 10, 0]} 
                    barSize={24}
                    animationDuration={2000}
                  >
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(var(--accent))" />
                        <stop offset="100%" stopColor="#f97316" />
                      </linearGradient>
                    </defs>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
