# SGMS design system - Step 14.3

This foundation contains no authentication, API integration, academic records, or
dashboard implementation. The development-only component preview uses empty
tables, an em dash rather than a metric, and explicitly labeled visual examples.
Production builds exclude the preview module. Step 14.5 adds the actual login and
protected role placeholders; the preview is now at `/__dev/design-system` in development.

## Tokens and dimensions

`src/styles/globals.css` is the central Tailwind v4/shadcn theme. Navy #1E3A5F,
blue #2563EB, background #F8FAFC, surface white, primary text #0F172A, secondary
text #64748B, success #15803D, warning #D97706, and danger #DC2626 are preserved.
Warning text uses darker #92400E on #FFFBEB rather than the warning swatch itself.
Success/danger/info feedback uses light surfaces and readable darker foregrounds.
Input borders use #64748B so interactive boundaries remain distinguishable.

- Local system sans-serif font stack; no external font requests.
- Page headings 24px / 30px at small-screen breakpoint; sections 20px; card headings
  16px; supporting text 14px; labels/metadata 12-14px. Body line height uses Tailwind defaults.
- Tailwind 4px spacing scale; panels 20px / 24px padding; layouts use 16-32px gaps.
- Radius: 6px, 8px, 12px, 16px. Small panel shadow; stronger overlay shadow only.
- Focus: 2px accent-blue outline with 3px offset, including keyboard-focused links,
  buttons, fields, and focusable table regions.
- Default buttons/controls: 44px minimum height; small button 36px; large 48px;
  icon button 44px square. Textareas minimum 112px. Mobile fields use 16px text.
- Table cells: 16px horizontal / 14px vertical padding, controlled through CSS variables.
- Breakpoints: sm 640px, md 768px, lg 1024px, xl 1280px.
- Reduced-motion media rule suppresses transitions and animation. Only loading
  indicators use motion, and only when motion preferences permit it.

## Component inventory

| File under src/components | Exports / responsibility |
|---|---|
| ui/button.tsx | Button, buttonVariants; primary/secondary/outline/ghost/destructive; sizes; Slot composition |
| ui/form-controls.tsx | Input, PasswordInput, Label, native Select, Textarea, Radix Checkbox |
| ui/display.tsx | Card, Badge, Separator, Skeleton, Alert, Avatar; shared semantic tones/icons |
| ui/overlays.tsx | Dialog, AlertDialog and their parts; DropdownMenu and parts; Tooltip and provider |
| ui/toast.tsx | ToastProvider, useToast; polite live announcements and manually dismissible notifications |
| layout/headers.tsx | PageHeader, SectionHeader |
| feedback/states.tsx | LoadingState, EmptyState, ErrorState with optional controlled retry |
| shared/summary-card.tsx | SummaryCard; caller supplies actual value and description |
| shared/data-table.tsx | Generic DataTable and Column; caption, column headers, stable keys, optional action renderers, loading/error/empty states |
| shared/pagination.tsx | Controlled Pagination; page sizes 10/25/50/100; no network requests |
| shared/filters.tsx | Controlled SearchInput and FilterControls; caller must state filtering scope |
| shared/form-field.tsx | FormField render prop: linked ID, description/error IDs, invalid/required ARIA state |
| shared/status-badge.tsx | StatusBadge for account/enrollment/inquiry statuses, with visible text and icon |
| shared/confirmation-dialog.tsx | ConfirmationDialog with Cancel default focus, async pending state, retained dialog on failure, safe generic error |

Radix packages are pinned exactly: Dialog 1.3.1, Alert Dialog 1.2.1, Dropdown Menu
2.2.1, Tooltip 1.4.1, Checkbox 1.4.1, and Slot 1.5.0. Other controls use semantic
native HTML, avoiding unnecessary primitive dependencies. Components follow the
existing shadcn source-component architecture, theme, aliases, and class utilities.

## Integration contracts

Pass real data and callbacks into components; none fetch data. DataTable's actions
renderer should return named Buttons or accessible menu triggers. Horizontal table
scrolling is contained in a named keyboard-focusable region; table semantics remain
intact. Empty preview tables do not establish real populated-table action behavior.

Pagination does not filter, sort, or fetch automatically. Its caller must reset the
page after page-size/filter changes and supply valid positive page/pageSize values.
Supported backend queries remain page/pageSize plus studentId on academic lists.
Search and other client filters must explicitly describe whether they cover the
current page or a completely fetched dataset. No new server filters are assumed.

FormField supplies accessibility props to its child; the child must spread them onto
the real input and implement actual validation/required behavior through its form
schema. PasswordInput preserves input values and only toggles visibility. Toasts
stay visible until dismissed, avoiding time-limited reading; at most five are shown.

## Verification performed

- TypeScript and production build passed; direct dependency tree valid, no peer errors.
- Dependency audit reported zero vulnerabilities at verification time.
- Isolated headless Chrome 158 checked viewport widths 320, 375, 768, 1366, and 1920px;
  no horizontal document overflow was detected. Mobile/laptop screenshots reviewed.
- Browser checks passed for dialog initial focus, Tab containment, Escape close and
  trigger focus restoration; confirmation Cancel focus and successful local action;
  password show/hide; Space-operated checkbox; ArrowDown/Escape menu handling;
  visible 2px keyboard focus; labels on native form controls; and reduced-motion CSS.
- No JavaScript runtime exceptions or API calls occurred in those browser checks.
- Chrome's accessibility tree exposed 30 named controls with no empty accessible
  names among inspected button/checkbox/combobox/textbox nodes.
- Calculated contrast ratios met the 4.5:1 normal-text threshold: white/navy 11.50,
  white/blue 5.17, white/danger 4.83, secondary text/background 4.55,
  success badge 4.79, warning badge 6.84, danger badge 5.91, info badge 8.01.
- Preview is excluded from the production JavaScript bundle; Vite loopback, proxy,
  strictPort and filesystem restrictions are preserved.

These checks are not a complete accessibility certification. Screen-reader output,
Safari/Firefox, physical touch devices, forced-colors mode, all zoom settings, real
populated tables, backend form errors, and every overlay combination remain untested.
Native select behavior also depends on the user's browser/operating system.
