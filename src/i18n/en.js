// English (en). Master locale — every other locale should mirror these keys.
// Placeholders are written as {name} and substituted by `t()`.

export default {
  app: {
    title: 'Clock Toy',
    back: '← Gyms',
    chooseMode: 'Choose Mode',
  },

  picker: {
    pickMode: 'Pick a mode',
    pickDifficulty: 'Pick a difficulty',
    backToModes: '↩ Back to modes',
    perRound: '{n}s/round',
  },

  modes: {
    free:   { name: 'Free Play',          desc: 'No timer. Roll, set, play around.' },
    drill1: { name: 'Set the Clock',      desc: 'Roll. Match the time with hands AND sliders.' },
    drill2: { name: 'Read the Clock',     desc: 'Hands are set. Slide the sliders to read the time.' },
    drill3: { name: 'Build from Sliders', desc: 'Sliders are set. Place the hands to match.' },
  },

  difficulties: {
    easy:   { name: 'Easy',   desc: 'Half-hour times only'      },
    medium: { name: 'Medium', desc: 'Every 5 minutes'           },
    hard:   { name: 'Hard',   desc: 'Any minute, hour drifts'   },
  },

  prompts: {
    readTheClock:   'Read the clock!',
    matchTheSliders: 'Match the sliders!',
  },

  buttons: {
    roll:       '🎲 Roll!',
    check:      '✓ Check!',
    next:       'Next →',
    hint:       '💡 Hint',
    tryAgain:   '↻ Try again',
    chooseMode: '↩ Choose mode',
  },

  rails: { hour: 'HOUR', minute: 'MINUTE' },

  parts: {
    morning:   'morning',
    afternoon: 'afternoon',
    evening:   'evening',
    night:     'night',
  },

  errors: {
    hourHand:    'hour hand',
    minuteHand:  'minute hand',
    hourSlider:  'hour slider',
    minuteSlider: 'minute slider',
    ranOutOfTime: 'ran out of time',
  },

  feedback: {
    correctTitle:  '✓ {time} — exactly right!',
    correctBody:   `That's {time} in the {partOfDay}. {icon}`,
    wrongTitle:    'Almost! Check the {error}.',
    wrongBody:     'Target was <b>{time}</b> (hour {hour}, minute {minute}).',
    moreErrors:    ' ({n} parts to fix)',
    timeoutTitle:  `⏱ Time's up! The time was {time}.`,
    timeoutBody:   'Try to read the clock a little quicker next round.',
    hintTitle:     '💡 Reading the minute hand',
    hintBody:      `The <b style="color:var(--hand-m)">blue hand</b> always points at a tick on the outer ring.<br>The little number (5, 10, 15… 60) at that tick is the minute — <b>not</b> the big hour bubble underneath.`,
  },

  summary: {
    title:        'Session Complete!',
    correct:      'correct',
    accuracy:     'Accuracy',
    avgTime:      'Avg time',
    bestStreak:   'Best streak',
    timeouts:     'Timeouts',
    missesOf:     '{kind} misses',
    noMisses:     'No misses',
    verdictPromote:   '<strong>🎉 Promote!</strong> Ready for <b>{next}</b>.',
    verdictPass:      '<strong>✓ Pass.</strong> Repeat <b>{current}</b> to build speed.',
    verdictKeepGoing: '<strong>Keep going!</strong> Repeat <b>{current}</b> and study the misses.',
    verdictTryEasy:   '<strong>Try Easy mode first</strong> to lock in the basics.',
  },

  stats: {
    timePerRound: 'time per round',
    streak:       'streak',
    correct:      'correct',
  },
};
