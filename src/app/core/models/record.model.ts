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
  /** Fleet group ID if multi-user fleet is active */
  fleetId?: string;
  /** Audit info: who created this record */
  createdBy?: {
    uid: string;
    name: string;
    phone?: string;
    role?: 'owner' | 'collaborator';
  };
  /** Audit info: who received full settlement */
  settledBy?: {
    uid: string;
    name: string;
    at: string;
  };
  /** Audit info: who last modified this record */
  lastModifiedBy?: {
    uid: string;
    name: string;
    at: string;
  };
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
