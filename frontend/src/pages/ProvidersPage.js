import React, { useState, useEffect } from 'react';
import { providersAPI } from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter,
  MapPin,
  Phone,
  CheckCircle,
  XCircle,
  Star
} from 'lucide-react';

const ProvidersPage = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [eligibilityFilter, setEligibilityFilter] = useState('all');
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    specialty: '',
    city: '',
    state: '',
    address: '',
    phone: ''
  });

  useEffect(() => {
    loadProviders();
  }, [specialtyFilter, eligibilityFilter]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (specialtyFilter !== 'all') params.specialty = specialtyFilter;
      if (eligibilityFilter !== 'all') params.is_eligible = eligibilityFilter === 'eligible';
      const response = await providersAPI.list(params);
      setProviders(response.data);
    } catch (error) {
      toast.error('Erro ao carregar prestadores');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.cnpj || !formData.specialty || !formData.city) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsCreating(true);
    try {
      await providersAPI.create(formData);
      toast.success('Prestador criado com sucesso!');
      setDialogOpen(false);
      setFormData({
        name: '',
        cnpj: '',
        specialty: '',
        city: '',
        state: '',
        address: '',
        phone: ''
      });
      loadProviders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar prestador');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleEligibility = async (providerId, currentStatus) => {
    try {
      await providersAPI.updateEligibility(providerId, !currentStatus);
      toast.success(`Prestador ${!currentStatus ? 'habilitado' : 'desabilitado'} com sucesso`);
      loadProviders();
    } catch (error) {
      toast.error('Erro ao atualizar elegibilidade');
    }
  };

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = 
      provider.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.cnpj?.includes(searchTerm);
    return matchesSearch;
  });

  const specialties = [...new Set(providers.map(p => p.specialty).filter(Boolean))];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in" data-testid="providers-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Prestadores
            </h1>
            <p className="text-slate-500 mt-1">
              Gerencie a rede de prestadores elegíveis
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800" data-testid="new-provider-btn">
                <Plus className="w-4 h-4 mr-2" />
                Novo Prestador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Novo Prestador</DialogTitle>
                <DialogDescription>
                  Adicione um novo prestador à rede
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    placeholder="Hospital São Paulo"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    data-testid="provider-name-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CNPJ *</Label>
                    <Input
                      placeholder="00.000.000/0001-00"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                      data-testid="provider-cnpj-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Especialidade *</Label>
                  <Select
                    value={formData.specialty}
                    onValueChange={(value) => setFormData({...formData, specialty: value})}
                  >
                    <SelectTrigger data-testid="provider-specialty-select">
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
                      data-testid="provider-city-input"
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
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input
                    placeholder="Av. Paulista, 1000"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <Button 
                  className="w-full bg-slate-900 hover:bg-slate-800"
                  onClick={handleCreate}
                  disabled={isCreating}
                  data-testid="provider-submit-btn"
                >
                  {isCreating ? 'Criando...' : 'Criar Prestador'}
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
                  placeholder="Buscar por nome, cidade ou CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="provider-search-input"
                />
              </div>
              <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Especialidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas especialidades</SelectItem>
                  {specialties.map(spec => (
                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={eligibilityFilter} onValueChange={setEligibilityFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Elegibilidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="eligible">Elegíveis</SelectItem>
                  <SelectItem value="ineligible">Não elegíveis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border border-slate-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{providers.length}</p>
              <p className="text-sm text-slate-500">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {providers.filter(p => p.is_eligible).length}
              </p>
              <p className="text-sm text-slate-500">Elegíveis</p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{specialties.length}</p>
              <p className="text-sm text-slate-500">Especialidades</p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {[...new Set(providers.map(p => p.city))].length}
              </p>
              <p className="text-sm text-slate-500">Cidades</p>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <Card key={i} className="bg-white border border-slate-200">
                <CardContent className="p-4">
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))
          ) : filteredProviders.length === 0 ? (
            <Card className="md:col-span-2 xl:col-span-3 bg-white border border-slate-200">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Nenhum prestador encontrado
                </h3>
                <p className="text-slate-500 mb-4">
                  Adicione prestadores à rede ou ajuste os filtros
                </p>
                <Button onClick={() => setDialogOpen(true)} className="bg-slate-900 hover:bg-slate-800">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Prestador
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredProviders.map((provider) => (
              <Card 
                key={provider.id} 
                className="bg-white border border-slate-200 hover:shadow-md transition-shadow"
                data-testid={`provider-card-${provider.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        provider.is_eligible ? 'bg-emerald-100' : 'bg-slate-100'
                      }`}>
                        <Building2 className={`w-5 h-5 ${
                          provider.is_eligible ? 'text-emerald-600' : 'text-slate-500'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 line-clamp-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          {provider.name}
                        </h3>
                        <p className="text-xs text-slate-500">{provider.cnpj}</p>
                      </div>
                    </div>
                    <Switch
                      checked={provider.is_eligible}
                      onCheckedChange={() => handleToggleEligibility(provider.id, provider.is_eligible)}
                      data-testid={`provider-toggle-${provider.id}`}
                    />
                  </div>

                  <div className="space-y-2 mb-3">
                    <Badge variant="outline" className="bg-slate-50">
                      {provider.specialty}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{provider.city}, {provider.state}</span>
                    </div>
                    {provider.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{provider.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-medium text-slate-700">
                        {provider.quality_score?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {provider.is_eligible ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Elegível
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <XCircle className="w-3.5 h-3.5" />
                          Não elegível
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProvidersPage;
