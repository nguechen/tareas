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
| `CHANGELOG.md` | Qué cambió en cada versión |
| `AGENT_PLAN.md` | Plan técnico de desarrollo (no hace falta subirlo al hosting) |
| `tests/` | Pruebas automáticas del proyecto (no hace falta subirlas) |

> Para publicar bastan los 6 primeros archivos. `AGENT_PLAN.md`, `CHANGELOG.md` y `tests/` son documentación y no afectan a la app.

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

## 4b · Conectar Google Calendar (opcional, una vía)

Cada tarea **con fecha** puede crear y mantener al día un evento en tu Google Calendar. Es de **una sola dirección**: la app manda al calendario, no al revés.

1. Necesitas el mismo **ID de cliente** del paso 3. Si ya conectaste Drive, no hay que crear nada nuevo.
2. Añade el permiso de calendario a tu proyecto: Google Cloud Console → **APIs y servicios → Pantalla de consentimiento de OAuth → Editar → Permisos → Agregar o quitar permisos** → busca y marca `.../auth/calendar.events` → **Actualizar** y **Guardar**.
3. En la app: **⚙ Configuración → Google Calendar** → marca **Activar sincronización con Calendar** → acepta el permiso que pide Google (verás una pantalla nueva, distinta de la de Drive).
4. **Calendario destino**: deja `primary` para tu calendario principal, o pega el ID de otro (en Google Calendar: Configuración del calendario → Integrar calendario → ID de calendario).

Qué hace, una vez activo:

- Tarea con fecha → aparece el evento (con hora si la pusiste; si no, evento de todo el día).
- Cambias fecha, hora, título o descripción → el evento se actualiza.
- Completas la tarea → el evento lleva un ✓ delante.
- Borras la tarea o le quitas la fecha → el evento se elimina.
- Nunca duplica: cada tarea recuerda su evento.

Sincroniza sola ~4 s después de cada cambio, cada 2 minutos y al recuperar internet. La misma sección muestra la última fecha de envío o el error exacto que devuelva Google.

**Si algo falla**, el mensaje de error indica la causa:

| Mensaje | Qué hacer |
|---|---|
| `403 · insufficient authentication scopes` | Falta el permiso de calendario: repite el paso 2 y reconecta marcando la casilla |
| `403` sin mencionar *scopes* | Tu cuenta no puede escribir en ese calendario: en Google Calendar dale **"Hacer cambios en los eventos"** a tu usuario |
| `404 · Not Found` | El ID del calendario está mal o es de otra cuenta. Prueba con `primary` para descartar |
| `401 · sesión caducada` | Pulsa **Reconectar y sincronizar ahora** |

**Un aviso**: como es de una vía, si mueves o borras un evento **dentro de Google Calendar**, no se refleja en la app; la siguiente sincronización de esa tarea lo recreará o corregirá.

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

### Secciones y vistas
Arriba a la izquierda hay dos botones: **Tareas** y **🗒 Notas**, que llevan a cada sección.

En Tareas, la barra de pestañas muestra solo **3 vistas ancladas** (por defecto Tabla, Hoy y Calendario) y un botón **⋯ Más** con el resto. Al abrir una vista desde «⋯ Más» aparece como pestaña temporal con una ✕ para cerrarla. Puedes **anclar/desanclar** cualquier vista desde su menú (⋯) o desde «⋯ Más». Clic en la pestaña activa (o en ⋯) para renombrar, cambiar tipo, duplicar, anclar, ocultar o eliminar. Arrástralas para reordenarlas. `+ Vista nueva` crea las tuyas.

Vistas automáticas: **Hoy** (fecha ≤ hoy o en curso, nunca completadas) · **Esta semana** (próximos 7 días + vencidas) · **Urgentes** (prioridad Alta/Urgente + vencidas) · **Delegadas** (etiqueta Delegada, "A la espera" o campo "Delegada a") · **Logbook** (completadas) · **Contextos** (agrupadas por contexto).

### Estado de sincronización
Un icono, sin palabras (tócalo para ver el detalle): 🔴 error · ♻️ sincronizando · ⌛ hay cambios pendientes · ✅ todo a salvo en la nube · 🏠 solo en este dispositivo (Drive no conectado).

### Buscador
Arriba. El botón de al lado alterna el alcance:

- **🔍 Vista** — busca solo dentro de la vista actual, respetando sus filtros.
- **🌐 Global** — ignora los filtros y busca en todas tus tareas.

No hay botón «Nuevo»: las tareas se crean desde la fila **＋ Nueva tarea** de la tabla, el **＋ tarea** de cada día del calendario, o el tablero. En un PC, la tecla **N** también crea una.

### Filtros
Botón **Filtro** de la barra. Puedes elegir cómo se combinan:

- **Todos (Y)** — deben cumplirse todas las condiciones (comportamiento clásico).
- **Cualquiera (O)** — basta con que se cumpla una: sirve para **sumar** grupos de tareas.

Hay un atajo **⚡ Preset: Hoy + Vencidas (O)** que deja en una sola pantalla lo que hay que atender ya.

### Tabla
Clic en cualquier celda para editar. Clic en el encabezado ordena; clic derecho da más opciones; arrastra encabezados para reordenar columnas; `＋` añade columnas. Las casillas de la izquierda activan la **edición masiva** (estado, fecha, prioridad, completar, eliminar). El botón **ABRIR** está siempre visible en cada fila.

### Calendario
`‹ ›` cambia de mes. **Arrastra una tarea a otro día** para cambiar su fecha. En cada día hay un **＋ tarea** visible que abre la ficha con la fecha ya puesta. Las vencidas salen en rojo.

### Tablero
Arrastra tarjetas entre columnas para cambiar el estado.

### La ficha de una tarea
- Por defecto muestra solo **Fecha, Status y Descripción**. El resto está oculto hasta que tú lo actives.
- **Añadir/mostrar propiedad** gestiona ambas cosas: el **ojo abierto/cerrado** muestra u oculta cada propiedad, y abajo puedes crear propiedades nuevas.
- Si una tarea **ya tiene datos** en una propiedad (por ejemplo Prioridad), esa propiedad se sigue viendo **en esa tarea** aunque esté desactivada — nunca se esconde información. En el menú aparecen marcadas como «con datos».
- **Añadir elemento** inserta bloques estilo Notion dentro de la tarea: **Tabla**, **Base de datos** (columnas con tipo) y **To-do list**. Puedes poner varios.
- En **tablas y bases de datos** puedes ordenar por cualquier encabezado (botón ↕) y filtrar con la **lupa 🔍**. Es solo visual: no cambia tus datos ni se guarda.
- En las columnas de **selección** creas opciones escribiéndolas; una **✕** borra las que no use nadie (si están en uso, la ✕ se desactiva y explica por qué).
- En un **to-do**, al añadir un pendiente el cursor va directo al texto; **Enter** crea el siguiente, y **Enter en uno vacío** cierra la lista.
- La descripción es una caja que **crece sola** y envuelve el texto. `Enter` hace salto de línea, `Ctrl/Cmd+Enter` guarda, `Esc` cancela.

### Notas
Botón **🗒 Notas** en la cabecera; abre la sección de notas. En el móvil, dentro de una nota hay un botón **«‹ Notas»** para volver a la lista.

- Lista con buscador (mira el título, el contenido **y** el área) y **＋ Nueva nota**.
- Las notas se **agrupan por área** (por defecto «Sin área»); los grupos se pliegan. El área se elige o se crea desde la propia nota, y **comparte lista con la propiedad «Area» de las tareas**.
- Cada nota admite **Markdown** y los mismos elementos: tabla, base de datos y to-do list.
- Markdown soportado: `# encabezados`, `**negrita**`, `*cursiva*`, `~~tachado~~`, `` `código` ``, bloques de código con ```, listas, listas de tareas `- [x]`, `> citas`, `---`, enlaces y tablas con `|`. Pulsa el texto para editarlo y toca fuera para verlo renderizado.
- Se sincronizan y se respaldan igual que las tareas.

### Notas dentro de una tarea
La propiedad **Notas** enlaza notas de verdad. Al pulsarla puedes **buscar** y **vincular/desvincular** notas existentes, **crear una nueva** escribiendo el título (se crea, se vincula y se abre) y **abrir** cualquiera con su botón **ABRIR**, siempre visible. Una misma nota puede servir a varias tareas.

### Otros
- **Estados**: ⚙ → Propiedades → Status → Editar. Crea estados nuevos, cambia colores y define si cuentan como "Por hacer", "En curso" o "Hecho" (eso alimenta las vistas automáticas).
- **Fórmulas**: propiedad tipo Fórmula, p. ej. `dias({Fecha})` o `{Prioridad} + " · " + {Status}`.
- **Atajos**: `N` nueva tarea · `/` buscar · `Esc` cierra la capa de encima.
- **Tema**: oscuro/claro y color de acento en ⚙ → Apariencia.
