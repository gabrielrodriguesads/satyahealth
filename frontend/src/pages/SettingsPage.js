import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { configAPI } from '../../lib/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { toast } from 'sonner';
import { 
  Settings,
  Sliders,
  DollarSign,
  Save
} from 'lucide-react';

const SettingsPage = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    similarity_config: {
      same_procedure: true,
      same_specialty: true,
      same_city: true,
      same_plan: true,
      time_window_months: 12,
      procedure_weight: 0.4,
      specialty_weight: 0.2,
      city_weight: 0.2,
      plan_weight: 0.2
    },
    cost_config: {
      calculation_method: 'median',
      time_window_months: 12,
      min_cases: 10,
      outlier_removal: true,
      outlier_percentile: 5.0
    }
  });

  useEffect(() => {
    if (isAdmin) {
      loadConfig();
    }
  }, [isAdmin]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await configAPI.get();
      if (response.data) {
        setConfig({
          similarity_config: response.data.similarity_config || config.similarity_config,
          cost_config: response.data.cost_config || config.cost_config
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await configAPI.update(config);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Card className="bg-white border border-slate-200">
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Acesso Restrito
            </h3>
            <p className="text-slate-500">
              Esta página é exclusiva para administradores
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in" data-testid="settings-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Configurações
            </h1>
            <p className="text-slate-500 mt-1">
              Configure os parâmetros do motor de recomendação
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-slate-900 hover:bg-slate-800"
            data-testid="save-config-btn"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </span>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Similarity Config */}
          <Card className="bg-white border border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Sliders className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Configuração de Similaridade
                  </CardTitle>
                  <CardDescription>
                    Critérios para buscar casos semelhantes
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Criteria Toggles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mesmo Procedimento</Label>
                    <p className="text-xs text-slate-500">Comparar casos com mesmo código de procedimento</p>
                  </div>
                  <Switch
                    checked={config.similarity_config.same_procedure}
                    onCheckedChange={(checked) => setConfig({
                      ...config,
                      similarity_config: { ...config.similarity_config, same_procedure: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mesma Especialidade</Label>
                    <p className="text-xs text-slate-500">Filtrar por especialidade médica</p>
                  </div>
                  <Switch
                    checked={config.similarity_config.same_specialty}
                    onCheckedChange={(checked) => setConfig({
                      ...config,
                      similarity_config: { ...config.similarity_config, same_specialty: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mesma Cidade</Label>
                    <p className="text-xs text-slate-500">Restringir à mesma localidade</p>
                  </div>
                  <Switch
                    checked={config.similarity_config.same_city}
                    onCheckedChange={(checked) => setConfig({
                      ...config,
                      similarity_config: { ...config.similarity_config, same_city: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mesmo Plano</Label>
                    <p className="text-xs text-slate-500">Considerar apenas mesmo tipo de plano</p>
                  </div>
                  <Switch
                    checked={config.similarity_config.same_plan}
                    onCheckedChange={(checked) => setConfig({
                      ...config,
                      similarity_config: { ...config.similarity_config, same_plan: checked }
                    })}
                  />
                </div>
              </div>

              {/* Time Window */}
              <div className="space-y-2">
                <Label>Janela Temporal (meses)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[config.similarity_config.time_window_months]}
                    onValueChange={([value]) => setConfig({
                      ...config,
                      similarity_config: { ...config.similarity_config, time_window_months: value }
                    })}
                    min={3}
                    max={24}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium text-slate-900 w-12 text-right">
                    {config.similarity_config.time_window_months}
                  </span>
                </div>
                <p className="text-xs text-slate-500">Considerar casos dos últimos N meses</p>
              </div>
            </CardContent>
          </Card>

          {/* Cost Config */}
          <Card className="bg-white border border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Configuração de Custo
                  </CardTitle>
                  <CardDescription>
                    Parâmetros para cálculo de custo por prestador
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Calculation Method */}
              <div className="space-y-2">
                <Label>Método de Cálculo</Label>
                <Select
                  value={config.cost_config.calculation_method}
                  onValueChange={(value) => setConfig({
                    ...config,
                    cost_config: { ...config.cost_config, calculation_method: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="median">Mediana</SelectItem>
                    <SelectItem value="average">Média</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Mediana é mais robusta a outliers</p>
              </div>

              {/* Min Cases */}
              <div className="space-y-2">
                <Label>Mínimo de Casos</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[config.cost_config.min_cases]}
                    onValueChange={([value]) => setConfig({
                      ...config,
                      cost_config: { ...config.cost_config, min_cases: value }
                    })}
                    min={5}
                    max={50}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium text-slate-900 w-12 text-right">
                    {config.cost_config.min_cases}
                  </span>
                </div>
                <p className="text-xs text-slate-500">Número mínimo de casos para considerar um prestador</p>
              </div>

              {/* Outlier Removal */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Remover Outliers</Label>
                  <p className="text-xs text-slate-500">Excluir valores extremos do cálculo</p>
                </div>
                <Switch
                  checked={config.cost_config.outlier_removal}
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    cost_config: { ...config.cost_config, outlier_removal: checked }
                  })}
                />
              </div>

              {/* Outlier Percentile */}
              {config.cost_config.outlier_removal && (
                <div className="space-y-2">
                  <Label>Percentil de Corte (%)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[config.cost_config.outlier_percentile]}
                      onValueChange={([value]) => setConfig({
                        ...config,
                        cost_config: { ...config.cost_config, outlier_percentile: value }
                      })}
                      min={1}
                      max={10}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium text-slate-900 w-12 text-right">
                      {config.cost_config.outlier_percentile}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Remove top/bottom N% dos valores</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <Card className="bg-slate-50 border border-slate-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Como funciona o motor de recomendação
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-sm text-slate-600">
              <div>
                <p className="font-medium text-slate-900 mb-1">1. Busca de Similares</p>
                <p>O sistema busca contas pagas com características semelhantes à autorização atual.</p>
              </div>
              <div>
                <p className="font-medium text-slate-900 mb-1">2. Cálculo de Custo</p>
                <p>Para cada prestador, calcula-se o custo típico baseado no histórico.</p>
              </div>
              <div>
                <p className="font-medium text-slate-900 mb-1">3. Ranking</p>
                <p>Os prestadores são ordenados por score considerando custo, qualidade e elegibilidade.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
