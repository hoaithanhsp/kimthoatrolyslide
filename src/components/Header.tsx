import { Settings, Sparkles } from 'lucide-react';

interface HeaderProps {
    onOpenSettings: () => void;
    hasApiKey: boolean;
}

export function Header({ onOpenSettings, hasApiKey }: HeaderProps) {
    return (
        <header className="fixed top-0 left-0 right-0 h-16 glass-dark z-40 flex items-center justify-between px-6 border-b border-teal-500/20">
            {/* Logo */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl shadow-lg glow-teal btn-3d">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-wide text-shadow-lg">
                        TRỢ LÝ TẠO SLIDE
                        <span className="text-amber-400 text-sm animate-pulse">✨</span>
                    </h1>
                    <p className="text-xs text-teal-100 font-medium">Phát triển bởi thầy Trần Hoài Thanh</p>
                </div>
            </div>

            {/* Settings Button */}
            <div className="flex items-center gap-4">
                {!hasApiKey && (
                    <span className="text-xs font-medium text-amber-400 animate-pulse flex items-center gap-1">
                        <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                        Cần nhập API key
                    </span>
                )}
                <button
                    onClick={onOpenSettings}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/30 text-teal-100 font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-teal-500/20"
                >
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">Settings</span>
                </button>
            </div>
        </header>
    );
}
