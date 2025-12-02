#!/bin/sh
# Husky helper script

if [ -z "$husky_skip_init" ]; then
  husky_skip_init=1
  export husky_skip_init
  # Prevent Windows Git Bash from blocking
  command -v winpty >/dev/null 2>&1 && winpty bash -c "exit" >/dev/null 2>&1
fi
