// ML servis bashorati. Gateway proxy snake_case (FastAPI) qaytaradi —
// DTO faqat data qatlamida yashaydi, app ichida camelCase model ishlatiladi.

export interface ForecastPointDto {
  target_time: string;
  predicted_arrivals: number;
  lower_ci: number;
  upper_ci: number;
}

export interface ForecastResponseDto {
  branch_id: number;
  model_name: string | null;
  model_version: string | null;
  points: ForecastPointDto[];
}

// --- App view-model (camelCase) ---

export interface ForecastPoint {
  targetTime: string;
  predicted: number;
  lowerCi: number;
  upperCi: number;
}

export interface Forecast {
  branchId: number;
  modelName: string | null;
  modelVersion: string | null;
  points: ForecastPoint[];
}
