import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Code2, Maximize2, Minimize2, Download, Sparkles, Zap, FileText, Star, FileSliders, Calculator } from 'lucide-react';
import { CodeEditor } from './CodeEditor';
import { Header } from './Header';
import { ApiKeyModal } from './ApiKeyModal';
import { AIInputPanel } from './AIInputPanel';
import { defaultSlides } from '../data/slides';
import { useApiKey } from '../hooks/useApiKey';
import { generatePptx, generatePptxWithMath } from '../services/pptxService';

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: Element[]) => Promise<void>;
    };
  }
}

export function SlidePresentation() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState(defaultSlides);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editorContent, setEditorContent] = useState(
    slides.map(s => `<section class="slide">${s.content}</section>`).join('\n')
  );
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isAIInputOpen, setIsAIInputOpen] = useState(false);
  const [isExportingMath, setIsExportingMath] = useState(false);

  const slideWrapperRef = useRef<HTMLDivElement>(null);
  const presentationAreaRef = useRef<HTMLDivElement>(null);

  const { apiKey, selectedModel, hasValidKey, isLoaded, setApiKey, setSelectedModel } = useApiKey();

  // Hiển thị modal API key nếu chưa có key (chỉ sau khi đã load từ localStorage)
  useEffect(() => {
    if (isLoaded && !hasValidKey && !isApiKeyModalOpen) {
      setIsApiKeyModalOpen(true);
    }
  }, [isLoaded, hasValidKey]);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (slides.length > 0) {
        if (e.key === 'ArrowRight') nextSlide();
        if (e.key === 'ArrowLeft') prevSlide();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [slides.length]);

  const nextSlide = () => {
    if (slides.length > 0) {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }
  };

  const prevSlide = () => {
    if (slides.length > 0) {
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    }
  };

  const handleEditorChange = (newContent: string) => {
    setEditorContent(newContent);
    if (slideWrapperRef.current) {
      slideWrapperRef.current.innerHTML = newContent;

      // Re-render MathJax
      if (window.MathJax) {
        window.MathJax.typesetPromise?.([slideWrapperRef.current]);
      }

      // Update slides array
      const slideElements = slideWrapperRef.current.querySelectorAll('.slide');
      const newSlides = Array.from(slideElements).map((el) => ({
        id: Math.random(),
        title: el.querySelector('h1, h2')?.textContent || 'Untitled',
        content: el.innerHTML,
      }));
      setSlides(newSlides);
      setCurrentSlide(Math.min(currentSlide, newSlides.length - 1));
    }
  };

  const handleSlidesGenerated = (slidesHtml: string) => {
    // Update editor content
    setEditorContent(slidesHtml);

    // Parse slides from HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${slidesHtml}</div>`, 'text/html');
    const slideElements = doc.querySelectorAll('.slide');

    const newSlides = Array.from(slideElements).map((el, index) => ({
      id: index + 1,
      title: el.querySelector('h1, h2')?.textContent || `Slide ${index + 1}`,
      content: el.innerHTML,
    }));

    if (newSlides.length > 0) {
      setSlides(newSlides);
      setCurrentSlide(0);

      // Re-render MathJax after state update
      setTimeout(() => {
        if (window.MathJax && slideWrapperRef.current) {
          window.MathJax.typesetPromise?.([slideWrapperRef.current]);
        }
      }, 100);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && presentationAreaRef.current) {
      presentationAreaRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const downloadHTML = () => {
    const htmlTemplate = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bài Giảng Slide</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;900&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">

    <!-- MathJax Configuration -->
    <script>
        window.MathJax = {
            tex: {
                inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
                processEscapes: true,
                processEnvironments: true
            },
            options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
            },
            startup: {
                pageReady: () => {
                    return MathJax.startup.defaultPageReady().then(() => {
                        console.log('MathJax loaded successfully');
                    });
                }
            }
        };
    </script>
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>

    <style>
        :root {
            --primary: #2563eb;
            --secondary: #1e40af;
            --accent: #f59e0b;
            --text: #1e293b;
            --bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Be Vietnam Pro', sans-serif;
            background: var(--bg);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            padding: 0;
            overflow: hidden;
        }

        #presentation-area {
            position: relative;
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .slide-container {
            flex: 1;
            width: 100%;
            background: white;
            position: relative;
            overflow: hidden;
        }

        .slide {
            display: none;
            width: 100%;
            height: 100%;
            padding: 40px 60px;
            flex-direction: column;
            justify-content: flex-start;
            background: white;
            overflow-y: auto;
            overflow-x: hidden;
        }
        .slide.active { display: flex; }

        /* Step-by-step reveal - ẩn các element chưa được reveal */
        .slide.active > .step-item {
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.4s ease;
        }
        .slide.active > .step-item.revealed {
            opacity: 1;
            transform: translateY(0);
        }

        /* Typography */
        .slide h1 { 
            font-size: 3.2rem; font-weight: 800; color: var(--primary); 
            margin-bottom: 25px; line-height: 1.2;
        }
        .slide h2 { 
            font-size: 2.4rem; font-weight: 700; color: var(--secondary); 
            margin-bottom: 35px; border-bottom: 4px solid var(--accent); 
            display: inline-block; padding-bottom: 12px; 
        }
        .slide ul, .slide ol { font-size: 1.4rem; line-height: 1.8; padding-left: 45px; color: var(--text); }
        .slide li { margin-bottom: 18px; }
        .slide li::marker { color: var(--primary); font-weight: bold; }
        .slide p { font-size: 1.35rem; margin-bottom: 22px; line-height: 1.7; color: var(--text); }

        /* Math formulas styling */
        .MathJax { font-size: 1.1em !important; }
        mjx-container { margin: 5px 0 !important; }

        /* Box styling */
        .box, [style*="border-left"] {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-left: 5px solid var(--primary);
            padding: 25px 30px; margin: 25px 0;
            border-radius: 0 12px 12px 0; font-size: 1.25rem;
            box-shadow: 0 4px 15px rgba(37, 99, 235, 0.1);
        }

        /* Text emphasis colors - nhấn mạnh nội dung */
        .text-primary { color: #2563eb !important; }
        .text-secondary { color: #7c3aed !important; }
        .text-success { color: #10b981 !important; }
        .text-warning { color: #f59e0b !important; }
        .text-danger { color: #ef4444 !important; }
        .text-info { color: #0ea5e9 !important; }
        .text-pink { color: #ec4899 !important; }
        .text-orange { color: #f97316 !important; }
        
        /* Background highlights */
        .highlight { background: linear-gradient(120deg, #fef08a 0%, #fde047 100%); padding: 2px 8px; border-radius: 4px; }
        .highlight-blue { background: linear-gradient(120deg, #dbeafe 0%, #bfdbfe 100%); padding: 2px 8px; border-radius: 4px; }
        .highlight-green { background: linear-gradient(120deg, #d1fae5 0%, #a7f3d0 100%); padding: 2px 8px; border-radius: 4px; }
        .highlight-pink { background: linear-gradient(120deg, #fce7f3 0%, #fbcfe8 100%); padding: 2px 8px; border-radius: 4px; }
        
        /* Bold emphasis */
        .emphasis { font-weight: 700; color: var(--primary); }
        .emphasis-red { font-weight: 700; color: #ef4444; }
        .emphasis-green { font-weight: 700; color: #10b981; }
        
        /* Keyword box */
        .keyword {
            display: inline-block;
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 4px 12px;
            border-radius: 6px;
            font-weight: 600;
            margin: 2px 4px;
        }
        .keyword-green {
            display: inline-block;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 4px 12px;
            border-radius: 6px;
            font-weight: 600;
            margin: 2px 4px;
        }
        .keyword-orange {
            display: inline-block;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: white;
            padding: 4px 12px;
            border-radius: 6px;
            font-weight: 600;
            margin: 2px 4px;
        }

        /* Controls - thanh công cụ cố định ở dưới */
        .controls {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 12px 28px;
            display: flex; 
            gap: 16px; 
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .btn {
            border: none; 
            background: rgba(255,255,255,0.2); 
            cursor: pointer;
            font-size: 1.3rem; 
            color: white; 
            padding: 10px 14px;
            border-radius: 50%; 
            transition: all 0.3s ease;
        }
        .btn:hover { 
            background: rgba(255,255,255,0.4); 
            transform: scale(1.1);
        }
        
        /* Nút Next Step - nổi bật hơn */
        .btn-step {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            font-size: 0.9rem;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            box-shadow: 0 4px 0 #047857, 0 6px 15px rgba(0,0,0,0.2);
            transition: all 0.15s ease;
            border: none;
            cursor: pointer;
        }
        .btn-step:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 0 #047857, 0 10px 20px rgba(0,0,0,0.25);
            background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
        }
        .btn-step:active {
            transform: translateY(1px);
            box-shadow: 0 2px 0 #047857, 0 3px 8px rgba(0,0,0,0.15);
        }
        
        #slide-counter { font-weight: 700; font-size: 1.1rem; min-width: 70px; text-align: center; color: white; }
        #step-counter { font-size: 0.8rem; color: #a7f3d0; font-weight: 500; }
        .divider { color: rgba(255,255,255,0.5); margin: 0 8px; }

        /* Simulation styling */
        .simulation {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px solid #0ea5e9;
            border-radius: 16px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 4px 20px rgba(14, 165, 233, 0.15);
        }
        .simulation svg {
            display: block;
            margin: 0 auto;
            max-width: 100%;
        }
        .sim-controls {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #bae6fd;
        }
        .sim-controls button {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .sim-controls button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
        }
        .sim-controls input[type="range"] {
            width: 150px;
            accent-color: #0ea5e9;
        }
        .sim-controls label {
            font-size: 0.9rem;
            color: var(--text);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .sim-hint {
            text-align: center;
            font-size: 0.85rem;
            color: #0369a1;
            margin-top: 10px;
            font-style: italic;
        }

        /* Images and audio */
        .slide img {
            max-width: 100%;
            max-height: 200px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            margin: 15px 0;
        }
        .slide audio {
            width: 100%;
            max-width: 400px;
            margin: 15px 0;
        }

        @media (max-width: 768px) {
            body { padding: 10px; }
            .slide { padding: 30px 40px; }
            .slide h1 { font-size: 2.2rem; }
            .slide h2 { font-size: 1.8rem; }
            .slide ul, .slide ol, .slide p { font-size: 1.1rem; }
            .simulation { padding: 15px; }
        }
    </style>
</head>
<body>
    <div id="presentation-area">
        <div class="slide-container" id="slide-wrapper">
${editorContent}
        </div>

        <div class="controls">
            <button class="btn" onclick="prevSlide()" title="Slide trước"><i class="fas fa-chevron-left"></i></button>
            <span id="slide-counter">1 / ${slides.length}</span>
            <button class="btn" onclick="nextSlide()" title="Slide sau"><i class="fas fa-chevron-right"></i></button>
            <span class="divider">|</span>
            <button class="btn btn-step" onclick="nextStep()" title="Hiện dòng tiếp theo (Space)">
                <i class="fas fa-plus"></i> Tiếp
            </button>
            <span id="step-counter"></span>
            <span class="divider">|</span>
            <button class="btn" onclick="toggleFullscreen()" title="Toàn màn hình"><i class="fas fa-expand"></i></button>
        </div>
    </div>

    <script>
        // Đợi DOM loaded hoàn toàn
        document.addEventListener('DOMContentLoaded', function() {
            var currentSlide = 0;
            var currentStep = 0;
            var slides = document.querySelectorAll('.slide');
            var slideCounter = document.getElementById('slide-counter');
            var stepCounter = document.getElementById('step-counter');
            
            console.log('Slides found:', slides.length);
            
            if (slides.length === 0) {
                console.error('No slides found with class .slide');
                return;
            }

            // Thêm class step-item cho các phần tử con trong slide
            function initStepItems(slide) {
                var children = slide.children;
                for (var i = 0; i < children.length; i++) {
                    children[i].classList.add('step-item');
                    children[i].classList.remove('revealed');
                }
            }

            // Đếm số step trong slide hiện tại
            function getStepCount() {
                var activeSlide = slides[currentSlide];
                return activeSlide ? activeSlide.querySelectorAll('.step-item').length : 0;
            }

            // Cập nhật step counter
            function updateStepCounter() {
                var total = getStepCount();
                if (stepCounter && total > 0) {
                    stepCounter.innerText = currentStep + '/' + total;
                } else if (stepCounter) {
                    stepCounter.innerText = '';
                }
            }

            // Hiện step tiếp theo
            window.nextStep = function() {
                var activeSlide = slides[currentSlide];
                if (!activeSlide) return;
                
                var steps = activeSlide.querySelectorAll('.step-item');
                if (currentStep < steps.length) {
                    steps[currentStep].classList.add('revealed');
                    currentStep++;
                    updateStepCounter();
                    
                    // Re-render MathJax cho step vừa reveal
                    if (window.MathJax && window.MathJax.typesetPromise) {
                        window.MathJax.typesetPromise([steps[currentStep - 1]]).catch(function(err) {
                            console.log('MathJax error:', err);
                        });
                    }
                } else {
                    // Đã hết step, chuyển slide
                    window.nextSlide();
                }
            };
            
            // Hiện tất cả steps
            function revealAllSteps() {
                var activeSlide = slides[currentSlide];
                if (!activeSlide) return;
                var steps = activeSlide.querySelectorAll('.step-item');
                for (var i = 0; i < steps.length; i++) {
                    steps[i].classList.add('revealed');
                }
                currentStep = steps.length;
                updateStepCounter();
            }

            function showSlide(index) {
                // Remove active from all slides
                for (var i = 0; i < slides.length; i++) {
                    slides[i].classList.remove('active');
                }
                
                // Handle index wrap-around
                if (index >= slides.length) index = 0;
                if (index < 0) index = slides.length - 1;
                
                currentSlide = index;
                currentStep = 0;
                
                // Init step items
                initStepItems(slides[currentSlide]);
                
                slides[currentSlide].classList.add('active');
                
                // Update counter
                if (slideCounter) {
                    slideCounter.innerText = (currentSlide + 1) + ' / ' + slides.length;
                }
                updateStepCounter();
                
                // Re-render MathJax for current slide
                if (window.MathJax && window.MathJax.typesetPromise) {
                    window.MathJax.typesetPromise([slides[currentSlide]]).catch(function(err) {
                        console.log('MathJax error:', err);
                    });
                }
            }

            // Navigation functions (global scope)
            window.nextSlide = function() { showSlide(currentSlide + 1); };
            window.prevSlide = function() { showSlide(currentSlide - 1); };
            window.toggleFullscreen = function() {
                if (!document.fullscreenElement) { 
                    document.documentElement.requestFullscreen(); 
                } else { 
                    document.exitFullscreen(); 
                }
            };

            // Keyboard navigation
            document.addEventListener('keydown', function(e) {
                if (e.key === ' ' || e.key === 'Enter') { 
                    e.preventDefault(); 
                    window.nextStep(); // Space/Enter = next step
                }
                if (e.key === 'ArrowRight') { 
                    e.preventDefault(); 
                    window.nextSlide(); // Arrow Right = next slide
                }
                if (e.key === 'ArrowLeft') { 
                    e.preventDefault(); 
                    window.prevSlide(); 
                }
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    window.nextStep(); // Arrow Down = next step
                }
                if (e.key === 'a' || e.key === 'A') {
                    revealAllSteps(); // A = reveal all
                }
                if (e.key === 'f' || e.key === 'F') {
                    window.toggleFullscreen();
                }
            });

            // Initialize first slide
            showSlide(0);
            
            // Initial MathJax render
            if (window.MathJax && window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise().then(function() {
                    console.log('MathJax initial render complete');
                });
            }
        });
    </script>
</body>
</html>`;


    const blob = new Blob([htmlTemplate], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bai-giang-slide.html';
    a.click();
  };

  const downloadPPTX = async () => {
    try {
      await generatePptx(slides, 'bai-giang-slide');
    } catch (error) {
      console.error('Lỗi xuất PPTX:', error);
      alert('Có lỗi khi xuất file PPTX. Vui lòng thử lại.');
    }
  };

  const downloadPPTXVisual = async () => {
    try {
      setIsExportingMath(true);
      await generatePptxWithMath(slides, 'bai-giang-slide-visual');
    } catch (error) {
      console.error('Lỗi xuất PPTX trực quan:', error);
      alert('Có lỗi khi xuất file PPTX. Vui lòng thử lại.');
    } finally {
      setIsExportingMath(false);
    }
  };

  // Welcome Screen when no slides
  const WelcomeScreen = () => (
    <div className="w-full h-full flex items-center justify-center overflow-y-auto py-8 bg-grid relative">
      {/* Decorative circles */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl animate-breathe"></div>
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl animate-breathe" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl animate-pulse"></div>

      <div className="text-center animate-slideUp max-w-5xl px-6 relative z-10">
        {/* Welcome Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 rounded-full mb-8 border border-teal-400/30 glow-teal">
          <Sparkles className="w-4 h-4 text-teal-300" />
          <span className="text-sm font-medium text-teal-200">Powered by Gemini AI</span>
        </div>

        {/* Main Greeting */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight text-shadow">
          <span className="text-white">Chào mừng quý </span>
          <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent">Thầy Cô</span>
        </h1>

        <h2 className="text-2xl md:text-3xl font-semibold mb-8">
          <span className="bg-gradient-to-r from-teal-300 via-cyan-300 to-teal-400 bg-clip-text text-transparent">
            đến với Trợ Lý Tạo Slide Thông Minh
          </span>
        </h2>

        <p className="text-lg text-teal-100/80 mb-12 max-w-2xl mx-auto leading-relaxed">
          Ứng dụng giúp thầy cô tạo bài giảng slide <span className="text-white font-semibold">chuyên nghiệp</span> chỉ trong vài giây.
          <br />
          Chỉ cần tải lên PDF sách giáo khoa hoặc nhập chủ đề bài học!
        </p>

        {/* CTA Button */}
        <button
          onClick={() => setIsAIInputOpen(true)}
          className="group relative inline-flex items-center justify-center gap-3 px-14 py-6 bg-gradient-to-r from-teal-500 via-teal-400 to-cyan-400 text-teal-950 font-extrabold text-2xl rounded-2xl btn-3d glow-teal transition-all duration-200 mb-14"
        >
          <Sparkles className="w-8 h-8 group-hover:animate-spin" />
          <span className="tracking-wide">Bắt Đầu Tạo Slide Ngay</span>
          <Zap className="w-7 h-7" />
        </button>

        {/* How it works - Steps */}
        <div className="mb-14">
          <h3 className="text-xl font-semibold text-white mb-8 flex items-center justify-center gap-3">
            <span className="w-12 h-0.5 bg-gradient-to-r from-transparent to-teal-400"></span>
            Hướng dẫn sử dụng
            <span className="w-12 h-0.5 bg-gradient-to-l from-transparent to-teal-400"></span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            <StepCard
              step={1}
              title="Nhập API Key"
              description="Nhấn Settings ở góc phải để nhập Gemini API key miễn phí"
              icon="🔑"
            />
            <StepCard
              step={2}
              title="Chọn nội dung"
              description="Tải file PDF SGK hoặc nhập chủ đề bài học cần tạo slide"
              icon="📚"
            />
            <StepCard
              step={3}
              title="Nhận slide"
              description="AI sẽ tự động tạo slide đẹp, có thể tải về dạng HTML"
              icon="✨"
            />
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <FeatureCard
            icon={<FileText className="w-6 h-6" />}
            title="Tải PDF"
            description="Upload SGK, giáo án"
            color="from-teal-400 to-cyan-400"
          />
          <FeatureCard
            icon={<Sparkles className="w-6 h-6" />}
            title="AI Gemini"
            description="Tạo nội dung thông minh"
            color="from-cyan-400 to-blue-400"
          />
          <FeatureCard
            icon={<Star className="w-6 h-6" />}
            title="Công thức Toán"
            description="Hỗ trợ LaTeX/MathJax"
            color="from-amber-400 to-orange-400"
          />
          <FeatureCard
            icon={<Download className="w-6 h-6" />}
            title="Tải về HTML"
            description="Sử dụng offline"
            color="from-green-500 to-emerald-500"
          />
        </div>

        {/* Footer note */}
        <p className="mt-10 text-base text-white font-semibold text-shadow">
          💡 Tip: Nhấn phím <kbd className="px-3 py-1.5 bg-gradient-to-b from-slate-600 to-slate-800 rounded-lg text-white font-bold shadow-md border border-slate-500">←</kbd> <kbd className="px-3 py-1.5 bg-gradient-to-b from-slate-600 to-slate-800 rounded-lg text-white font-bold shadow-md border border-slate-500">→</kbd> để chuyển slide,
          <kbd className="px-3 py-1.5 bg-gradient-to-b from-slate-600 to-slate-800 rounded-lg text-white font-bold shadow-md border border-slate-500 ml-2">F</kbd> để toàn màn hình
        </p>
      </div>
    </div>
  );

  const StepCard = ({ step, title, description, icon }: { step: number; title: string; description: string; icon: string }) => (
    <div className="card-3d rounded-xl p-6 text-center transition-all duration-200 group cursor-default">
      <div className="flex items-center justify-center gap-3 mb-4">
        <span className="text-4xl">{icon}</span>
        <span className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg icon-btn-3d">
          {step}
        </span>
      </div>
      <h4 className="text-white font-bold text-lg mb-2 text-shadow">{title}</h4>
      <p className="text-teal-100 text-sm">{description}</p>
    </div>
  );

  const FeatureCard = ({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: string }) => (
    <div className="card-3d rounded-xl p-5 text-center transition-all duration-200 group cursor-default">
      <div className={`inline-flex items-center justify-center p-4 bg-gradient-to-br ${color} rounded-xl text-white mb-4 group-hover:scale-110 transition-transform icon-btn-3d`}>
        {icon}
      </div>
      <h3 className="text-base font-bold text-white mb-1 text-shadow">{title}</h3>
      <p className="text-teal-100 text-sm">{description}</p>
    </div>
  );

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-grid">
      {/* Header */}
      <Header
        onOpenSettings={() => setIsApiKeyModalOpen(true)}
        hasApiKey={hasValidKey}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden pt-16">
        {/* Slide Preview Area */}
        <div
          ref={presentationAreaRef}
          className={`flex-1 flex flex-col items-center justify-center transition-all duration-300 ${isEditorOpen ? 'w-1/2' : 'w-full'}`}
        >
          {slides.length === 0 ? (
            <WelcomeScreen />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              {/* Slide Container - Editable */}
              <div
                ref={slideWrapperRef}
                className={`w-full ${isEditorOpen ? 'max-w-2xl' : 'max-w-5xl'} aspect-video glass-light rounded-2xl shadow-2xl overflow-hidden relative animate-fadeIn`}
              >
                {slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 p-8 md:p-12 flex flex-col justify-center transition-all duration-500 overflow-y-auto
                      ${index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
                    `}
                    dangerouslySetInnerHTML={{ __html: slide.content }}
                  />
                ))}

                {/* Slide counter badge */}
                <div className="absolute bottom-3 right-4 text-sm text-slate-500 font-semibold bg-white/90 px-3 py-1 rounded-full shadow">
                  {currentSlide + 1} / {slides.length}
                </div>

                {/* Edit mode indicator */}
                {isEditorOpen && (
                  <div className="absolute top-3 left-4 text-xs text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                    Xem mã HTML song song
                  </div>
                )}
              </div>

              {/* Control Bar */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 glass px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 z-50">
                <button
                  onClick={prevSlide}
                  className="p-2 hover:bg-white/20 rounded-full transition-all text-white"
                  title="Slide trước (←)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-bold text-white min-w-14 text-center text-sm">
                  {currentSlide + 1} / {slides.length}
                </span>
                <button
                  onClick={nextSlide}
                  className="p-2 hover:bg-white/20 rounded-full transition-all text-white"
                  title="Slide sau (→)"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="w-px h-5 bg-white/20" />
                <button
                  onClick={() => setIsAIInputOpen(true)}
                  className="p-2 hover:bg-purple-500/30 rounded-full transition-all text-purple-300"
                  title="Tạo Slide với AI"
                >
                  <Sparkles className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsEditorOpen(!isEditorOpen)}
                  className={`p-2 rounded-full transition-all ${isEditorOpen ? 'bg-blue-500/40 text-blue-200' : 'hover:bg-blue-500/30 text-blue-300'}`}
                  title={isEditorOpen ? "Đóng Editor" : "Mở Editor (song song)"}
                >
                  <Code2 className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-white/20 rounded-full transition-all text-white"
                  title="Toàn màn hình (F)"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={downloadHTML}
                  className="p-2 hover:bg-green-500/30 rounded-full transition-all text-green-300"
                  title="Tải về HTML"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={downloadPPTX}
                  className="p-2 hover:bg-orange-500/30 rounded-full transition-all text-orange-300"
                  title="Tải về PPTX (PowerPoint)"
                >
                  <FileSliders className="w-5 h-5" />
                </button>
                <button
                  onClick={downloadPPTXVisual}
                  disabled={isExportingMath}
                  className={`p-2 hover:bg-purple-500/30 rounded-full transition-all text-purple-300 ${isExportingMath ? 'opacity-50 cursor-wait' : ''}`}
                  title="Tải về PPTX với công thức trực quan"
                >
                  <Calculator className={`w-5 h-5 ${isExportingMath ? 'animate-pulse' : ''}`} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Code Editor Panel - Side by side */}
        {isEditorOpen && slides.length > 0 && (
          <div className="w-1/2 flex flex-col border-l border-slate-200 bg-white">
            {/* Editor Header */}
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800">
                <Code2 className="w-4 h-4 text-teal-600" />
                <span className="font-semibold text-sm">HTML Editor</span>
                <span className="text-xs text-slate-500 ml-2">
                  (Slide {currentSlide + 1})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Đồng bộ 2 chiều
                </span>
              </div>
            </div>

            {/* Editor Content */}
            <CodeEditor
              content={editorContent}
              onChange={handleEditorChange}
            />
          </div>
        )}
      </div>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        selectedModel={selectedModel}
        onSaveKey={setApiKey}
        onSelectModel={setSelectedModel}
        forceShow={!hasValidKey}
      />

      {/* AI Input Panel */}
      <AIInputPanel
        isOpen={isAIInputOpen}
        onClose={() => setIsAIInputOpen(false)}
        apiKey={apiKey}
        selectedModel={selectedModel}
        onSlidesGenerated={handleSlidesGenerated}
        onOpenApiKeyModal={() => {
          setIsAIInputOpen(false);
          setIsApiKeyModalOpen(true);
        }}
      />
    </div>
  );
}
