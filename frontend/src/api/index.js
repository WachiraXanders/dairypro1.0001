import { api, setToken, clearToken } from './apiClient';

export { entities } from './entities';
export { api };

export const auth = {
  async login(email, password) {
    const { data } = await api.post('/api/auth/login', { email, password });
    setToken(data.access_token);
    return data.user;
  },
  async register(email, password, full_name) {
    const { data } = await api.post('/api/auth/register', { email, password, full_name });
    setToken(data.access_token);
    return data.user;
  },
  async me() {
    const { data } = await api.get('/api/auth/me');
    return data;
  },
  logout() {
    clearToken();
  },
};

export const users = {
  async list() {
    const { data } = await api.get('/api/users');
    return data;
  },
  async invite(email, full_name, role) {
    const { data } = await api.post('/api/users/invite', { email, full_name, role });
    return data;
  },
  async updateRole(id, role) {
    const { data } = await api.put(`/api/users/${id}`, { role });
    return data;
  },
  async remove(id) {
    const { data } = await api.delete(`/api/users/${id}`);
    return data;
  },
};

export const integrations = {
  async sendEmail(to, subject, body) {
    const { data } = await api.post('/api/integrations/send-email', { to, subject, body });
    return data;
  },
  async uploadFile(file) {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/api/integrations/upload-file', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  async pageView(page) {
    try {
      await api.post('/api/integrations/page-view', { page });
    } catch {
      // non-critical
    }
  },
  async invokeLLM({ prompt, response_json_schema }) {
    const { data } = await api.post('/api/integrations/invoke-llm', { prompt, response_json_schema });
    return data;
  },
};

export const analytics = {
  async milkForecast() {
    const { data } = await api.get('/api/analytics/milk-forecast');
    return data;
  },
  async healthRisk() {
    const { data } = await api.get('/api/analytics/health-risk');
    return data;
  },
  async breedingOptimizer() {
    const { data } = await api.get('/api/analytics/breeding-optimizer');
    return data;
  },
  async insights() {
    const { data } = await api.get('/api/analytics/insights');
    return data;
  },
  async aiInsights() {
    const { data } = await api.post('/api/analytics/ai-insights');
    return data;
  },
};
