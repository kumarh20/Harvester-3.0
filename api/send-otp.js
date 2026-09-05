const admin = require('firebase-admin');
const axios = require('axios');

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
    const { phoneNumber, mode } = req.body || {};

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required / मोबाइल नंबर आवश्यक है।'
      });
    }

    // Sanitize phone number: strip non-digits, keep last 10 digits
    const cleanPhone = String(phoneNumber).replace(/\D/g, '').slice(-10);

    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit Indian phone number / कृपया मान्य 10 अंकों का मोबाइल नंबर दर्ज करें।'
      });
    }

    const authKey = process.env.MSG91_AUTH_KEY;
    const integratedNumber = process.env.MSG91_WHATSAPP_NUMBER || '15553468317';

    if (!authKey) {
      console.error('Missing MSG91 credentials in environment variables.');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: MSG91 credentials missing / सर्वर कॉन्फ़िगरेशन त्रुटि।'
      });
    }

    // 1. Initialize Firebase Admin & Firestore
    const firebaseAdmin = getFirebaseAdmin();
    const db = firebaseAdmin.firestore();

    // 2. Perform user existence validation if mode is specified
    if (mode === 'login' || mode === 'signup') {
      let userExists = false;

      // Check in Firebase Auth by standard email
      try {
        const u = await firebaseAdmin.auth().getUserByEmail(`${cleanPhone}@harvester.app`);
        if (u && u.uid) userExists = true;
      } catch (e) {}

      // Check in Firebase Auth by phone
      if (!userExists) {
        try {
          const u = await firebaseAdmin.auth().getUserByPhoneNumber(`+91${cleanPhone}`);
          if (u && u.uid) userExists = true;
        } catch (e) {}
      }

      // Check in Firestore collection 'users'
      if (!userExists) {
        try {
          const q = await db.collection('users').where('phone', '==', cleanPhone).limit(1).get();
          if (!q.empty) userExists = true;
        } catch (e) {}
      }

      // Check direct document ID 'phone_...'
      if (!userExists) {
        try {
          const docSnap = await db.collection('users').doc(`phone_${cleanPhone}`).get();
          if (docSnap.exists) userExists = true;
        } catch (e) {}
      }

      if (mode === 'login' && !userExists) {
        return res.status(404).json({
          success: false,
          code: 'USER_NOT_FOUND',
          message: 'This number is not registered. Please sign up first / यह नंबर पंजीकृत नहीं है। कृपया पहले साइन अप करें।'
        });
      }

      if (mode === 'signup' && userExists) {
        return res.status(400).json({
          success: false,
          code: 'USER_ALREADY_EXISTS',
          message: 'This number is already registered. Please sign in / यह नंबर पहले से पंजीकृत है। कृपया लॉगिन करें।'
        });
      }
    }

    // 3. Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Store OTP in Firestore collection 'otps' with document ID = cleanPhone
    // Expires in 5 minutes
    const now = Date.now();
    const expiresAtDate = new Date(now + 5 * 60 * 1000);

    await db.collection('otps').doc(cleanPhone).set({
      otp: otp,
      phoneNumber: cleanPhone,
      expiresAt: firebaseAdmin.firestore.Timestamp.fromDate(expiresAtDate),
      expiresAtMs: expiresAtDate.getTime(),
      createdAt: firebaseAdmin.firestore.Timestamp.now()
    });

    // 4. Call MSG91 WhatsApp Outbound API using template 'login_otp'
    const msg91Endpoint = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';
    const languageCode = process.env.MSG91_TEMPLATE_LANG || 'en';
    const namespace = process.env.MSG91_TEMPLATE_NAMESPACE || '7361e882_3e06_4801_8367_0d870584da11';

    const msg91Payload = {
      integrated_number: integratedNumber,
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        type: 'template',
        template: {
          name: 'login_otp',
          language: {
            code: languageCode,
            policy: 'deterministic'
          },
          namespace: namespace,
          to_and_components: [
            {
              to: [`91${cleanPhone}`],
              components: {
                body_1: {
                  type: 'text',
                  value: otp
                },
                button_1: {
                  subtype: 'url',
                  type: 'text',
                  value: otp
                }
              }
            }
          ]
        }
      }
    };

    const response = await axios.post(msg91Endpoint, msg91Payload, {
      headers: {
        authkey: authKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`[send-otp] OTP generated and sent to +91${cleanPhone}. MSG91 response:`, response.data);

    // Check if MSG91 returned an application-level error
    const data = response.data;
    if (data && (data.status === 'error' || data.status === 'fail' || data.type === 'error' || data.hasError)) {
      return res.status(400).json({
        success: false,
        message: data.message || 'MSG91 error delivering WhatsApp message.',
        msg91Response: data
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your WhatsApp number / आपके व्हाट्सएप पर ओटीपी भेज दिया गया है।',
      msg91Response: data
    });

  } catch (error) {
    console.error('[send-otp] Error sending OTP:', error?.response?.data || error?.message || error);
    
    const apiError = error?.response?.data?.message || error?.message;
    return res.status(500).json({
      success: false,
      message: 'Failed to send WhatsApp OTP. Please check your number or try again / व्हाट्सएप ओटीपी भेजने में विफल। कृपया पुनः प्रयास करें।',
      details: apiError
    });
  }
};
