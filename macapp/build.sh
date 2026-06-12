#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "=== Building Spidey Watch macOS App ==="

# Clean any existing build
if [ -d "SpideyWatch.app" ]; then
    echo "Cleaning existing build directory..."
    rm -rf SpideyWatch.app
fi

# Create directory structure
echo "Creating application bundle directory structure..."
mkdir -p SpideyWatch.app/Contents/MacOS
mkdir -p SpideyWatch.app/Contents/Resources/web

# Compile Swift code
echo "Compiling Swift wrapper..."
swiftc -O -o SpideyWatch.app/Contents/MacOS/SpideyWatch main.swift -framework Cocoa -framework WebKit

# Copy Info.plist
echo "Copying configuration properties (Info.plist)..."
cp Info.plist SpideyWatch.app/Contents/Info.plist

# Copy web files
echo "Copying web overlay assets..."
cp web/index.html SpideyWatch.app/Contents/Resources/web/
cp web/content.css SpideyWatch.app/Contents/Resources/web/
cp web/content.js SpideyWatch.app/Contents/Resources/web/

# Ensure binary is executable
chmod +x SpideyWatch.app/Contents/MacOS/SpideyWatch

echo "=== Build Completed Successfully ==="
echo "You can launch the app by running: open SpideyWatch.app"
