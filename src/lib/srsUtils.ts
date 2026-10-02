import { ref, update, set } from "firebase/database";
import type { Database } from "firebase/database";
import type { Lesson, Problem, MemorizeProgress, CardItem, RatingType } from "../types";

/**
 * DBキーのサニタイズ関数（最重要）
 * Firebase RTDBの禁止文字（. # $ [ ] /）を安全なアンダースコアに変換します。
 */
export function sanitizeDbKey(key: string): string {
  return String(key || "").replace(/[.#$\[\]\/]/g, "_");
}

/**
 * 今日の日付文字列取得 (YYYY-MM-DD)
 */
export function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 日付加算ユーティリティ
 */
export function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return getTodayStr();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 全カードプールの抽出 & 正規化関数
 */
export function extractAllCards(
  allLessons: Record<string, Lesson> = {},
  allProblems: Record<string, Problem> = {},
  allMemorizeProgress: Record<string, MemorizeProgress> = {},
  allCardMemos: Record<string, any> = {}
): CardItem[] {
  const cards: CardItem[] = [];
  const today = getTodayStr();

  // 1. 授業の暗記事項
  Object.entries(allLessons || {}).forEach(([lid, l]) => {
    if (!l || !Array.isArray(l.memorizationPoints)) return;
    const subj = l.subject || "その他";

    l.memorizationPoints.forEach((mp, idx) => {
      const mpId = mp.id || `idx${idx}`;
      // 正規進捗キー: mem_{lessonId}_{mpId}
      const progressKey = sanitizeDbKey(`mem_${lid}_${mpId}`);
      // レガシーキー互換
      const legacyKey1 = sanitizeDbKey(`${lid}:${mpId}`);
      const legacyKey2 = `${lid}:${mpId}`;

      let q = (mp.question || "").trim();
      let a = (mp.answer || mp.content || "").trim();
      let note = (mp.note || "").trim();

      // 旧フォーマットのコロン区切り（Q：A）自動分離
      if (!q && a.includes("：")) {
        const parts = a.split("：");
        q = parts[0].trim();
        a = parts.slice(1).join("：").trim();
      } else if (!q && a.includes(":")) {
        const parts = a.split(":");
        q = parts[0].trim();
        a = parts.slice(1).join(":").trim();
      } else if (!q) {
        q = mp.category || "重要事項";
      }

      const prog: any = allMemorizeProgress[progressKey] || allMemorizeProgress[legacyKey1] || allMemorizeProgress[legacyKey2] || {};
      const boxLevel = typeof prog.boxLevel === 'number' ? prog.boxLevel : (typeof prog.box === 'number' ? prog.box : 0);
      const lapses = prog.lapses || 0;
      const reps = prog.reps || 0;
      const nextDate = prog.nextReviewDate || null;

      // 復習対象（未学習、または期日が今日以前）
      const isDue = (boxLevel === 0) || (!nextDate || nextDate <= today);
      const isMastered = boxLevel >= 4;

      const userMemoRaw = allCardMemos[progressKey] || allCardMemos[legacyKey1] || "";
      const userMemo = typeof userMemoRaw === "object" ? userMemoRaw.text || "" : String(userMemoRaw || "");

      cards.push({
        id: `mem_${lid}_${mpId}`,
        progressKey: progressKey,
        lessonId: lid,
        memoId: mpId,
        sourceType: "lesson",
        sourceTitle: l.title || "授業暗記",
        subject: mp.subject || subj,
        category: mp.category || "重要事項",
        question: q,
        answer: a,
        note: note,
        boxLevel: boxLevel,
        reps: reps,
        lapses: lapses,
        nextReviewDate: nextDate,
        isDue: isDue,
        isMastered: isMastered,
        userMemo: userMemo
      });
    });
  });

  // 2. 問題の解法・極意メモ
  Object.entries(allProblems || {}).forEach(([pid, p]) => {
    if (!p || !p.insight || !p.insight.trim()) return;
    const progressKey = sanitizeDbKey(`prob_${pid}`);
    const legacyKey = sanitizeDbKey(`prob:${pid}`);

    const prog: any = allMemorizeProgress[progressKey] || allMemorizeProgress[legacyKey] || {};
    const boxLevel = typeof prog.boxLevel === 'number' ? prog.boxLevel : (typeof prog.box === 'number' ? prog.box : 0);
    const lapses = prog.lapses || 0;
    const reps = prog.reps || 0;
    const nextDate = prog.nextReviewDate || null;
    const isDue = (boxLevel === 0) || (!nextDate || nextDate <= today);
    const isMastered = boxLevel >= 4;

    const userMemoRaw = allCardMemos[progressKey] || allCardMemos[legacyKey] || "";
    const userMemo = typeof userMemoRaw === "object" ? userMemoRaw.text || "" : String(userMemoRaw || "");

    cards.push({
      id: `prob_${pid}`,
      progressKey: progressKey,
      problemId: pid,
      sourceType: "problem",
      sourceTitle: p.title || "問題の極意",
      subject: p.subject || "物理",
      category: "解法の極意",
      question: `${p.title || "問題"} の解法ポイント`,
      answer: p.insight.trim(),
      note: p.unit ? `単元: ${p.unit}` : "",
      boxLevel: boxLevel,
      reps: reps,
      lapses: lapses,
      nextReviewDate: nextDate,
      isDue: isDue,
      isMastered: isMastered,
      userMemo: userMemo
    });
  });

  return cards;
}

/**
 * SRS 間隔定数テーブル
 */
export const SRS_INTERVALS = [0, 1, 3, 7, 16, 35];

/**
 * SRS 間隔計算 & レーティング処理関数
 */
export function calculateSrsRating(card: { boxLevel?: number; reps?: number; lapses?: number }, rating: RatingType): MemorizeProgress {
  const prevLevel = typeof card.boxLevel === 'number' ? card.boxLevel : 0;
  let newLevel = prevLevel;
  let lapses = card.lapses || 0;
  let reps = (card.reps || 0) + 1;
  let nextReviewDate = getTodayStr();

  if (rating === "again") {
    // もう一度: Lv.1に降格、本日中に再復習
    lapses += 1;
    newLevel = 1;
    nextReviewDate = getTodayStr();
  } else if (rating === "hard") {
    // 難しい: レベル維持（最低1）、1日後復習
    newLevel = Math.max(1, prevLevel);
    nextReviewDate = addDaysToDate(getTodayStr(), 1);
  } else if (rating === "good") {
    // 覚えた: レベル+1（最大5）、SRS間隔
    newLevel = Math.min(5, prevLevel + 1);
    const intervalDays = SRS_INTERVALS[newLevel] || 3;
    nextReviewDate = addDaysToDate(getTodayStr(), intervalDays);
  } else if (rating === "easy") {
    // かんたん: レベル+2（最大5）、余裕を持った間隔
    newLevel = Math.min(5, prevLevel + 2);
    const intervalDays = (SRS_INTERVALS[newLevel] || 7) + 3;
    nextReviewDate = addDaysToDate(getTodayStr(), intervalDays);
  }

  const now = Date.now();
  return {
    boxLevel: newLevel,
    nextReviewDate: nextReviewDate,
    lastReviewedAt: now,
    reps: reps,
    lapses: lapses,
    updatedAt: now
  };
}

/**
 * 端末間の進捗競合防止（若返り防止マージ関数）
 */
export function mergeSrsProgressData(
  localMap: Record<string, MemorizeProgress> = {},
  remoteMap: Record<string, MemorizeProgress> = {}
): Record<string, MemorizeProgress> {
  const result: Record<string, MemorizeProgress> = { ...localMap };
  if (!remoteMap) return result;

  for (const [key, remoteItem] of Object.entries(remoteMap)) {
    if (!remoteItem || typeof remoteItem !== 'object') continue;
    const safeK = sanitizeDbKey(key);
    const localItem = result[safeK];

    if (!localItem) {
      result[safeK] = remoteItem;
      continue;
    }

    const remoteTime = Number(remoteItem.updatedAt || remoteItem.lastReviewedAt || 0);
    const localTime = Number(localItem.updatedAt || localItem.lastReviewedAt || 0);

    if (remoteTime >= localTime) {
      result[safeK] = remoteItem;
    } else {
      result[safeK] = localItem;
    }
  }
  return result;
}

/**
 * 新規暗記カードの作成・保存処理
 */
export async function createNewCard(
  database: Database,
  uid: string,
  allLessons: Record<string, Lesson>,
  { subject, question, answer, note }: { subject: string; question: string; answer: string; note?: string }
) {
  // 既存の該当教科の教材を探す（なければ新規作成）
  let targetLessonId: string | null = null;
  Object.entries(allLessons || {}).forEach(([lid, l]) => {
    if (l && l.subject === subject && !targetLessonId) targetLessonId = lid;
  });

  const nowIso = new Date().toISOString();
  if (!targetLessonId) {
    targetLessonId = `lesson_${Date.now()}`;
    allLessons[targetLessonId] = {
      title: `${subject} 暗記帳`,
      subject: subject,
      createdAt: nowIso,
      updatedAt: nowIso,
      memorizationPoints: []
    };
  }

  const lesson = allLessons[targetLessonId];
  if (!Array.isArray(lesson.memorizationPoints)) lesson.memorizationPoints = [];

  const newPoint = {
    id: `mp_${Date.now()}`,
    category: "重要事項",
    question: question.trim(),
    answer: answer.trim(),
    content: `${question.trim()}：${answer.trim()}`,
    note: (note || "").trim(),
    subject: subject,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  lesson.memorizationPoints.push(newPoint);
  lesson.updatedAt = nowIso;

  // Firebase Realtime Database に保存
  await update(ref(database, `users/${uid}/lessons/${targetLessonId}`), lesson);
  return { lessonId: targetLessonId, point: newPoint };
}

/**
 * 進捗データをFirebase RTDBに保存
 */
export async function saveCardProgress(
  database: Database,
  uid: string,
  progressKey: string,
  progressData: MemorizeProgress
) {
  const safeKey = sanitizeDbKey(progressKey);
  await set(ref(database, `users/${uid}/memorizeProgress/${safeKey}`), progressData);
}

/**
 * カード個人メモをFirebase RTDBに保存
 */
export async function saveCardMemo(
  database: Database,
  uid: string,
  progressKey: string,
  memoText: string
) {
  const safeKey = sanitizeDbKey(progressKey);
  await set(ref(database, `users/${uid}/card_memos/${safeKey}`), {
    text: memoText,
    updatedAt: Date.now()
  });
}

/**
 * 初期サンプル教材のセットアップ（DBが空の場合にユーザーがすぐ試せる高品質データ）
 */
export const INITIAL_SAMPLE_LESSONS: Record<string, Lesson> = {
  "lesson_physics_mechanics": {
    title: "物理：力学の基本公式と法則",
    subject: "物理",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    orderIndex: 1,
    memorizationPoints: [
      {
        id: "mp_1",
        question: "ニュートンの運動方程式は？",
        answer: "$ma = F$",
        note: "mは物体の質量[kg], aは加速度[m/s^2], Fは合力[N]",
        category: "公式",
        subject: "物理"
      },
      {
        id: "mp_2",
        question: "等加速度直線運動の速度と変位の3公式は？",
        answer: "$v = v_0 + at$, $x = v_0t + \\frac{1}{2}at^2$, $v^2 - v_0^2 = 2ax$",
        note: "初速度v_0, 加速度a, 時間t, 変位x",
        category: "公式",
        subject: "物理"
      },
      {
        id: "mp_3",
        question: "力学的エネルギー保存則の式は？",
        answer: "$\\frac{1}{2}mv^2 + mgh + \\frac{1}{2}kx^2 = \\text{一定}$",
        note: "非保存力（摩擦力など）が仕事をしない場合に成立",
        category: "保存則",
        subject: "物理"
      },
      {
        id: "mp_4",
        question: "単振動の周期 $T$ の一般式（質量 $m$, 復元力の比例定数 $K$）は？",
        answer: "$T = 2\\pi \\sqrt{\\frac{m}{K}}$",
        note: "バネ振り子では $K = k$。単振り子では $T = 2\\pi \\sqrt{\\frac{l}{g}}$",
        category: "公式",
        subject: "物理"
      }
    ]
  },
  "lesson_math_calculus": {
    title: "数学：微積分と指数対数",
    subject: "数学",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    orderIndex: 2,
    memorizationPoints: [
      {
        id: "mp_math_1",
        question: "積の微分法 $(\\{f(x)g(x)\\})'$ の公式は？",
        answer: "$(fg)' = f'g + fg'$",
        note: "商の微分は $(\\frac{f}{g})' = \\frac{f'g - fg'}{g^2}$",
        category: "微分法",
        subject: "数学"
      },
      {
        id: "mp_math_2",
        question: "オイラーの公式（複素指数関数）は？",
        answer: "$e^{i\\theta} = \\cos\\theta + i\\sin\\theta$",
        note: "特に $\\theta = \\pi$ のとき $e^{i\\pi} + 1 = 0$",
        category: "重要定理",
        subject: "数学"
      },
      {
        id: "mp_math_3",
        question: "2次方程式 $ax^2 + bx + c = 0$ の解の公式は？",
        answer: "$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$",
        note: "判別式 $D = b^2 - 4ac$",
        category: "基本定理",
        subject: "数学"
      }
    ]
  },
  "lesson_civics_pol": {
    title: "公共・政治経済：日本国憲法と統治機構",
    subject: "公共",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    orderIndex: 3,
    memorizationPoints: [
      {
        id: "mp_civ_1",
        question: "日本国憲法の三大原理は？",
        answer: "国民主権・基本的人権の尊重・平和主義",
        note: "前文および各条文の基本精神を構成",
        category: "憲法原則",
        subject: "公共"
      },
      {
        id: "mp_civ_2",
        question: "違憲審査権を最終的に行使する最高裁判所の別称は？",
        answer: "憲法の番人",
        note: "憲法第81条により規定",
        category: "司法制度",
        subject: "公共"
      }
    ]
  }
};

export const INITIAL_SAMPLE_PROBLEMS: Record<string, Problem> = {
  "prob_slope_balance": {
    title: "斜面上の物体のつり合い",
    subject: "物理",
    unit: "力学",
    insight: "斜面に平行な成分 ($mg\\sin\\theta$) と垂直な成分 ($mg\\cos\\theta$) に重力を即座に分解するのが極意"
  },
  "prob_collision_momentum": {
    title: "2物体の斜め衝突問題",
    subject: "物理",
    unit: "力学",
    insight: "衝突面に垂直な方向ははね返り係数の式、平行な方向は外力がないため運動量保存則を適用する"
  }
};
