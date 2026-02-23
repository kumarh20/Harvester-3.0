const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");

admin.initializeApp();

const db = admin.firestore();

// Optional: set via Firebase config to force SMS via Transactional SMS (no voice).
// firebase functions:config:set twofactor.sender_id="YOUR_SENDER_ID"
const TSMS_SENDER_ID = process.env.TSMS_SENDER_ID

/* =========================
   SEND OTP (2FACTOR)
========================= */
exports.sendSignupOTP = functions.https.onCall(async (request) => {

  const rawPhone = request.data?.phone;
  const forSignup = request.data?.forSignup !== false; // default true for signup flow

  if (!rawPhone) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Phone number required"
    );
  }

  let phone = String(rawPhone).trim().replace(/\D/g, '');
  phone = phone.length > 10 ? phone.slice(-10) : phone;

  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid phone number"
    );
  }

  // For signup only: check Firebase first; send OTP only if new user
  if (forSignup) {
    const usersSnap = await db.collection("users").where("phone", "==", phone).limit(1).get();
    if (!usersSnap.empty) {
      return { success: false, existingUser: true };
    }
  }

  const apiKey = "27ff82d4-0e0e-11f1-bcb0-0200cd936042";

  // 2Factor can send VOICE instead of SMS: (1) Use POST not GET, (2) use 91 for India.
  const phoneWithCountryCode = phone.length === 10 ? `91${phone}` : phone;

  // If Sender ID is set, use Transactional SMS (TSMS) so delivery is always SMS, never voice.
  if (TSMS_SENDER_ID) {
    try {
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const sessionId = crypto.randomUUID();
      const tsmsUrl = `https://2factor.in/API/V1/${apiKey}/ADDON_SERVICES/SEND/TSMS`;
      await db.collection("otpSessions").doc(sessionId).set({
        phone: phoneWithCountryCode,
        otp,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      const response = await axios.post(tsmsUrl, {
        From: TSMS_SENDER_ID,
        To: phoneWithCountryCode,
        Msg: `Your OTP is ${otp}. Valid for 10 minutes.`,
        SendAt: ""
      }, {
        headers: { "Content-Type": "application/json" },
        timeout: 15000
      });

      if (response.data.Status !== "Success" && response.data.status !== "Success") {
        await db.collection("otpSessions").doc(sessionId).delete();
        throw new Error("TSMS send failed");
      }
      return { success: true, sessionId };
    } catch (err) {
      console.error("2Factor TSMS Send Error:", err);
      throw new functions.https.HttpsError("internal", "Failed to send OTP");
    }
  }

  try {

    const url = `https://2factor.in/API/V1/${apiKey}/SMS/${phoneWithCountryCode}/AUTOGEN`;

    // SMS = POST with explicit headers. GET or wrong format can trigger voice call.
    const response = await axios.post(url, {}, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000
    });

    if (response.data.Status !== "Success") {
      throw new Error("OTP send failed");
    }

    return {
      success: true,
      sessionId: response.data.Details
    };

  } catch (error) {
    console.error("2Factor Send Error:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to send OTP"
    );
  }
});


/* =========================
   VERIFY OTP (2FACTOR)
========================= */
exports.verifySignupOTP = functions.https.onCall(async (request) => {

  const sessionId = request.data?.sessionId;
  const otp = String(request.data?.otp || "").trim();
  const rawPhone = request.data?.phone;
  const forLogin = request.data?.forLogin === true;

  if (!sessionId || !otp) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "OTP verification data missing"
    );
  }

  let verifiedResult = { verified: true };
  let phoneNorm = null;

  // TSMS flow: session stored in Firestore
  const tsmsDoc = await db.collection("otpSessions").doc(sessionId).get();
  if (tsmsDoc.exists) {
    const data = tsmsDoc.data();
    const createdAt = data?.createdAt?.toMillis?.() || 0;
    if (Date.now() - createdAt > 10 * 60 * 1000) {
      await db.collection("otpSessions").doc(sessionId).delete();
      throw new functions.https.HttpsError("permission-denied", "OTP expired");
    }
    if (data?.otp !== otp) {
      throw new functions.https.HttpsError("permission-denied", "Invalid OTP");
    }
    await db.collection("otpSessions").doc(sessionId).delete();
    phoneNorm = rawPhone ? String(rawPhone).trim().replace(/\D/g, '').slice(-10) : (data?.phone ? String(data.phone).replace(/\D/g, '').slice(-10) : null);
    if (phoneNorm && phoneNorm.length === 10) {
      const usersSnap = await db.collection("users").where("phone", "==", phoneNorm).limit(1).get();
      verifiedResult.existingUser = !usersSnap.empty;
      if (forLogin && !usersSnap.empty) {
        const uid = usersSnap.docs[0].id || usersSnap.docs[0].data().uid;
        if (uid) {
          verifiedResult.customToken = await admin.auth().createCustomToken(uid);
        }
      }
    }
    return verifiedResult;
  }

  // AUTOGEN flow: verify via 2Factor
  try {
    const apiKey = "27ff82d4-0e0e-11f1-bcb0-0200cd936042";
    const url = `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY/${sessionId}/${otp}`;
    const response = await axios.get(url);

    if (response.data.Status !== "Success") {
      throw new Error("OTP verification failed");
    }

    if (rawPhone) {
      phoneNorm = String(rawPhone).trim().replace(/\D/g, '').slice(-10);
      if (phoneNorm.length === 10) {
        const usersSnap = await db.collection("users").where("phone", "==", phoneNorm).limit(1).get();
        verifiedResult.existingUser = !usersSnap.empty;
        if (forLogin && verifiedResult.existingUser) {
          const uid = usersSnap.docs[0].id || usersSnap.docs[0].data().uid;
          if (uid) {
            verifiedResult.customToken = await admin.auth().createCustomToken(uid);
          }
        }
      }
    }
    return verifiedResult;
  } catch (error) {
    console.error("2Factor Verify Error:", error);
    throw new functions.https.HttpsError(
      "permission-denied",
      "Invalid OTP"
    );
  }
});