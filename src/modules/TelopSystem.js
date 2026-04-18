export class TelopSystem {
  constructor(container, { max = 4, lifetime = 2600 } = {}) {
    this.container = container;
    this.max = max;
    this.lifetime = lifetime;
  }

  push(text, variant = 'variant-gold', { lifetime } = {}) {
    if (!this.container) return null;
    if (!text) return null;

    // Trim oldest if over max (oldest sit at the bottom visually due to column-reverse)
    while (this.container.children.length >= this.max) {
      const oldest = this.container.lastElementChild;
      if (!oldest) break;
      this._dismiss(oldest, 0);
    }

    const el = document.createElement('div');
    el.className = `telop ${variant}`;
    el.textContent = text;
    this.container.prepend(el);

    const life = lifetime ?? this.lifetime;
    el._timeout = setTimeout(() => this._dismiss(el, 300), life);
    return el;
  }

  pushData(entry) {
    if (!entry) return null;
    return this.push(entry.text, entry.variant || 'variant-gold');
  }

  _dismiss(el, fadeMs) {
    if (!el || el._dismissing) return;
    el._dismissing = true;
    if (el._timeout) clearTimeout(el._timeout);
    if (fadeMs <= 0) {
      el.remove();
      return;
    }
    el.classList.add('dismiss');
    setTimeout(() => el.remove(), fadeMs);
  }

  clear() {
    [...this.container.children].forEach((el) => this._dismiss(el, 0));
  }
}
