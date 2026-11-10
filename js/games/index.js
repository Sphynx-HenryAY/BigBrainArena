import { registerGames } from "../core/registry.js";
import mathSprint from "./math-sprint.js";
import memoryMatch from "./memory-match.js";
import reactionTime from "./reaction-time.js";
import stroop from "./stroop.js";
import sequenceMemory from "./sequence-memory.js";
import quickCount from "./quick-count.js";
import nBack from "./n-back.js";
import mentalRotation from "./mental-rotation.js";
import goNoGo from "./go-no-go.js";

// 新增遊戲：在上方 import，並加入下面的陣列即可。
export const games = registerGames([
  mathSprint,
  memoryMatch,
  reactionTime,
  stroop,
  sequenceMemory,
  quickCount,
  nBack,
  mentalRotation,
  goNoGo,
]);

export default games;
