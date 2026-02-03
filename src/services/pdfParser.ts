// PDF Parser service sử dụng pdf.js
import * as pdfjsLib from 'pdfjs-dist';

// Cấu hình worker cho pdf.js - sử dụng version 4.10.38 phù hợp với package
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

export interface ParsedPDF {
    success: boolean;
    content?: string;
    pageCount?: number;
    error?: string;
}

export interface ParseProgress {
    currentPage: number;
    totalPages: number;
    percentage: number;
}

/**
 * Trích xuất text từ file PDF
 */
export async function parsePDF(
    file: File,
    onProgress?: (progress: ParseProgress) => void
): Promise<ParsedPDF> {
    try {
        // Đọc file thành ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Load PDF document
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;

        let fullText = '';

        // Trích xuất text từ từng trang
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Ghép các text items thành chuỗi
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            fullText += `\n--- Trang ${pageNum} ---\n${pageText}`;

            // Report progress
            onProgress?.({
                currentPage: pageNum,
                totalPages,
                percentage: Math.round((pageNum / totalPages) * 100),
            });
        }

        return {
            success: true,
            content: fullText.trim(),
            pageCount: totalPages,
        };
    } catch (error) {
        console.error('PDF parse error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Không thể đọc file PDF',
        };
    }
}

/**
 * Kiểm tra file có phải PDF không
 */
export function isPDFFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Format file size để hiển thị
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
