import type { Achievement, GameEngine, GameSummary, Room } from "@/types";
import { topScorers } from "./scoring";
import { serverNow } from "./clock";

export const BRAIN_GAME_ID = "brainteaser";

export interface Riddle {
  id: string;
  question: string;
  answer: string;
  wrong: string[];
  explain: string;
}

export const RIDDLES: Riddle[] = [
  { id: "r1", question: "什麼東西越洗越髒？", answer: "水", wrong: ["衣服", "襪子", "手帕"], explain: "洗完東西，髒的是水！" },
  { id: "r2", question: "什麼門永遠關不上？", answer: "球門", wrong: ["大門", "後門", "旋轉門"], explain: "球門只有框，沒有門板。" },
  { id: "r3", question: "什麼路最窄？", answer: "冤家路窄", wrong: ["小路", "羊腸小道", "單行道"], explain: "成語：冤家路窄。" },
  { id: "r4", question: "什麼書在書店買不到？", answer: "秘書", wrong: ["課本", "小說", "漫畫"], explain: "秘書是一種職業！" },
  { id: "r5", question: "什麼人一年只工作一天？", answer: "聖誕老人", wrong: ["月老", "壽星", "土地公"], explain: "只在聖誕夜送禮物。" },
  { id: "r6", question: "什麼傘不能擋雨？", answer: "降落傘", wrong: ["雨傘", "花傘", "摺疊傘"], explain: "降落傘是從天上跳下來用的，不是拿來擋雨！" },
  { id: "r7", question: "哪一種蛋不能吃？", answer: "笨蛋", wrong: ["皮蛋", "鐵蛋", "鹹蛋"], explain: "笨蛋是在罵人啦！" },
  { id: "r8", question: "什麼車寸步難行？", answer: "風車", wrong: ["腳踏車", "纜車", "火車"], explain: "風車只會原地轉。" },
  { id: "r9", question: "小明的爸爸有三個兒子，老大叫大毛、老二叫二毛，老三叫什麼？", answer: "小明", wrong: ["三毛", "小毛", "四毛"], explain: "題目第一句就說了：小明的爸爸！" },
  { id: "r10", question: "什麼東西要打破了才能吃？", answer: "雞蛋", wrong: ["香蕉", "蘋果", "存錢筒"], explain: "打蛋才能煮！" },
  { id: "r11", question: "什麼東西越生氣越大？", answer: "脾氣", wrong: ["氣球", "肚子", "房子"], explain: "一生氣，脾氣就越來越大。" },
  { id: "r12", question: "什麼水不能喝？", answer: "薪水", wrong: ["汽水", "果汁", "熱湯"], explain: "薪水只能拿來花。" },
  { id: "r13", question: "什麼瓜不能吃？", answer: "傻瓜", wrong: ["苦瓜", "冬瓜", "木瓜"], explain: "傻瓜是人！" },
  { id: "r14", question: "什麼布剪不斷？", answer: "瀑布", wrong: ["抹布", "帆布", "牛仔布"], explain: "瀑布是水。" },
  { id: "r15", question: "什麼東西有很多牙齒，卻從來不咬人？", answer: "梳子", wrong: ["鯊魚", "鱷魚", "老虎"], explain: "梳子的齒只梳頭髮。" },
  { id: "r16", question: "什麼東西早上四條腿、中午兩條腿、晚上三條腿？", answer: "人", wrong: ["狗", "椅子", "青蛙"], explain: "嬰兒爬、成人走、老人拄拐杖。" },
  { id: "r17", question: "什麼池不能游泳？", answer: "電池", wrong: ["水池", "泳池", "魚池"], explain: "電池只能裝電。" },
  { id: "r18", question: "什麼字全世界通用？", answer: "阿拉伯數字", wrong: ["英文字", "中文字", "韓文字"], explain: "1、2、3 全世界都看得懂。" },
  { id: "r19", question: "太平洋的中間是什麼？", answer: "平", wrong: ["海", "島", "水"], explain: "「太平洋」三個字，中間是「平」！" },
  { id: "r20", question: "什麼東西你的左手拿得到，右手卻永遠拿不到？", answer: "右手", wrong: ["左耳", "手機", "筷子"], explain: "右手沒辦法拿自己！" },
  { id: "r21", question: "一年四季都盛開的花是什麼？", answer: "塑膠花", wrong: ["玫瑰", "向日葵", "櫻花"], explain: "假花永遠不會謝。" },
  { id: "r22", question: "什麼網抓不到魚？", answer: "網路", wrong: ["漁網", "撈魚網", "球網"], explain: "網路只能抓資料。" },
  { id: "r23", question: "哪一種竹子不長在土裡？", answer: "爆竹", wrong: ["毛竹", "綠竹", "竹筍"], explain: "爆竹過年才放！" },
  { id: "r24", question: "什麼床不能睡？", answer: "河床", wrong: ["吊床", "沙發床", "雙人床"], explain: "河床是河底。" },
  { id: "r25", question: "什麼球不能拍？", answer: "地球", wrong: ["籃球", "足球", "桌球"], explain: "地球只能轉，拍了會頭暈！" },
  { id: "r26", question: "哪一個月有 28 天？", answer: "每個月", wrong: ["二月", "十二月", "沒有"], explain: "每個月都至少有 28 天！" },
  { id: "r27", question: "什麼帽不能戴？", answer: "螺帽", wrong: ["草帽", "安全帽", "毛帽"], explain: "螺帽鎖在螺絲上。" },
  { id: "r28", question: "什麼海沒有水？", answer: "辭海", wrong: ["死海", "紅海", "地中海"], explain: "辭海是一本字典。" },
  { id: "r29", question: "什麼牛不吃草？", answer: "蝸牛", wrong: ["乳牛", "水牛", "犀牛"], explain: "蝸牛不是牛！" },
  { id: "r30", question: "什麼桶不能裝水？", answer: "飯桶", wrong: ["水桶", "油桶", "木桶"], explain: "飯桶裝飯不裝水，還是罵人的話！" },
  { id: "r31", question: "什麼東西天氣越熱，爬得越高？", answer: "溫度計", wrong: ["猴子", "小狗", "長頸鹿"], explain: "天氣越熱，溫度計裡的線爬得越高！" },
  { id: "r32", question: "什麼東西比天還高？", answer: "心", wrong: ["山", "飛機", "月亮"], explain: "心比天高！" },
  { id: "r33", question: "什麼雞沒有翅膀？", answer: "田雞", wrong: ["母雞", "公雞", "小雞"], explain: "田雞是青蛙，哪來的翅膀？" },
  { id: "r34", question: "什麼貓不抓老鼠？", answer: "熊貓", wrong: ["花貓", "黑貓", "野貓"], explain: "熊貓只吃竹子！" },
  { id: "r35", question: "什麼角量不出度數？", answer: "牛角", wrong: ["直角", "銳角", "鈍角"], explain: "牛角不是數學的角，量不出幾度。" },
  { id: "r36", question: "什麼東西越擦越髒？", answer: "抹布", wrong: ["玻璃", "鏡子", "桌子"], explain: "抹布越擦自己越髒，擦過的地方反而乾淨。" },
  { id: "r37", question: "什麼杯不能裝水？", answer: "世界盃", wrong: ["紙杯", "玻璃杯", "保溫杯"], explain: "世界盃是球賽名稱。" },
  { id: "r38", question: "什麼蛋打不破？", answer: "臉皮", wrong: ["鴕鳥蛋", "恐龍蛋", "金蛋"], explain: "玩笑話：臉皮很厚。" },
  { id: "r39", question: "什麼東西天天吃卻吃不完？", answer: "虧", wrong: ["空氣", "飯", "水果"], explain: "「吃虧」啊！" },
  { id: "r40", question: "什麼輪子不會轉？", answer: "年輪", wrong: ["車輪", "齒輪", "輪盤"], explain: "樹的年輪不會轉。" },
  { id: "r41", question: "什麼馬不能騎？", answer: "海馬", wrong: ["野馬", "斑馬", "木馬"], explain: "海馬是魚，不是馬！" },
  { id: "r42", question: "什麼山不能爬？", answer: "靠山", wrong: ["雪山", "火山", "玉山"], explain: "「靠山」是背後支持你的人，不是真的山。" },
  { id: "r43", question: "什麼花不能摸？", answer: "火花", wrong: ["玫瑰", "蘭花", "荷花"], explain: "火花摸了會燙傷！" },
  { id: "r44", question: "什麼果不能吃？", answer: "後果", wrong: ["蘋果", "葡萄", "橘子"], explain: "「自食後果」的後果，可不能真的吞下去！" },
  { id: "r45", question: "什麼包不能背？", answer: "麵包", wrong: ["背包", "書包", "側背包"], explain: "麵包是吃的，背在背上會掉屑啦！" },
];

export type BrainPhase = "question" | "reveal" | "result";

export interface BrainGameState {
  phase: BrainPhase;
  currentRound: number;
  totalRounds: number;
  timeLeft: number;
  riddle: Riddle;
  /** Shuffled answer choices for this round. */
  options: string[];
  riddleOrder: string[];
  usedPromptIds: string[];
  /** playerId -> chosen option */
  answers: Record<string, string>;
  /** playerId -> points earned this round */
  roundPoints: Record<string, number>;
  questionStartedAt: number;
  currentScores: Record<string, number>;
  winnerId: string | null;
  winnerIds: string[];
}

export interface BrainAnswerAction {
  type: "answer";
  choice: string;
}

const REVEAL_SECONDS = 6;

function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function questionTime(room: Room<BrainGameState>): number {
  return Math.max(10, room.settings?.timer ?? 20);
}

function riddleById(id: string | undefined): Riddle {
  return RIDDLES.find((r) => r.id === id) ?? RIDDLES[0];
}

function roundState(state: Omit<BrainGameState, "riddle" | "options">, round: number, room: Room<BrainGameState>) {
  const riddle = riddleById(state.riddleOrder[(round - 1) % state.riddleOrder.length]);
  return {
    ...state,
    phase: "question" as const,
    currentRound: round,
    timeLeft: questionTime(room),
    riddle,
    options: shuffle([riddle.answer, ...riddle.wrong]),
    answers: {},
    roundPoints: {},
    questionStartedAt: serverNow(),
    usedPromptIds: Array.from(new Set([...(state.usedPromptIds ?? []), riddle.id])),
  };
}

function reveal(state: BrainGameState): BrainGameState {
  return { ...state, phase: "reveal", timeLeft: REVEAL_SECONDS };
}

export const BrainTeaserEngine: GameEngine<BrainGameState> = {
  createGame(room) {
    const history = room.contentHistory?.[BRAIN_GAME_ID] ?? [];
    const fresh = RIDDLES.filter((r) => !history.includes(r.id));
    const pool = fresh.length >= 8 ? fresh : RIDDLES;
    const riddleOrder = shuffle(pool.map((r) => r.id));
    const scores: Record<string, number> = {};
    for (const id of Object.keys(room.players)) scores[id] = 0;
    const base = {
      phase: "question" as const,
      currentRound: 1,
      totalRounds: Math.max(1, Math.min(room.settings?.rounds ?? 8, RIDDLES.length)),
      timeLeft: questionTime(room),
      riddleOrder,
      usedPromptIds: [],
      answers: {},
      roundPoints: {},
      questionStartedAt: 0,
      currentScores: scores,
      winnerId: null,
      winnerIds: [],
    };
    return roundState(base, 1, room);
  },

  startGame(room) {
    return this.createGame(room);
  },

  handlePlayerAction(room, playerId, action) {
    const state = room.gameState;
    if (!state || state.phase !== "question") return state;
    const act = action as BrainAnswerAction;
    if (act?.type !== "answer" || typeof act.choice !== "string" || !state.options.includes(act.choice)) return state;
    if (state.answers[playerId] !== undefined) return state;

    const answers = { ...state.answers, [playerId]: act.choice };
    const roundPoints = { ...state.roundPoints };
    const scores = { ...state.currentScores };
    if (act.choice === state.riddle.answer) {
      // +10 for being right, up to +10 more for speed, +5 for the very first correct answer.
      const total = questionTime(room) * 1000;
      const elapsed = Math.max(0, serverNow() - state.questionStartedAt);
      const speed = Math.max(0, Math.round(10 * (1 - elapsed / total)));
      const first = !Object.entries(state.answers).some(([, c]) => c === state.riddle.answer);
      const pts = 10 + speed + (first ? 5 : 0);
      roundPoints[playerId] = pts;
      scores[playerId] = (scores[playerId] ?? 0) + pts;
    } else {
      roundPoints[playerId] = 0;
    }
    const next = { ...state, answers, roundPoints, currentScores: scores };
    const online = Object.keys(room.players).filter((id) => room.players[id]?.isConnected !== false);
    return online.every((id) => answers[id] !== undefined) ? reveal(next) : next;
  },

  updateGameState(room) {
    const state = room.gameState;
    if (!state) return state;
    if (state.phase === "question") {
      if (state.timeLeft > 1) return { ...state, timeLeft: state.timeLeft - 1 };
      return reveal(state);
    }
    if (state.phase === "reveal") {
      if (state.timeLeft > 1) return { ...state, timeLeft: state.timeLeft - 1 };
      if (state.currentRound >= state.totalRounds) {
        const winnerIds = topScorers(state.currentScores);
        return { ...state, phase: "result", timeLeft: 0, winnerId: winnerIds[0] ?? null, winnerIds };
      }
      return roundState(state, state.currentRound + 1, room);
    }
    return state;
  },

  endRound(room) {
    return this.createGame(room);
  },

  endGame(room): GameSummary {
    const state = room.gameState;
    const scores = state?.currentScores ?? {};
    const winnerIds = topScorers(scores);
    const winnerId = winnerIds[0] ?? "";
    const achievements: Achievement[] = [];
    if (winnerIds.length === 1 && winnerId) {
      achievements.push({ id: "brain_master", name: "急轉彎大師", icon: "💡", description: "腦筋轉得比誰都快", playerId: winnerId });
    }
    return { scores, achievements, winnerId, winnerIds };
  },

  calculateScores(room) {
    return room.gameState?.currentScores ?? {};
  },
};
