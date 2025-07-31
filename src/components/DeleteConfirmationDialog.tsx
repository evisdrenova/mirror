import { TrashIcon } from "@radix-ui/react-icons";
import { ReactElement } from "react";
import ConfirmationDialog, {
  Props as ConfirmationDialogProps,
} from "./ConfirmationDialog";

type Props = ConfirmationDialogProps;

export default function DeleteConfirmationDialog(props: Props): ReactElement {
  return (
    <ConfirmationDialog
      ButtonText={"Delete"}
      ButtonIcon={<TrashIcon />}
      ButtonVariant="destructive"
      {...props}
    />
  );
}
