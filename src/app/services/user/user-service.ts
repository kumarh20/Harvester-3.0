import { Injectable, signal } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  limit,
  serverTimestamp
} from '@angular/fire/firestore';

export interface UserProfileData {
  uid?: string;
  name: string;
  phone: string;
  businessName?: string;
  photoURL?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  // Reactive shared state for current user profile
  public userProfile = signal<UserProfileData | null>(null);

  constructor(private firestore: Firestore) {}

  async getUser(uid: string): Promise<any> {
    const ref = doc(this.firestore, `users/${uid}`);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  /**
   * Load and cache user profile in the reactive signal
   */
  async loadUserProfile(uid: string): Promise<UserProfileData | null> {
    try {
      // Check local cache first for instant display
      const localCachedPhoto = localStorage.getItem(`user_photo_${uid}`);
      const localCachedName = localStorage.getItem(`user_name_${uid}`);

      const data = await this.getUser(uid);
      if (data) {
        const profile: UserProfileData = {
          uid,
          name: data.name || localCachedName || 'Operator',
          phone: data.phone || '',
          businessName: data.businessName || '',
          photoURL: data.photoURL || localCachedPhoto || ''
        };

        if (profile.photoURL) {
          localStorage.setItem(`user_photo_${uid}`, profile.photoURL);
        }
        if (profile.name) {
          localStorage.setItem(`user_name_${uid}`, profile.name);
        }

        this.userProfile.set(profile);
        return profile;
      } else if (localCachedName || localCachedPhoto) {
        const fallback: UserProfileData = {
          uid,
          name: localCachedName || 'Operator',
          phone: '',
          photoURL: localCachedPhoto || ''
        };
        this.userProfile.set(fallback);
        return fallback;
      }
    } catch (err) {
      console.warn('Could not load user profile from firestore:', err);
    }
    return null;
  }

  /** Check if a user with this phone already exists in Firestore. */
  async getUserByPhone(phone: string): Promise<{ uid: string } | null> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('phone', '==', phone), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    return data?.["uid"] ? { uid: data["uid"] as string } : null;
  }

  async createUser(uid: string, name: string, phone: string) {
    const ref = doc(this.firestore, `users/${uid}`);
    await setDoc(ref, {
      uid,
      name,
      phone,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    });

    this.userProfile.set({
      uid,
      name,
      phone,
      photoURL: ''
    });
  }

  async updateLastLogin(uid: string) {
    const ref = doc(this.firestore, `users/${uid}`);
    return setDoc(ref, {
      lastLoginAt: serverTimestamp()
    }, { merge: true });
  }

  async updateUserProfile(uid: string, name: string, phone: string, extra?: { businessName?: string; photoURL?: string }) {
    const ref = doc(this.firestore, `users/${uid}`);
    const updateData: any = {
      name,
      phone,
      updatedAt: serverTimestamp()
    };
    if (extra?.businessName !== undefined) {
      updateData.businessName = extra.businessName;
    }
    if (extra?.photoURL !== undefined) {
      updateData.photoURL = extra.photoURL;
      localStorage.setItem(`user_photo_${uid}`, extra.photoURL);
    }
    localStorage.setItem(`user_name_${uid}`, name);

    await setDoc(ref, updateData, { merge: true });

    const current = this.userProfile();
    this.userProfile.set({
      ...current,
      uid,
      name,
      phone,
      businessName: extra?.businessName !== undefined ? extra.businessName : current?.businessName,
      photoURL: extra?.photoURL !== undefined ? extra.photoURL : current?.photoURL
    });
  }

  /**
   * Directly save a user profile photo (base64 data URL)
   */
  async updateUserPhoto(uid: string, photoBase64: string): Promise<void> {
    const ref = doc(this.firestore, `users/${uid}`);
    localStorage.setItem(`user_photo_${uid}`, photoBase64);

    try {
      await setDoc(ref, {
        photoURL: photoBase64,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('Could not sync photo to firestore, persisted locally:', err);
    }

    const current = this.userProfile();
    this.userProfile.set({
      uid,
      name: current?.name || 'Operator',
      phone: current?.phone || '',
      businessName: current?.businessName,
      photoURL: photoBase64
    });
  }

  /**
   * Compress and convert an uploaded image to a compact Base64 JPEG
   */
  async compressImage(file: File, maxWidth = 256, maxHeight = 256): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Invalid image file'));
        img.src = e.target.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}
