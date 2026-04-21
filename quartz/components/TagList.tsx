import { FullSlug, resolveRelative } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const STATUS_TAGS = ["seed", "sapling", "evergreen"]
const SOURCE_TAGS = ["telegram"]

const TAG_DISPLAY: Record<string, string> = {
  seed: "🌱 seed",
  sapling: "🌿 sapling",
  evergreen: "🌲 evergreen",
  telegram: "🤖 telegram",
}

const TagList: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const tags = fileData.frontmatter?.tags
  if (tags && tags.length > 0) {
    return (
      <ul class={classNames(displayClass, "tags")}>
        {tags.map((tag) => {
          const linkDest = resolveRelative(fileData.slug!, `tags/${tag}` as FullSlug)
          const isStatusTag = STATUS_TAGS.includes(tag)
          const isSourceTag = SOURCE_TAGS.includes(tag)
          let tagClass: string
          if (isStatusTag) {
            tagClass = `status-tag status-${tag}`
          } else if (isSourceTag) {
            tagClass = "source-tag"
          } else {
            tagClass = "tag-link"
          }
          return (
            <li>
              <a href={linkDest} class={classNames("internal", tagClass)}>
                {TAG_DISPLAY[tag] || tag}
              </a>
            </li>
          )
        })}
      </ul>
    )
  } else {
    return null
  }
}

TagList.css = `
.tags {
  list-style: none;
  display: flex;
  padding-left: 0;
  gap: 0.4rem;
  margin: 1rem 0;
  flex-wrap: wrap;
}

.section-li > .section > .tags {
  justify-content: flex-end;
}
  
.tags > li {
  display: inline-block;
  white-space: nowrap;
  margin: 0;
  overflow-wrap: normal;
}

a.internal.tag-link {
  border-radius: 8px;
  background-color: var(--highlight);
  padding: 0.2rem 0.4rem;
  margin: 0 0.1rem;
}

a.internal.status-tag {
  border-radius: 12px;
  padding: 0.2rem 0.5rem;
  font-weight: 500;
  color: var(--dark);
}

a.internal.status-seed {
  background-color: #c8e6c9;
  color: #2e7d32;
}

a.internal.status-sapling {
  background-color: #bbdefb;
  color: #1565c0;
}

a.internal.status-evergreen {
  background-color: #e1bee7;
  color: #6a1b9a;
}

a.internal.source-tag {
  border-radius: 12px;
  padding: 0.2rem 0.5rem;
  font-weight: 500;
  background-color: var(--lightgray);
  color: var(--darkgray);
  font-size: 0.85em;
}
`

export default (() => TagList) satisfies QuartzComponentConstructor
