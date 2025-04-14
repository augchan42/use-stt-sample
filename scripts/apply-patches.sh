#!/bin/bash

# Create patches directory if it doesn't exist
mkdir -p patches

# Apply the BitStream patch
patch -p1 < patches/bitstream.patch

echo "Patches applied successfully" 