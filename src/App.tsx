import { useEffect, useState } from 'react';
import { supabase, Profile } from './lib/supabase';
import Navigation from './components/Navigation';
import Landing from './components/Landing';
import Auth from './components/Auth';
import ClientDashboard from './components/ClientDashboard';
import FreelancerDashboard from './components/FreelancerDashboard';
import GigDetail from './components/GigDetail';

type Page = 'landing' | 'auth' | 'client' | 'freelancer' | 'gig-detail';

function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setCurrentPage('landing');
        }
      })();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setCurrentPage(data.user_type === 'client' ? 'client' : 'freelancer');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  const handleViewGig = (gigId: string) => {
    setSelectedGigId(gigId);
    setCurrentPage('gig-detail');
  };

  const handleBackFromGig = () => {
    setSelectedGigId(null);
    if (profile) {
      setCurrentPage(profile.user_type === 'client' ? 'client' : 'freelancer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-yellow-400 text-xl">Loading workpad...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {user && profile && (
        <Navigation
          user={user}
          profile={profile}
          onNavigate={handleNavigate}
          currentPage={currentPage}
        />
      )}

      {currentPage === 'landing' && (
        <Landing onGetStarted={() => setCurrentPage('auth')} />
      )}

      {currentPage === 'auth' && (
        <Auth onAuthSuccess={checkUser} />
      )}

      {currentPage === 'client' && user && (
        <ClientDashboard userId={user.id} onViewGig={handleViewGig} />
      )}

      {currentPage === 'freelancer' && user && (
        <FreelancerDashboard userId={user.id} onViewGig={handleViewGig} />
      )}

      {currentPage === 'gig-detail' && selectedGigId && user && profile && (
        <GigDetail
          gigId={selectedGigId}
          userId={user.id}
          userType={profile.user_type}
          onBack={handleBackFromGig}
        />
      )}
    </div>
  );
}

export default App;
