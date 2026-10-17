import type { ReactNode } from "react";
import { Providers } from "@/providers/Providers";

/**
 * The draw page creates a room, so it needs the same provider stack as
 * `/create` and `/join` (`useRoom` throws without it).
 */
export default function RandomLayout({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
