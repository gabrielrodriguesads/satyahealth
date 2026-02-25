import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { importAPI } from '../lib/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { 
  Upload,
  FileUp,
  Building2,
  FileText,
  CheckCircle,
  AlertCircle,
  Download
} from 'lucide-react';

const ImportPage = () => {
  const { isAdmin } = useAuth();
  const [providersLoading, setProvidersLoading] = useState(false);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [results, setResults] = useState({ providers: null, claims: null });
  const providersInputRef = useRef(null);
  const claimsInputRef = useRef(null);

  const handleProvidersImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProvidersLoading(true);
    try {
      const response = await importAPI.providers(file);
      setResults(prev => ({ ...prev, providers: response.data }));
      if (response.data.success) {
        toast.success(`${response.data.records_imported} prestadores importados!`);
      } else {
        toast.warning(`Importado com erros: ${response.data.records_failed} falhas`);
      }
    } catch (error) {
      toast.error('Erro ao importar prestadores');
    } finally {
      setProvidersLoading(false);
      if (providersInputRef.current) providersInputRef.current.value = '';
    }
  };

  const handleClaimsImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setClaimsLoading(true);
    try {
      const response = await importAPI.claims(file);
      setResults(prev => ({ ...prev, claims: response.data }));
      if (response.data.success) {
        toast.success(`${response.data.records_imported} contas importadas!`);
      } else {
        toast.warning(`Importado com erros: ${response.data.records_failed} falhas`);
      }
    } catch (error) {
      toast.error('Erro ao importar contas');
    } finally {
      setClaimsLoading(false);
      if (claimsInputRef.current) claimsInputRef.current.value = '';
    }
  };

  const downloadTemplate = (type) => {
    let content = '';
    let filename = '';

    if (type === 'providers') {
      content = 'name,cnpj,specialty,city,state,address,phone\nHospital São Paulo,12.345.678/0001-00,Cardiologia,São Paulo,SP,"Av. Paulista, 1000",(11) 99999-9999';
      filename = 'template_prestadores.csv';
    } else {
      content = 'claim_number,provider_id,beneficiary_id,plan_code,plan_name,specialty,city,state,total_authorized,total_paid,total_gloss,payment_date,service_date\nCLM001,prov-123,BEN001,PLAN01,Plano Básico,Cardiologia,São Paulo,SP,1500.00,1400.00,100.00,2024-01-15,2024-01-10';
      filename = 'template_contas.csv';
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
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
      <div className="space-y-6 animate-fade-in" data-testid="import-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Importar Dados
          </h1>
          <p className="text-slate-500 mt-1">
            Importe prestadores e contas médicas via CSV
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Import Providers */}
          <Card className="bg-white border border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Prestadores
                  </CardTitle>
                  <CardDescription>
                    Importe lista de prestadores da rede
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-cyan-400 transition-colors">
                <FileUp className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                <p className="text-sm text-slate-600 mb-3">
                  Arraste um arquivo CSV ou clique para selecionar
                </p>
                <input
                  ref={providersInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleProvidersImport}
                  className="hidden"
                  id="providers-upload"
                  data-testid="providers-upload-input"
                />
                <Button
                  variant="outline"
                  onClick={() => providersInputRef.current?.click()}
                  disabled={providersLoading}
                  data-testid="providers-upload-btn"
                >
                  {providersLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                      Importando...
                    </span>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Selecionar CSV
                    </>
                  )}
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => downloadTemplate('providers')}
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar template
              </Button>

              {results.providers && (
                <div className={`p-4 rounded-lg ${results.providers.success ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {results.providers.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    )}
                    <span className={`text-sm font-medium ${results.providers.success ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {results.providers.success ? 'Importação concluída' : 'Importação com erros'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p>{results.providers.records_imported} registros importados</p>
                    {results.providers.records_failed > 0 && (
                      <p>{results.providers.records_failed} registros com erro</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Import Claims */}
          <Card className="bg-white border border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Contas Médicas
                  </CardTitle>
                  <CardDescription>
                    Importe histórico de contas pagas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-emerald-400 transition-colors">
                <FileUp className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                <p className="text-sm text-slate-600 mb-3">
                  Arraste um arquivo CSV ou clique para selecionar
                </p>
                <input
                  ref={claimsInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleClaimsImport}
                  className="hidden"
                  id="claims-upload"
                  data-testid="claims-upload-input"
                />
                <Button
                  variant="outline"
                  onClick={() => claimsInputRef.current?.click()}
                  disabled={claimsLoading}
                  data-testid="claims-upload-btn"
                >
                  {claimsLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                      Importando...
                    </span>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Selecionar CSV
                    </>
                  )}
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => downloadTemplate('claims')}
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar template
              </Button>

              {results.claims && (
                <div className={`p-4 rounded-lg ${results.claims.success ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {results.claims.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    )}
                    <span className={`text-sm font-medium ${results.claims.success ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {results.claims.success ? 'Importação concluída' : 'Importação com erros'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p>{results.claims.records_imported} registros importados</p>
                    {results.claims.records_failed > 0 && (
                      <p>{results.claims.records_failed} registros com erro</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="bg-slate-50 border border-slate-200">
          <CardHeader>
            <CardTitle className="text-base" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Instruções de Importação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-600">
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Prestadores</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Colunas obrigatórias: name, cnpj, specialty, city, state</li>
                  <li>Colunas opcionais: address, phone</li>
                  <li>Formato de data: YYYY-MM-DD</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Contas Médicas</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Colunas obrigatórias: claim_number, provider_id, beneficiary_id</li>
                  <li>Valores monetários sem separador de milhar</li>
                  <li>Datas no formato ISO: 2024-01-15</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ImportPage;
