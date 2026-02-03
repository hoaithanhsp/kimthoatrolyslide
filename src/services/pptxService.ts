/**
 * PPTX Export Service
 * Chuyển đổi HTML slides sang PowerPoint sử dụng PptxGenJS
 */

import PptxGenJS from 'pptxgenjs';

interface SlideData {
  id: number;
  title: string;
  content: string;
}

// Màu sắc chính
const COLORS = {
  primary: '2563eb',
  secondary: '1e40af',
  accent: 'f59e0b',
  text: '1e293b',
  white: 'FFFFFF',
};

// Regex để detect LaTeX
const LATEX_INLINE_REGEX = /\$([^$]+)\$/g;
const LATEX_BLOCK_REGEX = /\$\$([^$]+)\$\$/g;

/**
 * Render LaTeX thành hình ảnh base64 sử dụng MathJax
 */
async function renderLatexToImage(latex: string, isBlock: boolean = false): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      // Tạo container tạm thời
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.fontSize = isBlock ? '24px' : '20px';
      container.style.color = '#1e293b';
      container.style.background = 'white';
      container.style.padding = '10px';

      // Wrap LaTeX với delimiters
      container.innerHTML = isBlock ? `\\[${latex}\\]` : `\\(${latex}\\)`;
      document.body.appendChild(container);

      // Đợi MathJax render
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([container]).then(() => {
          // Tìm SVG element
          const svg = container.querySelector('svg');
          if (svg) {
            // Clone SVG và set dimensions
            const svgClone = svg.cloneNode(true) as SVGElement;
            const bbox = svg.getBoundingClientRect();

            // Set explicit dimensions
            svgClone.setAttribute('width', String(bbox.width * 2));
            svgClone.setAttribute('height', String(bbox.height * 2));
            svgClone.style.background = 'white';

            // Serialize SVG
            const svgData = new XMLSerializer().serializeToString(svgClone);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            // Render to canvas
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const scale = 2; // High resolution
              canvas.width = bbox.width * scale;
              canvas.height = bbox.height * scale;

              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const base64 = canvas.toDataURL('image/png');
                URL.revokeObjectURL(url);
                document.body.removeChild(container);
                resolve(base64);
              } else {
                document.body.removeChild(container);
                resolve(null);
              }
            };
            img.onerror = () => {
              URL.revokeObjectURL(url);
              document.body.removeChild(container);
              resolve(null);
            };
            img.src = url;
          } else {
            document.body.removeChild(container);
            resolve(null);
          }
        }).catch(() => {
          document.body.removeChild(container);
          resolve(null);
        });
      } else {
        document.body.removeChild(container);
        resolve(null);
      }
    } catch {
      resolve(null);
    }
  });
}

/**
 * Parse text và tách LaTeX formulas
 */
interface TextSegment {
  type: 'text' | 'latex-inline' | 'latex-block';
  content: string;
}

function parseTextWithLatex(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let remaining = text;

  // Xử lý block math trước
  remaining = remaining.replace(LATEX_BLOCK_REGEX, '[[LATEX_BLOCK:$1]]');
  remaining = remaining.replace(LATEX_INLINE_REGEX, '[[LATEX_INLINE:$1]]');

  // Split và parse
  const parts = remaining.split(/\[\[LATEX_(BLOCK|INLINE):([^\]]+)\]\]/);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (part === 'BLOCK' && parts[i + 1]) {
      segments.push({ type: 'latex-block', content: parts[i + 1] });
      i++; // Skip next part
    } else if (part === 'INLINE' && parts[i + 1]) {
      segments.push({ type: 'latex-inline', content: parts[i + 1] });
      i++;
    } else if (part !== 'BLOCK' && part !== 'INLINE') {
      segments.push({ type: 'text', content: part });
    }
  }

  return segments;
}

/**
 * Parse HTML content và trích xuất text
 */
function parseHtmlContent(html: string): { title: string; bullets: string[]; paragraphs: string[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');

  // Lấy tiêu đề
  const h1 = doc.querySelector('h1');
  const h2 = doc.querySelector('h2');
  const title = h1?.textContent?.trim() || h2?.textContent?.trim() || '';

  // Lấy bullet points từ ul/ol
  const bullets: string[] = [];
  const listItems = doc.querySelectorAll('li');
  listItems.forEach(li => {
    const text = li.textContent?.trim();
    if (text) bullets.push(text);
  });

  // Lấy paragraphs
  const paragraphs: string[] = [];
  const pElements = doc.querySelectorAll('p');
  pElements.forEach(p => {
    const text = p.textContent?.trim();
    if (text) paragraphs.push(text);
  });

  return { title, bullets, paragraphs };
}

/**
 * Tạo file PPTX từ danh sách slides (phiên bản cơ bản - không render công thức)
 */
export async function generatePptx(slides: SlideData[], filename: string = 'bai-giang-slide'): Promise<void> {
  const pptx = new PptxGenJS();

  // Thiết lập presentation
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Trợ Lý Tạo Slide';
  pptx.title = 'Bài Giảng Slide';
  pptx.subject = 'Bài giảng được tạo bởi AI';

  // Tạo từng slide
  slides.forEach((slideData, index) => {
    const slide = pptx.addSlide();

    // Background
    slide.background = { color: COLORS.white };

    // Parse nội dung HTML
    const { title, bullets, paragraphs } = parseHtmlContent(slideData.content);

    // Slide đầu tiên - Title slide
    if (index === 0) {
      // Tiêu đề chính
      slide.addText(title || slideData.title, {
        x: 0.5,
        y: 2,
        w: 9,
        h: 1.5,
        fontSize: 44,
        fontFace: 'Arial',
        color: COLORS.primary,
        bold: true,
        align: 'center',
        valign: 'middle',
      });

      // Subtitle nếu có paragraph
      if (paragraphs.length > 0) {
        slide.addText(paragraphs[0], {
          x: 0.5,
          y: 3.5,
          w: 9,
          h: 0.8,
          fontSize: 24,
          fontFace: 'Arial',
          color: COLORS.text,
          align: 'center',
          valign: 'middle',
        });
      }

      // Thêm bullets nếu có
      if (bullets.length > 0) {
        const bulletText = bullets.map(b => ({ text: b, options: { bullet: true, breakLine: true } }));
        slide.addText(bulletText, {
          x: 1,
          y: 4.2,
          w: 8,
          h: 1.5,
          fontSize: 18,
          fontFace: 'Arial',
          color: COLORS.text,
          valign: 'top',
        });
      }
    } else {
      // Content slides

      // Tiêu đề
      const slideTitle = title || slideData.title;
      slide.addText(slideTitle, {
        x: 0.5,
        y: 0.3,
        w: 9,
        h: 0.8,
        fontSize: 32,
        fontFace: 'Arial',
        color: COLORS.secondary,
        bold: true,
        valign: 'middle',
      });

      // Đường kẻ dưới tiêu đề
      slide.addShape('rect', {
        x: 0.5,
        y: 1.1,
        w: 2,
        h: 0.05,
        fill: { color: COLORS.accent },
      });

      let yPosition = 1.4;

      // Thêm paragraphs
      paragraphs.forEach(p => {
        slide.addText(p, {
          x: 0.5,
          y: yPosition,
          w: 9,
          h: 0.6,
          fontSize: 18,
          fontFace: 'Arial',
          color: COLORS.text,
          valign: 'top',
        });
        yPosition += 0.7;
      });

      // Thêm bullets
      if (bullets.length > 0) {
        const bulletItems = bullets.map(b => ({
          text: b,
          options: {
            bullet: { type: 'bullet' as const },
            breakLine: true,
            paraSpaceBefore: 6,
            paraSpaceAfter: 6,
          }
        }));

        slide.addText(bulletItems, {
          x: 0.5,
          y: yPosition,
          w: 9,
          h: 4,
          fontSize: 20,
          fontFace: 'Arial',
          color: COLORS.text,
          valign: 'top',
        });
      }

      // Số trang
      slide.addText(`${index + 1}`, {
        x: 9,
        y: 5,
        w: 0.5,
        h: 0.3,
        fontSize: 12,
        fontFace: 'Arial',
        color: '999999',
        align: 'right',
      });
    }
  });

  // Xuất file
  await pptx.writeFile({ fileName: `${filename}.pptx` });
}

/**
 * Tạo file PPTX với công thức toán dạng hình ảnh trực quan
 */
export async function generatePptxWithMath(slides: SlideData[], filename: string = 'bai-giang-slide-visual'): Promise<void> {
  const pptx = new PptxGenJS();

  // Thiết lập presentation
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Trợ Lý Tạo Slide';
  pptx.title = 'Bài Giảng Slide';
  pptx.subject = 'Bài giảng được tạo bởi AI (công thức trực quan)';

  // Tạo từng slide
  for (let index = 0; index < slides.length; index++) {
    const slideData = slides[index];
    const slide = pptx.addSlide();

    // Background
    slide.background = { color: COLORS.white };

    // Parse nội dung HTML
    const { title, bullets, paragraphs } = parseHtmlContent(slideData.content);

    // Slide đầu tiên - Title slide
    if (index === 0) {
      slide.addText(title || slideData.title, {
        x: 0.5,
        y: 2,
        w: 9,
        h: 1.5,
        fontSize: 44,
        fontFace: 'Arial',
        color: COLORS.primary,
        bold: true,
        align: 'center',
        valign: 'middle',
      });

      if (paragraphs.length > 0) {
        slide.addText(paragraphs[0], {
          x: 0.5,
          y: 3.5,
          w: 9,
          h: 0.8,
          fontSize: 24,
          fontFace: 'Arial',
          color: COLORS.text,
          align: 'center',
          valign: 'middle',
        });
      }
    } else {
      // Content slides
      const slideTitle = title || slideData.title;
      slide.addText(slideTitle, {
        x: 0.5,
        y: 0.3,
        w: 9,
        h: 0.8,
        fontSize: 32,
        fontFace: 'Arial',
        color: COLORS.secondary,
        bold: true,
        valign: 'middle',
      });

      slide.addShape('rect', {
        x: 0.5,
        y: 1.1,
        w: 2,
        h: 0.05,
        fill: { color: COLORS.accent },
      });

      let yPosition = 1.4;

      // Xử lý paragraphs với LaTeX
      for (const p of paragraphs) {
        const segments = parseTextWithLatex(p);
        let xPosition = 0.5;

        for (const segment of segments) {
          if (segment.type === 'text') {
            slide.addText(segment.content, {
              x: xPosition,
              y: yPosition,
              w: 9,
              h: 0.6,
              fontSize: 18,
              fontFace: 'Arial',
              color: COLORS.text,
              valign: 'top',
            });
          } else {
            // Render LaTeX thành hình ảnh
            const isBlock = segment.type === 'latex-block';
            const imgData = await renderLatexToImage(segment.content, isBlock);

            if (imgData) {
              slide.addImage({
                data: imgData,
                x: xPosition,
                y: yPosition,
                w: isBlock ? 4 : 2,
                h: isBlock ? 1 : 0.5,
              });
              yPosition += isBlock ? 1.2 : 0.6;
            } else {
              // Fallback: hiển thị text thô nếu render thất bại
              slide.addText(segment.content, {
                x: xPosition,
                y: yPosition,
                w: 9,
                h: 0.6,
                fontSize: 18,
                fontFace: 'Arial',
                color: COLORS.text,
                valign: 'top',
              });
            }
          }
        }
        yPosition += 0.7;
      }

      // Xử lý bullets với LaTeX
      for (const bullet of bullets) {
        const segments = parseTextWithLatex(bullet);
        let hasLatex = segments.some(s => s.type !== 'text');

        if (hasLatex) {
          // Nếu có LaTeX, render từng phần
          let xPos = 0.7;
          slide.addText('• ', {
            x: 0.5,
            y: yPosition,
            w: 0.2,
            h: 0.5,
            fontSize: 20,
            fontFace: 'Arial',
            color: COLORS.text,
          });

          for (const segment of segments) {
            if (segment.type === 'text') {
              slide.addText(segment.content, {
                x: xPos,
                y: yPosition,
                w: 8.5,
                h: 0.5,
                fontSize: 20,
                fontFace: 'Arial',
                color: COLORS.text,
                valign: 'top',
              });
            } else {
              const imgData = await renderLatexToImage(segment.content, false);
              if (imgData) {
                slide.addImage({
                  data: imgData,
                  x: xPos,
                  y: yPosition,
                  w: 2,
                  h: 0.4,
                });
              }
            }
          }
          yPosition += 0.6;
        } else {
          // Không có LaTeX, xử lý như bình thường
          slide.addText([{
            text: bullet,
            options: {
              bullet: { type: 'bullet' as const },
            }
          }], {
            x: 0.5,
            y: yPosition,
            w: 9,
            h: 0.5,
            fontSize: 20,
            fontFace: 'Arial',
            color: COLORS.text,
            valign: 'top',
          });
          yPosition += 0.6;
        }
      }

      // Số trang
      slide.addText(`${index + 1}`, {
        x: 9,
        y: 5,
        w: 0.5,
        h: 0.3,
        fontSize: 12,
        fontFace: 'Arial',
        color: '999999',
        align: 'right',
      });
    }
  }

  // Xuất file
  await pptx.writeFile({ fileName: `${filename}.pptx` });
}

// Declare MathJax type for TypeScript
declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: Element[]) => Promise<void>;
    };
  }
}
