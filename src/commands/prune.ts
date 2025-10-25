import { prune as permPrune } from "../permissions";

export async function handlePrune(): Promise<void> {
  await permPrune();
}
