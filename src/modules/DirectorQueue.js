export class DirectorQueue {
  constructor() {
    this.timer = null;
    this.token = 0;
  }

  play(steps = []) {
    this.cancel();
    const myToken = ++this.token;
    const run = (i) => {
      if (myToken !== this.token) return;
      if (i >= steps.length) return;
      const step = steps[i];
      this.timer = setTimeout(() => {
        if (myToken !== this.token) return;
        try {
          step.fn && step.fn();
        } finally {
          run(i + 1);
        }
      }, step.wait ?? 0);
    };
    run(0);
  }

  cancel() {
    this.token++;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
