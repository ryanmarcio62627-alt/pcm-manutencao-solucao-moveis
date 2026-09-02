import React from "react";
import { formatLocalUserName } from "@shared/displayName";

export function LocalGreeting({ username }: { username?: string | null }) {
  return <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Bom trabalho, {formatLocalUserName(username)}.</h2>;
}
