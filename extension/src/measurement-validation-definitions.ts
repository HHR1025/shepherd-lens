import type { CalibratedMeasurementId } from "./measurement-calibration";

export type LocalizedValidationText = {
  en: string;
  zh: string;
};

export type OrdinalValidationAnchor = LocalizedValidationText & {
  value: 0 | 1 | 2 | 3 | 4;
};

export type ValidationMeasurementDefinition = {
  id: CalibratedMeasurementId;
  name: LocalizedValidationText;
  operationalDefinition: LocalizedValidationText;
  anchors: readonly OrdinalValidationAnchor[];
};

export const VALIDATION_MEASUREMENT_DEFINITIONS = {
  stimulation: define(
    "stimulation",
    text("Stimulation", "刺激强度"),
    text(
      "How strongly visible titles use urgency, surprise, visual emphasis, numbers, or curiosity hooks to demand attention.",
      "可见标题通过紧迫感、惊奇表达、视觉强调、数字或好奇钩子争夺注意力的程度。",
    ),
    [
      text("Calm wording with no visible attention hooks.", "措辞平静，没有明显的注意力钩子。"),
      text("Mostly calm with isolated mild emphasis.", "整体平静，仅有零星轻度强调。"),
      text("A noticeable but balanced amount of attention-seeking wording.", "存在可察觉但尚属适中的吸睛表达。"),
      text("Frequent urgency, surprise, or emphatic presentation.", "频繁出现紧迫、惊奇或强烈强调。"),
      text("Attention hooks dominate nearly every visible recommendation.", "几乎所有可见推荐都由强吸睛钩子主导。"),
    ],
  ),
  conflict: define(
    "conflict",
    text("Conflict", "冲突密度"),
    text(
      "How much the visible feed frames topics through confrontation, crisis, scandal, threat, or adversarial comparison.",
      "可见推荐以对抗、危机、丑闻、威胁或敌对比较来组织议题的程度。",
    ),
    [
      text("No visible conflict framing.", "没有明显的冲突框架。"),
      text("One mild or peripheral conflict cue.", "仅有一个轻微或边缘性的冲突线索。"),
      text("Conflict framing is present but does not dominate the feed.", "存在冲突框架，但尚未主导推荐。"),
      text("Conflict or crisis framing appears across much of the feed.", "大部分推荐都出现冲突或危机框架。"),
      text("Confrontation, crisis, or threat dominates nearly all visible items.", "几乎所有可见内容都由对抗、危机或威胁主导。"),
    ],
  ),
  novelty: define(
    "novelty",
    text("Novelty", "新颖程度"),
    text(
      "How varied the visible titles and channels appear relative to one another within the observed feed.",
      "当前可见推荐中的标题与频道彼此呈现出多大程度的差异。",
    ),
    [
      text("Items are nearly identical in topic and source.", "推荐在主题与来源上几乎完全相同。"),
      text("Most items repeat the same topic or source pattern.", "大多数推荐重复相同主题或来源模式。"),
      text("The feed mixes repeated and distinct material.", "推荐中重复内容与不同内容大致并存。"),
      text("Most items introduce visibly distinct topics or sources.", "大多数推荐呈现明显不同的主题或来源。"),
      text("Topics and sources are highly varied across the visible feed.", "可见推荐中的主题与来源高度多样。"),
    ],
  ),
  repetition: define(
    "repetition",
    text("Repetition", "重复程度"),
    text(
      "How strongly visible recommendations repeat titles, topics, phrases, or channels.",
      "可见推荐重复标题、主题、措辞或频道的程度。",
    ),
    [
      text("No meaningful repetition is visible.", "没有可察觉的实质性重复。"),
      text("A small number of weak repetitions are visible.", "仅有少量轻微重复。"),
      text("Repeated and distinct recommendations are balanced.", "重复推荐与不同推荐大致均衡。"),
      text("Repeated topics, phrases, or channels are frequent.", "主题、措辞或频道频繁重复。"),
      text("The visible feed is dominated by the same patterns.", "可见推荐几乎被相同模式主导。"),
    ],
  ),
  short_form: define(
    "short_form",
    text("Short-form pressure", "短内容占比"),
    text(
      "How much of the visible feed consists of Shorts or videos lasting one minute or less.",
      "可见推荐中 Shorts 或时长不超过一分钟的视频所占程度。",
    ),
    [
      text("No visible item is short-form.", "没有可见推荐属于短内容。"),
      text("A small minority of visible items are short-form.", "少数可见推荐属于短内容。"),
      text("About half of the visible items are short-form.", "约一半可见推荐属于短内容。"),
      text("Most visible items are short-form.", "大多数可见推荐属于短内容。"),
      text("Nearly every visible item is short-form.", "几乎所有可见推荐都属于短内容。"),
    ],
  ),
  channel_concentration: define(
    "channel_concentration",
    text("Channel concentration", "频道集中度"),
    text(
      "How strongly one visible channel accounts for the observed recommendations.",
      "单一可见频道在当前推荐样本中占据主导的程度。",
    ),
    [
      text("No channel is visibly repeated.", "没有频道明显重复出现。"),
      text("One channel appears slightly more often than others.", "某个频道仅比其他频道略多出现。"),
      text("One channel accounts for a substantial minority of items.", "某个频道占据相当一部分推荐。"),
      text("One channel accounts for most visible items.", "某个频道占据大多数可见推荐。"),
      text("Nearly every visible item comes from one channel.", "几乎所有可见推荐都来自同一频道。"),
    ],
  ),
  topic_concentration: define(
    "topic_concentration",
    text("Topic concentration", "主题集中度"),
    text(
      "How strongly one topic or closely related topic family dominates visible recommendation titles.",
      "单一主题或紧密相关的主题群在可见推荐标题中占据主导的程度。",
    ),
    [
      text("No topic visibly dominates.", "没有主题明显占据主导。"),
      text("A weak topic cluster is visible.", "可见一个较弱的主题聚类。"),
      text("One topic family is prominent but not dominant.", "某一主题群较为突出，但尚未主导。"),
      text("Most items belong to one topic family.", "大多数推荐属于同一主题群。"),
      text("Nearly every item concerns the same topic.", "几乎所有推荐都围绕同一主题。"),
    ],
  ),
  visible_feed_entropy: define(
    "visible_feed_entropy",
    text("Visible-feed diversity", "可见推荐多样性"),
    text(
      "How evenly distinct title and channel signals are distributed across the visible feed.",
      "不同标题与频道信号在可见推荐中分布得是否均衡。",
    ),
    [
      text("The visible signals are almost entirely uniform.", "可见信号几乎完全单一。"),
      text("A small number of signals dominate strongly.", "少数信号占据明显主导。"),
      text("Signal variety and concentration are balanced.", "信号多样性与集中性大致均衡。"),
      text("Distinct signals are broadly and fairly evenly distributed.", "不同信号分布较广且较为均衡。"),
      text("The visible feed is highly varied with little dominance.", "可见推荐高度多样，几乎没有明显主导信号。"),
    ],
  ),
  source_diversity: define(
    "source_diversity",
    text("Source diversity", "来源多样性"),
    text(
      "How many visibly distinct channels contribute to the observed recommendations.",
      "当前可见推荐由多少个彼此不同的频道来源构成。",
    ),
    [
      text("All visible items come from one source.", "所有可见推荐都来自同一来源。"),
      text("A small number of sources account for nearly all items.", "极少数来源占据几乎所有推荐。"),
      text("Several sources are visible, with some repetition.", "可见多个来源，同时存在一定重复。"),
      text("Most items come from distinct sources.", "大多数推荐来自不同来源。"),
      text("Every or nearly every item comes from a distinct source.", "全部或几乎全部推荐都来自不同来源。"),
    ],
  ),
  title_hook_density: define(
    "title_hook_density",
    text("Title-hook density", "标题钩子密度"),
    text(
      "How many visible titles contain explicit curiosity, shock, superlative, urgency, or reveal-style hooks.",
      "可见标题中包含好奇、震惊、极端化、紧迫或揭秘式钩子的比例。",
    ),
    [
      text("No visible title contains an explicit hook.", "没有可见标题包含明显钩子。"),
      text("A small minority of titles contain hooks.", "少数标题包含钩子。"),
      text("Hooks appear in roughly half of visible titles.", "约一半可见标题包含钩子。"),
      text("Most visible titles contain hooks.", "大多数可见标题包含钩子。"),
      text("Nearly every visible title contains a strong hook.", "几乎所有可见标题都包含强钩子。"),
    ],
  ),
} satisfies Record<CalibratedMeasurementId, ValidationMeasurementDefinition>;

function define(
  id: CalibratedMeasurementId,
  name: LocalizedValidationText,
  operationalDefinition: LocalizedValidationText,
  descriptions: readonly LocalizedValidationText[],
): ValidationMeasurementDefinition {
  if (descriptions.length !== 5) {
    throw new Error(`Validation definition ${id} must have five anchors.`);
  }

  return {
    id,
    name,
    operationalDefinition,
    anchors: descriptions.map((description, value) => ({
      value: value as 0 | 1 | 2 | 3 | 4,
      ...description,
    })),
  };
}

function text(en: string, zh: string): LocalizedValidationText {
  return { en, zh };
}
