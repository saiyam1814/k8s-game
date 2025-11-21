import React, { useEffect, useRef } from 'react';
import { useCluster } from '../store/clusterContext';
import { PodStatus } from './types';

export function SimulationController() {
    const { state, dispatch } = useCluster();
    const processingPods = useRef(new Set());

    // Scheduler Logic
    useEffect(() => {
        const pendingPods = state.pods.filter(p => p.status === PodStatus.PENDING && !p.nodeId);

        pendingPods.forEach(pod => {
            if (processingPods.current.has(pod.id)) return;
            processingPods.current.add(pod.id);

            // Generate Plan with detailed Scheduler phases
            // Randomly assign Taints to nodes and Tolerations to the pod for demonstration
            const nodes = state.nodes.map(n => {
                const hasTaint = Math.random() > 0.5;
                return {
                    ...n,
                    taints: hasTaint ? [{ key: 'special', value: 'true', effect: 'NoSchedule' }] : [],
                    predicates: { podFitsResources: true, noDiskConflict: true, podToleratesNodeTaints: true }, // Default to true, will check below
                    priorities: { imageLocality: Math.floor(Math.random() * 10), leastRequested: Math.floor(Math.random() * 10) },
                    score: 0
                };
            });

            const podTolerations = Math.random() > 0.7 ? [{ key: 'special', operator: 'Equal', value: 'true', effect: 'NoSchedule' }] : [];
            // We need to mutate the pod object in the state or at least pass this info to the visualization
            // For now, we'll attach it to the 'currentPod' payload in the event
            const podWithTolerations = { ...pod, tolerations: podTolerations };

            // Check Predicates (Filtering)
            nodes.forEach(n => {
                if (n.taints.length > 0) {
                    const isTolerated = podTolerations.some(t => t.key === n.taints[0].key && t.value === n.taints[0].value);
                    n.predicates.podToleratesNodeTaints = isTolerated;
                }
            });

            // Calculate scores (only for nodes that passed predicates)
            nodes.forEach(n => {
                if (Object.values(n.predicates).every(v => v)) {
                    n.score = (n.priorities.imageLocality + n.priorities.leastRequested) * 5;
                } else {
                    n.score = -1; // Filtered out
                }
            });

            const validNodes = nodes.filter(n => n.score !== -1);
            const bestNode = validNodes.length > 0
                ? validNodes.reduce((prev, current) => (prev.score > current.score) ? prev : current)
                : null;

            const steps = [
                {
                    description: "API Server receives request and persists Pod to Etcd",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p1-${pod.id}`, from: 'API_SERVER', to: 'ETCD' } }
                    ]
                },
                {
                    description: "Etcd confirms Pod creation to API Server",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p2-${pod.id}`, from: 'ETCD', to: 'API_SERVER' } }
                    ]
                },
                {
                    description: "Scheduler: Filtering Nodes (Predicates)",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p3-${pod.id}`, from: 'API_SERVER', to: 'SCHEDULER' } },
                        { type: 'SET_SHOW_SCHEDULER_WINDOW', payload: true }, // Auto-open window
                        {
                            type: 'UPDATE_SCHEDULER_STATE',
                            payload: { currentPod: podWithTolerations, nodes: nodes.map(n => ({ ...n, score: undefined })), phase: 'FILTERING' }
                        }
                    ]
                },
                {
                    description: "Scheduler: Scoring Nodes (Priorities)",
                    actions: [
                        {
                            type: 'UPDATE_SCHEDULER_STATE',
                            payload: { currentPod: podWithTolerations, nodes: nodes, phase: 'SCORING' }
                        }
                    ]
                }
            ];

            if (bestNode) {
                steps.push({
                    description: `Scheduler: Selected ${bestNode.name}`,
                    actions: [
                        {
                            type: 'UPDATE_SCHEDULER_STATE',
                            payload: { currentPod: podWithTolerations, nodes: nodes, phase: 'BINDING' }
                        },
                        { type: 'ADD_LOG', payload: { type: 'SCHEDULER', message: `Scheduler: Selected ${bestNode.name} (Score: ${bestNode.score})`, timestamp: Date.now() } }
                    ]
                });
                steps.push({
                    description: "Scheduler sends binding info to API Server",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p4-${pod.id}`, from: 'SCHEDULER', to: 'API_SERVER' } },
                        { type: 'SET_SHOW_SCHEDULER_WINDOW', payload: false } // Auto-close window
                    ]
                });
                steps.push({
                    description: "API Server updates Etcd with node assignment",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p5-${pod.id}`, from: 'API_SERVER', to: 'ETCD' } }
                    ]
                });
                steps.push({
                    description: "Etcd confirms update to API Server",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p6-${pod.id}`, from: 'ETCD', to: 'API_SERVER' } },
                        { type: 'ASSIGN_POD_TO_NODE', payload: { podId: pod.id, nodeId: bestNode.id } }
                    ]
                });
            } else {
                steps.push({
                    description: `Scheduler: Failed to schedule ${pod.name}`,
                    actions: [
                        { type: 'ADD_LOG', payload: { type: 'ERROR', message: `Scheduler: Failed to schedule ${pod.name} - No nodes available`, timestamp: Date.now() } }
                    ]
                });
            }

            dispatch({ type: 'ENQUEUE_STEPS', payload: steps });
            processingPods.current.delete(pod.id);
        });
    }, [state.pods, state.nodes, dispatch]);

    // Kubelet Logic (Lifecycle)
    useEffect(() => {
        const scheduledPods = state.pods.filter(p => p.status === PodStatus.PENDING && p.nodeId);

        scheduledPods.forEach(pod => {
            if (processingPods.current.has(pod.id + '-kubelet')) return;
            processingPods.current.add(pod.id + '-kubelet');

            const kubeletId = `kubelet-${pod.nodeId}`;
            const cniId = `cni-${pod.nodeId}-plugin`;
            const criId = `cri-${pod.nodeId}`;
            const podIp = `172.16.0.${Math.floor(Math.random() * 200) + 10}`;

            const steps = [
                {
                    description: "Kubelet watches API Server and sees assigned Pod",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p7-${pod.id}`, from: 'API_SERVER', to: kubeletId } }
                    ]
                },
                {
                    description: "Kubelet instructs CRI to pull container image",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p8-${pod.id}`, from: kubeletId, to: criId } },
                        { type: 'UPDATE_POD_STATUS', payload: { id: pod.id, status: PodStatus.CONTAINER_CREATING } },
                        { type: 'ADD_LOG', payload: { type: 'KUBELET', message: `Kubelet: Pulling image for ${pod.name}...`, timestamp: Date.now() } }
                    ]
                },
                {
                    description: "CRI reports image pulled successfully",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p9-${pod.id}`, from: criId, to: kubeletId } }
                    ]
                },
                {
                    description: "Kubelet instructs CNI to setup networking",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p10-${pod.id}`, from: kubeletId, to: cniId } }
                    ]
                },
                {
                    description: "CNI allocates IP and connects veth pair to cni0",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p11-${pod.id}`, from: cniId, to: kubeletId } },
                        { type: 'ADD_LOG', payload: { type: 'NETWORK', message: `CNI: Allocated IP ${podIp} to ${pod.name}`, timestamp: Date.now() } }
                    ]
                },
                {
                    description: "Kubelet starts the container and updates status",
                    actions: [
                        { type: 'UPDATE_POD_STATUS', payload: { id: pod.id, status: PodStatus.RUNNING, ip: podIp } },
                        { type: 'ADD_LOG', payload: { type: 'KUBELET', message: `Kubelet: Container started for ${pod.name}`, timestamp: Date.now() } }
                    ]
                },
                {
                    description: "Kubelet reports 'Running' status to API Server",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p12-${pod.id}`, from: kubeletId, to: 'API_SERVER' } }
                    ]
                }
            ];

            dispatch({ type: 'ENQUEUE_STEPS', payload: steps });
            processingPods.current.delete(pod.id + '-kubelet');
        });
    }, [state.pods, state.nodes, dispatch]);

    // Service Creation Logic
    useEffect(() => {
        const services = state.services;
        if (services.length === 0) return;
        const latestService = services[services.length - 1];

        if (processingPods.current.has(latestService.id)) return;
        processingPods.current.add(latestService.id);

        const proxyId = 'proxy-node-1';
        const runningPods = state.pods.filter(p => p.status === PodStatus.RUNNING && p.name.includes('nginx'));

        const steps = [
            {
                description: "API Server persists Service to Etcd",
                actions: [
                    { type: 'ADD_PACKET', payload: { id: `svc1-${latestService.id}`, from: 'API_SERVER', to: 'ETCD' } }
                ]
            },
            {
                description: "Endpoint Controller detects Service and finds matching Pods",
                actions: [
                    { type: 'ADD_LOG', payload: { type: 'CONTROLLER', message: `Endpoints: Found ${runningPods.length} pods for ${latestService.name}`, timestamp: Date.now() } }
                ]
            },
            {
                description: "Endpoint Controller creates Endpoints object",
                actions: [
                    ...runningPods.map(pod => ({
                        type: 'ADD_ENDPOINT',
                        payload: { service: latestService.name, podIp: pod.ip, node: 'node-1' }
                    })),
                    { type: 'ADD_PACKET', payload: { id: `svc2-${latestService.id}`, from: 'CONTROLLER_MANAGER', to: 'API_SERVER' } }
                ]
            },
            {
                description: "Kube-proxy watches API Server for Service/Endpoint updates",
                actions: [
                    { type: 'ADD_PACKET', payload: { id: `svc3-${latestService.id}`, from: 'API_SERVER', to: proxyId } }
                ]
            },
            {
                description: "Kube-proxy writes iptables rules (DNAT) on Worker Node",
                actions: [
                    { type: 'ADD_IPTABLES_RULE', payload: `PREROUTING: ${latestService.clusterIP}:80 -> DNAT` },
                    { type: 'ADD_PACKET', payload: { id: `svc4-${latestService.id}`, from: proxyId, to: 'iptables' } }
                ]
            }
        ];

        dispatch({ type: 'ENQUEUE_STEPS', payload: steps });
        processingPods.current.delete(latestService.id);

    }, [state.services, state.pods, dispatch]);


    // Curl Request Logic
    useEffect(() => {
        const requests = state.controlPlane.apiServer.requests;
        if (requests.length === 0) return;

        const req = requests[requests.length - 1];
        if (processingPods.current.has(req.id)) return;
        processingPods.current.add(req.id);

        const runningPod = state.pods.find(p => p.status === PodStatus.RUNNING);

        const steps = [
            {
                description: "Client sends request to Service IP (10.96.0.10)",
                actions: [
                    { type: 'ADD_PACKET', payload: { id: `req1-${req.id}`, from: 'API_SERVER', to: 'eth0' } } // Simulating external/client hitting eth0
                ]
            },
            {
                description: "Packet enters eth0 and hits Iptables (PREROUTING)",
                actions: [
                    { type: 'ADD_PACKET', payload: { id: `req2-${req.id}`, from: 'eth0', to: 'iptables' } }
                ]
            },
            {
                description: "Iptables DNATs the packet to Pod IP",
                actions: [
                    { type: 'ADD_LOG', payload: { type: 'NETWORK', message: `Iptables: DNAT 10.96.0.10 -> ${runningPod?.ip || '172.16.0.5'}`, timestamp: Date.now() } }
                ]
            },
            {
                description: "Packet routed to cni0 (Bridge)",
                actions: [
                    { type: 'ADD_PACKET', payload: { id: `req3-${req.id}`, from: 'iptables', to: 'cni0' } }
                ]
            }
        ];

        if (runningPod) {
            steps.push({
                description: "Bridge forwards packet to Pod via veth pair",
                actions: [
                    { type: 'ADD_PACKET', payload: { id: `req4-${req.id}`, from: 'cni0', to: `pod-${runningPod.id}` } }
                ]
            });
            steps.push({
                description: "Pod processes the request and responds",
                actions: [
                    { type: 'ADD_LOG', payload: { type: 'POD', message: `Pod ${runningPod.name}: 200 OK`, timestamp: Date.now() } }
                ]
            });
        } else {
            steps.push({
                description: "Network Error: No endpoints found",
                actions: [
                    { type: 'ADD_LOG', payload: { type: 'ERROR', message: `Network: No endpoints found`, timestamp: Date.now() } }
                ]
            });
        }

        dispatch({ type: 'ENQUEUE_STEPS', payload: steps });
        processingPods.current.delete(req.id);

    }, [state.controlPlane.apiServer.requests, state.pods, dispatch]);

    // --- Scheduler Deep Dive Simulation ---
    useEffect(() => {
        if (!state.isSchedulerDeepDiveMode) return;

        let stepIndex = 0;
        const phases = ['QUEUE', 'PRE_FILTER', 'FILTER', 'POST_FILTER', 'SCORE', 'BIND'];

        const interval = setInterval(() => {
            const phase = phases[stepIndex % phases.length];

            // Generate a dummy pod for the simulation
            const dummyPod = {
                id: `deep-dive-pod-${Date.now()}`,
                name: `demo-pod-${Math.floor(Math.random() * 100)}`,
                resources: { cpu: '200m', memory: '256Mi' },
                tolerations: Math.random() > 0.5 ? [{ key: 'special', value: 'true', effect: 'NoSchedule' }] : []
            };

            // Simulate Node Scores for visualization
            const simulatedNodes = state.nodes.map(n => ({
                ...n,
                score: phase === 'SCORE' || phase === 'BIND' ? Math.floor(Math.random() * 100) : -1,
                predicates: {
                    podFitsResources: true,
                    noDiskConflict: true,
                    podToleratesNodeTaints: Math.random() > 0.3 // Randomly fail some nodes on taints
                },
                priorities: {
                    imageLocality: Math.floor(Math.random() * 10),
                    leastRequested: Math.floor(Math.random() * 10)
                }
            }));

            dispatch({
                type: 'UPDATE_SCHEDULER_STATE',
                payload: {
                    currentPod: dummyPod,
                    nodes: simulatedNodes,
                    phase: phase
                }
            });

            stepIndex++;
        }, 3000); // Change phase every 3 seconds

        return () => clearInterval(interval);
    }, [state.isSchedulerDeepDiveMode, state.nodes, dispatch]);

    return null;
}
