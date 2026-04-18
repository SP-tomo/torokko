export class PanelistBox {
  constructor(container, panelists) {
    this.container = container;
    this.panelists = panelists;
    this.nodes = new Map();
    this._render();
  }

  _render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    for (const p of this.panelists) {
      const box = document.createElement('div');
      box.className = 'panelist-box';
      box.dataset.id = p.id;
      box.dataset.emotion = 'idle';
      box.style.setProperty('--pan-color', p.color);

      const face = document.createElement('div');
      face.className = 'panelist-face';
      face.textContent = p.emojis.idle;

      const name = document.createElement('div');
      name.className = 'panelist-name';
      name.textContent = p.name;

      box.appendChild(face);
      box.appendChild(name);
      this.container.appendChild(box);
      this.nodes.set(p.id, { box, face });
    }
  }

  reactOne(id, emotion) {
    const p = this.panelists.find((x) => x.id === id);
    const node = this.nodes.get(id);
    if (!p || !node) return;
    const emoji = p.emojis[emotion] ?? p.emojis.idle;
    node.face.textContent = emoji;
    // Restart animation by toggling the dataset
    node.box.dataset.emotion = 'idle';
    // Force reflow so the removed/added animation re-triggers
    void node.box.offsetWidth;
    node.box.dataset.emotion = emotion;
  }

  reactAll(emotion, { stagger = 60 } = {}) {
    this.panelists.forEach((p, i) => {
      setTimeout(() => this.reactOne(p.id, emotion), i * stagger);
    });
  }
}
