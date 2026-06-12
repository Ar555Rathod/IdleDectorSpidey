cask "spidey-watch" do
  version "1.0.1"
  sha256 "5a01caa9b6dc173436d5cbc1e1bd65fd03c34dca8c118c8da930d30f86b8b493"

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
