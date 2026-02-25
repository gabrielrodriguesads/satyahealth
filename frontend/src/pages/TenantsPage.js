import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { tenantsAPI, usersAPI } from '../../lib/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Label } from '../components/ui/label';
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
  ClipboardList, 
  Plus, 
  Search,
  Building2,
  Mail,
  Phone,
  CheckCircle,
  XCircle
} from 'lucide-react';

const TenantsPage = () => {
  const { isSatyaAdmin } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    if (isSatyaAdmin) {
      loadTenants();
    }
  }, [isSatyaAdmin]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const response = await tenantsAPI.list();
      setTenants(response.data);
    } catch (error) {
      toast.error('Erro ao carregar operadoras');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.cnpj || !formData.email) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsCreating(true);
    try {
      await tenantsAPI.create(formData);
      toast.success('Operadora criada com sucesso!');
      setDialogOpen(false);
      setFormData({ name: '', cnpj: '', email: '', phone: '', address: '' });
      loadTenants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar operadora');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.cnpj?.includes(searchTerm) ||
    tenant.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isSatyaAdmin) {
    return (
      <DashboardLayout>
        <Card className="bg-white border border-slate-200">
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Acesso Restrito
            </h3>
            <p className="text-slate-500">
              Esta página é exclusiva para administradores Satya
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in" data-testid="tenants-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Operadoras
            </h1>
            <p className="text-slate-500 mt-1">
              Gerencie as operadoras de saúde do sistema
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800" data-testid="new-tenant-btn">
                <Plus className="w-4 h-4 mr-2" />
                Nova Operadora
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Nova Operadora</DialogTitle>
                <DialogDescription>
                  Cadastre uma nova operadora de saúde
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome da Operadora *</Label>
                  <Input
                    placeholder="Operadora Saúde Total"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    data-testid="tenant-name-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CNPJ *</Label>
                    <Input
                      placeholder="00.000.000/0001-00"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                      data-testid="tenant-cnpj-input"
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
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    placeholder="contato@operadora.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    data-testid="tenant-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input
                    placeholder="Av. Brasil, 1000, São Paulo - SP"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <Button 
                  className="w-full bg-slate-900 hover:bg-slate-800"
                  onClick={handleCreate}
                  disabled={isCreating}
                  data-testid="tenant-submit-btn"
                >
                  {isCreating ? 'Criando...' : 'Criar Operadora'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card className="bg-white border border-slate-200">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome, CNPJ ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="tenant-search-input"
              />
            </div>
          </CardContent>
        </Card>

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
          ) : filteredTenants.length === 0 ? (
            <Card className="md:col-span-2 xl:col-span-3 bg-white border border-slate-200">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <ClipboardList className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Nenhuma operadora encontrada
                </h3>
                <p className="text-slate-500 mb-4">
                  Cadastre a primeira operadora do sistema
                </p>
                <Button onClick={() => setDialogOpen(true)} className="bg-slate-900 hover:bg-slate-800">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Operadora
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredTenants.map((tenant) => (
              <Card 
                key={tenant.id} 
                className="bg-white border border-slate-200 hover:shadow-md transition-shadow"
                data-testid={`tenant-card-${tenant.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        tenant.is_active ? 'bg-cyan-100' : 'bg-slate-100'
                      }`}>
                        <Building2 className={`w-5 h-5 ${
                          tenant.is_active ? 'text-cyan-600' : 'text-slate-500'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 line-clamp-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          {tenant.name}
                        </h3>
                        <p className="text-xs text-slate-500">{tenant.cnpj}</p>
                      </div>
                    </div>
                    {tenant.is_active ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500">
                        <XCircle className="w-3 h-3 mr-1" />
                        Inativo
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1.5 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{tenant.email}</span>
                    </div>
                    {tenant.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{tenant.phone}</span>
                      </div>
                    )}
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

export default TenantsPage;
