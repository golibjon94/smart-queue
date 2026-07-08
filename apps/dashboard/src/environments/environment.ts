import type { Environment } from './environment.model';

// Production environment.
// `ng build` (default configuration) shu faylni ishlatadi.
export const environment: Environment = {
  production: true,
  gatewayUrl: 'http://localhost:5080',
  branchId: 1,
  pollIntervalMs: 4000,
  forecastHours: 48,
};
