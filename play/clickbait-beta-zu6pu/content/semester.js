// The semester's shape: settings, the class schedule, and the timeline of "slots".
// Times are written as if one week = 90 seconds; the game stretches them by config.pace.
// Each slot is filled with a random item from the pools in classes.js, stories.js and messages.js,
// so every game has the same pacing but different content. A class code makes the draw the same for everyone.

window.CONTENT = {
  config: {
    weeks: 4,
    weekSeconds: 90,
    pace: 2.5,
    slowFactor: 1.1,
    startMoney: 30,
    weeklyAllowance: 40,
    allowanceCut: 5,
    minAllowance: 10,
    startStress: 20,
    weeklyStress: 5,
    missesToFail: 2,
    arcadeReliefPerWeek: 10,
    profReplyWindow: 60,
    playerName: 'Alex',
    version: '0.1.0-beta'
  },

  // Three schedule tracks, one per drawn class. Due dates are [week, day] (day 1 = Monday, 7 = Sunday).
  // A class's next module opens when its previous quiz closes.
  tracks: [
    [[2, 4], [3, 7], [4, 7]],
    [[2, 7], [4, 7]],
    [[3, 5], [4, 7]]
  ],

  // The timeline. Module emails (corrections, updates, recaps…) are timed from each module instead.
  slots: [
    { at: 5, kind: 'welcome' },
    { at: 20, kind: 'friend' },
    { at: 35, kind: 'story', ask: 45, channel: 'email', parent: 'Dad', window: 130 },
    { at: 62, kind: 'meme', window: 45 },
    { at: 95, kind: 'phish', window: 120 },
    { at: 125, kind: 'ad', window: 50 },
    { at: 140, kind: 'friend' },
    { at: 152, kind: 'checkin', window: 40 },
    { at: 186, kind: 'grade', parent: 'Mom', window: 60 },
    { at: 200, kind: 'story', ask: 210, channel: 'text', parent: 'Mom', window: 110 },
    { at: 205, kind: 'logistics', window: 45 },
    { at: 246, kind: 'friend', free: true },
    { at: 255, kind: 'phish', window: 80 },
    { at: 275, kind: 'smish', window: 60 },
    { at: 285, kind: 'story', ask: 295, channel: 'email', parent: 'Dad', window: 60 },
    { at: 300, kind: 'checkin', window: 40 },
    { at: 310, kind: 'friend' },
    { at: 318, kind: 'friend' },
    { at: 325, kind: 'logistics', window: 30 },
    { at: 330, kind: 'grade', parent: 'Mom', window: 25 }
  ],

  parents: {
    Mom: { email: 'momgoose1968@honkmail.com', sign: 'xoxo Mom' },
    Dad: { email: 'big.goose.dad@honkmail.com', sign: 'Love, Dad' }
  },

  gradeAsks: [
    { subject: 'How is {course} going?', body: `<p>Hi sweetie!</p><p>Your aunt Linda keeps asking how you're doing in {course}. What's your grade right now? Be honest!</p><p class="hint">Tip: your current grade is on Noodle.</p>` },
    { subject: '{code}??', body: `<p>Hi honey,</p><p>Grandma wants to know how {course} is going. What's your grade? She's very invested.</p>` }
  ],

  endings: [
    { min: 0.6, title: 'The Golden Age of Gooseberry', icon: '🌅', text: `Gooseberry Falls becomes famous for checking its facts. Rumors don't stand a chance, and the ducks are thriving.` },
    { min: 0, title: 'Hopeful Days', icon: '🌤️', text: 'Things are messy, but more people are asking "who says?" before they share.' },
    { min: -0.5, title: 'Foggy Times', icon: '🌫️', text: `Nobody's quite sure what's true anymore. Most people just stopped watching the news.` },
    { min: -Infinity, title: 'The Age of Rumors', icon: '🌪️', text: 'The Duck Riots were only the beginning. Every headline is a fight, and the loudest rumor wins.' }
  ]
};

CONTENT.courses = window.CONTENT_CLASSES;
CONTENT.stories = window.CONTENT_STORIES;
CONTENT.pools = window.CONTENT_POOLS;
