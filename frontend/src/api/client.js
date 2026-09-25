const rawUrl = import.meta.env.VITE_API_URL || 'https://pv-s7jg.onrender.com/api';
const cleanUrl = rawUrl.replace(/\/$/, '');
const BASE_URL = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;

// In-Memory Fast Cache & Request Deduplication
const apiCache = new Map();
const inFlightRequests = new Map();
const CACHE_TTL_MS = 30000; // 30 seconds freshness for fast tab switching

export function clearApiCache() {
  apiCache.clear();
}

export function getToken() {
  return localStorage.getItem('placement_token');
}

export function setToken(token) {
  clearApiCache();
  if (token) {
    localStorage.setItem('placement_token', token);
  } else {
    localStorage.removeItem('placement_token');
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const cacheKey = `${token || 'anon'}:${endpoint}`;

  // Serve from memory cache immediately if available and fresh
  if (isGet && !options.skipCache) {
    const cached = apiCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }
    // Deduplicate in-flight requests to avoid redundant simultaneous network roundtrips
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }
  }

  // Any mutation (POST, PUT, PATCH, DELETE) automatically clears cache
  if (!isGet) {
    clearApiCache();
  }

  const headers = {
    ...options.headers
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchPromise = (async () => {
    let response;
    try {
      response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers
      });
    } catch {
      const error = new Error('Cannot reach verification server. Please verify backend is running on port 5000.');
      error.status = 503;
      error.data = { error: 'Cannot reach verification server. Please verify backend is running on port 5000.' };
      throw error;
    }

    const contentType = response.headers.get('content-type');
    let data = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const error = new Error(data?.error || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    if (isGet) {
      apiCache.set(cacheKey, { timestamp: Date.now(), data });
    }

    return data;
  })();

  if (isGet) {
    inFlightRequests.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => inFlightRequests.delete(cacheKey));
  }

  return fetchPromise;
}

export const api = {
  // Auth
  login: credentials => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getDemoAccounts: () => apiRequest('/auth/demo-accounts'),
  demoLogin: demoType => apiRequest('/auth/demo-login', { method: 'POST', body: JSON.stringify({ demoType }) }),
  getCurrentUser: () => apiRequest('/auth/me'),
  updateUserProfile: profile => apiRequest('/auth/profile', { method: 'PUT', body: JSON.stringify(profile) }),

  // Student
  getStudentProfile: () => apiRequest('/students/me'),
  updateStudentProfile: profile => apiRequest('/students/me/profile', { method: 'PUT', body: JSON.stringify(profile) }),
  updateStudentContact: contact => apiRequest('/students/me/contact', { method: 'PUT', body: JSON.stringify(contact) }),
  updateResumeLink: resumeUrl => apiRequest('/students/me/resume-link', { method: 'PUT', body: JSON.stringify({ resumeUrl }) }),
  uploadResume: formData => apiRequest('/students/me/resume', { method: 'POST', body: formData }),
  getStudentApplications: () => apiRequest('/students/me/applications'),

  // Companies & Drives
  getCompanies: () => apiRequest('/companies'),
  getCompanyById: id => apiRequest(`/companies/${id}`),
  applyToDrive: (driveId, payload = {}) => apiRequest(`/companies/${driveId}/apply`, { method: 'POST', body: JSON.stringify(payload) }),

  // Recruitment Stages
  getDriveApplications: driveId => apiRequest(`/applications/drive/${driveId}`),
  updateApplicationStage: (appId, stage) => apiRequest(`/applications/${appId}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) }),
  withdrawApplication: appId => apiRequest(`/applications/${appId}/withdraw`, { method: 'POST' }),

  // Admin
  getAdminStats: () => apiRequest('/admin/stats'),
  getAdminRecruiters: () => apiRequest('/admin/recruiters'),
  createDrive: drive => apiRequest('/admin/companies', { method: 'POST', body: JSON.stringify(drive) }),
  updateDrive: (id, drive) => apiRequest(`/admin/companies/${id}`, { method: 'PUT', body: JSON.stringify(drive) }),
  deleteDrive: id => apiRequest(`/admin/companies/${id}`, { method: 'DELETE' }),

  getStudentsAdmin: (query = '') => apiRequest(`/admin/students${query ? `?${query}` : ''}`),
  getStudentDetailsAdmin: usn => apiRequest(`/admin/students/${usn}`),
  updateStudentVerification: (usn, data) => apiRequest(`/admin/students/${usn}/verify`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateStudentBlockStatus: (usn, data) => apiRequest(`/admin/students/${usn}/block`, { method: 'PATCH', body: JSON.stringify(data) }),
  editVerifiedRecordAdmin: (usn, record) => apiRequest(`/admin/students/${usn}/record`, { method: 'PUT', body: JSON.stringify(record) }),

  getAllApplicationsAdmin: (query = '') => apiRequest(`/admin/applications${query ? `?${query}` : ''}`),
  getMismatchesAdmin: (query = '') => apiRequest(`/admin/mismatches${query ? `?${query}` : ''}`),
  resolveMismatch: (id, data) => apiRequest(`/admin/mismatches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  importGoogleForms: responses => apiRequest('/admin/import/google-forms', { method: 'POST', body: JSON.stringify({ responses }) }),
  importMasterRecords: data => apiRequest('/admin/import/master-records', { method: 'POST', body: JSON.stringify(data) }),

  getAuditLogs: (query = '') => apiRequest(`/admin/audit-logs${query ? `?${query}` : ''}`)
};
