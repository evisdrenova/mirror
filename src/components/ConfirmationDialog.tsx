import { AlertDialogTitle } from "@radix-ui/react-alert-dialog";
import { ReactElement, ReactNode, useState, type JSX } from "react";
import Spinner from "./Spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Button, ButtonProps, ButtonVariants } from "./ui/Button";
import ButtonText from "./ui/Button-text";
import { cn } from "../lib/utils";

export interface Props {
  trigger?: ReactNode;
  headerText?: string;
  description?: string;
  body?: JSX.Element;
  ButtonText?: string;
  ButtonVariant?: ButtonProps["variant"] | null | undefined;
  ButtonIcon?: ReactNode;
  containerClassName?: string;
  onConfirm(): void | Promise<void>;
}

export default function ConfirmationDialog(props: Props): ReactElement {
  const {
    trigger = <Button type="Button">Press to Confirm</Button>,
    headerText = "Are you sure?",
    description = "This will confirm the action that you selected.",
    body,
    ButtonText = "Confirm",
    ButtonVariant,
    ButtonIcon,
    containerClassName,
    onConfirm,
  } = props;
  const [open, setOpen] = useState(false);
  const [isTrying, setIsTrying] = useState(false);

  async function onClick(): Promise<void> {
    if (isTrying) {
      return;
    }
    setIsTrying(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setIsTrying(false);
    }
  }
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className={cn(containerClassName)}>
        <AlertDialogHeader className="gap-2">
          <AlertDialogTitle className="text-xl">{headerText}</AlertDialogTitle>
          <AlertDialogDescription className="tracking-tight">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="pt-6">{body}</div>
        <AlertDialogFooter className="w-full flex sm:justify-between mt-4">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onClick();
            }}
            className={cn(ButtonVariants({ variant: ButtonVariant }))}
          >
            <ButtonText
              leftIcon={isTrying ? <Spinner /> : ButtonIcon}
              text={ButtonText}
            />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
