import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auditAPI } from '../../lib/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { 
  Shield,
  Clock,
  User,
  Filter
} from 'lucide-react';

const actionLabels = {
  create: { label: 'Criação', color: 'bg-emerald-100 text-emerald-700' },
  update: { label: 'Atualização', color: 'bg-cyan-100 text-cyan-700' },
  delete: { label: 'Exclusão', color: 'bg-rose-100 text-rose-700' },
  generate_recommendation: { label: 'Recomendação', color: 'bg-purple-100 text-purple-700' },
  select_provider: { label: 'Seleção', color: 'bg-amber-100 text-amber-700' },
};

const AuditPage = () => {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('all');

  useEffect(() => {
    if (isAdmin) {
      loadLogs();
    }
  }, [isAdmin, entityFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (entityFilter !== 'all') params.entity_type = entityFilter;
      const response = await auditAPI.list(params);
      setLogs(response.data);
    } catch (error) {
      toast.error('Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
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
      <div className="space-y-6 animate-fade-in" data-testid="audit-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Auditoria
            </h1>
            <p className="text-slate-500 mt-1">
              Logs de ações realizadas no sistema
            </p>
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-48" data-testid="audit-filter">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas entidades</SelectItem>
              <SelectItem value="user">Usuários</SelectItem>
              <SelectItem value="tenant">Operadoras</SelectItem>
              <SelectItem value="provider">Prestadores</SelectItem>
              <SelectItem value="authorization">Autorizações</SelectItem>
              <SelectItem value="recommendation">Recomendações</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logs */}
        <Card className="bg-white border border-slate-200">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
              Histórico de Ações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Nenhum log encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log, index) => {
                  const action = actionLabels[log.action] || { label: log.action, color: 'bg-slate-100 text-slate-700' };
                  
                  return (
                    <div 
                      key={log.id || index}
                      className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg"
                      data-testid={`audit-log-${index}`}
                    >
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Shield className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className={action.color}>
                            {action.label}
                          </Badge>
                          <Badge variant="outline" className="bg-white">
                            {log.entity_type}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-900">
                          ID: <code className="text-xs bg-slate-200 px-1 rounded">{log.entity_id?.slice(0, 8)}</code>
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{log.user_id?.slice(0, 8)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(log.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AuditPage;
