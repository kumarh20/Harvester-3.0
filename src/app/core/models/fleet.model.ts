export type UserFleetRole = 'owner' | 'collaborator';

export interface FleetMember {
  uid: string;
  name: string;
  phone: string;
  role: UserFleetRole;
  assignedHarvester?: string;
  joinedAt: string;
}

export interface FleetGroup {
  id: string; // Typically ownerUid
  ownerUid: string;
  ownerName: string;
  ownerPhone: string;
  businessName: string;
  harvesters: string[];
  defaultRatePerAcre?: number;
  members: FleetMember[];
  inviteCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FleetInvite {
  id?: string;
  code: string; // 6-digit OTP / PIN
  fleetId: string;
  ownerUid: string;
  ownerName: string;
  businessName: string;
  targetPhone: string;
  assignedHarvester?: string;
  createdAt: string;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'expired';
}
