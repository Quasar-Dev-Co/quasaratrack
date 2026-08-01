// Quasara Track - Firebase Configuration
// Replace these values with your Firebase project credentials
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBkLtROgX1UntSndnNsUzq5hmp1_D1uzpw",
  authDomain: "quasaratrack.firebaseapp.com",
  databaseURL: "https://quasaratrack-default-rtdb.firebaseio.com",
  projectId: "quasaratrack",
  storageBucket: "quasaratrack.firebasestorage.app",
  messagingSenderId: "30452171514",
  appId: "1:30452171514:web:372624a8caad6f43a07f43",
};

// Export for use in other extension scripts
if (typeof self !== "undefined") {
  self.FIREBASE_CONFIG = FIREBASE_CONFIG;
}
