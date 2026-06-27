import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Plus, Trash2, Zap, MessageCircle, Settings } from 'lucide-react';
import { socket, Platform, ConnectionState } from '../App';
import { ContactCard } from './ContactCard';
import { ContactsList } from './ContactsList';
import { Login } from './Login';
import { Language, getTranslation } from '../i18n';

type ProbeMethod = 'delete' | 'reaction';

interface DashboardProps {
    connectionState: ConnectionState;
    language: Language;
    theme: 'light' | 'dark';
}

interface TrackerData {
    rtt: number;
    avg: number;
    median: number;
    threshold: number;
    // New metrics
    onlineAvg: number;
    standbyAvg: number;
    confidence: number;
    state: string;
    timestamp: number;
}

interface DeviceInfo {
    jid: string;
    state: string;
    rtt: number;
    avg: number;
    onlineAvg: number;
    standbyAvg: number;
    threshold: number;
    confidence: number;
}

interface ContactInfo {
    jid: string;
    displayNumber: string;
    contactName: string;
    data: TrackerData[];
    devices: DeviceInfo[];
    deviceCount: number;
    presence: string | null;
    profilePic: string | null;
    platform: Platform;
    paused: boolean;
    isTracking: boolean;
}

export function Dashboard({ connectionState, language, theme }: DashboardProps) {
    const [inputNumber, setInputNumber] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>(
        connectionState.whatsapp ? 'whatsapp' : 'signal'
    );
    const [contacts, setContacts] = useState<Map<string, ContactInfo>>(new Map());
    const [error, setError] = useState<string | null>(null);
    const [privacyMode, setPrivacyMode] = useState(false);
    const [probeMethod, setProbeMethod] = useState<ProbeMethod>('delete');
    const [showConnections, setShowConnections] = useState(false);
    const [minDelay, setMinDelay] = useState(500);
    const [maxDelay, setMaxDelay] = useState(1000);
    const [delayApplying, setDelayApplying] = useState(false);

    useEffect(() => {
        function onTrackerUpdate(update: any) {
            const { jid, ...data } = update;
            if (!jid) return;

            setContacts(prev => {
                const next = new Map(prev);
                const contact = next.get(jid);

                if (contact) {
                    // Update existing contact
                    const updatedContact = { ...contact };

                    if (data.presence !== undefined) {
                        updatedContact.presence = data.presence;
                    }
                    if (data.deviceCount !== undefined) {
                        updatedContact.deviceCount = data.deviceCount;
                    }
                    if (data.devices !== undefined) {
                        updatedContact.devices = data.devices;
                    }

                    // Add to chart data
                    if (data.devices && data.devices.length > 0) {
                        const device = data.devices[0];
                        const newDataPoint: TrackerData = {
                            rtt: device.rtt,
                            avg: device.avg || 0,
                            median: data.median || 0,
                            threshold: device.threshold,
                            onlineAvg: device.onlineAvg,
                            standbyAvg: device.standbyAvg,
                            confidence: device.confidence,
                            state: data.devices.find((d: DeviceInfo) => d.state.includes('Online'))?.state ||
                                data.devices.find((d: DeviceInfo) => d.state.includes('Standby'))?.state ||
                                data.devices.find((d: DeviceInfo) => d.state === 'OFFLINE')?.state ||
                                device.state,
                            timestamp: Date.now(),
                        };
                        updatedContact.data = [...updatedContact.data, newDataPoint];

                        // Limit history to 100 points
                        if (updatedContact.data.length > 100) {
                            updatedContact.data.shift();
                        }
                    }

                    next.set(jid, updatedContact);
                }

                return next;
            });
        }

        function onProfilePic(data: { jid: string, url: string | null }) {
            setContacts(prev => {
                const next = new Map(prev);
                const contact = next.get(data.jid);
                if (contact) {
                    next.set(data.jid, { ...contact, profilePic: data.url });
                }
                return next;
            });
        }

        function onContactName(data: { jid: string, name: string }) {
            setContacts(prev => {
                const next = new Map(prev);
                const contact = next.get(data.jid);
                if (contact) {
                    next.set(data.jid, { ...contact, contactName: data.name });
                }
                return next;
            });
        }

        function onContactAdded(data: { jid: string, number: string, platform?: Platform }) {
            setContacts(prev => {
                const next = new Map(prev);
                const existingContact = next.get(data.jid);
                next.set(data.jid, {
                    jid: data.jid,
                    displayNumber: data.number,
                    contactName: existingContact?.contactName || data.number,
                    data: existingContact?.data || [],
                    devices: existingContact?.devices || [],
                    deviceCount: existingContact?.deviceCount || 0,
                    presence: existingContact?.presence || null,
                    profilePic: existingContact?.profilePic || null,
                    platform: data.platform || 'whatsapp',
                    paused: existingContact?.paused || false,
                    isTracking: true
                });
                return next;
            });
            setInputNumber('');
        }

        function onTrackingPaused(jid: string) {
            setContacts(prev => {
                const next = new Map(prev);
                const contact = next.get(jid);
                if (contact) {
                    next.set(jid, { ...contact, isTracking: false });
                }
                return next;
            });
        }

        function onTrackingResumed(jid: string) {
            setContacts(prev => {
                const next = new Map(prev);
                const contact = next.get(jid);
                if (contact) {
                    next.set(jid, { ...contact, isTracking: true });
                }
                return next;
            });
        }

        function onContactRemoved(jid: string) {
            setContacts(prev => {
                const next = new Map(prev);
                next.delete(jid);
                return next;
            });
        }

        function onError(data: { jid?: string, message: string }) {
            setError(data.message);
            setTimeout(() => setError(null), 3000);
        }

        function onProbeMethod(method: ProbeMethod) {
            setProbeMethod(method);
        }

        function onTrackedContacts(contactsList: { id: string, platform: Platform, paused?: boolean }[]) {
            setContacts(prev => {
                const next = new Map(prev);
                contactsList.forEach(({ id, platform, paused }) => {
                    if (!next.has(id)) {
                        // Extract display number from id
                        let displayNumber = id;
                        if (platform === 'signal') {
                            displayNumber = id.replace('signal:', '');
                        } else {
                            // WhatsApp JID format: number@s.whatsapp.net
                            displayNumber = id.split('@')[0];
                        }
                        next.set(id, {
                            jid: id,
                            displayNumber,
                            contactName: displayNumber,
                            data: [],
                            devices: [],
                            deviceCount: 0,
                            presence: null,
                            profilePic: null,
                            platform,
                            paused: paused ?? false,
                            isTracking: true
                        });
                    } else if (paused !== undefined) {
                        const contact = next.get(id);
                        if (contact) {
                            next.set(id, { ...contact, paused }); // Corrected 'entry' to 'contact'
                        }
                    }
                });
                return next; // Saves the updated contacts map to React state!
            });
        } // Closed cleanly with '}' so your useEffect stays perfectly open!
        
        socket.on('tracker-update', onTrackerUpdate);
        socket.on('profile-pic', onProfilePic);
        socket.on('contact-name', onContactName);
        socket.on('contact-added', onContactAdded);
        socket.on('tracking-paused', onTrackingPaused);
        socket.on('tracking-resumed', onTrackingResumed);
        socket.on('contact-removed', onContactRemoved);
        socket.on('error', onError);
        socket.on('probe-method', onProbeMethod);
        socket.on('tracked-contacts', onTrackedContacts);
        socket.on('tracking-state', onTrackingState);

        // Request tracked contacts after listeners are set up
        socket.emit('get-tracked-contacts');

        return () => {
            socket.off('tracker-update', onTrackerUpdate);
            socket.off('profile-pic', onProfilePic);
            socket.off('contact-name', onContactName);
            socket.off('contact-added', onContactAdded);
            socket.off('tracking-paused', onTrackingPaused);
            socket.off('tracking-resumed', onTrackingResumed);
            socket.off('contact-removed', onContactRemoved);
            socket.off('error', onError);
            socket.off('probe-method', onProbeMethod);
            socket.off('tracked-contacts', onTrackedContacts);
            socket.off('tracking-state', onTrackingState);
        };
    }, []);

    const handleAdd = () => {
        if (!inputNumber) return;
        socket.emit('add-contact', { number: inputNumber, platform: selectedPlatform });
    };

    const handlePauseTracking = (jid: string) => {
        socket.emit('pause-tracking', jid);
    };

    const handleResumeTracking = (jid: string) => {
        socket.emit('resume-tracking', jid);
    };

    const handleRemoveContact = (jid: string) => {
        socket.emit('remove-contact', jid);
    };

    const handleProbeMethodChange = (method: ProbeMethod) => {
        socket.emit('set-probe-method', method);
    };

    const handleDelayChange = () => {
        if (minDelay >= maxDelay) {
            setError('Min delay must be less than max delay');
            return;
        }
        setDelayApplying(true);
        socket.emit('set-probe-delay', { minDelay, maxDelay });

        // Visual feedback: reset button state after 1.5 seconds
        setTimeout(() => {
            setDelayApplying(false);
        }, 1500);
    };

    return (
        <div className="space-y-8">
            {/* Contacts List Management */}
            {contacts.size > 0 && (
                <ContactsList
                    contacts={Array.from(contacts.values()).map(c => ({
                        jid: c.jid,
                        displayNumber: c.contactName,
                        isTracking: c.isTracking,
                        platform: c.platform,
                        state: c.devices?.[0]?.state
                    }))}
                    onPause={handlePauseTracking}
                    onResume={handleResumeTracking}
                    onRemove={handleRemoveContact}
                    language={language}
                    theme={theme}
                />
            )}

            {/* Add Contact Form */}
            <div className={`glass-panel p-6 rounded-2xl shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] border ${
                theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-white/60'
            }`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                            {getTranslation(language, 'trackContacts')}
                        </h2>
                        {/* Manage Connections button */}
                        <button
                            onClick={() => setShowConnections(!showConnections)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-1 ${
                                showConnections
                                    ? 'bg-[#0f766e] text-white shadow-sm'
                                    : 'bg-white/70 text-slate-600 hover:bg-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                        >
                            <Settings size={14} />
                            {showConnections ? getTranslation(language, 'hideConnections') : getTranslation(language, 'manageConnections')}
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Probe Delay Settings */}
                        <div className={`flex items-center gap-2 p-3 rounded-2xl border ${
                            theme === 'dark'
                                ? 'bg-slate-800/80 border-slate-700'
                                : 'bg-white/70 border-white/60'
                        }`}>
                            <label className="text-sm text-slate-500 dark:text-slate-400">
                                {getTranslation(language, 'probeDelay')}
                            </label>
                            <input
                                type="number"
                                min="10"
                                max="5000"
                                value={minDelay}
                                onChange={(e) => setMinDelay(parseInt(e.target.value))}
                                className="w-16 px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0f766e] outline-none bg-white/70 dark:bg-slate-800 text-slate-900 dark:text-white"
                                title={getTranslation(language, 'minDelay')}
                            />
                            <span className="text-xs text-slate-400">-</span>
                            <input
                                type="number"
                                min="10"
                                max="5000"
                                value={maxDelay}
                                onChange={(e) => setMaxDelay(parseInt(e.target.value))}
                                className="w-16 px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0f766e] outline-none bg-white/70 dark:bg-slate-800 text-slate-900 dark:text-white"
                                title={getTranslation(language, 'maxDelay')}
                            />
                            <button
                                onClick={handleDelayChange}
                                disabled={delayApplying}
                                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-300 flex items-center justify-center min-w-10 ${
                                    delayApplying
                                        ? 'bg-[#1f7a4f] text-white scale-110 shadow-lg'
                                        : 'bg-[#0f766e] text-white hover:bg-[#0d645d]'
                                }`}
                            >
                                {delayApplying ? '✓' : '✓'}
                            </button>
                        </div>

                        {/* Probe Method Toggle */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                {getTranslation(language, 'probeMethod')}
                            </span>
                            <div className="flex rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800 p-0.5">
                                <button
                                    onClick={() => handleProbeMethodChange('delete')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-1 ${
                                        probeMethod === 'delete'
                                            ? 'bg-[#0f766e] text-white shadow-sm'
                                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                    }`}
                                    title={getTranslation(language, 'deleteProbeTitle')}
                                >
                                    <Trash2 size={14} />
                                    {getTranslation(language, 'delete')}
                                </button>
                                <button
                                    onClick={() => handleProbeMethodChange('reaction')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-1 ${
                                        probeMethod === 'reaction'
                                            ? 'bg-[#e07a4f] text-white shadow-sm'
                                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                    }`}
                                    title={getTranslation(language, 'reactionProbeTitle')}
                                >
                                    <Zap size={14} />
                                    {getTranslation(language, 'reaction')}
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Privacy Mode Toggle */}
                    <button
                        onClick={() => setPrivacyMode(!privacyMode)}
                        className={`px-3 sm:px-4 py-2 rounded-full flex items-center gap-2 font-medium transition-all duration-200 whitespace-nowrap border ${
                            privacyMode 
                                ? 'bg-[#1f4b48] text-white border-[#1f4b48] shadow-md' 
                                : theme === 'dark'
                                    ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                                    : 'bg-white/70 text-slate-600 border-white/60 hover:bg-white'
                        }`}
                        title={privacyMode ? getTranslation(language, 'privacyModeOn') : getTranslation(language, 'privacyModeOff')}
                    >
                        {privacyMode ? (
                            <>
                                <EyeOff size={18} className="flex-shrink-0" />
                                <span className="text-xs sm:text-sm">{getTranslation(language, 'privacyON')}</span>
                            </>
                        ) : (
                            <>
                                <Eye size={18} className="flex-shrink-0" />
                                <span className="text-xs sm:text-sm">{getTranslation(language, 'privacyOFF')}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
            <div className="flex flex-col gap-4 md:flex-row">
                {/* Platform Selector */}
                <div className={`flex rounded-full overflow-hidden border p-0.5 ${
                    theme === 'dark' 
                        ? 'border-slate-800 bg-slate-900/90' 
                        : 'border-[#e6dfd3] bg-white/70'
                }`}>
                    <button
                        onClick={() => setSelectedPlatform('whatsapp')}
                        disabled={!connectionState.whatsapp}
                        className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1 sm:gap-2 whitespace-nowrap rounded-full ${
                            selectedPlatform === 'whatsapp'
                                ? 'bg-[#1f7a4f] text-white shadow-sm'
                                : connectionState.whatsapp
                                    ? theme === 'dark'
                                        ? 'text-slate-300 hover:bg-slate-800'
                                        : 'text-slate-600 hover:bg-white'
                                    : theme === 'dark'
                                        ? 'text-slate-600 cursor-not-allowed'
                                        : 'text-slate-400 cursor-not-allowed'
                        }`}
                        title={connectionState.whatsapp ? 'WhatsApp' : getTranslation(language, 'whatsappNotConnected')}
                    >
                        <MessageCircle size={14} className="flex-shrink-0" />
                        <span>WhatsApp</span>
                    </button>
                    <button
                        onClick={() => setSelectedPlatform('signal')}
                        disabled={!connectionState.signal}
                        className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1 sm:gap-2 whitespace-nowrap rounded-full ${
                            selectedPlatform === 'signal'
                                ? 'bg-[#2563eb] text-white shadow-sm'
                                : connectionState.signal
                                    ? theme === 'dark'
                                        ? 'text-slate-300 hover:bg-slate-800'
                                        : 'text-slate-600 hover:bg-white'
                                    : theme === 'dark'
                                        ? 'text-slate-600 cursor-not-allowed'
                                        : 'text-slate-400 cursor-not-allowed'
                        }`}
                        title={connectionState.signal ? 'Signal' : getTranslation(language, 'signalNotConnected')}
                    >
                        <MessageCircle size={14} className="flex-shrink-0" />
                        <span>Signal</span>
                    </button>
                </div>
                <input
                    type="text"
                    placeholder={getTranslation(language, 'enterPhoneNumber')}
                    className={`flex-1 min-w-[200px] px-3 sm:px-4 py-2 text-sm rounded-xl border shadow-sm outline-none transition-colors focus:ring-2 ${
                        theme === 'dark'
                            ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500 focus:ring-[#e07a4f]/40 focus:border-[#e07a4f]'
                            : 'bg-white/80 border-[#e6dfd3] text-slate-800 placeholder-slate-400 focus:ring-[#e07a4f]/40 focus:border-[#e07a4f]'
                    }`}
                    value={inputNumber}
                    onChange={(e) => setInputNumber(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                />
                <button
                    onClick={handleAdd}
                    className="px-3 sm:px-6 py-2 bg-[#0f766e] text-white rounded-full hover:bg-[#0b5f58] flex items-center gap-1 sm:gap-2 font-medium whitespace-nowrap text-xs sm:text-sm flex-shrink-0 transition-colors shadow-sm"
                >
                    <Plus size={18} className="flex-shrink-0" /> <span>{getTranslation(language, 'addContact')}</span>
                </button>
            </div>
            {error && <p className="mt-2 text-rose-500 text-sm">{error}</p>}
        </div>

        {/* Connections Panel */}
        {showConnections && (
            <Login connectionState={connectionState} language={language} theme={theme} />
        )}

        {/* Contact Cards */}
        {contacts.size === 0 ? (
            <div className={`border border-dashed rounded-2xl p-12 text-center shadow-sm ${
                theme === 'dark'
                    ? 'bg-slate-900/60 border-slate-800'
                    : 'bg-white/60 border-[#e5d5c3]'
            }`}>
                <p className={`text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {getTranslation(language, 'noContactsTracked')}
                </p>
                <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                    {getTranslation(language, 'addContactToStart')}
                </p>
            </div>
        ) : (
            <div className="space-y-8">
                {Array.from(contacts.values()).map(contact => (
                    <ContactCard
                        key={contact.jid}
                        jid={contact.jid}
                        displayNumber={contact.contactName}
                        data={contact.data}
                        devices={contact.devices}
                        deviceCount={contact.deviceCount}
                        presence={contact.presence}
                        profilePic={contact.profilePic}
                        paused={contact.paused}
                        isTracking={contact.isTracking}
                        onPause={() => handlePauseTracking(contact.jid)}
                        onResume={() => handleResumeTracking(contact.jid)}
                        onRemove={() => handleRemoveContact(contact.jid)}
                        privacyMode={privacyMode}
                        platform={contact.platform}
                        language={language}
                        theme={theme}
                    />
                ))}
            </div>
        )}
    </div>