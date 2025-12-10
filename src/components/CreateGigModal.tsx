import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface Milestone {
  title: string;
  description: string;
  percentage: number;
}

interface CreateGigModalProps {
  onClose: () => void;
  onSubmit: (gigData: {
    title: string;
    description: string;
    budget: number;
    hasMilestones: boolean;
    milestones: Milestone[];
  }) => void;
}

export default function CreateGigModal({ onClose, onSubmit }: CreateGigModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [hasMilestones, setHasMilestones] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([
    { title: 'Milestone 1', description: '', percentage: 50 },
    { title: 'Milestone 2', description: '', percentage: 50 },
  ]);

  const addMilestone = () => {
    setMilestones([...milestones, { title: `Milestone ${milestones.length + 1}`, description: '', percentage: 0 }]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 2) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: string | number) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const totalPercentage = milestones.reduce((sum, m) => sum + Number(m.percentage), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (hasMilestones && totalPercentage !== 100) {
      alert('Milestone percentages must add up to 100%');
      return;
    }

    onSubmit({
      title,
      description,
      budget: Number(budget),
      hasMilestones,
      milestones: hasMilestones ? milestones : [],
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Post a New Gig</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Gig Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-yellow-400"
              placeholder="e.g., Build a landing page"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-yellow-400"
              placeholder="Describe what you need..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Budget (USDC)
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-yellow-400"
              placeholder="100"
              min="1"
              step="0.01"
              required
            />
          </div>

          <div className="border-t border-zinc-800 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Milestone Payments</h3>
                <p className="text-sm text-zinc-400">Split payment into stages for better control</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasMilestones}
                  onChange={(e) => setHasMilestones(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
              </label>
            </div>

            {hasMilestones && (
              <div className="space-y-4">
                {milestones.map((milestone, index) => (
                  <div key={index} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <input
                        type="text"
                        value={milestone.title}
                        onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                        className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:border-yellow-400"
                        placeholder="Milestone title"
                        required
                      />
                      {milestones.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeMilestone(index)}
                          className="ml-2 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    <textarea
                      value={milestone.description}
                      onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:border-yellow-400 mb-3"
                      placeholder="What should be delivered?"
                      required
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={milestone.percentage}
                        onChange={(e) => updateMilestone(index, 'percentage', Number(e.target.value))}
                        className="w-24 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:border-yellow-400"
                        min="0"
                        max="100"
                        required
                      />
                      <span className="text-zinc-400">% of budget</span>
                      <span className="text-yellow-400 font-semibold ml-auto">
                        ${((Number(budget) || 0) * milestone.percentage / 100).toFixed(2)} USDC
                      </span>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addMilestone}
                  className="w-full py-3 border-2 border-dashed border-zinc-700 rounded-lg text-zinc-400 hover:border-yellow-400 hover:text-yellow-400 transition-all flex items-center justify-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Milestone</span>
                </button>

                <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                  <span className="text-zinc-300 font-medium">Total Percentage:</span>
                  <span className={`text-xl font-bold ${totalPercentage === 100 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalPercentage}%
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-zinc-800 text-white rounded-lg font-semibold hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
            >
              Post Gig
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
