importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js",
);

const firebaseConfig = {
  apiKey: "AIzaSyDgXE6ZPCI5t5j7yCDzY0z_rv9mEEFcwRk",
  authDomain: "tuturno-c8de5.firebaseapp.com",
  projectId: "tuturno-c8de5",
  storageBucket: "tuturno-c8de5.firebasestorage.app",
  messagingSenderId: "181133777428",
  appId: "1:181133777428:web:0b8b1ad761a951e3072501",
  measurementId: "G-WCRE9HN6TF",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload,
  );

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/placeholder-logo.png", // Ajustar al logo real
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
