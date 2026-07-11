# Tareas — Guía de instalación y uso

Aplicación de tareas personal estilo Notion: funciona 100 % sin internet, se instala como app (PWA) y puede sincronizarse con tu Google Drive.

## Contenido del proyecto

| Archivo | Qué es |
|---|---|
| `index.html` | Toda la aplicación (un solo archivo) |
| `sw.js` | Service worker: hace que funcione sin internet |
| `manifest.json` | Permite instalarla como aplicación |
| `icon-192.png`, `icon-512.png` | Iconos de la app |
| `tareas-iniciales.json` | Tus 108 tareas ya convertidas desde tu export de Notion |
| `INSTRUCCIONES.md` | Este archivo |

---

## 1 · Publicar la aplicación (elige UNA opción)

> Nota importante: Google Drive dejó de permitir publicar páginas web en 2016. Drive sí sirve como **almacenamiento de sincronización** (paso 3), pero la app debe publicarse en un hosting estático gratuito. Las dos opciones de abajo son gratis y tardan minutos.

### Opción A — GitHub Pages (recomendada, permanente)

1. Crea una cuenta gratis en https://github.com si no tienes.
2. Arriba a la derecha pulsa **+** → **New repository**.
3. Nombre: `tareas` · marca **Public** → **Create repository**.
4. En la página del repositorio pulsa **uploading an existing file**.
5. Arrastra los 6 archivos del proyecto (todos menos este .md si quieres) → **Commit changes**.
6. Ve a **Settings → Pages** (menú lateral).
7. En **Branch** elige `main` y carpeta `/ (root)` → **Save**.
8. Espera 1–2 minutos. Tu app quedará en:
   `https://TU-USUARIO.github.io/tareas/`
9. Abre esa dirección en tu navegador. Listo.

### Opción B — Netlify Drop (la más rápida, sin cuenta obligatoria)

1. Entra a https://app.netlify.com/drop
2. Arrastra la **carpeta completa** con los archivos.
3. En segundos te da una dirección tipo `https://algo.netlify.app`. Esa es tu app.

### Opción C — Solo local (sin publicar)

Puedes abrir `index.html` con doble clic y todo funciona (tareas, vistas, calendario, importar/exportar). Limitaciones: no se puede "instalar" como app ni conectar Google Drive (ambos requieren una dirección https). El respaldo se hace con Exportar JSON.

---

## 2 · Instalarla como aplicación (PWA)

Con la app abierta en su dirección https:

- **Chrome/Edge en PC**: icono de instalar (⊕ o monitor con flecha) en la barra de direcciones → **Instalar**.
- **Android (Chrome)**: menú ⋮ → **Agregar a pantalla principal** → **Instalar**.
- **iPhone (Safari)**: botón Compartir → **Agregar a pantalla de inicio**.

Desde ese momento abre con su propio icono y **funciona sin internet**: puedes ver, crear, editar y eliminar tareas sin conexión; todo queda guardado en el dispositivo (IndexedDB).

---

## 3 · Conectar Google Drive (sincronización)

La app guarda un archivo oculto (`tareas-app.json`) en la carpeta privada de aplicaciones de tu Drive. Nadie más lo ve y no ocupa tu espacio visible. Para autorizarlo necesitas crear un "ID de cliente" gratuito (una sola vez, ~5 minutos):

1. Entra a https://console.cloud.google.com/ con tu cuenta de Google.
2. Arriba, junto al logo, pulsa el selector de proyecto → **Proyecto nuevo** → nombre `tareas` → **Crear** (y selecciónalo).
3. Menú ☰ → **APIs y servicios → Biblioteca** → busca **Google Drive API** → **Habilitar**.
4. Menú ☰ → **APIs y servicios → Pantalla de consentimiento de OAuth**:
   - Tipo de usuario: **Externo** → **Crear**.
   - Nombre de la app: `Tareas` · tu correo en los dos campos de correo → **Guardar y continuar** hasta el final.
   - En **Público** (o "Usuarios de prueba") pulsa **+ Add users** y agrega tu propio correo.
5. Menú ☰ → **APIs y servicios → Credenciales** → **+ Crear credenciales → ID de cliente de OAuth**:
   - Tipo de aplicación: **Aplicación web**.
   - En **Orígenes de JavaScript autorizados** pulsa **+ Agregar URI** y pega la dirección de tu app **sin barra final**, por ejemplo:
     `https://TU-USUARIO.github.io`  (o `https://algo.netlify.app`)
   - **Crear**. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`).
6. En la app: **⚙ Configuración → Sincronización con Google Drive** → pega el ID de cliente → **Conectar Drive** → elige tu cuenta y acepta.

### 4 · Habilitar y usar la sincronización

Ya conectado, la sincronización queda **automática**: cada cambio se sube ~8 segundos después, y también cada 90 segundos y al recuperar internet.

El indicador junto al logo muestra el estado en todo momento:

- 🟢 **Sincronizado** — todo al día.
- 🟡 **N cambios pendientes / Sin conexión** — hay cambios locales aún no subidos (se subirán solos al volver la conexión).
- 🔴 **Error de sincronización** — pulsa el indicador para ver el detalle y "Sincronizar ahora".

Al pulsar el indicador ves: última fecha/hora de sincronización, cantidad de cambios pendientes y el botón **Sincronizar ahora** (sincronización manual).

**Conflictos**: si editas la misma tarea en dos dispositivos, gana la edición más reciente (por tarea, no por archivo), así que nunca se pierde el resto de los cambios. Las eliminaciones también se sincronizan de forma segura.

**Varios dispositivos**: abre la misma dirección en cada dispositivo, pega el mismo ID de cliente y pulsa Conectar Drive. Verás tus tareas en todos.

---

## 5 · Uso sin conexión

No hay que hacer nada especial: tras la primera visita, la app queda guardada en el dispositivo.

- Sin internet puedes **ver, crear, editar y eliminar** tareas con normalidad.
- El indicador pasa a 🟡 con el conteo de cambios pendientes.
- Al volver la conexión, sincroniza sola y vuelve a 🟢.

---

## 6 · Respaldo y restauración

- **Respaldo manual**: indicador de sincronización → **Descargar respaldo JSON** (o ⚙ Configuración → Datos → Exportar JSON). Ese archivo contiene tareas + propiedades + vistas + configuración. Guárdalo donde quieras (incluido tu Drive normal).
- **Restaurar**: ⚙ Configuración → Datos → **Importar…** → elige el JSON de respaldo. Se fusiona sin duplicar (misma tarea = gana la versión más reciente).
- **Solo configuración**: botones "Exportar/Importar configuración" copian tus vistas, columnas y colores a otro dispositivo sin tocar las tareas.
- Si usas Google Drive, además ya tienes copia continua en la nube.

---

## 7 · Importar y exportar

**Importar** (⚙ → Datos → Importar…): acepta CSV, JSON y Excel (.xlsx). Muestra una tabla para **mapear cada columna** a una propiedad existente, crear una nueva o ignorarla. Reconoce automáticamente las fechas de Notion ("1 de julio de 2026 14:30") y dd/mm/aaaa.

**Tus tareas de Notion**: el archivo `tareas-iniciales.json` ya incluye tus 108 tareas convertidas. Si publicaste la app con ese archivo al lado, se cargan solas la primera vez. Si no, impórtalo con ⚙ → Datos → Importar….

**Exportar**: CSV, Excel y JSON desde ⚙ → Datos.

---

## 8 · Referencia rápida de la interfaz

- **Vistas**: pestañas arriba. Clic en la pestaña activa (o en ⋯) para renombrar, cambiar tipo (tabla/calendario/tablero), duplicar, ocultar o eliminar. **Arrástralas para reordenarlas**. `+ Vista nueva` crea vistas propias.
- **Vistas automáticas**: Hoy (fecha ≤ hoy o en curso, nunca completadas) · Esta semana (próximos 7 días + vencidas) · Urgentes (prioridad Alta/Urgente + vencidas) · Delegadas (etiqueta Delegada, "A la espera" o campo "Delegada a") · Logbook (completadas) · Contextos (agrupadas por contexto).
- **Tabla**: clic en cualquier celda para editar. Clic en el encabezado ordena; clic derecho en el encabezado da más opciones; arrastra encabezados para reordenar columnas; `＋` agrega propiedades. Casillas a la izquierda para selección múltiple → barra de **edición masiva** (estado, fecha, prioridad, completar, eliminar).
- **Calendario**: ‹ › cambia de mes. **Arrastra una tarea a otro día** para cambiar su fecha. Escribe en "＋ tarea" dentro de un día para crearla ahí. Las vencidas se ven en rojo. Todo se refleja al instante en las tablas (y viceversa).
- **Tablero**: arrastra tarjetas entre columnas para cambiar el estado.
- **Estados**: edítalos en ⚙ → Propiedades → Status → Editar: crea nuevos, cambia colores y define si cuentan como "Por hacer", "En curso" o "Hecho" (esto controla las vistas automáticas).
- **Fórmulas**: propiedad tipo Fórmula, p. ej. `dias({Fecha})` (días restantes) o `{Prioridad} + " · " + {Status}`.
- **Atajos**: `N` nueva tarea · `/` buscar · `Esc` cerrar.
- **Tema**: oscuro/claro y color de acento en ⚙ → Apariencia.
