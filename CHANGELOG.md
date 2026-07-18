# Novedades

Cada versión se corresponde con el número de caché del `sw.js`. Para actualizar: sube `index.html` y `sw.js`, cierra la app y ábrela **dos veces**.

---

## v20 — Ordenar y buscar dentro de tablas y bases de datos

- En tablas y bases de datos, cada encabezado tiene un botón para **ordenar** (ascendente → descendente → sin orden). Los números se ordenan como números, las fechas por fecha, las casillas por marcado.
- **Lupa 🔍** en tablas, bases de datos y to-do para filtrar filas o pendientes al vuelo.
- Todo es **solo visual**: no cambia el orden real de tus datos ni se sincroniza; al recargar vuelve como estaba.

## v19 — Borrar opciones de selección

- En las columnas de selección (tareas y bases de datos) puedes **borrar opciones** con una ✕.
- Solo se pueden borrar las opciones que **nadie usa**; si una está en uso, la ✕ aparece desactivada y te dice cuántas tareas, notas o filas la usan.
- La celda de selección de las bases de datos ahora abre el **menú propio de la app** (antes mostraba una flecha del navegador que no hacía nada).

## v18 — To-do estilo Keep

- Al añadir un pendiente, el cursor va **directo al texto**.
- **Enter** crea el siguiente pendiente justo debajo; **Enter en uno vacío** cierra la lista; **Retroceso** al inicio de un pendiente vacío lo borra y sube al anterior.
- El teclado del móvil ya muestra la tecla **Enter** en vez del inútil "Siguiente".

## v17 — Áreas en las notas

- Cada nota tiene un **área** (por defecto "Sin área") y la lista de notas se **agrupa por área**, con grupos que se pliegan.
- La lista de áreas es **la misma que la propiedad "Area" de las tareas**: un área creada desde una nota queda disponible también en las tareas.

## v16 — Cabecera renovada

- El estado de sincronización es ahora un **icono** sin palabras: 🔴 error · ♻️ sincronizando · ⌛ pendiente · ✅ a salvo en la nube · 🏠 solo en este dispositivo. Tócalo para ver el detalle.
- **Se quitó el botón "Nuevo"** (las tareas se crean desde la tabla, el calendario o el tablero; en PC sigue el atajo `N`).
- La barra de vistas muestra solo **3 vistas ancladas** (Tabla, Hoy, Calendario) y un botón **⋯ Más** con el resto. Puedes anclar y desanclar las que quieras.

## v15 — Notas como sección propia

- **Tareas** y **Notas** son ahora dos botones que llevan a su sección, en vez de una ventana flotante.
- Dentro de Notas, en el móvil hay un botón **"‹ Notas"** para volver de una nota a la lista (antes no existía forma de volver).

---

## v14 — Integridad de datos

Dos fallos que afectaban a tus datos, ambos silenciosos (no daban ningún error):

- **Restaurar un respaldo ya devuelve todo.** El JSON se anuncia como "respaldo completo", pero al importarlo solo volvían tareas, notas y propiedades: **tus vistas, columnas, filtros, colores y ajustes se perdían**. Ahora se restaura todo.
- **Los cambios de vistas y ajustes ya llegan al otro dispositivo.** Si personalizabas una vista en el PC, el móvil **nunca la recibía** (una comparación de fechas fallaba cuando el otro dispositivo aún tenía los valores de fábrica). Corregido en ambos sentidos: lo más reciente gana, y lo antiguo nunca pisa lo nuevo.

También verificado: dos dispositivos editando a la vez conservan ambos cambios; las eliminaciones se propagan y se purgan a los 60 días; y con 2.000 tareas y 200 notas la app sigue fluida.

## v13 — Notas dentro de las tareas

- La propiedad **Notas** de cada tarea ahora enlaza notas de verdad: **buscar**, **vincular/desvincular**, **crear una nueva** (se crea, se vincula y se abre) y **abrir**.
- Cada nota vinculada se ve como una etiqueta con su título y un botón **ABRIR siempre visible**.
- Una misma nota puede servir a varias tareas.
- **Tus notas de texto anteriores se convierten solas** en notas reales, con el texto intacto.

## v12 — Sección de Notas

- Botón **🗒 Notas** junto al indicador de sincronización.
- Lista con buscador (busca en el título **y** en el contenido) y editor.
- Cada nota admite **Markdown** más **tabla**, **base de datos** y **to-do list**.
- Se sincronizan con Drive y entran en los respaldos, igual que las tareas.
- En el móvil, la lista ocupa la pantalla y hay botón para volver.

## v11 — Markdown

- Soporte de Markdown para las notas: encabezados, negrita, cursiva, tachado, código, listas, listas de tareas, citas, enlaces y tablas.
- **Corregido**: pulsar `Esc` mientras editabas un campo cerraba la ficha entera. Ahora solo cancela la edición.

## v10 — Elementos en las tareas

- Nuevo botón **Añadir elemento** en cada tarea, con tres bloques estilo Notion:
  - **Tabla** — filas y columnas de texto.
  - **Base de datos** — columnas con tipo (texto, número, selección, casilla, fecha). En las de selección, escribes un valor y la opción se crea sola.
  - **To-do list** — pendientes con casilla.
- Se pueden combinar varios en la misma tarea y se sincronizan con ella.

## v9 — Propiedades visibles solo cuando las quieres

- Una tarea nueva muestra **solo Fecha, Status y Descripción** (antes salían las 14).
- Botón **Añadir/mostrar propiedad**: el **ojo abierto/cerrado** muestra u oculta cada propiedad, y desde ahí también se crean nuevas.
- **Tus tareas actuales no pierden nada**: si una tarea ya tiene Prioridad, Contexto, etc., esa propiedad se sigue viendo en esa tarea. Aparecen marcadas como «con datos».
- Corregido: el antiguo botón "Ocultar por defecto" no hacía absolutamente nada.

## v8 — Botones que se ven en el móvil

- El botón **ABRIR** está siempre visible en cada fila.
- **Corregido**: el **＋ tarea** de los días del calendario era invisible en el móvil (solo aparecía al pasar el ratón, que en una pantalla táctil no existe). Esa era la causa real de que "añadir tarea desde el calendario no funcionara".

## v7 — Escribir sin pelearse

- Al tocar un campo, **el cursor se pone al final** en vez de seleccionar todo el texto (en el móvil, escribir borraba lo que había).
- Las **descripciones** son ahora una caja que **crece hacia abajo** y envuelve el texto: se lee completa sin mover la pantalla de lado.
- `Enter` = salto de línea · `Ctrl/Cmd+Enter` = guardar · `Esc` = cancelar.

## v6 — Calendario: horas y descripciones

- **Corregido el fallo principal**: al ponerle hora a una tarea, el evento se quedaba siempre como "todo el día" y no llegaban las descripciones.

  *La causa*: la app enviaba los cambios con un método que **fusiona** en vez de reemplazar. En una tarea nacida sin hora (como todas las importadas de Notion), el evento acababa con "día" y "hora" a la vez, y Google rechazaba la petición **entera** — por eso tampoco llegaba la descripción. Ahora se envía un reemplazo completo.
- Los eventos con hora llevan **zona horaria** explícita.
- **Reparación automática**: la primera sincronización tras actualizar corrige de una vez todos los eventos que quedaron mal.
- Nueva opción: **duración de los eventos** con hora (60 min por defecto).
