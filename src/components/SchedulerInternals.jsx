import React from 'react';
import { Check, X, ArrowRight, Filter, Calculator } from 'lucide-react';
import { useCluster } from '../store/clusterContext';

export function SchedulerInternals({ onClose }) {
    const { state } = useCluster();
    const { schedulerInternals } = state;

    if (!schedulerInternals) return null;

    const { currentPod, nodes, phase } = schedulerInternals;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-[800px] max-h-[80vh] overflow-y-auto shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Calculator className="text-purple-400" />
                        Scheduler Internals
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Current Pod Info */}
                <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-sm text-slate-400 mb-1">Scheduling Pod</div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                                <span className="font-mono text-lg text-white">{currentPod?.name || 'Waiting for pod...'}</span>
                                {phase && (
                                    <span className="ml-auto px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold uppercase border border-purple-500/30">
                                        {phase} Phase
                                    </span>
                                )}
                            </div>
                        </div>
                        {currentPod?.tolerations?.length > 0 && (
                            <div className="text-xs">
                                <div className="text-slate-500 mb-1">Tolerations:</div>
                                {currentPod.tolerations.map((t, i) => (
                                    <div key={i} className="bg-blue-500/10 text-blue-300 px-2 py-1 rounded border border-blue-500/20 font-mono">
                                        {t.key}={t.value}:{t.effect}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Filtering Phase */}
                    <div className={`transition-opacity duration-300 ${phase === 'FILTERING' || phase === 'SCORING' || phase === 'BINDING' ? 'opacity-100' : 'opacity-30'}`}>
                        <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                            <Filter size={16} />
                            1. Filtering (Predicates)
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            {nodes.map(node => (
                                <div key={node.id} className={`bg-slate-800 p-3 rounded border ${node.score === -1 ? 'border-red-500/30 opacity-50' : 'border-slate-700'}`}>
                                    <div className="font-mono text-sm text-slate-300 mb-2 flex justify-between">
                                        {node.name}
                                        {node.taints?.length > 0 && (
                                            <span className="text-[10px] bg-orange-500/10 text-orange-400 px-1 rounded border border-orange-500/20" title="Tainted">
                                                TAINTED
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <PredicateCheck label="PodFitsResources" passed={node.predicates?.podFitsResources} />
                                        <PredicateCheck label="NoDiskConflict" passed={node.predicates?.noDiskConflict} />
                                        <PredicateCheck label="PodToleratesNodeTaints" passed={node.predicates?.podToleratesNodeTaints} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Scoring Phase */}
                    <div className={`transition-opacity duration-300 ${phase === 'SCORING' || phase === 'BINDING' ? 'opacity-100' : 'opacity-30'}`}>
                        <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                            <Calculator size={16} />
                            2. Scoring (Priorities)
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            {nodes.map(node => (
                                <div key={node.id} className="bg-slate-800 p-3 rounded border border-slate-700 relative overflow-hidden">
                                    <div className="font-mono text-sm text-slate-300 mb-2">{node.name}</div>
                                    {node.score !== undefined && (
                                        <div className="absolute top-2 right-2 text-xl font-bold text-purple-400">
                                            {node.score}
                                        </div>
                                    )}
                                    <div className="space-y-1 text-xs text-slate-500">
                                        <div className="flex justify-between">
                                            <span>ImageLocality</span>
                                            <span>{node.priorities?.imageLocality || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>LeastRequested</span>
                                            <span>{node.priorities?.leastRequested || 0}</span>
                                        </div>
                                    </div>
                                    {node.score !== undefined && (
                                        <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 transition-all duration-500"
                                                style={{ width: `${node.score}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Binding Phase */}
                    <div className={`transition-opacity duration-300 ${phase === 'BINDING' ? 'opacity-100' : 'opacity-30'}`}>
                        <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                            <Check size={16} />
                            3. Binding
                        </h3>
                        {phase === 'BINDING' && (
                            <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg flex items-center justify-center gap-4">
                                <span className="font-mono text-green-300">Selected Node:</span>
                                <span className="font-bold text-white text-lg">
                                    {nodes.reduce((prev, current) => (prev.score > current.score) ? prev : current).name}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function PredicateCheck({ label, passed }) {
    if (passed === undefined) return <div className="flex items-center justify-between text-xs text-slate-600"><span>{label}</span><span>...</span></div>;

    return (
        <div className={`flex items-center justify-between text-xs ${passed ? 'text-green-400' : 'text-red-400'}`}>
            <span>{label}</span>
            {passed ? <Check size={12} /> : <X size={12} />}
        </div>
    );
}
