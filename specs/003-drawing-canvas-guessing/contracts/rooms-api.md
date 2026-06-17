# Contract: Rooms API (Phase 3 additions/changes)

Extends phase 2's contract (`specs/002-drawer-word-assignment/contracts/rooms-api.md`).
Only deltas are documented here.

## POST /rooms/:code/strokes (new)

Adds one finalized stroke to the active round's canvas. Drawer-only.

**Request**: `{ "participantId": string, "points": { "x": number, "y": number }[] }`

`points` MUST have at least 1 entry.

**Response 200**:
```json
{ "room": { "...": "full RoomSnapshot, as in GET /rooms/:code" } }
```

**Errors**:
- `400` — `points` missing/empty, or `participantId` missing: `{ "message": "..." }` (Zod-derived).
- `403` — caller is not the room's drawer: `{ "message": "Only the drawer can draw" }`.
- `404` — room not found: `{ "message": "Room not found" }`.
- `409` — room is not `active` (no round in progress): `{ "message": "Round is not active" }`.

## POST /rooms/:code/clear (new)

Clears the active round's canvas (`strokes` → `[]`). Drawer-only. Does not
affect `guesses` or any participant's `score`.

**Request**: `{ "participantId": string }`

**Response 200**: same shape as the strokes endpoint above.

**Errors**: same error set/shape as `POST /rooms/:code/strokes` (400 for
missing `participantId`, 403 not-drawer, 404 not-found, 409 not-active).

## POST /rooms/:code/guesses (new)

Submits a guess. Guesser-only (rejects the drawer). Trims and validates the
guess text, appends a `GuessEntry`, and — if the trimmed text matches the
room's secret word case-insensitively — increments the submitting
participant's `score` by `100`.

**Request**: `{ "participantId": string, "text": string }`

**Response 200**:
```json
{ "room": { "...": "full RoomSnapshot, as in GET /rooms/:code" } }
```

**Errors**:
- `400` — `text` is empty/whitespace-only after trimming, or
  `participantId` missing: `{ "message": "Guess is required" }` /
  Zod-derived message.
- `403` — caller is the room's drawer: `{ "message": "The drawer cannot submit guesses" }`.
- `403` — caller's `participantId` does not match any current participant
  of the room: `{ "message": "participantId is not a member of this room" }`
  (FR-009a — prevents a guess being recorded/scored against an identity
  that never joined the room).
- `404` — room not found: `{ "message": "Room not found" }`.
- `409` — room is not `active`: `{ "message": "Round is not active" }`.

## GET /rooms/:code (response shape changes — new fields, viewer-redacted)

Adds `strokes` (identical for every viewer) and `guesses` (redacted per
viewer per the Clarifications session), and adds `score` to every
participant entry (identical for every viewer — scores are never secret).

**Response 200**, viewer is the drawer or the guesser who submitted entry
`g2`, after one correct and one incorrect guess from two different
guessers:
```json
{
  "room": {
    "code": "AB3D",
    "status": "active",
    "participants": [
      { "id": "uuid-host", "name": "Alice", "joinedAt": "...", "isHost": true, "isDrawer": true, "score": 0 },
      { "id": "uuid-bob", "name": "Bob", "joinedAt": "...", "isHost": false, "isDrawer": false, "score": 100 },
      { "id": "uuid-cara", "name": "Cara", "joinedAt": "...", "isHost": false, "isDrawer": false, "score": 0 }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"],
    "canStart": true,
    "secretWord": "pizza",
    "strokes": [{ "points": [{ "x": 10, "y": 12 }, { "x": 14, "y": 16 }] }],
    "guesses": [
      { "id": "g1", "participantId": "uuid-bob", "correct": true, "text": "pizza" },
      { "id": "g2", "participantId": "uuid-cara", "correct": false, "text": "pasta" }
    ]
  }
}
```

**Response 200**, viewer is Bob (a different, non-drawer guesser than the
one who submitted `g2`), same instant:
```json
{
  "room": {
    "...": "unchanged fields omitted for brevity",
    "availableWords": [],
    "secretWord": "<omitted entirely>",
    "strokes": [{ "points": [{ "x": 10, "y": 12 }, { "x": 14, "y": 16 }] }],
    "guesses": [
      { "id": "g1", "participantId": "uuid-bob", "correct": true, "text": "pizza" },
      { "id": "g2", "participantId": "uuid-cara", "correct": false }
    ]
  }
}
```
Note `g1`'s `text` is present for Bob both because it's his own entry and
because it's `correct: true` (either reason alone would suffice); `g2`'s
`text` is omitted for Bob since it's neither his own entry, the drawer's
view, nor a correct entry — only `participantId` and `correct: false`
remain, per FR-018 / the Clarifications session decision.

`strokes` and every participant's `score` are identical across all three
viewers shown above — there is no redaction applied to either field.
