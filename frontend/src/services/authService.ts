import { httpClient } from './httpClient';

export interface CurrentUser {
  username: string;
  provider: string;
}

export const startGithubLogin = (): void => {
  window.location.href = '/api/auth/github';
};

export const getCurrentUser = async (): Promise<CurrentUser> => {
  const res = await httpClient.get<CurrentUser>('/auth/me');
  return res.data;
};
