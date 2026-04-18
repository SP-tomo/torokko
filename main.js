import { SoundEngine } from './src/modules/SoundEngine.js';
import { SceneManager } from './src/modules/SceneManager.js';
import { SyncManager } from './src/modules/SyncManager.js';
import { TelopSystem } from './src/modules/TelopSystem.js';
import { Narrator } from './src/modules/Narrator.js';
import { TELOP_LINES } from './src/data/telop_lines.js';
import { NARRATOR_LINES } from './src/data/narrator_lines.js';

const GameState = {
  TITLE: 'TITLE',
  QUESTION: 'QUESTION',
  JUDGING: 'JUDGING',
  RESULT: 'RESULT',
  GAMEOVER: 'GAMEOVER'
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmt  = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

class TrolleyAdventureDisplay {
  constructor() {
    this.state = GameState.TITLE;
    this.questions = [];
    this.currentIndex = 0;
    this.timer = 5.0;
    this.selectedChoice = null;
    
    this.sounds = new SoundEngine();
    this.canvas = document.getElementById('bg-canvas');
    this.scene = new SceneManager(this.canvas);
    this.sync = new SyncManager(false);

    this.els = {
      app: document.getElementById('app'),
      qText: document.getElementById('question-text'),
      choiceLeft: document.getElementById('choice-left'),
      choiceRight: document.getElementById('choice-right'),
      textLeft: document.getElementById('text-left'),
      textRight: document.getElementById('text-right'),
      timerFill: document.getElementById('timer-fill'),
      trolley: document.getElementById('trolley'),
      overlay: document.getElementById('overlay-layer'),
      overlayTitle: document.getElementById('overlay-title'),
      overlayDesc: document.getElementById('overlay-desc'),
      qCounter: document.getElementById('q-index'),
      judgeOverlay: document.getElementById('judge-text-overlay'),
      particles: document.getElementById('particles-container'),
      telopStack: document.getElementById('telop-stack'),
      narratorPanel: document.getElementById('narrator-panel'),
    };

    // New Broadcast Components
    this.telops   = new TelopSystem(this.els.telopStack);
    this.narrator = new Narrator(this.els.narratorPanel);

    this.init();
  }

  async init() {
    const resp = await fetch('/assets/data/questions.json');
    this.questions = await resp.json();

    this.scene.update();
    this.setupSync();
    
    window.addEventListener('click', () => {
        this.sounds.init();
        this.hideOverlay();
    }, { once: true });

    this.showOverlay("TROLLEY ADVENTURE", "WAITING FOR CONTROLLER...");
  }

  setupSync() {
    this.sync.listen((type, payload) => {
      console.log("SYNC:", type, payload);
      switch(type) {
        case 'JUMP_TO': this.jumpTo(payload.index); break;
        case 'START_TIMER': this.startTimer(); break;
        case 'JUDGE': this.showJudgement(payload.result === 'correct'); break;
        case 'RESET': window.location.reload(); break;
      }
    });
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  jumpTo(index) {
    this.currentIndex = index;
    this.state = GameState.QUESTION;
    this.selectedChoice = null;
    this.timer = 5.0;
    this.updateHUD();
    this.hideOverlay();
    
    const q = this.questions[index];
    this.scene.setTheme(q.theme || 'cave');
    this.scene.speed = 1.0;
    this.scene.shake = 2;

    this.els.qText.innerText = q.question;
    this.els.textLeft.innerText = q.left.text;
    this.els.textRight.innerText = q.right.text;
    
    this.els.choiceLeft.classList.remove('selected');
    this.els.choiceRight.classList.remove('selected');
    this.els.trolley.className = 'trolley';
    this.els.judgeOverlay.classList.remove('active');
    this.els.app.classList.remove('running', 'correct-bg-flash', 'shake');
    this.els.timerFill.style.transform = `scaleX(1)`;
    
    this.sounds.startBGM();

    // Broadcast Effects
    const qNum = this.currentIndex + 1;
    this.telops.pushData(TELOP_LINES.questionStart(qNum));
    this.narrator.say(fmt(pick(NARRATOR_LINES.questionStart), { n: qNum }), { speedMs: 40 });
  }

  startTimer() {
    this.state = GameState.QUESTION;
    // Possible start SE here
  }

  handleKeyDown(e) {
    if (this.state !== GameState.QUESTION) return;
    if (e.key === 'ArrowLeft') this.selectChoice('left');
    if (e.key === 'ArrowRight') this.selectChoice('right');
  }

  selectChoice(side) {
    if (this.state !== GameState.QUESTION) return;
    if (this.selectedChoice === side) return;
    
    this.selectedChoice = side;
    this.sounds.playSelect();
    this.els.choiceLeft.classList.toggle('selected', side === 'left');
    this.els.choiceRight.classList.toggle('selected', side === 'right');
    this.els.trolley.className = `trolley tilt-${side}`;

    // Broadcast Effects
    this.telops.pushData(side === 'left' ? TELOP_LINES.selectLeft : TELOP_LINES.selectRight);
    this.narrator.say(fmt(pick(NARRATOR_LINES.selected), { side: side === 'left' ? '左' : '右' }), { speedMs: 40 });
  }

  showJudgement(isCorrect) {
    this.state = GameState.JUDGING;
    this.els.app.classList.add('running');
    this.scene.speed = 5.0;
    this.scene.shake = 15;
    
    this.telops.pushData(TELOP_LINES.suspense);
    this.narrator.say(pick(NARRATOR_LINES.suspense), { speedMs: 55 });

    setTimeout(() => {
      if (isCorrect) {
        this.sounds.playCorrect();
        this.els.app.classList.add('correct-bg-flash');
        this.els.judgeOverlay.innerText = "正解";
        this.els.judgeOverlay.className = "active text-correct";
        this.telops.pushData(TELOP_LINES.correct);
        this.narrator.say(pick(NARRATOR_LINES.correct), { speedMs: 45 });
        this.createParticles('#ffd700');
      } else {
        this.sounds.playIncorrect();
        this.els.app.classList.add('shake');
        this.els.judgeOverlay.innerText = "不正解";
        this.els.judgeOverlay.className = "active text-incorrect";
        this.els.trolley.classList.add('fall');
        this.telops.pushData(TELOP_LINES.incorrect);
        this.narrator.say(pick(NARRATOR_LINES.incorrect), { speedMs: 45 });
        this.scene.speed = 0;
        this.scene.shake = 0;
      }
    }, 2500);
  }

  createParticles(color) {
    for (let i = 0; i < 100; i++) {
        const p = document.createElement('div');
        p.className = 'particle-spark';
        p.style.background = color;
        this.els.particles.appendChild(p);
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 1000 + 500;
        p.animate([
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { transform: `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px) scale(0)`, opacity: 0 }
        ], { duration: 1500, easing: 'cubic-bezier(0, .9, .1, 1)' }).onfinish = () => p.remove();
    }
  }

  updateHUD() {
    this.els.qCounter.innerText = `${this.currentIndex + 1} / ${this.questions.length}`;
  }

  showOverlay(title, desc) {
    this.els.overlayTitle.innerText = title;
    this.els.overlayDesc.innerText = desc;
    this.els.overlay.classList.remove('hidden');
  }

  hideOverlay() {
    this.els.overlay.classList.add('hidden');
  }
}

window.addEventListener('load', () => {
  new TrolleyAdventureDisplay();
});
