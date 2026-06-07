// Mode interface (Strategy pattern). Each play mode satisfies this contract.
//
//   key:        string                        // 'free' | 'drill1' | 'drill2' | 'drill3'
//   name:       string                        // display name in picker + pill
//   icon:       string                        // emoji shown on picker card
//   desc:       string                        // one-liner shown on picker card
//   timed:      boolean                       // false → no timer, no session summary
//   showsHint:  boolean                       // whether the "💡 Hint" button is shown
//   showsDice:  boolean                       // whether the dice + roll button are shown
//
//   setup(store, round):    void              // mutate STATE.locked and pre-fill locked values
//   targetText(round):      string            // string shown in #target-display
//
// All four implementations live as sibling files; the registry is in ./index.js.

export const formatTime = (r) => `${r.hour}:${String(r.minute).padStart(2, '0')}`;

export const periodIcon = (r) => ((r.hour24 >= 6 && r.hour24 < 18) ? '☀' : '🌙');
