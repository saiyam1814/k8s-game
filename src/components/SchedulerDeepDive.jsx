import React from 'react';
import { ArrowRight, Filter, Calculator, Shield, Database, Server, CheckCircle, XCircle } from 'lucide-react';
import { useCluster } from '../store/clusterContext';

export function SchedulerDeepDive({ onClose }) {
    const { state } = useCluster();
    const { schedulerInternals } = state;
    const { currentPod, nodes, phase } = schedulerInternals || { currentPod: null, nodes: [], phase: 'IDLE' };

    const stages = [
        { id: 'QUEUE', label: 'Scheduling Queue', icon: <Database size={20} /> },
        { id: 'PRE_FILTER', label: 'Pre-Filter (Gates/Overhead)', icon: <Shield size={20} /> },
        { id: 'FILTER', label: 'Filter (Predicates)', icon: <Filter size={20} /> },
        { id: 'POST_FILTER', label: 'Post-Filter (Preemption)', icon: <XCircle size={20} /> },
        { id: 'SCORE', label: 'Score (Priorities)', icon: <Calculator size={20} /> },
        { id: 'BIND', label: 'Bind (Assignment)', icon: <CheckCircle size={20} /> },
    ];

    const activeStageIndex = stages.findIndex(s => s.id === phase) !== -1 ? stages.findIndex(s => s.id === phase) : 0;

    return (
        <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
            {/* Header */}
            <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-sm">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Server className="text-purple-400" />
                    Scheduler Deep Dive Pipeline
                </h2>
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    Exit Deep Dive
                </button>
            </div>

            {/* Pipeline Visualization */}
            <div className="flex-1 p-8 overflow-hidden flex flex-col gap-8">
                {/* Progress Bar */}
                <div className="flex items-center justify-between px-12 relative">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -z-10" />
                    <div
                        className="absolute top-1/2 left-0 h-1 bg-purple-600 -z-10 transition-all duration-500"
                        style={{ width: `${(activeStageIndex / (stages.length - 1)) * 100}%` }}
                    />
                    {stages.map((stage, index) => (
                        <div key={stage.id} className={`flex flex-col items-center gap-2 ${index <= activeStageIndex ? 'opacity-100' : 'opacity-40'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${index < activeStageIndex ? 'bg-purple-600 border-purple-600 text-white' :
                                    index === activeStageIndex ? 'bg-slate-900 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]' :
                                        'bg-slate-900 border-slate-700 text-slate-600'
                                }`}>
                                {stage.icon}
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{stage.label}</span>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 grid grid-cols-12 gap-8">
                    {/* Left Panel: Pod Info */}
                    <div className="col-span-3 bg-slate-900/50 rounded-xl border border-slate-800 p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Pod Specification</h3>
                        {currentPod ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                                    <div className="text-sm text-slate-400 mb-1">Name</div>
                                    <div className="font-mono text-white">{currentPod.name}</div>
                                </div>
                                <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                                    <div className="text-sm text-slate-400 mb-1">Resources</div>
                                    <div className="font-mono text-xs text-slate-300">
                                        CPU: {currentPod.resources?.cpu || '100m'}<br />
                                        Memory: {currentPod.resources?.memory || '128Mi'}
                                    </div>
                                </div>
                                {currentPod.tolerations?.length > 0 && (
                                    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                                        <div className="text-sm text-slate-400 mb-1">Tolerations</div>
                                        {currentPod.tolerations.map((t, i) => (
                                            <div key={i} className="text-xs font-mono text-blue-300 bg-blue-500/10 px-2 py-1 rounded mb-1">
                                                {t.key}={t.value}:{t.effect}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-slate-500 italic">Waiting for pod...</div>
                        )}
                    </div>

                    {/* Center Panel: Active Stage Details */}
                    <div className="col-span-9 bg-slate-900/50 rounded-xl border border-slate-800 p-6 flex flex-col">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            {stages[activeStageIndex].icon}
                            {stages[activeStageIndex].label} Details
                        </h3>

                        <div className="flex-1 overflow-y-auto">
                            {phase === 'FILTER' && (
                                <div className="grid grid-cols-3 gap-4">
                                    {nodes.map(node => (
                                        <NodeCard key={node.id} node={node} type="filter" />
                                    ))}
                                </div>
                            )}
                            {phase === 'SCORE' && (
                                <div className="grid grid-cols-3 gap-4">
                                    {nodes.map(node => (
                                        <NodeCard key={node.id} node={node} type="score" />
                                    ))}
                                </div>
                            )}
                            {phase === 'BIND' && (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle size={40} className="text-green-400" />
                                        </div>
                                        <h4 className="text-2xl font-bold text-white mb-2">Binding Successful</h4>
                                        <p className="text-slate-400">Pod assigned to <span className="text-white font-bold">{nodes.find(n => n.score === Math.max(...nodes.map(n => n.score || -1)))?.name}</span></p>
                                    </div>
                                </div>
                            )}
                            {(phase === 'QUEUE' || phase === 'PRE_FILTER' || phase === 'POST_FILTER') && (
                                <div className="flex items-center justify-center h-full text-slate-500 italic">
                                    Processing {stages[activeStageIndex].label}...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function NodeCard({ node, type }) {
    return (
        <div className={`bg-slate-800 p-4 rounded-lg border ${node.score === -1 ? 'border-red-500/30 opacity-50' : 'border-slate-700'}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="font-bold text-white">{node.name}</div>
                {node.taints?.length > 0 && (
                    <span className="text-[10px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20">
                        TAINTED
                    </span>
                )}
            </div>

            {type === 'filter' && (
                <div className="space-y-2">
                    <PredicateRow label="Resources" passed={node.predicates?.podFitsResources} />
                    <PredicateRow label="Disk" passed={node.predicates?.noDiskConflict} />
                    <PredicateRow label="Tolerations" passed={node.predicates?.podToleratesNodeTaints} />
                </div>
            )}

            {type === 'score' && node.score !== -1 && (
                <div className="space-y-3">
                    <div className="flex justify-between text-sm text-slate-400">
                        <span>Total Score</span>
                        <span className="text-purple-400 font-bold text-lg">{node.score}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${node.score}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mt-2">
                        <div>ImageLocality: {node.priorities?.imageLocality}</div>
                        <div>LeastRequested: {node.priorities?.leastRequested}</div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PredicateRow({ label, passed }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{label}</span>
            {passed ? <CheckCircle size={14} className="text-green-400" /> : <XCircle size={14} className="text-red-400" />}
        </div>
    );
}
