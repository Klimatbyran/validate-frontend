export class UnionFind<Id extends string = string> {
  private parent = new Map<Id, Id>();

  add(id: Id): void {
    if (!this.parent.has(id)) this.parent.set(id, id);
  }

  find(id: Id): Id {
    const parent = this.parent.get(id);
    if (!parent) throw new Error(`Unknown union-find node: ${id}`);
    if (parent !== id) {
      const root = this.find(parent);
      this.parent.set(id, root);
      return root;
    }
    return id;
  }

  union(a: Id, b: Id): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootA, rootB);
  }

  groups(): Map<Id, Id[]> {
    const byRoot = new Map<Id, Id[]>();
    for (const id of this.parent.keys()) {
      const root = this.find(id);
      const bucket = byRoot.get(root) ?? [];
      bucket.push(id);
      byRoot.set(root, bucket);
    }
    return byRoot;
  }
}
