# Guía de Integración SonarQube - TuTurno

## Introducción

SonarQube es una plataforma de análisis estático de código que permite identificar bugs, vulnerabilidades de seguridad, code smells y duplicación de código. Esta guía proporciona tres opciones de integración adaptadas a diferentes necesidades del proyecto TuTurno, desde análisis continuo en la nube hasta validación en tiempo real durante el desarrollo.

La implementación de SonarQube en este proyecto de tesis aporta valor académico al demostrar el compromiso con las mejores prácticas de ingeniería de software, proporcionando métricas objetivas de calidad de código que pueden ser incluidas en la documentación técnica.

---

## Opción 1: SonarCloud (Recomendado para Tesis) ☁️

### Descripción

SonarCloud es la versión cloud de SonarQube, ideal para proyectos open-source y repositorios públicos. No requiere infraestructura local y se integra perfectamente con GitHub Actions para análisis automático en cada push.

### Ventajas

✅ **Gratuito** para repositorios públicos
✅ **Sin configuración de servidor** (cero mantenimiento)
✅ **Integración nativa** con GitHub/GitLab/Bitbucket
✅ **Dashboard online** accesible desde cualquier lugar
✅ **Historial completo** de análisis
✅ **Ideal para tesis** (fácil de capturar métricas para documentación)

### Pasos de Configuración

#### Paso 1: Crear cuenta en SonarCloud

1. Acceder a [sonarcloud.io](https://sonarcloud.io)
2. Hacer clic en "Log in" y seleccionar "GitHub"
3. Autorizar SonarCloud para acceder a tu repositorio
4. Hacer clic en "+" → "Analyze new project"
5. Seleccionar el repositorio `tuturno-produccion`
6. Copiar el **Organization Key** (lo necesitarás para `sonar-project.properties`)
7. Generar un **SONAR_TOKEN**:
   - Click en tu avatar → My Account → Security
   - Generate Token → darle un nombre (ej: "GitHub Actions")
   - **Copiar el token** (solo se muestra una vez)

#### Paso 2: Configurar GitHub Secrets

1. Ir a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Crear el secret:
   - **Name:** `SONAR_TOKEN`
   - **Value:** [pegar el token copiado de SonarCloud]
5. Click "Add secret"

#### Paso 3: Actualizar sonar-project.properties

El archivo `sonar-project.properties` ya está creado. Solo debes actualizar la línea 7:

```properties
sonar.organization=tu-organizacion
```

Reemplaza `tu-organizacion` con tu **Organization Key** de SonarCloud (lo copiaste en el Paso 1).

#### Paso 4: Ejecutar el primer análisis

El workflow de GitHub Actions (`.github/workflows/sonarcloud.yml`) ya está configurado. Para activarlo:

```bash
# 1. Asegúrate de que todos los archivos estén agregados
git add .

# 2. Crear commit
git commit -m "feat: add SonarCloud integration"

# 3. Push a GitHub
git push origin main
```

#### Paso 5: Verificar resultados

1. Ir a GitHub → pestaña "Actions"
2. Verás el workflow "SonarCloud Analysis" ejecutándose
3. Una vez completado (2-3 minutos), ve a [sonarcloud.io](https://sonarcloud.io)
4. Click en tu proyecto "TuTurno"
5. Verás el dashboard con métricas:
   - **Bugs** detectados
   - **Vulnerabilities** de seguridad
   - **Code Smells** (mejoras de calidad)
   - **Coverage** (si tienes tests)
   - **Duplications** (código duplicado)
   - **Technical Debt** (tiempo estimado para resolver issues)

### Interpretación de Métricas (Para tu Tesis)

| Métrica | Descripción | Valor Ideal |
|---------|-------------|-------------|
| **Reliability Rating** | A-E (bugs detectados) | A (0 bugs) |
| **Security Rating** | A-E (vulnerabilidades) | A (0 vulnerabilidades) |
| **Maintainability Rating** | A-E (code smells) | A o B (< 5% deuda técnica) |
| **Coverage** | % de código con tests | > 80% |
| **Duplications** | % de código duplicado | < 3% |
| **Technical Debt** | Tiempo para resolver issues | < 8 horas |

Puedes capturar estos datos para tu sección de "Calidad de Software" en la tesis.

---

## Opción 2: SonarQube Local con Docker 🐳

### Descripción

Instalación local de SonarQube usando Docker, ideal para análisis offline o cuando necesitas más control sobre la configuración.

### Ventajas

✅ **Privacidad total** (datos no salen de tu máquina)
✅ **Sin límites de análisis** (sin cuotas)
✅ **Personalización completa** (plugins, reglas custom)
✅ **Funciona offline** (sin conexión a internet)

### Requisitos Previos

- Docker Desktop instalado ([docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop))
- 4 GB de RAM disponible
- 5 GB de espacio en disco

### Pasos de Configuración

#### Paso 1: Iniciar SonarQube

```bash
# En la raíz del proyecto TuTurnoProduccion
docker-compose -f docker-compose.sonarqube.yml up -d
```

Esperar 2-3 minutos mientras SonarQube inicia.

#### Paso 2: Configurar SonarQube

1. Abrir navegador en [http://localhost:9000](http://localhost:9000)
2. Login inicial:
   - **Username:** admin
   - **Password:** admin
3. Te pedirá cambiar la contraseña → elige una segura
4. Click en "Create Project" → "Manually"
5. Configurar proyecto:
   - **Project key:** `tuturno_tuturno-produccion`
   - **Display name:** `TuTurno`
6. Click "Set Up" → "Locally"
7. Generar token:
   - **Token name:** `local-analysis`
   - Click "Generate"
   - **Copiar el token** (lo necesitarás)

#### Paso 3: Instalar SonarScanner

```bash
# Instalar como dependencia de desarrollo
npm install -D sonarqube-scanner
```

#### Paso 4: Ejecutar análisis

```bash
# Reemplaza YOUR_TOKEN con el token generado en Paso 2
npx sonar-scanner \
  -Dsonar.projectKey=tuturno_tuturno-produccion \
  -Dsonar.sources=. \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=YOUR_TOKEN
```

**En Windows PowerShell:**

```powershell
npx sonar-scanner `
  -Dsonar.projectKey=tuturno_tuturno-produccion `
  -Dsonar.sources=. `
  -Dsonar.host.url=http://localhost:9000 `
  -Dsonar.login=YOUR_TOKEN
```

#### Paso 5: Ver resultados

1. El análisis tomará 3-5 minutos
2. Refrescar [http://localhost:9000](http://localhost:9000)
3. Click en "TuTurno" → verás el dashboard

### Comandos Útiles

```bash
# Detener SonarQube
docker-compose -f docker-compose.sonarqube.yml down

# Reiniciar SonarQube
docker-compose -f docker-compose.sonarqube.yml restart

# Ver logs
docker-compose -f docker-compose.sonarqube.yml logs -f

# Eliminar completamente (incluye datos)
docker-compose -f docker-compose.sonarqube.yml down -v
```

---

## Opción 3: SonarLint (Análisis en Tiempo Real) 💡

### Descripción

SonarLint es una extensión de IDE que detecta problemas **mientras escribes código**, antes de hacer commit.

### Ventajas

✅ **Feedback instantáneo** (subraya errores como un linter)
✅ **No requiere servidor** (análisis local)
✅ **Se integra con SonarCloud/SonarQube** (sincroniza reglas)
✅ **Aumenta productividad** (arreglas issues antes de push)

### Instalación

#### Para Visual Studio Code:

1. Abrir VS Code
2. Ir a Extensions (Ctrl+Shift+X)
3. Buscar "SonarLint"
4. Click "Install" en la extensión oficial de SonarSource

#### Para JetBrains (WebStorm, IntelliJ):

1. Settings → Plugins
2. Buscar "SonarLint"
3. Click "Install"

### Configuración (Opcional - Conectar con SonarCloud)

Si usas la Opción 1 (SonarCloud), puedes sincronizar las reglas:

1. En VS Code: Ctrl+Shift+P → "SonarLint: Connect to SonarCloud"
2. Autorizar con GitHub
3. Seleccionar organización y proyecto "TuTurno"

Ahora SonarLint usará las mismas reglas que SonarCloud.

### Uso

- **Automático:** SonarLint analiza archivos al abrirlos
- **Problemas:** aparecen subrayados con squigglies (~~~)
- **Ver detalles:** hover sobre el error → verás descripción y solución
- **Panel de problemas:** View → Problems (Ctrl+Shift+M)

---

## Interpretación de Resultados para Tesis

### Métricas Clave para Documentar

#### 1. Complejidad Ciclomática

- **Qué es:** Número de caminos independientes en el código
- **Ideal:** < 10 por función
- **Para tesis:** Demostrar que el código es mantenible

#### 2. Cobertura de Tests

- **Qué es:** % de código ejecutado por tests
- **Ideal:** > 80%
- **Para tesis:** Evidencia de pruebas exhaustivas

#### 3. Deuda Técnica

- **Qué es:** Tiempo estimado para resolver todos los code smells
- **Ideal:** < 5% del tiempo total de desarrollo
- **Para tesis:** Métrica de sostenibilidad del proyecto

#### 4. Duplicación de Código

- **Qué es:** % de líneas duplicadas
- **Ideal:** < 3%
- **Para tesis:** Adherencia al principio DRY

#### 5. Severidad de Issues

- **Blocker:** Bugs que pueden romper la aplicación (0 esperado)
- **Critical:** Vulnerabilidades de seguridad (0 esperado)
- **Major:** Code smells importantes (minimizar)
- **Minor:** Mejoras opcionales (aceptable)

### Cómo Capturar Datos para la Tesis

#### Opción 1: Screenshots de SonarCloud

1. Ir a tu proyecto en SonarCloud
2. Capturar screenshots de:
   - Overview (Reliability, Security, Maintainability)
   - Issues (lista de problemas detectados)
   - Code (hotspots de duplicación)
   - Activity (evolución temporal)

#### Opción 2: Exportar Métricas

SonarCloud permite exportar datos vía API:

```bash
# Ejemplo: obtener métricas principales
curl -u YOUR_TOKEN: \
  "https://sonarcloud.io/api/measures/component?component=tuturno_tuturno-produccion&metricKeys=bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density"
```

Respuesta (JSON):

```json
{
  "component": {
    "measures": [
      {"metric": "bugs", "value": "2"},
      {"metric": "vulnerabilities", "value": "0"},
      {"metric": "code_smells", "value": "34"},
      {"metric": "coverage", "value": "78.5"},
      {"metric": "duplicated_lines_density", "value": "2.1"}
    ]
  }
}
```

#### Opción 3: Generar Badge para README

SonarCloud ofrece badges markdown:

```markdown
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=tuturno_tuturno-produccion&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=tuturno_tuturno-produccion)

[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=tuturno_tuturno-produccion&metric=bugs)](https://sonarcloud.io/summary/new_code?id=tuturno_tuturno-produccion)

[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=tuturno_tuturno-produccion&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=tuturno_tuturno-produccion)

[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=tuturno_tuturno-produccion&metric=coverage)](https://sonarcloud.io/summary/new_code?id=tuturno_tuturno-produccion)
```

---

## Solución de Problemas

### Error: "Shallow clone detected"

**Causa:** GitHub Actions hizo un clone superficial (sin historial).

**Solución:** Ya está configurado en `.github/workflows/sonarcloud.yml`:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Descarga historial completo
```

### Error: "SONAR_TOKEN not set"

**Causa:** Falta el secret en GitHub.

**Solución:** Ver Opción 1 → Paso 2.

### Error: "Quality Gate failed"

**Causa:** El código no cumple los estándares mínimos.

**Solución:** Revisar issues en SonarCloud y corregirlos antes de merge.

### SonarQube local no inicia (Docker)

**Causa:** Puertos en uso o falta de memoria.

**Solución:**

```bash
# Verificar puertos
netstat -ano | findstr :9000

# Aumentar memoria en Docker Desktop
# Settings → Resources → Memory → 4 GB mínimo
```

---

## Recomendación Final

Para tu tesis, **usa Opción 1 (SonarCloud)** por estas razones:

1. **Profesional:** Es el estándar de la industria
2. **Fácil de mostrar:** Dashboard online con URL pública
3. **Cero mantenimiento:** No necesitas servidor local
4. **Gratis:** Repositorio público = análisis ilimitados
5. **CI/CD integrado:** Análisis automático en cada push

**Opción 2** (local) es útil si necesitas privacidad absoluta o trabajas offline.

**Opción 3** (SonarLint) es complementaria → úsala SIEMPRE mientras desarrollas.

---

## Estructura de Archivos Creados

```
TuTurnoProduccion/
├── sonar-project.properties           # Configuración principal
├── .github/
│   └── workflows/
│       └── sonarcloud.yml              # GitHub Actions workflow
├── docker-compose.sonarqube.yml       # Docker para SonarQube local
├── .vscode/
│   └── settings.json                   # Configuración SonarLint (actualizado)
└── SONARQUBE_GUIDE.md                 # Esta guía
```

---

## Siguiente Paso

1. **Elige tu opción** (recomiendo Opción 1)
2. **Sigue los pasos** de la sección correspondiente
3. **Ejecuta el primer análisis**
4. **Captura screenshots** para tu tesis
5. **Documenta las métricas** en tu sección de Calidad de Software

Si eliges **Opción 1**, tu próximo comando es:

```bash
# 1. Actualizar sonar-project.properties con tu organization key
# 2. Configurar SONAR_TOKEN en GitHub Secrets
# 3. Luego ejecutar:
git add .
git commit -m "feat: add SonarCloud integration"
git push
```

¡Listo! Tu proyecto ahora tiene análisis de calidad profesional. 🚀
