import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { recommendationsAPI, authorizationsAPI } from '../lib/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Progress } from '../components/ui/progress';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  Sparkles,
  Building2,
  MapPin,
  TrendingDown,
  TrendingUp,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Brain,
  DollarSign,
  Users,
  Target,
  Scale,
  X,
  ArrowRight,
  Star,
  Minus,
  Plus,
  Award
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
  
  // Comparison state
  const [compareList, setCompareList] = useState([]);
  const [compareSheetOpen, setCompareSheetOpen] = useState(false);

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
      setCompareSheetOpen(false);
      setCompareList([]);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao selecionar prestador');
    } finally {
      setIsSelecting(false);
    }
  };

  const toggleCompare = (provider) => {
    if (compareList.find(p => p.provider_id === provider.provider_id)) {
      setCompareList(compareList.filter(p => p.provider_id !== provider.provider_id));
    } else if (compareList.length < 4) {
      setCompareList([...compareList, provider]);
    } else {
      toast.warning('Máximo de 4 prestadores para comparação');
    }
  };

  const isInCompareList = (providerId) => {
    return compareList.some(p => p.provider_id === providerId);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Calculate comparison metrics
  const getComparisonMetrics = () => {
    if (compareList.length === 0) return null;
    
    const costs = compareList.map(p => p.median_cost);
    const savings = compareList.map(p => p.estimated_savings);
    const cases = compareList.map(p => p.case_count);
    const qualities = compareList.map(p => p.quality_score);
    
    return {
      minCost: Math.min(...costs),
      maxCost: Math.max(...costs),
      minSavings: Math.min(...savings),
      maxSavings: Math.max(...savings),
      minCases: Math.min(...cases),
      maxCases: Math.max(...cases),
      minQuality: Math.min(...qualities),
      maxQuality: Math.max(...qualities)
    };
  };

  const metrics = getComparisonMetrics();

  // Get metric indicator (best, worst, neutral)
  const getMetricIndicator = (value, min, max, isLowerBetter = true) => {
    if (min === max) return 'neutral';
    if (isLowerBetter) {
      return value === min ? 'best' : value === max ? 'worst' : 'neutral';
    }
    return value === max ? 'best' : value === min ? 'worst' : 'neutral';
  };

  const getIndicatorColor = (indicator) => {
    switch (indicator) {
      case 'best': return 'text-emerald-600 bg-emerald-50';
      case 'worst': return 'text-rose-600 bg-rose-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getIndicatorIcon = (indicator) => {
    switch (indicator) {
      case 'best': return <TrendingUp className="w-3 h-3" />;
      case 'worst': return <TrendingDown className="w-3 h-3" />;
      default: return <Minus className="w-3 h-3" />;
    }
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
          <div className="flex items-center gap-2">
            {recommendation?.status === 'selected' && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Prestador Selecionado
              </Badge>
            )}
          </div>
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

        {/* Comparison Bar - Fixed at bottom when providers selected */}
        {compareList.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-40 bg-white border-t border-slate-200 shadow-lg animate-slide-up">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <Scale className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {compareList.length} prestador{compareList.length > 1 ? 'es' : ''} selecionado{compareList.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-slate-500">Selecione até 4 para comparar</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-1">
                    {compareList.map((p, i) => (
                      <Badge key={p.provider_id} variant="outline" className="bg-white">
                        #{p.rank}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCompareList([])}
                  >
                    Limpar
                  </Button>
                  <Button
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-700"
                    onClick={() => setCompareSheetOpen(true)}
                    data-testid="open-comparison-btn"
                  >
                    <Scale className="w-4 h-4 mr-2" />
                    Comparar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Provider Cards */}
        <div className={compareList.length > 0 ? 'pb-20' : ''}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Top {recommendation?.items?.length || 0} Prestadores Recomendados
            </h2>
            {recommendation?.items?.length > 1 && recommendation?.status !== 'selected' && (
              <p className="text-sm text-slate-500">
                <Scale className="w-4 h-4 inline mr-1" />
                Selecione prestadores para comparar
              </p>
            )}
          </div>
          
          <div className="space-y-4">
            {recommendation?.items?.map((item, index) => {
              const isSelected = recommendation.selected_provider_id === item.provider_id;
              const isTopChoice = index === 0;
              const isComparing = isInCompareList(item.provider_id);
              
              return (
                <Card 
                  key={item.provider_id}
                  className={`provider-card bg-white border transition-all ${
                    isSelected 
                      ? 'border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/30' 
                      : isComparing
                        ? 'border-cyan-500 ring-1 ring-cyan-500/20 bg-cyan-50/30'
                        : 'border-slate-200 hover:border-cyan-500/50'
                  }`}
                  data-testid={`provider-card-${item.provider_id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      {/* Compare Checkbox */}
                      {recommendation?.status !== 'selected' && (
                        <div className="flex items-center">
                          <Checkbox
                            checked={isComparing}
                            onCheckedChange={() => toggleCompare(item)}
                            className="w-5 h-5 border-2"
                            data-testid={`compare-checkbox-${item.provider_id}`}
                          />
                        </div>
                      )}

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
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                              {item.provider_name}
                            </h3>
                            {isTopChoice && (
                              <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200">
                                <Award className="w-3 h-3 mr-1" />
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
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
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

        {/* Comparison Sheet */}
        <Sheet open={compareSheetOpen} onOpenChange={setCompareSheetOpen}>
          <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle style={{ fontFamily: 'Manrope, sans-serif' }} className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-cyan-600" />
                Comparação de Prestadores
              </SheetTitle>
              <SheetDescription>
                Compare os prestadores selecionados lado a lado
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 space-y-6" data-testid="comparison-sheet">
              {/* Comparison Header */}
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${compareList.length}, 1fr)` }}>
                {compareList.map((provider, index) => (
                  <Card key={provider.provider_id} className={`relative ${index === 0 ? 'border-cyan-500 bg-cyan-50/30' : 'border-slate-200'}`}>
                    <CardContent className="p-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-6 w-6 p-0"
                        onClick={() => toggleCompare(provider)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2 ${
                        index === 0 ? 'bg-cyan-100' : 'bg-slate-100'
                      }`}>
                        <span className={`font-bold ${index === 0 ? 'text-cyan-700' : 'text-slate-600'}`}>
                          #{provider.rank}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-900 text-sm line-clamp-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {provider.provider_name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">{provider.specialty}</p>
                      {index === 0 && (
                        <Badge className="mt-2 bg-cyan-100 text-cyan-700 border-cyan-200 text-xs">
                          Melhor opção
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Comparison Metrics */}
              {metrics && (
                <div className="space-y-4">
                  {/* Cost Comparison */}
                  <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-slate-500" />
                        Custo Mediano
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${compareList.length}, 1fr)` }}>
                        {compareList.map((provider) => {
                          const indicator = getMetricIndicator(provider.median_cost, metrics.minCost, metrics.maxCost, true);
                          return (
                            <div key={provider.provider_id} className="text-center">
                              <p className="text-xl font-bold text-slate-900">{formatCurrency(provider.median_cost)}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                {formatCurrency(provider.p25_cost)} - {formatCurrency(provider.p75_cost)}
                              </p>
                              <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-medium ${getIndicatorColor(indicator)}`}>
                                {getIndicatorIcon(indicator)}
                                {indicator === 'best' ? 'Menor custo' : indicator === 'worst' ? 'Maior custo' : 'Intermediário'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Savings Comparison */}
                  <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-emerald-500" />
                        Economia Estimada
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${compareList.length}, 1fr)` }}>
                        {compareList.map((provider) => {
                          const indicator = getMetricIndicator(provider.estimated_savings, metrics.minSavings, metrics.maxSavings, false);
                          const percentage = authorization?.estimated_cost > 0 
                            ? ((provider.estimated_savings / authorization.estimated_cost) * 100).toFixed(0)
                            : 0;
                          return (
                            <div key={provider.provider_id} className="text-center">
                              <p className="text-xl font-bold text-emerald-600">{formatCurrency(provider.estimated_savings)}</p>
                              <p className="text-xs text-slate-500 mt-1">{percentage}% de economia</p>
                              <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-medium ${getIndicatorColor(indicator)}`}>
                                {getIndicatorIcon(indicator)}
                                {indicator === 'best' ? 'Maior economia' : indicator === 'worst' ? 'Menor economia' : 'Intermediário'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cases & Quality */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Cases */}
                    <Card className="border-slate-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-500" />
                          Casos Analisados
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${compareList.length}, 1fr)` }}>
                          {compareList.map((provider) => {
                            const indicator = getMetricIndicator(provider.case_count, metrics.minCases, metrics.maxCases, false);
                            const progress = metrics.maxCases > 0 ? (provider.case_count / metrics.maxCases) * 100 : 0;
                            return (
                              <div key={provider.provider_id} className="text-center">
                                <p className="text-lg font-bold text-slate-900">{provider.case_count}</p>
                                <Progress value={progress} className="h-1.5 mt-2" />
                                <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-medium ${getIndicatorColor(indicator)}`}>
                                  {indicator === 'best' ? 'Mais experiência' : indicator === 'worst' ? 'Menos casos' : 'Moderado'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quality */}
                    <Card className="border-slate-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          Score de Qualidade
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${compareList.length}, 1fr)` }}>
                          {compareList.map((provider) => {
                            const indicator = getMetricIndicator(provider.quality_score, metrics.minQuality, metrics.maxQuality, false);
                            return (
                              <div key={provider.provider_id} className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <p className="text-lg font-bold text-slate-900">{provider.quality_score.toFixed(1)}</p>
                                  <span className="text-xs text-slate-500">/10</span>
                                </div>
                                <div className="flex justify-center mt-2">
                                  {[1,2,3,4,5].map(star => (
                                    <Star 
                                      key={star} 
                                      className={`w-3 h-3 ${star <= Math.round(provider.quality_score / 2) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                                    />
                                  ))}
                                </div>
                                <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-medium ${getIndicatorColor(indicator)}`}>
                                  {indicator === 'best' ? 'Maior qualidade' : indicator === 'worst' ? 'Menor qualidade' : 'Intermediário'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Eligibility Status */}
                  <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-slate-500" />
                        Elegibilidade
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${compareList.length}, 1fr)` }}>
                        {compareList.map((provider) => (
                          <div key={provider.provider_id} className="text-center">
                            {provider.is_eligible ? (
                              <div className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm font-medium">Elegível</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-sm font-medium">Não elegível</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${compareList.length}, 1fr)` }}>
                    {compareList.map((provider, index) => (
                      <Button
                        key={provider.provider_id}
                        className={index === 0 ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-slate-900 hover:bg-slate-800'}
                        onClick={() => handleSelectProvider(provider)}
                        data-testid={`compare-select-btn-${provider.provider_id}`}
                      >
                        Selecionar #{provider.rank}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Recommendation */}
              {compareList.length >= 2 && (
                <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-100">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Brain className="w-5 h-5 text-cyan-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Recomendação da Análise
                        </h4>
                        <p className="text-sm text-slate-700">
                          Com base na comparação, <strong>{compareList[0]?.provider_name}</strong> apresenta 
                          o melhor custo-benefício com economia de {formatCurrency(compareList[0]?.estimated_savings)} e 
                          {' '}{compareList[0]?.case_count} casos de histórico. 
                          {compareList[0]?.quality_score >= 8 && ' Alta avaliação de qualidade.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
};

export default RecommendationDetailPage;
