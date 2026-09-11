/**
 * Add New Record Feature Interfaces and Types
 * Adheres to Interface Segregation Principle (ISP).
 */

export interface RecordFormData {
  farmerName: string;
  contactNumber: string;
  date: string;
  cuttingTime?: string;
  landInAcres: number;
  ratePerAcre: number;
  paidOnSight: number;
  fullPaymentDate: string;
  totalPayment: number;
  pendingAmount: number;
  harvester?: string;
  seasonId?: string;
}

export interface FarmerPrefillData {
  farmerName: string;
  contactNumber: string;
}
