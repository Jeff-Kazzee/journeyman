import { PrismaClient } from "@prisma/client";
import { databaseUrl } from "./config.ts";

export const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl() } },
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});