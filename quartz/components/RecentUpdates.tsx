import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { resolveRelative } from "../util/path"
import { getDate } from "./Date"

/**
 * 从文件名提取日期。
 * 支持格式：
 *   - 2026-03-23-weekly.md → 2026-03-23
 *   - 04-21-constraint-map.md → 当年 04-21（需配合 frontmatter 或回退）
 *   - 03-07-160615-xxx.md → 03-07（忽略时间戳部分）
 */
function extractDateFromFilename(slug: string): Date | undefined {
  const basename = slug.split("/").pop() ?? ""
  // 匹配 2026-03-23 或 2026-03-23-weekly 开头的文件名
  const fullDateMatch = basename.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (fullDateMatch) {
    const d = new Date(`${fullDateMatch[1]}-${fullDateMatch[2]}-${fullDateMatch[3]}`)
    if (!isNaN(d.getTime())) return d
  }
  // 匹配 MM-DD 格式（如 04-21-constraint-map）
  const shortDateMatch = basename.match(/^(\d{2})-(\d{2})/)
  if (shortDateMatch) {
    const year = new Date().getFullYear()
    const d = new Date(`${year}-${shortDateMatch[1]}-${shortDateMatch[2]}`)
    if (!isNaN(d.getTime())) return d
  }
  return undefined
}

function getPageDate(cfg: QuartzComponentProps["cfg"], page: QuartzComponentProps["allFiles"][0]): Date | undefined {
  // 1. 优先 frontmatter.date（最可靠）
  if (page.frontmatter?.date) {
    const d = new Date(page.frontmatter.date)
    if (!isNaN(d.getTime())) return d
  }
  // 2. 从文件名提取（适用于周报、inspiration 等）
  const fileDate = extractDateFromFilename(page.slug ?? "")
  if (fileDate) return fileDate
  // 3. 回退到 Quartz 的日期（文件修改/git 时间）
  return getDate(cfg, page)
}

const RecentUpdates: QuartzComponent = ({ allFiles, fileData, displayClass, cfg }: QuartzComponentProps) => {
  const candidates = allFiles
    .filter((f) => !f.slug?.endsWith("index"))
    .filter((f) => !f.slug?.includes("04-moments/taste/"))
    .map((page) => ({ page, date: getPageDate(cfg, page) }))
    .filter((item) => item.date !== undefined)
    .sort((a, b) => b.date!.getTime() - a.date!.getTime())

  // 限制同一目录下最多 2 条，避免周报类批量文件占满
  const dirCounts: Record<string, number> = {}
  const notes: typeof candidates = []
  for (const item of candidates) {
    const slug = item.page.slug ?? ""
    const lastSlash = slug.lastIndexOf("/")
    const dir = lastSlash > 0 ? slug.slice(0, lastSlash) : slug
    dirCounts[dir] = (dirCounts[dir] || 0) + 1
    if (dirCounts[dir] <= 1) {
      notes.push(item)
    }
    if (notes.length >= 7) break
  }

  if (notes.length === 0) return null

  const formatShortDate = (d: Date) => {
    const m = d.getMonth() + 1
    const day = d.getDate()
    return `${m}.${day}`
  }

  const truncate = (s: string, max: number) => {
    if (s.length <= max) return s
    return s.slice(0, max) + "…"
  }

  return (
    <div class={classNames(displayClass, "recent-updates")}>
      <span class="recent-updates-label">最近：</span>
      <span class="recent-updates-list">
        {notes.map(({ page, date }, i) => {
          const title = page.frontmatter?.title ?? page.slug ?? "Untitled"
          return (
            <>
              <a
                href={resolveRelative(fileData.slug!, page.slug!)}
                class="internal recent-updates-item"
                title={title}
              >
                <span class="recent-updates-date">{formatShortDate(date!)}</span>
                <span class="recent-updates-title">{truncate(title, 12)}</span>
              </a>
              {i < notes.length - 1 && <span class="recent-updates-sep">·</span>}
            </>
          )
        })}
      </span>
    </div>
  )
}

RecentUpdates.css = `
.recent-updates {
  margin: 0.5rem 0 1.5rem;
  font-size: 0.85rem;
  line-height: 1.6;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
}

.recent-updates-label {
  color: var(--darkgray);
  font-weight: 500;
  white-space: nowrap;
}

.recent-updates-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.2rem 0.4rem;
}

.recent-updates-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--dark);
  text-decoration: none;
  transition: color 0.15s ease;
  white-space: nowrap;
}

.recent-updates-item:hover {
  color: var(--secondary);
}

.recent-updates-date {
  color: var(--darkgray);
  font-size: 0.8rem;
}

.recent-updates-title {
  font-weight: 500;
}

.recent-updates-sep {
  color: var(--lightgray);
  margin: 0 0.1rem;
  user-select: none;
}

@media (max-width: 600px) {
  .recent-updates {
    font-size: 0.8rem;
  }
  .recent-updates-title {
    max-width: 10ch;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
`

export default (() => RecentUpdates) satisfies QuartzComponentConstructor
