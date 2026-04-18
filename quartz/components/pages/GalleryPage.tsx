import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

import { Root } from "hast"
import { htmlToJsx } from "../../util/jsx"
import { ComponentChildren } from "preact"
import path from "path"
import fs from "fs"

interface GalleryPageOptions {
  excludeDirs: string[]
}

const defaultOptions: GalleryPageOptions = {
  excludeDirs: ["people"],
}

function scanImagesForFolder(
  contentDir: string,
  folderSlug: string,
  excludeDirs: string[],
): Map<string, Array<{ filename: string; title: string }>> {
  const categoryMap = new Map<string, Array<{ filename: string; title: string }>>()

  const folderPath = path.join(contentDir, folderSlug)
  if (!fs.existsSync(folderPath)) {
    return categoryMap
  }

  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]

  function scanDir(dir: string, category: string) {
    if (!fs.existsSync(dir)) return

    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          scanDir(fullPath, entry.name)
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (imageExts.includes(ext)) {
          const filename = entry.name
          const title = filename
            .replace(/\.[^.]+$/, "")
            .replace(/_/g, " ")
            .replace(/\d{13}/, "") // Remove timestamp

          if (!categoryMap.has(category)) {
            categoryMap.set(category, [])
          }
          categoryMap.get(category)!.push({ filename, title })
        }
      }
    }
  }

  // Scan subdirectories of 04-moments
  const subDirs = fs.readdirSync(folderPath, { withFileTypes: true })
  for (const subDir of subDirs) {
    if (subDir.isDirectory() && !excludeDirs.includes(subDir.name)) {
      scanDir(path.join(folderPath, subDir.name), subDir.name)
    }
  }

  return categoryMap
}

export default ((opts?: Partial<GalleryPageOptions>) => {
  const options: GalleryPageOptions = { ...defaultOptions, ...opts }

  const GalleryPage: QuartzComponent = (props: QuartzComponentProps) => {
    const { tree, fileData, cfg } = props
    const { ctx } = props

    // Get current folder path from slug
    const slug = fileData.slug ?? ""
    // Remove trailing "index" if present (e.g., "04-moments/index" -> "04-moments")
    const cleanSlug = slug.replace(/\/index$/, "")
    const parts = cleanSlug.split("/").filter(Boolean)

    // Only apply gallery view for 04-moments folder (not subfolders)
    if (parts[0] !== "04-moments" || parts.length > 1) {
      return null
    }

    // Get content directory from argv
    const contentDir = ctx.argv.directory

    // Scan images from filesystem using cleanSlug
    const categoryMap = scanImagesForFolder(contentDir, cleanSlug, options.excludeDirs)

    // Sort categories alphabetically
    const categories = Array.from(categoryMap.keys()).sort()

    // Sort images within each category by filename (which contains timestamp, descending)
    for (const category of categories) {
      categoryMap.get(category)!.sort((a, b) => b.filename.localeCompare(a.filename))
    }

    const content = (
      (tree as Root).children.length === 0
        ? fileData.description
        : htmlToJsx(fileData.filePath!, tree)
    ) as ComponentChildren

    // Category display names
    const categoryNames: Record<string, string> = {
      taste: "品味",
      food: "美食",
      landscape: "风景",
      art: "艺术",
      document: "文档",
      misc: "其他",
      images: "影像",
      code: "代码",
      screenshot: "截图",
      plants: "植物",
      animals: "动物",
    }

    return (
      <div class="popover-hint">
        <article>{content}</article>
        <div class="gallery-container">
          {categories.length === 0 ? (
            <p style={{ opacity: 0.6 }}>暂无图片</p>
          ) : (
            categories.map((category) => (
              <details class="gallery-category" open>
                <summary>
                  <span class="category-name">{categoryNames[category] || category}</span>
                  <span class="category-count">({categoryMap.get(category)!.length})</span>
                </summary>
                <div class="gallery-grid">
                  {categoryMap.get(category)!.map((item) => {
                    // Build the relative path to the image (category/filename, resolved from /04-moments/)
                    const imagePath = `${category}/${item.filename}`
                    return (
                      <div class="gallery-item">
                        <img
                          src={imagePath}
                          alt={item.title}
                          title={item.title}
                          loading="lazy"
                        />
                      </div>
                    )
                  })}
                </div>
              </details>
            ))
          )}
        </div>
      </div>
    )
  }

  GalleryPage.css = `
.gallery-container {
  margin-top: 1em;
}

.gallery-category {
  margin-bottom: 1em;
  border: 1px solid var(--lightgray);
  border-radius: 8px;
  overflow: hidden;
}

.gallery-category summary {
  padding: 0.75em 1em;
  background: var(--lightgray);
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5em;
  user-select: none;
}

.gallery-category summary:hover {
  background: var(--gray);
}

.category-name {
  color: var(--dark);
}

.category-count {
  color: var(--darkgray);
  font-weight: normal;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75em;
  padding: 1em;
  background: var(--light);
}

.gallery-item {
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 6px;
  background: var(--lightgray);
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.gallery-item img:hover {
  transform: scale(1.05);
}

@media (max-width: 600px) {
  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.5em;
  }
}
`

  return GalleryPage
}) satisfies QuartzComponentConstructor