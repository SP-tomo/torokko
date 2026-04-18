import { SoundEngine } from './src/modules/SoundEngine.js';
import { SceneManager } from './src/modules/SceneManager.js';
import { TelopSystem } from './src/modules/TelopSystem.js';
import { Narrator } from './src/modules/Narrator.js';
import { DirectorQueue } from './src/modules/DirectorQueue.js';
import { TELOP_LINES } from './src/data/telop_lines.js';
import { NARRATOR_LINES } from './src/data/narrator_lines.js';

const GameState = {
  TITLE: 'TITLE',
  TEAM_INTRO: 'TEAM_INTRO',
  QUESTION: 'QUESTION',
  JUDGING: 'JUDGING',
  SUSPENSE: 'SUSPENSE',
  REVEAL: 'REVEAL',
  INTERMISSION: 'INTERMISSION',
  TEAM_RESULT: 'TEAM_RESULT',
  FINAL_RESULT: 'FINAL_RESULT',
  GAMEOVER: 'GAMEOVER',
};

const TEAMS = [
  { id: 'A', name: 'チームA', color: '#ff6b6b', key: 'A' },
  { id: 'B', name: 'チームB', color: '#4dabf7', key: 'B' },
  { id: 'C', name: 'チームC', color: '#51cf66', key: 'C' },
  { id: 'D', name: 'チームD', color: '#ffd43b', key: 'D' },
];

// 7 available themes — randomly shuffled into 5 stages each game
const ALL_THEMES = [
  { id: 'cave',       name: '洞窟ゾーン' },
  { id: 'jungle',     name: 'ジャングルゾーン' },
  { id: 'temple',     name: '神殿ゾーン' },
  { id: 'ice',        name: '氷河ゾーン' },
  { id: 'underwater', name: '海底ゾーン' },
  { id: 'space',      name: '宇宙ゾーン' },
  { id: 'cloud',      name: '雲海ゾーン' },
];
const N_STAGES = 5;

function generateStageThemes() {
  // Shuffle all themes and take the first N_STAGES
  return [...ALL_THEMES].sort(() => Math.random() - 0.5).slice(0, N_STAGES);
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmt  = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

class TrolleyAdventure {
  constructor() {
    this.state = GameState.TITLE;
    this.questionBank = {};      // {A:[...], B:[...], C:[...], D:[...]}
    this.teamScores = {};        // {A: {score,cleared,answered}, ...}
    this.currentTeamIdx = 0;
    this.currentIndex = 0;
    this.timer = 5.0;
    this.timerInterval = null;
    this.selectedChoice = null;

    // Load settings (timer, question count)
    const saved = localStorage.getItem('trolley_settings_v2');
    const settings = saved ? JSON.parse(saved) : {};
    this.timerDuration = settings.timerSec ?? 5;
    this.questionCount = settings.questionCount ?? 10;

    this.sounds   = new SoundEngine();
    this.canvas   = document.getElementById('bg-canvas');
    this.scene    = new SceneManager(this.canvas);
    this.director = new DirectorQueue();
    this.stageThemes = generateStageThemes(); // regenerated each game

    this.els = {
      app:           document.getElementById('app'),
      qText:         document.getElementById('question-text'),
      choiceLeft:    document.getElementById('choice-left'),
      choiceRight:   document.getElementById('choice-right'),
      textLeft:      document.getElementById('text-left'),
      textRight:     document.getElementById('text-right'),
      timerFill:     document.getElementById('timer-fill'),
      trolley:       document.getElementById('trolley'),
      overlay:       document.getElementById('overlay-layer'),
      overlayTitle:  document.getElementById('overlay-title'),
      overlayDesc:   document.getElementById('overlay-desc'),
      startBtn:      document.getElementById('start-btn'),
      qCounter:      document.getElementById('q-index'),
      judgeOverlay:  document.getElementById('judge-text-overlay'),
      particles:     document.getElementById('particles-container'),
      telopStack:    document.getElementById('telop-stack'),
      narratorPanel: document.getElementById('narrator-panel'),
      stageCard:     document.getElementById('stage-card'),
      stageCardNum:  document.getElementById('stage-card-num'),
      stageCardName: document.getElementById('stage-card-name'),
      spotlight:     document.getElementById('spotlight-sweep'),
      teamBadge:     document.getElementById('team-badge'),
      scoreBoard:    document.getElementById('score-board'),
      pointDisplay:  document.getElementById('point-display'),
    };

    this.telops   = new TelopSystem(this.els.telopStack);
    this.narrator = new Narrator(this.els.narratorPanel);

    this.init();
  }

  async init() {
    const localData = localStorage.getItem('trolley_questions_v2');
    if (localData) {
      this.questionBank = JSON.parse(localData);
    } else {
      const resp = await fetch('./assets/data/questions.json');
      this.questionBank = await resp.json();
    }

    TEAMS.forEach(t => {
      this.teamScores[t.id] = { score: 0, cleared: false, answered: 0 };
    });

    this.scene.update();
    this.els.startBtn.onclick = () => this.startAllTeams();
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.els.choiceLeft.onclick  = () => this.selectChoice('left');
    this.els.choiceRight.onclick = () => this.selectChoice('right');

    this.updateScoreBoard();
    this.showOverlay('TROLLEY ADVENTURE', `4チーム対抗戦・全${this.questionCount}問`, 'ゲームスタート');
  }

  // ── TEAM FLOW ────────────────────────────────────────────────────
  startAllTeams() {
    this.currentTeamIdx = 0;
    this.stageThemes = generateStageThemes(); // new random order each game
    this.sounds.init();
    this.sounds.ensureRunning();
    this.hideOverlay();
    this.startTeamRun();
  }

  startTeamRun() {
    const team = TEAMS[this.currentTeamIdx];
    this.currentIndex = 0;
    this.teamScores[team.id] = { score: 0, cleared: false, answered: 0 };
    this._applyTeamColor(team);
    this.updateTeamBadge();

    this.state = GameState.TEAM_INTRO;
    this.director.cancel();
    this.narrator.hideNow();
    this.telops.clear();
    this.els.app.classList.remove('running', 'correct-bg-flash', 'shake', 'dimmed', 'big-reveal-flash', 'fall-shake');
    this.els.spotlight.classList.remove('active');
    this.els.judgeOverlay.classList.remove('active');
    this.els.trolley.className = 'trolley';

    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    this.sounds.stopBGM();

    // Show stage intro card
    const stageIdx = this._stageOf(0);
    this.els.stageCardNum.textContent = this.stageThemes[stageIdx]?.name ?? 'STAGE 1';
    this.els.stageCardName.textContent = `${team.name} の挑戦！`;
    this.els.stageCard.classList.remove('hidden');
    const card = this.els.stageCard;
    card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';

    this.sounds.playWipe(0.5);
    setTimeout(() => this.sounds.playStageFanfare(), 300);
    this.narrator.say(`${team.name}、いよいよ出発だ！`, { speedMs: 45 });

    this.director.play([
      { wait: 2400, fn: () => {
        this.els.stageCard.classList.add('hidden');
        this.sounds.startBGM();
        this.nextQuestion();
      }},
    ]);
  }

  endTeamRun(cleared) {
    const team = TEAMS[this.currentTeamIdx];
    const score = this.teamScores[team.id];
    score.cleared = cleared;
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    this.sounds.stopBGM();
    this.state = GameState.TEAM_RESULT;

    this.updateScoreBoard();

    const allDone = this.currentTeamIdx >= TEAMS.length - 1;
    const nextLabel = allDone ? '最終結果を見る' : `次：${TEAMS[this.currentTeamIdx + 1].name}`;
    const desc = `${team.name} の結果：${score.score.toLocaleString()} pt\n${cleared ? '完走！' : `${score.answered}問正解`}`;

    if (cleared) { this.sounds.playApplause(2.0); }

    setTimeout(() => {
      this.showOverlay(cleared ? '完走！' : 'ゲームオーバー', desc, nextLabel);
    }, 1200);

    this.els.startBtn.onclick = () => {
      this.hideOverlay();
      if (allDone) {
        this.showFinalResult();
      } else {
        this.currentTeamIdx++;
        this.startTeamRun();
      }
    };
  }

  showFinalResult() {
    this.state = GameState.FINAL_RESULT;
    this.sounds.playApplause(3.5);

    const sorted = [...TEAMS]
      .map(t => ({ ...t, ...this.teamScores[t.id] }))
      .sort((a, b) => b.score - a.score);

    const medals = ['🥇', '🥈', '🥉', '　'];
    const body = sorted
      .map((t, i) => `${medals[i]} ${t.name}：${t.score.toLocaleString()} pt${t.cleared ? '（完走）' : ''}`)
      .join('\n');

    this.showOverlay('最終結果', body, 'もう一度');
    this.telops.push(`優勝：${sorted[0].name}！`, 'variant-gold', { lifetime: 6000 });
    this.narrator.say(`優勝は${sorted[0].name}！おめでとう！`, { speedMs: 45 });

    this.els.startBtn.onclick = () => {
      this.hideOverlay();
      this.currentTeamIdx = 0;
      TEAMS.forEach(t => { this.teamScores[t.id] = { score: 0, cleared: false, answered: 0 }; });
      this.updateScoreBoard();
      this._applyTeamColor(TEAMS[0]);
      this.updateTeamBadge();
      this.showOverlay('TROLLEY ADVENTURE', `4チーム対抗戦・全${this.questionCount}問`, 'ゲームスタート');
      this.els.startBtn.onclick = () => { this.startAllTeams(); };
    };
  }

  // ── QUESTION LOOP ────────────────────────────────────────────────
  nextQuestion() {
    if (this.currentIndex >= this.questionCount) {
      this.endTeamRun(true);
      return;
    }

    this.state = GameState.QUESTION;
    this.selectedChoice = null;
    this.timer = this.timerDuration;
    this.updateHUD();
    this.updatePointDisplay();

    const stageIdx = this._stageOf(this.currentIndex);
    const theme     = this.stageThemes[stageIdx]?.id ?? 'cave';
    this.scene.setTheme(theme);
    this.scene.speed = 1.0;
    this.scene.shake = 2;
    this.sounds.setVolume(0.5);

    // Show stage transition card when stage changes
    if (this.currentIndex > 0) {
      const prevStage = this._stageOf(this.currentIndex - 1);
      if (prevStage !== stageIdx) {
        this.els.stageCardNum.textContent  = this.stageThemes[stageIdx]?.name ?? `STAGE ${stageIdx+1}`;
        this.els.stageCardName.textContent = `ステージ ${stageIdx+1}`;
        this.els.stageCard.classList.remove('hidden');
        const card = this.els.stageCard;
        card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
        setTimeout(() => this.els.stageCard.classList.add('hidden'), 2200);
      }
    }

    const q = this._currentQuestion();
    this.els.qText.innerText = q.q;
    this.els.textLeft.innerText  = q.l;
    this.els.textRight.innerText = q.r;

    this.els.choiceLeft.classList.remove('selected');
    this.els.choiceRight.classList.remove('selected');
    this.els.trolley.className = 'trolley';
    this.els.judgeOverlay.classList.remove('active');
    this.els.app.classList.remove(
      'running', 'correct-bg-flash', 'shake', 'dimmed', 'big-reveal-flash', 'fall-shake'
    );
    this.els.spotlight.classList.remove('active');
    this.els.timerFill.style.transform = 'scaleX(1)';

    const qNum = this.currentIndex + 1;
    try { this.sounds.playQuestionChime(); } catch(e) { console.warn('chime error', e); }
    try { this.telops.pushData(TELOP_LINES.questionStart(qNum)); } catch(e) {}
    try { this.narrator.say(fmt(pick(NARRATOR_LINES.questionStart), { n: qNum }), { speedMs: 40 }); } catch(e) {}

    this.startTimer();
  }

  /** Return which stage (0-based) a question index belongs to */
  _stageOf(i) {
    return Math.min(N_STAGES - 1, Math.floor(i / (this.questionCount / N_STAGES)));
  }

  _currentQuestion() {
    const team = TEAMS[this.currentTeamIdx];
    const qs = this.questionBank[team.id] || this.questionBank[team.key] || [];
    return qs[this.currentIndex] || { q: '問題なし', l: 'A', r: 'B', a: 'left' };
  }

  updateHUD() {
    this.els.qCounter.innerText = `${this.currentIndex + 1}`;
  }

  updateTeamBadge() {
    const team = TEAMS[this.currentTeamIdx];
    if (this.els.teamBadge) {
      this.els.teamBadge.textContent = team.name;
      this.els.teamBadge.style.background = team.color;
      this.els.teamBadge.style.color = this._isDark(team.color) ? '#fff' : '#111';
    }
  }

  updatePointDisplay() {
    const team = TEAMS[this.currentTeamIdx];
    const score = this.teamScores[team.id].score;
    if (this.els.pointDisplay) {
      this.els.pointDisplay.textContent = score.toLocaleString() + ' pt';
    }
  }

  updateScoreBoard() {
    const el = this.els.scoreBoard;
    if (!el) return;
    el.innerHTML = TEAMS.map(t => {
      const s = this.teamScores[t.id];
      const active = t.id === TEAMS[this.currentTeamIdx].id;
      return `<div class="sb-row${active ? ' active' : ''}" style="--tc:${t.color}">
        <span class="sb-name">${t.name}</span>
        <span class="sb-score">${s.score.toLocaleString()} pt</span>
      </div>`;
    }).join('');
  }

  _applyTeamColor(team) {
    document.documentElement.style.setProperty('--team-color', team.color);
  }

  _isDark(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return (r*299 + g*587 + b*114) / 1000 < 128;
  }

  // ── TIMER ────────────────────────────────────────────────────────
  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timer -= 0.05;
      this.els.timerFill.style.transform = `scaleX(${Math.max(0, this.timer) / this.timerDuration})`;
      if (this.timer < 2.0 && this.timer > 0) {
        this.sounds.playIntensifyTick(this.timer / 2.0);
      }
      if (this.timer <= 0) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.enterJudging();
      }
    }, 50);
  }

  handleKeyDown(e) {
    if (this.state !== GameState.QUESTION) return;
    if (e.key === 'ArrowLeft')  this.selectChoice('left');
    if (e.key === 'ArrowRight') this.selectChoice('right');
  }

  selectChoice(side) {
    if (this.state !== GameState.QUESTION) return;
    const isNew = this.selectedChoice !== side;
    this.selectedChoice = side;
    this.sounds.playSelect();
    this.els.choiceLeft.classList.toggle('selected',  side === 'left');
    this.els.choiceRight.classList.toggle('selected', side === 'right');
    this.els.trolley.className = `trolley tilt-${side}`;
    if (isNew) {
      this.telops.pushData(side === 'left' ? TELOP_LINES.selectLeft : TELOP_LINES.selectRight);
      this.narrator.say(fmt(pick(NARRATOR_LINES.selected), { side: side === 'left' ? '左' : '右' }), { speedMs: 40 });
    }
  }

  // ── JUDGE PHASES ─────────────────────────────────────────────────
  enterJudging() {
    if (this.state !== GameState.QUESTION) return;
    this.state = GameState.JUDGING;
    this.els.app.classList.add('running');
    this.scene.speed = 5.0;
    this.scene.shake = 10;

    const q = this._currentQuestion();
    const isCorrect = (this.selectedChoice === q.a);

    this.director.play([
      { wait: 1200, fn: () => this.enterSuspense(isCorrect) },
    ]);
  }

  enterSuspense(isCorrect) {
    this.state = GameState.SUSPENSE;
    this.sounds.setVolume(0.22);
    this.scene.speed = 1.5;
    this.scene.shake = 4;
    this.els.app.classList.add('dimmed');
    this.els.spotlight.classList.add('active');
    this.telops.pushData(TELOP_LINES.suspense);
    this.narrator.say(pick(NARRATOR_LINES.suspense), { speedMs: 55 });

    this.director.play([
      { wait: 2000, fn: () => this.enterReveal(isCorrect) },
    ]);
  }

  enterReveal(isCorrect) {
    this.state = GameState.REVEAL;
    this.sounds.setVolume(0.5);
    this.els.spotlight.classList.remove('active');
    this.els.app.classList.remove('dimmed');
    this.els.app.classList.add('big-reveal-flash');
    this.sounds.playDramaticSting();

    const team = TEAMS[this.currentTeamIdx];

    if (isCorrect) {
      const pts = 100 + this.currentIndex * 50;
      this.teamScores[team.id].score += pts;
      this.teamScores[team.id].answered++;
      this.sounds.playApplause(1.5);
      this.sounds.playCorrect();
      this.els.judgeOverlay.innerText = '正解';
      this.els.judgeOverlay.className = 'active text-correct';
      this.telops.pushData(TELOP_LINES.correct);
      this.telops.push(`+${pts} pt`, 'variant-blue', { lifetime: 2000 });
      this.createParticles('#ffd700', 28);
      this.narrator.say(pick(NARRATOR_LINES.correct), { speedMs: 45 });
      this.updatePointDisplay();
      this.updateScoreBoard();

      this.director.play([
        { wait: 2400, fn: () => this.advance() },
      ]);
    } else {
      this.sounds.playGasp();
      this.sounds.playIncorrect();
      this.els.app.classList.add('shake');
      this.els.judgeOverlay.innerText = '不正解';
      this.els.judgeOverlay.className = 'active text-incorrect';
      this.els.trolley.classList.add('fall');
      this.telops.pushData(TELOP_LINES.incorrect);
      this.narrator.say(pick(NARRATOR_LINES.incorrect), { speedMs: 45 });
      this.scene.speed = 0; this.scene.shake = 0;
      setTimeout(() => this.els.app.classList.add('fall-shake'), 300);

      this.director.play([
        { wait: 3000, fn: () => this.endTeamRun(false) },
      ]);
    }
  }

  advance() {
    this.currentIndex++;
    const prevStage = stageOf(this.currentIndex - 1, this.questionCount);
    const currStage = this.currentIndex < this.questionCount ? stageOf(this.currentIndex, this.questionCount) : -1;
    if (currStage > prevStage) {
      this.playStageIntermission(currStage + 1);
    } else {
      this.nextQuestion();
    }
  }

  playStageIntermission(stageNum) {
    this.state = GameState.INTERMISSION;
    const stageName = STAGE_NAME(this.currentIndex, this.questionCount);
    this.els.stageCardNum.textContent = `STAGE ${stageNum}`;
    this.els.stageCardName.textContent = stageName;
    this.els.stageCard.classList.remove('hidden');
    const card = this.els.stageCard;
    card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';

    this.sounds.playWipe(0.5);
    setTimeout(() => this.sounds.playStageFanfare(), 400);
    this.telops.pushData(TELOP_LINES.stageStart(stageNum));
    this.narrator.say(fmt(pick(NARRATOR_LINES.stageChange), { s: stageNum }), { speedMs: 45 });

    this.director.play([
      { wait: 2200, fn: () => { this.els.stageCard.classList.add('hidden'); this.nextQuestion(); } },
    ]);
  }

  // ── PARTICLES ────────────────────────────────────────────────────
  createParticles(color, count = 30) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.style.cssText = 'position:absolute;left:50%;top:50%;width:10px;height:10px;border-radius:2px;';
      p.style.background = color;
      this.els.particles.appendChild(p);
      const angle = Math.random() * Math.PI * 2;
      const dist  = Math.random() * 800 + 400;
      p.animate([
        { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
        { transform: `translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px) rotate(360deg)`, opacity: 0 },
      ], { duration: 1500, easing: 'cubic-bezier(0,.9,.1,1)' }).onfinish = () => p.remove();
    }
  }

  // ── OVERLAY ───────────────────────────────────────────────────────
  showOverlay(title, desc, btnLabel = 'START') {
    this.els.overlayTitle.innerText = title;
    this.els.overlayDesc.innerText  = desc;
    this.els.startBtn.innerText     = btnLabel;
    this.els.overlay.classList.remove('hidden');
  }

  hideOverlay() {
    this.els.overlay.classList.add('hidden');
  }
}

window.addEventListener('load', () => new TrolleyAdventure());
