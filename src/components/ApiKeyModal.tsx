import { useState, useEffect } from 'react';
import { X, Key, ExternalLink, Sparkles, Check } from 'lucide-react';
import { AI_MODELS, ModelId, validateApiKey } from '../services/geminiService';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string | null;
    selectedModel: ModelId;
    onSaveKey: (key: string) => void;
    onSelectModel: (model: ModelId) => void;
    forceShow?: boolean; // Khi true, không cho phép đóng modal
}

export function ApiKeyModal({
    isOpen,
    onClose,
    apiKey,
    selectedModel,
    onSaveKey,
    onSelectModel,
    forceShow = false,
}: ApiKeyModalProps) {
    const [inputKey, setInputKey] = useState(apiKey || '');
    const [error, setError] = useState('');

    useEffect(() => {
        if (apiKey) {
            setInputKey(apiKey);
        }
    }, [apiKey]);

    if (!isOpen) return null;

    const handleSave = () => {
        const trimmedKey = inputKey.trim();

        if (!trimmedKey) {
            setError('Vui lòng nhập API key');
            return;
        }

        if (!validateApiKey(trimmedKey)) {
            setError('API key không đúng định dạng. Key phải bắt đầu bằng "AIza"');
            return;
        }

        setError('');
        onSaveKey(trimmedKey);
        onClose();
    };

    const handleClose = () => {
        if (!forceShow) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 rounded-t-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Key className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Thiết lập API Key</h2>
                            <p className="text-blue-100 text-sm">Cấu hình Gemini AI để tạo slide tự động</p>
                        </div>
                    </div>
                    {!forceShow && (
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    )}
                </div>

                <div className="p-6 space-y-6">
                    {/* Model Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                            Chọn Model AI
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {AI_MODELS.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => onSelectModel(model.id)}
                                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${selectedModel === model.id
                                        ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    {selectedModel === model.id && (
                                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className={`w-4 h-4 ${selectedModel === model.id ? 'text-blue-500' : 'text-slate-400'}`} />
                                        <span className="text-xs font-medium text-slate-500">AI Model</span>
                                    </div>
                                    <p className={`text-sm font-semibold ${selectedModel === model.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                        {model.name}
                                    </p>
                                    {model.isDefault && (
                                        <span className="inline-block mt-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                            Mặc định
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                            Khi model được chọn gặp lỗi, hệ thống sẽ tự động chuyển sang model dự phòng
                        </p>
                    </div>

                    {/* API Key Input */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Nhập API Key
                        </label>
                        <input
                            type="password"
                            value={inputKey}
                            onChange={(e) => {
                                setInputKey(e.target.value);
                                setError('');
                            }}
                            placeholder="AIza..."
                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all ${error ? 'border-red-300 bg-red-50' : 'border-slate-200 focus:border-blue-400'
                                }`}
                        />
                        {error && (
                            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                <span className="inline-block w-1 h-1 bg-red-500 rounded-full"></span>
                                {error}
                            </p>
                        )}
                    </div>

                    {/* Help Links */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-blue-100 rounded-lg mt-0.5">
                                <Key className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-700 font-medium">Lấy API key tại:</p>
                                <a
                                    href="https://aistudio.google.com/api-keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1 mt-1"
                                >
                                    aistudio.google.com/api-keys
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-amber-100 rounded-lg mt-0.5">
                                <ExternalLink className="w-4 h-4 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-700 font-medium">Xem hướng dẫn chi tiết:</p>
                                <a
                                    href="https://tinyurl.com/hdsdpmTHT"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1 mt-1"
                                >
                                    Hướng dẫn lấy API key
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        <Key className="w-5 h-5" />
                        Lưu API Key
                    </button>
                </div>
            </div>
        </div>
    );
}
