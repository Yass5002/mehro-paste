export const appNames = ["paste"] as const;

export type AppName = (typeof appNames)[number];

export const appName: AppName = "paste";

