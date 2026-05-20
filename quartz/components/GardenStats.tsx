import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const STATUS_TAGS = ["seed", "sapling", "evergreen"]
const STATUS_LABELS: Record<string, string> = {
  seed: "🌱 种子",
  sapling: "🌿 幼苗",
  evergreen: "🌲 常青",
}
const STATUS_COLORS: Record<string, string> = {
  seed: "#c8e6c9",
  sapling: "#bbdefb",
  evergreen: "#e1bee7",
}

const GardenStats: QuartzComponent = ({ allFiles, displayClass }: QuartzComponentProps) => {
  const notes = allFiles.filter((f) => !f.slug?.endsWith("index"))
  const total = notes.length

  const statusCounts: Record<string, number> = {}
  for (const tag of STATUS_TAGS) {
    statusCounts[tag] = notes.filter((f) => f.frontmatter?.tags?.includes(tag)).length
  }

  return (
    <div class={classNames(displayClass, "garden-stats")}>
      <div class="stats-row">
        <div class="stat-card total">
          <span class="stat-number">{total}</span>
          <span class="stat-label">笔记</span>
        </div>
        {STATUS_TAGS.map((tag) => (
          <div class="stat-card" style={`background-color: ${STATUS_COLORS[tag]}22`}>
            <span class="stat-number">{statusCounts[tag]}</span>
            <span class="stat-label">{STATUS_LABELS[tag]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

GardenStats.css = `
.garden-stats {
  margin: 1.5rem 0;
}

.stats-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 4.5rem;
  padding: 0.6rem 0.8rem;
  border-radius: 10px;
  background-color: var(--lightgray);
  transition: transform 0.15s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card.total {
  background-color: var(--highlight);
}

.stat-number {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--dark);
  line-height: 1.2;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--darkgray);
  margin-top: 0.2rem;
}
`

export default (() => GardenStats) satisfies QuartzComponentConstructor
