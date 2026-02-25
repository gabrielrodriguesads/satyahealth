import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { 
  TrendingUp, 
  TrendingDown,
  FileText, 
  Sparkles, 
  DollarSign, 
  Target,
  ArrowRight,
  Building2,
  ChevronRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Mock chart data for visualization
const mockSavingsData = [
  { month: 'Jan', savings: 45000, cases: 120 },
  { month: 'Fev', savings: 52000, cases: 145 },
  { month: 'Mar', savings: 48000, cases: 132 },
  { month: 'Abr', savings: 61000, cases: 178 },
  { month: 'Mai', savings: 55000, cases: 156 },
  { month: 'Jun', savings: 67000, cases: 189 },
];

const DashboardPage = () => {
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
      // Use default values if API fails
      setStats({
        total_authorizations: 0,
        pending_authorizations: 0,
        total_recommendations: 0,
        recommendations_followed: 0,
        adherence_rate: 0,
        total_savings: 0,
        average_savings_per_case: 0,
        top_procedures: [],
        top_providers: []
      });
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

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = 'cyan' }) => (
    <Card className="stat-card bg-white border border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {value}
              </p>
            )}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 ${trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-xs font-medium">{trendValue}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${color === 'cyan' ? 'bg-cyan-50' : color === 'emerald' ? 'bg-emerald-50' : 'bg-slate-100'}`}>
            <Icon className={`w-5 h-5 ${color === 'cyan' ? 'text-cyan-600' : color === 'emerald' ? 'text-emerald-600' : 'text-slate-600'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-slate-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'savings' ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in" data-testid="dashboard-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            Visão geral do sistema de recomendações
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Autorizações Pendentes"
            value={stats?.pending_authorizations || 0}
            icon={FileText}
            trend="down"
            trendValue="-12% este mês"
            color="cyan"
          />
          <StatCard 
            title="Recomendações Geradas"
            value={stats?.total_recommendations || 0}
            icon={Sparkles}
            trend="up"
            trendValue="+24% este mês"
            color="cyan"
          />
          <StatCard 
            title="Economia Total"
            value={formatCurrency(stats?.total_savings || 0)}
            icon={DollarSign}
            trend="up"
            trendValue="+18% este mês"
            color="emerald"
          />
          <StatCard 
            title="Taxa de Aderência"
            value={`${stats?.adherence_rate || 0}%`}
            icon={Target}
            trend="up"
            trendValue="+5% este mês"
            color="emerald"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Savings Chart */}
          <Card className="lg:col-span-8 bg-white border border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Economia Mensal
                </CardTitle>
                <Badge variant="outline" className="text-cyan-600 border-cyan-200 bg-cyan-50">
                  Últimos 6 meses
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockSavingsData}>
                    <defs>
                      <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0891B2" stopOpacity={0.2}/>
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
                      fill="url(#savingsGradient)" 
                      name="Economia"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 border-0 text-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Gerar Recomendação
                  </h3>
                </div>
                <p className="text-sm text-cyan-100 mb-4">
                  Analise uma autorização e obtenha sugestões de prestadores otimizadas.
                </p>
                <Link 
                  to="/authorizations" 
                  className="inline-flex items-center gap-2 text-sm font-medium bg-white text-cyan-600 px-4 py-2 rounded-lg hover:bg-cyan-50 transition-colors"
                  data-testid="new-recommendation-btn"
                >
                  Nova análise
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link 
                  to="/authorizations" 
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">Ver autorizações</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                </Link>
                <Link 
                  to="/providers" 
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">Gerenciar prestadores</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                </Link>
                <Link 
                  to="/analytics" 
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">Ver analytics</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Procedures */}
          <Card className="bg-white border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Procedimentos mais frequentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : stats?.top_procedures?.length > 0 ? (
                <div className="space-y-3">
                  {stats.top_procedures.map((proc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{proc.name || proc.code}</p>
                        <p className="text-xs text-slate-500">Código: {proc.code}</p>
                      </div>
                      <Badge variant="outline" className="bg-white">
                        {proc.count} casos
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">
                  Nenhum procedimento registrado ainda
                </p>
              )}
            </CardContent>
          </Card>

          {/* Top Providers */}
          <Card className="bg-white border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Prestadores com maior economia
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : stats?.top_providers?.length > 0 ? (
                <div className="space-y-3">
                  {stats.top_providers.map((prov, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-emerald-700">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{prov.name}</p>
                          <p className="text-xs text-slate-500">{prov.cases} atendimentos</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">
                        {formatCurrency(prov.savings)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">
                  Nenhum prestador com economia registrada
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
