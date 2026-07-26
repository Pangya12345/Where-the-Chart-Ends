export class Pool {
  constructor() { this.items = []; }
  get(data) {
    const found = this.items.find(item => !item.active) || {};
    Object.assign(found, data, { active: true });
    if (!this.items.includes(found)) this.items.push(found);
    return found;
  }
  each(callback) { for (const item of this.items) if (item.active) callback(item); }
  clear() { for (const item of this.items) item.active = false; }
  count() { return this.items.reduce((total, item) => total + (item.active ? 1 : 0), 0); }
}
