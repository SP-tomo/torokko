import { SoundEngine } from './src/modules/SoundEngine.js';
import { SceneManager } from './src/modules/SceneManager.js';

const GameState = {
  TITLE: 'TITLE',
  QUESTION: 'QUESTION',
  JUDGING: 'JUDGING',
  RESULT: 'RESULT',
  GAMEOVER: 'GAMEOVER'
};

class TrolleyAdventure {
  constructor() {
    this.state = GameState.TITLE;
    this.questions = [];
    this.currentIndex = 0;
    this.timer = 5.0;
    this.timerInterval = null;
    this.selectedChoice = null;
    
    // Modules
    this.sounds = new SoundEngine();
    this.canvas = document.getElementById('bg-canvas');
    this.scene = new SceneManager(this.canvas);

    // Elements
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
      startBtn: document.getElementById('start-btn'),
      qCounter: document.getElementById('q-index'),
      judgeOverlay: document.getElementById('judge-text-overlay'),
      particles: document.getElementById('particles-container'),
    };

    this.init();
  }

  async init() {
    // 1. Load Data
    const localQuestions = localStorage.getItem('trolley_questions');
    if (localQuestions) {
      this.questions = JSON.parse(localQuestions);
    } else {
      const resp = await fetch('/assets/data/questions.json');
      this.questions = await resp.json();
    }

    // 2. Start Engines
    this.scene.update();

    // 3. Events
    this.els.startBtn.onclick = () => this.startGame();
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.els.choiceLeft.onclick = () => this.selectChoice('left');
    this.els.choiceRight.onclick = () => this.selectChoice('right');

    this.showOverlay("TROLLEY ADVENTURE", "全10問の試練に打ち勝て。");
  }

  startGame() {
    this.currentIndex = 0;
    this.hideOverlay();
    this.sounds.startBGM();
    this.nextQuestion();
  }

  nextQuestion() {
    if (this.currentIndex >= this.questions.length) {
      this.finishGame(true);
      return;
    }

    this.state = GameState.QUESTION;
    this.selectedChoice = null;
    this.timer = 5.0;
    this.updateHUD();
    this.updateStage(); // Switch background if needed
    
    this.scene.speed = 1.0;
    this.scene.shake = 2; // Default running vibration
    
    const q = this.questions[this.currentIndex];
    this.els.qText.innerText = q.question;
    this.els.textLeft.innerText = q.left.text;
    this.els.textRight.innerText = q.right.text;
    
    this.els.choiceLeft.classList.remove('selected');
    this.els.choiceRight.classList.remove('selected');
    this.els.trolley.className = 'trolley';
    this.els.judgeOverlay.classList.remove('active');
    this.els.app.classList.remove('running', 'correct-bg-flash', 'shake');

    this.startTimer();
  }

  updateStage() {
    // Stage logic: 1-3 Q: Cave, 4-6 Q: Jungle, 7-10 Q: Temple
    if (this.currentIndex < 3) {
      this.scene.setTheme('cave');
    } else if (this.currentIndex < 6) {
      this.scene.setTheme('jungle');
    } else {
      this.scene.setTheme('temple');
    }
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timer -= 0.05;
      this.els.timerFill.style.transform = `scaleX(${this.timer / 5.0})`;
      if (this.timer < 1.0 && this.timer > 0) this.sounds.playTick();
      if (this.timer <= 0) {
        clearInterval(this.timerInterval);
        this.autoJudge();
      }
    }, 50);
  }

  handleKeyDown(e) {
    if (this.state !== GameState.QUESTION) return;
    if (e.key === 'ArrowLeft') this.selectChoice('left');
    if (e.key === 'ArrowRight') this.selectChoice('right');
  }

  selectChoice(side) {
    if (this.state !== GameState.QUESTION) return;
    this.selectedChoice = side;
    this.sounds.playTick();
    this.els.choiceLeft.classList.toggle('selected', side === 'left');
    this.els.choiceRight.classList.toggle('selected', side === 'right');
    this.els.trolley.className = `trolley tilt-${side}`;
  }

  autoJudge() {
    this.state = GameState.JUDGING;
    this.els.app.classList.add('running');
    this.scene.speed = 5.0; 
    this.scene.shake = 10; // Intense vibration during judge
    
    const q = this.questions[this.currentIndex];
    const isCorrect = (this.selectedChoice === q.answer);
    
    setTimeout(() => {
      this.showJudgement(isCorrect);
    }, 1500);
  }

  showJudgement(isCorrect) {
    if (isCorrect) {
      this.sounds.playCorrect();
      this.els.app.classList.add('correct-bg-flash');
      this.els.judgeOverlay.innerText = "正解";
      this.els.judgeOverlay.className = "active text-correct";
      this.createParticles('#ffd700');

      setTimeout(() => {
        this.currentIndex++;
        this.nextQuestion();
      }, 2500);
    } else {
      this.sounds.playIncorrect();
      this.els.app.classList.add('shake');
      this.els.judgeOverlay.innerText = "不正解";
      this.els.judgeOverlay.className = "active text-incorrect";
      this.els.trolley.classList.add('fall');
      this.scene.speed = 0;
      this.scene.shake = 0;

      setTimeout(() => {
        this.finishGame(false);
      }, 2500);
    }
  }

  createParticles(color) {
    for (let i = 0; i < 50; i++) {
        const p = document.createElement('div');
        p.style.position = 'absolute';
        p.style.left = '50%';
        p.style.top = '50%';
        p.style.width = '10px';
        p.style.height = '10px';
        p.style.background = color;
        p.style.borderRadius = '2px';
        this.els.particles.appendChild(p);

        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 800 + 400;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;

        p.animate([
            { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px) rotate(360deg)`, opacity: 0 }
        ], {
            duration: 1500,
            easing: 'cubic-bezier(0, .9, .1, 1)'
        }).onfinish = () => p.remove();
    }
  }

  updateHUD() {
    this.els.qCounter.innerText = this.currentIndex + 1;
  }

  showOverlay(title, desc) {
    this.els.overlayTitle.innerText = title;
    this.els.overlayDesc.innerText = desc;
    this.els.overlay.classList.remove('hidden');
  }

  hideOverlay() {
    this.els.overlay.classList.add('hidden');
  }

  finishGame(isSuccess) {
    this.sounds.stopBGM();
    this.state = isSuccess ? GameState.RESULT : GameState.GAMEOVER;
    const title = isSuccess ? "LEGEND CLEAR!" : "GAME OVER";
    const desc = isSuccess ? "究極の冒険を成し遂げた！" : "奈落の底に消えていった...";
    this.showOverlay(title, desc);
    this.els.startBtn.innerText = "RETRY";
  }
}

window.addEventListener('load', () => {
  new TrolleyAdventure();
});
