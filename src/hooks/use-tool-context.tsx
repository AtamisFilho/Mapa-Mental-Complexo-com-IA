"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Tool } from "@/lib/types";

interface ToolContextType {
  tool: Tool;
  setTool: (t: Tool) => void;
  connectingFrom: string | null;
  setConnectingFrom: (id: string | null) => void;
  cursorWorld: { x: number; y: number } | null;
  setCursorWorld: (pos: { x: number; y: number } | null) => void;
}

const ToolContext = createContext<ToolContextType>({
  tool: "select",
  setTool: () => {},
  connectingFrom: null,
  setConnectingFrom: () => {},
  cursorWorld: null,
  setCursorWorld: () => {},
});

export function ToolProvider({ children }: { children: ReactNode }) {
  const [tool, setTool] = useState<Tool>("select");
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);

  return (
    <ToolContext.Provider
      value={{ tool, setTool, connectingFrom, setConnectingFrom, cursorWorld, setCursorWorld }}
    >
      {children}
    </ToolContext.Provider>
  );
}

export function useTool() {
  return useContext(ToolContext);
}
