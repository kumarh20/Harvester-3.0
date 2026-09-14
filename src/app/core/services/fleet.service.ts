import { Injectable, signal, computed } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { FleetGroup, FleetMember, FleetInvite, UserFleetRole } from '../models/fleet.model';
import { Record } from '../models/record.model';
import { UserService } from '../../services/user/user-service';
import { HarvesterService } from './harvester.service';

@Injectable({
  providedIn: 'root'
})
export class FleetService {
  public currentRole = signal<UserFleetRole>('owner');
  public activeFleet = signal<FleetGroup | null>(null);
  public isCollaborator = computed(() => this.currentRole() === 'collaborator');
  public isOwner = computed(() => this.currentRole() === 'owner');

  // If user is a collaborator, the assigned harvester machine
  public assignedHarvester = signal<string>('');

  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private userService: UserService,
    private harvesterService: HarvesterService
  ) {}

  /**
   * Load fleet context for the current user.
   * Checks if user has joined a fleet or owns one.
   */
  async loadFleetContext(): Promise<void> {
    const user = this.auth.currentUser;
    const uid = user?.uid || this.userService.userProfile()?.uid;
    if (!uid) {
      this.currentRole.set('owner');
      return;
    }

    // 1. Immediate offline / local cache hydration for zero-latency UI
    const cachedFleetStr = localStorage.getItem(`harvester_fleet_${uid}`);
    const cachedRole = localStorage.getItem(`harvester_role_${uid}`) as UserFleetRole | null;
    const cachedAssigned = localStorage.getItem(`harvester_assigned_machine_${uid}`) || '';

    if (cachedFleetStr) {
      try {
        const parsed = JSON.parse(cachedFleetStr);
        this.activeFleet.set(parsed);
        this.currentRole.set(cachedRole || 'owner');
        if (cachedAssigned) this.assignedHarvester.set(cachedAssigned);
      } catch {}
    } else {
      // Create sensible local initial fleet so UI never sits in a null/broken state
      const profile = this.userService.userProfile();
      const currentHarvesters = this.harvesterService.harvesters();
      const fallbackFleet: FleetGroup = {
        id: uid,
        ownerUid: uid,
        ownerName: profile?.name || 'Owner',
        ownerPhone: profile?.phone || '',
        businessName: profile?.businessName || 'Harvester Fleet',
        harvesters: currentHarvesters.length > 0 ? currentHarvesters : ['Harvester 1'],
        members: [
          {
            uid,
            name: profile?.name || 'Owner',
            phone: profile?.phone || '',
            role: 'owner',
            joinedAt: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.activeFleet.set(fallbackFleet);
      this.currentRole.set('owner');
      localStorage.setItem(`harvester_fleet_${uid}`, JSON.stringify(fallbackFleet));
      localStorage.setItem(`harvester_role_${uid}`, 'owner');
    }

    // 2. Check user's own profile document in Firestore (safely isolated)
    let joinedFleetId: string | null = null;
    let userData: any = null;

    try {
      const userRef = doc(this.firestore, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        userData = userSnap.data();
        joinedFleetId = userData?.['joinedFleetId'] || null;
      }
    } catch (e: any) {
      // Handled fallback: security rules or network might restrict users collection query
      console.debug('Firestore user document check fallback:', e?.message || e);
    }

    // 3. If joined a fleet as collaborator, load that fleet
    if (joinedFleetId) {
      try {
        const fleetRef = doc(this.firestore, 'fleet_groups', joinedFleetId);
        const fleetSnap = await getDoc(fleetRef);

        if (fleetSnap.exists()) {
          const fleetData = { id: fleetSnap.id, ...fleetSnap.data() } as FleetGroup;
          this.activeFleet.set(fleetData);
          this.currentRole.set('collaborator');

          const userPhone = userData?.['phone'] as string | undefined;
          const myMembership = fleetData.members?.find(m => m.uid === uid || (userPhone && m.phone === userPhone));
          const machine = myMembership?.assignedHarvester || '';
          this.assignedHarvester.set(machine);

          localStorage.setItem(`harvester_fleet_${uid}`, JSON.stringify(fleetData));
          localStorage.setItem(`harvester_role_${uid}`, 'collaborator');
          if (machine) localStorage.setItem(`harvester_assigned_machine_${uid}`, machine);

          if (fleetData.harvesters && fleetData.harvesters.length > 0) {
            await this.harvesterService.setHarvesters(fleetData.harvesters, machine || fleetData.harvesters[0]);
          }
          return;
        }
      } catch (e: any) {
        console.debug('Firestore collaborator fleet read fallback:', e?.message || e);
      }
    }

    // 4. If not a collaborator, ensure owner status and sync owner's fleet in Firestore
    this.currentRole.set('owner');
    localStorage.setItem(`harvester_role_${uid}`, 'owner');

    const profile = this.userService.userProfile();
    const currentHarvesters = this.harvesterService.harvesters();

    try {
      const myFleetRef = doc(this.firestore, 'fleet_groups', uid);
      const myFleetSnap = await getDoc(myFleetRef);

      if (myFleetSnap.exists()) {
        const fleetData = { id: myFleetSnap.id, ...myFleetSnap.data() } as FleetGroup;
        if (currentHarvesters && currentHarvesters.length > 0 && (!fleetData.harvesters || fleetData.harvesters.length === 0)) {
          fleetData.harvesters = currentHarvesters;
          try {
            await setDoc(myFleetRef, { harvesters: currentHarvesters }, { merge: true });
          } catch {}
        }
        this.activeFleet.set(fleetData);
        localStorage.setItem(`harvester_fleet_${uid}`, JSON.stringify(fleetData));
      } else {
        const initialFleet: FleetGroup = {
          id: uid,
          ownerUid: uid,
          ownerName: profile?.name || 'Owner',
          ownerPhone: profile?.phone || '',
          businessName: profile?.businessName || 'Harvester Fleet',
          harvesters: currentHarvesters.length > 0 ? currentHarvesters : ['Harvester 1'],
          members: [
            {
              uid,
              name: profile?.name || 'Owner',
              phone: profile?.phone || '',
              role: 'owner',
              joinedAt: new Date().toISOString()
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        this.activeFleet.set(initialFleet);
        localStorage.setItem(`harvester_fleet_${uid}`, JSON.stringify(initialFleet));

        try {
          await setDoc(myFleetRef, initialFleet, { merge: true });
        } catch {}
      }
    } catch (e: any) {
      // Silently handle Firestore permission/network errors and rely on local state
      console.debug('Firestore owner fleet sync fallback:', e?.message || e);
    }
  }

  /**
   * Create an OTP invite for a collaborator phone number.
   * Generates a 6-digit PIN and WhatsApp message link.
   */
  async createInvite(targetPhone: string, assignedHarvester?: string): Promise<{ code: string; whatsappUrl: string; smsUrl: string }> {
    const user = this.auth.currentUser;
    const uid = user?.uid || this.userService.userProfile()?.uid || 'owner';

    const cleanPhone = targetPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      throw new Error('कृपया 10 अंकों का मान्य भारतीय मोबाइल नंबर दर्ज करें');
    }

    const fleet = this.activeFleet();
    const ownerName = this.userService.userProfile()?.name || fleet?.ownerName || 'Owner';
    const businessName = this.userService.userProfile()?.businessName || fleet?.businessName || 'Harvester';

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const inviteDoc: FleetInvite = {
      code,
      fleetId: uid,
      ownerUid: uid,
      ownerName,
      businessName,
      targetPhone: cleanPhone,
      assignedHarvester: assignedHarvester || '',
      createdAt: new Date().toISOString(),
      expiresAt,
      status: 'pending'
    };

    // 1. Try to save in Firestore fleet_invites collection
    try {
      const inviteRef = doc(this.firestore, `fleet_invites/${code}`);
      await setDoc(inviteRef, inviteDoc);
    } catch (firestoreErr: any) {
      console.debug('Firestore invite write fallback:', firestoreErr?.message || firestoreErr);
    }

    // 2. Always persist in local storage fallback
    try {
      const stored = localStorage.getItem('harvester_fleet_invites') || '{}';
      const parsed = JSON.parse(stored);
      parsed[code] = inviteDoc;
      localStorage.setItem('harvester_fleet_invites', JSON.stringify(parsed));
    } catch {}

    // Pre-fill WhatsApp and SMS invite text
    const message = `🚜 *${businessName}* में आपका स्वागत है!\n\n` +
      `नमस्ते! ${ownerName} ने आपको अपने हार्वेस्टर दल (Fleet) से जुड़ने का निमंत्रण भेजा है।\n` +
      (assignedHarvester ? `आपकी असाइन मशीन: *${assignedHarvester}*\n` : '') +
      `\n🔐 आपका 6-अंकों का ओटीपी / जॉइनिंग कोड है: *${code}*\n\n` +
      `कृपया अपने हार्वेस्टर ऐप की सेटिंग्स में जाकर "सहयोगी व टीम" -> "कोड से जुड़ें" में यह कोड डालें।`;

    const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    const smsUrl = `sms:+91${cleanPhone}?body=${encodeURIComponent(message)}`;

    return { code, whatsappUrl, smsUrl };
  }

  /**
   * Verify an invite code and join the fleet as a Collaborator.
   */
  async joinFleetWithCode(code: string): Promise<{ success: boolean; businessName: string; ownerName: string }> {
    const user = this.auth.currentUser;
    const uid = user?.uid || this.userService.userProfile()?.uid;
    if (!uid) throw new Error('कृपया पहले लॉगिन करें');

    const cleanCode = code.trim();
    if (cleanCode.length !== 6) {
      throw new Error('कृपया मान्य 6-अंकों का कोड दर्ज करें');
    }

    let invite: FleetInvite | null = null;

    // 1. Check Firestore fleet_invites
    try {
      const inviteRef = doc(this.firestore, `fleet_invites/${cleanCode}`);
      const inviteSnap = await getDoc(inviteRef);
      if (inviteSnap.exists()) {
        invite = inviteSnap.data() as FleetInvite;
      }
    } catch (e: any) {
      console.debug('Firestore read invite fallback:', e?.message || e);
    }

    // 2. Fallback to local storage
    if (!invite) {
      try {
        const stored = localStorage.getItem('harvester_fleet_invites') || '{}';
        const parsed = JSON.parse(stored);
        if (parsed[cleanCode]) {
          invite = parsed[cleanCode] as FleetInvite;
        }
      } catch {}
    }

    if (!invite) {
      throw new Error('अमान्य या पुराना कोड! कृपया मालिक से नया कोड मांगें।');
    }

    if (invite.expiresAt < Date.now()) {
      throw new Error('यह कोड समाप्त (expired) हो चुका है। कृपया नया कोड लें।');
    }

    let fleetData: FleetGroup | null = null;
    try {
      const fleetRef = doc(this.firestore, `fleet_groups/${invite.fleetId}`);
      const fleetSnap = await getDoc(fleetRef);
      if (fleetSnap.exists()) {
        fleetData = fleetSnap.data() as FleetGroup;
      }
    } catch (e: any) {
      console.debug('Firestore read fleet fallback:', e?.message || e);
    }

    if (!fleetData) {
      fleetData = {
        id: invite.fleetId,
        ownerUid: invite.ownerUid,
        ownerName: invite.ownerName,
        ownerPhone: '',
        businessName: invite.businessName,
        harvesters: invite.assignedHarvester ? [invite.assignedHarvester] : ['Harvester 1'],
        members: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    const profile = this.userService.userProfile();
    const newMember: FleetMember = {
      uid,
      name: profile?.name || 'Collaborator',
      phone: profile?.phone || invite.targetPhone,
      role: 'collaborator',
      assignedHarvester: invite.assignedHarvester || '',
      joinedAt: new Date().toISOString()
    };

    const updatedMembers = (fleetData.members || []).filter(m => m.uid !== uid);
    updatedMembers.push(newMember);
    fleetData.members = updatedMembers;

    // Update Firestore if permitted
    try {
      const fleetRef = doc(this.firestore, `fleet_groups/${invite.fleetId}`);
      await setDoc(fleetRef, {
        members: updatedMembers,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch {}

    try {
      const userRef = doc(this.firestore, `users/${uid}`);
      await setDoc(userRef, { joinedFleetId: invite.fleetId }, { merge: true });
    } catch {}

    try {
      const inviteRef = doc(this.firestore, `fleet_invites/${cleanCode}`);
      await updateDoc(inviteRef, { status: 'accepted' });
    } catch {}

    // Update local state
    localStorage.setItem(`harvester_fleet_${uid}`, JSON.stringify(fleetData));
    localStorage.setItem(`harvester_role_${uid}`, 'collaborator');
    if (invite.assignedHarvester) {
      localStorage.setItem(`harvester_assigned_machine_${uid}`, invite.assignedHarvester);
      this.assignedHarvester.set(invite.assignedHarvester);
    }
    this.currentRole.set('collaborator');
    this.activeFleet.set(fleetData);

    if (fleetData.harvesters && fleetData.harvesters.length > 0) {
      await this.harvesterService.setHarvesters(fleetData.harvesters, invite.assignedHarvester || fleetData.harvesters[0]);
    }

    return {
      success: true,
      businessName: invite.businessName,
      ownerName: invite.ownerName
    };
  }

  /**
   * Owner revokes access / removes a member from the fleet
   */
  async removeMember(memberUid: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || this.currentRole() !== 'owner') {
      throw new Error('केवल मुख्य मालिक ही सदस्य को हटा सकते हैं');
    }

    const fleet = this.activeFleet();
    if (!fleet) return;

    const updatedMembers = (fleet.members || []).filter(m => m.uid !== memberUid);

    const fleetRef = doc(this.firestore, `fleet_groups/${user.uid}`);
    await updateDoc(fleetRef, {
      members: updatedMembers,
      updatedAt: new Date().toISOString()
    });

    // Also clear member's joinedFleetId in their user document
    try {
      const memberUserRef = doc(this.firestore, `users/${memberUid}`);
      await updateDoc(memberUserRef, { joinedFleetId: null });
    } catch {}

    // Update local state
    fleet.members = updatedMembers;
    this.activeFleet.set({ ...fleet });
    localStorage.setItem(`harvester_fleet_${user.uid}`, JSON.stringify(fleet));
  }

  /**
   * Collaborator leaves the current fleet
   */
  async leaveFleet(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    const fleet = this.activeFleet();
    if (fleet) {
      try {
        const fleetRef = doc(this.firestore, `fleet_groups/${fleet.id}`);
        const updatedMembers = (fleet.members || []).filter(m => m.uid !== user.uid);
        await updateDoc(fleetRef, { members: updatedMembers });
      } catch {}
    }

    const userRef = doc(this.firestore, `users/${user.uid}`);
    await updateDoc(userRef, { joinedFleetId: null });

    localStorage.removeItem(`harvester_fleet_${user.uid}`);
    localStorage.removeItem(`harvester_role_${user.uid}`);
    localStorage.removeItem(`harvester_assigned_machine_${user.uid}`);

    this.currentRole.set('owner');
    this.activeFleet.set(null);
    this.assignedHarvester.set('');

    await this.loadFleetContext();
  }

  /**
   * Update fleet machine list in Firestore (only if owner)
   */
  async updateFleetHarvesters(harvesters: string[]): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || this.currentRole() !== 'owner') return;

    const fleetRef = doc(this.firestore, `fleet_groups/${user.uid}`);
    await setDoc(fleetRef, {
      harvesters,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const fleet = this.activeFleet();
    if (fleet) {
      fleet.harvesters = harvesters;
      this.activeFleet.set({ ...fleet });
      localStorage.setItem(`harvester_fleet_${user.uid}`, JSON.stringify(fleet));
    }
  }

  /**
   * Update fleet business name in Firestore (only if owner)
   */
  async updateFleetBusinessName(businessName: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || this.currentRole() !== 'owner') return;

    const fleetRef = doc(this.firestore, `fleet_groups/${user.uid}`);
    await setDoc(fleetRef, {
      businessName,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const fleet = this.activeFleet();
    if (fleet) {
      fleet.businessName = businessName;
      this.activeFleet.set({ ...fleet });
      localStorage.setItem(`harvester_fleet_${user.uid}`, JSON.stringify(fleet));
    }
  }

  /**
   * Check if current user has permission to edit the specified record.
   * - Owners can edit any record in their fleet or account.
   * - Collaborators can ONLY edit records that they personally created.
   */
  canEditRecord(record: Record | null | undefined): boolean {
    if (!record) return false;
    if (this.isOwner()) return true;

    const currentUid = this.auth.currentUser?.uid;
    if (!currentUid) return false;

    // Check if record was created by this user
    const creatorUid = record.createdBy?.uid || (record as any).uid;
    if (creatorUid && creatorUid === currentUid) {
      return true;
    }

    // Secondary fallback: check createdBy.phone if available
    const userPhone = this.userService.userProfile()?.phone;
    if (userPhone && record.createdBy?.phone) {
      const clean1 = userPhone.replace(/\D/g, '').slice(-10);
      const clean2 = record.createdBy.phone.replace(/\D/g, '').slice(-10);
      if (clean1 && clean1 === clean2) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if current user has permission to delete or mark paid the specified record.
   */
  canDeleteRecord(record: Record | null | undefined): boolean {
    return this.canEditRecord(record);
  }
}
