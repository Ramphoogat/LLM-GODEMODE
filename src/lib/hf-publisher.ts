export interface DatasetStore {
  snapshot: () => any[];
  clear: (count: number) => void;
}

let store: DatasetStore | null = null;
let isPublishing = false;

/**
 * Register the dataset store that will provide data for publishing.
 */
export function registerDatasetStore(newStore: DatasetStore): void {
  store = newStore;
}

/**
 * Check if the dataset has reached the threshold to trigger auto-publishing.
 * Typically flushes to HF when buffer hits 80% capacity.
 */
export async function checkDatasetThreshold(currentLength: number, maxCapacity: number): Promise<void> {
  const THRESHOLD = maxCapacity * 0.8;
  
  if (currentLength >= THRESHOLD && !isPublishing) {
    isPublishing = true;
    try {
      if (store) {
        const data = store.snapshot();
        
        // TODO: Implement actual HuggingFace publishing logic here.
        // For example:
        // await fetch('https://huggingface.co/api/datasets/...', { method: 'POST', body: JSON.stringify(data) })
        
        // On successful publish, clear the published entries
        console.log(`[HF Publisher] Simulated publishing ${data.length} entries to HuggingFace.`);
        store.clear(data.length);
      }
    } catch (err) {
      console.error("[HF Publisher] Failed to publish dataset:", err);
    } finally {
      isPublishing = false;
    }
  }
}
