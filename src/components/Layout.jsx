import React, { useEffect, useState } from 'react';
import { ControlPlaneNode, WorkerNode } from './ClusterNodes';
import { PacketLayer } from './PacketLayer';
import { useCluster } from '../store/clusterContext';
import { Play, Pause, SkipForward, Plus, Network, Layers, RotateCcw, Cpu, Globe } from 'lucide-react';
import { SchedulerInternals } from './SchedulerInternals';
import { SchedulerDeepDive } from './SchedulerDeepDive';
import { ConnectionLayer } from './ConnectionLayer';

export function Layout() {
    const { state, dispatch } = useCluster();
    const [showScheduler, setShowScheduler] = useState(false);

    // Step Executor Logic
    useEffect(() => {
        let interval;
        if (state.isPlaying && state.stepQueue.length > 0) {
            interval = setInterval(() => {
                const nextStep = state.stepQueue[0];
                if (nextStep) {
                    nextStep.actions.forEach(action => dispatch(action));
                    dispatch({ type: 'EXECUTE_NEXT_STEP' });
                }
            }, 2500); // Slow auto-play speed
        }
        return () => clearInterval(interval);
    }, [state.isPlaying, state.stepQueue, dispatch]);

    const handleNextStep = () => {
        if (state.stepQueue.length > 0) {
            const nextStep = state.stepQueue[0];
            nextStep.actions.forEach(action => dispatch(action));
            dispatch({ type: 'EXECUTE_NEXT_STEP' });
        }
    };

    const handleAction = (action) => {
        switch (action) {
            case 'create-pod':
                dispatch({
                    type: 'ADD_POD',
                    payload: {
                        id: `pod-${Date.now()}`,
                        name: `nginx-${Math.floor(Math.random() * 1000)}`,
                        status: 'Pending',
                        nodeId: null
                    }
                });
                break;
            case 'expose-service':
                dispatch({
                    type: 'ADD_SERVICE',
                    payload: {
                        id: `svc-${Date.now()}`,
                        name: 'nginx-svc',
                        selector: { app: 'nginx' },
                        clusterIP: '10.96.0.10',
                        ports: [{ port: 80, targetPort: 80 }]
                    }
                });
                break;
            case 'scale-up':
                dispatch({
                    type: 'UPDATE_DEPLOYMENT_SCALE',
                    payload: { name: 'nginx-dep', replicas: 3 }
                });
                break;
            case 'curl':
                dispatch({
                    type: 'START_CURL',
                    payload: { url: '10.96.0.10' }
                });
                break;
            case 'reset':
                window.location.reload(); // Simple reset
                break;
            case 'ingress-demo':
                dispatch({ type: 'START_INGRESS_SIMULATION' });
                break;
        }
    };

    if (state.isSchedulerDeepDiveMode) {
        return <SchedulerDeepDive onClose={() => dispatch({ type: 'SET_SCHEDULER_DEEP_DIVE_MODE', payload: false })} />;
    }

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden font-sans">
            {/* Header */}
            <header className="h-16 border-b border-slate-800 flex items-center px-6 bg-slate-900/50 backdrop-blur-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <span className="font-bold text-lg">K</span>
                    </div>
                    <h1 className="font-bold text-xl tracking-tight">
                        K8s <span className="text-blue-400">Interactive</span>
                    </h1>
                </div>

                {/* Action Bar (Top Center) */}
                <div className="mx-auto flex items-center gap-2">
                    <ActionButton
                        icon={<Plus />}
                        label="Create Pod"
                        onClick={() => handleAction('create-pod')}
                        color="bg-blue-600 hover:bg-blue-500"
                        disabled={state.stepQueue.length > 0}
                    />
                    <ActionButton
                        icon={<Network />}
                        label="Expose Service"
                        onClick={() => handleAction('expose-service')}
                        color="bg-purple-600 hover:bg-purple-500"
                        disabled={state.stepQueue.length > 0}
                    />
                    <ActionButton
                        icon={<Cpu />}
                        label="Scheduler Deep Dive"
                        onClick={() => dispatch({ type: 'SET_SCHEDULER_DEEP_DIVE_MODE', payload: true })}
                        color="bg-purple-600 hover:bg-purple-500"
                        disabled={false}
                    />
                    <ActionButton
                        icon={<Globe />}
                        label="Ingress Animation"
                        onClick={() => handleAction('ingress-demo')}
                        color="bg-orange-600 hover:bg-orange-500"
                        disabled={state.stepQueue.length > 0}
                    />

                    {state.services.length > 0 && (
                        <ActionButton
                            icon={<Play />}
                            label="Curl Request"
                            onClick={() => handleAction('curl')}
                            color="bg-green-600 hover:bg-green-500"
                            disabled={state.stepQueue.length > 0}
                        />
                    )}

                    <div className="w-px h-6 bg-slate-700 mx-2"></div>
                    <button onClick={() => handleAction('reset')} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors" title="Reset">
                        <RotateCcw size={18} />
                    </button>
                </div>

                <div className="ml-auto flex items-center gap-4 text-sm text-slate-400">
                    <span>v1.30.0</span>
                </div>
            </header>

            {/* Simulation Control Bar & Step Banner */}
            <div className="bg-slate-900 border-b border-slate-800 p-4 flex flex-col items-center gap-3 shadow-lg z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => dispatch({ type: 'SET_PLAYING', payload: !state.isPlaying })}
                        className={`p-3 rounded-full ${state.isPlaying ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'} hover:scale-110 transition-transform`}
                        aria-label={state.isPlaying ? "Pause Simulation" : "Play Simulation"}
                    >
                        {state.isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                    </button>
                    <button
                        onClick={handleNextStep}
                        disabled={state.isPlaying || state.stepQueue.length === 0}
                        className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold tracking-wide transition-colors border border-slate-700"
                        aria-label="Next Step"
                    >
                        <SkipForward size={20} />
                        NEXT STEP
                        {state.stepQueue.length > 0 && <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full ml-2">{state.stepQueue.length}</span>}
                    </button>
                </div>
                <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Current Action</div>
                    <div className="text-lg font-medium text-blue-200 min-h-[28px] animate-fade-in">
                        {state.currentStepDescription}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative p-4 gap-4">
                <PacketLayer />
                <ConnectionLayer />

                <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />

                {/* Nodes Container - Centered and Compact */}
                <div className="flex-1 flex items-center justify-center gap-8 z-10 scale-[0.85] origin-center">
                    <ControlPlaneNode />
                    <WorkerNode node={state.nodes[0]} />
                </div>
            </main>

            {/* Logs Panel (Bottom) */}
            < div className="h-48 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto font-mono text-xs" >
                <div className="text-slate-500 font-bold mb-2 uppercase tracking-wider sticky top-0 bg-slate-900/80 py-1">Cluster Events</div>
                <div className="space-y-1">
                    {state.events.slice().reverse().map((event, i) => (
                        <div key={i} className="flex gap-2 text-slate-300">
                            <span className="text-slate-500">[{new Date(event.timestamp).toLocaleTimeString()}]</span>
                            <span className={`font-bold ${event.type === 'ERROR' ? 'text-red-400' :
                                event.type === 'SCHEDULER' ? 'text-purple-400' :
                                    event.type === 'KUBELET' ? 'text-yellow-400' :
                                        event.type === 'NETWORK' ? 'text-cyan-400' : 'text-blue-400'
                                }`}>{event.type}</span>
                            <span>{event.message}</span>
                        </div>
                    ))}
                </div>
            </div >
            {/* Scheduler Modal */}
            {
                (showScheduler || state.showSchedulerWindow) && (
                    <SchedulerInternals
                        onClose={() => {
                            setShowScheduler(false);
                            dispatch({ type: 'SET_SHOW_SCHEDULER_WINDOW', payload: false });
                        }}
                    />
                )
            }
        </div >
    );
}

function ActionButton({ icon, label, onClick, color, disabled }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-lg 
                ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-400' : `${color} hover:scale-105 active:scale-95`}`}
        >
            {React.cloneElement(icon, { size: 16 })}
            {label}
        </button>
    )
}
