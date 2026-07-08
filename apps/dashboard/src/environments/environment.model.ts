// Environment shakli. Ikkala environment fayli ham shu tipga mos bo'lishi shart.
// Alohida fayl — chunki angular.json fileReplacements environment.ts ni butunlay
// almashtiradi, shuning uchun tipni undan import qilib bo'lmaydi.
export interface Environment {
  production: boolean;
  gatewayUrl: string;
  branchId: number;
  pollIntervalMs: number;
  forecastHours: number;
}
