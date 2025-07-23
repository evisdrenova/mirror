import { ReactElement } from "react";

import { RefreshCcw } from "lucide-react";
import { cn } from "../lib/utils";

interface Props {
  className?: string;
}

export default function Spinner(props: Props): ReactElement {
  const { className } = props;
  return <RefreshCcw className={cn("animate-spin", className)} />;
}
