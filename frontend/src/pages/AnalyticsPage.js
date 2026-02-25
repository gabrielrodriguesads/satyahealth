import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { 
  TrendingUp, 
  DollarSign, 
  Target,
  BarChart3,
  PieChart
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell
} from 'recharts';

const mockMonthlyData = [
  { month: 'Jan', savings: 45000, cases: 120, adherence: 82 },
  { month: 'Fev', savings: 52000, cases: 145, adherence: 85 },
  { month: 'Mar', savings: 48000, cases: 132, adherence: 79 },
  { month: 'Abr', savings: 61000, cases: 178, adherence: 88 },
  { month: 'Mai', savings: 55000, cases: 156, adherence: 86 },
  { month: 'Jun', savings: 67000, cases: 189, adherence: 91 },
];

const mockSpecialtyData = [
  { name: 'Cardiologia', value: 35, color: '#0891B2' },
  { name: 'Ortopedia', value: 25, color: '#10B981' },
  { name: 'Neurologia', value: 20, color: '#6366F1' },
  { name: 'Oncologia', value: 12, color: '#F59E0B' },
  { name: 'Outros', value: 8, color: '#94A3B8' },
];

const AnalyticsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-slate-900 mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('savings') || entry.name.includes('Economia') 
                ? formatCurrency(entry.value) 
                : entry.name.includes('adherence') || entry.name.includes('Aderência')
                  ? `${entry.value}%`
                  : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in" data-testid="analytics-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Analytics
          </h1>
          <p className="text-slate-500 mt-1">
            Análise detalhada de economia e aderência às recomendações
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-100 text-sm">Economia Total</p>
                  {loading ? (
                    <Skeleton className="h-8 w-32 bg-white/20 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {formatCurrency(stats?.total_savings || 328000)}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">+18% vs. mês anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Taxa de Aderência</p>
                  {loading ? (
                    <Skeleton className="h-8 w-24 bg-white/20 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {stats?.adherence_rate || 85}%
                    </p>
                  )}
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <Target className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">+5% vs. mês anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm">Economia Média/Caso</p>
                  {loading ? (
                    <Skeleton className="h-8 w-28 bg-white/20 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {formatCurrency(stats?.average_savings_per_case || 450)}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <BarChart3 className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">+12% vs. mês anterior</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Savings Over Time */}
          <Card className="lg:col-span-8 bg-white border border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Evolução da Economia
                </CardTitle>
                <Badge variant="outline" className="text-cyan-600 border-cyan-200 bg-cyan-50">
                  Últimos 6 meses
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockMonthlyData}>
                    <defs>
                      <linearGradient id="savingsGradient2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0891B2" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0891B2" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} />
                    <YAxis stroke="#94A3B8" fontSize={12} tickFormatter={(v) => `R$${v/1000}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="savings" 
                      stroke="#0891B2" 
                      strokeWidth={2}
                      fill="url(#savingsGradient2)"
                      name="Economia"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Specialty Distribution */}
          <Card className="lg:col-span-4 bg-white border border-slate-200">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
                Por Especialidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={mockSpecialtyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {mockSpecialtyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {mockSpecialtyData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-600">{item.name}</span>
                    </div>
                    <span className="font-medium text-slate-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Adherence Chart */}
        <Card className="bg-white border border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
                Taxa de Aderência Mensal
              </CardTitle>
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                Meta: 85%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockMonthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} />
                  <YAxis stroke="#94A3B8" fontSize={12} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="adherence" 
                    fill="#10B981" 
                    radius={[4, 4, 0, 0]}
                    name="Aderência"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-50 border border-slate-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Insights do Período
              </h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2" />
                  <span>Cardiologia apresentou maior economia no período (R$ 120k)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                  <span>Taxa de aderência acima da meta nos últimos 3 meses</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2" />
                  <span>Oportunidade de melhoria em Neurologia (aderência 72%)</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 border border-slate-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Projeções
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Economia projetada (próx. trimestre)</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(210000)}</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: '70%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Meta de aderência</span>
                    <span className="font-semibold text-emerald-600">90%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }} />
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

export default AnalyticsPage;
