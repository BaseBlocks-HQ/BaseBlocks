import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@baseblocks/ui/alert-dialog";
import { Spinner } from "@baseblocks/ui/spinner";

export function DeclineInvitationDialog({
  cancelLabel,
  confirmDisabled,
  confirmLabel,
  confirmLoading,
  description,
  onConfirm,
  onOpenChange,
  open,
  title,
}: {
  cancelLabel: string;
  confirmDisabled: boolean;
  confirmLabel: string;
  confirmLoading: boolean;
  description: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="overflow-hidden rounded-[1.5rem] p-0 shadow-2xl sm:max-w-[32rem]">
        <AlertDialogHeader className="px-5 pt-5 pb-0 text-left sm:text-left">
          <AlertDialogTitle className="text-base font-semibold text-balance">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="px-5 pt-3 pb-4 sm:justify-end">
          <AlertDialogCancel
            size="sm"
            className="rounded-full bg-transparent px-3.5 text-sm"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            size="sm"
            disabled={confirmDisabled}
            className="rounded-full px-4 text-sm"
            onClick={onConfirm}
          >
            {confirmLoading ? <Spinner /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
