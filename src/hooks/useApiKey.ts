import { useState, useEffect, useCallback } from 'react';
import { validateApiKey, ModelId, AI_MODELS } from '../services/geminiService';

const API_KEY_STORAGE_KEY = 'gemini_api_key';
const SELECTED_MODEL_STORAGE_KEY = 'selected_ai_model';

export interface UseApiKeyReturn {
    apiKey: string | null;
    selectedModel: ModelId;
    hasValidKey: boolean;
    isLoaded: boolean; // Đã load xong từ localStorage chưa
    setApiKey: (key: string) => void;
    setSelectedModel: (model: ModelId) => void;
    clearApiKey: () => void;
}

export function useApiKey(): UseApiKeyReturn {
    const [apiKey, setApiKeyState] = useState<string | null>(null);
    const [selectedModel, setSelectedModelState] = useState<ModelId>(
        AI_MODELS[0].id
    );
    const [hasValidKey, setHasValidKey] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load từ localStorage khi mount
    useEffect(() => {
        const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
        const storedModel = localStorage.getItem(SELECTED_MODEL_STORAGE_KEY) as ModelId | null;

        if (storedKey) {
            setApiKeyState(storedKey);
            setHasValidKey(validateApiKey(storedKey));
        }

        if (storedModel && AI_MODELS.some(m => m.id === storedModel)) {
            setSelectedModelState(storedModel);
        }

        // Đánh dấu đã load xong
        setIsLoaded(true);
    }, []);

    const setApiKey = useCallback((key: string) => {
        const trimmedKey = key.trim();
        setApiKeyState(trimmedKey);

        if (trimmedKey) {
            localStorage.setItem(API_KEY_STORAGE_KEY, trimmedKey);
            setHasValidKey(validateApiKey(trimmedKey));
        } else {
            localStorage.removeItem(API_KEY_STORAGE_KEY);
            setHasValidKey(false);
        }
    }, []);

    const setSelectedModel = useCallback((model: ModelId) => {
        setSelectedModelState(model);
        localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, model);
    }, []);

    const clearApiKey = useCallback(() => {
        setApiKeyState(null);
        setHasValidKey(false);
        localStorage.removeItem(API_KEY_STORAGE_KEY);
    }, []);

    return {
        apiKey,
        selectedModel,
        hasValidKey,
        isLoaded,
        setApiKey,
        setSelectedModel,
        clearApiKey,
    };
}
