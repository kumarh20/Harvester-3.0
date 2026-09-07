export interface Season {
  id?: string;
  name: string;
  startMonth: number; // 1-12
  endMonth: number; // 1-12
  year: number;
  isDefault: boolean;
  createdAt?: any;
  uid?: string;
}

export interface HindiMonthOption {
  id: number;
  name: string;
}

export const HINDI_MONTHS: readonly HindiMonthOption[] = [
  { id: 1, name: 'जनवरी' },
  { id: 2, name: 'फ़रवरी' },
  { id: 3, name: 'मार्च' },
  { id: 4, name: 'अप्रैल' },
  { id: 5, name: 'मई' },
  { id: 6, name: 'जून' },
  { id: 7, name: 'जुलाई' },
  { id: 8, name: 'अगस्त' },
  { id: 9, name: 'सितंबर' },
  { id: 10, name: 'अक्टूबर' },
  { id: 11, name: 'नवंबर' },
  { id: 12, name: 'दिसंबर' }
];

export function getHindiMonthName(monthNumber: number): string {
  const match = HINDI_MONTHS.find(m => m.id === Number(monthNumber));
  return match ? match.name : `माह ${monthNumber}`;
}

export function getSeasonDisplayLabel(season: Partial<Season> | null | undefined): string {
  if (!season || !season.name) return '';
  const startName = getHindiMonthName(season.startMonth ?? 1);
  const endName = getHindiMonthName(season.endMonth ?? 1);
  return `${season.name} ${season.year || ''} (${startName} - ${endName})`;
}
