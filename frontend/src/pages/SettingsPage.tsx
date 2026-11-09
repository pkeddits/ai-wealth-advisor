import { useState } from 'react';
import { User, Shield, Bell, Palette, Database, LogOut, Save, Trash2, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth';
import { Card, CardBody, Button, Input } from '../components/common';
import React from 'react';
import clsx from 'clsx';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  riskProfile: 'conservador' | 'moderado' | 'arrojado';
  createdAt: string;
}

export function SettingsPage() {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'appearance' | 'data'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    riskProfile: 'moderado' as 'conservador' | 'moderado' | 'arrojado',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');

  const loadProfile = async () => {
    try {
      const data = await authService.getMe();
      setProfile(data);
      setFormData({ name: data.name, email: data.email, riskProfile: data.riskProfile });
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  // Load profile on mount
  React.useEffect(() => {
    loadProfile();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');
    try {
      await authService.updateProfile(formData);
      setSuccess('Perfil atualizado com sucesso!');
      loadProfile();
    } catch (error: any) {
      setErrors({ submit: error.message });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrors({ confirmPassword: 'Senhas não coincidem' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setErrors({ newPassword: 'Nova senha deve ter no mínimo 6 caracteres' });
      return;
    }
    setIsLoading(true);
    try {
      await authService.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setSuccess('Senha alterada com sucesso!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'data', label: 'Dados', icon: Database },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-dark-900">Configurações</h1>
        <p className="text-dark-600 mt-1">Gerencie sua conta e preferências</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-200">
        <nav className="flex gap-4 overflow-x-auto" aria-label="Settings tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-dark-500 hover:text-dark-700 hover:border-dark-300'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <CardBody className="p-6">
            <h2 className="text-lg font-semibold text-dark-900 mb-6">Informações Pessoais</h2>
            <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-md">
              <Input
                label="Nome completo"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                error={errors.name}
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                error={errors.email}
                disabled
              />
              <p className="text-sm text-dark-500">O email não pode ser alterado. Contate o suporte se necessário.</p>
              
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Perfil de Risco</label>
                <select
                  value={formData.riskProfile}
                  onChange={(e) => setFormData({...formData, riskProfile: e.target.value as any})}
                  className="w-full px-3 py-2 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="conservador">Conservador - Baixo risco, foco em renda fixa</option>
                  <option value="moderado">Moderado - Equilíbrio entre risco e retorno</option>
                  <option value="arrojado">Arrojado - Alto risco, maior potencial de retorno</option>
                </select>
              </div>

              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {errors.submit}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {success}
                </div>
              )}

              <Button type="submit" loading={isLoading} icon={<Save className="w-4 h-4" />}>
                Salvar Alterações
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card>
          <CardBody className="p-6">
            <h2 className="text-lg font-semibold text-dark-900 mb-6">Alterar Senha</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
              <Input
                label="Senha atual"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                error={errors.currentPassword}
                autoComplete="current-password"
              />
              <Input
                label="Nova senha"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                error={errors.newPassword}
                autoComplete="new-password"
                helperText="Mínimo 6 caracteres"
              />
              <Input
                label="Confirmar nova senha"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                error={errors.confirmPassword}
                autoComplete="new-password"
              />

              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {errors.submit}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {success}
                </div>
              )}

              <Button type="submit" loading={isLoading} icon={<Save className="w-4 h-4" />}>
                Alterar Senha
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-dark-200">
              <h3 className="text-lg font-semibold text-dark-900 mb-4">Sessões Ativas</h3>
              <p className="text-dark-600 mb-4">Gerencie seus dispositivos conectados</p>
              <Button variant="secondary" icon={<LogOut className="w-4 h-4" />}>
                Sair de todos os dispositivos
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Card>
          <CardBody className="p-6">
            <h2 className="text-lg font-semibold text-dark-900 mb-6">Preferências de Notificação</h2>
            <div className="space-y-4 max-w-md">
              {[
                { id: 'email_alerts', label: 'Alertas por Email', description: 'Receba alertas de preço e carteira por email' },
                { id: 'push_alerts', label: 'Notificações Push', description: 'Receba notificações no navegador' },
                { id: 'daily_summary', label: 'Resumo Diário', description: 'Receba resumo diário da carteira por email' },
                { id: 'weekly_report', label: 'Relatório Semanal', description: 'Receba relatório semanal de performance' },
                { id: 'ai_insights', label: 'Insights da IA', description: 'Receba análises e recomendações da IA' },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-dark-50 rounded-lg">
                  <div>
                    <p className="font-medium text-dark-900">{item.label}</p>
                    <p className="text-sm text-dark-500">{item.description}</p>
                  </div>
                  <button
                    className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-primary-600"
                    role="switch"
                    aria-checked={true}
                  >
                    <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 translate-x-5" />
                  </button>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <Card>
          <CardBody className="p-6">
            <h2 className="text-lg font-semibold text-dark-900 mb-6">Aparência</h2>
            <div className="space-y-6 max-w-md">
              <div>
                <h3 className="text-sm font-medium text-dark-700 mb-3">Tema</h3>
                <div className="grid grid-cols-3 gap-3">
                  {['light', 'dark', 'system'].map((theme) => (
                    <button
                      key={theme}
                      className={clsx(
                        'p-4 rounded-lg border-2 text-center transition-all',
                        theme === 'light' ? 'border-primary-500 bg-primary-50' : 'border-dark-200 hover:border-dark-300'
                      )}
                    >
                      <span className="capitalize">{theme}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-dark-700 mb-3">Densidade da Interface</h3>
                <div className="grid grid-cols-3 gap-3">
                  {['comfortable', 'compact', 'spacious'].map((density) => (
                    <button
                      key={density}
                      className={clsx(
                        'p-4 rounded-lg border-2 text-center transition-all',
                        density === 'comfortable' ? 'border-primary-500 bg-primary-50' : 'border-dark-200 hover:border-dark-300'
                      )}
                    >
                      <span className="capitalize">{density}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Data Tab */}
      {activeTab === 'data' && (
        <Card>
          <CardBody className="p-6">
            <h2 className="text-lg font-semibold text-dark-900 mb-6">Gerenciamento de Dados</h2>
            <div className="space-y-4 max-w-md">
              <div className="p-4 border border-dark-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-dark-900">Exportar Dados</p>
                    <p className="text-sm text-dark-500">Baixe todos os seus dados em formato JSON</p>
                  </div>
                  <Button variant="secondary" icon={<Database className="w-4 h-4" />}>
                    Exportar
                  </Button>
                </div>
              </div>
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-900">Excluir Conta</p>
                    <p className="text-sm text-red-700">Esta ação é irreversível e removerá todos os seus dados</p>
                  </div>
                  <Button variant="danger" icon={<Trash2 className="w-4 h-4" />}>
                    Excluir Conta
                  </Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
      );
    }
