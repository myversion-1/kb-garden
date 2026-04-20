import { Translation } from "./definition"

export default {
  propertyDefaults: {
    title: "无题",
    description: "无描述",
  },
  components: {
    callout: {
      note: "笔记",
      abstract: "摘要",
      info: "提示",
      todo: "待办",
      tip: "提示",
      success: "成功",
      question: "问题",
      warning: "警告",
      failure: "失败",
      danger: "危险",
      bug: "错误",
      example: "示例",
      quote: "引用",
    },
    statusTag: {
      seed: "种子 Seed",
      sapling: "幼苗 Sapling",
      evergreen: "常青 Evergreen",
    },
    backlinks: {
      title: "反向链接 Backlinks",
      noBacklinksFound: "无法找到反向链接 / No backlinks found",
    },
    themeToggle: {
      lightMode: "亮色模式 Light",
      darkMode: "暗色模式 Dark",
    },
    readerMode: {
      title: "阅读模式 Reader",
    },
    explorer: {
      title: "探索 Explorer",
    },
    footer: {
      createdWith: "Created with",
    },
    graph: {
      title: "关系图谱 Graph",
    },
    recentNotes: {
      title: "最近的笔记 Recent",
      seeRemainingMore: ({ remaining }) => `查看更多${remaining}篇笔记 → See ${remaining} more →`,
    },
    transcludes: {
      transcludeOf: ({ targetSlug }) => `包含${targetSlug}`,
      linkToOriginal: "指向原始笔记的链接 / Link to original",
    },
    search: {
      title: "搜索 Search",
      searchBarPlaceholder: "搜索些什么 / Search for something",
    },
    tableOfContents: {
      title: "目录 Contents",
    },
    contentMeta: {
      readingTime: ({ minutes }) => `${minutes}分钟阅读 / ${minutes} min read`,
    },
  },
  pages: {
    rss: {
      recentNotes: "最近的笔记 / Recent Notes",
      lastFewNotes: ({ count }) => `最近的${count}条笔记 / Last ${count} notes`,
    },
    error: {
      title: "无法找到 / Not Found",
      notFound: "私有笔记或笔记不存在。/ This page is private or doesn't exist.",
      home: "返回首页 / Return to Homepage",
    },
    folderContent: {
      folder: "文件夹 Folder",
      itemsUnderFolder: ({ count }) => `此文件夹下有${count}条笔记。/ ${count} items in this folder.`,
    },
    tagContent: {
      tag: "标签 Tag",
      tagIndex: "标签索引 Tag Index",
      itemsUnderTag: ({ count }) => `此标签下有${count}条笔记。/ ${count} items with this tag.`,
      showingFirst: ({ count }) => `显示前${count}个标签。/ Showing first ${count} tags.`,
      totalTags: ({ count }) => `总共有${count}个标签。/ ${count} total tags.`,
    },
  },
} as const satisfies Translation
