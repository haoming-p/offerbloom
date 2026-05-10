// Shared Bloom avatar — used by both the file-review chat (FileAIChat)
// and the per-question prep AI assistant (AIAssistantPanel) so the brand
// stays consistent across the app.
const BloomAvatar = ({ size = 32 }) => (
  <img
    src="/bloomcat.jpeg"
    alt="Bloom"
    style={{ width: size, height: size }}
    className="rounded-2xl object-cover ring-2 ring-orange-200 flex-shrink-0"
  />
);

export default BloomAvatar;
