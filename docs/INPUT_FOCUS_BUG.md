# ChargeShare India — Diagnostic Report: Input Focus Bug in My Garage (/vehicles)

**Document Path**: `/docs/INPUT_FOCUS_BUG.md`  
**Date**: November 1, 2026  
**Author**: Senior Frontend Engineer & UI/UX QA Specialist  
**Status**: Root Cause Identified & Verified with Automated Proof  

---

## 1. Reproduction Findings

### Test Execution
We executed an automated headless Chrome reproduction script against `http://localhost:5173/vehicles` using Playwright:
1. Authenticated as EV owner (`owner1@chargeshare.in`).
2. Navigated to `/vehicles` and clicked **"Add Electric Scooter"**.
3. Focused `input#vehReg` (Registration Number field).
4. Typed string `"KA01EV1234"` character-by-character with 100ms intervals between strokes, inspecting `document.activeElement` and `input.value` at each step.

### Recorded Keystroke Trace
```
Initial active element after click: <input id="vehReg" ...>

Keystroke 'K': inputValue="K", isInputFocused=false, activeTag=BUTTON, activeAriaLabel="Close dialog"
Keystroke 'A': inputValue="K", isInputFocused=false, activeTag=BUTTON, activeAriaLabel="Close dialog"
Keystroke '0': inputValue="K", isInputFocused=false, activeTag=BUTTON, activeAriaLabel="Close dialog"
Keystroke '1': inputValue="K", isInputFocused=false, activeTag=BUTTON, activeAriaLabel="Close dialog"
Keystroke 'E': inputValue="K", isInputFocused=false, activeTag=BUTTON, activeAriaLabel="Close dialog"
Keystroke 'V': inputValue="K", isInputFocused=false, activeTag=BUTTON, activeAriaLabel="Close dialog"
Keystroke '1': inputValue="K", isInputFocused=false, activeTag=BUTTON, activeAriaLabel="Close dialog"
Keystroke '2': inputValue="K", isInputFocused=false, activeTag=BUTTON, activeAriaLabel="Close dialog"
Keystroke '3': inputValue="K", isInputFocused=false, activeTag=BUTTON, activeAriaLabel="Close dialog"
Keystroke '4': inputValue="K", isInputFocused=false, activeTag=BUTTON, activeAriaLabel="Close dialog"
```

### Observation:
After typing the first character (`'K'`), `document.activeElement` immediately shifted from `input#vehReg` to `<button aria-label="Close dialog">` (the modal's close button). The focus ring on `input#vehReg` disappeared. All subsequent keystrokes (`'A'`, `'0'`, `'1'`, etc.) were dispatched to the Close button, resulting in ignored input. The input remained stuck at `"K"` unless clicked again.

---

## 2. Root Cause Analysis (File & Line Evidence)

### Primary Root Cause: Focus-Trap & Auto-Focus Re-Initialization in `client/src/components/common/Modal.jsx` (Lines 16–82)

```javascript
// client/src/components/common/Modal.jsx
export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';

      // Focus first focusable element inside modal
      const timer = setTimeout(() => {
        if (modalRef.current) {
          const focusable = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            focusable[0].focus();
          }
        }
      }, 50);
...
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('popstate', handlePopState);
        if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]); // <-- CRITICAL FLAW: Re-runs whenever `onClose` changes!
```

### The Chain of Events:
1. In `VehiclesPage.jsx` line 250:
   ```jsx
   <Modal
     isOpen={modalOpen}
     onClose={() => setModalOpen(false)} // <-- Inline arrow function created anew on every render!
     title={editingVehicle ? 'Edit EV Two-Wheeler' : 'Add EV Two-Wheeler'}
   >
   ```
2. In `VehiclesPage.jsx`, form state (`make`, `model`, `registrationNumber`, `batteryCapacityKWh`) is declared directly in `VehiclesPage`.
3. When the user types `'K'` into `input#vehReg`:
   - `onChange={(e) => setRegistrationNumber(e.target.value)}` calls `setRegistrationNumber('K')`.
   - `VehiclesPage` re-renders to reflect the new state.
   - On re-render, line 250 evaluates a **new function instance** for `onClose`.
4. `Modal.jsx` receives the new `onClose` reference. Because `onClose` is listed in `useEffect` dependencies `[isOpen, onClose]`, React triggers the effect cleanup and then re-runs the effect:
   - **Cleanup executes**: `previousFocusRef.current.focus()` immediately steals focus from the input element.
   - **Effect re-runs**: `previousFocusRef.current` is overwritten.
   - **Timer fires (50ms)**: `focusable[0].focus()` queries the DOM for the first focusable element inside `modalRef.current`.
   - The very first focusable element in `Modal.jsx` is line 128:
     `<button onClick={onClose} aria-label="Close dialog">`
   - Therefore, after 50ms, focus is programmatically forced onto the Close button.
5. The input loses focus after every single keystroke.

---

## 3. Checklist of Diagnostic Hypotheses

| Hypothesis | Evaluated Condition | File & Line | Status | Notes |
|---|---|---|---|---|
| **Component defined inside render body** | Checked if Modal or FormField is declared inside `VehiclesPage` render body. | `client/src/pages/VehiclesPage.jsx` lines 6-120 | **Not present** | Components are imported from module scope. |
| **Unstable `key` props** | Checked if keys use `Math.random()`, `Date.now()`, or dynamic state. | `VehiclesPage.jsx` lines 262, 185 | **Not present** | Keys use stable `p.model` and `v._id`. |
| **Modal conditional re-mounting** | Checked if parent unmounts/remounts Modal on each render. | `VehiclesPage.jsx` line 247 | **Contributing** | `{modalOpen && <Modal ...>}` keeps instance alive, but `onClose` prop instability re-triggers focus initialization. |
| **Controlled input binding bug** | Checked if `value` and `onChange` are bound correctly. | `VehiclesPage.jsx` lines 306-307 | **Minor** | State is bound, but registration formatting was not decoupled from typing. |
| **Global key handler / Focus trap re-init** | Checked if focus trap effect re-runs on every render. | `client/src/components/common/Modal.jsx` lines 16-82 | **PRIMARY CAUSE** | `[isOpen, onClose]` dependency with inline `onClose` causes cleanup and `focusable[0].focus()` on every keystroke. |
| **Timer / Polling causing parent re-render** | Checked if Navbar notifications poll or hold countdown triggers remount. | `Navbar.jsx` line 119 | **Secondary trigger** | If `onClose` is inline, any background interval (15s notification poll) also triggers modal focus reset. |
| **Why other forms work** | Compared with `RegisterPage`, `LoginPage`, `ContactPage`, `HostOnboardPage`. | `RegisterPage.jsx`, `LoginPage.jsx` | **Confirmed difference** | Other forms are top-level route pages and do not use `Modal.jsx`. |

---

## 4. Remediation Plan

1. **Fix `Modal.jsx` Focus Management**:
   - Store `onClose` in a stable ref (`onCloseRef.current = onClose`) so `useEffect` only runs on `isOpen` state transitions (`[isOpen]`), NOT on prop function reference changes.
   - Separate initial focus from re-renders:
     - On opening (`isOpen: false -> true`), record `triggerRef.current = document.activeElement`.
     - Set initial focus only once when the modal opens (prioritizing the first input or the dialog body, rather than the close button if inputs exist).
     - Restore focus to `triggerRef.current` ONLY when `isOpen` becomes `false` or when the modal unmounts.
   - Use stable `useCallback` or ref for the Tab trap and Escape key listener.

2. **Harden `VehiclesPage.jsx`**:
   - Memoize modal close handler with `useCallback`.
   - Decouple Registration Number formatting: allow free typing, uppercase & sanitize spaces/hyphens on `onBlur` (not on every keystroke).
   - Add clear helper text (`e.g. KA01EV1234`) and inline validation errors only on blur or submit.
   - Battery Capacity input: add `inputMode="decimal"`, `min={0.5}`, `max={25.0}`, `step="0.1"`.
   - Use the shared, stable, accessible `Input` component (`client/src/components/common/Input.jsx`) or stable fields to ensure consistent styling, focus rings, and helper/error handling.

3. **Verify All Other Modal Usages**:
   - Inspect and ensure `AccountSettingsModal`, `ChargerDetailPage` report modal, `HostDashboardPage` settings modal, and `AdminDashboardPage` do not suffer focus disruption from background polling or typing.
