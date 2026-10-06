import { createContext, type CSSProperties } from "react";

export type StorefrontThemeStyle = CSSProperties &
  Record<`--storefront-${string}`, string | number>;

export const StorefrontThemeStyleContext = createContext<StorefrontThemeStyle | null>(null);
