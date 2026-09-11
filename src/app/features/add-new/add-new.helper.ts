/**
 * Add New Record Helper Calculations
 * Adheres to Single Responsibility Principle (SRP).
 */

export interface PaymentCalculationResult {
  totalPayment: number;
  pendingPayment: number;
}

export function calculateRecordTotals(
  landInAcres: number,
  ratePerAcre: number,
  paidOnSight: number
): PaymentCalculationResult {
  const acres = Number(landInAcres) || 0;
  const rate = Number(ratePerAcre) || 0;
  const paid = Number(paidOnSight) || 0;

  const total = Math.round(acres * rate);
  const pending = Math.max(0, total - paid);

  return {
    totalPayment: total,
    pendingPayment: pending
  };
}
