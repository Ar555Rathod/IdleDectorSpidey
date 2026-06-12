cask "spidey-watch" do
  version "1.0.2"
  sha256 "7372bda7a93636ce585dee4a4836f2701832c7eb0ef054a2b7e99feb0b7287bc"

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
