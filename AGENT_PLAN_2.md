# Tareas PWA — Agent Plan v2 (Navigation, Notes & Blocks)

> **STATUS: COMPLETED.** All 7 phases executed with TDD. Final suite: **533 checks, 0 failures**
> across regression + t1–t17. Shipped as `tareas-v20`. Point 10 (a "Nota" element in Añadir
> elemento) was withdrawn by the user. Real defect fixed beyond the requests: the notes back
> button had never been visible because its reveal selector could not match its position (Phase 1).


> **Audience:** an AI agent with a shell, a Node runtime and this repository.
> **Predecessor:** `AGENT_PLAN.md` (phases 0–10, shipped as `tareas-v14`, suite 328/328).
> This plan starts from that build. Read §0 and Appendix A **before writing any code**.

---

## Ground rules

1. **One phase at a time.** Do not start phase N+1 until phase N's exit criteria are met and reported.
2. **Tests first.** For every phase: write the test, watch it **fail against the current code**, then implement, then watch it pass. A test that has never failed has proved nothing.
3. **Never break a green test.** The full suite must stay green after every phase. If an old test legitimately must change (see §1.6), *update* its assertions — never delete them to make red go away.
4. **Report honestly.** Bugs you cause, deviations you choose, and assumptions you make all go in the phase report. If a requirement conflicts with itself, stop and say so rather than guessing.
5. **The user is on a phone, offline-first, with 108 real tasks and a live Google Drive + Calendar session.** Any change that could lose their data is a stop-the-line event.

---

## §0 — Baseline (do this first)

### 0.1 Restore and verify

```bash
node tests/gateA.js                     # syntax of the 3 <script> blocks
for t in regression t1 t1b t2 t3 t4 t4b t5 t6 t7 t8 t8b t8c t9 t9b t9c; do
  node tests/$t.js || echo "FAIL $t"
done
```

**Expected: 328 passed, 0 failed.** If not, stop and report — do not build on a red baseline.

### 0.2 Snapshot

```bash
cp app/index.html app/index.v14.html    # rollback reference for every phase
git add -A && git commit -m "baseline v14"
```

### 0.3 Scope of this plan

Nine confirmed changes, grouped into six working phases. Point 10 of the original request
(*"Nota" element inside Añadir elemento*) was **withdrawn by the user** — the `notes` property
already opens a note from the task, and the notes section is being improved instead. Do not implement it.

| Phase | Points covered | Theme |
|---|---|---|
| 1 | 9, 2 | Navigation shell — Notes becomes a real section |
| 2 | 6, 7, 8 | Header controls — sync icons, remove Nuevo, view tabs |
| 3 | 3 | Note areas + grouping |
| 4 | 1 | To-do writing flow |
| 5 | 4 | Select options: own picker + delete |
| 6 | 5 | Sort by header + search inside blocks |
| 7 | — | Integrity sweep & release |

**Ordering rationale (do not reorder casually):**
- Phase 1 first: everything downstream renders **inside** the new shell. Building note areas into a
  modal we are about to delete would be wasted work.
- Phase 3 before Phase 5: notes will share the task `area` option list, so Phase 5's
  "is this option in use?" check **must count notes too**. Getting this backwards ships a delete
  button that silently orphans note areas.
- Phase 6 last: it touches all three block renderers, which Phases 4 and 5 also modify. Doing it
  last means one pass over settled code instead of three-way merge pain.

---

## §1 — Phase 1: Navigation shell (points 9 + 2)

### 1.1 Goal

Tasks and Notes become two peer sections reached from two labelled buttons. Notes stops being a
modal overlay.

### 1.2 Root cause of point 2 (the missing back button)

**This is a real defect introduced in Phase 7 of the previous plan, not a new feature.** The markup is:

```html
<div class="m-top">
  <button class="iconbtn" id="nBack">‹</button>   <!-- here -->
  ...
</div>
<div class="notes-wrap" id="nWrap"> ... </div>     <!-- not here -->
```

and the CSS is:

```css
#nBack{display:none}
@media(max-width:700px){ .notes-wrap.ed #nBack{display:grid} }
```

`#nBack` is a **sibling** of `.notes-wrap`, not a descendant, so `.notes-wrap.ed #nBack` **never
matches** and the button is never shown. The previous test suite asserted the button *existed* but
never that it was *visible* — the same class of miss as the invisible `＋ tarea` in Phase 3.

**Lesson to apply everywhere in this plan: assert visibility, not existence.** See Appendix A.6.

### 1.3 Design

- New state: `let section='tasks';` (`'tasks' | 'notes'`) and `function goSection(s,noteId)`.
- Header nav, replacing the `Tareas` logo and the `#btnNotes` chip:
  ```html
  <button class="nav" id="navTasks" aria-current="page">Tareas</button>
  <button class="nav" id="navNotes">🗒 Notas</button>
  ```
  Both **always show their text label**. Delete the rule `@media(max-width:700px){#btnNotes .lbl{display:none}}` —
  that rule is why the user only ever saw the icon on their phone.
- Delete the `#mNotes` overlay. Move its inner markup into a section that is a sibling of `<main>`:
  ```html
  <main id="tasksPage"> ... </main>
  <section id="notesPage" hidden> ... </section>
  ```
  Toggle with the `hidden` attribute (or a class) driven by `section`. **No `.overlay`, no `.show`.**
- `openNotes(id)` keeps its signature and becomes `goSection('notes', id)` — Phase 8 of the previous
  plan calls it from the `noteref` chips (`[data-nopen]`), and those call sites must keep working.
- Mobile navigation inside Notes stays list ↔ editor via the `.ed` class, but `#nBack` moves
  **inside `#nWrap`** (or the selector changes to match reality — either fix is acceptable, but the
  test must prove the button is visible).
- Desktop (≥701px): list and editor side by side, `#nBack` hidden — nothing to go back from.
- Escape key precedence becomes: popover → task drawer → (in notes, on mobile, editor→list) → nothing.
  There is no overlay to close any more.
- The task drawer is only reachable from the tasks section. Switching to Notes closes it.

### 1.4 Functions to touch

`goSection` (new), `openNotes`, `closeNotes` (may disappear), `renderNotes`, `render`,
the global `keydown` handler, header markup, notes CSS block.

### 1.5 Acceptance tests — `tests/t11.js`

1. `#navTasks` and `#navNotes` both exist and **both render a text label** (`textContent` contains
   `Tareas` / `Notas`) — assert at a 380px-wide viewport, not just the default.
2. Clicking `#navNotes` shows `#notesPage` and hides `#tasksPage`; clicking `#navTasks` reverses it.
3. `#notesPage` is **not** an overlay: it has neither the `overlay` class nor a `show` class, and
   `#mNotes` no longer exists in the document.
4. **Back button visibility (the actual bug):** at a 380px viewport, open a note → `#nBack` must be
   *visible*. Assert via `getComputedStyle(nBack).display !== 'none'` **and** that `#nBack` matches
   the selector that reveals it (`nBack.closest('#nWrap') !== null` or equivalent). Clicking it
   returns to the list (`#nWrap` loses `.ed`, the list is visible again).
5. At a 1200px viewport, `#nBack` is hidden and both list and editor are visible simultaneously.
6. Creating a note with `#nNew` on a 380px viewport lands in the editor **and** `#nBack` is visible
   (this is the exact path the user reported: "create a new one and you can't get back").
7. `openNotes(id)` from a task's `noteref` chip (`[data-nopen]`) still lands on the right note and
   still switches the section.
8. Returning to Tasks preserves the current view and the table renders.
9. Escape inside a note editor on mobile returns to the list, not to Tasks.
10. No page errors throughout.

### 1.6 Expected churn in existing tests

`t7.js` asserts `#mNotes` and `.show`. Those assertions describe the modal that this phase removes.
**Update them to the new shell; keep every behavioural assertion** (CRUD, blocks, markdown, search,
sync, tombstones, export/import). If `t7` ends with fewer checks than 36, you deleted coverage —
justify it explicitly or put it back.

### 1.7 Exit criteria

`t11` green · `t7` green (updated, ≥36 checks) · full suite green · Gate A green · `sw.js` bumped.

### 1.8 Rollback

`git checkout app/index.html` from the phase's start commit. No data model change, so no migration to undo.

---

## §2 — Phase 2: Header controls (points 6 + 7 + 8)

### 2.1 Goal

The header stops using words. Fewer, clearer controls.

### 2.2 Point 6 — sync icons

Current `syncUI()` produces six wordy states. Replace with five icons, **no visible text**:

| Condition (evaluate in this order) | Icon |
|---|---|
| `M.lastError` | 🔴 |
| `syncing` | ♻️ |
| `M.pending > 0` | ⌛ |
| `M.driveOn && M.pending === 0` | ✅ |
| `!M.driveOn && M.pending === 0` | 🏠 |

Rules confirmed with the user:
- **Pending is pending**, whatever the cause — offline, Drive off, or simply not flushed yet. One icon: ⌛.
- ✅ vs 🏠 is the only distinction kept, and it is the one that matters: **✅ = safe in the cloud,
  🏠 = only on this device**. The user accepted this after realising a single 🏠 for both would hide a
  silently expired Drive session.
- **Calendar state does not affect this icon.** Calendar errors keep surfacing in ⚙ where they are now.
- **⛔ is dropped** — after the above rules no state maps to it.

Interaction: **tapping the icon opens a popover with the full detail in words** — exactly the text
the chip shows today (`3 cambios pendientes · sin conexión`, `Sincronizado · hace 2 min`,
`Error: <mensaje>`, `Solo en este dispositivo`). Reuse `openPop`. Also keep a `title` attribute.
Remove `#syncDot` (the emoji replaces the coloured dot) but keep the element id `#syncChip` stable.

### 2.3 Point 7 — remove the "Nuevo" button

- Delete `#btnNew` and its handler.
- **Keep the `N` keyboard shortcut.** *(Assumption: the user said "lo usaré casi siempre en el celular,
  sí quitarlo" about the button; the shortcut costs nothing on mobile and helps on the PC they told us
  they also plan to use. If they disagree, deleting the shortcut is a two-line change.)*
- The remaining creation paths, all verified present: the table's `＋ Nueva tarea` row (`#rowNew`),
  the calendar's `＋ tarea` per day (`.qadd`), and the board's own add control (user confirmed).
- **Update the empty state text.** It currently reads *«Crea una con el botón «Nuevo» o «＋ Nueva
  tarea».»* and would point at a button that no longer exists.

### 2.4 Point 8 — three pinned views + overflow dropdown

- New setting: `settings.pinnedViews = ['v_all','v_today','v_cal']` (Tabla, Hoy, Calendario).
  **User-configurable**, those three are only the default.
- `renderTabs()` renders: pinned views (in `D.views` order) → `⋯ Más` button → `+ Vista nueva`.
- `⋯ Más` opens a popover listing every view that is not pinned and not `v.hidden`. Each row offers
  *open* and *pin*.
- Opening a non-pinned view shows it as a **temporary tab**, marked and carrying a **✕ to close**
  (the user explicitly asked for a way to close/go back). Closing it returns to the last pinned view.
  Temporary state is ephemeral — not stored, not synced.
- Each tab's existing context menu gains **Anclar / Desanclar**.
- Guards: `pinnedViews` may reference a deleted view → filter at render. Unpinning everything must
  not produce an empty tab bar — keep at least one, or always render the current view.
- Migration (`migrate()`): `if(!Array.isArray(s.pinnedViews)) s.pinnedViews=['v_all','v_today','v_cal']`,
  filtered to views that exist. Bump `D.version` to 4.
- Sync: `pinnedViews` lives in `settings`, which already merges by `isNewer`. Set
  `D.settings.updatedAt = nowISO()` when it changes, or the change will not reach the other device.

### 2.5 Acceptance tests — `tests/t12.js`

**Sync icons**
1. Each of the five states renders its exact icon; drive the state by setting `M`/`syncing` directly.
2. `#syncTxt` no longer displays words (element removed, or empty).
3. `M.pending>0 && !navigator.onLine` → ⌛ (not 🏠, not an offline icon) — the confirmed rule.
4. `M.driveOn && pending===0 && !navigator.onLine` → ✅ (nothing to sync; data is already in the cloud).
5. `!M.driveOn && pending===0` → 🏠.
6. `M.lastError` beats everything, including `pending>0`.
7. A Calendar error (`M.calError`) does **not** change the icon.
8. Tapping the chip opens a popover containing the detail text and the pending count.

**Nuevo**
9. `#btnNew` does not exist.
10. Pressing `N` still creates a task and opens the drawer.
11. `#rowNew` still creates a task; `.qadd` still creates one with the day's date.
12. The empty-state text no longer mentions «Nuevo».

**Views**
13. A factory document shows exactly 3 tabs (+ `⋯ Más` + `+ Vista nueva`).
14. They are Tabla, Hoy, Calendario.
15. `⋯ Más` lists the remaining views and not the pinned ones; `v.hidden` views appear nowhere.
16. Opening a view from the dropdown makes it the current view **and** shows a temporary tab with a
    visible ✕ (assert visibility, per Appendix A.6).
17. Clicking ✕ closes the temporary tab and returns to a pinned view.
18. Pinning from the dropdown adds it to `settings.pinnedViews`, persists, and bumps `settings.updatedAt`.
19. Unpinning removes it; the tab bar never renders empty.
20. `pinnedViews` referencing a deleted view does not throw and is filtered out.
21. Migration: an old document without `pinnedViews` gets the default; running `migrate()` twice changes nothing.

### 2.6 Exit criteria

`t12` green · full suite green · Gate A green · `sw.js` bumped. Report the icon table you implemented.

---

## §3 — Phase 3: Note areas + grouping (point 3)

### 3.1 Goal

Every note carries an **area**, default **"Sin área"**, and the notes list is grouped by it.

### 3.2 Design

- Data: `note.area` = the option **name** (string) or absent. Absent ⇒ "Sin área".
- **The option list is shared with the tasks' `Area` property** — this is the user's explicit intent
  ("la misma, mi intención es relacionarlas y ordenarlas"). Source of truth: `prop('area').options`
  (already seeded with `Personal`, `Laboral`, `Salud`, `Familia`). Creating an area from a note adds
  the option there, and it becomes selectable in tasks too. Do **not** create a parallel list.
- **Guard:** `prop('area')` may not exist — the user can delete properties. Handle it lazily: if it is
  missing when a note first assigns an area, create the property (`type:'select'`) then. Do **not**
  resurrect it in `migrate()` on every boot; that would fight a user who deliberately deleted it.
- UI: an area control in the note editor (under the title). Reuse the app's own option picker.
  Phase 5 upgrades that picker with the ✕ — this phase uses it as-is.
- List: grouped by area with **collapsible headers**; **"Sin área" is a virtual bucket**, always
  rendered last, never a deletable option.
- Collapse state: `settings.notesCollapsedAreas = []` (persists across reloads, syncs with settings).
- Search: `noteText()` should include the area name so the existing search box finds it.
- Sync: `note.area` rides the note object; merges by `isNewer` already. **No new merge code.**
- Migration: none. `undefined` already means "Sin área". Do not touch existing notes.

### 3.3 Acceptance tests — `tests/t13.js`

1. A new note has no `area` and renders under a **"Sin área"** group.
2. Assigning an area moves it to that group; the note's `updatedAt` advances.
3. The area picker lists the **task** `Area` options (`Personal`, `Laboral`, `Salud`, `Familia`).
4. Creating a new area from a note adds it to `prop('area').options` **and** it becomes selectable on
   a task — the shared-list proof.
5. Groups render sorted; "Sin área" is last.
6. Collapsing a group hides its notes, persists in `settings.notesCollapsedAreas`, and survives a re-render.
7. Search finds a note by its area name.
8. Search + grouping combine: empty groups are not rendered.
9. `note.area` survives a Drive round trip and a newer remote value wins.
10. The JSON backup carries `note.area`; export → wipe → import restores it.
11. **Deleting the `area` property entirely does not break the notes panel** (notes fall back to "Sin área").
12. Assigning an area when `prop('area')` is missing creates the property lazily and does not throw.
13. No page errors.

### 3.4 Exit criteria

`t13` green · full suite green · `sw.js` bumped.

---

## §4 — Phase 4: To-do writing flow (point 1)

### 4.1 Goal

Type a to-do list the way Google Keep does: the caret lands next to the checkbox, Enter makes the
next item.

### 4.2 Root causes

1. **Focus is destroyed.** `[data-todoadd]` pushes an item then calls `blkChanged(owner,b,true)`,
   which calls `save()` → `render()` → the whole DOM is rebuilt and the new input never gets focus.
2. **The keyboard shows "Siguiente".** The inputs are plain `<input type="text">`, so mobile browsers
   offer a "next field" action that does nothing useful here.

### 4.3 Design

- `render()` is **synchronous**, so focus can be restored immediately after it:
  ```js
  b.items.splice(pos, 0, it);
  blkChanged(owner, b, true);          // rebuilds the DOM
  focusTodo(it.id);                    // re-query [data-todotxt="<id>"], focus, caret at end
  ```
  Implement `focusTodo(id)` as a small helper; it must be null-safe (the block may have been
  re-rendered inside a section that is not visible).
- **Commit before mutating.** The inputs commit on `change` (i.e. on blur). Enter/Backspace handlers
  must first do `it.text = input.value` and then act, or the user's last keystrokes are lost.
  Do **not** switch to `oninput` + `save()` per keystroke.
- Key handling on a to-do text input:

  | Key | Behaviour |
  |---|---|
  | `Enter` (item has text) | commit, insert a new empty item **immediately below this one**, focus it |
  | `Enter` (item is empty) | commit, **delete this empty item**, blur — ends the list |
  | `Backspace` at caret 0 on an **empty** item | delete it, focus the **previous** item with caret at end |
  | `Escape` | blur (and `e.stopPropagation()` — see Appendix A.4) |

- `＋ Añadir pendiente` appends at the end **and focuses it**.
- Add `enterkeyhint="enter"` to the to-do text inputs to relabel the mobile action key.
- **Out of scope, confirmed by the user:** reordering items.
- The same engine serves notes — the behaviour must work in both without a second implementation.

### 4.4 Acceptance tests — `tests/t14.js`

1. `＋ Añadir pendiente` creates an item **and** focuses its input (`document.activeElement`) with
   `selectionStart === selectionEnd === value.length`.
2. Enter on an item with text inserts a new item **directly below it** (index+1, *not* at the end)
   and focuses it. Verify with a 3-item list, pressing Enter on the middle one.
3. Text typed before Enter is committed to the model (the classic "last keystrokes lost" bug).
4. Enter on an **empty** item deletes that item and blurs; the list length drops by one.
5. Backspace at caret 0 on an empty item deletes it and focuses the previous item, caret at end.
6. Backspace on the **first** item when empty does not throw and does not delete a neighbour.
7. Backspace on an item **with text** does nothing special (normal editing).
8. The inputs carry `enterkeyhint`.
9. Ticking still toggles exactly once per click (no stacked listeners — this regressed once before).
10. The identical flow works for a to-do block **inside a note**.
11. Rapid `＋` ×3 produces exactly 3 items with unique ids.
12. No page errors.

### 4.5 Exit criteria

`t14` green · `t5` green (block engine) · `t7` green (notes) · full suite green · `sw.js` bumped.

---

## §5 — Phase 5: Select options — own picker + delete (point 4)

### 5.1 Goal

Kill the dead dropdown arrow, and let the user delete options they created — safely.

### 5.2 Root cause of the dead arrow

Phase 5 of the previous plan implemented DB select cells as `<input list="dl_x">` + `<datalist>`.
Mobile browsers render a dropdown affordance for `list=` but handle it inconsistently — on the user's
phone the arrow appears and does nothing. **`<datalist>` must go.** Replace it with the app's own
popover picker, which is what every other select in this app already uses.

### 5.3 Two scopes, two option lists

| Scope | Where options live | Sharing |
|---|---|---|
| **Task properties** (`select`, `multi`, `status`) | `prop(id).options = [{id,name,color,kind}]` | **Shared across all tasks** (and, since Phase 3, notes' areas) |
| **DB block select columns** | `block.props[i].options = ['a','b']` (plain strings) | **Private to that one block** |

Both get the ✕. **Plain text for DB options — no colours** (confirmed; colours would require a data
model change for zero benefit here).

### 5.4 The delete rule

A ✕ sits next to each created option. Deleting is allowed **only when nothing uses the option**.

- **Task properties:** count **live** tasks (`liveTasks()`, i.e. excluding tombstones) whose value for
  that property equals the option — for `multi`, whose array contains it.
  **Also count notes** whose `area` equals the option (Phase 3 made that list shared). Missing this is
  the single most likely bug in this phase: it silently orphans a note's area.
- **DB blocks:** count rows **in that block only**.
- When the option **is** in use, the ✕ is **rendered disabled with the reason on tap** —
  e.g. *"3 tareas usan esta opción"*, *"1 nota usa esta área"*, *"2 filas usan esta opción"*.
  *(Assumption, agreed with the user: show a disabled ✕ with the reason rather than hiding the button.
  A missing button teaches nothing; a disabled one explains itself.)*
- Deleting a `status` option follows the same rule — orphaning a task's status is exactly the kind of
  silent damage this rule exists to prevent.
- Deleting an option must set `p.updatedAt = nowISO()` (task props) or `blkChanged` (DB blocks), or
  the deletion will not sync.

### 5.5 Acceptance tests — `tests/t15.js`

**DB block select cell**
1. There is **no `<datalist>`** anywhere in the document any more, and no `input[list]`.
2. Tapping a select cell opens the app's popover listing that block's options.
3. Typing a new value creates the option (existing behaviour must survive) and stores it in the row.
4. Picking an existing option from the popover sets the cell — the interaction the arrow failed to provide.
5. ✕ deletes an **unused** option; the popover updates.
6. ✕ is **disabled** when a row in that block uses it, and tapping it reveals the reason with the count.
7. Deleting an option in block A does not touch block B's options with the same name (private lists).
8. Option changes persist (`persist()` → reload) and ride the task's sync.

**Task properties**
9. The task select picker shows a ✕ per option.
10. ✕ deletes an option no live task uses; `prop().options` shrinks and `updatedAt` advances.
11. ✕ is disabled when a live task uses it; the count is correct.
12. A task in the **tombstone** state does **not** count as a user (it is deleted).
13. **A note using that area counts as a user** — the ✕ for `Personal` is disabled when a note has
    `area:'Personal'`, and the reason mentions the note. *(This is the Phase 3 ↔ Phase 5 dependency.)*
14. `multi` properties: an option used inside a task's array counts.
15. `status` options obey the same rule.
16. Deleted options propagate: the props merge (`mergeProps` / `isNewer`) carries the shorter list.
17. No page errors.

### 5.6 Exit criteria

`t15` green · `t4` green (property visibility) · `t5` green · `t13` green (note areas) · full suite green · `sw.js` bumped.

---

## §6 — Phase 6: Sort + search inside blocks (point 5)

### 6.1 Goal

Clean up a big block visually: sort by a header, filter with a magnifier. **Nothing is stored.**

### 6.2 Design

- **Ephemeral, visual only** (confirmed: *"solo visual, es para limpiar la vista nada más"*).
  Never mutate `b.rows` / `b.items`; never persist; never sync. A module-level
  `const blkUI = new Map()` keyed by block id holds `{sort:{col,dir}, q:''}`.
  It must live **outside** `renderBlocks` so it survives the global re-render.
- **Do not hijack the header input.** The table/DB headers are `<input>`s used to rename the column.
  Clicking one must keep renaming. Sorting needs its **own small control** (a ▲/▼ button in the
  header cell). This is the main design trap of this phase.
- Sort cycles **asc → desc → none** (none restores the stored order).
- **Typed comparison for DB columns**, or the sort is a lie:
  `number` numerically (2 before 10, not "10" before "2"), `date` chronologically,
  `checkbox` false→true, `text`/`select` with `localeCompare`. Empty values sort last in both directions.
  The plain **table** block has text-only columns → `localeCompare`.
- **Magnifier**: a 🔍 toggle in `.blk-top` reveals a filter input; it filters rows (table/db) or items
  (todo) by substring, case-insensitive, across all columns. Clearing it restores everything.
  **To-do gets the magnifier only — no sorting** (confirmed).
- Rendering must derive a **view array**; every input keeps its `data-r`/`data-dbr` id so edits map
  back to the right row regardless of the displayed order. This is what makes visual sorting safe.
- The ✕ (delete row) while sorted must delete the row the user is pointing at, not the row at that index.

### 6.3 Acceptance tests — `tests/t16.js`

1. A table block header has a sort control that is **visible without hover** (Appendix A.6).
2. Clicking the header **input** still renames the column and does **not** sort.
3. Sort cycles asc → desc → none; none restores the original order.
4. **`b.rows` is unchanged after sorting** (compare a JSON snapshot of ids before/after) — the
   central guarantee of "visual only".
5. Sorting is **not persisted**: `persist()` → re-read from IndexedDB → stored order untouched.
6. Sorting does not bump `owner.updatedAt` and does not queue a sync (`M.pending` unchanged).
7. DB `number` column sorts numerically: `[2,10,1]` → `[1,2,10]`, not `[1,10,2]`.
8. DB `date` column sorts chronologically.
9. DB `checkbox` column sorts.
10. Empty cells sort last, both ascending and descending.
11. **Editing a cell while sorted writes to the correct row** (sort a 3-row table, edit the top
     visible row, assert the underlying row by id).
12. **Deleting a row while sorted deletes the right one.**
13. 🔍 filters rows by substring; clearing restores all.
14. 🔍 filters to-do items; the to-do block has **no** sort control.
15. Two blocks keep **independent** sort/search state.
16. Sort/search state survives a global `render()` (this is why `blkUI` lives outside).
17. Adding a row while a filter is active does not throw.
18. No page errors.

### 6.4 Exit criteria

`t16` green · `t5` green · full suite green · `sw.js` bumped.

---

## §7 — Phase 7: Integrity sweep & release

### 7.1 Data integrity (extend, do not rewrite, `t9`)

New surfaces to cover in `tests/t17.js`:
1. **Real upgrade path** (clone `t9c`): seed IndexedDB with the user's 108 real tasks, their
   customised views, filters, their Google client id and group calendar id, a live Drive session —
   **plus notes carrying areas**. Boot the new build. Assert: nothing lost, `pinnedViews` created,
   `D.version` bumped, migrations idempotent.
2. **Two devices**: `note.area` and `settings.pinnedViews` merge by `isNewer`; newer wins; an older
   remote never clobbers a newer local.
3. **Backup round trip**: export → wipe → import restores `note.area` and `pinnedViews`.
   (`importBackup` delegates to `mergeDocs`, so this should follow for free — prove it anyway.)
4. **Performance**: 2000 tasks + 200 notes spread across 5 areas; the grouped notes list must open in
   the same order of magnitude as before (jsdom budget: < 1.5 s). Record the numbers in the report.
5. **Calendar untouched**: `t1`/`t1b` still green; areas, blocks and sort state never enter `calSig`
   or `calEventBody`.

### 7.2 Release

1. Re-run **everything**: Gate A + every `t*` file. Report the total.
2. Bump `sw.js` `CACHE` one final time if any code changed in this phase.
3. Update `INSTRUCCIONES.md`: the two-section navigation, the icon table, the pinned views + `⋯ Más`,
   note areas, to-do typing, option deletion, block sort/search. Remove the «Nuevo» button from §8.
4. Update `CHANGELOG.md` (Spanish, user-facing, one entry per shipped version).
5. Hand the user a manual checklist for their real phone — the only thing the harness cannot prove:
   - [ ] Two labelled buttons, Tareas ↔ Notas, and a back button from a note to the list
   - [ ] To-do: caret lands next to the checkbox; Enter makes the next item; Enter on an empty one ends the list
   - [ ] The mobile keyboard's action key is no longer a useless "Siguiente"
   - [ ] Notes grouped by area; creating an area from a note offers it in a task too
   - [ ] DB select: tapping shows the options; ✕ removes an unused one and explains itself when in use
   - [ ] Sort by header and 🔍 in a table/DB; 🔍 in a to-do; all gone after a reload (by design)
   - [ ] Sync icon shows ✅/🏠/⌛/♻️/🔴 with no words; tapping explains it
   - [ ] No «Nuevo» button; tasks still creatable from table, calendar and board
   - [ ] Only 3 tabs; `⋯ Más` opens the rest; a temporary tab closes with ✕
   - [ ] Airplane mode: everything works; the icon goes ⌛ → ✅ on reconnect

---

## Appendix A — Invariants (violate these and the app breaks)

**A.1 — One file.** Everything lives in `app/index.html`: HTML + CSS + three `<script>` blocks.
Vanilla JS, no build step, no framework, no npm at runtime.

**A.2 — State and the save pipeline.**
`D = {version, props, tasks, notes, views, settings}` and `M = {lastSync, pending, driveOn,
driveFileId, lastError, calLast, calError, calRepair}`.
**Every mutation goes through `save(opts)`**, which bumps `M.pending`, schedules the Drive and
Calendar syncs, persists to IndexedDB and re-renders. Never write to IndexedDB directly.

**A.3 — `save({noRender:true})` for content edits.** A full `render()` rebuilds the DOM and rips the
focus out of whatever the user is typing in. Content edits (cell text, titles) use `noRender`;
structural changes (add/delete row, column, block) re-render. Phase 4 depends on `render()` being
synchronous so focus can be restored right after it.

**A.4 — Handlers are assigned (`el.onclick = ...`), never `addEventListener`.** The app re-renders
wholesale; `addEventListener` would stack duplicate handlers on every render. There is a test for
this (`t5` 6d) because it regressed once. `Escape` handlers inside editors must call
`e.stopPropagation()`, or the event bubbles to the global handler and closes the whole panel — a real
bug fixed in Phase 6 of the previous plan.

**A.5 — Sync is last-write-wins on `updatedAt` (ISO string) with `deletedAt` tombstones purged after
60 days.** Compare with `isNewer(a,b)` — never `>` directly. `'2026-…' > 0` coerces to `NaN > 0`,
which is **always false**; that bug silently blocked view/settings propagation between devices until
Phase 9 of the previous plan. Any new field you compare needs `isNewer`.

**A.6 — Assert visibility, not existence.** Two shipped bugs came from this: the calendar's
`＋ tarea` (`color:transparent` until `:hover`, i.e. invisible on a phone) and the notes back button
(a CSS selector that never matched). `t3` sweeps the whole stylesheet and fails if anything is hidden
behind `:hover`. When a phase adds a control, test that it is **visible at a 380px viewport**, that
it matches the selector that reveals it, and that clicking it does the thing.

**A.7 — `sw.js` must bump `const CACHE='tareas-vN'` on every deploy**, or the user's phone serves the
old app from cache forever.

**A.8 — Migrations: idempotent, non-destructive, deterministic.**
- Runnable twice with no effect; guarded by `D.version`.
- **Never strip unknown fields** — a newer device may have synced them.
- **Derive ids deterministically** from a stable parent id (`'n_of_'+t.id`), never `uid()`: two devices
  migrating independently must converge instead of duplicating.
- **Never touch `t.updatedAt`** in a migration; it would mark every task as freshly edited and fight
  the other device's real changes.

---

## Appendix B — Test harness

- **Gate A** — `node tests/gateA.js`: syntax of the three `<script>` blocks.
- **Gate B** — `tests/harness.js`: jsdom + fake-indexeddb. Exports `boot(opts)`, `resetDB()`,
  `ok/eq/summary`. Mocks Google Calendar faithfully (PUT replaces, PATCH merges *inside* `start`/`end`,
  and returns 400 when an `EventDateTime` ends up with both `date` and `dateTime`) and Drive.
- **Gate C** — `tests/regression.js`: 14 broad checks.

**Two hard-won harness rules:**
1. **`resetDB()` must run *before* `boot()`.** Deleting the database while the app holds it open
   blocks forever and the test hangs with no output.
2. **Two app instances in one process deadlock on IndexedDB.** Anything needing a second boot
   (migrations, upgrade paths, perf) goes in its **own test file** — hence `t1b`, `t4b`, `t8b/c`, `t9b/c`.

**Viewport testing:** jsdom does not do media queries by default. To test §A.6 assertions, either
assert the CSS rule and the DOM relationship the rule depends on (the `#nBack` bug would have been
caught by checking `nBack.closest('#nWrap')`), or drive `window.matchMedia` in the harness. State
which technique you used.

**A test bug looks exactly like a product bug.** In Phase 8 of the previous plan, the real-data
migration test reported "TEXT ALTERED" on all 6 notes; the app was correct and the *test* was
comparing against an object the app had already mutated. Before reporting a data-loss bug, verify your
test's own assumptions.

---

## Appendix C — Deviation protocol

If a requirement, once you are inside the code, turns out to contradict itself or another
requirement: **stop, implement nothing, and report** with the two options and a recommendation.

Precedent from the previous plan: its Phase 4 instructed a migration that would have made any
property holding data globally visible — which contradicted the user's requirement that *new* tasks
show only three properties. The correct move was to drop the migration, note it in the plan, and prove
the per-task rule covered the intent. **Do that again if you find the same shape of problem.**

Two things in this plan are assumptions rather than instructions, both flagged inline: keeping the
`N` shortcut (§2.3) and the disabled-✕-with-a-reason pattern (§5.4). If either proves wrong in
practice, they are small, isolated changes.

---

## Appendix D — Risk register

| Risk | Where | Mitigation |
|---|---|---|
| Removing the notes overlay breaks the `noteref` "ABRIR" chips | Phase 1 | `openNotes(id)` keeps its signature; `t8` must stay green |
| `t7` gets gutted while porting it off the modal | Phase 1 | Check count ≥36; justify any drop |
| Notes section hides the task drawer or vice versa | Phase 1 | Test both sections with a drawer open |
| The ✕ orphans a note's area because only tasks were counted | Phase 5 | Explicit test `t15`.13; Phase 3 must land first |
| Deleting a `status` option orphans tasks | Phase 5 | Same usage rule, tested |
| Visual sort silently reorders stored rows | Phase 6 | `t16`.4/5/6 assert the stored array and `M.pending` |
| Editing the wrong row while sorted | Phase 6 | Ids on every input; `t16`.11/12 |
| Sort control steals the rename input's click | Phase 6 | Separate control; `t16`.2 |
| Focus restore fails silently on mobile | Phase 4 | Assert `document.activeElement` and caret position |
| `pinnedViews` points at a deleted view | Phase 2 | Filter at render; `t12`.20 |
| Icon rules hide a dead Drive session | Phase 2 | ✅ vs 🏠 split; `t12`.4/5 |
| Forgetting the `sw.js` bump | every | Exit criteria of every phase |
