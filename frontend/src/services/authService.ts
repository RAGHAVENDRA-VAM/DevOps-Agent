import { httpClient } from './httpClient';

export const startGithubLogin = () => {
  // Redirect to backend GitHub OAuth initiation endpoint
  window.location.href = '/api/auth/github';
};

export const getCurrentUser = async () => {
  const res = await httpClient.get('/auth/me');
  return res.data;
};

