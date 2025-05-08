import React, { useState } from 'react';
import { useJobGenie } from './hooks/useJobGenie';
import { auth } from './firebase';
import { Auth } from './components/Auth';
import { ApplicationList } from './components/ApplicationList';

function App() {
  const [resumeDetails, setResumeDetails] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const { saveApplication, updateApplication, loading, error } = useJobGenie();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      alert('Please sign in to save your application');
      return;
    }

    try {
      if (editingId) {
        await updateApplication(editingId, {
          resumeDetails,
          jobDescription,
          companyName,
          position,
        });
        setEditingId(null);
      } else {
        await saveApplication({
          userId: auth.currentUser.uid,
          resumeDetails,
          jobDescription,
          companyName,
          position,
          status: 'draft',
        });
      }
      setResumeDetails('');
      setJobDescription('');
      setCompanyName('');
      setPosition('');
      alert(editingId ? 'Application updated successfully!' : 'Application saved successfully!');
    } catch (err) {
      console.error('Failed to save application:', err);
    }
  };

  const handleEdit = (application: any) => {
    setResumeDetails(application.resumeDetails);
    setJobDescription(application.jobDescription);
    setCompanyName(application.companyName || '');
    setPosition(application.position || '');
    setEditingId(application.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-green-100 flex flex-col items-center justify-center p-4">
      <header className="w-full max-w-2xl text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-extrabold text-blue-700 mb-4 drop-shadow-lg">JobGenie AI</h1>
        <p className="text-lg md:text-2xl text-gray-700 mb-8">Generate the perfect resume and cover letter for any job in seconds.</p>
        <div className="mb-8">
          <Auth />
        </div>
      </header>
      <main className="w-full max-w-xl space-y-8">
        <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {editingId ? 'Edit Application' : 'Create New Application'}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter company name..."
                />
              </div>
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  id="position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter position..."
                />
              </div>
            </div>
            <div>
              <label htmlFor="resume" className="block text-sm font-medium text-gray-700 mb-1">
                Your Resume/Experience Details
              </label>
              <textarea
                id="resume"
                value={resumeDetails}
                onChange={(e) => setResumeDetails(e.target.value)}
                className="w-full h-32 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Paste your resume or describe your experience..."
                required
              />
            </div>
            <div>
              <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Job Description
              </label>
              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full h-32 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Paste the job description here..."
                required
              />
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingId ? 'Update Application' : 'Save Application'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setResumeDetails('');
                    setJobDescription('');
                    setCompanyName('');
                    setPosition('');
                  }}
                  className="px-6 py-3 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
              )}
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </form>
        </div>
        {auth.currentUser && <ApplicationList onEdit={handleEdit} />}
      </main>
      <footer className="mt-16 text-gray-400 text-sm">&copy; {new Date().getFullYear()} JobGenie AI. All rights reserved.</footer>
    </div>
  );
}

export default App;
