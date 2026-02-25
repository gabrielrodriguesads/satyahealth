import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authorizationsAPI, recommendationsAPI } from '../lib/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  recommended: { label: 'Recomendado', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: Sparkles },
  approved: { label: 'Aprovado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  rejected: { label: 'Rejeitado', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
};

const AuthorizationsPage = () => {
  const [authorizations, setAuthorizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    guide_number: '',
    beneficiary_hash: '',
    beneficiary_name_hash: '',
    plan_code: '',
    plan_name: '',
    specialty: '',
    city: '',
    state: '',
    estimated_cost: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadAuthorizations();
  }, [statusFilter]);

  const loadAuthorizations = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await authorizationsAPI.list(params);
      setAuthorizations(response.data);
    } catch (error) {
      toast.error('Erro ao carregar autorizações');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.guide_number || !formData.specialty || !formData.city) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsCreating(true);
    try {
      const data = {
        ...formData,
        beneficiary_hash: formData.beneficiary_hash || `BEN-${Date.now()}`,
        beneficiary_name_hash: formData.beneficiary_name_hash || `NAME-${Date.now()}`,
        estimated_cost: parseFloat(formData.estimated_cost) || 0
      };
      await authorizationsAPI.create(data);
      toast.success('Autorização criada com sucesso!');
      setDialogOpen(false);
      setFormData({
        guide_number: '',
        beneficiary_hash: '',
        beneficiary_name_hash: '',
        plan_code: '',
        plan_name: '',
        specialty: '',
        city: '',
        state: '',
        estimated_cost: ''
      });
      loadAuthorizations();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar autorização');
    } finally {
      setIsCreating(false);
    }
  };

  const handleGenerateRecommendation = async (authId) => {
    try {
      toast.loading('Gerando recomendação...');
      const response = await recommendationsAPI.generate(authId);
      toast.dismiss();
      toast.success('Recomendação gerada com sucesso!');
      navigate(`/recommendations/${response.data.id}`);
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.detail || 'Erro ao gerar recomendação');
    }
  };

  const filteredAuthorizations = authorizations.filter(auth => {
    const matchesSearch = 
      auth.guide_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      auth.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      auth.city?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in" data-testid="authorizations-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Autorizações
            </h1>
            <p className="text-slate-500 mt-1">
              Gerencie guias TISS e gere recomendações
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800" data-testid="new-auth-btn">
                <Plus className="w-4 h-4 mr-2" />
                Nova Autorização
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Nova Autorização</DialogTitle>
                <DialogDescription>
                  Preencha os dados da guia TISS
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número da Guia *</Label>
                    <Input
                      placeholder="123456"
                      value={formData.guide_number}
                      onChange={(e) => setFormData({...formData, guide_number: e.target.value})}
                      data-testid="auth-guide-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Custo Estimado</Label>
                    <Input
                      type="number"
                      placeholder="1500.00"
                      value={formData.estimated_cost}
                      onChange={(e) => setFormData({...formData, estimated_cost: e.target.value})}
                      data-testid="auth-cost-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Código do Plano</Label>
                    <Input
                      placeholder="PLAN001"
                      value={formData.plan_code}
                      onChange={(e) => setFormData({...formData, plan_code: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome do Plano</Label>
                    <Input
                      placeholder="Plano Básico"
                      value={formData.plan_name}
                      onChange={(e) => setFormData({...formData, plan_name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Especialidade *</Label>
                  <Select
                    value={formData.specialty}
                    onValueChange={(value) => setFormData({...formData, specialty: value})}
                  >
                    <SelectTrigger data-testid="auth-specialty-select">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cardiologia">Cardiologia</SelectItem>
                      <SelectItem value="Ortopedia">Ortopedia</SelectItem>
                      <SelectItem value="Oftalmologia">Oftalmologia</SelectItem>
                      <SelectItem value="Neurologia">Neurologia</SelectItem>
                      <SelectItem value="Oncologia">Oncologia</SelectItem>
                      <SelectItem value="Cirurgia Geral">Cirurgia Geral</SelectItem>
                      <SelectItem value="Ginecologia">Ginecologia</SelectItem>
                      <SelectItem value="Pediatria">Pediatria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cidade *</Label>
                    <Input
                      placeholder="São Paulo"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      data-testid="auth-city-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => setFormData({...formData, state: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SP">SP</SelectItem>
                        <SelectItem value="RJ">RJ</SelectItem>
                        <SelectItem value="MG">MG</SelectItem>
                        <SelectItem value="RS">RS</SelectItem>
                        <SelectItem value="PR">PR</SelectItem>
                        <SelectItem value="SC">SC</SelectItem>
                        <SelectItem value="BA">BA</SelectItem>
                        <SelectItem value="PE">PE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  className="w-full bg-slate-900 hover:bg-slate-800"
                  onClick={handleCreate}
                  disabled={isCreating}
                  data-testid="auth-submit-btn"
                >
                  {isCreating ? 'Criando...' : 'Criar Autorização'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="bg-white border border-slate-200">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por guia, especialidade ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="auth-search-input"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="auth-status-filter">
                  <Filter className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="recommended">Recomendado</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
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
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : filteredAuthorizations.length === 0 ? (
            <Card className="bg-white border border-slate-200">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Nenhuma autorização encontrada
                </h3>
                <p className="text-slate-500 mb-4">
                  Crie uma nova autorização para começar
                </p>
                <Button onClick={() => setDialogOpen(true)} className="bg-slate-900 hover:bg-slate-800">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Autorização
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredAuthorizations.map((auth) => {
              const status = statusConfig[auth.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              
              return (
                <Card 
                  key={auth.id} 
                  className="bg-white border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
                  data-testid={`auth-card-${auth.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            Guia #{auth.guide_number}
                          </h3>
                          <Badge variant="outline" className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
                          <span>{auth.specialty}</span>
                          <span>{auth.city}, {auth.state}</span>
                          <span>{auth.plan_name || 'Plano não informado'}</span>
                          <span className="font-medium text-slate-700">
                            {formatCurrency(auth.estimated_cost)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {auth.status === 'pending' && (
                          <Button
                            size="sm"
                            className="bg-cyan-600 hover:bg-cyan-700"
                            onClick={() => handleGenerateRecommendation(auth.id)}
                            data-testid={`generate-rec-btn-${auth.id}`}
                          >
                            <Sparkles className="w-4 h-4 mr-1" />
                            Gerar Recomendação
                          </Button>
                        )}
                        {auth.recommendation_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/recommendations/${auth.recommendation_id}`)}
                            data-testid={`view-rec-btn-${auth.id}`}
                          >
                            Ver Recomendação
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
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

export default AuthorizationsPage;
