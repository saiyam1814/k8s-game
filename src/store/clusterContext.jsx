import React, { createContext, useContext, useReducer } from 'react';
import { PodStatus, NodeStatus } from '../simulation/types';

const ClusterContext = createContext();

const initialState = {
    nodes: [
        { id: 'node-1', name: 'worker-node-1', status: 'Ready', pods: [] },
    ],
    pods: [],
    services: [],
    deployments: [],
    events: [],
    controlPlane: {
        apiServer: { status: 'Healthy', requests: [] },
        etcd: { status: 'Healthy', data: {} },
        scheduler: { status: 'Healthy' },
    },
    schedulerInternals: null, // { currentPod, nodes: [], phase: 'FILTERING' | 'SCORING' | 'BINDING' }
    packets: [],
    // Networking State
    networking: {
        iptablesRules: [], // Array of strings
        endpoints: [],     // Array of { service, podIp, node }
        interfaces: {
            eth0: { status: 'UP', ip: '10.0.1.2' },
            cni0: { status: 'UP', ip: '172.16.0.1' },
            veth: [] // Array of veth pairs
        }
    },
    // Stepper Mode State
    stepQueue: [],
    isPlaying: false, // Default to manual mode
    currentStepDescription: 'Ready',
    showSchedulerWindow: false, // Automatic window control
    isSchedulerDeepDiveMode: false, // Standalone full-screen mode
};

function clusterReducer(state, action) {
    switch (action.type) {
        // --- Stepper Logic ---
        case 'ENQUEUE_STEPS':
            return { ...state, stepQueue: [...state.stepQueue, ...action.payload] };
        case 'EXECUTE_NEXT_STEP':
            if (state.stepQueue.length === 0) return state;
            const [nextStep, ...remainingSteps] = state.stepQueue;
            return {
                ...state,
                stepQueue: remainingSteps,
                currentStepDescription: nextStep.description
            };
        case 'SET_PLAYING':
            return { ...state, isPlaying: action.payload };
        case 'CLEAR_QUEUE':
            return { ...state, stepQueue: [], currentStepDescription: 'Ready' };
        case 'SET_SHOW_SCHEDULER_WINDOW':
            return { ...state, showSchedulerWindow: action.payload };
        case 'SET_SCHEDULER_DEEP_DIVE_MODE':
            return { ...state, isSchedulerDeepDiveMode: action.payload };

        // --- Business Logic ---
        case 'ADD_POD':
            return {
                ...state,
                pods: [...state.pods, action.payload],
                events: [...state.events, { type: 'INFO', message: `Pod ${action.payload.name} created`, timestamp: Date.now() }]
            };
        case 'UPDATE_POD_STATUS':
            return {
                ...state,
                pods: state.pods.map(pod =>
                    pod.id === action.payload.id ? { ...pod, status: action.payload.status, ip: action.payload.ip } : pod
                ),
                events: [...state.events, { type: 'INFO', message: `Pod ${action.payload.id} is now ${action.payload.status}`, timestamp: Date.now() }]
            };
        case 'ASSIGN_POD_TO_NODE':
            const { podId, nodeId } = action.payload;
            const updatedPods = state.pods.map(pod =>
                pod.id === podId ? { ...pod, nodeId } : pod
            );
            const updatedNodes = state.nodes.map(node =>
                node.id === nodeId ? { ...node, pods: [...node.pods, podId] } : node
            );
            return {
                ...state,
                pods: updatedPods,
                nodes: updatedNodes,
                events: [...state.events, { type: 'SCHEDULER', message: `Assigned ${podId} to ${nodeId}`, timestamp: Date.now() }]
            };
        case 'DELETE_POD':
            return {
                ...state,
                pods: state.pods.filter(p => p.id !== action.payload),
                events: [...state.events, { type: 'INFO', message: `Pod ${action.payload} deleted`, timestamp: Date.now() }]
            };
        case 'ADD_SERVICE':
            return { ...state, services: [...state.services, action.payload] };

        // --- Networking Reducers ---
        case 'ADD_IPTABLES_RULE':
            return {
                ...state,
                networking: {
                    ...state.networking,
                    iptablesRules: [...state.networking.iptablesRules, action.payload]
                },
                events: [...state.events, { type: 'NETWORK', message: `Iptables: Added rule ${action.payload}`, timestamp: Date.now() }]
            };
        case 'ADD_ENDPOINT':
            return {
                ...state,
                networking: {
                    ...state.networking,
                    endpoints: [...state.networking.endpoints, action.payload]
                },
                events: [...state.events, { type: 'NETWORK', message: `Endpoints: Added ${action.payload.podIp} for ${action.payload.service}`, timestamp: Date.now() }]
            };
        case 'ADD_VETH':
            return {
                ...state,
                networking: {
                    ...state.networking,
                    interfaces: {
                        ...state.networking.interfaces,
                        veth: [...state.networking.interfaces.veth, action.payload]
                    }
                }
            };

        case 'UPDATE_DEPLOYMENT_SCALE':
            const existingDep = state.deployments.find(d => d.name === action.payload.name);
            if (existingDep) {
                return {
                    ...state,
                    deployments: state.deployments.map(d => d.name === action.payload.name ? { ...d, replicas: action.payload.replicas } : d),
                    events: [...state.events, { type: 'INFO', message: `Deployment ${action.payload.name} scaled to ${action.payload.replicas}`, timestamp: Date.now() }]
                };
            }
            return {
                ...state,
                deployments: [...state.deployments, action.payload],
                events: [...state.events, { type: 'INFO', message: `Deployment ${action.payload.name} created with ${action.payload.replicas} replicas`, timestamp: Date.now() }]
            };
        case 'ADD_LOG':
            return { ...state, events: [...state.events, action.payload] };
        case 'ADD_PACKET':
            return { ...state, packets: [...state.packets, action.payload] };
        case 'REMOVE_PACKET':
            return { ...state, packets: state.packets.filter(p => p.id !== action.payload) };
        case 'START_CURL':
            return {
                ...state,
                controlPlane: {
                    ...state.controlPlane,
                    apiServer: {
                        ...state.controlPlane.apiServer,
                        requests: [...state.controlPlane.apiServer.requests, { id: Date.now(), url: action.payload.url }]
                    }
                }
            };
        case 'UPDATE_SCHEDULER_STATE':
            return { ...state, schedulerInternals: action.payload };
        default:
            return state;
    }
}

export function ClusterProvider({ children }) {
    const [state, dispatch] = useReducer(clusterReducer, initialState);

    return (
        <ClusterContext.Provider value={{ state, dispatch }}>
            {children}
        </ClusterContext.Provider>
    );
}

export function useCluster() {
    return useContext(ClusterContext);
}
