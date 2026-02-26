import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Zap, Shield, Clock, TrendingDown } from 'lucide-react';

interface OnboardingProps {
  onClose: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('onboarding_dismissed');
    if (dismissed) {
      setDismissed(true);
      onClose();
    }
  }, [onClose]);

  if (dismissed) return null;

  const steps = [
    {
      title: 'Welcome to Prompt Refinery',
      description: 'Optimize your AI prompts for cost and quality. Let\'s get you started.',
      icon: <Zap className="w-12 h-12 text-blue-400" />,
    },
    {
      title: 'Set Your API Key',
      description: 'Navigate to Settings → Configure OpenAI, Anthropic, or your preferred provider. Your keys stay secure and local.',
      icon: <Shield className="w-12 h-12 text-purple-400" />,
    },
    {
      title: 'Paste a Prompt',
      description: 'Enter any verbose prompt in the input area. We\'ll automatically count tokens and analyze it for optimization.',
      icon: <Clock className="w-12 h-12 text-amber-400" />,
    },
    {
      title: 'See Your Savings',
      description: 'Click "Refine" and instantly see the optimized version, token reduction, and quality metrics.',
      icon: <TrendingDown className="w-12 h-12 text-green-400" />,
    },
  ];

  const currentStep = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('onboarding_dismissed', 'true');
      setDismissed(true);
      onClose();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_dismissed', 'true');
    setDismissed(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in fade-in scale-in duration-300">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center justify-center w-16 h-16 bg-slate-800 rounded-2xl">
            {currentStep.icon}
          </div>
          <button
            onClick={handleSkip}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">{currentStep.title}</h2>
        <p className="text-slate-400 mb-8 leading-relaxed">{currentStep.description}</p>

        <div className="flex gap-2 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i <= step ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-2.5 text-slate-400 hover:text-slate-200 text-sm font-bold transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            {step === steps.length - 1 ? 'Get Started' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-600 mt-4">
          Step {step + 1} of {steps.length}
        </p>
      </div>
    </div>
  );
};
