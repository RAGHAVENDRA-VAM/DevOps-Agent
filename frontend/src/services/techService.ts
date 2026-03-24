import { httpClient } from './httpClient';

export interface TechStack {
  language: string;
  framework: string | null;
  buildTool: string | null;
  hasDockerfile: boolean;
  hasHelm: boolean;
  hasTerraform: boolean;
}

export const detectTechnologies = async (
  repoFullName: string,
  branch: string,
): Promise<TechStack> => {
  const res = await httpClient.post<TechStack>('/analysis/tech-detection', {
    repoFullName,
    branch,
  });
  return res.data;
};
