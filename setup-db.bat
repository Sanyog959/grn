@echo off
title AURA GRN - Supabase Database Setup
cd /d "%~dp0"

echo =====================================================================
echo           AURA GRN - Supabase PostgreSQL Database Setup
echo =====================================================================
echo.

node scripts/setup-db.js

echo.
pause
