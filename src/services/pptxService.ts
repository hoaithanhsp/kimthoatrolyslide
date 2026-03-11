/**
 * PPTX Export Service
 * Chuyển đổi HTML slides sang PowerPoint sử dụng PptxGenJS
 */

import PptxGenJS from 'pptxgenjs';
import { extractDOMSlideData, drawSlideData } from './domToPptx';

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
 * Tạo file PPTX với công thức toán dạng hình ảnh trực quan và giữ nguyên định dạng HTML/CSS (Advanced)
 */
export async function generatePptxWithMath(slides: SlideData[], filename: string = 'bai-giang-slide-visual'): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Trợ Lý Tạo Slide';
  pptx.title = 'Bài Giảng Slide';
  pptx.subject = 'Bài giảng được tạo bởi AI (công thức trực quan)';

  // Create an offscreen container to render exactly like the active slide
  const container = document.createElement('div');
  container.className = 'slide active';
  // Force fixed dimensions for 16:9 layout presentation
  container.style.width = '1280px';
  container.style.height = '720px';
  container.style.position = 'fixed'; // Not absolute to avoid page scrolling issues
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.padding = '40px 60px'; // From CSS
  container.style.backgroundColor = 'white';
  
  // It's crucial to append it so getComputedStyle and bounding boxes work
  document.body.appendChild(container);

  try {
    for (let index = 0; index < slides.length; index++) {
      const slideData = slides[index];
      const presSlide = pptx.addSlide();
      
      container.innerHTML = slideData.content;
      
      // Render MathJax
      if (window.MathJax && window.MathJax.typesetPromise) {
        await window.MathJax.typesetPromise([container]);
      }
      
      // Small delay to allow images (if any) or complex SVG to render layout
      await new Promise(r => setTimeout(r, 50));

      const domSlideData = await extractDOMSlideData(container);
      drawSlideData(domSlideData, presSlide, pptx);
    }
    
    await pptx.writeFile({ fileName: `${filename}.pptx` });
  } finally {
    document.body.removeChild(container);
  }
}

// Declare MathJax type for TypeScript
declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: Element[]) => Promise<void>;
    };
  }
}
