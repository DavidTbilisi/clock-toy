// Русский (ru). Mirror of en.js keys.

export default {
  app: {
    title: 'Часики',
    back: '← Игры',
    chooseMode: 'Выбери режим',
  },

  picker: {
    pickMode: 'Выбери режим',
    pickDifficulty: 'Выбери сложность',
    backToModes: '↩ Назад к режимам',
    perRound: '{n} сек/раунд',
  },

  modes: {
    free:   { name: 'Свободно',                desc: 'Без таймера. Крути, играй, изучай.' },
    drill1: { name: 'Поставь время',           desc: 'Время выпадает. Совмести стрелками И слайдерами.' },
    drill2: { name: 'Прочти время',            desc: 'Стрелки выставлены. Двигай слайдеры — читай время.' },
    drill3: { name: 'Собери из слайдеров',     desc: 'Слайдеры выставлены. Двигай стрелки, чтобы совпало.' },
  },

  difficulties: {
    easy:   { name: 'Лёгкая',  desc: 'Только полчаса' },
    medium: { name: 'Средняя', desc: 'Каждые 5 минут' },
    hard:   { name: 'Сложная', desc: 'Любая минута, часовая стрелка плывёт' },
  },

  prompts: {
    readTheClock:    'Прочти время!',
    matchTheSliders: 'Совмести со слайдерами!',
  },

  buttons: {
    roll:       '🎲 Кубик!',
    check:      '✓ Проверить!',
    next:       'Дальше →',
    hint:       '💡 Подсказка',
    tryAgain:   '↻ Ещё раз',
    chooseMode: '↩ Сменить режим',
  },

  rails: { hour: 'ЧАС', minute: 'МИНУТА' },

  parts: {
    morning:   'утром',
    afternoon: 'днём',
    evening:   'вечером',
    night:     'ночью',
  },

  errors: {
    hourHand:     'часовая стрелка',
    minuteHand:   'минутная стрелка',
    hourSlider:   'часовой слайдер',
    minuteSlider: 'минутный слайдер',
    amPm:         'утро или вечер',
    ranOutOfTime: 'время вышло',
  },

  feedback: {
    correctTitle:  '✓ {time} — точно так!',
    correctBody:   `Это {time} {partOfDay}. {icon}`,
    wrongTitle:    'Почти! Проверь: {error}.',
    wrongBody:     'Загадано было <b>{time}</b> (часы {hour}, минуты {minute}).',
    moreErrors:    ' (нужно исправить {n})',
    timeoutTitle:  `⏱ Время вышло! Это было {time}.`,
    timeoutBody:   'В следующий раунд попробуй немного быстрее.',
    hintTitle:     '💡 Как читать минутную стрелку',
    hintBody:      `<b style="color:var(--hand-m)">Синяя стрелка</b> всегда показывает на одну из чёрточек по краю.<br>Маленькая цифра (5, 10, 15… 60) у этой чёрточки — это минуты, <b>а не</b> большой кружок с часом под ней.`,
  },

  summary: {
    title:        'Сессия завершена!',
    correct:      'правильно',
    accuracy:     'Точность',
    avgTime:      'Среднее время',
    bestStreak:   'Лучшая серия',
    timeouts:     'Пропуски',
    missesOf:     '{kind} — ошибки',
    noMisses:     'Без ошибок',
    verdictPromote:   '<strong>🎉 Переход!</strong> Готов к <b>{next}</b>.',
    verdictPass:      '<strong>✓ Зачёт.</strong> Повтори <b>{current}</b> для скорости.',
    verdictKeepGoing: '<strong>Продолжай!</strong> Повтори <b>{current}</b> и разбери ошибки.',
    verdictTryEasy:   '<strong>Сначала попробуй Лёгкую</strong>, чтобы закрепить основы.',
  },

  stats: {
    timePerRound: 'время за раунд',
    streak:       'серия',
    correct:      'правильно',
  },
};
