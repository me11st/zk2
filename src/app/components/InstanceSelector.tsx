"use client";

import React, { useEffect, useState } from "react";

interface Instance {
  id: string;
  name: string;
  description: string;
  phase: string;
  status: string;
  submission_deadline: string;
  voting_deadline: string;
}

interface InstanceSelectorProps {
  currentInstance: string;
  onInstanceChange: (instanceId: string) => void;
  showDescription?: boolean;
}

export default function InstanceSelector({ 
  currentInstance, 
  onInstanceChange, 
  showDescription = true 
}: InstanceSelectorProps) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3003/api/instances")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setInstances(data.instances);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load instances:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="w-full bg-white rounded-lg p-4 shadow-lg">
        <div className="text-center text-gray-500">Loading tender instances...</div>
      </div>
    );
  }

  const getPhaseEmoji = (phase: string) => {
    switch (phase) {
      case 'submission': return '📝';
      case 'reveal': return '🔓';
      case 'voting': return '🗳️';
      case 'final': return '🏆';
      default: return '📋';
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'submission': return 'bg-green-50 border-green-200 text-green-800';
      case 'reveal': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'voting': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'final': return 'bg-purple-50 border-purple-200 text-purple-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="w-full bg-white rounded-lg p-4 shadow-lg">
      <h3 className="text-lg font-bold mb-3 flex items-center" style={{ color: "#4D4D4D" }}>
        🏗️ zkTender Instances
        <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
          {instances.length} Active
        </span>
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        {instances.map((instance) => (
          <button
            key={instance.id}
            onClick={() => onInstanceChange(instance.id)}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              currentInstance === instance.id 
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-bold" style={{ color: "#4D4D4D" }}>
                {instance.id.toUpperCase()}
              </div>
              <span className="text-lg">
                {getPhaseEmoji(instance.phase)}
              </span>
            </div>
            
            <div className={`text-xs px-2 py-1 rounded-full border ${getPhaseColor(instance.phase)} mb-2`}>
              {instance.phase.toUpperCase()}
            </div>
            
            <div className="text-xs text-gray-500">
              {instance.status}
            </div>
          </button>
        ))}
      </div>
      
      {showDescription && instances.find(i => i.id === currentInstance) && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm font-semibold" style={{ color: "#4D4D4D" }}>
            {instances.find(i => i.id === currentInstance)?.name}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {instances.find(i => i.id === currentInstance)?.description}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Phase: <strong>{instances.find(i => i.id === currentInstance)?.phase}</strong> | 
            Status: <strong>{instances.find(i => i.id === currentInstance)?.status}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
