import type { FeedItem } from "./feed-item";
import type { MeasurementCalibrationCorpus } from "./measurement-calibration";

export const MEASUREMENT_CALIBRATION_CORPUS = {
  version: 1,
  provenance: "synthetic-engineering-fixtures",
  cases: [
    {
      id: "calm-en",
      language: "en",
      description: "Neutral long-form titles with distinct channels and no hook or conflict wording.",
      items: [
        item("calm-en-1", "A quiet walk through the city gardens", "City Archive", "18:20"),
        item("calm-en-2", "How public libraries organize local collections", "Library Notes", "24:10"),
        item("calm-en-3", "Traditional bread making in a family bakery", "Food Stories", "16:45"),
      ],
      expected: {
        stimulation: range(0, 25, "Neutral titles should remain below moderate stimulation."),
        conflict: range(0, 0, "No complete conflict phrases are present."),
        short_form: range(0, 0, "Every visible duration is longer than one minute."),
        title_hook_density: range(0, 0, "No title contains a configured hook signal."),
      },
    },
    {
      id: "hook-heavy-en",
      language: "en",
      description: "English titles deliberately saturated with configured attention hooks.",
      items: [
        item("hook-en-1", "BREAKING: 10 SHOCKING secrets you won't believe!!!", "Flash Daily", "9:20"),
        item("hook-en-2", "The BIGGEST illegal scandal finally EXPOSED!", "Viral Report", "11:10"),
        item("hook-en-3", "This INSANE discovery changes everything!!!", "Now Channel", "8:05"),
      ],
      expected: {
        stimulation: range(85, 100, "Multiple hooks, capitals, numbers, and punctuation should saturate stimulation."),
        title_hook_density: range(100, 100, "Every title contains configured hook evidence."),
      },
    },
    {
      id: "calm-zh",
      language: "zh",
      description: "Neutral Chinese long-form titles without configured hook or conflict wording.",
      items: [
        item("calm-zh-1", "城市公共交通发展记录", "城市档案", "18:20"),
        item("calm-zh-2", "博物馆年度展览导览", "文化笔记", "24:10"),
        item("calm-zh-3", "传统面点制作过程", "地方故事", "16:45"),
      ],
      expected: {
        stimulation: range(0, 15, "Short neutral Chinese titles should remain low stimulation."),
        conflict: range(0, 0, "No configured Chinese conflict phrase is present."),
        title_hook_density: range(0, 0, "No configured Chinese hook phrase is present."),
      },
    },
    {
      id: "hook-heavy-zh",
      language: "zh",
      description: "Chinese titles deliberately saturated with configured attention hooks.",
      items: [
        item("hook-zh-1", "震惊揭秘：史上最大秘密终于曝光", "热点观察", "9:20"),
        item("hook-zh-2", "万万没想到！最强事件背后的真相", "今日焦点", "11:10"),
        item("hook-zh-3", "疯狂争议现场，结果太惊人！", "热榜频道", "8:05"),
      ],
      expected: {
        stimulation: range(85, 100, "Multiple configured Chinese hooks should saturate stimulation."),
        title_hook_density: range(100, 100, "Every title contains configured Chinese hook evidence."),
      },
    },
    {
      id: "conflict-heavy-en",
      language: "en",
      description: "English titles contain complete conflict and crisis phrases across the feed.",
      items: [
        item("conflict-en-1", "Military conflict enters a new crisis", "World Desk", "14:10"),
        item("conflict-en-2", "Political scandal triggers another debate", "Public Affairs", "12:30"),
        item("conflict-en-3", "War tensions and the regional battle explained", "History Review", "20:00"),
      ],
      expected: {
        conflict: range(90, 100, "Every title contains at least one complete configured conflict phrase."),
      },
    },
    {
      id: "conflict-heavy-zh",
      language: "zh",
      description: "Chinese titles contain configured conflict and crisis language across the feed.",
      items: [
        item("conflict-zh-1", "军事冲突进入新的危机阶段", "国际观察", "14:10"),
        item("conflict-zh-2", "战争紧张局势引发公开争议", "公共议题", "12:30"),
        item("conflict-zh-3", "地区对抗与灾难风险分析", "历史研究", "20:00"),
      ],
      expected: {
        conflict: range(90, 100, "Every title contains configured Chinese conflict evidence."),
      },
    },
    {
      id: "diverse-feed",
      language: "en",
      description: "Distinct topics and channels provide a high-variety engineering fixture.",
      items: [
        item("diverse-1", "Urban design in Copenhagen", "City Lab", "15:00"),
        item("diverse-2", "Ancient astronomy instruments", "Science Archive", "18:00"),
        item("diverse-3", "Regional bread traditions", "Food Atlas", "12:00"),
        item("diverse-4", "Restoring a wooden sailing boat", "Craft Journal", "21:00"),
      ],
      expected: {
        novelty: range(85, 100, "Titles and channels intentionally avoid repeated signals."),
        channel_concentration: range(25, 25, "Four items come from four distinct channels."),
        topic_concentration: range(0, 20, "No title topic should dominate the token set."),
        visible_feed_entropy: range(90, 100, "Visible title and channel signals are broadly distributed."),
        source_diversity: range(100, 100, "Every item has a distinct visible channel."),
      },
    },
    {
      id: "repetitive-feed",
      language: "en",
      description: "Repeated titles and one channel create an intentionally narrow fixture.",
      items: [
        item("repeat-1", "City market weekly update", "One Channel", "12:00"),
        item("repeat-2", "City market weekly update", "One Channel", "13:00"),
        item("repeat-3", "City market weekly update", "One Channel", "14:00"),
        item("repeat-4", "City market weekly update", "One Channel", "15:00"),
      ],
      expected: {
        novelty: range(15, 35, "Repeated terms and one channel should suppress novelty."),
        repetition: range(65, 90, "Repeated title tokens and channel exposure should raise repetition."),
        channel_concentration: range(100, 100, "All items come from one channel."),
        topic_concentration: range(20, 40, "Each repeated title token appears in every item."),
        source_diversity: range(25, 25, "One unique channel is visible across four items."),
      },
    },
    {
      id: "short-form-heavy",
      language: "mixed",
      description: "Three of four items are short by duration or Shorts URL.",
      items: [
        item("short-1", "Quick museum view", "A", "0:42"),
        item("short-2", "城市一角", "B", "0:55"),
        item("short-3", "Fast cooking note", "C", "", true),
        item("short-4", "Full documentary", "D", "18:00"),
      ],
      expected: {
        short_form: range(75, 75, "Exactly three of four visible items qualify as short-form."),
      },
    },
    {
      id: "long-form-only",
      language: "mixed",
      description: "All items have long durations and ordinary watch URLs.",
      items: [
        item("long-1", "Architecture lecture", "A", "1:20:00"),
        item("long-2", "历史纪录片", "B", "42:00"),
        item("long-3", "Public policy discussion", "C", "28:30"),
      ],
      expected: {
        short_form: range(0, 0, "No duration or URL qualifies as short-form."),
      },
    },
    {
      id: "substring-negative-control",
      language: "en",
      description: "Benign words containing short substrings must not trigger conflict matching.",
      items: [
        item("negative-1", "A forward-looking city plan", "Planning Notes", "12:00"),
        item("negative-2", "A tour of Warwick library", "Travel Archive", "14:00"),
      ],
      expected: {
        conflict: range(0, 0, "Forward and Warwick contain substrings but no complete conflict token."),
      },
    },
  ],
} satisfies MeasurementCalibrationCorpus;

function range(min: number, max: number, rationale: string) {
  return { min, max, rationale };
}

function item(
  id: string,
  title: string,
  channel: string,
  duration: string,
  shorts = false,
): FeedItem {
  return {
    id,
    platform: "calibration",
    title,
    channel,
    description: "",
    duration,
    url: shorts
      ? `https://www.youtube.com/shorts/${id}`
      : `https://www.youtube.com/watch?v=${id}`,
  };
}
