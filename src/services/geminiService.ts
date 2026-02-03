// Gemini AI Service với cơ chế fallback
export const AI_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', isDefault: true },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', isDefault: false },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', isDefault: false },
] as const;

export type ModelId = typeof AI_MODELS[number]['id'];

export interface GenerationResult {
  success: boolean;
  slides?: string;
  error?: string;
  usedModel?: ModelId;
}

export interface GenerationProgress {
  step: number;
  totalSteps: number;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'stopped';
  message: string;
  currentModel?: ModelId;
}

export interface SlideOutline {
  slideNumber: number;
  title: string;
  keyPoints: string[];
  enableSimulation?: boolean; // Tùy chọn tạo mô phỏng cho slide này
}

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Prompt để tạo outline gợi ý
const generateOutlinePrompt = (content: string, topic: string, slideCount: number): string => {
  return `Bạn là chuyên gia thiết kế bài giảng. Hãy tạo outline cho ${slideCount} slide về chủ đề sau:

CHỦ ĐỀ: ${topic}

${content ? `NỘI DUNG THAM KHẢO:\n${content}` : ''}

Trả về JSON array với format:
[
  {"slideNumber": 1, "title": "Tiêu đề slide", "keyPoints": ["Điểm 1", "Điểm 2", "Điểm 3"]},
  ...
]

CHỈ TRẢ VỀ JSON ARRAY, KHÔNG CÓ MARKDOWN HAY GIẢI THÍCH.`;
};

// Prompt để tạo slide từ nội dung
const generateSlidePrompt = (
  content: string,
  topic?: string,
  slideCount?: number,
  outline?: SlideOutline[],
  subject?: string,
  gradeLevel?: string,
  enableSimulation?: boolean
): string => {
  const slideCountInstruction = slideCount
    ? `Tạo ĐÚNG ${slideCount} slide`
    : 'Tạo 5-8 slide phù hợp với độ dài nội dung';

  const outlineInstruction = outline && outline.length > 0
    ? `\nDÀN Ý YÊU CẦU (tuân theo cấu trúc này):\n${outline.map(s =>
      `Slide ${s.slideNumber}: ${s.title}${s.enableSimulation ? ' 🎮[CẦN MÔ PHỎNG TƯƠNG TÁC]' : ''}\n  - ${s.keyPoints.join('\n  - ')}`
    ).join('\n')}`
    : '';

  // Kiểm tra xem có slide nào cần mô phỏng không
  const slidesWithSimulation = outline?.filter(s => s.enableSimulation) || [];
  const hasPerSlideSimulation = slidesWithSimulation.length > 0;

  // Hướng dẫn theo lớp học
  let ageAppropriateInstruction = '';
  if (gradeLevel) {
    const gradeLevelMap: Record<string, { level: string, style: string, complexity: string }> = {
      'preschool': { level: 'Mầm non (3-5 tuổi)', style: 'rất đơn giản, nhiều hình ảnh minh họa đầy màu sắc, ít chữ, font lớn', complexity: 'rất cơ bản' },
      'grade1': { level: 'Lớp 1 (6-7 tuổi)', style: 'đơn giản, nhiều hình ảnh, chữ to rõ ràng', complexity: 'cơ bản' },
      'grade2': { level: 'Lớp 2 (7-8 tuổi)', style: 'đơn giản, hình ảnh minh họa phong phú', complexity: 'cơ bản' },
      'grade3': { level: 'Lớp 3 (8-9 tuổi)', style: 'vừa phải, có hình ảnh hỗ trợ', complexity: 'cơ bản đến trung bình' },
      'grade4': { level: 'Lớp 4 (9-10 tuổi)', style: 'rõ ràng, có ví dụ minh họa', complexity: 'trung bình' },
      'grade5': { level: 'Lớp 5 (10-11 tuổi)', style: 'chi tiết hơn, kết hợp hình và chữ', complexity: 'trung bình' },
      'grade6': { level: 'Lớp 6 THCS (11-12 tuổi)', style: 'chi tiết, có sơ đồ và biểu đồ', complexity: 'trung bình khá' },
      'grade7': { level: 'Lớp 7 THCS (12-13 tuổi)', style: 'logic, có dẫn chứng', complexity: 'khá' },
      'grade8': { level: 'Lớp 8 THCS (13-14 tuổi)', style: 'chuyên sâu hơn, có công thức', complexity: 'khá đến nâng cao' },
      'grade9': { level: 'Lớp 9 THCS (14-15 tuổi)', style: 'toàn diện, chuẩn bị thi', complexity: 'nâng cao' },
      'grade10': { level: 'Lớp 10 THPT (15-16 tuổi)', style: 'học thuật, có lý thuyết và ví dụ', complexity: 'nâng cao' },
      'grade11': { level: 'Lớp 11 THPT (16-17 tuổi)', style: 'chuyên sâu, công thức phức tạp', complexity: 'nâng cao' },
      'grade12': { level: 'Lớp 12 THPT (17-18 tuổi)', style: 'ôn thi, tổng hợp kiến thức', complexity: 'nâng cao, tổng kết' }
    };
    const gradeInfo = gradeLevelMap[gradeLevel];
    if (gradeInfo) {
      ageAppropriateInstruction = `\n\n🎓 ĐỐI TƯỢNG: ${gradeInfo.level}
- Phong cách trình bày: ${gradeInfo.style}
- Độ phức tạp nội dung: ${gradeInfo.complexity}
- Điều chỉnh ngôn ngữ và thuật ngữ phù hợp với lứa tuổi`;
    }
  }

  // Hướng dẫn theo môn học
  let subjectInstruction = '';
  if (subject) {
    const subjectMap: Record<string, { name: string, englishTerms: string, visualStyle: string }> = {
      'math': { name: 'Toán học (Mathematics)', englishTerms: 'equation, function, derivative, integral, theorem, proof', visualStyle: 'đồ thị hàm số, hình học, công thức' },
      'physics': { name: 'Vật lý (Physics)', englishTerms: 'force, velocity, acceleration, energy, momentum, wave', visualStyle: 'sơ đồ lực, biểu đồ chuyển động, mô hình thí nghiệm' },
      'chemistry': { name: 'Hóa học (Chemistry)', englishTerms: 'atom, molecule, reaction, compound, element, bond', visualStyle: 'công thức cấu tạo, phương trình phản ứng, mô hình phân tử' },
      'biology': { name: 'Sinh học (Biology)', englishTerms: 'cell, DNA, protein, ecosystem, evolution, organism', visualStyle: 'sơ đồ tế bào, chu trình sinh học, cây phát sinh' },
      'informatics': { name: 'Tin học (Informatics)', englishTerms: 'algorithm, variable, function, loop, array, database', visualStyle: 'sơ đồ khối, code snippet, flowchart' },
      'literature': { name: 'Ngữ văn (Literature)', englishTerms: 'metaphor, narrative, theme, character, plot, poetry', visualStyle: 'trích dẫn, sơ đồ tư duy, timeline tác phẩm' },
      'history': { name: 'Lịch sử (History)', englishTerms: 'era, civilization, revolution, dynasty, treaty, reform', visualStyle: 'timeline lịch sử, bản đồ, hình ảnh tư liệu' },
      'geography': { name: 'Địa lý (Geography)', englishTerms: 'climate, terrain, population, economy, natural resources', visualStyle: 'bản đồ, biểu đồ thống kê, sơ đồ địa hình' },
      'technology': { name: 'Công nghệ (Technology)', englishTerms: 'design, process, material, structure, system, automation', visualStyle: 'sơ đồ quy trình, bản vẽ kỹ thuật' },
      'music': { name: 'Âm nhạc (Music)', englishTerms: 'melody, rhythm, harmony, tempo, dynamics, notation', visualStyle: 'bản nhạc, ký hiệu nhạc, hình ảnh nhạc cụ' },
      'physical_education': { name: 'Thể dục (Physical Education)', englishTerms: 'exercise, training, technique, stamina, flexibility', visualStyle: 'hình minh họa động tác, sơ đồ sân bãi' },
      'defense_security': { name: 'GDQPAN (Defense & Security)', englishTerms: 'defense, security, training, discipline, patriotism', visualStyle: 'sơ đồ đội hình, hình ảnh minh họa' },
      'career_orientation': { name: 'Hướng nghiệp (Career Orientation)', englishTerms: 'career, skills, profession, interview, resume', visualStyle: 'sơ đồ nghề nghiệp, infographic' },
      'local_education': { name: 'GD địa phương (Local Education)', englishTerms: 'culture, tradition, heritage, community', visualStyle: 'hình ảnh địa phương, bản đồ vùng miền' },
      'economics_law': { name: 'KT & Pháp luật (Economics & Law)', englishTerms: 'market, supply, demand, law, rights, constitution', visualStyle: 'sơ đồ kinh tế, biểu đồ, các điều luật' },
      'english': { name: 'Tiếng Anh (English)', englishTerms: 'grammar, vocabulary, pronunciation, speaking, listening', visualStyle: 'ví dụ câu, từ vựng với hình ảnh, bảng ngữ pháp' }
    };
    const subjectInfo = subjectMap[subject];
    if (subjectInfo) {
      // Môn Tiếng Anh: slide hoàn toàn bằng tiếng Anh
      if (subject === 'english') {
        subjectInstruction = `\n\n📚 MÔN HỌC: ${subjectInfo.name}
- TOÀN BỘ NỘI DUNG SLIDE PHẢI BẰNG TIẾNG ANH (English only)
- Tiêu đề, nội dung, ví dụ đều viết bằng tiếng Anh
- Có thể thêm phần dịch nghĩa tiếng Việt nhỏ bên dưới nếu cần
- Phong cách trực quan: ${subjectInfo.visualStyle}`;
      } else {
        // Các môn khác: CHỈ dùng tiếng Việt, KHÔNG kèm thuật ngữ tiếng Anh
        subjectInstruction = `\n\n📚 MÔN HỌC: ${subjectInfo.name}
- TOÀN BỘ NỘI DUNG SLIDE BẰNG TIẾNG VIỆT
- KHÔNG sử dụng thuật ngữ tiếng Anh
- Phong cách trực quan phù hợp: ${subjectInfo.visualStyle}`;
      }
    }
  }

  // Hướng dẫn mô phỏng trực quan
  let simulationInstruction = '';

  // Kiểm tra: có mô phỏng toàn cục HOẶC có slide nào được chọn mô phỏng
  if (enableSimulation || hasPerSlideSimulation) {
    const simulationTarget = hasPerSlideSimulation
      ? `CHỈ TẠO MÔ PHỎNG CHO CÁC SLIDE SAU: ${slidesWithSimulation.map(s => `Slide ${s.slideNumber}`).join(', ')}`
      : 'TẠO MÔ PHỎNG CHO TẤT CẢ CÁC SLIDE PHÙ HỢP';

    simulationInstruction = `\n\n🎮 MÔ PHỎNG TRỰC QUAN TƯƠNG TÁC:
${simulationTarget}

Yêu cầu kỹ thuật:
1. Sử dụng <div class="simulation"> chứa inline SVG hoặc Canvas
2. Thêm JavaScript inline để xử lý tương tác (click, hover, slider)
3. Ví dụ mô phỏng theo môn:
   - Toán: Đồ thị hàm số với slider điều chỉnh tham số, hình học động
   - Vật lý: Mô phỏng chuyển động (rơi tự do, dao động), sóng, lực
   - Hóa học: Mô hình phân tử 3D đơn giản, phản ứng hóa học động
   - Sinh học: Sơ đồ tế bào có thể click xem chi tiết, chu trình
   - Các môn khác: Timeline tương tác, sơ đồ tư duy có thể mở rộng
4. Code phải đơn giản, chạy được ngay trong browser
5. Thêm hướng dẫn sử dụng cho học sinh ("Click vào...", "Kéo thanh trượt...")

MẪU CODE MÔ PHỎNG:
<div class="simulation">
  <svg viewBox="0 0 400 300" style="width:100%;max-height:250px;background:#f8fafc;border-radius:8px;">
    <!-- SVG content here -->
  </svg>
  <div class="sim-controls"><!-- Buttons, sliders --></div>
  <script>(function(){ /* Interactive JS */ })();</script>
</div>`;
  }

  // Hướng dẫn hình ảnh và âm thanh
  const mediaInstruction = `\n\n🖼️ HÌNH ẢNH:
- KHÔNG sử dụng hình ảnh bên ngoài vì có thể không load được
- Thay vào đó, tạo SVG đơn giản để minh họa khái niệm
- Hoặc dùng emoji lớn để minh họa: <span style="font-size:3rem">📐</span>`;

  // Hướng dẫn màu sắc nhấn mạnh
  const colorEmphasisInstruction = `\n\n🎨 NHẤN MẠNH NỘI DUNG BẰNG MÀU SẮC:
Sử dụng các class CSS có sẵn để làm nổi bật nội dung quan trọng:

Màu chữ:
- <span class="text-primary">màu xanh dương</span>
- <span class="text-success">màu xanh lá</span>  
- <span class="text-danger">màu đỏ</span>
- <span class="text-warning">màu vàng cam</span>
- <span class="text-pink">màu hồng</span>
- <span class="text-secondary">màu tím</span>

Highlight nền:
- <span class="highlight">nền vàng quan trọng</span>
- <span class="highlight-blue">nền xanh dương</span>
- <span class="highlight-green">nền xanh lá</span>

Keyword box:
- <span class="keyword">từ khóa xanh</span>
- <span class="keyword-green">từ khóa xanh lá</span>
- <span class="keyword-orange">từ khóa cam</span>

In đậm nhấn mạnh:
- <span class="emphasis">in đậm xanh</span>
- <span class="emphasis-red">in đậm đỏ</span>

HÃY SỬ DỤNG LINH HOẠT các class này để nhấn mạnh khái niệm quan trọng, định nghĩa, công thức!`;

  return `Bạn là một chuyên gia thiết kế slide thuyết trình giáo dục. Hãy tạo slide HTML cho nội dung sau.

${topic ? `CHỦ ĐỀ: ${topic}` : ''}

NỘI DUNG TÀI LIỆU:
${content}
${outlineInstruction}${ageAppropriateInstruction}${subjectInstruction}${simulationInstruction}${mediaInstruction}${colorEmphasisInstruction}

YÊU CẦU KỸ THUẬT:
1. ${slideCountInstruction}
2. Mỗi slide phải có class="slide" 
3. Slide đầu tiên là trang tiêu đề với h1
4. Các slide tiếp theo có h2 cho tiêu đề phụ
5. Sử dụng ul/li cho danh sách
6. Sử dụng div class="box" cho các định nghĩa/công thức quan trọng
7. Với công thức toán, dùng cú pháp LaTeX trong $$ $$ hoặc $ $
8. KHÔNG TẠO THÊM BLOCK <style> - template đã có sẵn CSS
9. KHÔNG sử dụng height: 100vh cho .slide - template sẽ xử lý display
10. SỬ DỤNG các class màu sắc (.text-primary, .highlight, .keyword...) để nhấn mạnh nội dung

CHỈ TRẢ VỀ CÁC THẺ <section class="slide">...</section>, KHÔNG CÓ MARKDOWN, GIẢI THÍCH HAY BLOCK <style>. Bắt đầu ngay với <section class="slide">`;
};

// Gọi Gemini API
async function callGeminiAPI(
  prompt: string,
  apiKey: string,
  modelId: ModelId
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
      const errorCode = errorData?.error?.code || response.status;
      throw new Error(`${errorCode} ${errorMessage}`);
    }

    const data = await response.json();
    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('Không nhận được nội dung từ API');
    }

    return { success: true, data: generatedText };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi không xác định',
    };
  }
}

// Tạo outline gợi ý
export async function generateOutline(
  content: string,
  topic: string,
  slideCount: number,
  apiKey: string,
  selectedModel?: ModelId
): Promise<{ success: boolean; outline?: SlideOutline[]; error?: string }> {
  const modelsToTry = selectedModel
    ? [selectedModel, ...AI_MODELS.filter(m => m.id !== selectedModel).map(m => m.id)]
    : AI_MODELS.map(m => m.id);

  const prompt = generateOutlinePrompt(content, topic, slideCount);

  for (const modelId of modelsToTry) {
    const result = await callGeminiAPI(prompt, apiKey, modelId);

    if (result.success && result.data) {
      try {
        // Clean up response
        let cleanedJson = result.data
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim();

        const outline = JSON.parse(cleanedJson) as SlideOutline[];
        return { success: true, outline };
      } catch {
        continue; // Try next model if JSON parse fails
      }
    }
  }

  return { success: false, error: 'Không thể tạo outline' };
}

// Tạo slide với cơ chế fallback
export async function generateSlides(
  content: string,
  apiKey: string,
  selectedModel?: ModelId,
  topic?: string,
  onProgress?: (progress: GenerationProgress) => void,
  slideCount?: number,
  outline?: SlideOutline[],
  subject?: string,
  gradeLevel?: string,
  enableSimulation?: boolean
): Promise<GenerationResult> {
  // Xác định thứ tự model để thử
  const modelsToTry = selectedModel
    ? [selectedModel, ...AI_MODELS.filter(m => m.id !== selectedModel).map(m => m.id)]
    : AI_MODELS.map(m => m.id);

  const totalSteps = 3; // Analyze, Generate, Format
  const prompt = generateSlidePrompt(content, topic, slideCount, outline, subject, gradeLevel, enableSimulation);

  for (let modelIndex = 0; modelIndex < modelsToTry.length; modelIndex++) {
    const currentModel = modelsToTry[modelIndex];

    // Step 1: Analyzing
    onProgress?.({
      step: 1,
      totalSteps,
      status: 'processing',
      message: `Đang phân tích nội dung với ${currentModel}...`,
      currentModel,
    });

    // Step 2: Generating
    onProgress?.({
      step: 2,
      totalSteps,
      status: 'processing',
      message: `Đang tạo ${slideCount ? slideCount + ' slide' : 'slide'} với ${currentModel}...`,
      currentModel,
    });

    const result = await callGeminiAPI(prompt, apiKey, currentModel);

    if (result.success && result.data) {
      // Clean up response - remove markdown code blocks if present
      let cleanedHtml = result.data
        .replace(/```html\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      // Loại bỏ các block <style> thừa - template đã có sẵn CSS
      cleanedHtml = cleanedHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

      // Loại bỏ khoảng trắng thừa giữa các section
      cleanedHtml = cleanedHtml.replace(/^\s+/gm, '').trim();

      // Step 3: Formatting
      onProgress?.({
        step: 3,
        totalSteps,
        status: 'completed',
        message: 'Hoàn tất tạo slide!',
        currentModel,
      });

      return {
        success: true,
        slides: cleanedHtml,
        usedModel: currentModel,
      };
    }

    // Nếu không phải model cuối, thử model tiếp theo
    if (modelIndex < modelsToTry.length - 1) {
      onProgress?.({
        step: 2,
        totalSteps,
        status: 'processing',
        message: `Model ${currentModel} gặp lỗi. Đang chuyển sang model tiếp theo...`,
        currentModel: modelsToTry[modelIndex + 1],
      });
      continue;
    }

    // Tất cả model đều thất bại
    onProgress?.({
      step: 2,
      totalSteps,
      status: 'error',
      message: `Lỗi: ${result.error}`,
      currentModel,
    });

    return {
      success: false,
      error: result.error,
      usedModel: currentModel,
    };
  }

  return {
    success: false,
    error: 'Không thể kết nối với bất kỳ model AI nào',
  };
}

// Validate API key format
export function validateApiKey(key: string): boolean {
  // Gemini API keys thường bắt đầu với "AIza" và có độ dài khoảng 39 ký tự
  return key.startsWith('AIza') && key.length >= 35;
}
