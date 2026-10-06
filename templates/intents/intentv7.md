# AI Suggestion Box — V7 Intent

Builds on [intentv1.md](intentv1.md), [INTENT.md](INTENT.md), and [intentv2.md](intentv2.md) to [intentv6.md](intentv6.md). Everything in those stays as built unless this file says otherwise.

This is a prototype of the approval step. It is meant to show the rule working, not to be real access control.

Status: implemented. The **As Built** section at the end records the decisions the implementation made.

## 1. Intent / Goal

Put an **approval gate** in front of Investment: an idea cannot move from Pilot to Investment until an admin has approved it, and the approver cannot be the person who submitted it.

Investment is where money is committed. The evidence gate checks whether the evidence is strong enough; the approval gate checks that someone accountable, other than the idea's owner, has said yes.

## 2. Inputs / Context

### Current state

- An idea moves one stage at a time. Every forward move is checked by the evidence gate, and a reviewer can move anyway with a reason.
- There is no sign-in. Anyone using the workbench can move any idea. An idea's submitter is known only as the browser it was submitted from.
- Earlier intents ruled out authentication, roles, and approvals.

### What V7 relaxes

| Earlier constraint | V7 position |
| --- | --- |
| No authentication or roles | One role, admin, reached by signing in with a shared passcode |
| No approvals | One approval, required before Investment |
| The gate never blocks a person outright | Still true of the evidence gate. The approval gate does block: there is no "move anyway" past it |

Everything else stays: no user accounts, no per-person passwords, no approval routing or chains, no notifications.

### Runtime inputs

- An admin's name and the shared admin passcode, to sign in.
- An admin's decision to approve an idea that is at Pilot.

## 3. Outputs

### Admin sign-in

- The workbench has an "Admin sign-in" control. Signing in takes a name and the admin passcode.
- The passcode is set by whoever runs the workbench, outside the code. With none set, admin sign-in is unavailable and says so.
- While signed in, the workbench shows who is signed in as admin and offers sign-out.
- Being signed in lasts for the browser session and ends when the workbench restarts.
- Everything that worked without sign-in still works without it. Admin sign-in adds one ability: approving.

### The approval

- An idea at Pilot shows an **Investment approval** section with its status and an "Approve for Investment" button. The button is visible to everyone, so the step is visible in the process.
- Pressing it has one of three results:
  - **Not signed in as admin:** nothing is approved, and a message says only admins can approve.
  - **Signed in as admin, in the browser the idea was submitted from:** nothing is approved, and a message says the approver cannot be the same person as the submitter.
  - **Signed in as admin, from a different browser:** the idea is approved, and the approver's name and the time are recorded on it.
- These messages appear as a brief pop-up message on the page.
- Approval is given once. An approved idea shows who approved it and when.

### The gate

- An idea cannot move from Pilot to Investment without an approval. The attempt is refused with a message saying admin approval is needed, before the evidence check is run.
- There is no override. The evidence gate's "move anyway" does not get past a missing approval.
- With an approval in place, the move goes through the evidence gate as usual.
- Moving an idea back, from Pilot or from Investment, clears its approval. It must be approved again to return to Investment.

### In the process

- The pipeline picture marks Investment as needing admin approval, on every screen that shows it.
- On an idea's own pipeline, the marker shows whether approval is still needed or has been given.
- On the Review Pipeline board, ideas at Pilot show whether they are awaiting approval or approved.

## 4. Success Criteria

A person demonstrating the workbench can:

1. See, on any idea at Pilot, that Investment needs an approval and that there is a button for it.
2. Press the button without being an admin and be told only admins can approve.
3. Sign in as admin, press it on an idea they submitted themselves, and be told the approver cannot be the same person as the submitter.
4. Try to move an unapproved idea to Investment and be refused.
5. Sign in as admin in a different browser, approve the idea, and see who approved it and when.
6. Move the approved idea to Investment.

## Acceptance Criteria

- No idea reaches Investment without an approval recorded on it, including by direct request to the server and including with an override reason.
- An approval request without a valid admin sign-in is refused.
- An approval request from the browser that submitted the idea is refused, even when signed in as admin.
- An approval is accepted only while the idea is at Pilot.
- A wrong passcode is refused, and the passcode is never sent to the browser, logged, or stored in the idea store.
- With no passcode configured, sign-in is refused with a message saying it is not set up.
- Moving an idea back clears its approval.
- Each refusal shows its message on the page without losing anything the person had typed.
- Ideas stored before V7 open and display as before; one already at Investment stays there.
- All earlier acceptance criteria that V7 does not replace still pass.

## Constraints

- Prototype-grade. One shared passcode, no user accounts, no password storage, no recovery, no lockout.
- "Not the submitter" is judged by browser, which is the only identity the workbench has. The same person in a second browser can approve their own idea. This is a known limit of the prototype and is stated wherever the rule is explained.
- The workbench stays reachable only from the machine it runs on by default. V7 does not make it safe to expose to a network.
- The passcode lives only in the environment of the running workbench. It is never committed.
- One approval step, in one place. No approval for other stages, no multiple approvers, no delegation, no rejection flow, no notifications.
- AI plays no part in approval.
- Extend the existing server and page. No framework, build step, database, or new dependency.

## Validation / Evidence

Using a separate idea store and a test passcode:

- Against the stand-in API, in a browser: each of the three results of pressing the button, the refused move to Investment, a wrong passcode, sign-in surviving a page refresh, sign-out, a successful approval from a second browser identity, the move to Investment afterwards, and the approval being cleared by a move back.
- Send requests directly to the server: approving without sign-in, approving with the submitter's browser identity, approving an idea that is not at Pilot, and moving to Investment with an override reason but no approval. Confirm nothing is saved.
- Start the workbench with no passcode and confirm sign-in is refused.
- Confirm the passcode does not appear in any response, in the idea store, or in the server log.
- Re-run the earlier browser checks to confirm nothing else changed.
- Capture screenshots of the approval section, the "cannot be the same person" message, and an approved idea.

No live AI validation is needed: V7 adds no AI call and changes no prompt.

## Stop Condition

Stop when the three button results, the refused move, and a successful approval from a different browser all work and are evidenced, and earlier behavior is intact. Do not continue into user accounts, per-person passwords, an admin screen, approval for other stages, rejection or comments, or audit reports.

## As Built

### Admin sign-in

- The passcode is the environment variable `ADMIN_PASSCODE`, read from `.env` or the process environment. `.env.example` documents it. With it unset or empty, sign-in answers 503 "Admin sign-in is not set up. Add ADMIN_PASSCODE to .env and restart."
- `POST /api/admin/login` takes `{ name, passcode }`. The name is trimmed and must be 1 to 60 characters. The passcode is compared in constant time. A wrong one answers 401 "That passcode is not right." A right one answers `{ token, name }`, where the token is 32 random bytes in hex.
- Sign-ins are held in memory on the server, keyed by token, and are lost on restart. Nothing about them is written to the idea store.
- The page keeps the token and name in `sessionStorage` and sends the token as `Authorization: Bearer <token>` on every request. On load it calls `GET /api/admin/me`; a 401 means the sign-in is no longer valid and it is dropped quietly.
- `POST /api/admin/logout` forgets the token.
- There is no lockout or rate limit on sign-in attempts.

### Approval

- `POST /api/ideas/:id/approval` takes `{ submitterId }`, the identity of the browser making the request, and needs a valid admin token.
- Checks, in order, each with its message:

| Check | Status | Message |
| --- | --- | --- |
| Signed in as admin | 401 | Only admins can approve an idea. Sign in as admin first. |
| Idea is at Pilot | 409 | An idea can be approved for Investment only while it is at Pilot. |
| Not already approved | 409 | This idea has already been approved. |
| `submitterId` is well formed | 400 | The request could not be read. |
| Not the submitter's browser | 403 | The approver cannot be the same person as the submitter. Only an admin who did not submit the idea can approve it. |

- On success the idea gains `approval`: `{ by, at }`, the admin's name and the time.
- The browser identity is sent by the page and is not verified, so the "not the submitter" rule can be defeated by sending a different one. That is within the prototype's stated limits.

### The gate

- In `moveIdea`, a forward move into Investment with no `approval` is refused with 409 "This idea needs admin approval before it can move to Investment." This happens before the evidence check, so no AI call is made, and an override reason makes no difference.
- When an approved idea moves into Investment, the history entry for that move records the approval alongside the evidence check.
- Any backward move sets `approval` to null. The history entry of the earlier move keeps its copy.

### Page

- **Sidebar:** above the footer line, "Admin sign-in". It opens a dialog titled "Admin sign-in" with "Your name" and "Admin passcode" fields, "Cancel", and "Sign in". When signed in, the sidebar shows "Admin: <name>" and "Sign out". The sidebar now stays in view while the page scrolls.
- **Pop-up message:** a dark rounded bar at the bottom centre of the page that disappears after six seconds. It carries the approval messages, "Signed in as admin: <name>", and "Approved for Investment."
- **Investment approval section:** on the idea's page, between the pipeline and "Move this idea", shown while the idea is at Pilot or has an approval.
  - Awaiting: an orange "Awaiting approval" pill and the line "An admin must approve this idea before it can move to Investment. The approver cannot be the person who submitted it." In Review Pipeline it also shows "You are not signed in as admin." or "Signed in as admin: <name>", and the button "Approve for Investment".
  - Approved: a green "Approved" pill and "Approved for Investment by <name> on <date>."
- Pressing the button without an admin sign-in shows the "Only admins can approve" message without contacting the server. Otherwise the server's answer is shown.
- **Move this idea:** pressing "Move to Investment →" on an unapproved idea shows the "needs admin approval" message and sends nothing; the note stays in the box.
- **Pipeline picture:** under Investment, a dashed orange pill "Needs admin approval", on every screen. On an approved idea it is a green "Admin approved". On an idea that reached Investment before V7 and has no approval, it is left off.
- **Review Pipeline board:** ideas at Pilot carry a grey "Awaiting approval" or green "Approved" pill.

### How it was validated

Against the stand-in API in headless Chrome, with a separate idea store and a throwaway passcode, using two separate browser identities:

- Pressing the button gave "Only admins can approve" when not signed in, and "The approver cannot be the same person as the submitter" when signed in as admin in the submitter's browser. Nothing was approved either time.
- A wrong passcode was refused; the right one signed in and survived a page refresh; sign-out invalidated the token.
- The move to Investment was refused on the page and by direct request, with and without an override reason.
- Direct approval requests without sign-in, with a made-up token, with the submitter's identity, and for an idea not at Pilot were all refused, and nothing was saved.
- A second browser signed in as a different admin approved the idea; the idea then moved to Investment through the evidence gate, and the approval was recorded on that move. Moving it back cleared the approval.
- With no passcode set, sign-in was refused with the not-set-up message.
- The passcode did not appear in any response, in the idea store, or in the server log.
- An idea already at Investment from before V7 opened and stayed there.
- The earlier browser checks for V1, V2, V3, V4, V5, the evidence gate, and delete were repeated and passed. The V4 check now approves the idea before its last move.
