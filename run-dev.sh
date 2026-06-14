#!/bin/bash
# Use the portable Node.js installation
export PATH="$(dirname "$0")/node-portable:$PATH"
npm run dev
