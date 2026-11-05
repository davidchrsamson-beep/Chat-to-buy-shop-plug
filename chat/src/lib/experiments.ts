// errand's three engagement experiments. Turn each on (true) or off (false), save,
// and the page updates, so you can test which ones fit errand best.
export const EXPERIMENTS = {
  // 1. A live "Just found" line on the home screen: what errand recently found, and where.
  justFound: false, // removed from the home screen (the photo strip already moves)
  // 2. Quick-tap chips above the message box: Tonight, Delivered, Near me.
  quickChips: false, // removed for now
  // Shor plug chat: automatic help (asking for delivery details right after the first message,
  // and the "your request is in" reply). OFF while the team runs every conversation by hand.
  // The team asks for details with the "Ask for delivery details" button in the inbox instead.
  autoAssist: false,
  // 3. An animation while errand searches: shimmering cards + what it's checking right now.
  searchingAnimation: true,
};
