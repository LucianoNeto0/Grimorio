import { useContext } from "react";

import { RpgContext } from "./store-context";

export function useRpg() {
  const value = useContext(RpgContext);
  if (!value) throw new Error("useRpg must be used inside RpgProvider");
  return value;
}
