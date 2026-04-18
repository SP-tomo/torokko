export const TELOP_LINES = {
  questionStart: (n) => ({ text: `第${n}問！`, variant: 'variant-gold' }),
  selectLeft:    { text: '左を選択！',   variant: 'variant-blue' },
  selectRight:   { text: '右を選択！',   variant: 'variant-red' },
  suspense:      { text: 'はたして…',    variant: 'variant-gold' },
  correct:       { text: '正解！！',     variant: 'variant-red' },
  incorrect:     { text: '不正解…',      variant: 'variant-blue' },
  stageClear:    (s) => ({ text: `STAGE ${s} CLEAR！`, variant: 'variant-gold' }),
  stageStart:    (s) => ({ text: `STAGE ${s} 開幕！`, variant: 'variant-red' }),
  finalCleared:  { text: '完全制覇！',   variant: 'variant-gold' },
  gameOver:      { text: '奈落へ…',      variant: 'variant-blue' },
};
