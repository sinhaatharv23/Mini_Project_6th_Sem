const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
//Uses Google Account linked with Firebase project automatically.
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;