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
    if (!user) {
      this.currentRole.set('owner');
      this.activeFleet.set(null);
      return;
    }

    const uid = user.uid;

    try {
      // 1. Check local cache first for fast offline startup
      const cachedFleetStr = localStorage.getItem(`harvester_fleet_${uid}`);
      const cachedRole = localStorage.getItem(`harvester_role_${uid}`) as UserFleetRole | null;
      const cachedAssigned = localStorage.getItem(`harvester_assigned_machine_${uid}`) || '';

      if (cachedFleetStr && cachedRole) {
        try {
          const parsed = JSON.parse(cachedFleetStr);
          this.activeFleet.set(parsed);
          this.currentRole.set(cachedRole);
          if (cachedAssigned) this.assignedHarvester.set(cachedAssigned);
        } catch {}
      }

      // 2. Check user's own profile document in Firestore
      const userRef = doc(this.firestore, 'users', uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      const joinedFleetId = userData?.['joinedFleetId'];

      if (joinedFleetId) {
        // User is a Collaborator in another owner's fleet!
        const fleetRef = doc(this.firestore, 'fleet_groups', joinedFleetId);
        const fleetSnap = await getDoc(fleetRef);

        if (fleetSnap.exists()) {
          const fleetData = { id: fleetSnap.id, ...fleetSnap.data() } as FleetGroup;
          this.activeFleet.set(fleetData);
          this.currentRole.set('collaborator');

          // Find this member's assigned machine
          const userPhone = userData?.['phone'] as string | undefined;
          const myMembership = fleetData.members?.find(m => m.uid === uid || (userPhone && m.phone === userPhone));
          const machine = myMembership?.assignedHarvester || '';
          this.assignedHarvester.set(machine);

          // Update local caches
          localStorage.setItem(`harvester_fleet_${uid}`, JSON.stringify(fleetData));
          localStorage.setItem(`harvester_role_${uid}`, 'collaborator');
          if (machine) localStorage.setItem(`harvester_assigned_machine_${uid}`, machine);

          // Sync harvesters list into HarvesterService so forms see owner's machines
          if (fleetData.harvesters && fleetData.harvesters.length > 0) {
            await this.harvesterService.setHarvesters(fleetData.harvesters, machine || fleetData.harvesters[0]);
          }

          return;
        } else {
          // Joined fleet no longer exists, revert to owner
          await updateDoc(userRef, { joinedFleetId: null });
        }
      }

      // 3. If not a collaborator, user is Owner of their own fleet
      this.currentRole.set('owner');
      localStorage.setItem(`harvester_role_${uid}`, 'owner');

      const myFleetRef = doc(this.firestore, 'fleet_groups', uid);
      const myFleetSnap = await getDoc(myFleetRef);

      const profile = this.userService.userProfile();
      const currentHarvesters = this.harvesterService.harvesters();

      if (myFleetSnap.exists()) {
        const fleetData = { id: myFleetSnap.id, ...myFleetSnap.data() } as FleetGroup;
        // Keep harvesters in sync
        if (currentHarvesters && currentHarvesters.length > 0 && (!fleetData.harvesters || fleetData.harvesters.length === 0)) {
          fleetData.harvesters = currentHarvesters;
          await setDoc(myFleetRef, { harvesters: currentHarvesters }, { merge: true });
        }
        this.activeFleet.set(fleetData);
        localStorage.setItem(`harvester_fleet_${uid}`, JSON.stringify(fleetData));
      } else {
        // Initialize fleet group for owner
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

        try {
          await setDoc(myFleetRef, initialFleet, { merge: true });
          this.activeFleet.set(initialFleet);
          localStorage.setItem(`harvester_fleet_${uid}`, JSON.stringify(initialFleet));
        } catch {
          // Fallback locally
          this.activeFleet.set(initialFleet);
        }
      }
    } catch (err) {
      console.warn('Fleet context load warning:', err);
    }
  }

  /**
   * Create an OTP invite for a collaborator phone number.
   * Generates a 6-digit PIN and WhatsApp message link.
   */
  async createInvite(targetPhone: string, assignedHarvester?: string): Promise<{ code: string; whatsappUrl: string }> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not logged in');

    const cleanPhone = targetPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      throw new Error('कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें');
    }

    const fleet = this.activeFleet();
    const ownerName = this.userService.userProfile()?.name || 'Owner';
    const businessName = this.userService.userProfile()?.businessName || fleet?.businessName || 'Harvester';

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const inviteDoc: FleetInvite = {
      code,
      fleetId: user.uid,
      ownerUid: user.uid,
      ownerName,
      businessName,
      targetPhone: cleanPhone,
      assignedHarvester: assignedHarvester || '',
      createdAt: new Date().toISOString(),
      expiresAt,
      status: 'pending'
    };

    const inviteRef = doc(this.firestore, `fleet_invites/${code}`);
    await setDoc(inviteRef, inviteDoc);

    // Pre-fill WhatsApp invite text
    const message = `🚜 *${businessName}* में आपका स्वागत है!\n\n` +
      `नमस्ते! ${ownerName} ने आपको अपने हार्वेस्टर दल (Fleet) से जुड़ने का निमंत्रण भेजा है।\n` +
      (assignedHarvester ? `आपकी मशीन: *${assignedHarvester}*\n` : '') +
      `\n🔐 आपका 6-अंकों का जॉइनिंग कोड है: *${code}*\n\n` +
      `कृपया अपने हार्वेस्टर ऐप की सेटिंग्स में जाकर "टीम कोड दर्ज करें" में यह कोड डालें।`;

    const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;

    return { code, whatsappUrl };
  }

  /**
   * Verify an invite code and join the fleet as a Collaborator.
   */
  async joinFleetWithCode(code: string): Promise<{ success: boolean; businessName: string; ownerName: string }> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not logged in');

    const cleanCode = code.trim();
    if (cleanCode.length !== 6) {
      throw new Error('कृपया मान्य 6-अंकों का कोड दर्ज करें');
    }

    const inviteRef = doc(this.firestore, `fleet_invites/${cleanCode}`);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      throw new Error('अमान्य या पुराना कोड! कृपया मालिक से नया कोड मांगें।');
    }

    const invite = inviteSnap.data() as FleetInvite;

    if (invite.expiresAt < Date.now()) {
      throw new Error('यह कोड समाप्त (expired) हो चुका है। कृपया नया कोड लें।');
    }

    const fleetRef = doc(this.firestore, `fleet_groups/${invite.fleetId}`);
    const fleetSnap = await getDoc(fleetRef);

    if (!fleetSnap.exists()) {
      throw new Error('मालिक का खाता नहीं मिला।');
    }

    const fleetData = fleetSnap.data() as FleetGroup;
    const profile = this.userService.userProfile();

    const newMember: FleetMember = {
      uid: user.uid,
      name: profile?.name || 'Collaborator',
      phone: profile?.phone || invite.targetPhone,
      role: 'collaborator',
      assignedHarvester: invite.assignedHarvester || '',
      joinedAt: new Date().toISOString()
    };

    // Filter out existing entry of this user if any, and add new
    const updatedMembers = (fleetData.members || []).filter(m => m.uid !== user.uid);
    updatedMembers.push(newMember);

    // Update fleet group
    await updateDoc(fleetRef, {
      members: updatedMembers,
      updatedAt: new Date().toISOString()
    });

    // Update current user's profile with joinedFleetId
    const userRef = doc(this.firestore, `users/${user.uid}`);
    await setDoc(userRef, { joinedFleetId: invite.fleetId }, { merge: true });

    // Mark invite as accepted
    try {
      await updateDoc(inviteRef, { status: 'accepted' });
    } catch {}

    // Reload fleet context
    await this.loadFleetContext();

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
