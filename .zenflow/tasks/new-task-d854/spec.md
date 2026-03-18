# Technical Specification: User Display Component Refactoring

## Difficulty Assessment
**Medium** — Moderate complexity involving multiple file modifications across the app, clear pattern, but requires careful handling of inputs/outputs, accessibility, and Angular signals conventions.

---

## Technical Context

- **Language**: TypeScript ~5.9
- **Framework**: Angular (standalone components, v20+, signals-based state)
- **UI Library**: PrimeNG v21
- **Build System**: Electron app (IPC-based services)
- **Component Style**: Standalone, `ChangeDetectionStrategy.OnPush`, `input()`/`output()` functions, no decorators

---

## Problem Statement

User data is displayed in multiple locations throughout the app in different ways (table row, compact card, full detail, selected summary), all with duplicated inline markup. The goal is to extract a single `UserDisplay` component with a `type` input that delegates rendering to specialized sub-components, making each parent template cleaner and the user display logic reusable.

### Affected Files (Templates with Inline User Markup)

1. `src/app/users/users.html` — table row with image, name fields, email, location, barcode, active_withdrawals badge
2. `src/app/users/user-detail/user-detail.html` — full detail view with image, name, email, location, notes
3. `src/app/withdrawals/withdrawal-form/withdrawal-form.html` — two modes: selected user card (primary, with change button) and summary card (compact/dimmed, with edit button); also user search table rows
4. `src/app/dashboard/dashboard.html` — overdue withdrawals table: `user.first_name + user.last_name` inline text (minimal, no dedicated block — out of scope or handled via `UserTableItem`)

---

## Component Architecture

### `UserDisplay` (orchestrator)
**Path**: `src/app/shared/components/user-display/user-display.ts`
**Selector**: `app-user-display`

| Input | Type | Description |
|---|---|---|
| `user` | `any` | The user object |
| `type` | `'table-item' \| 'full-detail' \| 'selected' \| 'summary'` | Controls which sub-component is rendered |
| `onEdit` | output (optional) | Emitted when edit/change is requested (used in `selected`, `summary` modes) |
| `onActivate` | output (optional) | Emitted for stepper callback (used in `selected` mode) |

The component switches on `type` using `@switch` and renders the appropriate sub-component.

---

### Sub-Components

#### 1. `UserTableItem`
**Path**: `src/app/shared/components/user-display/user-table-item.ts`
**Usage**: Inside `<tr>` in `users.html` — replaces the `<td>` cells for image, title, name, email, location, barcode, active_withdrawals

> Note: Since table rows have strict `<tr>/<td>` structure, this sub-component will render `<td>` elements directly using `display: contents` or the parent will keep the `<tr>` and use `<app-user-table-item>` to render individual cells. **Decision**: keep `<tr>` in parent, render cell contents via the component using `<ng-content>` pattern, or render cells inside a wrapper `<td colspan>`. **Simplest approach**: `UserTableItem` renders all `<td>` cells using `display: contents` on the host, making it transparent in the table.

Inputs: `user: any`

#### 2. `UserFullDetail`
**Path**: `src/app/shared/components/user-display/user-full-detail.ts`
**Usage**: In `user-detail.html` — shows large image, full name, title, email (with copy), location

Inputs: `user: any`
Outputs: `copyEmail` (triggers clipboard write — or can be handled internally)

#### 3. `UserSelected`
**Path**: `src/app/shared/components/user-display/user-selected.ts`
**Usage**: In `withdrawal-form.html` step 1 — shows selected user card with name, email, role, change button, check icon

Inputs: `user: any`
Outputs: `onClear` — emitted when user clicks the × button (parent sets `selectedUser = null`)

#### 4. `UserSummary`
**Path**: `src/app/shared/components/user-display/user-summary.ts`
**Usage**: In `withdrawal-form.html` step 2 and step 3 — compact/dimmed card with image, name, "Selected User" / "User" label, edit button

Inputs: `user: any`, `size?: 'sm' | 'md'` (step 3 is smaller than step 2)
Outputs: `onEdit` — emitted when user clicks pencil (parent calls `activateCallback(1)`)

---

## Source Code Changes

### Files to Create
```
src/app/shared/components/user-display/
  user-display.ts          (orchestrator, delegates to sub-components)
  user-table-item.ts       (renders <td> cells for users table)
  user-full-detail.ts      (full detail card for user-detail page)
  user-selected.ts         (selected user card in withdrawal form step 1)
  user-summary.ts          (compact summary card in withdrawal form step 2/3)
```

### Files to Modify

| File | Change |
|---|---|
| `src/app/users/users.html` | Replace table body `<td>` cells (image, title, name, email, location, barcode, badge) with `<app-user-table-item [user]="user" />` inside `<tr>` |
| `src/app/users/users.ts` | Import `UserTableItem` |
| `src/app/users/user-detail/user-detail.html` | Replace header block (image + name/email/location) with `<app-user-full-detail [user]="user()" (copyEmail)="copyToClipboard($event)" />` |
| `src/app/users/user-detail/user-detail.ts` | Import `UserFullDetail` |
| `src/app/withdrawals/withdrawal-form/withdrawal-form.html` | Replace selected user card (step 1), summary card (step 2), and summary card (step 3) with `<app-user-selected>` / `<app-user-summary>` |
| `src/app/withdrawals/withdrawal-form/withdrawal-form.ts` | Import new components |

> The **user search table** inside `withdrawal-form.html` (the dialog with rows showing image + name + email + barcode) can also use `UserTableItem` or remain inline since it's a search result list — left as optional polish.

> The **dashboard** overdue withdrawals table only shows `w.user?.first_name + w.user?.last_name` as plain text — **out of scope** (no meaningful encapsulation for a single line).

---

## Data Model / API / Interface Changes

No new API or data model changes required. All user data is passed as `any` objects from existing services (matching existing patterns in codebase).

Optionally, a local interface can be added:
```ts
interface UserLike {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  role?: string;
  title?: { title: string };
  barcode?: string;
  image_path?: string | null;
  location?: any;
  active_withdrawals?: number;
}
```
This is optional and does not affect runtime behavior.

---

## Implementation Notes

- All sub-components: `ChangeDetectionStrategy.OnPush`, `input()`, `output()`, no `standalone: true` (Angular v20+ default)
- Use `app-image-display` and `app-location-display` in sub-components where needed (already exist in `shared/components`)
- `UserTableItem` host element needs to be transparent in table context — use `display: contents` via `host: { style: 'display: contents' }` in the decorator
- All i18n attributes (`i18n="..."`) must be preserved when migrating template content
- Follow `OnPush` + signals pattern; no constructor injection (use `inject()`)

---

## Verification Approach

```bash
# Type check
npx tsc --noEmit

# Lint
npx eslint src/

# Run existing unit tests
npx ng test --watch=false
```

Manual verification:
1. Navigate to `/users` — table renders correctly with image, name columns
2. Click eye icon on a user — detail page shows full detail block
3. Navigate to `/withdrawals`, click Add — withdrawal form step 1 shows barcode input; after scan shows `UserSelected` card; step 2 shows `UserSummary`; step 3 shows compact `UserSummary`
