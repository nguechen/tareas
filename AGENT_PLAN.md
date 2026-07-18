# Agent Execution Plan — "Tareas" App (fixes + features)

> **STATUS: COMPLETED.** All 11 phases (0–10) executed with TDD. Final suite: **328 checks, 0 failures**
> (`regression` 14 · `t1` 15 · `t1b` 4 · `t2` 19 · `t3` 14 · `t4` 23 · `t4b` 15 · `t5` 34 · `t6` 47 ·
> `t7` 36 · `t8` 22 · `t8b` 13 · `t8c` 5 · `t9` 35 · `t9b` 10 · `t9c` 22). Shipped as `tareas-v14`.
> Deviations from this plan are annotated inline where they occur (see Phase 4).
> Real bugs found beyond the original 7 requirements: calendar PATCH/PUT merge (Phase 1),
> invisible touch affordances (Phase 3), dead `p.hidden` code (Phase 4), Escape closing the drawer
> (Phase 6), backup not restoring views/settings (Phase 9), and `NaN > 0` timestamp comparison
> silently blocking view/settings propagation between devices (Phase 9).


**Audience:** an autonomous AI coding agent.
**Deliverable:** a modified `index.html` (single-file app) + `sw.js`, all tests passing.
**Language of the product UI:** Spanish. **Language of code comments/docs:** Spanish (match existing style).

---

## 0. Context you must read before touching anything

### 0.1 What this project is
A personal Notion-style task manager. **Everything is one file: `index.html`** (~97 KB, HTML + CSS + 3 `<script>` blocks). Vanilla JS only, no build step, no framework, no bundler. It ships as a static PWA with `sw.js`, `manifest.json`, icons, plus `tareas-iniciales.json` (seed data).

### 0.2 Architecture invariants (do not break these)
| Invariant | Detail |
|---|---|
| Global state | `D` = document `{version, props, tasks, views, settings}`. `M` = meta `{lastSync, pending, driveOn, driveFileId, lastError, calLast, calError}` |
| Every mutation | goes through `save(opts)` → increments `M.pending`, schedules Drive sync + Calendar push, `persist()`s to IndexedDB, and calls `render()` |
| Persistence | IndexedDB `tareas-app` → store `kv` → keys `doc` / `meta`, debounced via `persist()` |
| Rendering | Full re-render: `render()` → `renderTabs() / renderToolbar() / renderMain() / renderDrawer()`. Handlers are attached with `el.onclick = …` (**assignment, not `addEventListener`**) precisely so full re-renders cannot stack duplicate listeners. **Keep this convention.** |
| Sync model | Last-write-wins per object using `updatedAt` (ISO string) + tombstones `deletedAt`. Anything new that syncs MUST carry `updatedAt`. |
| Popovers | Single shared `#pop` element via `openPop(html, anchor, onOpen)` / `closePop()`. Do not create ad-hoc floating divs. |
| Offline-first | Never make a network call a precondition for a local edit. |
| Cache | `sw.js` has `const CACHE = 'tareas-vN'`. **Bump N on every deployment** or users keep the stale app. |

### 0.3 Key existing functions (search by name)
`defaultDoc()`, `save()`, `persist()`, `setVal()`, `newTask()`, `delTask()`, `propValue()`, `cellHTML()`, `editCell()`, `optionMenu()`, `dateMenu()`, `renderTable()`, `renderCal()`, `renderBoard()`, `openDrawer()`, `renderDrawer()`, `addPropMenu()`, `propEditor()`, `viewTasks()`, `matchFilters()`, `openSettings()`, `doExport()`, `runImport()`, `mergeDocs()`, `syncNow()`, `pushCalendar()`, `calEventBody()`, `calUpsert()`, `calDelete()`, `dFetch()`, `boot()`.

### 0.4 Ground rules for the agent
1. **One phase at a time.** Do not start phase N+1 until phase N's exit criteria pass.
2. After every edit: run the syntax gate (§0.5) — a broken `<script>` block silently kills the whole app.
3. Never introduce a dependency, a build step, or `localStorage`.
4. Never rewrite the file wholesale. Make surgical, minimal edits.
5. Preserve backward compatibility of persisted data. Users have live data in IndexedDB and Google Drive. Any schema change needs a **guarded, idempotent migration** (§Appendix B).
6. If a requirement is ambiguous, implement the smallest reasonable version, note the assumption in the phase report, and continue.

### 0.5 Test harness (set up once, reuse in every phase)

```bash
cd /work && npm init -y && npm install jsdom fake-indexeddb
```

**Gate A — syntax (mandatory after every edit):**
```bash
node -e '
const re=require("fs").readFileSync("index.html","utf8");
const {execSync}=require("child_process");let i=0,ok=true;
for(const m of re.matchAll(/<script>([\s\S]*?)<\/script>/g)){
  require("fs").writeFileSync(`/tmp/b${i}.js`,m[1]);
  try{execSync(`node --check /tmp/b${i}.js`)}catch(e){ok=false;console.log("BLOCK",i,String(e.stderr).slice(0,400))}
  i++;}
console.log(ok?"SYNTAX OK":"SYNTAX FAIL");'
```

**Gate B — boot harness (`harness.js`, reused by all phase tests):**
```js
const fs=require('fs'), {JSDOM}=require('jsdom'); require('fake-indexeddb/auto');
function boot({calls=[], calendar={events:{},seq:0}, fetchImpl=null}={}){
  const html=fs.readFileSync('index.html','utf8');
  const mock=(url,opts={})=>{
    const m=(opts.method||'GET').toUpperCase();
    calls.push({m,url:String(url),body:opts.body?JSON.parse(opts.body):null});
    if(/gsi\/client/.test(url)) return Promise.resolve({ok:true});
    if(/calendar\/v3/.test(url)){
      const id=/events\/([^/?]+)/.exec(url)?.[1];
      if(m==='POST'){const nid='ev'+(++calendar.seq);calendar.events[nid]=JSON.parse(opts.body);
        return Promise.resolve({ok:true,status:200,clone(){return this},json:async()=>({id:nid})});}
      if(m==='PUT'||m==='PATCH'){ if(!calendar.events[id]) return Promise.resolve({ok:false,status:404,clone(){return this},json:async()=>({error:{message:'Not Found'}})});
        calendar.events[id]= m==='PUT' ? JSON.parse(opts.body) : Object.assign({},calendar.events[id],JSON.parse(opts.body));
        return Promise.resolve({ok:true,status:200,clone(){return this},json:async()=>({id})});}
      if(m==='DELETE'){delete calendar.events[id];return Promise.resolve({ok:true,status:204,clone(){return this},json:async()=>({})});}
    }
    return Promise.resolve({ok:true,status:200,clone(){return this},json:async()=>({})});
  };
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ex.com/',beforeParse(w){
    w.indexedDB=indexedDB; w.IDBKeyRange=IDBKeyRange;
    w.fetch=(u,o)=>(fetchImpl||mock)(String(u),o);
    w.confirm=()=>true; w.prompt=()=>'x';
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    try{Object.defineProperty(w.navigator,'onLine',{value:true,configurable:true})}catch(_){}
    w.google={accounts:{oauth2:{initTokenClient:cfg=>({requestAccessToken:()=>cfg.callback({access_token:'FAKE'})})}}};
  }});
  dom.window.addEventListener('error',e=>console.log('PAGE ERROR:',e.message));
  return {w:dom.window,d:dom.window.document,calls,calendar,
          sleep:ms=>new Promise(r=>setTimeout(r,ms))};
}
module.exports={boot};
```
> Note: jsdom does not lay out pixels. Anything visual (auto-grow height, caret position, wrapping) must be asserted **structurally** (element type, attributes, class, event wiring) in automated tests, and confirmed once in the manual checklist.

**Gate C — regression suite (`regression.js`).** Build it in Phase 0 and re-run it at the end of **every** phase:
- app boots with no `PAGE ERROR`
- all 9 default views render; tab switch works
- create task → appears in table; edit title persists
- calendar view renders 42 day cells; quick-add opens drawer with date prefilled
- board renders columns; settings modal opens
- export JSON produces parseable payload

---

## 1. Phase order and why

| # | Phase | Why here |
|---|---|---|
| 0 | Baseline & harness | Nothing is verifiable until tests exist. |
| 1 | Calendar time/description fix | **P0 bug**, corrupting real user calendars right now. Isolated, no schema change. Ship first. |
| 2 | Text-input UX (caret at end, auto-grow description) | Isolated, low risk, touches `editCell()` which later phases also touch — do it before those phases build on it. |
| 3 | "ABRIR" button always visible | Trivial CSS; independent quick win. |
| 4 | Default property visibility + "Añadir/mostrar propiedad" | Reworks the drawer + `addPropMenu()`. Must land **before** blocks/notes add new UI to the same drawer. |
| 5 | Shared block engine (table / database / to-do) + "Añadir elemento" in tasks | Notes reuse this engine — build it once, prove it inside tasks first (tasks already sync, so no new sync surface). |
| 6 | Markdown renderer/editor | Needed by Notes; self-contained; testable in isolation. |
| 7 | Notes section (button, CRUD, blocks + markdown) + sync | Depends on 5 + 6. Introduces the only new top-level collection → sync/export must land with it. |
| 8 | Task ↔ Note linking (`notes` property, create/open, visible open button) | Depends on 7 existing. Includes data migration of old text notes. |
| 9 | Data integrity: migration, Drive merge, export/import, backup | Final verification of everything phases 5–8 persisted. |
| 10 | Full regression + release | SW bump, docs, deploy notes. |

---

## Phase 0 — Baseline & harness

**Objective:** reproducible test environment and a green baseline before any change.

**Steps**
1. Copy the current `index.html`, `sw.js`, `manifest.json`, icons, `tareas-iniciales.json` into the work dir. Snapshot as `index.baseline.html`.
2. Install deps (§0.5), write `harness.js` and `regression.js`.
3. Run Gate A + Gate C on the **unmodified** file.

**Exit criteria**
- [ ] `SYNTAX OK`
- [ ] Regression suite green on baseline (record the output as the reference).
- [ ] `git init && git commit` (or equivalent snapshot) so every phase is revertible.

---

## Phase 1 — Fix Google Calendar: timed events + descriptions

### 1.1 Reported symptoms
- Task with a time → event is **always all-day** in Google Calendar.
- Descriptions **never appear**.
- Deleting from the app **does** delete the event (works).
- Removing the time behaves as expected (works).

### 1.2 Root cause (already diagnosed — do not re-litigate, verify then fix)
The app stores and serializes correctly. Verified locally:
```
t.v.date = "2026-07-15T14:30"
calEventBody(t) = {"summary":"…","description":"…","start":{"dateTime":"2026-07-15T14:30:00-04:00"}, "end":{…}}
```
The failure is in **transport**. `calUpsert()` uses **HTTP PATCH**. Google Calendar's PATCH is a *merge*: for an event that already exists as all-day, its stored `start` is `{date:"2026-07-20"}`. Sending `start:{dateTime:…}` merges into `{date:"2026-07-20", dateTime:"…"}`, which the API rejects (`400 — cannot specify both date and dateTime`). **The whole PATCH fails, so the description never lands either** — which is exactly why both symptoms appear together, while delete and "remove the time" (all-day → all-day, no conflict) keep working.

This scenario is guaranteed for this user: the tasks were imported from Notion as date-only, so **every** event was created all-day first.

### 1.3 Fix
1. In `calUpsert()`, replace `PATCH` with **`PUT`** (full replace). The app is the sole owner of these events (one-way sync), so a full replace is correct and immune to merge semantics.
2. Defensive belt-and-braces in `calEventBody()`: explicitly null the unused variant.
   ```js
   if(dv.length>10){ const s=new Date(dv), e=new Date(s.getTime()+3600000);
     body.start={dateTime:isoLocal(s), date:null};
     body.end  ={dateTime:isoLocal(e), date:null};
   } else {
     body.start={date:dv,             dateTime:null};
     body.end  ={date:addDays(dv,1),  dateTime:null};
   }
   ```
3. Add `timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone` to timed `start`/`end`.
4. Keep the existing 404/410 → recreate fallback (`/\b(404|410)\b/`) working with PUT.
5. **Repair pass for already-broken events:** these events currently hold a stale `gcalSig`, so they'd be skipped. Add a one-time `M.calRepair` flag: on first push after this update, clear `gcalSig` on every live task so all events are rewritten once with correct bodies. Guard it so it runs exactly once.
6. Default event duration is 1 h; keep it, but read `D.settings.calDurationMin` (default 60) so it is tweakable later.

### 1.4 Tests
**Automated (`t1.js`)** — using the harness's mocked Calendar:
1. `PUT not PATCH`: create task with `date:'2026-07-20'`, push → assert POST body has `start.date`. Then set `v.date='2026-07-20T09:15'`, `touch`, push → assert the request method is **`PUT`**, and `calendar.events[id].start.dateTime` is present and `start.date` is null/absent.
2. `description lands`: assert `calendar.events[id].description` contains the task's `desc` text.
3. `timed → all-day round trip`: remove the time → assert `start.date` present, `start.dateTime` null/absent.
4. `timeZone present` on timed events.
5. `no duplicates`: 3 consecutive edits → exactly 1 event id, POST called once.
6. `unchanged task is skipped`: push twice → second push issues 0 calendar writes (`gcalSig` short-circuit).
7. `repair pass runs once`: with 2 tasks already carrying `gcalId`+`gcalSig`, first push after upgrade rewrites both (2 PUTs); second push issues 0 writes.
8. `404 recreate`: delete the event from the mock backend, push → falls back to POST and stores the new id.
9. `delete still works`: `delTask` → push → event gone.

**Manual (real account, do this once before shipping)**
- [ ] Existing all-day event + add a time in the app → within ~10 s the Google event shows the correct start/end time.
- [ ] Description shows the task's description.
- [ ] Settings → Google Calendar status line shows no error.

**Exit criteria:** all of `t1.js` green + Gate A + Gate C + the manual checklist. Then commit.

---

## Phase 2 — Text input UX

### 2.1 Requirements
1. Tapping/clicking a text field must **place the caret at the end**, not select all the text.
2. Task **description** must be an **auto-growing textarea**: wraps, grows one line at a time, shows the whole content without horizontal scrolling.

### 2.2 Scope
- `editCell(el,t,p)` — currently does `inp.focus(); inp.select();` → remove `select()`; set caret to end:
  ```js
  inp.focus();
  const L=inp.value.length; try{inp.setSelectionRange(L,L)}catch(_){}
  ```
  (`setSelectionRange` throws on `type="number"` in some engines — keep the try/catch.)
- Any other `.select()` call in the file (grep it) — apply the same treatment.
- For `p.type==='text'` render a `<textarea>` instead of `<input>`:
  - `white-space:pre-wrap; overflow-wrap:anywhere; resize:none; overflow:hidden;`
  - auto-grow: `const grow=()=>{ta.style.height='auto';ta.style.height=ta.scrollHeight+'px';}` on `input` and once on mount.
  - **Enter inserts a newline; commit on blur; Escape cancels; Ctrl/Cmd+Enter commits.** (Do not commit on plain Enter for textareas — that contradicts multi-line.)
  - The drawer's `.dval` cell must not clip: remove `white-space:nowrap`/`text-overflow:ellipsis` for multi-line text in the drawer context (add a `.cell.multi` class rather than changing `.cell` globally — the **table** must keep single-line ellipsis).
- Read-only display of long text in the drawer must also wrap (same `.cell.multi`).

### 2.3 Tests (`t2.js`)
1. Open drawer → click description cell → assert the created element is a `TEXTAREA`, not `INPUT`.
2. Assert `selectionStart === selectionEnd === value.length` right after focus (caret at end, nothing selected) for: title cell, text cell, url cell.
3. Type a multi-line value, blur → assert `t.v.desc` contains `\n` and re-renders correctly.
4. Assert `Escape` cancels (value unchanged), `blur` commits.
5. Assert auto-grow handler is wired: dispatch `input` → `style.height` was assigned (jsdom returns 0 for `scrollHeight`; assert the property was **set**, not its numeric value).
6. Table view still renders single-line cells (class `.cell` without `multi`) — no layout regression.

**Manual:** [ ] On a phone, a 3-line description is fully readable in the drawer with no horizontal scroll; the box grows as you type.

**Exit criteria:** t2 green + Gate A + Gate C.

---

## Phase 3 — "ABRIR" button always visible

### 3.1 Requirement
The per-row open button must always be visible (today it is `opacity:0` until row hover — unusable on touch).

### 3.2 Scope
- CSS `.openb{opacity:0}` + `tr:hover .openb{opacity:1}` → make it always `opacity:1`. Keep a subtle style so it does not shout: e.g. always visible at `opacity:.75`, `1` on hover/focus.
- Verify it does not overlap the title on narrow screens: the title cell is `display:flex` with a `.spacer`; ensure `.openb{flex:none}` and the title `.txt` keeps `text-overflow:ellipsis`.
- Same treatment anywhere else a hover-only affordance blocks touch users (grep `opacity:0`).

### 3.3 Tests (`t3.js`)
1. Render table → for every `tr.trow`, assert `.openb` exists and its computed inline/class state is not the hidden variant (assert the CSS rule no longer contains `.openb{opacity:0}` via a source-level check + the element is present).
2. Click `.openb` on a row → drawer opens with that task id.
3. Long title (120 chars) → title span still has ellipsis class/style and `.openb` still present.

**Manual:** [ ] On a phone, the open button is visible on every row without hovering.

**Exit criteria:** t3 green + Gate A + Gate C.

---

## Phase 4 — Default property visibility + "Añadir/mostrar propiedad"

### 4.1 Requirements
1. **Task page (drawer) shows by default only:** `Fecha`, `Status`, `Descripción`.
2. Every other property is hidden **until the user turns it on**.
3. The drawer button is renamed **"Añadir/mostrar propiedad"** and manages both things (add new + show/hide existing) from one place, using **open/closed eye icons** (👁 / 🚫👁 or `👁`/`👁‍🗨` — pick one pair and use it consistently).
4. **Tasks that already have a value for a property keep showing it**, even if that property is globally hidden. Only *new/empty* ones follow the default.

### 4.2 Design
- Add `settings.defaultVisibleProps = ['date','status','desc']` in `defaultDoc()`.
- Property visibility source of truth for the drawer:
  ```js
  function drawerProps(t){
    return D.props.filter(p=>p.type!=='title' && (
      D.settings.defaultVisibleProps.includes(p.id) ||   // default-on
      p.drawerShow === true ||                            // user turned it on globally
      hasValue(t,p)                                       // this task already has data → keep visible
    ));
  }
  function hasValue(t,p){ const v=propValue(t,p);
    return Array.isArray(v)? v.length>0 : (v!==undefined && v!==null && v!=='' ); }
  ```
  Computed properties (`created`, `edited`, `formula`) always have a value → they'd always show. **Exclude those from `hasValue`**: treat them as user-controlled only (`p.drawerShow`).
- `renderDrawer()` uses `drawerProps(t)` instead of all props.
- Rework `addPropMenu(anchor, v)` → `addShowPropMenu(anchor, ctx)`:
  - Section **"Propiedades"**: every property with an eye toggle (open = shown, closed = hidden). Toggling sets `p.drawerShow` + `p.updatedAt=nowISO()` and `save()`.
  - Section **"Nueva propiedad"**: unchanged type list.
  - When invoked from the table header `＋`, keep the current per-view column behavior (`v.cols`) — **do not merge the two concepts**; the drawer toggles `drawerShow`, the table toggles `v.cols`. Label the drawer button "Añadir/mostrar propiedad".
- Migration (`Appendix B`, `docVersion 2`): fill in `settings.defaultVisibleProps` / `calDurationMin` for existing docs and bump `D.version`.
  > **DEVIATION (decided during execution, Phase 4).** The original plan said: *"set `drawerShow=true` on any property that is currently non-default and has a value in ≥1 task, so nothing visually disappears on upgrade."* **This was dropped — it contradicts the requirement.** Making a property globally visible because *some* task uses it would also show it on new, empty tasks, breaking *"las nuevas tareas solo tendrán por defecto las mencionadas"*. The per-task `hasValue()` rule already delivers *"las tareas que ya tienen esas propiedades asignadas dejarlas visibles"* with no migration at all, and no data can ever be hidden. Verified by `t4b` (3a/3b/3c).

### 4.3 Tests (`t4.js`)
1. Fresh doc → new task → `renderDrawer` shows exactly 3 property rows: Fecha, Status, Descripción.
2. Task with `prio:'Alta'` (a non-default prop with a value) → drawer shows 4 rows including Prioridad.
3. Toggle `Contexto` eye ON in the menu → drawer shows it for **all** tasks, persists after `render()`, and `p.updatedAt` changed.
4. Toggle it OFF → hidden again **except** on tasks that have a Contexto value.
5. Button label is exactly `Añadir/mostrar propiedad`.
6. Eye state matches: shown → open-eye glyph/class; hidden → closed-eye glyph/class.
7. Creating a new property from the menu still works and appears immediately.
8. Table view columns are unaffected by drawer toggles (regression).
9. Migration: load a v1 doc where 5 tasks have `prio` → after boot, `prop('prio').drawerShow===true`; a property with no values anywhere stays hidden; migration is idempotent (run boot twice).

**Exit criteria:** t4 green + Gate A + Gate C.

---

## Phase 5 — Shared block engine + "Añadir elemento" in tasks

### 5.1 Requirements
On the task page, below "Añadir/mostrar propiedad", an **"Añadir elemento"** option that inserts one of three Notion-like blocks: **tabla**, **base de datos**, **to-do list**. Multiple blocks per task, any combination.

### 5.2 Data model (see Appendix A for full schema)
Blocks live on the owner object: `task.blocks = [Block]`, and later `note.blocks = [Block]`.
```js
Block = { id, type:'table'|'db'|'todo'|'md', updatedAt, ...payload }
```
- `table`: `{cols:[{id,name}], rows:[{id, cells:{colId:string}}]}` — plain text grid.
- `db`: `{props:[{id,name,type,options?}], rows:[{id, v:{propId:value}}]}` — simple database: types limited to `text|number|select|checkbox|date`. **Reuse `cellHTML`/`editCell` semantics where possible, but with a block-local prop list** (do not touch `D.props`).
- `todo`: `{items:[{id,text,done}]}`.

### 5.3 Implementation notes
- Build a self-contained module: `renderBlocks(container, owner)` + `blockMenu(anchor, owner)` + per-type renderers. It must not assume "task" — take an `owner` object with `.blocks` and an `onChange` callback so Notes can reuse it verbatim in Phase 7.
- All mutations: mutate the block, `owner.updatedAt=nowISO()`, then `save()`.
- Blocks inside `task` ride the existing task sync for free (task is already an LWW unit). **No sync changes needed in this phase.**
- Keep it minimal but usable: add/rename/delete column, add/delete row, inline edit, drag not required (explicitly out of scope for v1 — note it).
- Guard: `task.blocks` may be `undefined` on old data → always `owner.blocks = owner.blocks || []`.

### 5.4 Tests (`t5.js`)
1. Drawer shows "Añadir elemento" under "Añadir/mostrar propiedad".
2. Click → menu lists exactly: Tabla, Base de datos, To-do list.
3. Insert each type → `task.blocks.length` grows; each block has unique `id`, correct `type`, `updatedAt`.
4. Table block: add column, add row, edit a cell → value in `task.blocks[i].rows[0].cells[colId]`; persists across `render()`.
5. DB block: add a `select` prop with 2 options, set a row value → stored under `rows[0].v[propId]`; **`D.props` untouched** (assert length unchanged).
6. Todo block: add 2 items, tick one → `items[0].done===true`; ticking re-renders without duplicating listeners (click twice → toggles twice, not 4×).
7. Delete a block → removed from array; drawer re-renders.
8. Reopen the drawer for another task → blocks are per-task (no leakage).
9. Old task without `blocks` → drawer renders with no error.
10. Persistence: `persist()` → reload doc from IDB → blocks intact.

**Exit criteria:** t5 green + Gate A + Gate C.

---

## Phase 6 — Markdown support

### 6.1 Requirement
Notes support Markdown.

### 6.2 Implementation
- Write a **small, safe** renderer `mdToHtml(src)` (no dependency). Support: headings `#`–`######`, bold, italic, inline code, code fences, links, unordered/ordered lists, blockquote, `---`, line breaks, and pipe tables.
- **Security is mandatory:** escape HTML first (reuse `esc()`), then apply Markdown transforms on the escaped string. Never `innerHTML` raw user text. For links, only allow `http:`, `https:`, `mailto:` (drop `javascript:`).
- Edit model: a `md` block = textarea (reuse the Phase 2 auto-grow) that renders to HTML on blur, back to raw source on click (Notion-ish toggle). Keep it simple and predictable.

### 6.3 Tests (`t6.js`)
Unit-test `mdToHtml` directly (no DOM needed):
1. `# T` → `<h1>T</h1>`; `**b**` → `<strong>`; `*i*` → `<em>`; `` `c` `` → `<code>`.
2. Lists (`- a`, `1. a`) → `<ul>/<ol>` with `<li>`.
3. Fenced code preserves inner characters and does not interpret Markdown inside.
4. Pipe table → `<table>` with correct row/col count.
5. **XSS:** `<img src=x onerror=alert(1)>` renders **escaped** (no live tag). `[x](javascript:alert(1))` → link dropped/neutralized. `<script>` never emitted.
6. Round-trip: edit → blur → renders; click → shows original source unchanged (byte-for-byte).

**Exit criteria:** t6 green (including every XSS case) + Gate A + Gate C.

---

## Phase 7 — Notes section

### 7.1 Requirements
- A **Notes button** in the header, **next to the sync chip**.
- Notes support Markdown + tables + simple database + to-do list (reuse Phase 5/6).
- Full CRUD, offline-first, synced.

### 7.2 Data model
```js
D.notes = [{ id:'n_x', title:'', blocks:[Block], createdAt, updatedAt, deletedAt? }]
```
- Helpers mirroring tasks: `note(id)`, `liveNotes()`, `newNote(vals)`, `delNote(n)` (tombstone).
- UI: a Notes overlay/panel — list on the left (search + `＋ Nueva nota`), editor on the right (title input + `renderBlocks`). On mobile it must be usable full-width (list → editor navigation).
- Reuse `openPop`, `.overlay/.modal` styles, and the `save()` pipeline. Reuse the block engine as-is.

### 7.3 Sync/export integration (must ship in this phase)
1. `syncNow()` payload: add `notes:D.notes`.
2. `mergeDocs(remote)`: merge `remote.notes` with the same LWW-by-`updatedAt` + tombstone rules as tasks; purge `deletedAt` older than 60 days.
3. `doExport('json')`: include `notes: liveNotes()`.
4. Import of an own-format backup (`format:'tareas-app'`): merge notes the same way.
5. `boot()` migration: `D.notes = D.notes || []`.

### 7.4 Tests (`t7.js`)
1. Header has a Notes button **immediately after `#syncChip`** in DOM order.
2. Click → panel opens; `＋ Nueva nota` creates a note; typing a title persists to `D.notes[0].title` and `updatedAt` changes.
3. Insert one of each block type into a note → stored under `note.blocks`; edits persist across `render()`.
4. Markdown block inside a note renders (reuse t6 assertions at integration level).
5. Delete note → tombstoned (`deletedAt` set), disappears from list, `liveNotes()` excludes it.
6. Search filters the note list by title and body text.
7. **Sync:** with mocked Drive, `syncNow()` → uploaded payload contains `notes`; a remote note with newer `updatedAt` wins; a remote tombstone deletes locally; a local-only note is preserved (not wiped by merge).
8. **Export/import:** export JSON → contains notes; wipe → import → notes restored with ids/blocks intact; importing twice does not duplicate.
9. Offline: `navigator.onLine=false` → create/edit note works, `M.pending` increments.

**Exit criteria:** t7 green + Gate A + Gate C.

---

## Phase 8 — Task ↔ Note linking

### 8.1 Requirements
- The task's **`notes` property** can *call* notes: link an existing one, **create** a new one from there, and **open** it from there.
- The **open button must be visible** (not hover-only).

### 8.2 Design
- New property type `noteref` in `TYPES` (`{n:'Notas', ic:'🗒'}`), value = **array of note ids** (`[]`).
- `cellHTML` for `noteref`: chips with each note's title + a persistent **`ABRIR`** button per chip (same always-visible treatment as Phase 3).
- `editCell` for `noteref` → popover with: search existing notes, `＋ Crear nota "<query>"` (creates and links in one step), toggle link/unlink, and `Abrir` per item.
- Opening from a task opens the Notes panel focused on that note; closing returns to the task drawer (keep a `returnTo` state).
- Deleting a note must not leave dangling refs: when rendering, drop ids whose note is missing/tombstoned (render-time filter, do **not** mutate during render — clean lazily on next save).

### 8.3 Migration (docVersion 3)
The existing `notes` property is `type:'text'` and may hold real text for some tasks.
- For each task with a non-empty `notes` string: create a Note titled with the task name (truncated), body = one `md` block containing the text; set `task.v.notes=[noteId]`.
- Then switch `prop('notes').type='noteref'`.
- Idempotent + guarded by `D.version`. **Never lose the original text** (test asserts byte-equality of the migrated body).

### 8.4 Tests (`t8.js`)
1. `notes` property renders as chips; empty → shows the add affordance.
2. Create-from-task: type a title → creates note in `D.notes` **and** links its id into `t.v.notes`.
3. Link an existing note; unlink it → `t.v.notes` array updates; property empty → value removed (per `setVal` semantics).
4. Open button is present without hover and opens the Notes panel on the right note.
5. Two tasks can link the same note (no duplication of the note object).
6. Tombstoned note → chip disappears from the task, no console error.
7. **Migration:** doc with `notes:'texto largo\ncon saltos'` on 3 tasks → after boot: 3 notes exist, bodies byte-identical, `t.v.notes` is `[id]`, `prop('notes').type==='noteref'`; running boot again changes nothing (idempotent).
8. Export → import round-trip keeps task↔note links resolvable.

**Exit criteria:** t8 green + Gate A + Gate C.

---

## Phase 9 — Data integrity sweep

**Objective:** prove nothing from phases 4–8 breaks real users' data or multi-device sync.

**Tests (`t9.js`)**
1. **Upgrade path:** boot with a realistic v1 doc (the 108 seeded tasks + customized views + a hidden property) → no errors; all 108 tasks intact; views/order/filters preserved; migrations applied once (`D.version` bumped).
2. **Two-device merge:** simulate device A adds note + block, device B edits the same task's title; run merge both directions → both changes survive; no object lost; no duplicate ids.
3. **Conflict:** same note edited on both, different `updatedAt` → newer wins, older discarded, no crash.
4. **Tombstone purge:** a 90-day-old deleted note/task is purged; a 10-day-old one is retained.
5. **Backup:** export JSON → `Borrar todo` → import → tasks, notes, blocks, props, views, settings all restored.
6. **Calendar unaffected:** after all changes, Phase 1's `t1.js` still passes (blocks/notes must not enter `calEventBody` or `calSig`).
7. **Size/perf:** 2 000 tasks + 200 notes → boot < 2 s in the harness, `render()` of the table < 300 ms; no unbounded loops.

**Exit criteria:** t9 green + all previous phase suites re-run green.

---

## Phase 10 — Release

1. Re-run **every** suite: `t1 … t9` + Gate A + Gate C.
2. **Bump `sw.js`:** `const CACHE = 'tareas-v6';` (next integer above current `v5`).
3. Update `INSTRUCCIONES.md`: new Notes section, "Añadir/mostrar propiedad", "Añadir elemento", property-visibility defaults, and a one-line note that the Calendar timed-event bug is fixed and events are rewritten once automatically.
4. Produce a short `CHANGELOG.md` (user-facing, Spanish).
5. Deliver `index.html`, `sw.js`, `manifest.json`, icons, `tareas-iniciales.json`, docs, and a zip.
6. **Deployment note for the user:** upload files, then close and reopen the app twice (or hard-reload) so the new service worker takes over.

**Final manual smoke (real device, real account)**
- [ ] Timed task → correct timed event with description in Google Calendar.
- [ ] Caret lands at end; description grows and wraps.
- [ ] ABRIR visible on every row without hover.
- [ ] New task shows only Fecha/Status/Descripción; a task with Prioridad still shows it.
- [ ] "Añadir elemento" inserts a table / database / to-do list and they survive a reload.
- [ ] Notes button next to the sync chip; markdown + blocks work; note reachable from a task's Notas property with a visible open button.
- [ ] Everything above still works offline; sync goes 🟡 → 🟢 when back online.

---

## Appendix A — Schemas (target state)

```js
D = {
  version: 3,                       // bumped by migrations
  props:  [ Prop ],                 // Prop.drawerShow?: boolean   (Phase 4)
  tasks:  [ Task ],                 // Task.blocks?: [Block]       (Phase 5)
                                    // Task.gcalId?, Task.gcalSig? (calendar)
  notes:  [ Note ],                 // NEW                         (Phase 7)
  views:  [ View ],
  settings: {
    theme, accent, clientId, autoSync,
    calSync, calId, calDurationMin,          // calendar
    defaultVisibleProps: ['date','status','desc'],   // Phase 4
    updatedAt
  }
}

Note  = { id, title, blocks:[Block], createdAt, updatedAt, deletedAt? }
Block = { id, type:'md'|'table'|'db'|'todo', updatedAt,
          text?,                                   // md
          cols?:[{id,name}], rows?:[{id,cells:{}}],// table
          props?:[{id,name,type,options?}],        // db  (rows:[{id,v:{}}])
          items?:[{id,text,done}] }                // todo
```
**Rule:** every syncable object carries `updatedAt`; deletions are tombstones (`deletedAt`), never splices, for anything that syncs (tasks, notes). Blocks are *inside* their owner and do not need independent tombstones.

## Appendix B — Migration framework

Implement once, in `boot()`, right after the doc is loaded and before `render()`:
```js
function migrate(){
  const from = D.version || 1;
  if(from < 2){ /* Phase 4: set drawerShow on props that have data */ }
  if(from < 3){ /* Phase 8: notes text -> Note objects, prop type -> noteref */ }
  D.notes = D.notes || [];
  D.tasks.forEach(t => { t.blocks = t.blocks || []; });
  if((D.version||1) < 3){ D.version = 3; persist(); }
}
```
Rules: **idempotent** (safe to run twice), **non-destructive** (never drop unknown fields — a newer device may sync fields this build doesn't know), and always covered by a test that runs `boot()` twice.

## Appendix C — Risk register

| Risk | Mitigation |
|---|---|
| Calendar repair pass rewrites hundreds of events → rate limit | Keep the existing 120 ms pacing + stop-after-4-errors guard; run the repair once via `M.calRepair`. |
| Migration corrupts real data | Snapshot test with the real 108-task seed; idempotency test; instruct the user to export a JSON backup before upgrading. |
| Drawer becomes crowded (props + blocks + notes) | Blocks render **below** all properties, separated; collapsed by default if >3 blocks. |
| Markdown XSS | Escape-first renderer + explicit XSS test cases; scheme allowlist for links. |
| Duplicate event listeners after re-render | Keep `el.onX=` assignment convention; test "click twice → toggles twice, not four times". |
| Stale service worker hides the update | Bump `CACHE` in Phase 10 and document the double-open step. |
| Scope creep in the block engine | v1 excludes drag-reorder, formulas, filters inside blocks. Document as future work. |
