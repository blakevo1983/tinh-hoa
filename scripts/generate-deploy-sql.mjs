/* global process, console */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`Aggregating ${files.length} migrations...`);

let aggregatedSql = `-- Tinh Hoa - Complete Production Schema Bundle
-- Generated automatically for zero-friction deployment
-- Run this in Supabase SQL Editor or via supabase db push

`;

for (const file of files) {
  const content = readFileSync(join(migrationsDir, file), "utf-8");
  aggregatedSql += `\n-- ==========================================\n`;
  aggregatedSql += `-- Migration: ${file}\n`;
  aggregatedSql += `-- ==========================================\n\n`;
  aggregatedSql += content.trim() + "\n";
}

const outputPath = join(process.cwd(), "supabase", "deploy_schema.sql");
writeFileSync(outputPath, aggregatedSql, "utf-8");
console.log(`Successfully generated deployment bundle: ${outputPath}`);
