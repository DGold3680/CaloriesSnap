export interface FoodEntry {
  id: string;
  date: string; // ISO string
  foodName: string;
  calories: number;
  protein: number;
  description: string;
  imageUrl?: string; // transient URL for rendering
  imageBlob?: Blob; // Actual storage
}

export interface CalorieEstimation {
  foodName: string;
  calories: number;
  protein: number;
  description: string;
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';
