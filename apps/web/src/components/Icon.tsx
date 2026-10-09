import type { SVGProps } from "react";

type IconName =
  | "document"
  | "upload"
  | "shield"
  | "arrow"
  | "close"
  | "expand"
  | "image"
  | "text"
  | "check";

const paths: Record<IconName, string> = {
  document: "M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h5",
  upload: "M12 16V3 M7 8l5-5 5 5 M4 15v6h16v-6",
  shield: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6",
  arrow: "M5 12h14 M14 7l5 5-5 5",
  close: "M6 6l12 12 M18 6L6 18",
  expand: "M14 4h6v6 M20 4l-9 9 M10 4H4v16h16v-6",
  image: "M4 4h16v16H4z M4 17l5-5 4 4 3-3 4 4 M15 8h.01",
  text: "M5 5h14 M12 5v14 M8 19h8",
  check: "M5 12l4 4L19 6",
};

export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
