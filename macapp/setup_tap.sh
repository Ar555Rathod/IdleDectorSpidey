#!/bin/bash
set -e

# Change directory to the root Documents folder
cd /Users/arnavrathod/Documents

echo "=== Setting up local homebrew-tap repository ==="

if [ -d "homebrew-tap" ]; then
    echo "Directory 'homebrew-tap' already exists locally. Removing it for a clean setup..."
    rm -rf homebrew-tap
fi

# Create directory structure
mkdir homebrew-tap
cd homebrew-tap
git init

# Add the remote target
git remote add origin https://github.com/Ar555Rathod/homebrew-tap.git

# Create Casks folder and copy the formula
mkdir Casks
cp ../IdleDectorSpidey/macapp/spidey-watch.rb Casks/

# Stage and commit locally
git add .
git commit -m "Add Spidey Watch cask formula v1.0.0"
git branch -M main

echo "=== Local Setup Completed successfully! ==="
