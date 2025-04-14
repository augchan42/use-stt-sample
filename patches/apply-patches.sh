#!/bin/bash

set -e  # Exit on any error

# Clean up node_modules if it exists
if [ -d "node_modules/lamejs" ]; then
    echo "Cleaning up previous lamejs installation..."
    rm -rf node_modules/lamejs
    npm install
fi

# Apply base patches first
echo "Applying lamejs 1.2.1 base patches..."
patch -p1 --no-backup-if-mismatch < patches/lamejs+1.2.1.patch

# Fix BitStream.js using Node.js script
echo "Fixing BitStream.js..."
node patches/fix-bitstream.js

echo "All changes applied successfully!" 