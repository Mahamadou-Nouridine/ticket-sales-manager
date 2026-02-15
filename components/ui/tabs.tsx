"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext<{
    value?: string
    onValueChange?: (value: string) => void
}>({})

const Tabs = ({ value, onValueChange, children, className }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <TabsContext.Provider value={{ value, onValueChange }}>
            <div className={cn("w-full", className)}>{children}</div>
        </TabsContext.Provider>
    )
}

const TabsList = ({ children, className }: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <div className={cn("inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)}>
            {children}
        </div>
    )
}

const TabsTrigger = ({ value, children, className }: {
    value: string;
    children: React.ReactNode;
    className?: string;
}) => {
    const context = React.useContext(TabsContext)
    const isActive = context.value === value

    return (
        <button
            type="button"
            onClick={() => context.onValueChange?.(value)}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isActive ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 hover:text-foreground",
                className
            )}
        >
            {children}
        </button>
    )
}

const TabsContent = ({ value, children, className }: {
    value: string;
    children: React.ReactNode;
    className?: string;
}) => {
    const context = React.useContext(TabsContext)
    if (context.value !== value) return null

    return (
        <div className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}>
            {children}
        </div>
    )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
