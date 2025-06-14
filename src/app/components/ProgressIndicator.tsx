"use client";

import React from 'react';

interface ProgressIndicatorProps {
  currentPhase: 'submit' | 'evaluation' | 'voting' | 'results';
  deadline?: Date;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentPhase, deadline }) => {
  const phases = [
    {
      id: 'submit',
      label: 'Submit Proposals',
      icon: '📄',
      description: 'Companies submit their proposals'
    },
    {
      id: 'evaluation',
      label: 'AI Evaluation',
      icon: '🔍',
      description: 'Anonymous AI assessment'
    },
    {
      id: 'voting',
      label: 'Public Voting',
      icon: '🗳️',
      description: 'Community votes with ZK privacy'
    },
    {
      id: 'results',
      label: 'Final Results',
      icon: '🎯',
      description: 'Full disclosure & recommendations'
    }
  ];

  const getCurrentPhaseIndex = () => {
    return phases.findIndex(phase => phase.id === currentPhase);
  };

  const getPhaseStatus = (index: number) => {
    const currentIndex = getCurrentPhaseIndex();
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'active';
    return 'upcoming';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4D4D4D'; // dark gray for X
      case 'active': return '#4D4D4D'; // dark gray (brand color)
      case 'upcoming': return '#D1D5DB'; // light gray
      default: return '#D1D5DB';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'completed': return '#FFFFFF'; // white background for X
      case 'active': return '#F3F4F6'; // light gray
      case 'upcoming': return '#F9FAFB'; // very light gray
      default: return '#F9FAFB';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold" style={{ color: '#4D4D4D' }}>
          zkTender Process Timeline
        </h2>
        {deadline && (
          <div className="text-sm mt-1" style={{ color: '#666' }}>
            Submission Deadline: {deadline.toLocaleString()}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="relative mb-6">
        {/* Background line */}
        <div 
          className="absolute top-5 left-0 h-0.5 w-full rounded-full"
          style={{ background: '#E5E7EB' }}
        />
        
        {/* Progress line */}
        <div 
          className="absolute top-5 left-0 h-0.5 rounded-full transition-all duration-500"
          style={{ 
            background: '#4D4D4D',
            width: `${(getCurrentPhaseIndex() / (phases.length - 1)) * 100}%`
          }}
        />

        {/* Phase dots and labels */}
        <div className="relative flex justify-between items-start">
          {phases.map((phase, index) => {
            const status = getPhaseStatus(index);
            return (
              <div key={phase.id} className="flex flex-col items-center flex-1">
                {/* Dot */}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative"
                  style={{ 
                    background: getStatusBgColor(status),
                    borderColor: getStatusColor(status),
                    color: status === 'active' ? '#4D4D4D' : getStatusColor(status)
                  }}
                >
                  {status === 'completed' ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {/* Simple X made with two lines */}
                      <div 
                        className="absolute w-4 h-0.5 transform rotate-45"
                        style={{ background: '#4D4D4D' }}
                      />
                      <div 
                        className="absolute w-4 h-0.5 transform -rotate-45"
                        style={{ background: '#4D4D4D' }}
                      />
                    </div>
                  ) : (
                    <span className="text-lg">{phase.icon}</span>
                  )}
                </div>
                
                {/* Label */}
                <div className="mt-2 text-center" style={{ width: '120px' }}>
                  <div 
                    className="text-sm font-semibold leading-tight"
                    style={{ color: status === 'upcoming' ? '#9CA3AF' : '#4D4D4D' }}
                  >
                    {phase.label}
                  </div>
                  <div 
                    className="text-xs mt-1 leading-tight"
                    style={{ color: status === 'upcoming' ? '#D1D5DB' : '#666' }}
                  >
                    {phase.description}
                  </div>
                </div>
                
                {/* Active indicator */}
                {status === 'active' && (
                  <div className="mt-1">
                    <div 
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: '#4D4D4D' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current phase info */}
      <div 
        className="text-center p-3 rounded-lg mt-4"
        style={{ background: '#F3F4F6' }}
      >
        <div className="text-sm font-semibold" style={{ color: '#4D4D4D' }}>
          Current Phase: {phases[getCurrentPhaseIndex()]?.label}
        </div>
        <div className="text-xs mt-0.5" style={{ color: '#666' }}>
          {phases[getCurrentPhaseIndex()]?.description}
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;
