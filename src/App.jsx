import React from 'react';
import { ClusterProvider } from './store/clusterContext';
import { Layout } from './components/Layout';
import { SimulationController } from './simulation/SimulationController';
import { PositionRegistryProvider } from './store/PositionRegistry';

function App() {
  return (
    <ClusterProvider>
      <PositionRegistryProvider>
        <SimulationController />
        <Layout />
      </PositionRegistryProvider>
    </ClusterProvider>
  );
}

export default App;
