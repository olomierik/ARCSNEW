import { useState } from 'react';
import LandingPage from './components/LandingPage';
import Layout from './components/Layout';

type Page = 'landing' | 'app';

export default function App() {
  const [page, setPage] = useState<Page>('landing');

  if (page === 'landing') {
    return <LandingPage onLaunch={() => setPage('app')} />;
  }

  return <Layout onHome={() => setPage('landing')} />;
}
