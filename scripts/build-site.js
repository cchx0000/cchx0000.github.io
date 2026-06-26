const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const contentPath = path.join(root, "content.md");
const indexPath = path.join(root, "index.html");

function html(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function attr(value) {
  return html(value).replaceAll("'", "&#39;");
}

function section(markdown, name) {
  const heading = `## ${name}`;
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return "";
  const end = lines.findIndex((line, index) => index > start && /^##\s+/.test(line));
  return lines.slice(start + 1, end === -1 ? undefined : end).join("\n").trim();
}

function field(block, key, fallback = "") {
  const pattern = new RegExp(`^${key}:\\s*(.+)$`, "m");
  return block.match(pattern)?.[1].trim() ?? fallback;
}

function rootField(markdown, key, fallback = "") {
  const beforeSections = markdown.split(/^## /m)[0];
  return field(beforeSections, key, fallback);
}

function title(markdown, fallback = "cchx0000") {
  return markdown.match(/^#\s+(.+)$/m)?.[1].trim() ?? fallback;
}

function paragraphText(block) {
  return block
    .split("\n")
    .filter((line) => line.trim() && !/^[A-Za-z]+:/.test(line) && !/^### /.test(line) && !/^- /.test(line))
    .join(" ")
    .trim();
}

function pipeList(block) {
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).split("|").map((part) => part.trim()));
}

function cards(block) {
  const result = [];
  const lines = block.split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    if (line.startsWith("### ")) {
      if (current) result.push(current);
      current = {
        parts: line.slice(4).split("|").map((part) => part.trim()),
        lines: [],
      };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) result.push(current);

  return result.map((item) => {
    const bodyBlock = item.lines.join("\n");
    return {
      parts: item.parts,
      body: paragraphText(bodyBlock),
      button: field(bodyBlock, "Button"),
      list: pipeList(bodyBlock),
    };
  });
}

function splitButton(value, fallbackText, fallbackHref) {
  const [text, href] = String(value || "").split("|").map((part) => part?.trim());
  return {
    text: text || fallbackText,
    href: href || fallbackHref,
  };
}

function readExistingCss() {
  if (!fs.existsSync(indexPath)) return "";
  const current = fs.readFileSync(indexPath, "utf8");
  return current.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
}

const markdown = fs.readFileSync(contentPath, "utf8");
const css = readExistingCss();

const siteTitle = title(markdown);
const tagline = rootField(markdown, "Tagline", "Research, publications, code notes, and technical experiments.");
const footer = rootField(markdown, "Footer", `© 2026 ${siteTitle}. Research homepage built with GitHub Pages.`);

const bio = section(markdown, "Bio") || section(markdown, "Hero");
const heroPrimary = splitButton(field(bio, "Primary"), "Publications", "#publications");
const heroSecondary = splitButton(field(bio, "Secondary"), "Research Areas", "#research");
const research = section(markdown, "Research");
const publications = section(markdown, "Publications");
const projects = section(markdown, "Projects");
const contact = section(markdown, "Contact");

const researchHtml = cards(research)
  .map(({ parts, body }) => `
            <article class="research-card">
              <span class="tag">${html(parts[0])}</span>
              <h3>${html(parts[1] || parts[0])}</h3>
              <p>${html(body)}</p>
            </article>`)
  .join("");

const publicationHtml = cards(publications)
  .map(({ parts, body }) => {
    const [year, name, href, label] = parts;
    return `
            <article class="publication">
              <div class="pub-year">${html(year)}</div>
              <div>
                <h3>${html(name)}</h3>
                <p>${html(body)}</p>
              </div>
              <a class="pub-link" href="${attr(href || "#")}">${html(label || "Link")}</a>
            </article>`;
  })
  .join("");

const projectCards = cards(projects);
const projectIntroCard = projectCards[0] || { parts: ["Repository Index"], body: "", button: "" };
const projectButton = splitButton(projectIntroCard.button, "Open GitHub", "https://github.com/cchx0000");
const projectListCard = projectCards[1] || { parts: ["Current Categories"], list: [] };
const projectListHtml = projectListCard.list
  .map(([label, desc]) => `                <li><strong>${html(label)}</strong><span>${html(desc)}</span></li>`)
  .join("\n");

const contactButton = splitButton(field(contact, "Button"), `github.com/${siteTitle}`, `https://github.com/${siteTitle}`);

const output = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${html(siteTitle)} | Research</title>
    <meta name="description" content="Research, publications, and project notes from ${html(siteTitle)}.">
    <style>${css}</style>
  </head>
  <body>
    <div class="layout">
      <aside class="sidebar" aria-label="Site navigation">
        <div class="sidebar-inner">
          <div>
            <a class="identity" href="#top" aria-label="${attr(siteTitle)} home">
              <span class="avatar">CX</span>
              <span>
                <h1>${html(siteTitle)}</h1>
                <p>${html(tagline)}</p>
              </span>
            </a>

            <nav class="nav" aria-label="Primary navigation">
              <a href="#research">Research</a>
              <a href="#publications">Publications</a>
              <a href="#projects">Projects</a>
              <a href="#contact">Contact</a>
            </nav>
          </div>

          <div class="sidebar-footer">
            <a class="side-link" href="https://github.com/${attr(siteTitle)}">GitHub Profile</a>
            <a class="side-link" href="https://github.com/${attr(siteTitle)}/${attr(siteTitle)}.github.io">Site Source</a>
          </div>
        </div>
      </aside>

      <main id="top" class="content">
        <section class="hero wrap" aria-label="Bio">
          <div class="hero-main">
            <p class="eyebrow">${html(field(bio, "Eyebrow", "Bio"))}</p>
            <h2>${html(field(bio, "Title", siteTitle))}</h2>
            <p class="lede">${html(field(bio, "Body"))}</p>
            <div class="hero-actions">
              <a class="button" href="${attr(heroPrimary.href)}">${html(heroPrimary.text)}</a>
              <a class="button secondary" href="${attr(heroSecondary.href)}">${html(heroSecondary.text)}</a>
            </div>
          </div>

          <aside class="hero-card" aria-label="Bio details">
            <div class="hero-card-visual" aria-hidden="true"></div>
            <div class="hero-card-body">
              <div class="bio-card">
                <p class="eyebrow">Research Focus</p>
                <p>${html(field(bio, "Focus", tagline))}</p>
                <dl>
                  <div>
                    <dt>Affiliation</dt>
                    <dd>${html(field(bio, "Affiliation", "Independent research"))}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>${html(field(bio, "Email", ""))}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </aside>
        </section>

        <section id="research" class="wrap">
          <div class="section-head">
            <h2>Research</h2>
            <p>${html(field(research, "Intro"))}</p>
          </div>

          <div class="research-grid">${researchHtml}
          </div>
        </section>

        <section id="publications" class="wrap">
          <div class="section-head">
            <h2>Publications</h2>
            <p>${html(field(publications, "Intro"))}</p>
          </div>

          <div class="publication-list">${publicationHtml}
          </div>
        </section>

        <section id="projects" class="wrap">
          <div class="section-head">
            <h2>Projects</h2>
            <p>${html(field(projects, "Intro"))}</p>
          </div>

          <div class="notes-grid">
            <article class="note">
              <h3>${html(projectIntroCard.parts[0])}</h3>
              <p>${html(projectIntroCard.body)}</p>
              <a class="button secondary" href="${attr(projectButton.href)}">${html(projectButton.text)}</a>
            </article>

            <article class="note">
              <h3>${html(projectListCard.parts[0])}</h3>
              <ul class="note-list">
${projectListHtml}
              </ul>
            </article>
          </div>
        </section>

        <section id="contact" class="wrap">
          <div class="contact">
            <div>
              <p class="eyebrow">${html(field(contact, "Eyebrow", "Contact"))}</p>
              <h2>${html(field(contact, "Title"))}</h2>
              <p>${html(field(contact, "Body"))}</p>
            </div>
            <a class="button" href="${attr(contactButton.href)}">${html(contactButton.text)}</a>
          </div>
        </section>

        <footer class="wrap">
          <span>${html(footer)}</span>
        </footer>
      </main>
    </div>
  </body>
</html>
`;

fs.writeFileSync(indexPath, output);
console.log(`Built ${path.relative(root, indexPath)} from ${path.relative(root, contentPath)}`);
