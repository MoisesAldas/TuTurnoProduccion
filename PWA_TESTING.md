# 🧪 Guía de Testing PWA - TuTurno

## 📋 Checklist de Verificación

Antes de hacer testing, asegúrate de tener:

- ✅ Iconos generados en `public/icons/` (ver `PWA_ICONS_GUIDE.md`)
- ✅ Build de producción generado (`npm run build`)
- ✅ App corriendo en modo producción (`npm start`)
- ✅ HTTPS habilitado (en producción) o localhost (desarrollo)

---

## 🚀 Paso 1: Build y Start

```bash
# 1. Crear build de producción
npm run build

# 2. Iniciar en modo producción
npm start

# 3. Abrir en navegador
# http://localhost:3000
```

**⚠️ IMPORTANTE:** La PWA solo funciona en modo producción (`npm start`), NO en desarrollo (`npm run dev`).

---

## 🔍 Paso 2: Verificar con Chrome DevTools

### Application Tab

1. **Abrir DevTools:**
   - Presiona `F12` o `Ctrl+Shift+I` (Windows/Linux)
   - Presiona `Cmd+Option+I` (Mac)

2. **Ir a Application:**
   - Click en la pestaña "Application"
   - Sección "Manifest" en el sidebar izquierdo

3. **Verificar Manifest:**
   - ✅ Name: "TuTurno - Gestión de Citas Inteligente"
   - ✅ Short Name: "TuTurno"
   - ✅ Start URL: "/"
   - ✅ Theme Color: `#ea580c`
   - ✅ Background Color: `#ffffff`
   - ✅ Display: "standalone"
   - ✅ Icons: 8 iconos visibles (72px, 96px, 128px, 144px, 152px, 192px, 384px, 512px)

### Service Worker

1. **Ir a Service Workers:**
   - Application → Service Workers (sidebar)

2. **Verificar Estado:**
   - ✅ Status: "activated and is running"
   - ✅ Source: `sw.js`
   - ✅ "Update on reload" (opcional, para desarrollo)

3. **Verificar Cache Storage:**
   - Application → Cache Storage (sidebar)
   - Deberías ver varios caches:
     - `pages`
     - `static-image-assets`
     - `static-js-assets`
     - `static-style-assets`
     - `google-fonts-stylesheets`
     - Y otros...

---

## 🎯 Paso 3: Lighthouse Audit (PWA Score)

### Ejecutar Lighthouse

1. **Abrir DevTools:**
   - Presiona `F12`

2. **Ir a Lighthouse:**
   - Click en la pestaña "Lighthouse"

3. **Configurar Audit:**
   - ✅ Mode: "Navigation (Default)"
   - ✅ Device: "Mobile" (o "Desktop" para probar ambos)
   - ✅ Categories: Marcar solo "Progressive Web App"
   - Click en "Analyze page load"

4. **Esperar Resultados:**
   - El análisis toma ~30 segundos

### Interpretación de Resultados

**🎯 Meta: 100% en PWA Score**

#### ✅ Checks que deben pasar:

- ✅ **Installable:**
  - Registers a service worker
  - Web app manifest meets requirements
  - Has a valid service worker

- ✅ **PWA Optimized:**
  - Uses HTTPS
  - Redirects HTTP traffic to HTTPS (en producción)
  - Viewport is mobile-friendly
  - Content is sized correctly for viewport

- ✅ **Offline Capability:**
  - Current page responds with 200 when offline
  - Start URL responds with 200 when offline

- ✅ **User Experience:**
  - Provides a valid apple-touch-icon
  - Configured for a custom splash screen
  - Sets a theme color for the address bar

#### ⚠️ Warnings Comunes (Aceptables):

- ⚠️ "Does not use HTTPS" → Normal en localhost
- ⚠️ "Manifest doesn't have maskable icon" → Opcional, puedes ignorarlo
- ⚠️ "Apple touch icon too small" → Si usas 152×152px está bien

---

## 📱 Paso 4: Testing en Móvil (Android)

### Chrome Android

1. **Deploy a Producción:**
   - Despliega en Vercel/Netlify con HTTPS
   - O usa `ngrok` para exponer localhost:
     ```bash
     npx ngrok http 3000
     ```

2. **Abrir en Chrome Android:**
   - Navega a tu URL de producción
   - Espera 3-5 segundos

3. **Instalar PWA:**
   - Aparecerá un banner "Agregar a pantalla de inicio"
   - O bien: Menú (⋮) → "Instalar aplicación"

4. **Verificar Instalación:**
   - ✅ Ícono aparece en el launcher de Android
   - ✅ Al abrir, se abre en modo standalone (sin barra de navegador)
   - ✅ El ícono se ve correcto
   - ✅ El splash screen aparece al abrir (naranja #ea580c)

### Samsung Internet

Similar a Chrome, pero:
- Menú → "Agregar página a"
- Seleccionar "Pantalla de inicio"

---

## 🍎 Paso 5: Testing en iOS (Safari)

### iPhone/iPad

1. **Abrir en Safari:**
   - Navega a tu URL de producción (HTTPS requerido)

2. **Agregar a Home Screen:**
   - Tap en el ícono de "Compartir" (⬆️)
   - Scroll y seleccionar "Agregar a inicio"
   - Confirmar

3. **Verificar:**
   - ✅ Ícono aparece en home screen
   - ✅ Al abrir, modo standalone
   - ✅ Splash screen personalizado

**⚠️ Nota iOS:**
- iOS no soporta service workers completamente
- El offline capability es limitado
- Manifest shortcuts no funcionan en iOS

---

## 🧪 Paso 6: Testing Offline

### Simular Modo Offline

1. **Chrome DevTools:**
   - F12 → Network tab
   - Cambiar "Online" a "Offline" (dropdown)

2. **Refrescar página:**
   - Presiona `Ctrl+R` o `F5`

3. **Verificar:**
   - ✅ La página debe cargar desde cache
   - ✅ Assets estáticos (CSS, JS, imágenes) deben cargar
   - ⚠️ API calls fallarán (esperado)

### Testing Real

1. **Móvil:**
   - Abre la PWA instalada
   - Activa modo avión
   - Navega por la app

2. **Esperado:**
   - ✅ Páginas ya visitadas cargan
   - ✅ Imágenes/CSS/JS cargan
   - ❌ Nuevas peticiones de API fallan (comportamiento esperado)

---

## 🎨 Paso 7: Verificar Shortcuts (Android Only)

### Long Press en Android

1. **Instalar PWA** en Android
2. **Long press** en el ícono de TuTurno
3. **Verificar shortcuts:**
   - 📅 Mis Citas → `/dashboard/business/appointments`
   - 👥 Clientes → `/dashboard/business/clients`
   - 🏪 Marketplace → `/marketplace`

**⚠️ Nota:** iOS no soporta shortcuts, solo Android 7.1+

---

## 📊 Benchmarks Esperados

| Métrica | Target | Resultado Esperado |
|---------|--------|-------------------|
| **PWA Score (Lighthouse)** | 100% | ✅ |
| **Installability** | Installable | ✅ |
| **Offline capability** | Partial | ✅ (páginas cacheadas) |
| **HTTPS** | Required | ✅ (producción) |
| **Service Worker** | Active | ✅ |
| **Manifest valid** | Yes | ✅ |
| **Icons loaded** | 8/8 | ✅ |
| **Splash screen** | Custom | ✅ (Android) |
| **Theme color** | #ea580c | ✅ |
| **Shortcuts** | 3 items | ✅ (Android only) |

---

## 🐛 Troubleshooting

### "Manifest errors" en DevTools

**Problema:** No se encuentra manifest.json

**Solución:**
```bash
# Verifica que existe
ls public/manifest.json

# Rebuild
npm run build
npm start
```

---

### "Service Worker not registered"

**Problema:** SW no se registra

**Solución:**
1. Verifica que estés en `npm start` (NO `npm run dev`)
2. Verifica que `disable: process.env.NODE_ENV === 'development'` en `next.config.mjs`
3. Hard refresh: `Ctrl+Shift+R` (Windows) o `Cmd+Shift+R` (Mac)

---

### "Icons not loading"

**Problema:** Los iconos no aparecen

**Solución:**
1. Verifica que los archivos existen en `public/icons/`
2. Nombres deben ser exactos: `icon-72x72.png`, `icon-96x96.png`, etc.
3. Rebuild: `npm run build`

---

### "Cannot install PWA" en Chrome

**Problema:** No aparece banner de instalación

**Solución:**
1. Verifica HTTPS (o localhost)
2. Verifica que Service Worker esté activo
3. Verifica que manifest.json sea válido
4. Chrome DevTools → Application → Manifest → "Errors and warnings"
5. Espera 3-5 segundos (Chrome tiene delay intencional)

---

### "Offline doesn't work"

**Problema:** Páginas no cargan offline

**Solución:**
1. Visita las páginas PRIMERO con conexión (para cachearlas)
2. Verifica que Service Worker tenga estrategia de cache
3. DevTools → Application → Cache Storage → verifica que haya archivos

---

## ✅ Checklist Final

Antes de desplegar a producción:

- [ ] PWA Score en Lighthouse = 100%
- [ ] Manifest.json válido sin errores
- [ ] 8 iconos generados y cargando
- [ ] Service Worker activo
- [ ] Instalable en Chrome Android
- [ ] Instalable en Safari iOS
- [ ] Shortcuts funcionando (Android)
- [ ] Splash screen personalizado
- [ ] Theme color correcto (#ea580c)
- [ ] Funciona offline (páginas visitadas)
- [ ] HTTPS en producción

---

## 🚀 Deploy a Producción

### Vercel

```bash
# Vercel automáticamente soporta PWA
vercel --prod

# HTTPS incluido, certificado SSL gratis
```

### Netlify

```bash
# Netlify también soporta PWA out-of-the-box
netlify deploy --prod

# HTTPS incluido
```

**⚠️ Importante:** Ambas plataformas tienen HTTPS por defecto, requerido para PWA.

---

## 📚 Recursos Adicionales

- **PWA Builder:** https://www.pwabuilder.com/
- **Workbox Docs:** https://developers.google.com/web/tools/workbox
- **Next PWA Docs:** https://github.com/shadowwalker/next-pwa
- **Web.dev PWA Guide:** https://web.dev/progressive-web-apps/
- **Chrome DevTools PWA:** https://developer.chrome.com/docs/devtools/progressive-web-apps/

---

**¡Listo! Tu PWA de TuTurno está lista para instalarse como una app nativa.** 📱✨
