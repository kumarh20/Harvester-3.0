"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWhatsAppOtp = exports.sendWhatsAppOtp = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const crypto = __importStar(require("crypto"));
// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const auth = admin.auth();
// Define MSG91 Secret
const MSG91_AUTH_KEY = (0, params_1.defineSecret)('MSG91_AUTH_KEY');
const MSG91_WHATSAPP_ENDPOINT = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';
const MSG91_INTEGRATED_NUMBER = '15553468317';
const MSG91_TEMPLATE_NAME = 'login_otp';
const MSG91_TEMPLATE_LANG = 'en';
const OTP_EXPIRY_SECONDS = 300; // 5 minutes
const RESEND_COOLDOWN_SECONDS = 45; // 45 seconds cooldown
const MAX_VERIFY_ATTEMPTS = 5;
/**
 * Normalizes a phone number to standard formats
 * - Returns digits only with country code (defaulting to 91 for 10-digit Indian numbers)
 */
function normalizePhone(rawPhone) {
    if (!rawPhone || typeof rawPhone !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Phone number is required.');
    }
    // Remove spaces, dashes, parentheses, plus
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.length === 10) {
        // 10-digit Indian number
        return {
            e164: `+91${digits}`,
            msg91Recipient: `91${digits}`,
            phone10: digits,
        };
    }
    else if (digits.length === 12 && digits.startsWith('91')) {
        return {
            e164: `+${digits}`,
            msg91Recipient: digits,
            phone10: digits.substring(2),
        };
    }
    else if (digits.length >= 10 && digits.length <= 15) {
        return {
            e164: `+${digits}`,
            msg91Recipient: digits,
            phone10: digits.slice(-10),
        };
    }
    throw new https_1.HttpsError('invalid-argument', 'Please provide a valid phone number (10 to 15 digits).');
}
/**
 * Generates a SHA-256 hash of the OTP combined with salt
 */
function hashOtp(otp, sessionId) {
    return crypto.createHash('sha256').update(`${sessionId}:${otp}`).digest('hex');
}
/**
 * Cloud Function: sendWhatsAppOtp
 * Region: us-central1
 * Generates secure OTP, saves session in Firestore, sends WhatsApp message via MSG91
 */
exports.sendWhatsAppOtp = (0, https_1.onCall)({
    region: 'us-central1',
    secrets: [MSG91_AUTH_KEY],
}, async (request) => {
    const rawPhone = request.data?.phone;
    if (!rawPhone) {
        throw new https_1.HttpsError('invalid-argument', 'Phone number is required.');
    }
    const { msg91Recipient, phone10 } = normalizePhone(rawPhone);
    const now = admin.firestore.Timestamp.now();
    const nowMillis = now.toMillis();
    // Check rate limiting / cooldown on recent sessions for this phone
    const recentSessionsQuery = await db
        .collection('whatsapp_otp_sessions')
        .where('phone10', '==', phone10)
        .where('consumed', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    if (!recentSessionsQuery.empty) {
        const lastSession = recentSessionsQuery.docs[0].data();
        const lastCreatedAt = lastSession.createdAt?.toMillis?.() || 0;
        const elapsedSeconds = (nowMillis - lastCreatedAt) / 1000;
        if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
            const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds);
            throw new https_1.HttpsError('resource-exhausted', `Please wait ${remaining} seconds before requesting a new OTP.`);
        }
    }
    // Generate secure 6-digit OTP
    const otpNumber = crypto.randomInt(100000, 1000000);
    const otp = otpNumber.toString();
    const sessionId = crypto.randomUUID();
    const hashedOtp = hashOtp(otp, sessionId);
    const expiresAt = admin.firestore.Timestamp.fromMillis(nowMillis + OTP_EXPIRY_SECONDS * 1000);
    // Save session in Firestore
    await db.collection('whatsapp_otp_sessions').doc(sessionId).set({
        sessionId,
        phone10,
        recipient: msg91Recipient,
        hashedOtp,
        attempts: 0,
        consumed: false,
        createdAt: now,
        expiresAt: expiresAt,
    });
    // Prepare MSG91 WhatsApp API payload
    const authKey = MSG91_AUTH_KEY.value() || process.env.MSG91_AUTH_KEY;
    if (!authKey) {
        console.error('MSG91_AUTH_KEY secret is not configured.');
        throw new https_1.HttpsError('internal', 'WhatsApp service is temporarily unavailable.');
    }
    const msg91Payload = {
        integrated_number: MSG91_INTEGRATED_NUMBER,
        content_type: 'template',
        payload: {
            to: msg91Recipient,
            type: 'template',
            template: {
                name: MSG91_TEMPLATE_NAME,
                language: {
                    code: MSG91_TEMPLATE_LANG,
                    policy: 'deterministic',
                },
                components: {
                    body_1: {
                        type: 'text',
                        value: otp,
                    },
                    button_1: {
                        subtype: 'url',
                        type: 'text',
                        value: otp,
                    },
                },
            },
        },
    };
    try {
        const response = await fetch(MSG91_WHATSAPP_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                authkey: authKey,
            },
            body: JSON.stringify(msg91Payload),
        });
        const responseText = await response.text();
        let responseJson = {};
        try {
            responseJson = JSON.parse(responseText);
        }
        catch {
            // response was not json
        }
        if (!response.ok || (responseJson.status && responseJson.status === 'error')) {
            console.error('MSG91 API error:', response.status, responseText);
            throw new Error(responseJson.message || 'Failed to dispatch WhatsApp message via provider.');
        }
    }
    catch (err) {
        console.error('Failed to send OTP via MSG91 WhatsApp:', err);
        // Mark session as failed
        await db.collection('whatsapp_otp_sessions').doc(sessionId).update({
            consumed: true,
            error: err?.message || 'Send failure',
        });
        throw new https_1.HttpsError('internal', 'Failed to deliver OTP to WhatsApp. Please try again.');
    }
    return {
        success: true,
        sessionId,
        expiresInSeconds: OTP_EXPIRY_SECONDS,
    };
});
/**
 * Cloud Function: verifyWhatsAppOtp
 * Region: us-central1
 * Verifies OTP hash, consumes session, finds or creates user, and returns Firebase custom token
 */
exports.verifyWhatsAppOtp = (0, https_1.onCall)({
    region: 'us-central1',
}, async (request) => {
    const { sessionId, otp, phone } = request.data || {};
    if (!sessionId || typeof sessionId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Session ID is required.');
    }
    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
        throw new https_1.HttpsError('invalid-argument', 'Please enter a valid 6-digit OTP.');
    }
    const sessionDocRef = db.collection('whatsapp_otp_sessions').doc(sessionId);
    const sessionSnap = await sessionDocRef.get();
    if (!sessionSnap.exists) {
        throw new https_1.HttpsError('not-found', 'OTP session not found or expired.');
    }
    const session = sessionSnap.data();
    if (session.consumed) {
        throw new https_1.HttpsError('failed-precondition', 'This OTP has already been used.');
    }
    const nowMillis = Date.now();
    const expiresAtMillis = session.expiresAt?.toMillis?.() || 0;
    if (nowMillis > expiresAtMillis) {
        await sessionDocRef.update({ consumed: true });
        throw new https_1.HttpsError('deadline-exceeded', 'OTP has expired. Please request a new one.');
    }
    if ((session.attempts || 0) >= MAX_VERIFY_ATTEMPTS) {
        await sessionDocRef.update({ consumed: true });
        throw new https_1.HttpsError('permission-denied', 'Maximum verification attempts exceeded. Please request a new OTP.');
    }
    // Optional phone check
    if (phone) {
        const { phone10 } = normalizePhone(phone);
        if (session.phone10 && session.phone10 !== phone10) {
            throw new https_1.HttpsError('invalid-argument', 'Phone number mismatch.');
        }
    }
    // Verify hash
    const expectedHash = hashOtp(otp, sessionId);
    if (expectedHash !== session.hashedOtp) {
        await sessionDocRef.update({
            attempts: admin.firestore.FieldValue.increment(1),
        });
        throw new https_1.HttpsError('invalid-argument', 'Invalid OTP. Please check and try again.');
    }
    // Mark session as consumed and verified
    await sessionDocRef.update({
        consumed: true,
        verified: true,
        verifiedAt: admin.firestore.Timestamp.now(),
    });
    const phone10 = session.phone10;
    const email = `${phone10}@harvester.app`;
    // Find or create Firebase Auth user
    let userRecord;
    try {
        userRecord = await auth.getUserByEmail(email);
    }
    catch (err) {
        if (err.code === 'auth/user-not-found') {
            // Create user in Firebase Auth
            userRecord = await auth.createUser({
                email,
                emailVerified: true,
                displayName: `Harvester User ${phone10}`,
            });
            // Initialize user doc in Firestore if needed
            try {
                await db.collection('users').doc(userRecord.uid).set({
                    uid: userRecord.uid,
                    phone: phone10,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
            }
            catch (dbErr) {
                console.warn('Could not auto-create user document in Firestore:', dbErr);
            }
        }
        else {
            throw new https_1.HttpsError('internal', 'Authentication lookup failed.');
        }
    }
    // Generate Firebase Custom Token
    const customToken = await auth.createCustomToken(userRecord.uid);
    return {
        verified: true,
        customToken,
        uid: userRecord.uid,
    };
});
//# sourceMappingURL=index.js.map