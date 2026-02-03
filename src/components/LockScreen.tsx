import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, Sparkles, Presentation } from 'lucide-react';

interface LockScreenProps {
    onUnlock: () => void;
}

// Thông tin đăng nhập
const VALID_USER = 'Trần Thị Kim Thoa';
const VALID_PASS = '12345';

export function LockScreen({ onUnlock }: LockScreenProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate login delay
        setTimeout(() => {
            if (username === VALID_USER && password === VALID_PASS) {
                // Save login state
                localStorage.setItem('slide_app_unlocked', 'true');
                onUnlock();
            } else {
                setError('Tên đăng nhập hoặc mật khẩu không đúng!');
            }
            setIsLoading(false);
        }, 500);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-grid relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-20 left-20 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl animate-breathe"></div>
            <div className="absolute bottom-20 right-20 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl animate-breathe" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl animate-pulse"></div>

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Logo & Title */}
                <div className="text-center mb-8 animate-slideUp">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl mb-4 shadow-lg shadow-teal-500/30">
                        <Presentation className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 text-shadow">
                        Trợ Lý Tạo Slide
                    </h1>
                    <p className="text-teal-200/80">
                        Đăng nhập để sử dụng ứng dụng
                    </p>
                </div>

                {/* Login Form */}
                <div className="card-3d rounded-2xl p-8 animate-slideUp" style={{ animationDelay: '0.1s' }}>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div>
                            <label className="block text-sm font-medium text-teal-100 mb-2">
                                Tên đăng nhập
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="w-5 h-5 text-teal-400" />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-teal-500/30 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                                    placeholder="Nhập tên đăng nhập"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-teal-100 mb-2">
                                Mật khẩu
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="w-5 h-5 text-teal-400" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3 bg-slate-800/50 border border-teal-500/30 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                                    placeholder="Nhập mật khẩu"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-teal-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center animate-fadeIn">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-teal-500 to-cyan-400 text-teal-950 font-bold rounded-xl btn-3d glow-teal transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-teal-900/30 border-t-teal-900 rounded-full animate-spin"></div>
                                    <span>Đang đăng nhập...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    <span>Đăng Nhập</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-teal-300/60 text-sm mt-6 animate-slideUp" style={{ animationDelay: '0.2s' }}>
                    Powered by <span className="text-teal-300">Gemini AI</span> • Trần Thị Kim Thoa
                </p>
            </div>
        </div>
    );
}
