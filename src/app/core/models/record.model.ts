/**
 * Application-level Harvest Record Interface
 * Follows Interface Segregation Principle (ISP).
 */
export interface Record {
  id: string;
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
  /** Optional harvester machine name (e.g. Harvester 1, Harvester 2) */
  harvester?: string;
  /** Optional season document ID */
  seasonId?: string;
  /** When true, record is soft-settled/paid */
  markedAsPaid?: boolean;
  createdAt?: any;
}

export type HarvestRecord = Record;

export interface FarmerLedgerGroup {
  farmerName: string;
  contactNumber: string;
  records: Record[];
  totalAcres: number;
  totalBilled: number;
  totalPaid: number;
  totalPending: number;
  lastDate: string;
  isFullySettled: boolean;
}

export interface PaymentSettlementUpdate {
  recordId: string;
  newPaidOnSight: number;
  newPendingAmount: number;
  markedAsPaid?: boolean;
}
