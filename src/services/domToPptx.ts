import PptxGenJS from 'pptxgenjs';

// Constants
const PT_PER_PX = 0.75;
const PX_PER_IN = 96;

export interface DOMOptions {
  presLayout?: string;
  slideWidthpx?: number;
  slideHeightpx?: number;
}

// Helper functions for parsing
const pxToInch = (px: number) => px / PX_PER_IN;
const pxToPoints = (pxStr: string | number) => parseFloat(String(pxStr)) * PT_PER_PX;
const rgbToHex = (rgbStr: string) => {
  if (rgbStr === 'rgba(0, 0, 0, 0)' || rgbStr === 'transparent') return 'FFFFFF';
  const match = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return 'FFFFFF';
  return match.slice(1).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
};

const extractAlpha = (rgbStr: string) => {
  const match = rgbStr.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!match || !match[4]) return null;
  const alpha = parseFloat(match[4]);
  return Math.round((1 - alpha) * 100);
};

const applyTextTransform = (text: string, textTransform: string) => {
  if (textTransform === 'uppercase') return text.toUpperCase();
  if (textTransform === 'lowercase') return text.toLowerCase();
  if (textTransform === 'capitalize') {
    return text.replace(/\b\w/g, c => c.toUpperCase());
  }
  return text;
};

const getRotation = (transform: string, writingMode: string) => {
  let angle = 0;
  if (writingMode === 'vertical-rl') {
    angle = 90;
  } else if (writingMode === 'vertical-lr') {
    angle = 270;
  }

  if (transform && transform !== 'none') {
    const rotateMatch = transform.match(/rotate\((-?\d+(?:\.\d+)?)deg\)/);
    if (rotateMatch) {
      angle += parseFloat(rotateMatch[1]);
    } else {
      const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
      if (matrixMatch) {
        const values = matrixMatch[1].split(',').map(parseFloat);
        const matrixAngle = Math.atan2(values[1], values[0]) * (180 / Math.PI);
        angle += Math.round(matrixAngle);
      }
    }
  }

  angle = angle % 360;
  if (angle < 0) angle += 360;
  return angle === 0 ? null : angle;
};

const getPositionAndSize = (el: HTMLElement, rect: DOMRect, rotation: number | null, containerRect: DOMRect) => {
  // Translate relative to container
  const left = rect.left - containerRect.left;
  const top = rect.top - containerRect.top;

  if (rotation === null) {
    return { x: left, y: top, w: rect.width, h: rect.height };
  }

  const isVertical = rotation === 90 || rotation === 270;
  if (isVertical) {
    const centerX = left + rect.width / 2;
    const centerY = top + rect.height / 2;
    return {
      x: centerX - rect.height / 2,
      y: centerY - rect.width / 2,
      w: rect.height,
      h: rect.width
    };
  }

  const centerX = left + rect.width / 2;
  const centerY = top + rect.height / 2;
  return {
    x: centerX - el.offsetWidth / 2,
    y: centerY - el.offsetHeight / 2,
    w: el.offsetWidth,
    h: el.offsetHeight
  };
};

const parseBoxShadow = (boxShadow: string) => {
  if (!boxShadow || boxShadow === 'none') return null;
  const insetMatch = boxShadow.match(/inset/);
  if (insetMatch) return null;

  const colorMatch = boxShadow.match(/rgba?\([^)]+\)/);
  const parts = boxShadow.match(/([-\d.]+)(px|pt)/g);

  if (!parts || parts.length < 2) return null;

  const offsetX = parseFloat(parts[0]);
  const offsetY = parseFloat(parts[1]);
  const blur = parts.length > 2 ? parseFloat(parts[2]) : 0;

  let angle = 0;
  if (offsetX !== 0 || offsetY !== 0) {
    angle = Math.atan2(offsetY, offsetX) * (180 / Math.PI);
    if (angle < 0) angle += 360;
  }

  const offset = Math.sqrt(offsetX * offsetX + offsetY * offsetY) * PT_PER_PX;
  let opacity = 0.5;
  if (colorMatch) {
    const opacityMatch = colorMatch[0].match(/[\d.]+\)$/);
    if (opacityMatch) {
      opacity = parseFloat(opacityMatch[0].replace(')', ''));
    }
  }

  return {
    type: 'outer',
    angle: Math.round(angle),
    blur: blur * 0.75,
    color: colorMatch ? rgbToHex(colorMatch[0]) : '000000',
    offset: offset,
    opacity
  };
};

const SINGLE_WEIGHT_FONTS = ['impact'];
const shouldSkipBold = (fontFamily: string) => {
  if (!fontFamily) return false;
  const normalizedFont = fontFamily.toLowerCase().replace(/['"]/g, '').split(',')[0].trim();
  return SINGLE_WEIGHT_FONTS.includes(normalizedFont);
};

const parseInlineFormatting = (element: Element, baseOptions: any = {}, runs: any[] = [], baseTextTransform: any = (x: string) => x) => {
  let prevNodeIsText = false;

  element.childNodes.forEach((node: Node) => {
    let textTransform = baseTextTransform;
    const isText = node.nodeType === Node.TEXT_NODE || (node as Element).tagName === 'BR';
    
    if (isText) {
      const text = (node as Element).tagName === 'BR' ? '\n' : textTransform((node.textContent || '').replace(/\s+/g, ' '));
      const prevRun = runs[runs.length - 1];
      if (prevNodeIsText && prevRun) {
        prevRun.text += text;
      } else {
        runs.push({ text, options: { ...baseOptions } });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE && (node.textContent || '').trim()) {
      const elNode = node as Element;
      const options = { ...baseOptions };
      const computed = window.getComputedStyle(elNode);

      if (['SPAN', 'B', 'STRONG', 'I', 'EM', 'U'].includes(elNode.tagName)) {
        const isBold = computed.fontWeight === 'bold' || parseInt(computed.fontWeight) >= 600;
        if (isBold && !shouldSkipBold(computed.fontFamily)) options.bold = true;
        if (computed.fontStyle === 'italic') options.italic = true;
        if (computed.textDecoration && computed.textDecoration.includes('underline')) options.underline = true;
        if (computed.color && computed.color !== 'rgb(0, 0, 0)') {
          options.color = rgbToHex(computed.color);
          const transparency = extractAlpha(computed.color);
          if (transparency !== null) options.transparency = transparency;
        }
        if (computed.fontSize) options.fontSize = pxToPoints(computed.fontSize);

        if (computed.textTransform && computed.textTransform !== 'none') {
          const transformStr = computed.textTransform;
          textTransform = (text: string) => applyTextTransform(text, transformStr);
        }

        parseInlineFormatting(elNode, options, runs, textTransform);
      } else {
         parseInlineFormatting(elNode, options, runs, textTransform);
      }
    }
    prevNodeIsText = isText;
  });

  if (runs.length > 0) {
    runs[0].text = runs[0].text.replace(/^\s+/, '');
    runs[runs.length - 1].text = runs[runs.length - 1].text.replace(/\s+$/, '');
  }

  return runs.filter(r => r.text.length > 0);
};

export async function extractDOMSlideData(container: HTMLElement) {
  const containerStyle = window.getComputedStyle(container);
  const containerRect = container.getBoundingClientRect();
  
  const bgImage = containerStyle.backgroundImage;
  const bgColor = containerStyle.backgroundColor;

  let background: any;
  if (bgImage && bgImage !== 'none') {
    const urlMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
    if (urlMatch) {
      background = { type: 'image', path: urlMatch[1] };
    } else {
      background = { type: 'color', value: rgbToHex(bgColor) };
    }
  } else {
    background = { type: 'color', value: rgbToHex(bgColor) };
  }

  const elements: any[] = [];
  const textTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI'];
  const processed = new Set();
  
  // Create a copy of the elements to iterate, as extracting formulas might add/change things
  const allElements = Array.from(container.querySelectorAll('*'));

  for (const el of allElements) {
    if (processed.has(el)) continue;

    const elHtml = el as HTMLElement;

    // Skip empty elements
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    // Is it an image?
    if (el.tagName === 'IMG') {
      const img = el as HTMLImageElement;
      elements.push({
        type: 'image',
        src: img.src,
        position: {
          x: pxToInch(rect.left - containerRect.left),
          y: pxToInch(rect.top - containerRect.top),
          w: pxToInch(rect.width),
          h: pxToInch(rect.height)
        }
      });
      processed.add(el);
      continue;
    }

    // Is it an SVG? (e.g. from MathJax) -> convert to image later via logic or directly render it
    if (el.tagName === 'mjx-container' || el.tagName.toLowerCase() === 'svg') {
       elements.push({
         type: 'svg_node',
         node: el.cloneNode(true),
         position: {
           x: pxToInch(rect.left - containerRect.left),
           y: pxToInch(rect.top - containerRect.top),
           w: pxToInch(rect.width),
           h: pxToInch(rect.height)
         }
       });
       processed.add(el);
       // mark descendants as processed
       el.querySelectorAll('*').forEach(child => processed.add(child));
       continue;
    }

    // Is it a shape? (DIVs)
    if (el.tagName === 'DIV' && !el.classList.contains('slide')) {
      const computed = window.getComputedStyle(el);
      const hasBg = computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)';
      
      const borders = [
        parseFloat(computed.borderTopWidth),
        parseFloat(computed.borderRightWidth),
        parseFloat(computed.borderBottomWidth),
        parseFloat(computed.borderLeftWidth)
      ].map(b => b || 0);

      const hasBorder = borders.some(b => b > 0);
      const hasUniformBorder = hasBorder && borders.every(b => b === borders[0]);
      
      if (hasBg || hasUniformBorder) {
         elements.push({
           type: 'shape',
           text: '',
           position: {
             x: pxToInch(rect.left - containerRect.left),
             y: pxToInch(rect.top - containerRect.top),
             w: pxToInch(rect.width),
             h: pxToInch(rect.height)
           },
           shape: {
             fill: hasBg ? rgbToHex(computed.backgroundColor) : null,
             transparency: hasBg ? extractAlpha(computed.backgroundColor) : null,
             line: hasUniformBorder ? {
               color: rgbToHex(computed.borderTopColor),
               width: pxToPoints(computed.borderTopWidth)
             } : null,
             rectRadius: (() => {
               const radius = computed.borderRadius;
               const radiusValue = parseFloat(radius);
               if (radiusValue === 0 || isNaN(radiusValue)) return 0;
               if (radius.includes('%')) {
                 if (radiusValue >= 50) return 1;
                 const minDim = Math.min(rect.width, rect.height);
                 return (radiusValue / 100) * pxToInch(minDim);
               }
               if (radius.includes('pt')) return radiusValue / 72;
               return radiusValue / PX_PER_IN;
             })(),
             shadow: parseBoxShadow(computed.boxShadow)
           }
         });
      }

      // Add border lines if partial
      if (hasBorder && !hasUniformBorder) {
        const x = pxToInch(rect.left - containerRect.left);
        const y = pxToInch(rect.top - containerRect.top);
        const w = pxToInch(rect.width);
        const h = pxToInch(rect.height);

        if (borders[0] > 0) {
          const widthPt = pxToPoints(computed.borderTopWidth);
          elements.push({ type: 'line', x1: x, y1: y, x2: x + w, y2: y, width: widthPt, color: rgbToHex(computed.borderTopColor) });
        }
        if (borders[1] > 0) {
          const widthPt = pxToPoints(computed.borderRightWidth);
          elements.push({ type: 'line', x1: x + w, y1: y, x2: x + w, y2: y + h, width: widthPt, color: rgbToHex(computed.borderRightColor) });
        }
        if (borders[2] > 0) {
          const widthPt = pxToPoints(computed.borderBottomWidth);
          elements.push({ type: 'line', x1: x, y1: y + h, x2: x + w, y2: y + h, width: widthPt, color: rgbToHex(computed.borderBottomColor) });
        }
        if (borders[3] > 0) {
          const widthPt = pxToPoints(computed.borderLeftWidth);
          elements.push({ type: 'line', x1: x, y1: y, x2: x, y2: y + h, width: widthPt, color: rgbToHex(computed.borderLeftColor) });
        }
      }

      // don't mark as processed, we want its text tags to be processed!
    }

    if (el.tagName === 'UL' || el.tagName === 'OL') {
        const liElements = Array.from(el.querySelectorAll('li'));
        const items: any[] = [];
        const ulComputed = window.getComputedStyle(el);
        const ulPaddingLeftPt = pxToPoints(ulComputed.paddingLeft);
        const marginLeft = ulPaddingLeftPt * 0.5;
        const textIndent = ulPaddingLeftPt * 0.5;

        liElements.forEach((li, idx) => {
          const isLast = idx === liElements.length - 1;
          const runs = parseInlineFormatting(li, { breakLine: false });
          if (runs.length > 0) {
            runs[0].text = runs[0].text.replace(/^[•\-*▪▸]\s*/, '');
            runs[0].options.bullet = { indent: textIndent };
          }
          if (runs.length > 0 && !isLast) {
            runs[runs.length - 1].options.breakLine = true;
          }
          items.push(...runs);
        });

        const computed = window.getComputedStyle(liElements[0] || el);
        
        elements.push({
          type: 'list',
          items: items,
          position: {
            x: pxToInch(rect.left - containerRect.left),
            y: pxToInch(rect.top - containerRect.top),
            w: pxToInch(rect.width),
            h: pxToInch(rect.height)
          },
          style: {
            fontSize: pxToPoints(computed.fontSize) || 18,
            fontFace: computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
            color: rgbToHex(computed.color),
            transparency: extractAlpha(computed.color),
            align: computed.textAlign === 'start' ? 'left' : computed.textAlign,
            lineSpacing: computed.lineHeight && computed.lineHeight !== 'normal' ? pxToPoints(computed.lineHeight) : null,
            paraSpaceBefore: 0,
            paraSpaceAfter: pxToPoints(computed.marginBottom),
            margin: [marginLeft, 0, 0, 0]
          }
        });

        liElements.forEach(li => processed.add(li));
        processed.add(el);
        continue;
    }

    if (!textTags.includes(el.tagName)) continue;

    const text = (el.textContent || '').trim();
    if (!text) continue;

    // It's a plain text block
    const computed = window.getComputedStyle(el);
    const rotation = getRotation(computed.transform, computed.writingMode);
    const pos = getPositionAndSize(elHtml, rect, rotation, containerRect);

    const baseStyle: any = {
      fontSize: pxToPoints(computed.fontSize) || 18,
      fontFace: computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
      color: rgbToHex(computed.color),
      align: computed.textAlign === 'start' ? 'left' : computed.textAlign,
      lineSpacing: pxToPoints(computed.lineHeight),
      paraSpaceBefore: pxToPoints(computed.marginTop),
      paraSpaceAfter: pxToPoints(computed.marginBottom),
      margin: [
        pxToPoints(computed.paddingLeft),
        pxToPoints(computed.paddingRight),
        pxToPoints(computed.paddingBottom),
        pxToPoints(computed.paddingTop)
      ]
    };

    const transparency = extractAlpha(computed.color);
    if (transparency !== null) baseStyle.transparency = transparency;
    if (rotation !== null) baseStyle.rotate = rotation;

    const hasFormatting = el.querySelector('b, i, u, strong, em, span, br');
    if (hasFormatting) {
       const transformStr = computed.textTransform;
       const runs = parseInlineFormatting(el, {}, [], (str: string) => applyTextTransform(str, transformStr));
       elements.push({
         type: el.tagName.toLowerCase(),
         text: runs,
         position: { x: pxToInch(pos.x), y: pxToInch(pos.y), w: pxToInch(pos.w), h: pxToInch(pos.h) },
         style: baseStyle
       });
    } else {
       const transformedText = applyTextTransform(text, computed.textTransform);
       const isBold = computed.fontWeight === 'bold' || parseInt(computed.fontWeight) >= 600;

       elements.push({
         type: el.tagName.toLowerCase(),
         text: transformedText,
         position: { x: pxToInch(pos.x), y: pxToInch(pos.y), w: pxToInch(pos.w), h: pxToInch(pos.h) },
         style: {
           ...baseStyle,
           bold: isBold && !shouldSkipBold(computed.fontFamily),
           italic: computed.fontStyle === 'italic',
           underline: computed.textDecoration.includes('underline')
         }
       });
    }

    processed.add(el);
  }

  return { background, elements };
}

export function drawSlideData(slideData: any, targetSlide: any, pres: PptxGenJS) {
  if (slideData.background.type === 'image' && slideData.background.path) {
    targetSlide.background = { path: slideData.background.path };
  } else if (slideData.background.type === 'color' && slideData.background.value) {
    targetSlide.background = { color: slideData.background.value };
  }

  for (const el of slideData.elements) {
    if (el.type === 'image') {
      targetSlide.addImage({
        path: el.src,
        x: el.position.x,
        y: el.position.y,
        w: el.position.w,
        h: el.position.h
      });
    } else if (el.type === 'svg_node') {
       // Convert SVG to data url and add image
       try {
         const svgClone = el.node as SVGElement;
         const svgData = new XMLSerializer().serializeToString(svgClone);
         const encoded = encodeURIComponent(svgData);
         const dataUrl = `data:image/svg+xml;utf8,${encoded}`;
         targetSlide.addImage({
           data: dataUrl,
           x: el.position.x,
           y: Math.max(0, el.position.y), 
           w: el.position.w,
           h: el.position.h
         });
       } catch (e) {
         console.warn("Failed to render SVG element", e);
       }
    } else if (el.type === 'line') {
      targetSlide.addShape(pres.ShapeType.line, {
        x: el.x1,
        y: el.y1,
        w: el.x2 - el.x1,
        h: el.y2 - el.y1,
        line: { color: el.color, width: el.width }
      });
    } else if (el.type === 'shape') {
      const shapeOptions: any = {
        x: el.position.x,
        y: el.position.y,
        w: el.position.w,
        h: el.position.h,
        shape: el.shape.rectRadius > 0 ? pres.ShapeType.roundRect : pres.ShapeType.rect
      };

      if (el.shape.fill) {
        shapeOptions.fill = { color: el.shape.fill };
        if (el.shape.transparency != null) shapeOptions.fill.transparency = el.shape.transparency;
      }
      if (el.shape.line) shapeOptions.line = el.shape.line;
      if (el.shape.rectRadius > 0) shapeOptions.rectRadius = el.shape.rectRadius;
      if (el.shape.shadow) shapeOptions.shadow = el.shape.shadow;

      targetSlide.addText(el.text || '', shapeOptions);
    } else if (el.type === 'list') {
      const listOptions: any = {
        x: el.position.x,
        y: el.position.y,
        w: el.position.w,
        h: el.position.h,
        fontSize: el.style.fontSize,
        fontFace: el.style.fontFace,
        color: el.style.color,
        align: el.style.align,
        valign: 'top',
        lineSpacing: el.style.lineSpacing,
        paraSpaceBefore: el.style.paraSpaceBefore,
        paraSpaceAfter: el.style.paraSpaceAfter,
        margin: el.style.margin
      };
      targetSlide.addText(el.items, listOptions);
    } else {
      const lineHeight = el.style.lineSpacing || (el.style.fontSize && el.style.fontSize * 1.2) || 20;
      const isSingleLine = el.position.h <= lineHeight * 1.5;

      let adjustedX = el.position.x;
      let adjustedW = el.position.w;

      if (isSingleLine) {
        const widthIncrease = el.position.w * 0.02;
        const align = el.style.align;
        if (align === 'center') {
          adjustedX = el.position.x - (widthIncrease / 2);
          adjustedW = el.position.w + widthIncrease;
        } else if (align === 'right') {
          adjustedX = el.position.x - widthIncrease;
          adjustedW = el.position.w + widthIncrease;
        } else {
          adjustedW = el.position.w + widthIncrease;
        }
      }

      const textOptions: any = {
        x: adjustedX,
        y: el.position.y,
        w: adjustedW,
        h: el.position.h,
        fontSize: el.style.fontSize,
        fontFace: el.style.fontFace,
        color: el.style.color,
        bold: el.style.bold,
        italic: el.style.italic,
        underline: el.style.underline,
        valign: 'top',
        lineSpacing: el.style.lineSpacing,
        paraSpaceBefore: el.style.paraSpaceBefore,
        paraSpaceAfter: el.style.paraSpaceAfter,
        inset: 0
      };

      if (el.style.align) textOptions.align = el.style.align;
      if (el.style.margin) textOptions.margin = el.style.margin;
      if (el.style.rotate !== undefined) textOptions.rotate = el.style.rotate;
      if (el.style.transparency !== null && el.style.transparency !== undefined) textOptions.transparency = el.style.transparency;

      targetSlide.addText(el.text, textOptions);
    }
  }
}
