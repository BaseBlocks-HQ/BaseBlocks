/**
 * Shared dialog components (used across multiple modules)
 *
 * Feature-specific dialogs live in their modules:
 * - modules/dashboard/: create-site-dialog, edit-site-dialog
 * - modules/editor/: create-page-dialog
 * - modules/navigation/: create-child-page-dialog, rename-page-dialog
 *
 * Inline title/slug field styles: dashboard-inline-field-styles (re-exported below).
 */
export { ConfirmDialog } from "./confirm-dialog";
export { DashboardConfirmDialog } from "./dashboard-confirm-dialog";
export { DashboardDialogShell } from "./dashboard-dialog-shell";
export {
  dashboardDialogFormErrorClassName,
  dashboardDialogPrimaryFieldLabelClassName,
  dashboardDialogPrimaryInlineInputClassName,
  dashboardDialogSecondaryFieldLabelClassName,
  dashboardDialogSecondaryInlineInputClassName,
} from "./dashboard-inline-field-styles";
export { DashboardFormDialog } from "./dashboard-form-dialog";
export { DialogShell } from "./dialog-shell";
export { FormDialog } from "./form-dialog";
