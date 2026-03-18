# Spec and build

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

Ask the user questions when anything is unclear or needs their input. This includes:
- Ambiguous or incomplete requirements
- Technical decisions that affect architecture or user experience
- Trade-offs that require business context

Do not make assumptions on important decisions — get clarification first.

---

## Workflow Steps

### [x] Step: Technical Specification
<!-- chat-id: c582a67e-bdfc-4a34-af06-250e7ec53252 -->

Assess the task's difficulty, as underestimating it leads to poor outcomes.
- easy: Straightforward implementation, trivial bug fix or feature
- medium: Moderate complexity, some edge cases or caveats to consider
- hard: Complex logic, many caveats, architectural considerations, or high-risk changes

Create a technical specification for the task that is appropriate for the complexity level:
- Review the existing codebase architecture and identify reusable components.
- Define the implementation approach based on established patterns in the project.
- Identify all source code files that will be created or modified.
- Define any necessary data model, API, or interface changes.
- Describe verification steps using the project's test and lint commands.

Save the output to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach
- Source code structure changes
- Data model / API / interface changes
- Verification approach

If the task is complex enough, create a detailed implementation plan based on `{@artifacts_path}/spec.md`:
- Break down the work into concrete tasks (incrementable, testable milestones)
- Each task should reference relevant contracts and include verification steps
- Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint, write tests for a module). Avoid steps that are too granular (single function).

Important: unit tests must be part of each implementation task, not separate tasks. Each task should implement the code and its tests together, if relevant.

Save to `{@artifacts_path}/plan.md`. If the feature is trivial and doesn't warrant this breakdown, keep the Implementation step below as is.

---

### [ ] Step: Create UserTableItem sub-component
- Create `src/app/shared/components/user-display/user-table-item.ts`
- Renders `<td>` cells: image, title, first_name, last_name, email, location, barcode, active_withdrawals badge
- Host uses `display: contents` to be transparent inside `<tr>`
- Import and use `ImageDisplay`, `LocationDisplay`, PrimeNG `TagModule`
- Write basic unit test (renders without errors, displays user name)

### [ ] Step: Create UserFullDetail sub-component
- Create `src/app/shared/components/user-display/user-full-detail.ts`
- Renders large image, title, full name, email with copy button, location
- Output: `copyEmail` event (string)
- Import `ImageDisplay`, `LocationDisplay`, PrimeNG `ButtonModule`, `TooltipModule`
- Write basic unit test

### [ ] Step: Create UserSelected sub-component
- Create `src/app/shared/components/user-display/user-selected.ts`
- Renders selected user card (step 1 of withdrawal form): image (circle), name, email, role, × clear button, check icon
- Output: `onClear` event
- Import `ImageDisplay`, PrimeNG `ButtonModule`
- Write basic unit test

### [ ] Step: Create UserSummary sub-component
- Create `src/app/shared/components/user-display/user-summary.ts`
- Renders compact/dimmed user summary card: image, name, label ("Selected User" or "User"), edit button
- Input: `size?: 'sm' | 'md'` (controls image dimensions and layout for step 2 vs step 3)
- Output: `onEdit` event
- Import `ImageDisplay`, PrimeNG `ButtonModule`
- Write basic unit test

### [ ] Step: Refactor users.html and users.ts
- Replace the inline `<td>` cells in `<ng-template pTemplate="body" let-user>` with `<app-user-table-item [user]="user" />`
- Add `UserTableItem` to imports in `users.ts`
- Run lint and typecheck; verify no regressions

### [ ] Step: Refactor user-detail.html and user-detail.ts
- Replace the header block (image + name/email/location block) with `<app-user-full-detail [user]="user()" (copyEmail)="copyToClipboard($event)" />`
- Add `UserFullDetail` to imports in `user-detail.ts`
- Remove `copyToClipboard` internal template logic (keep method, wire via output)
- Run lint and typecheck

### [ ] Step: Refactor withdrawal-form.html and withdrawal-form.ts
- Replace selected user card in step 1 with `<app-user-selected [user]="selectedUser" (onClear)="selectedUser = null; userBarcode = ''" />`
- Replace summary card in step 2 with `<app-user-summary [user]="selectedUser" (onEdit)="activateCallback(1)" />`
- Replace summary card in step 3 with `<app-user-summary [user]="selectedUser" size="sm" (onEdit)="activateCallback(1)" />`
- Add `UserSelected`, `UserSummary` to imports in `withdrawal-form.ts`
- Run lint and typecheck

### [ ] Step: Final verification and report
- Run `npx tsc --noEmit` and fix any type errors
- Run existing tests (`npx ng test --watch=false`)
- Write report to `.zenflow/tasks/new-task-d854/report.md`
