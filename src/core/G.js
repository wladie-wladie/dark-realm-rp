// Общее состояние игры между сценой мира и интерфейсом.
export const G = {
  st: null,        // состояние персонажа
  slot: 0,         // ячейка сохранения
  game: null,      // Phaser.Game
  world: null,     // активная сцена мира
  ui: null,        // интерфейс (DOM)
  input: { mx: 0, my: 0, attack: false },
  paused: false,
  listeners: {},
  on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
  emit(ev, ...a) { for (const fn of this.listeners[ev] || []) fn(...a); },
};
