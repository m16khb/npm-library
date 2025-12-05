import type {QueueItem} from './types';

/**
 * 우선순위 큐 (최소 힙 기반)
 */
export class PriorityQueue<T = any> {
  private heap: QueueItem<T>[] = [];
  private itemMap = new Map<string, QueueItem<T>>();

  /**
   * 큐가 비었는지 확인
   */
  get isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * 큐 크기
   */
  get size(): number {
    return this.heap.length;
  }

  /**
   * 아이템 추가
   * @param item 추가할 아이템
   */
  enqueue(item: QueueItem<T>): void {
    this.heap.push(item);
    this.itemMap.set(item.id, item);
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * 가장 높은 우선순위 아이템 제거 및 반환
   * @returns 가장 높은 우선순위 아이템
   */
  dequeue(): QueueItem<T> | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }

    const root = this.heap[0];
    if (!root) {
      return undefined;
    }

    const last = this.heap.pop()!;

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }

    this.itemMap.delete(root.id);
    return root;
  }

  /**
   * ID로 아이템 찾기
   * @param id 아이템 ID
   * @returns 아이템 또는 undefined
   */
  findById(id: string): QueueItem<T> | undefined {
    return this.itemMap.get(id);
  }

  /**
   * ID로 아이템 제거
   * @param id 아이템 ID
   * @returns 제거된 아이템 또는 undefined
   */
  removeById(id: string): QueueItem<T> | undefined {
    const item = this.itemMap.get(id);
    if (!item) {
      return undefined;
    }

    const index = this.heap.findIndex(h => h.id === id);
    if (index === -1) {
      return undefined;
    }

    const last = this.heap.pop()!;
    if (index !== this.heap.length) {
      this.heap[index] = last;
      const parentIndex = Math.floor((index - 1) / 2);

      if (index > 0 && this.heap[parentIndex] && this.compare(last, this.heap[parentIndex]) < 0) {
        this.bubbleUp(index);
      } else {
        this.bubbleDown(index);
      }
    }

    this.itemMap.delete(id);
    return item;
  }

  /**
   * 모든 아이템 제거
   */
  clear(): void {
    this.heap = [];
    this.itemMap.clear();
  }

  /**
   * 모든 아이템 배열로 반환
   * @returns 모든 아이템 배열
   */
  toArray(): QueueItem<T>[] {
    return [...this.heap];
  }

  /**
   * 아이템 우선순위 비교
   * @param a 아이템 A
   * @param b 아이템 B
   * @returns 비교 결과 (음수: a가 높음, 양수: b가 높음, 0: 동일)
   */
  private compare(a: QueueItem<T>, b: QueueItem<T>): number {
    // 우선순위 먼저 비교 (높을수록 높음)
    const priorityDiff = b.options.priority - a.options.priority;
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    // 우선순위가 같으면 시간순 (FIFO)
    return a.timestamp - b.timestamp;
  }

  /**
   * 힙에서 위로 올리기
   * @param index 현재 인덱스
   */
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const currentItem = this.heap[index];
      const parentItem = this.heap[parentIndex];

      if (!currentItem || !parentItem || this.compare(currentItem, parentItem) >= 0) {
        break;
      }

      // TypeScript에게 둘 다 undefined가 아님을 확신시킴
      [this.heap[index]!, this.heap[parentIndex]!] = [this.heap[parentIndex]!, this.heap[index]!];
      index = parentIndex;
    }
  }

  /**
   * 힙에서 아래로 내리기
   * @param index 현재 인덱스
   */
  private bubbleDown(index: number): void {
    const length = this.heap.length;

    while (true) {
      let minIndex = index;
      const leftIndex = 2 * index + 1;
      const rightIndex = 2 * index + 2;

      const currentItem = this.heap[index];
      const leftItem = this.heap[leftIndex];
      const rightItem = this.heap[rightIndex];

      if (
        currentItem &&
        leftItem &&
        leftIndex < length &&
        this.compare(leftItem, currentItem) < 0
      ) {
        minIndex = leftIndex;
      }

      const minItem = this.heap[minIndex];
      if (
        currentItem &&
        rightItem &&
        rightIndex < length &&
        this.compare(rightItem, minItem!) < 0
      ) {
        minIndex = rightIndex;
      }

      if (minIndex === index) {
        break;
      }

      // TypeScript에게 둘 다 undefined가 아님을 확신시킴
      [this.heap[index]!, this.heap[minIndex]!] = [this.heap[minIndex]!, this.heap[index]!];
      index = minIndex;
    }
  }
}
