# 📊 DIAGRAMAS DEL SISTEMA TUTURNO - TESIS

> **Autor:** Moisés Aldas
> **Proyecto:** TuTurno - Sistema de Gestión de Citas B2B SaaS
> **Fecha:** Diciembre 2025
> **Formato:** Mermaid (compatible con GitHub, Mermaid Live Editor, Notion, VS Code)

---

## 📖 ÍNDICE DE DIAGRAMAS

| # | Diagrama | Tipo |
|---|----------|------|
| 1 | Arquitectura General del Sistema | Arquitectura |
| 2 | Diagrama Entidad-Relación (Base de Datos) | ER |
| 3 | Flujo de Autenticación | Flujo |
| 4 | Sistema de 3 Tipos de Cliente | Conceptual |
| 5 | Flujo de Crear Cita (4 Pasos) | Flujo |
| 6 | Diagrama de Secuencia - Crear Cita | Secuencia |
| 7 | Sistema Realtime (Tiempo Real) | Arquitectura |
| 8 | Sistema de Emails | Arquitectura |
| 9 | Flujo de Pagos y Facturación | Flujo |
| 10 | Estados de una Cita | Estados |
| 11 | Casos de Uso | Casos de Uso |
| 12 | Arquitectura de Seguridad (RLS) | Seguridad |
| 13 | Arquitectura de Capas | Arquitectura |
| 14 | Diagrama de Despliegue | Despliegue |
| 15 | Calendario B2B - Componentes | Componentes |
| 16 | Diagrama de Contexto del Sistema | Contexto |
| 17 | Diagrama de Flujo de Datos (DFD - Nivel 0) | DFD |
| 18 | Diagrama de Navegación de la Aplicación | Navegación |
| 19 | Diagrama de Clases (TypeScript Interfaces) | Clases |
| 20 | Especificación de API REST | API |
| 21 | Diccionario de Datos - Enumeraciones | Datos |
| 22 | Matriz de Permisos (RLS) | Seguridad |
| 23 | Patrones de Diseño Utilizados | Patrones |
| 24 | Arquitectura MVC Adaptada | MVC |
| 25 | Diagrama de Actividades - Reservar Cita (Cliente) | Actividades |
| 26 | Diagrama de Actividades - Gestionar Cita (Negocio) | Actividades |
| 27 | Métricas del Sistema | Métricas |
| 28 | Roadmap de Desarrollo Futuro | Timeline |
| 29 | Diagrama de Infraestructura Cloud | Infraestructura |
| 30 | Diagrama de Backup y Recuperación | Backup |

---

## 🔷 DIAGRAMAS

### 1. ARQUITECTURA GENERAL DEL SISTEMA

```mermaid
flowchart TB
    subgraph USERS["👥 USUARIOS"]
        direction LR
        Client["🟢 Cliente"]
        Business["🟠 Negocio"]
    end

    subgraph FRONTEND["FRONTEND - Next.js 14"]
        direction TB
        UI["🎨 Interfaz de Usuario<br/>React + Tailwind + shadcn/ui"]
        Hooks["🪝 Hooks Personalizados<br/>useAuth, useBusiness, useRealtime"]
        Pages["📄 Páginas<br/>Dashboard, Marketplace, Auth"]
    end

    subgraph BACKEND["BACKEND - Supabase"]
        direction TB
        Auth["🔐 Autenticación<br/>Google OAuth + Email"]
        DB["🗄️ Base de Datos<br/>PostgreSQL + RLS"]
        RT["📡 Realtime<br/>WebSockets"]
        Store["📁 Almacenamiento<br/>Imágenes"]
        Edge["⚡ Edge Functions<br/>Emails"]
    end

    subgraph EXTERNAL["SERVICIOS EXTERNOS"]
        direction LR
        Google["Google OAuth"]
        Maps["Mapbox"]
        Email["Resend"]
    end

    USERS ==> FRONTEND
    FRONTEND ==> BACKEND
    Auth -.-> Google
    UI -.-> Maps
    Edge -.-> Email

    classDef frontend fill:#3b82f6,stroke:#1d4ed8,color:#fff
    classDef backend fill:#10b981,stroke:#059669,color:#fff
    classDef external fill:#8b5cf6,stroke:#6d28d9,color:#fff
    classDef users fill:#f59e0b,stroke:#d97706,color:#fff

    class UI,Hooks,Pages frontend
    class Auth,DB,RT,Store,Edge backend
    class Google,Maps,Email external
    class Client,Business users
```

---

### 2. DIAGRAMA ENTIDAD-RELACIÓN (SIMPLIFICADO)

```mermaid
erDiagram
    USERS ||--o{ BUSINESSES : "posee"
    USERS ||--o{ APPOINTMENTS : "reserva"

    BUSINESSES ||--o{ EMPLOYEES : "tiene"
    BUSINESSES ||--o{ SERVICES : "ofrece"
    BUSINESSES ||--o{ APPOINTMENTS : "recibe"
    BUSINESSES ||--o{ BUSINESS_CLIENTS : "gestiona"
    BUSINESSES }o--|| CATEGORIES : "pertenece"

    EMPLOYEES ||--o{ APPOINTMENTS : "atiende"

    APPOINTMENTS ||--|{ APPOINTMENT_SERVICES : "incluye"
    APPOINTMENTS ||--o| INVOICES : "genera"

    SERVICES ||--o{ APPOINTMENT_SERVICES : "en"

    INVOICES ||--o{ PAYMENTS : "recibe"

    USERS {
        uuid id PK
        string email
        string nombre
        string telefono
        boolean es_negocio
        boolean es_cliente
    }

    BUSINESSES {
        uuid id PK
        uuid owner_id FK
        string nombre
        string direccion
        string logo
        boolean activo
    }

    EMPLOYEES {
        uuid id PK
        uuid business_id FK
        string nombre
        string posicion
        boolean activo
    }

    SERVICES {
        uuid id PK
        uuid business_id FK
        string nombre
        decimal precio
        int duracion_min
    }

    APPOINTMENTS {
        uuid id PK
        uuid business_id FK
        uuid client_id FK
        uuid employee_id FK
        date fecha
        time hora_inicio
        time hora_fin
        enum estado
        decimal total
    }

    INVOICES {
        uuid id PK
        uuid appointment_id FK
        string numero
        decimal total
        enum estado
    }

    PAYMENTS {
        uuid id PK
        uuid invoice_id FK
        enum metodo
        decimal monto
    }

    BUSINESS_CLIENTS {
        uuid id PK
        uuid business_id FK
        string nombre
        string telefono
        string email
    }
```

---

### 3. FLUJO DE AUTENTICACIÓN

```mermaid
flowchart TD
    subgraph INICIO["🚀 INICIO"]
        Start(("Usuario<br/>visita app"))
    end

    subgraph METODO["📱 MÉTODO DE AUTENTICACIÓN"]
        Choice{{"¿Cómo ingresar?"}}
        Google["🔵 Google OAuth"]
        EmailPass["📧 Email + Contraseña"]
    end

    subgraph GOOGLE_FLOW["FLUJO GOOGLE"]
        G1["Abrir ventana Google"]
        G2["Usuario autoriza"]
        G3["Recibir código"]
        G4["Crear sesión"]
    end

    subgraph EMAIL_FLOW["FLUJO EMAIL"]
        E1{"¿Cuenta nueva?"}
        E2["Registrar usuario"]
        E3["Verificar email"]
        E4["Iniciar sesión"]
    end

    subgraph PERFIL["📝 COMPLETAR PERFIL"]
        P1{"¿Perfil completo?"}
        P2["Formulario:<br/>Nombre, Teléfono"]
        P3["Guardar en BD"]
        P4["Enviar email<br/>bienvenida"]
    end

    subgraph DESTINO["🎯 DESTINO FINAL"]
        D1{"¿Tipo usuario?"}
        ClientDash["🟢 Dashboard<br/>Cliente"]
        BizCheck{"¿Tiene negocio?"}
        BizSetup["🟠 Crear<br/>Negocio"]
        BizDash["🟠 Dashboard<br/>Negocio"]
    end

    Start --> Choice
    Choice --> |"Google"| Google
    Choice --> |"Email"| EmailPass

    Google --> G1 --> G2 --> G3 --> G4
    EmailPass --> E1
    E1 --> |"Sí"| E2 --> E3 --> G4
    E1 --> |"No"| E4 --> G4

    G4 --> P1
    P1 --> |"No"| P2 --> P3 --> P4 --> D1
    P1 --> |"Sí"| D1

    D1 --> |"Cliente"| ClientDash
    D1 --> |"Negocio"| BizCheck
    BizCheck --> |"No"| BizSetup --> BizDash
    BizCheck --> |"Sí"| BizDash

    classDef startEnd fill:#22c55e,stroke:#16a34a,color:#fff
    classDef process fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef decision fill:#f59e0b,stroke:#d97706,color:#fff
    classDef client fill:#10b981,stroke:#059669,color:#fff
    classDef business fill:#f97316,stroke:#ea580c,color:#fff

    class Start,ClientDash,BizDash startEnd
    class G1,G2,G3,G4,E2,E3,E4,P2,P3,P4 process
    class Choice,E1,P1,D1,BizCheck decision
    class ClientDash client
    class BizSetup,BizDash business
```

---

### 4. SISTEMA DE 3 TIPOS DE CLIENTE

```mermaid
flowchart TB
    subgraph HEADER["🧑‍🤝‍🧑 SISTEMA DE CLIENTES - CITAS"]
        direction LR
        Rule["⚠️ REGLA: Solo UN tipo por cita"]
    end

    subgraph TIPOS["TIPOS DE CLIENTE"]
        direction LR

        subgraph WALKIN["👤 WALK-IN"]
            W1["Cliente ocasional"]
            W2["Sin cuenta"]
            W3["Solo nombre + teléfono"]
            W4["Datos temporales"]
            W5["❌ Sin notificaciones"]
        end

        subgraph REGISTERED["✅ REGISTRADO"]
            R1["Usuario TuTurno"]
            R2["Cuenta activa"]
            R3["Historial completo"]
            R4["Dashboard propio"]
            R5["✅ Emails automáticos"]
        end

        subgraph BUSINESS_CLIENT["🏷️ CLIENTE NEGOCIO"]
            B1["Base datos privada"]
            B2["Sin cuenta TuTurno"]
            B3["Guardado por negocio"]
            B4["Reutilizable"]
            B5["✅ Búsqueda rápida"]
        end
    end

    subgraph DB["🗄️ BASE DE DATOS"]
        APT["appointments"]
        APT --> |"walk_in_name<br/>walk_in_phone"| WALKIN
        APT --> |"client_id"| REGISTERED
        APT --> |"business_client_id"| BUSINESS_CLIENT
    end

    classDef walkin fill:#fbbf24,stroke:#f59e0b,color:#000
    classDef registered fill:#22c55e,stroke:#16a34a,color:#fff
    classDef business fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef rule fill:#ef4444,stroke:#dc2626,color:#fff

    class W1,W2,W3,W4,W5 walkin
    class R1,R2,R3,R4,R5 registered
    class B1,B2,B3,B4,B5 business
    class Rule rule
```

---

### 5. FLUJO DE CREAR CITA (4 PASOS)

```mermaid
flowchart LR
    subgraph STEP1["PASO 1️⃣"]
        S1_Title["👤 CLIENTE"]
        S1_1["Seleccionar tipo"]
        S1_2["Walk-in / Registrado /<br/>Cliente Negocio"]
    end

    subgraph STEP2["PASO 2️⃣"]
        S2_Title["💇 SERVICIOS"]
        S2_1["Elegir servicio(s)"]
        S2_2["Asignar empleado"]
        S2_3["Ver precio total"]
    end

    subgraph STEP3["PASO 3️⃣"]
        S3_Title["📅 FECHA Y HORA"]
        S3_1["Seleccionar fecha"]
        S3_2["Elegir hora inicio"]
        S3_3["Auto-calcular fin"]
    end

    subgraph STEP4["PASO 4️⃣"]
        S4_Title["✅ CONFIRMAR"]
        S4_1["Revisar resumen"]
        S4_2["Notas opcionales"]
        S4_3["Crear cita"]
    end

    STEP1 ==> STEP2 ==> STEP3 ==> STEP4

    subgraph RESULT["🎉 RESULTADO"]
        R1["Cita guardada"]
        R2["Email enviado"]
        R3["Calendario actualizado"]
    end

    STEP4 ==> RESULT

    classDef step1 fill:#ef4444,stroke:#dc2626,color:#fff
    classDef step2 fill:#f59e0b,stroke:#d97706,color:#fff
    classDef step3 fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef step4 fill:#22c55e,stroke:#16a34a,color:#fff
    classDef result fill:#8b5cf6,stroke:#6d28d9,color:#fff

    class S1_Title,S1_1,S1_2 step1
    class S2_Title,S2_1,S2_2,S2_3 step2
    class S3_Title,S3_1,S3_2,S3_3 step3
    class S4_Title,S4_1,S4_2,S4_3 step4
    class R1,R2,R3 result
```

---

### 6. DIAGRAMA DE SECUENCIA - CREAR CITA

```mermaid
sequenceDiagram
    autonumber

    actor User as 👤 Usuario
    participant UI as 🖥️ Interfaz
    participant API as ⚙️ API
    participant DB as 🗄️ Base Datos
    participant RT as 📡 Realtime
    participant Email as 📧 Email

    Note over User,Email: PROCESO DE CREAR CITA

    User->>UI: Click en calendario
    UI->>UI: Abrir modal 4 pasos

    rect rgb(239, 68, 68, 0.1)
        Note over UI: PASO 1: Cliente
        User->>UI: Seleccionar cliente
    end

    rect rgb(245, 158, 11, 0.1)
        Note over UI: PASO 2: Servicios
        UI->>API: Obtener servicios
        API->>DB: SELECT services
        DB-->>UI: Lista servicios
        User->>UI: Elegir servicios + empleado
    end

    rect rgb(59, 130, 246, 0.1)
        Note over UI: PASO 3: Fecha/Hora
        User->>UI: Seleccionar fecha y hora
    end

    rect rgb(34, 197, 94, 0.1)
        Note over UI: PASO 4: Confirmar
        User->>UI: Click "Crear Cita"
        UI->>API: POST appointment
        API->>DB: INSERT appointment
        DB-->>API: ✅ Creada
    end

    par Actualización en tiempo real
        DB->>RT: Evento INSERT
        RT->>RT: Broadcast a otros usuarios
    and Notificación por email
        API->>Email: Enviar confirmación
        Email->>Email: 📧 Email cliente
        Email->>Email: 📧 Email negocio
    end

    API-->>UI: ✅ Éxito
    UI->>User: Cerrar modal + actualizar
```

---

### 7. SISTEMA REALTIME (TIEMPO REAL)

```mermaid
flowchart TB
    subgraph SCENARIO["📋 ESCENARIO: Dos usuarios viendo el mismo calendario"]
        direction LR
        UserA["👤 Usuario A<br/>(crea cita)"]
        UserB["👥 Usuario B<br/>(observando)"]
    end

    subgraph FLOW["⚡ FLUJO EN TIEMPO REAL"]
        direction TB

        A1["1️⃣ Usuario A crea cita"]
        A2["2️⃣ Guardar en PostgreSQL"]
        A3["3️⃣ Trigger automático"]
        A4["4️⃣ Supabase Realtime<br/>detecta cambio"]
        A5["5️⃣ WebSocket broadcast"]
        A6["6️⃣ Usuario B recibe evento"]
        A7["7️⃣ Actualizar UI automático"]

        A1 --> A2 --> A3 --> A4 --> A5 --> A6 --> A7
    end

    subgraph METRICS["📊 MÉTRICAS"]
        M1["⏱️ Latencia: 200-500ms"]
        M2["🔒 RLS: Solo datos autorizados"]
        M3["🔄 Auto-reconexión"]
    end

    UserA -.-> A1
    A7 -.-> UserB

    classDef user fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef flow fill:#22c55e,stroke:#16a34a,color:#fff
    classDef metric fill:#8b5cf6,stroke:#6d28d9,color:#fff

    class UserA,UserB user
    class A1,A2,A3,A4,A5,A6,A7 flow
    class M1,M2,M3 metric
```

---

### 8. SISTEMA DE EMAILS

```mermaid
flowchart TB
    subgraph TRIGGERS["🎯 EVENTOS QUE DISPARAN EMAILS"]
        T1["📝 Registro completo"]
        T2["📅 Cita creada"]
        T3["❌ Cita cancelada"]
        T4["⚠️ No-show"]
        T5["🧾 Factura generada"]
        T6["🔄 Cita reprogramada"]
    end

    subgraph PROCESS["⚙️ PROCESAMIENTO"]
        API["API Routes<br/>/api/send-*-email"]
        Edge["Edge Functions<br/>Supabase"]
        Resend["Resend API"]
    end

    subgraph TEMPLATES["📧 PLANTILLAS"]
        subgraph GREEN["🟢 EMAILS CLIENTE"]
            EC1["Bienvenida"]
            EC2["Confirmación cita"]
            EC3["Cancelación"]
            EC4["Factura"]
        end

        subgraph ORANGE["🟠 EMAILS NEGOCIO"]
            EN1["Nueva cita recibida"]
            EN2["Cancelación cliente"]
            EN3["Reporte no-show"]
        end
    end

    T1 & T2 & T3 & T4 & T5 & T6 --> API
    API --> Edge --> Resend
    Resend --> GREEN
    Resend --> ORANGE

    classDef trigger fill:#f59e0b,stroke:#d97706,color:#fff
    classDef process fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef green fill:#22c55e,stroke:#16a34a,color:#fff
    classDef orange fill:#f97316,stroke:#ea580c,color:#fff

    class T1,T2,T3,T4,T5,T6 trigger
    class API,Edge,Resend process
    class EC1,EC2,EC3,EC4 green
    class EN1,EN2,EN3 orange
```

---

### 9. FLUJO DE PAGOS Y FACTURACIÓN

```mermaid
flowchart TD
    subgraph START["🏁 INICIO"]
        A["Cita en progreso"]
    end

    subgraph CHECKOUT["💳 PROCESO DE COBRO"]
        B["Click 'Finalizar y Cobrar'"]
        C["Abrir modal de pago"]
        D{{"Método de pago"}}
        E["💵 Efectivo"]
        F["🏦 Transferencia"]
        G["Ingresar referencia"]
        H{{"¿Referencia única?"}}
        I["❌ Error: duplicada"]
    end

    subgraph SAVE["💾 GUARDAR"]
        J["Registrar pago"]
        K["Crear factura<br/>INV-2025-0001"]
    end

    subgraph TRIGGERS["⚡ AUTOMÁTICO"]
        L["Trigger: calcular total"]
        M{{"¿Pagado completo?"}}
        N["Estado: PAGADO ✅"]
        O["Estado: PENDIENTE ⏳"]
    end

    subgraph END["✅ FIN"]
        P["Actualizar cita"]
        Q["Enviar factura email"]
        R["Cerrar modal"]
    end

    A --> B --> C --> D
    D --> |"Efectivo"| E --> J
    D --> |"Transferencia"| F --> G --> H
    H --> |"No"| I --> G
    H --> |"Sí"| J
    J --> K --> L --> M
    M --> |"Sí"| N --> P
    M --> |"No"| O --> P
    P --> Q --> R

    classDef start fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef checkout fill:#f59e0b,stroke:#d97706,color:#fff
    classDef save fill:#8b5cf6,stroke:#6d28d9,color:#fff
    classDef trigger fill:#22c55e,stroke:#16a34a,color:#fff
    classDef end_ fill:#10b981,stroke:#059669,color:#fff
    classDef error fill:#ef4444,stroke:#dc2626,color:#fff

    class A start
    class B,C,D,E,F,G,H checkout
    class J,K save
    class L,M,N,O trigger
    class P,Q,R end_
    class I error
```

---

### 10. ESTADOS DE UNA CITA

```mermaid
stateDiagram-v2
    [*] --> Pendiente: Cita creada

    Pendiente --> Confirmada: ✅ Confirmar
    Pendiente --> Cancelada: ❌ Cancelar

    Confirmada --> EnProgreso: ▶️ Iniciar
    Confirmada --> Cancelada: ❌ Cancelar
    Confirmada --> NoShow: ⚠️ No asistió

    EnProgreso --> Completada: 💳 Finalizar + Pago

    Completada --> [*]: 🧾 Factura generada
    Cancelada --> [*]: ❌ Fin
    NoShow --> [*]: ⚠️ Registrado

    note right of Pendiente
        🕐 Esperando confirmación
        del negocio
    end note

    note right of Confirmada
        📧 Email enviado
        al cliente
    end note

    note right of Completada
        💰 Pago procesado
        📄 Factura creada
    end note
```

---

### 11. CASOS DE USO

```mermaid
flowchart TB
    subgraph ACTORS["👥 ACTORES"]
        Client["🟢 CLIENTE"]
        Owner["🟠 DUEÑO NEGOCIO"]
        System["⚙️ SISTEMA"]
    end

    subgraph CLIENT_UC["CLIENTE PUEDE..."]
        direction TB
        C1["🔐 Registrarse / Login"]
        C2["🔍 Buscar negocios"]
        C3["📅 Reservar cita"]
        C4["👁️ Ver mis citas"]
        C5["❌ Cancelar cita"]
        C6["⭐ Dejar reseña"]
    end

    subgraph OWNER_UC["DUEÑO PUEDE..."]
        direction TB
        O1["🏢 Crear negocio"]
        O2["👥 Gestionar empleados"]
        O3["💇 Gestionar servicios"]
        O4["📅 Ver calendario"]
        O5["➕ Crear cita walk-in"]
        O6["✏️ Editar citas"]
        O7["💳 Procesar pagos"]
        O8["⚙️ Configurar políticas"]
        O9["📊 Ver reportes"]
    end

    subgraph SYSTEM_UC["SISTEMA HACE..."]
        direction TB
        S1["📧 Enviar emails"]
        S2["🧾 Generar facturas"]
        S3["📡 Actualizar realtime"]
        S4["⏰ Programar recordatorios"]
    end

    Client --> CLIENT_UC
    Owner --> OWNER_UC
    System --> SYSTEM_UC

    C3 -.->|"dispara"| S1
    C3 -.->|"dispara"| S3
    O7 -.->|"dispara"| S2

    classDef client fill:#22c55e,stroke:#16a34a,color:#fff
    classDef owner fill:#f97316,stroke:#ea580c,color:#fff
    classDef system fill:#3b82f6,stroke:#2563eb,color:#fff

    class Client,C1,C2,C3,C4,C5,C6 client
    class Owner,O1,O2,O3,O4,O5,O6,O7,O8,O9 owner
    class System,S1,S2,S3,S4 system
```

---

### 12. ARQUITECTURA DE SEGURIDAD (RLS)

```mermaid
flowchart TB
    subgraph REQUEST["📨 PETICIÓN ENTRANTE"]
        User["Usuario autenticado"]
        Token["JWT Token"]
    end

    subgraph RLS["🔐 ROW LEVEL SECURITY"]
        Check["Verificar auth.uid()"]

        subgraph POLICIES["POLÍTICAS POR TABLA"]
            P1["👤 users<br/>Solo ver/editar propio perfil"]
            P2["🏢 businesses<br/>Owner: CRUD completo<br/>Otros: Solo ver activos"]
            P3["📅 appointments<br/>Cliente: ver propias<br/>Owner: ver de su negocio"]
            P4["🏷️ business_clients<br/>Solo owner del negocio"]
        end
    end

    subgraph RESULT["📤 RESULTADO"]
        Allow["✅ Datos autorizados"]
        Deny["❌ Acceso denegado"]
    end

    User --> Token --> Check
    Check --> POLICIES
    POLICIES --> |"Cumple política"| Allow
    POLICIES --> |"No cumple"| Deny

    classDef request fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef rls fill:#f59e0b,stroke:#d97706,color:#fff
    classDef allow fill:#22c55e,stroke:#16a34a,color:#fff
    classDef deny fill:#ef4444,stroke:#dc2626,color:#fff

    class User,Token request
    class Check,P1,P2,P3,P4 rls
    class Allow allow
    class Deny deny
```

---

### 13. ARQUITECTURA DE CAPAS

```mermaid
flowchart TB
    subgraph L1["🎨 CAPA PRESENTACIÓN"]
        direction LR
        Pages["Páginas"]
        Components["Componentes"]
        UI["UI shadcn"]
    end

    subgraph L2["⚙️ CAPA APLICACIÓN"]
        direction LR
        Hooks["Hooks"]
        Context["Contextos"]
        State["Estado React"]
    end

    subgraph L3["🌐 CAPA API"]
        direction LR
        Routes["API Routes"]
        Middleware["Middleware"]
        Validation["Validación Zod"]
    end

    subgraph L4["🗄️ CAPA DATOS"]
        direction LR
        Client["Supabase Client"]
        Server["Supabase Server"]
        Realtime["Realtime"]
    end

    subgraph L5["☁️ INFRAESTRUCTURA"]
        direction LR
        DB["PostgreSQL"]
        Storage["Storage"]
        Edge["Edge Functions"]
    end

    L1 ==> L2 ==> L3 ==> L4 ==> L5

    classDef l1 fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef l2 fill:#8b5cf6,stroke:#6d28d9,color:#fff
    classDef l3 fill:#f59e0b,stroke:#d97706,color:#fff
    classDef l4 fill:#22c55e,stroke:#16a34a,color:#fff
    classDef l5 fill:#ec4899,stroke:#db2777,color:#fff

    class Pages,Components,UI l1
    class Hooks,Context,State l2
    class Routes,Middleware,Validation l3
    class Client,Server,Realtime l4
    class DB,Storage,Edge l5
```

---

### 14. DIAGRAMA DE DESPLIEGUE

```mermaid
flowchart TB
    subgraph USERS["👥 USUARIOS"]
        Browser["🌐 Navegador"]
        PWA["📱 PWA Móvil"]
    end

    subgraph VERCEL["☁️ VERCEL"]
        CDN["🌍 CDN Global"]
        NextJS["⚛️ Next.js SSR"]
        Serverless["λ Serverless<br/>API Routes"]
    end

    subgraph SUPABASE["🗄️ SUPABASE"]
        Auth["🔐 Auth"]
        Postgres["🐘 PostgreSQL"]
        Realtime["📡 Realtime"]
        Storage["📁 Storage"]
        EdgeFn["⚡ Edge Functions"]
    end

    subgraph EXTERNAL["🔗 EXTERNOS"]
        Google["Google"]
        Mapbox["Mapbox"]
        Resend["Resend"]
    end

    USERS --> CDN --> NextJS --> Serverless
    Serverless --> Auth & Postgres & Storage
    NextJS --> Realtime
    Auth -.-> Google
    NextJS -.-> Mapbox
    EdgeFn -.-> Resend

    classDef users fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef vercel fill:#000000,stroke:#ffffff,color:#fff
    classDef supabase fill:#1e3a2f,stroke:#3ecf8e,color:#fff
    classDef external fill:#6b7280,stroke:#4b5563,color:#fff

    class Browser,PWA users
    class CDN,NextJS,Serverless vercel
    class Auth,Postgres,Realtime,Storage,EdgeFn supabase
    class Google,Mapbox,Resend external
```

---

### 15. CALENDARIO B2B - COMPONENTES

```mermaid
flowchart TB
    subgraph CALENDAR["📅 VISTA CALENDARIO"]
        Header["🔝 Header<br/>Fecha + Navegación"]
        Grid["📊 Grid<br/>8AM - 8PM"]
        TimeCol["⏰ Columna Tiempo<br/>(fija)"]
        EmpCols["👥 Columnas Empleados<br/>(fijas arriba)"]
        Blocks["📦 Bloques Cita<br/>(coloreados)"]
        Timeline["🔴 Línea Tiempo Actual"]
    end

    subgraph INTERACTIONS["🖱️ INTERACCIONES"]
        Click["Click slot vacío"]
        ClickApt["Click en cita"]
        Drag["Arrastrar cita"]
        Hover["Hover = Tooltip"]
    end

    subgraph MODALS["📋 MODALES"]
        Create["➕ Crear Cita<br/>(4 pasos)"]
        View["👁️ Ver Cita<br/>(detalles)"]
        Checkout["💳 Cobrar<br/>(pago)"]
    end

    subgraph COLORS["🎨 COLORES POR ESTADO"]
        Yellow["🟡 Pendiente"]
        Blue["🔵 Confirmada"]
        Purple["🟣 En Progreso"]
        Green["🟢 Completada"]
        Red["🔴 Cancelada"]
        Gray["⚫ No-Show"]
    end

    Click --> Create
    ClickApt --> View
    Drag --> View
    View --> |"Editar"| Create
    View --> |"Cobrar"| Checkout
    Blocks --> COLORS

    classDef calendar fill:#e0f2fe,stroke:#0284c7
    classDef interact fill:#fef3c7,stroke:#d97706
    classDef modal fill:#f3e8ff,stroke:#9333ea
```

---

### 16. DIAGRAMA DE CONTEXTO DEL SISTEMA

```mermaid
flowchart TB
    subgraph EXTERNAL["🌍 ENTORNO EXTERNO"]
        Client["🟢 Cliente<br/>Reserva citas"]
        Owner["🟠 Dueño Negocio<br/>Gestiona negocio"]
        Google["🔵 Google<br/>Autenticación OAuth"]
        Maps["🗺️ Mapbox<br/>Geolocalización"]
        Email["📧 Resend<br/>Envío emails"]
    end

    subgraph SYSTEM["⚙️ SISTEMA TUTURNO"]
        Core["Plataforma de Gestión<br/>de Citas B2B SaaS"]
    end

    Client -->|"Buscar, Reservar,<br/>Cancelar"| Core
    Owner -->|"Crear, Gestionar,<br/>Cobrar"| Core
    Core -->|"Verificar identidad"| Google
    Core -->|"Obtener ubicación"| Maps
    Core -->|"Enviar notificaciones"| Email

    Core -->|"Confirmaciones,<br/>Recordatorios"| Client
    Core -->|"Reportes,<br/>Notificaciones"| Owner

    classDef external fill:#f1f5f9,stroke:#64748b
    classDef system fill:#3b82f6,stroke:#1d4ed8,color:#fff

    class Client,Owner,Google,Maps,Email external
    class Core system
```

---

### 17. DIAGRAMA DE FLUJO DE DATOS (DFD - NIVEL 0)

```mermaid
flowchart LR
    subgraph ENTITIES["ENTIDADES EXTERNAS"]
        E1(("👤 Cliente"))
        E2(("🏢 Negocio"))
    end

    subgraph PROCESSES["PROCESOS"]
        P1["1.0<br/>Gestionar<br/>Usuarios"]
        P2["2.0<br/>Gestionar<br/>Negocios"]
        P3["3.0<br/>Gestionar<br/>Citas"]
        P4["4.0<br/>Procesar<br/>Pagos"]
        P5["5.0<br/>Enviar<br/>Notificaciones"]
    end

    subgraph DATASTORES["ALMACENES DE DATOS"]
        D1[("D1: Users")]
        D2[("D2: Businesses")]
        D3[("D3: Appointments")]
        D4[("D4: Invoices")]
        D5[("D5: Payments")]
    end

    E1 -->|"Datos registro"| P1
    P1 -->|"Usuario creado"| D1

    E2 -->|"Datos negocio"| P2
    P2 -->|"Negocio creado"| D2

    E1 -->|"Solicitud cita"| P3
    D1 -->|"Info cliente"| P3
    D2 -->|"Info negocio"| P3
    P3 -->|"Cita creada"| D3

    D3 -->|"Cita completada"| P4
    P4 -->|"Factura"| D4
    P4 -->|"Pago"| D5

    D3 -->|"Evento cita"| P5
    P5 -->|"Email"| E1
    P5 -->|"Email"| E2

    classDef entity fill:#22c55e,stroke:#16a34a,color:#fff
    classDef process fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef datastore fill:#f59e0b,stroke:#d97706,color:#fff

    class E1,E2 entity
    class P1,P2,P3,P4,P5 process
    class D1,D2,D3,D4,D5 datastore
```

---

### 18. DIAGRAMA DE NAVEGACIÓN DE LA APLICACIÓN

```mermaid
flowchart TB
    subgraph PUBLIC["🌐 PÁGINAS PÚBLICAS"]
        Home["/ <br/>Landing Page"]
        Market["📍 /marketplace<br/>Buscar Negocios"]
        BizProfile["🏢 /business/[id]<br/>Perfil Negocio"]
        Book["📅 /business/[id]/book<br/>Reservar Cita"]
    end

    subgraph AUTH["🔐 AUTENTICACIÓN"]
        Login["🔑 /auth/login"]
        Register["📝 /auth/register"]
        Setup["⚙️ /auth/setup"]
        Callback["🔄 /auth/callback"]
        Forgot["🔒 /auth/forgot-password"]
        Verify["✉️ /auth/verify-email"]
    end

    subgraph CLIENT_DASH["🟢 DASHBOARD CLIENTE"]
        CDash["📊 /dashboard/client"]
        CAppts["📅 /dashboard/client/appointments"]
        CProfile["👤 /dashboard/client/profile"]
        CSettings["⚙️ /dashboard/client/settings"]
    end

    subgraph BIZ_DASH["🟠 DASHBOARD NEGOCIO"]
        BDash["📊 /dashboard/business"]
        BCalendar["📅 /dashboard/business/appointments"]
        BEmployees["👥 /dashboard/business/employees"]
        BServices["💇 /dashboard/business/services"]
        BClients["🧑‍🤝‍🧑 /dashboard/business/clients"]
        BSettings["⚙️ /dashboard/business/settings"]
        BAdvanced["🔧 /dashboard/business/settings/advanced"]
        BAnalytics["📈 /dashboard/business/analytics"]
    end

    Home --> Market --> BizProfile --> Book
    Home --> Login
    Login --> Register
    Login --> Forgot
    Register --> Verify --> Setup
    Login --> Callback --> Setup

    Setup -->|"Cliente"| CDash
    Setup -->|"Negocio"| BDash

    CDash --> CAppts & CProfile & CSettings
    BDash --> BCalendar & BEmployees & BServices & BClients & BSettings & BAnalytics
    BSettings --> BAdvanced

    classDef public fill:#e0f2fe,stroke:#0284c7
    classDef auth fill:#fef3c7,stroke:#d97706
    classDef client fill:#dcfce7,stroke:#16a34a
    classDef business fill:#ffedd5,stroke:#ea580c

    class Home,Market,BizProfile,Book public
    class Login,Register,Setup,Callback,Forgot,Verify auth
    class CDash,CAppts,CProfile,CSettings client
    class BDash,BCalendar,BEmployees,BServices,BClients,BSettings,BAdvanced,BAnalytics business
```

---

### 19. DIAGRAMA DE CLASES (TYPESCRIPT INTERFACES)

```mermaid
classDiagram
    class User {
        +uuid id
        +string email
        +string first_name
        +string last_name
        +string phone
        +string avatar_url
        +boolean is_business_owner
        +boolean is_client
        +Date created_at
    }

    class Business {
        +uuid id
        +uuid owner_id
        +string name
        +string description
        +string address
        +number latitude
        +number longitude
        +string logo_url
        +string cover_image_url
        +boolean is_active
        +string timezone
        +number cancellation_policy_hours
        +boolean auto_confirm_appointments
    }

    class Employee {
        +uuid id
        +uuid business_id
        +string first_name
        +string last_name
        +string position
        +string email
        +string phone
        +boolean is_active
    }

    class Service {
        +uuid id
        +uuid business_id
        +string name
        +string description
        +number price
        +number duration_minutes
        +boolean is_active
    }

    class Appointment {
        +uuid id
        +uuid business_id
        +uuid client_id
        +uuid business_client_id
        +uuid employee_id
        +Date appointment_date
        +Time start_time
        +Time end_time
        +AppointmentStatus status
        +number total_price
        +string notes
        +string walk_in_client_name
        +string walk_in_client_phone
    }

    class Invoice {
        +uuid id
        +uuid appointment_id
        +string invoice_number
        +number subtotal
        +number tax
        +number discount
        +number total
        +InvoiceStatus status
    }

    class Payment {
        +uuid id
        +uuid invoice_id
        +PaymentMethod payment_method
        +number amount
        +string transfer_reference
        +Date payment_date
    }

    class BusinessClient {
        +uuid id
        +uuid business_id
        +string first_name
        +string last_name
        +string phone
        +string email
        +string notes
        +boolean is_active
    }

    User "1" --> "*" Business : owns
    User "1" --> "*" Appointment : books
    Business "1" --> "*" Employee : has
    Business "1" --> "*" Service : offers
    Business "1" --> "*" Appointment : receives
    Business "1" --> "*" BusinessClient : manages
    Employee "1" --> "*" Appointment : assigned
    Appointment "1" --> "1" Invoice : generates
    Appointment "*" --> "*" Service : includes
    Invoice "1" --> "*" Payment : receives
```

---

### 20. ESPECIFICACIÓN DE API REST

```mermaid
flowchart LR
    subgraph CLIENT["🖥️ CLIENTE"]
        App["Aplicación Next.js"]
    end

    subgraph API["🌐 API ROUTES"]
        A1["POST /api/create-user"]
        A2["POST /api/complete-profile"]
        A3["POST /api/send-appointment-email"]
        A4["POST /api/send-cancellation-notification"]
        A5["POST /api/send-no-show-notification"]
        A6["POST /api/send-invoice-notification"]
        A7["POST /api/send-rescheduled-notification"]
    end

    subgraph SERVICES["⚙️ SERVICIOS"]
        DB["🗄️ Supabase DB"]
        Edge["⚡ Edge Functions"]
    end

    App --> A1 & A2
    A1 & A2 --> DB
    App --> A3 & A4 & A5 & A6 & A7
    A3 & A4 & A5 & A6 & A7 --> Edge

    classDef api fill:#3b82f6,stroke:#2563eb,color:#fff
    class A1,A2,A3,A4,A5,A6,A7 api
```

---

### 21. DICCIONARIO DE DATOS - ENUMERACIONES

```mermaid
flowchart LR
    subgraph STATUS["📊 appointment_status"]
        S1["pending"]
        S2["confirmed"]
        S3["in_progress"]
        S4["completed"]
        S5["cancelled"]
        S6["no_show"]
    end

    subgraph INVOICE["📄 invoice_status"]
        I1["pending"]
        I2["paid"]
        I3["cancelled"]
    end

    subgraph PAYMENT["💳 payment_method"]
        P1["cash"]
        P2["transfer"]
    end

    subgraph REMINDER["⏰ reminder_type"]
        R1["email"]
        R2["sms"]
        R3["push"]
    end

    classDef status fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef invoice fill:#22c55e,stroke:#16a34a,color:#fff
    classDef payment fill:#f59e0b,stroke:#d97706,color:#fff
    classDef reminder fill:#8b5cf6,stroke:#6d28d9,color:#fff

    class S1,S2,S3,S4,S5,S6 status
    class I1,I2,I3 invoice
    class P1,P2 payment
    class R1,R2,R3 reminder
```

---

### 22. PATRONES DE DISEÑO UTILIZADOS

```mermaid
flowchart TB
    subgraph PATTERNS["🎯 PATRONES DE DISEÑO IMPLEMENTADOS"]
        direction TB

        subgraph CREATIONAL["CREACIONALES"]
            P1["🏭 Factory Pattern<br/>Creación de clientes Supabase"]
            P2["📦 Singleton Pattern<br/>Instancia única de Auth Context"]
        end

        subgraph STRUCTURAL["ESTRUCTURALES"]
            P3["🔌 Adapter Pattern<br/>Edge Functions → Resend API"]
            P4["🎭 Facade Pattern<br/>useAuth hook simplifica Auth"]
            P5["🧩 Composite Pattern<br/>Componentes UI anidados"]
        end

        subgraph BEHAVIORAL["COMPORTAMIENTO"]
            P6["👀 Observer Pattern<br/>Supabase Realtime subscriptions"]
            P7["📋 Strategy Pattern<br/>3 tipos de cliente"]
            P8["🔄 State Pattern<br/>Estados de cita"]
            P9["⛓️ Chain of Responsibility<br/>Middleware de rutas"]
        end
    end

    classDef creational fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef structural fill:#22c55e,stroke:#16a34a,color:#fff
    classDef behavioral fill:#f59e0b,stroke:#d97706,color:#fff

    class P1,P2 creational
    class P3,P4,P5 structural
    class P6,P7,P8,P9 behavioral
```

---

### 23. ARQUITECTURA MVC ADAPTADA

```mermaid
flowchart TB
    subgraph VIEW["🎨 VISTA (View)"]
        direction TB
        V1["Pages (Next.js)"]
        V2["Components (React)"]
        V3["UI Library (shadcn)"]
    end

    subgraph CONTROLLER["⚙️ CONTROLADOR (Controller)"]
        direction TB
        C1["API Routes"]
        C2["Custom Hooks"]
        C3["Event Handlers"]
    end

    subgraph MODEL["🗄️ MODELO (Model)"]
        direction TB
        M1["Supabase Client"]
        M2["TypeScript Interfaces"]
        M3["Zod Schemas"]
    end

    subgraph DATABASE["💾 BASE DE DATOS"]
        DB["PostgreSQL + RLS"]
    end

    VIEW <-->|"Estado React"| CONTROLLER
    CONTROLLER <-->|"Queries/Mutations"| MODEL
    MODEL <-->|"SQL + RLS"| DATABASE

    classDef view fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef controller fill:#22c55e,stroke:#16a34a,color:#fff
    classDef model fill:#f59e0b,stroke:#d97706,color:#fff
    classDef db fill:#8b5cf6,stroke:#6d28d9,color:#fff

    class V1,V2,V3 view
    class C1,C2,C3 controller
    class M1,M2,M3 model
    class DB db
```

---

### 24. DIAGRAMA DE ACTIVIDADES - RESERVAR CITA (CLIENTE)

```mermaid
flowchart TD
    Start(("🚀 Inicio"))

    A1["Buscar negocio en marketplace"]
    A2["Ver perfil del negocio"]
    A3{"¿Desea reservar?"}
    A4["Seleccionar servicio(s)"]
    A5["Seleccionar empleado"]
    A6["Elegir fecha disponible"]
    A7["Elegir hora disponible"]
    A8["Revisar resumen"]
    A9{"¿Confirmar?"}
    A10["Guardar cita en BD"]
    A11["Enviar email confirmación"]
    A12["Actualizar calendario realtime"]

    End1(("✅ Cita creada"))
    End2(("❌ Cancelado"))

    Start --> A1 --> A2 --> A3
    A3 -->|"Sí"| A4
    A3 -->|"No"| End2
    A4 --> A5 --> A6 --> A7 --> A8 --> A9
    A9 -->|"Sí"| A10
    A9 -->|"No"| A4
    A10 --> A11 --> A12 --> End1

    classDef start fill:#22c55e,stroke:#16a34a,color:#fff
    classDef action fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef decision fill:#f59e0b,stroke:#d97706,color:#fff
    classDef end_ fill:#8b5cf6,stroke:#6d28d9,color:#fff

    class Start start
    class A1,A2,A4,A5,A6,A7,A8,A10,A11,A12 action
    class A3,A9 decision
    class End1,End2 end_
```

---

### 25. DIAGRAMA DE ACTIVIDADES - GESTIONAR CITA (NEGOCIO)

```mermaid
flowchart TD
    Start(("🚀 Ver Calendario"))

    A1{"¿Tipo de acción?"}

    subgraph CREATE["➕ CREAR CITA"]
        C1["Click en slot vacío"]
        C2["Seleccionar cliente"]
        C3["Elegir servicios"]
        C4["Confirmar cita"]
    end

    subgraph VIEW["👁️ VER/EDITAR"]
        V1["Click en cita existente"]
        V2["Ver detalles"]
        V3{"¿Acción?"}
        V4["Editar datos"]
        V5["Cambiar estado"]
        V6["Cancelar cita"]
    end

    subgraph CHECKOUT["💳 COBRAR"]
        CH1["Click Finalizar"]
        CH2["Seleccionar método pago"]
        CH3["Registrar pago"]
        CH4["Generar factura"]
    end

    End1(("✅ Completado"))

    Start --> A1
    A1 -->|"Crear"| C1 --> C2 --> C3 --> C4 --> End1
    A1 -->|"Ver/Editar"| V1 --> V2 --> V3
    V3 -->|"Editar"| V4 --> End1
    V3 -->|"Estado"| V5 --> End1
    V3 -->|"Cancelar"| V6 --> End1
    V3 -->|"Cobrar"| CH1
    A1 -->|"Cobrar"| CH1 --> CH2 --> CH3 --> CH4 --> End1

    classDef start fill:#22c55e,stroke:#16a34a,color:#fff
    classDef create fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef view fill:#f59e0b,stroke:#d97706,color:#fff
    classDef checkout fill:#8b5cf6,stroke:#6d28d9,color:#fff
    classDef decision fill:#ec4899,stroke:#db2777,color:#fff

    class Start,End1 start
    class C1,C2,C3,C4 create
    class V1,V2,V4,V5,V6 view
    class CH1,CH2,CH3,CH4 checkout
    class A1,V3 decision
```

---

### 26. MÉTRICAS DEL SISTEMA

```mermaid
flowchart TB
    subgraph METRICS["📊 MÉTRICAS DEL SISTEMA TUTURNO"]
        direction TB

        subgraph CODE["📝 CÓDIGO"]
            M1["99 Componentes React"]
            M2["8 Custom Hooks"]
            M3["7 API Routes"]
            M4["~15,000 líneas de código"]
            M5["100% TypeScript"]
        end

        subgraph DB["🗄️ BASE DE DATOS"]
            M6["11 Tablas principales"]
            M7["20+ Políticas RLS"]
            M8["5 Triggers automáticos"]
            M9["4 Funciones SQL"]
            M10["18 Foreign Keys"]
        end

        subgraph PERF["⚡ RENDIMIENTO"]
            M11["Realtime: <500ms latencia"]
            M12["Bundle: ~350KB gzipped"]
            M13["Lighthouse: 90+ score"]
            M14["First Load: <3s"]
        end

        subgraph FEATURES["✅ FUNCIONALIDADES"]
            M15["100% Features completas"]
            M16["7 tipos de email"]
            M17["3 tipos de cliente"]
            M18["6 estados de cita"]
            M19["2 métodos de pago"]
        end
    end

    classDef code fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef db fill:#22c55e,stroke:#16a34a,color:#fff
    classDef perf fill:#f59e0b,stroke:#d97706,color:#fff
    classDef features fill:#8b5cf6,stroke:#6d28d9,color:#fff

    class M1,M2,M3,M4,M5 code
    class M6,M7,M8,M9,M10 db
    class M11,M12,M13,M14 perf
    class M15,M16,M17,M18,M19 features
```

---

### 27. ROADMAP DE DESARROLLO FUTURO

```mermaid
timeline
    title Roadmap TuTurno 2025-2026

    section Q4 2025
        Noviembre : Dashboard Analytics
                  : Gráficos de ventas
                  : Reportes por empleado
        Diciembre : SMS Reminders
                  : Integración Twilio
                  : Recordatorios WhatsApp

    section Q1 2026
        Enero : App Móvil React Native
              : iOS App Store
              : Android Play Store
        Febrero : Multi-idioma
                : Inglés
                : Portugués
        Marzo : API Pública
              : Documentación Swagger
              : SDK JavaScript

    section Q2 2026
        Abril : Video Consultas
              : Integración Zoom/Meet
              : Sala virtual
        Mayo : IA Scheduling
             : Optimización horarios
             : Predicción demanda
        Junio : Pasarela Pagos
              : Stripe integration
              : PayPal

    section Q3 2026
        Julio : Multi-sucursal
              : Gestión centralizada
              : Dashboard corporativo
        Agosto : Marketplace V2
               : Reviews verificados
               : Sistema de puntos
        Septiembre : White-label
                   : Personalización total
                   : Subdominios
```

---

### 28. DIAGRAMA DE INFRAESTRUCTURA CLOUD

```mermaid
flowchart TB
    subgraph USERS["👥 USUARIOS"]
        Browser["🌐 Navegador"]
        Mobile["📱 Móvil PWA"]
    end

    subgraph CDN["🌍 CDN LAYER"]
        Vercel["Vercel Edge Network<br/>Cache + SSL"]
    end

    subgraph COMPUTE["⚙️ COMPUTE LAYER"]
        NextJS["Next.js App<br/>SSR + API Routes"]
        Serverless["Serverless Functions<br/>API Endpoints"]
    end

    subgraph SUPABASE["🗄️ SUPABASE CLOUD"]
        subgraph AUTH["Auth"]
            GoTrue["GoTrue Server<br/>JWT + OAuth"]
        end

        subgraph DATABASE["Database"]
            Postgres["PostgreSQL 15<br/>+ RLS + Triggers"]
            PgBouncer["PgBouncer<br/>Connection Pooling"]
        end

        subgraph REALTIME["Realtime"]
            RealtimeServer["Realtime Server<br/>Phoenix/Elixir"]
            WebSocket["WebSocket<br/>Connections"]
        end

        subgraph STORAGE["Storage"]
            S3["S3-Compatible<br/>Object Storage"]
            ImgProxy["Image Transform<br/>Resize/Optimize"]
        end

        subgraph EDGE["Edge Functions"]
            Deno["Deno Runtime<br/>V8 Isolates"]
        end
    end

    subgraph EXTERNAL["🔗 EXTERNAL SERVICES"]
        Google["Google OAuth"]
        Resend["Resend SMTP"]
        Mapbox["Mapbox API"]
    end

    USERS --> CDN --> COMPUTE
    NextJS --> AUTH
    NextJS --> DATABASE
    NextJS --> REALTIME
    NextJS --> STORAGE
    Serverless --> DATABASE
    AUTH --> Google
    Deno --> Resend
    NextJS --> Mapbox
    DATABASE --> PgBouncer --> Postgres

    classDef users fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef cdn fill:#22c55e,stroke:#16a34a,color:#fff
    classDef compute fill:#f59e0b,stroke:#d97706,color:#fff
    classDef supabase fill:#1e3a2f,stroke:#3ecf8e,color:#fff
    classDef external fill:#8b5cf6,stroke:#6d28d9,color:#fff

    class Browser,Mobile users
    class Vercel cdn
    class NextJS,Serverless compute
    class GoTrue,Postgres,PgBouncer,RealtimeServer,WebSocket,S3,ImgProxy,Deno supabase
    class Google,Resend,Mapbox external
```

---

### 29. DIAGRAMA DE BACKUP Y RECUPERACIÓN

```mermaid
flowchart TB
    subgraph BACKUP["🔄 ESTRATEGIA DE BACKUP"]
        direction TB

        subgraph AUTO["AUTOMÁTICO (Supabase)"]
            A1["📅 Backup diario"]
            A2["⏰ Retención 7 días"]
            A3["🌍 Replicación geográfica"]
        end

        subgraph MANUAL["MANUAL"]
            M1["pg_dump semanal"]
            M2["Export CSV mensual"]
            M3["Storage backup"]
        end

        subgraph PITR["POINT-IN-TIME RECOVERY"]
            P1["Recuperación a cualquier punto"]
            P2["Últimas 7 días"]
            P3["Granularidad: segundos"]
        end
    end

    subgraph RECOVERY["🔧 PROCESO DE RECUPERACIÓN"]
        R1["1. Identificar punto de falla"]
        R2["2. Acceder Supabase Dashboard"]
        R3["3. Database → Backups"]
        R4["4. Seleccionar fecha/hora"]
        R5["5. Restore to new project"]
        R6["6. Verificar integridad"]
        R7["7. Actualizar DNS/variables"]
    end

    AUTO --> RECOVERY
    PITR --> RECOVERY
    R1 --> R2 --> R3 --> R4 --> R5 --> R6 --> R7

    classDef backup fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef recovery fill:#22c55e,stroke:#16a34a,color:#fff

    class A1,A2,A3,M1,M2,M3,P1,P2,P3 backup
    class R1,R2,R3,R4,R5,R6,R7 recovery
```

---

## 📥 CÓMO USAR ESTOS DIAGRAMAS

### Opción 1: Mermaid Live Editor (Recomendado)
1. Ve a: https://mermaid.live/
2. Copia el código del diagrama
3. Pégalo en el editor
4. Exporta como PNG, SVG o PDF

### Opción 2: GitHub
1. Crea un README.md
2. Pega los diagramas (GitHub renderiza Mermaid automáticamente)

### Opción 3: VS Code
1. Instala extensión "Markdown Preview Mermaid Support"
2. Crea archivo .md con los diagramas
3. Abre preview (Ctrl+Shift+V)

### Opción 4: Notion
1. Crea bloque de código
2. Cambia lenguaje a "Mermaid"
3. Pega el código

---

**Generado:** Diciembre 2025
**Proyecto:** TuTurno - Sistema de Gestión de Citas B2B SaaS
**Total de Diagramas:** 29
