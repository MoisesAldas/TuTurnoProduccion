# Archivo de Sonido para Notificaciones

## 📥 Descargar Sonido de Notificación

Necesitas agregar un archivo de sonido llamado `notification.mp3` en este directorio.

### Opción 1: Descargar de Zapsplat (Recomendado)

1. Ve a: https://www.zapsplat.com/
2. Busca: "notification sound short"
3. Descarga un sonido corto (0.5-1 segundo)
4. Renombra el archivo a `notification.mp3`
5. Colócalo en: `public/sounds/notification.mp3`

### Opción 2: Descargar de Freesound

1. Ve a: https://freesound.org/
2. Busca: "notification bell short"
3. Filtra por duración: < 2 segundos
4. Descarga con licencia Creative Commons
5. Renombra el archivo a `notification.mp3`
6. Colócalo en: `public/sounds/notification.mp3`

### Opción 3: Usar archivo de ejemplo (desarrollo)

Puedes usar cualquier archivo MP3 corto que tengas. Solo asegúrate de:
- Duración: 0.5-1 segundo
- Tamaño: < 50KB
- Formato: MP3
- Volumen: Moderado (el código lo ajustará a 50%)

### Opción 4: Crear tu propio sonido

Si tienes software de audio (Audacity, GarageBand, etc.):
1. Graba o genera un tono corto
2. Exporta como MP3
3. Nómbralo `notification.mp3`

## 🔧 Características Requeridas

- **Nombre:** `notification.mp3`
- **Duración:** 0.5-1 segundo
- **Tamaño:** 20-50KB
- **Formato:** MP3
- **Tono:** Agradable, no invasivo

## ✅ Verificar Instalación

Una vez agregado el archivo, verifica que exista:

```bash
# Windows
dir public\sounds\notification.mp3

# macOS/Linux
ls public/sounds/notification.mp3
```

El archivo debe estar en la ruta:
```
TuTurnoProduccion/
└── public/
    └── sounds/
        └── notification.mp3  ← Aquí
```

## 🚀 Prueba

Para probar el sonido:
1. Inicia el servidor de desarrollo
2. Accede al dashboard del negocio
3. Crea una cita desde el perfil del cliente
4. Deberías escuchar el sonido de notificación

## 🎵 Sonidos Recomendados

Algunos términos de búsqueda útiles:
- "notification bell"
- "message alert"
- "pop notification"
- "ding sound"
- "chime short"

## ⚠️ Importante

Si no agregas el archivo `notification.mp3`, el sistema funcionará pero:
- NO se reproducirá sonido al recibir notificaciones
- Verás un warning en la consola del navegador
- Las demás funcionalidades (toast, badge, panel) seguirán funcionando

## 📝 Notas

El volumen del sonido se ajusta automáticamente a 50% en el código:
```typescript
audioRef.current.volume = 0.5
```

Si el sonido es muy bajo o muy alto, puedes ajustar este valor en:
`src/components/NotificationBell.tsx` línea ~48
