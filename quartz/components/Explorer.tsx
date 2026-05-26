import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/explorer.scss"

// @ts-ignore
import script from "./scripts/explorer.inline"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"
import { FileTrieNode } from "../util/fileTrie"
import OverflowListFactory from "./OverflowList"
import { concatenateResources } from "../util/resources"

type OrderEntries = "sort" | "filter" | "map"

export interface Options {
  title?: string
  folderDefaultState: "collapsed" | "open"
  folderClickBehavior: "collapse" | "link"
  useSavedState: boolean
  sortFn: (a: FileTrieNode, b: FileTrieNode) => number
  filterFn: (node: FileTrieNode) => boolean
  mapFn: (node: FileTrieNode) => void
  order: OrderEntries[]
}

const defaultOptions: Options = {
  folderDefaultState: "collapsed",
  folderClickBehavior: "link",
  useSavedState: true,
  mapFn: (node) => {
    const names: Record<string, string> = {
      "01-claude": "AI 协作",
      "02-inspiration": "灵感 Spark",
      "03-reading": "阅读 Read",
      "04-moments": "生活 Life",
      "05-reading": "读统 Stats",
      "05-reports": "周报 Weekly",
      "08-health": "健康 Health",
      "insights": "洞察 Insights",
      "taste": "品味 Taste",
      "2026": "2026",
      "README": "关于 About",
    }
    if (names[node.slugSegment]) {
      node.displayName = names[node.slugSegment]
    }

    // 清理 taste 目录下文件的显示名：去掉 markdown 图片语法、截断过长内容
    if (!node.isFolder && node.slug?.includes("/taste/")) {
      let name = node.displayName

      // 去掉 markdown 图片语法: 🖼️ [text](url) → text
      name = name.replace(/🖼️\s*\[([^\]]+)\]\([^)]+\)/g, "$1")
      // 去掉普通 markdown 链接: [text](url) → text
      name = name.replace(/!?\[([^\]]+)\]\([^)]+\)/g, "$1")
      // 去掉行内 HTML 标签
      name = name.replace(/<[^>]+>/g, "")

      // 截断过长的名字（中文按字符计，保留 18 个字符）
      if (name.length > 18) {
        name = name.slice(0, 16) + "..."
      }

      node.displayName = name
    }
  },
  sortFn: (a, b) => {
    // Custom sort: directories first, then by defined priority order
    if ((!a.isFolder && !b.isFolder) || (a.isFolder && b.isFolder)) {
      // Priority order for top-level sections
      const priority: Record<string, number> = {
        "AI 协作": 1,
        "灵感 Spark": 2,
        "阅读 Read": 3,
        "读统 Stats": 4,
        "生活 Life": 5,
        "周报 Weekly": 6,
        "健康 Health": 7,
      }
      const aPriority = priority[a.displayName] ?? 99
      const bPriority = priority[b.displayName] ?? 99
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      // Fall back to alphabetical for same priority
      return a.displayName.localeCompare(b.displayName, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    }

    if (!a.isFolder && b.isFolder) {
      return 1
    } else {
      return -1
    }
  },
  filterFn: (node) => node.slugSegment !== "tags" && node.slugSegment !== "templates",
  order: ["filter", "map", "sort"],
}

export type FolderState = {
  path: string
  collapsed: boolean
}

let numExplorers = 0
export default ((userOpts?: Partial<Options>) => {
  const opts: Options = { ...defaultOptions, ...userOpts }
  const { OverflowList, overflowListAfterDOMLoaded } = OverflowListFactory()

  const Explorer: QuartzComponent = ({ cfg, displayClass }: QuartzComponentProps) => {
    const id = `explorer-${numExplorers++}`

    return (
      <div
        class={classNames(displayClass, "explorer")}
        data-behavior={opts.folderClickBehavior}
        data-collapsed={opts.folderDefaultState}
        data-savestate={opts.useSavedState}
        data-data-fns={JSON.stringify({
          order: opts.order,
          sortFn: opts.sortFn.toString(),
          filterFn: opts.filterFn.toString(),
          mapFn: opts.mapFn.toString(),
        })}
      >
        <button
          type="button"
          class="explorer-toggle mobile-explorer hide-until-loaded"
          data-mobile={true}
          aria-controls={id}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide-menu"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          class="title-button explorer-toggle desktop-explorer"
          data-mobile={false}
          aria-expanded={true}
        >
          <h2>{opts.title ?? i18n(cfg.locale).components.explorer.title}</h2>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="5 8 14 8"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="fold"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div id={id} class="explorer-content" aria-expanded={false} role="group">
          <OverflowList class="explorer-ul" />
        </div>
        <template id="template-file">
          <li>
            <a href="#"></a>
          </li>
        </template>
        <template id="template-folder">
          <li>
            <div class="folder-container">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="5 8 14 8"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="folder-icon"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              <div>
                <button class="folder-button">
                  <span class="folder-title"></span>
                </button>
              </div>
            </div>
            <div class="folder-outer">
              <ul class="content"></ul>
            </div>
          </li>
        </template>
      </div>
    )
  }

  Explorer.css = style
  Explorer.afterDOMLoaded = concatenateResources(script, overflowListAfterDOMLoaded)
  return Explorer
}) satisfies QuartzComponentConstructor
