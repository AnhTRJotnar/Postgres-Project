import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";

const connectionString = process.env["DATABASE_URL"];

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to apps/api/.env.");
}

// Single shared client for the whole process; Prisma 7 requires a driver adapter.
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
