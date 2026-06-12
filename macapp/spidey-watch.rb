cask "spidey-watch" do
  version "1.0.1"
  sha256 "c26159bb3511d4bdac51315d82a77c69a5fa296b4ef273a4d311fab47c4c3924"

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
