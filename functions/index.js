const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const twilio = require("twilio");
const { defineSecret } = require("firebase-functions/params");

admin.initializeApp();

const TWILIO_SID = defineSecret("TWILIO_SID");
const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");

/**
 * SEND WHATSAPP OTP (TWILIO)
 */
exports.sendWhatsAppOTP = functions.https.onCall(
  { secrets: [TWILIO_SID, TWILIO_AUTH_TOKEN] },
  async (data) => {

    const rawPhone =
      data?.phone ??
      data?.data?.phone ??
      null;

    if (!rawPhone) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Phone number required"
      );
    }

    // normalize phone
    let phone = String(rawPhone).replace(/\D/g, '');
    if (phone.length > 10) phone = phone.slice(-10);

    if (!/^[6-9]\d{9}$/.test(phone)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid phone number"
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    await admin.firestore().collection("whatsapp_otps").doc(phone).set({
      otpHash,
      expiresAt: Date.now() + 60 * 1000,
      createdAt: Date.now()
    });

    const client = twilio(
      TWILIO_SID.value(),
      TWILIO_AUTH_TOKEN.value()
    );

    await client.messages.create({
      from: "whatsapp:+14155238886",   // Twilio Sandbox number
      to: "whatsapp:+91" + phone,
      body: `Your OTP for Harvester signup is ${otp}. Valid for 1 minute.`
    });

    return { success: true };
  }
);



//Verify OTP

exports.verifyWhatsAppOTP = functions.https.onCall(async (data) => {
  const { phone, otp } = data;

  const snap = await admin
    .firestore()
    .collection("whatsapp_otps")
    .doc(phone)
    .get();

  if (!snap.exists) {
    throw new functions.https.HttpsError("not-found", "OTP not found");
  }

  const record = snap.data();

  if (record.expiresAt < Date.now()) {
    throw new functions.https.HttpsError("deadline-exceeded", "OTP expired");
  }

  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

  if (otpHash !== record.otpHash) {
    throw new functions.https.HttpsError("permission-denied", "Wrong OTP");
  }

  await admin.firestore().collection("whatsapp_otps").doc(phone).delete();

  return { verified: true };
});