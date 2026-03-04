import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDgXE6ZPCI5t5j7yCDzY0z_rv9mEEFcwRk",
  authDomain: "tuturno-c8de5.firebaseapp.com",
  projectId: "tuturno-c8de5",
  storageBucket: "tuturno-c8de5.firebasestorage.app",
  messagingSenderId: "181133777428",
  appId: "1:181133777428:web:0b8b1ad761a951e3072501",
  measurementId: "G-WCRE9HN6TF",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Messaging is only available in the browser
let messaging: Messaging | undefined;

if (typeof window !== "undefined") {
  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.error("Firebase Messaging failed to initialize:", err);
  }
}

export { app, messaging };
