import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { recommendationsAPI, authorizationsAPI } from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Textarea } from '../ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  Sparkles,
  Building2,
  MapPin,
  TrendingDown,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Brain,
  DollarSign,
  Users,
  Target
} from 'lucide-react';

const RecommendationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recommendation, setRecommendation] = useState(null);
  const [authorization, setAuthorization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectionReason, setSelectionReason] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const recResponse = await recommendationsAPI.get(id);
      setRecommendation(recResponse.data);
      
      if (recResponse.data.authorization_id) {
        const authResponse = await authorizationsAPI.get(recResponse.data.authorization_id);
        setAuthorization(authResponse.data);
      }
    } catch (error) {
      toast.error('Erro ao carregar recomendação');
      navigate('/recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProvider = (provider) => {
    setSelectedProvider(provider);
    setDialogOpen(true);
  };

  const confirmSelection = async () => {
    if (!selectedProvider) return;

    setIsSelecting(true);
    try {
      await recommendationsAPI.selectProvider(id, selectedProvider.provider_id, selectionReason);
      toast.success('Prestador selecionado com sucesso!');
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao selecionar prestador');
    } finally {
      setIsSelecting(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-48 w-full" />
          <div className="grid gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in" data-testid="recommendation-detail-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/recommendations')}
            className="w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Recomendação de Prestadores
            </h1>
            <p className="text-slate-500">
              Guia #{authorization?.guide_number} • {authorization?.specialty}
            </p>
          </div>
          {recommendation?.status === 'selected' && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Prestador Selecionado
            </Badge>
          )}
        </div>

        {/* Authorization Summary */}
        <Card className="bg-white border border-slate-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-1">Especialidade</p>
                <p className="font-medium text-slate-900">{authorization?.specialty}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Localização</p>
                <p className="font-medium text-slate-900">{authorization?.city}, {authorization?.state}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Plano</p>
                <p className="font-medium text-slate-900">{authorization?.plan_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Custo Estimado</p>
                <p className="font-semibold text-slate-900">{formatCurrency(authorization?.estimated_cost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Explanation */}
        {recommendation?.ai_explanation && (
          <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <Brain className="w-6 h-6 text-cyan-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Análise Inteligente
                  </h3>
                  <p className="text-slate-700 leading-relaxed">
                    {recommendation.ai_explanation}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Provider Cards */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Top {recommendation?.items?.length || 0} Prestadores Recomendados
          </h2>
          
          <div className="space-y-4">
            {recommendation?.items?.map((item, index) => {
              const isSelected = recommendation.selected_provider_id === item.provider_id;
              const isTopChoice = index === 0;
              
              return (
                <Card 
                  key={item.provider_id}
                  className={`provider-card bg-white border transition-all ${
                    isSelected 
                      ? 'border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/30' 
                      : 'border-slate-200 hover:border-cyan-500/50'
                  }`}
                  data-testid={`provider-card-${item.provider_id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      {/* Rank & Provider Info */}
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isTopChoice ? 'bg-cyan-100' : 'bg-slate-100'
                        }`}>
                          <span className={`text-lg font-bold ${
                            isTopChoice ? 'text-cyan-700' : 'text-slate-600'
                          }`}>
                            #{item.rank}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                              {item.provider_name}
                            </h3>
                            {isTopChoice && (
                              <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200">
                                Melhor opção
                              </Badge>
                            )}
                            {isSelected && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Selecionado
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {item.specialty}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {item.city}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <DollarSign className="w-4 h-4 text-slate-400" />
                          </div>
                          <p className="text-lg font-bold text-slate-900">
                            {formatCurrency(item.median_cost)}
                          </p>
                          <p className="text-xs text-slate-500">Custo mediano</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {formatCurrency(item.p25_cost)} - {formatCurrency(item.p75_cost)}
                          </p>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Users className="w-4 h-4 text-slate-400" />
                          </div>
                          <p className="text-lg font-bold text-slate-900">{item.case_count}</p>
                          <p className="text-xs text-slate-500">Casos</p>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Target className="w-4 h-4 text-slate-400" />
                          </div>
                          <p className="text-lg font-bold text-slate-900">{item.quality_score.toFixed(1)}</p>
                          <p className="text-xs text-slate-500">Qualidade</p>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <TrendingDown className="w-4 h-4 text-emerald-500" />
                          </div>
                          <p className="text-lg font-bold text-emerald-600">
                            {formatCurrency(item.estimated_savings)}
                          </p>
                          <p className="text-xs text-slate-500">Economia</p>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex flex-col gap-2">
                        {!isSelected && recommendation.status !== 'selected' && (
                          <Button
                            className="bg-slate-900 hover:bg-slate-800"
                            onClick={() => handleSelectProvider(item)}
                            data-testid={`select-provider-btn-${item.provider_id}`}
                          >
                            Selecionar
                          </Button>
                        )}
                        {isSelected && (
                          <div className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">Selecionado</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Justification */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium text-slate-700">Justificativa: </span>
                        {item.justification}
                      </p>
                    </div>

                    {/* Eligibility Warning */}
                    {!item.is_eligible && (
                      <div className="mt-3 flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm">Prestador fora da rede elegível</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Empty State */}
        {(!recommendation?.items || recommendation.items.length === 0) && (
          <Card className="bg-white border border-slate-200">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Nenhum prestador recomendado
              </h3>
              <p className="text-slate-500">
                Não foram encontrados prestadores elegíveis com histórico suficiente
              </p>
            </CardContent>
          </Card>
        )}

        {/* Selection Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
                Confirmar Seleção
              </DialogTitle>
              <DialogDescription>
                Você está selecionando o prestador <strong>{selectedProvider?.provider_name}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Custo mediano</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(selectedProvider?.median_cost)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Economia estimada</p>
                    <p className="font-semibold text-emerald-600">{formatCurrency(selectedProvider?.estimated_savings)}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Motivo da seleção (opcional)
                </label>
                <Textarea
                  placeholder="Descreva o motivo da escolha..."
                  value={selectionReason}
                  onChange={(e) => setSelectionReason(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={confirmSelection}
                  disabled={isSelecting}
                  data-testid="confirm-selection-btn"
                >
                  {isSelecting ? 'Confirmando...' : 'Confirmar Seleção'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default RecommendationDetailPage;
