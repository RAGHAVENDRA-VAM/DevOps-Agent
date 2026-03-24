import { httpClient } from './httpClient';

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
  language: string | null;
  private: boolean;
}

export const fetchRepositories = async (): Promise<Repository[]> => {
  const res = await httpClient.get<Repository[]>('/github/repositories');
  return res.data;
};
