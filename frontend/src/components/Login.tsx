import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ConnectionState } from '../App';
import { CheckCircle } from 'lucide-react';
import { Language, getTranslation } from '../i18n';

interface LoginProps {
    connectionState: ConnectionState;
    language: Language;
    theme: 'light' | 'dark';
}

export function Login({ connectionState, language, theme }: LoginProps) {

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* WhatsApp Connection */}
<div className={`glass-panel flex flex-col items-center justify-center p-8 rounded-2xl shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] border ${
                theme === 'dark'
                    ? 'bg-slate-900/90 border-slate-800'
                    : 'bg-white/90 border-white/60'
            }`}>
                <div className="flex items-center gap-2 mb-6">
                    <h2 className="text-2xl font-semibold">{getTranslation(language, 'connectWhatsApp')}</h2>
                    {connectionState.whatsapp && (
                        <CheckCircle className="text-emerald-500" size={24} />
                    )}
                </div>
                {connectionState.whatsapp ? (
<div className={`w-64 h-64 flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400 rounded-2xl ${
                        theme === 'dark' ? 'bg-emerald-950/40' : 'bg-emerald-50'
                    }`}>
                        <CheckCircle size={64} className="mb-4" />
                        <span className="text-lg font-medium">{getTranslation(language, 'connected')}</span>
                    </div>
                ) : (
                    <>
<div className={`p-4 rounded-2xl mb-6 border ${
                            theme === 'dark'
                                ? 'bg-slate-800/80 border-slate-700'
                                : 'bg-white/70 border-white/60'
                        }`}>
                            {connectionState.whatsappQr ? (
                                <QRCodeSVG value={connectionState.whatsappQr} size={256} />
                            ) : (
                                <div className={`w-64 h-64 flex items-center justify-center ${
                                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                                }`}>
                                    {getTranslation(language, 'waitingForQR')}
                                </div>
                            )}
                        </div>
                        <p className={`text-center max-w-md ${
                            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                            {getTranslation(language, 'scanQRWhatsApp')}
                        </p>
                    </>
                )}
            </div>

            {/* Signal Connection */}
<div className={`glass-panel flex flex-col items-center justify-center p-8 rounded-2xl shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] border ${
                theme === 'dark'
                    ? 'bg-slate-900/90 border-slate-800'
                    : 'bg-white/90 border-white/60'
            }`}>
                <div className="flex items-center gap-2 mb-6">
                    <h2 className="text-2xl font-semibold">{getTranslation(language, 'connectSignal')}</h2>
                    {connectionState.signal && (
                        <CheckCircle className="text-blue-500" size={24} />
                    )}
                </div>
                {connectionState.signal ? (
<div className={`w-64 h-64 flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 rounded-2xl ${
                        theme === 'dark' ? 'bg-blue-950/40' : 'bg-blue-50'
                    }`}>
                        <CheckCircle size={64} className="mb-4" />
                        <span className="text-lg font-medium">{getTranslation(language, 'connected')}</span>
                        <span className={`text-sm mt-2 ${
                            theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                        }`}>{connectionState.signalNumber}</span>
                    </div>
                ) : connectionState.signalApiAvailable ? (
                    <>
<div className={`p-4 rounded-2xl mb-6 border ${
                            theme === 'dark'
                                ? 'bg-slate-800/80 border-slate-700'
                                : 'bg-white/70 border-white/60'
                        }`}>
                            {connectionState.signalQrImage ? (
                                <img
                                    src={connectionState.signalQrImage}
                                    alt="Signal QR Code"
                                    width={256}
                                    height={256}
className={`rounded-xl ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}
                                />
                            ) : (
                                <div className={`w-64 h-64 flex items-center justify-center ${
                                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                                }`}>
                                    {getTranslation(language, 'waitingForQR')}
                                </div>
                            )}
                        </div>
                        <p className={`text-center max-w-md ${
                            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                            {getTranslation(language, 'scanQRSignal')}
                        </p>
                    </>
                ) : (
                    <div className={`w-64 h-64 flex flex-col items-center justify-center rounded-2xl border ${
                        theme === 'dark' 
                            ? 'text-slate-500 bg-slate-800/80 border-slate-700' 
                            : 'text-slate-400 bg-white/70 border-white/60'
                    }`}>
                        <p className="text-center px-4">{getTranslation(language, 'signalAPINotAvailable')}</p>
                        <p className="text-xs text-center px-4 mt-2">{getTranslation(language, 'signalAPINote')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
