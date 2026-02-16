import { httpClient } from './httpClient';

export const fetchRepositories = async () => {
  const res = await httpClient.get('/github/repositories');
  return res.data;
};

