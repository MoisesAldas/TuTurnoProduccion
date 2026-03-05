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

// Manejador de mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Background message received:",
    payload,
  );

  const notificationTitle =
    payload.notification?.title || payload.data?.title || "TuTurno";
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || "",
    icon: "/icons/icon-192x192.png", // Usar el icono de la PWA
    badge: "/icons/icon-192x192.png",
    vibrate: [200, 100, 200],
    tag: payload.data?.appointmentId || "general",
    data: {
      url: payload.data?.url || payload.fcmOptions?.link || "/",
    },
  };

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions,
  );
});

// Manejador de clics en la notificación
self.addEventListener("notificationclick", (event) => {
  console.log(
    "[firebase-messaging-sw.js] Notification clicked:",
    event.notification.tag,
  );

  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  // Intentar enfocar una pestaña existente o abrir una nueva
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Si ya hay una pestaña abierta con esa URL, enfocarla
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        // Si no, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});
