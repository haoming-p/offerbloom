// Shared Bloom avatar — used by both the file-review chat (FileAIChat)
// and the per-question prep AI assistant (AIAssistantPanel) so the brand
// stays consistent across the app. The dashboard greeting uses ring=false
// at a larger size to read as a mascot, not as brand chrome.
const BloomAvatar = ({ size = 32, ring = true }) => (
  <img
    src="/bloomcat.jpeg"
    alt="Bloom"
    style={{ width: size, height: size }}
    className={`rounded-2xl object-cover flex-shrink-0 ${
      ring ? "ring-2 ring-orange-200" : ""
    }`}
  />
);

export default BloomAvatar;
