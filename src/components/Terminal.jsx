import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Play, ChevronRight } from 'lucide-react';
import { useCluster } from '../store/clusterContext';

export function Terminal() {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState([
        { type: 'info', content: 'Welcome to Kubernetes Interactive Learning Game v1.0.0' },
        { type: 'info', content: 'Type "help" for available commands.' },
    ]);
    const bottomRef = useRef(null);
    const { dispatch } = useCluster();

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const handleCommand = (cmd) => {
        const trimmed = cmd.trim();
        if (!trimmed) return;

        const newHistory = [...history, { type: 'command', content: trimmed }];

        if (trimmed === 'help') {
            newHistory.push({ type: 'response', content: 'Available commands:\n  kubectl run <name> --image=<image>\n  kubectl get pods\n  clear' });
        } else if (trimmed === 'clear') {
            setHistory([]);
            setInput('');
            return;
        } else if (trimmed.startsWith('kubectl run')) {
            // Basic parsing for demo
            const parts = trimmed.split(' ');
            const name = parts[2];
            if (name) {
                newHistory.push({ type: 'response', content: `pod/${name} created` });
                dispatch({
                    type: 'ADD_POD',
                    payload: {
                        id: `pod-${Date.now()}`,
                        name,
                        status: 'Pending',
                        nodeId: null
                    }
                });
            } else {
                newHistory.push({ type: 'error', content: 'Error: Name required' });
            }
        } else if (trimmed.startsWith('kubectl expose')) {
            // kubectl expose pod <name> --port=80
            const parts = trimmed.split(' ');
            const type = parts[2]; // pod
            const name = parts[3];

            if (type === 'pod' && name) {
                newHistory.push({ type: 'response', content: `service/${name} exposed` });
                dispatch({
                    type: 'ADD_SERVICE',
                    payload: {
                        id: `svc-${Date.now()}`,
                        name,
                        selector: { app: name }, // Simplified selector
                        clusterIP: '10.96.0.10',
                        ports: [{ port: 80, targetPort: 80 }]
                    }
                });
            } else {
                newHistory.push({ type: 'error', content: 'Usage: kubectl expose pod <name>' });
            }
        } else if (trimmed.startsWith('curl')) {
            // curl <ip>
            const parts = trimmed.split(' ');
            const url = parts[1];
            if (url) {
                newHistory.push({ type: 'response', content: `Sending request to ${url}...` });
                dispatch({
                    type: 'START_CURL',
                    payload: { url }
                });
            }
        } else if (trimmed.startsWith('kubectl scale')) {
            // kubectl scale deployment <name> --replicas=<n>
            // Simplified: kubectl scale <name> <n>
            const parts = trimmed.split(' ');
            const name = parts[2];
            const replicas = parseInt(parts[3]);

            if (name && !isNaN(replicas)) {
                newHistory.push({ type: 'response', content: `deployment.apps/${name} scaled` });
                dispatch({
                    type: 'UPDATE_DEPLOYMENT_SCALE',
                    payload: { name, replicas }
                });
            } else {
                newHistory.push({ type: 'error', content: 'Usage: kubectl scale <name> <replicas>' });
            }
        } else if (trimmed === 'kubectl get pods') {
            // This would ideally fetch from state, but for terminal history we just ack. 
            // Real state is shown in Visualizer.
            newHistory.push({ type: 'response', content: 'Listing pods...' });
        } else {
            newHistory.push({ type: 'error', content: `Command not found: ${trimmed}` });
        }

        setHistory(newHistory);
        setInput('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCommand(input);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] font-mono text-sm">
            <div className="h-8 bg-[#252526] flex items-center px-4 border-b border-[#333] select-none">
                <TerminalIcon size={14} className="text-slate-400 mr-2" />
                <span className="text-slate-400 text-xs">Terminal</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {history.map((entry, i) => (
                    <div key={i} className={`${entry.type === 'error' ? 'text-red-400' : entry.type === 'command' ? 'text-slate-300' : 'text-slate-400'}`}>
                        {entry.type === 'command' && <span className="text-green-500 mr-2">➜</span>}
                        <span className="whitespace-pre-wrap">{entry.content}</span>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            <div className="p-3 bg-[#252526] border-t border-[#333] flex items-center">
                <ChevronRight size={16} className="text-green-500 mr-2" />
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent border-none outline-none text-slate-200 placeholder-slate-600"
                    placeholder="Enter kubectl command..."
                    autoFocus
                />
            </div>
        </div>
    );
}
