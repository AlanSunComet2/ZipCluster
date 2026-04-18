import { defineConfig } from "prisma/config";
import 'dotenv/config';

export default defineConfig({
  schema: "prisma/schema.prisma",
  seed: "tsx prisma/seed.ts",
});
