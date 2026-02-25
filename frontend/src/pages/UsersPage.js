import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { 
  Users,
  Mail,
  Shield,
  UserCheck,
  UserX
} from 'lucide-react';

const roleLabels = {
  satya_admin: { label: 'Admin Satya', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  operator_admin: { label: 'Admin Operadora', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  operator_user: { label: 'Usuário', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  auditor: { label: 'Auditor', color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

const UsersPage = () => {
  const { isAdmin, isSatyaAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.list();
      setUsers(response.data);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await usersAPI.toggleStatus(userId, !currentStatus);
      toast.success(`Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`);
      loadUsers();
    } catch (error) {
      toast.error('Erro ao atualizar status');
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
      <div className="space-y-6 animate-fade-in" data-testid="users-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Usuários
          </h1>
          <p className="text-slate-500 mt-1">
            Gerencie os usuários da operadora
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border border-slate-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{users.length}</p>
              <p className="text-sm text-slate-500">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {users.filter(u => u.is_active).length}
              </p>
              <p className="text-sm text-slate-500">Ativos</p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {users.filter(u => u.role === 'operator_admin' || u.role === 'satya_admin').length}
              </p>
              <p className="text-sm text-slate-500">Admins</p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {users.filter(u => u.role === 'auditor').length}
              </p>
              <p className="text-sm text-slate-500">Auditores</p>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <Card className="bg-white border border-slate-200">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
              Lista de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => {
                  const role = roleLabels[user.role] || roleLabels.operator_user;
                  
                  return (
                    <div 
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                      data-testid={`user-row-${user.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          user.is_active ? 'bg-cyan-100' : 'bg-slate-200'
                        }`}>
                          <span className={`text-sm font-semibold ${
                            user.is_active ? 'text-cyan-700' : 'text-slate-500'
                          }`}>
                            {user.name?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{user.name}</p>
                            <Badge variant="outline" className={role.color}>
                              {role.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            <Mail className="w-3.5 h-3.5" />
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {user.is_active ? (
                            <UserCheck className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <UserX className="w-4 h-4 text-slate-400" />
                          )}
                          <span className={`text-sm ${user.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {user.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={() => handleToggleStatus(user.id, user.is_active)}
                          data-testid={`user-toggle-${user.id}`}
                        />
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

export default UsersPage;
