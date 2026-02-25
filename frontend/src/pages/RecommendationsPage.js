import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recommendationsAPI } from '../lib/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { 
  Sparkles, 
  Search, 
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Eye
} from 'lucide-react';

const statusConfig = {
  generated: { label: 'Gerado', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: Sparkles },
  selected: { label: 'Selecionado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  overridden: { label: 'Override', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertCircle },
  expired: { label: 'Expirado', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
};

const RecommendationsPage = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    loadRecommendations();
  }, [statusFilter]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await recommendationsAPI.list(params);
      setRecommendations(response.data);
    } catch (error) {
      toast.error('Erro ao carregar recomendações');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecommendations = recommendations.filter(rec => {
    const matchesSearch = 
      rec.authorization_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.items?.some(item => item.provider_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in" data-testid="recommendations-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Recomendações
          </h1>
          <p className="text-slate-500 mt-1">
            Histórico de recomendações geradas pelo sistema
          </p>
        </div>

        {/* Filters */}
        <Card className="bg-white border border-slate-200">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por autorização ou prestador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="rec-search-input"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="rec-status-filter">
                  <Filter className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="generated">Gerado</SelectItem>
                  <SelectItem value="selected">Selecionado</SelectItem>
                  <SelectItem value="overridden">Override</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <Card key={i} className="bg-white border border-slate-200">
                <CardContent className="p-4">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))
          ) : filteredRecommendations.length === 0 ? (
            <Card className="bg-white border border-slate-200">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Nenhuma recomendação encontrada
                </h3>
                <p className="text-slate-500 mb-4">
                  Gere uma recomendação a partir de uma autorização
                </p>
                <Button onClick={() => navigate('/authorizations')} className="bg-slate-900 hover:bg-slate-800">
                  Ver Autorizações
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredRecommendations.map((rec) => {
              const status = statusConfig[rec.status] || statusConfig.generated;
              const StatusIcon = status.icon;
              const topProvider = rec.items?.[0];
              const totalSavings = rec.items?.reduce((sum, item) => sum + (item.estimated_savings || 0), 0) || 0;
              
              return (
                <Card 
                  key={rec.id} 
                  className="bg-white border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/recommendations/${rec.id}`)}
                  data-testid={`rec-card-${rec.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            Recomendação #{rec.id.slice(0, 8)}
                          </h3>
                          <Badge variant="outline" className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-500">
                          <span>Criado em {formatDate(rec.created_at)}</span>
                          {rec.items?.length > 0 && (
                            <span className="ml-3">• {rec.items.length} prestadores</span>
                          )}
                        </div>
                      </div>

                      {/* Top Provider */}
                      {topProvider && (
                        <div className="bg-slate-50 rounded-lg p-3 min-w-[200px]">
                          <p className="text-xs text-slate-500 mb-1">Melhor opção</p>
                          <p className="font-medium text-slate-900">{topProvider.provider_name}</p>
                          <div className="flex items-center gap-3 mt-1 text-sm">
                            <span className="text-slate-600">{formatCurrency(topProvider.median_cost)}</span>
                            <span className="text-emerald-600 font-medium">
                              -{formatCurrency(topProvider.estimated_savings)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action */}
                      <Button variant="ghost" size="sm" className="shrink-0">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver detalhes
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>

                    {/* AI Summary */}
                    {rec.ai_explanation && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {rec.ai_explanation}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RecommendationsPage;
