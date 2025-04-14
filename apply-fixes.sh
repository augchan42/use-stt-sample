#!/bin/bash

# Remove the node_modules/lamejs directory if it exists
rm -rf node_modules/lamejs

# Reinstall lamejs
npm install lamejs@1.2.1

# Apply the fixes patch
patch -p0 < patches/lamejs-fixes.patch

# Rebuild the project
npm run build 