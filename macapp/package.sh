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
  version "1.0.0"
  sha256 "$SHA256"

  # Replace YOUR_GITHUB_USERNAME with your actual GitHub username
  url "https://github.com/YOUR_GITHUB_USERNAME/IdleDectorSpidey/releases/download/v#{version}/SpideyWatch.zip"
  name "Spidey Watch"
  desc "A Spider-Man desktop companion that goes berserk when you are idle"
  homepage "https://github.com/YOUR_GITHUB_USERNAME/IdleDectorSpidey"

  app "SpideyWatch.app"

  zap trash: [
    "~/Library/Preferences/com.arnavrathod.SpideyWatch.plist",
    "~/Library/Saved Application State/com.arnavrathod.SpideyWatch.savedState"
  ]
end
EOF

echo "=== Packaging Completed ==="
echo "1. Upload 'SpideyWatch.zip' to a GitHub Release (tagged v1.0.0) in your repository."
echo "2. Create a GitHub repository named 'homebrew-tap' (e.g. github.com/YOUR_GITHUB_USERNAME/homebrew-tap)."
echo "3. Add the generated '$CASK_FILE' file to that repository."
echo "4. Anyone can then install your app by running:"
echo "   brew tap YOUR_GITHUB_USERNAME/tap"
echo "   brew install --cask spidey-watch"
