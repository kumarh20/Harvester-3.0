const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");
const { error } = require("console");

admin.initializeApp();

/**
 * SEND OTP
 */
exports.sendSignupOTP = functions.https.onCall(async (data) => {
  console.log('sendSignupOTP data', data);

  const rawPhone =
  data?.data?.phone ??
  data?.phone ??
  null;
 // 1️⃣ Check presence FIRST
 if (!rawPhone) {
  throw new functions.https.HttpsError(
   error,
   "Phone number is required"
  );
}

// 2️⃣ Normalize
let phone = String(data.phone).trim();

// remove spaces, +, -, etc
phone = phone.replace(/\D/g, '');

// keep last 10 digits (India)
if (phone.length > 10) {
  phone = phone.slice(-10);
}

// 3️⃣ SINGLE final validation
if (!rawPhone) {
  throw new functions.https.HttpsError(
    "invalid-argument",
    "Invalid phone number"
  );
}


  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

  await admin.firestore().collection("signup_otps").doc(phone).set({
    otpHash,
    expiresAt: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 60 * 1000) // 60 sec
    ),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await axios.post(
    "https://www.fast2sms.com/dev/bulkV2",
    {
      route: "otp",
      variables_values: otp,
      numbers: phone
    },
    {
      headers: {
        authorization: functions.config().fast2sms.key
      }
    }
  );

  return { success: true };
});

/**
 * VERIFY OTP
 */
exports.verifySignupOTP = functions.https.onCall(async (data) => {
  const { phone, otp } = data;

  const snap = await admin
    .firestore()
    .collection("signup_otps")
    .doc(phone)
    .get();

  if (!snap.exists) {
    throw new functions.https.HttpsError("not-found", "OTP not found");
  }

  const record = snap.data();

  if (record.expiresAt.toDate() < new Date()) {
    throw new functions.https.HttpsError("deadline-exceeded", "OTP expired");
  }

  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

  if (otpHash !== record.otpHash) {
    throw new functions.https.HttpsError("permission-denied", "Wrong OTP");
  }

  await admin.firestore().collection("signup_otps").doc(phone).delete();

  return { verified: true };
});