const RANK_LABELS = { bronze: '銅', silver: '銀', gold: '金' };

export class PrizeHUD {
  constructor({ valueEl, rankEl, streakEl, amountEl }) {
    this.valueEl = valueEl;
    this.rankEl = rankEl;
    this.streakEl = streakEl;
    this.amountEl = amountEl;
    this.value = 0;
    this.correctCount = 0;
    this.streak = 0;
    this._paint();
  }

  reset() {
    this.value = 0;
    this.correctCount = 0;
    this.streak = 0;
    this._paint();
  }

  registerAnswer(isCorrect, reward = 100000) {
    if (isCorrect) {
      this.correctCount++;
      this.streak++;
      const streakBonus = Math.max(0, this.streak - 1) * 20000;
      this.value += reward + streakBonus;
    } else {
      this.streak = 0;
    }
    this._paint();
    this._bump();
  }

  getRank() {
    if (this.correctCount >= 7) return 'gold';
    if (this.correctCount >= 3) return 'silver';
    return 'bronze';
  }

  _paint() {
    if (this.valueEl) this.valueEl.textContent = this.value.toLocaleString('ja-JP');
    if (this.rankEl) this.rankEl.textContent = `ランク: ${RANK_LABELS[this.getRank()]}`;
    if (this.streakEl) {
      this.streakEl.textContent = this.streak >= 2 ? `${this.streak} 連続正解！` : '';
    }
  }

  _bump() {
    if (!this.amountEl) return;
    this.amountEl.classList.remove('bump');
    void this.amountEl.offsetWidth;
    this.amountEl.classList.add('bump');
  }
}
