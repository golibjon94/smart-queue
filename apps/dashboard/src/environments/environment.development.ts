import type { Environment } from './environment.model';

// Development environment.
// `ng serve` / `ng build --configuration development` da angular.json
// fileReplacements orqali environment.ts o'rniga qo'yiladi.
export const environment: Environment = {
  production: false,
  gatewayUrl: 'http://localhost:5080',
  branchId: 1,
  pollIntervalMs: 4000,
  forecastHours: 48,
};
