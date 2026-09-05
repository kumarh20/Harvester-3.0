const admin = require('firebase-admin');

// Initialize Firebase Admin (guarded against re-initialization)
function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!rawServiceAccount) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not defined.');
    }
    const serviceAccount = typeof rawServiceAccount === 'string'
      ? JSON.parse(rawServiceAccount)
      : rawServiceAccount;

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  return admin;
}

// Enable CORS for Vercel Serverless Function
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Only POST is accepted / केवल POST अनुरोध मान्य है।'
    });
  }

  try {
    const { phoneNumber, otp } = req.body || {};

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are both required / मोबाइल नंबर और ओटीपी दोनों आवश्यक हैं।'
      });
    }

    // Sanitize phone number (last 10 digits) and OTP (trimmed)
    const cleanPhone = String(phoneNumber).replace(/\D/g, '').slice(-10);
    const cleanOtp = String(otp).trim();

    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit Indian phone number / कृपया मान्य 10 अंकों का मोबाइल नंबर दर्ज करें।'
      });
    }

    if (cleanOtp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 6-digit OTP / कृपया 6 अंकों का ओटीपी दर्ज करें।'
      });
    }

    // 1. Get Firebase Admin & Firestore
    const firebaseAdmin = getFirebaseAdmin();
    const db = firebaseAdmin.firestore();

    // 2. Fetch OTP record from Firestore 'otps' collection
    const docRef = db.collection('otps').doc(cleanPhone);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(400).json({
        success: false,
        message: 'No OTP request found for this number or already used. Please request a new OTP / इस नंबर के लिए कोई सक्रिय ओटीपी नहीं मिला। कृपया दोबारा ओटीपी भेजें।'
      });
    }

    const data = docSnap.data();
    const now = Date.now();

    // Determine expiration timestamp
    let expiresAtMs = 0;
    if (data.expiresAt && typeof data.expiresAt.toMillis === 'function') {
      expiresAtMs = data.expiresAt.toMillis();
    } else if (data.expiresAtMs) {
      expiresAtMs = Number(data.expiresAtMs);
    } else if (data.expiresAt) {
      expiresAtMs = new Date(data.expiresAt).getTime();
    }

    // 3. Check for expiration (5 minutes limit)
    if (now > expiresAtMs) {
      // Clean up expired OTP document
      await docRef.delete().catch(() => {});
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a fresh OTP / ओटीपी की समय सीमा समाप्त हो गई है। कृपया नया ओटीपी प्राप्त करें।'
      });
    }

    // 4. Check OTP match
    if (String(data.otp).trim() !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please check the code received on WhatsApp / गलत ओटीपी है। कृपया व्हाट्सएप पर आया सही कोड दर्ज करें।'
      });
    }

    // 5. On success: Delete the OTP document immediately to prevent replay
    await docRef.delete();

    // 6. Check if user already exists (from Email/Password or previous registration)
    let targetUid = null;
    let existingUserData = null;

    // 6a. Try finding in Firebase Auth by standard email (${cleanPhone}@harvester.app)
    try {
      const authUserByEmail = await firebaseAdmin.auth().getUserByEmail(`${cleanPhone}@harvester.app`);
      if (authUserByEmail && authUserByEmail.uid) {
        targetUid = authUserByEmail.uid;
        console.log(`[verify-otp] Found existing Auth user by email: ${targetUid}`);
      }
    } catch (e) {
      // User not found by email, continue
    }

    // 6b. Try finding in Firebase Auth by phone (+91${cleanPhone})
    if (!targetUid) {
      try {
        const authUserByPhone = await firebaseAdmin.auth().getUserByPhoneNumber(`+91${cleanPhone}`);
        if (authUserByPhone && authUserByPhone.uid) {
          targetUid = authUserByPhone.uid;
          console.log(`[verify-otp] Found existing Auth user by phone: ${targetUid}`);
        }
      } catch (e) {
        // User not found by phone, continue
      }
    }

    // 6c. Try finding in Firestore 'users' collection where phone == cleanPhone
    if (!targetUid) {
      try {
        const userQuery = await db.collection('users').where('phone', '==', cleanPhone).limit(1).get();
        if (!userQuery.empty) {
          const matchedDoc = userQuery.docs[0];
          targetUid = matchedDoc.id;
          existingUserData = matchedDoc.data();
          console.log(`[verify-otp] Found existing Firestore user doc: ${targetUid}`);
        }
      } catch (e) {
        console.warn('[verify-otp] Firestore user lookup failed:', e.message);
      }
    }

    // 6d. Try direct check for doc ID `phone_${cleanPhone}`
    if (!targetUid) {
      try {
        const directDoc = await db.collection('users').doc(`phone_${cleanPhone}`).get();
        if (directDoc.exists) {
          targetUid = `phone_${cleanPhone}`;
          existingUserData = directDoc.data();
          console.log(`[verify-otp] Found existing direct phone doc: ${targetUid}`);
        }
      } catch (e) {
        // Ignore
      }
    }

    // 6e. Fallback for new user
    if (!targetUid) {
      targetUid = `phone_${cleanPhone}`;
      console.log(`[verify-otp] Creating new user UID: ${targetUid}`);
    }

    // 7. Check or create Firestore user profile document
    const { fullName } = req.body || {};
    const userDocRef = db.collection('users').doc(targetUid);
    const existingDocSnap = await userDocRef.get();

    if (existingDocSnap.exists) {
      // Existing user: update last login and update name if supplied
      const updates = {
        lastLoginAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        phone: cleanPhone
      };
      if (fullName && (!existingDocSnap.data()?.name || existingDocSnap.data()?.name === 'Operator')) {
        updates.name = fullName;
      }
      await userDocRef.set(updates, { merge: true });
    } else {
      // New user or linking doc: create initial profile
      await userDocRef.set({
        uid: targetUid,
        name: fullName || (existingUserData?.name || 'Operator'),
        phone: cleanPhone,
        createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // 8. Ensure Firebase Auth user exists for this UID
    try {
      await firebaseAdmin.auth().getUser(targetUid);
    } catch (authErr) {
      try {
        await firebaseAdmin.auth().createUser({
          uid: targetUid,
          email: `${cleanPhone}@harvester.app`,
          displayName: fullName || (existingUserData?.name || 'Operator')
        });
      } catch (createErr) {
        console.warn('[verify-otp] Auth user auto-create note:', createErr.message);
      }
    }

    // 9. Generate Firebase Custom Token
    const customClaims = {
      phoneNumber: `+91${cleanPhone}`
    };

    const customToken = await firebaseAdmin.auth().createCustomToken(targetUid, customClaims);

    console.log(`[verify-otp] Successfully verified OTP for +91${cleanPhone} -> target UID: ${targetUid}`);

    return res.status(200).json({
      success: true,
      token: customToken,
      uid: targetUid,
      message: 'OTP verified successfully / ओटीपी सफलतापूर्वक सत्यापित हो गया।'
    });

  } catch (error) {
    console.error('[verify-otp] Error verifying OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while verifying OTP / सर्वर त्रुटि। कृपया पुनः प्रयास करें।',
      details: error.message
    });
  }
};
