#!/bin/bash
# Ralph-once: One-shot Claude loop for Polet AI
# Run with: ./ralph-once.sh
# Reads PROMPT.md for instructions, updates progress.txt after each run

set -e

PROMPT_FILE="docs/PROMPT.md"
PROGRESS_FILE="docs/progress.txt"
PRD_FILE="docs/PRD.md"

# Read the prompt and feed it to claude-code
cat "$PROMPT_FILE" | claude --permission-mode acceptEdits

echo "[ralph-once] Completed. Check $PROGRESS_FILE for updated status."