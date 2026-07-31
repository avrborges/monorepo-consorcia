# CONSORCIA — Estado del Proyecto

> **Última actualización:** miércoles 29 de julio de 2026 — CABA, Argentina
> **Estado global:** 🟢 Refactor multi-tenant **COMPLETO** (M1–M6 al 100%). En pausa antes de arrancar el módulo de **Expensas**.

---

## 🏆 Resumen ejecutivo

CONSORCIA es una plataforma de administración de consorcios (property management), desarrollada como **monorepo** con tipos compartidos.

- **Backend:** Node.js + Express 5 + Mongoose + TypeScript (strict)
- **Frontend:** React + Vite + TypeScript + Tailwind + shadcn/ui
- **Tipos compartidos:** `shared/types` consumidos vía alias `@shared/*`
- **Base de datos:** MongoDB Atlas

Todo el **refactor multi-tenant** (convertir la app de un solo consorcio a multi-consorcio con administradora global) está **terminado, compilando limpio y validado en vivo**.

---

## ✅ Módulos completados (M1–M6)

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| **M1** | Modelos multi-tenant: `Consorcio`, `Membresia`, `Ocupacion` | ✅ 100% |
| **M2** | Backend multi-tenant: JWT con `activeConsorcioId`/`roleEnConsorcioActivo`/`rolGlobal`, middleware `scopeConsorcio`, controladores scopeados | ✅ 100% |
| **M3** | Frontend multi-tenant: login con selección de consorcio, sesión contextual, `SelectorConsorcio`, hook `useConsorcio` | ✅ 100% |
| **M4** | Adaptación al consorcio activo: MapaEdificio, ListaUsuarios, Auditoría, Overview | ✅ 100% |
| **M5** | Modelo `Ocupacion` con historial (`desde`/`hasta`): dual-write, migración real, timeline en `DetalleUnidad`, auditoría granular `OCUPACION_CREADA`/`OCUPACION_CERRADA` | ✅ 100% |
| **M6** | ABM de consorcios para `super_admin_global`: edición, crear/listar/activar-desactivar (baja lógica), gestión de administradores vía `Membresia`, selector multi-consorcio, auditoría completa | ✅ 100% |

### Detalle de M6 (sub-fases)
- **M6.0** — Edición de datos del consorcio (pantalla `Configuración`) + auditoría `CONSORCIO_EDITADO` + sync de sesión.
- **M6.1 / M6.2** — Backend CRUD de consorcios + tipos de auditoría.
- **M6.3** — Backend + service + drawer de gestión de administradores (asignar por email/rol, revocar por baja lógica) + auditoría `ADMIN_ASIGNADO`/`ADMIN_REVOCADO`.
- **M6.4** — Service tipado + pantalla `ConsorciosABM` (triple candado de seguridad).
- **M6.5** — `DrawerAdministradores`.
- **M6.6** — `SelectorConsorcio` como dropdown multi-consorcio + **bypass** en `cambiarConsorcio` para `super_admin_global`.
- **M6.7 / M6.7b** — Render prolijo de todas las acciones de consorcio y administradores en `HistorialAuditoria`.

---

## 🚀 Próximo módulo: EXPENSAS

Objetivo original, pospuesto para hacer primero el refactor multi-tenant. **La base ya está lista:**

- ✅ Multi-tenant scopeado por consorcio (cada expensa pertenece a un consorcio)
- ✅ Ocupaciones con historial (quién ocupaba cada UF y cuándo → clave para liquidar)
- ✅ Coeficientes de expensas ya cargados en cada `UnidadFuncional`
- ✅ Sistema de auditoría generalizado (listo para sumar acciones de expensas)

### Puntos a diseñar al arrancar
1. **Modelo de datos:** período / liquidación, ítems de gasto, prorrateo por coeficiente.
2. **Ciclo de liquidación:** borrador → emitida → cerrada.
3. **Estados de pago** por unidad (pendiente / pagada / vencida).
4. **Auditoría** de las acciones de expensas.

---

## 🧪 Datos de prueba (entorno actual)

| Recurso | Detalle |
|---------|---------|
| **Super Admin Global** | `superadmin@consorcia.com.ar` (rolGlobal = `super_admin_global`) |
| **Admin normal** | `admin@consorcia.com.ar` (para contraste de permisos) |
| **Consorcios** | Edificio Pichincha (activo), Edificio Urquiza 2244 (activo), Edificio Montañeses 3344 (inactivo) |
| **Unidades** | Consorcio principal con 9 UF y 8 ocupaciones activas |

> Para promover un usuario a `super_admin_global`:
> ```bash
> npx ts-node src/scripts/promoverSuperAdminGlobal.ts --email=<correo> --dry-run
> npx ts-node src/scripts/promoverSuperAdminGlobal.ts --email=<correo>
> ```
> ⚠️ Después de promover: **cerrar sesión y volver a loguearse** (el rolGlobal viaja en el JWT).

---

## ⚙️ Cómo levantar el proyecto

```bash
# Desde la raíz del monorepo
npm run dev        # levanta frontend + backend con concurrently

# O por separado (recomendado si hay problemas de hot-reload):
cd backend  && npm run dev     # http://localhost:5000
cd frontend && npm run dev     # http://localhost:5173
```

---

## 🛠️ Recordatorios de entorno (Windows)

### 404 fantasma en rutas que sí existen
Causado por **procesos Node zombie** (concurrently + ts-node-dev dejan huérfanos al Ctrl+C). Solución:

```powershell
taskkill /IM node.exe /F
netstat -ano | findstr LISTENING | findstr :5000   # debe quedar vacío
# luego arrancar backend y frontend limpios
```

> Reiniciar el backend **manualmente** cada vez que se agrega un router nuevo o se toca `index.ts`.

---

## 📚 Lecciones de código (convenciones del proyecto)

1. **Selects nativos:** requieren `text-slate-800` explícito en el `className` del `<select>` y de cada `<option>`, o el valor seleccionado no se ve.
2. **Helpers con `req`:** tiparlos con una interface mínima (ej. `RequestConAuth { user?; activeConsorcioId? }`) para evitar el conflicto de generics de Express (`ParamsId` vs `ParamsDictionary`, error TS2345).
3. **Acciones de auditoría:** al agregar una nueva, actualizar **SIEMPRE** los dos lugares: `shared/types/auditoria.ts` (union `AccionAuditoria`) **y** el array `ACCIONES_AUDITORIA` del modelo `AuditLog.ts`. (Olvidar el tipo compartido causa `TS2820`.)
4. **Reglas de React Hooks:**
   - No llamar `setState` síncrono dentro del cuerpo de un `useEffect` (`react-hooks/set-state-in-effect`) → manejar el caso como rama de render.
   - No leer refs (`.current`) durante el render (`react-hooks/refs`) → usar `useState` + `useMemo` para valores derivados que se leen en el render.
5. **Baja lógica en todo:** consorcios (`activo: false`), membresías (`estado: "inactiva"`), ocupaciones (`hasta` seteado). Nunca borrado físico → se preserva el historial para trazabilidad legal.
6. **Auditoría inmutable:** resolver nombres (snapshot) al momento del evento y guardarlos en `detalles.cambios`, para que el log sobreviva aunque el usuario/entidad se borre después.

---

## 🏗️ Arquitectura de carpetas (referencia)

```
NuevaConsorcia/
├── shared/types/          # tipos compartidos (@shared/*)
│   ├── auditoria.ts
│   ├── consorcio.ts
│   ├── membresia.ts
│   ├── ocupacion.ts
│   ├── persona.ts
│   ├── unidad.ts
│   └── index.ts           # barrel (export * from ...)
├── backend/
│   └── src/
│       ├── models/        # User, Consorcio, Membresia, Ocupacion, UnidadFuncional, AuditLog
│       ├── controllers/   # userController, unidadController, consorcioController
│       ├── routes/        # userRoutes, unidadRoutes, consorcioRoutes
│       ├── middleware/    # authMiddleware (protegerAdmin, scopeConsorcio, ...)
│       ├── services/      # loggerService, emailService
│       ├── scripts/       # migrarOcupaciones, promoverSuperAdminGlobal
│       └── index.ts       # entrypoint (registra routers en /api/*)
└── frontend/
    └── src/
        ├── pages/dashboard/   # Overview, MapaEdificio, ListaUsuarios, Auditoria,
        │                      # ConfiguracionConsorcio, ConsorciosABM, DrawerAdministradores
        ├── components/layout/ # DashboardLayout, SelectorConsorcio, ProtectedRoute
        ├── services/          # userService, unidadService, consorcioService, auditService
        ├── hooks/             # useAuth, useConsorcio, useDocumentTitle
        └── lib/session.ts     # capa única de sesión (sessionStorage)
```

---

## ▶️ Cómo retomar

Cuando vuelvas a trabajar en CONSORCIA (con el asistente o solo):
1. Liberá puertos si venías de otro proyecto: `taskkill /IM node.exe /F`.
2. Levantá backend + frontend.
3. Logueate como `superadmin@consorcia.com.ar` para acceso global.
4. El próximo paso es **diseñar el módulo de Expensas** (modelo de datos → ciclo de liquidación → estados de pago → auditoría).

---

*Documento de estado generado como recordatorio físico del punto de pausa. El detalle completo de cada decisión de diseño está registrado en el historial de desarrollo.*
