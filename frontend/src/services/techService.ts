import { httpClient } from './httpClient';

export const detectTechnologies = async (repoFullName: string, branch: string) => {
  const res = await httpClient.post('/analysis/tech-detection', {
    repoFullName,
    branch
  });
  return res.data;
};

