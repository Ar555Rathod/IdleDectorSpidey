#!/bin/bash
set -e

# Change directory to script location
cd "$(dirname "$0")"

# Ensure app is built
if [ ! -d "SpideyWatch.app" ]; then
    echo "SpideyWatch.app not found. Building first..."
    ./build.sh
fi

echo "Packaging SpideyWatch.app into SpideyWatch.zip..."
if [ -f "SpideyWatch.zip" ]; then
    rm "SpideyWatch.zip"
fi
zip -q -r SpideyWatch.zip SpideyWatch.app

echo "Computing SHA256 checksum..."
SHA256=$(shasum -a 256 SpideyWatch.zip | awk '{print $1}')
echo "SHA256: $SHA256"

# Create Homebrew Cask file template
CASK_FILE="spidey-watch.rb"
echo "Generating Homebrew Cask formula ($CASK_FILE)..."

cat <<EOF > "$CASK_FILE"
cask "spidey-watch" do
  version "1.0.2"
  sha256 "$SHA256"

  url "https://github.com/Ar555Rathod/IdleDectorSpidey/releases/download/v#{version}/SpideyWatch.zip"
  name "Spidey Watch"
  desc "A Spider-Man desktop companion that goes berserk when you are idle"
  homepage "https://github.com/Ar555Rathod/IdleDectorSpidey"

  app "SpideyWatch.app"

  zap trash: [
    "~/Library/Preferences/com.arnavrathod.SpideyWatch.plist",
    "~/Library/Saved Application State/com.arnavrathod.SpideyWatch.savedState"
  ]
end
EOF

echo "=== Packaging Completed ==="
echo "1. Upload 'SpideyWatch.zip' to a GitHub Release (tagged v1.0.2) in your repository."
echo "2. Add the generated '$CASK_FILE' file to your homebrew-tap repository (Ar555Rathod/homebrew-tap)."
echo "3. Anyone can then install/upgrade your app by running:"
echo "   brew tap Ar555Rathod/tap"
echo "   brew install --cask spidey-watch"
