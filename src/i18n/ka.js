// ქართული (ka). Mirror of en.js keys.

export default {
  app: {
    title: 'საათის სათამაშო',
    back: '← სავარჯიშოები',
    chooseMode: 'აირჩიე რეჟიმი',
  },

  picker: {
    pickMode: 'აირჩიე რეჟიმი',
    pickDifficulty: 'აირჩიე სირთულე',
    backToModes: '↩ უკან რეჟიმებზე',
    perRound: '{n} წმ/რაუნდი',
  },

  modes: {
    free:   { name: 'თავისუფალი',          desc: 'ტაიმერის გარეშე. დასვი, ითამაშე, ისიამოვნე.' },
    drill1: { name: 'დააყენე საათი',        desc: 'გააფასე დრო. დააყენე ისრები და სლაიდერი.' },
    drill2: { name: 'წაიკითხე საათი',       desc: 'ისრები დაყენებულია. გადააადგილე სლაიდერი.' },
    drill3: { name: 'ააწყე სლაიდერებიდან',  desc: 'სლაიდერი დაყენებულია. გადააადგილე ისრები.' },
  },

  difficulties: {
    easy:   { name: 'მარტივი', desc: 'მხოლოდ ნახევარი საათები' },
    medium: { name: 'საშუალო', desc: 'ყოველი 5 წუთი' },
    hard:   { name: 'რთული',   desc: 'ნებისმიერი წუთი, ისარი დახრილია' },
  },

  prompts: {
    readTheClock:    'წაიკითხე საათი!',
    matchTheSliders: 'შეუსაბამე სლაიდერებს!',
  },

  buttons: {
    roll:       '🎲 დაასტყვი!',
    check:      '✓ შემოწმება!',
    next:       'შემდეგი →',
    hint:       '💡 მინიშნება',
    tryAgain:   '↻ თავიდან',
    chooseMode: '↩ აირჩიე რეჟიმი',
  },

  rails: { hour: 'საათი', minute: 'წუთი' },

  parts: {
    morning:   'დილით',
    afternoon: 'შუადღით',
    evening:   'საღამოს',
    night:     'ღამით',
  },

  errors: {
    hourHand:     'საათის ისარი',
    minuteHand:   'წუთის ისარი',
    hourSlider:   'საათის სლაიდერი',
    minuteSlider: 'წუთის სლაიდერი',
    amPm:         'დღე თუ ღამე',
    ranOutOfTime: 'დრო ამოგვეწურა',
  },

  feedback: {
    correctTitle:  '✓ {time} — სწორედ ასე!',
    correctBody:   `ეს არის {time} {partOfDay}. {icon}`,
    wrongTitle:    'თითქმის! შეამოწმე {error}.',
    wrongBody:     'სწორი დრო იყო <b>{time}</b> (საათი {hour}, წუთი {minute}).',
    moreErrors:    ' (გასასწორებელია {n} ცალი)',
    timeoutTitle:  `⏱ დრო ამოგვეწურა! სწორი დრო იყო {time}.`,
    timeoutBody:   'შემდეგ რაუნდში სცადე უფრო ჩქარა.',
    hintTitle:     '💡 როგორ წავიკითხოთ წუთის ისარი',
    hintBody:      `<b style="color:var(--hand-m)">ლურჯი ისარი</b> ყოველთვის ერთ-ერთ გარე ნიშნულზე მიუთითებს.<br>პატარა ციფრი (5, 10, 15… 60) ამ ნიშნულზე არის წუთი — <b>არა</b> დიდი ფერადი წრე ქვემოთ.`,
  },

  summary: {
    title:        'სესია დასრულდა!',
    correct:      'სწორი',
    accuracy:     'სიზუსტე',
    avgTime:      'საშ. დრო',
    bestStreak:   'საუკეთესო სერია',
    timeouts:     'დაგვიანებები',
    missesOf:     '{kind}-ის შეცდომები',
    noMisses:     'შეცდომის გარეშე',
    verdictPromote:   '<strong>🎉 გადახვედი!</strong> მზად ხარ <b>{next}</b>-ისთვის.',
    verdictPass:      '<strong>✓ ჩააბარე.</strong> გაიმეორე <b>{current}</b> სიჩქარისთვის.',
    verdictKeepGoing: '<strong>გააგრძელე!</strong> გაიმეორე <b>{current}</b> და გადახედე შეცდომებს.',
    verdictTryEasy:   '<strong>ჯერ მარტივი რეჟიმი სცადე</strong>, რომ საფუძველი დაამყარო.',
  },

  stats: {
    timePerRound: 'რაუნდის დრო',
    streak:       'სერია',
    correct:      'სწორი',
  },
};
